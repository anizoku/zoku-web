"""Offline checks for 0002; never executes SQL or connects to any database.

Requires pglast. Run: python supabase/validation/validate_business_rpcs.py
Checks syntax, ACLs, reward/condition coverage, schema references and guards.
It does not prove runtime name binding, RLS behavior, atomicity or concurrency.
"""

from pathlib import Path
import json
import re

from pglast import ast, parse_sql
from pglast.parser import parse_plpgsql_json
from pglast.visitors import Visitor


ROOT = Path(__file__).resolve().parents[2]
SQL = ROOT / "supabase/migrations/0002_business_rpcs.sql"
source = SQL.read_text(encoding="utf-8")
schema = (ROOT / "supabase/migrations/0001_initial_schema.sql").read_text(encoding="utf-8")
statements = [s.stmt for s in parse_sql(source)]
expected = {
    "update_progress": ("uuid", "text", "int4"),
    "unlock_achievement": ("text",),
    "grant_xp": ("text", "text"),
    "send_friend_request": ("uuid",),
    "accept_friend_request": ("uuid",),
    "reject_friend_request": ("uuid",),
    "cancel_friend_request": ("uuid",),
    "remove_friend": ("uuid",),
}
tables = {s.stmt.relation.relname: {c.colname for c in s.stmt.tableElts if isinstance(c, ast.ColumnDef)}
          for s in parse_sql(schema) if isinstance(s.stmt, ast.CreateStmt)}
constraints = set(re.findall(r"ADD CONSTRAINT (\w+)", schema))
functions = {}
granted = set()
revoked = set()


def strings(nodes):
    return tuple(n.sval for n in nodes or ())


for stmt in statements:
    assert isinstance(stmt, (ast.CreateFunctionStmt, ast.GrantStmt, ast.TransactionStmt)), type(stmt).__name__
    if isinstance(stmt, ast.CreateFunctionStmt):
        namespace, name = strings(stmt.funcname)
        assert namespace == "public" and name in expected and name not in functions, name
        assert tuple(strings(p.argType.names)[-1] for p in stmt.parameters) == expected[name], name
        assert all(p.name not in ("user_id", "actor_id", "requester_id", "xp_amount", "idempotency_key") for p in stmt.parameters), name
        assert strings(stmt.returnType.names) == ("jsonb",), name
        opts = {o.defname: o.arg for o in stmt.options}
        assert opts["language"].sval == "plpgsql" and opts["security"].boolval, name
        assert opts["volatility"].sval == "volatile", name
        assert opts["set"].name == "search_path" and opts["set"].args[0].val.sval == "", name
        body = opts["as"][0].sval
        assert "v_user uuid := auth.uid()" in body and "IF v_user IS NULL" in body, name
        assert not re.search(r"\bEXECUTE\b|WHEN\s+OTHERS|\bCOMMIT\b|\bROLLBACK\b", body, re.I), name
        assert "auth.jwt" not in body and "email" not in body, name
        functions[name] = body
    elif isinstance(stmt, ast.GrantStmt):
        assert stmt.objtype.name == "OBJECT_FUNCTION", "0002 must not widen table grants"
        roles = {r.rolename or "PUBLIC" for r in stmt.grantees}
        for obj in stmt.objects:
            name = strings(obj.objname)[-1]
            assert name in expected
            if stmt.is_grant:
                assert name in revoked, f"Grant precedes default ACL revocation: {name}"
                assert roles == {"authenticated"} and [p.priv_name for p in stmt.privileges] == ["execute"], name
                granted.add(name)
            else:
                assert roles == {"PUBLIC", "anon", "authenticated", "service_role"}, name
                assert stmt.privileges is None, name
                revoked.add(name)
assert set(functions) == set(expected) == granted == revoked
assert statements[0].kind.name == "TRANS_STMT_BEGIN"
assert statements[-1].kind.name == "TRANS_STMT_COMMIT"


class SchemaReferences(Visitor):
    def __init__(self):
        super().__init__()
        self.reads = set()
        self.writes = set()

    def visit_RangeVar(self, ancestors, node):
        if node.schemaname == "public":
            assert node.relname in tables, node.relname
            self.reads.add(node.relname)
        elif node.schemaname:
            assert (node.schemaname, node.relname) == ("auth", "users")
            self.reads.add("auth.users")

    def visit_InsertStmt(self, ancestors, node):
        assert node.relation.schemaname == "public"
        table = node.relation.relname
        assert {c.name for c in node.cols} <= tables[table], table
        if node.onConflictClause and node.onConflictClause.infer:
            assert node.onConflictClause.infer.conname in constraints
        self.writes.add((table, "INSERT"))

    def visit_UpdateStmt(self, ancestors, node):
        assert node.relation.schemaname == "public"
        table = node.relation.relname
        assert {c.name for c in node.targetList} <= tables[table], table
        assert node.whereClause is not None, table
        self.writes.add((table, "UPDATE"))

    def visit_DeleteStmt(self, ancestors, node):
        assert node.relation.schemaname == "public" and node.whereClause is not None
        self.writes.add((node.relation.relname, "DELETE"))


def embedded_expressions(value):
    if isinstance(value, dict):
        if "PLpgSQL_expr" in value:
            yield value["PLpgSQL_expr"]
        for child in value.values():
            yield from embedded_expressions(child)
    elif isinstance(value, list):
        for child in value:
            yield from embedded_expressions(child)


count = 0
dependencies = {}
for function_sql in re.findall(r"CREATE FUNCTION.*?\$\$;", source, re.S):
    name = re.search(r"public\.(\w+)\(", function_sql)[1]
    tree = json.loads(parse_plpgsql_json(function_sql))
    inspector = SchemaReferences()
    for expression in embedded_expressions(tree):
        query, mode = expression["query"], expression["parseMode"]
        if mode == 2:
            query = "SELECT " + query
        elif mode == 3:
            query = "SELECT " + query.split(":=", 1)[1]
        else:
            assert mode == 0, mode
        inspector(parse_sql(query))
        count += 1
    dependencies[name] = inspector
    # Composite row fields must exist in the actual 0001 schema.
    for variable, table in re.findall(r"(v_\w+) public\.(\w+)%ROWTYPE", functions[name]):
        for field in re.findall(r"\b" + variable + r"\.(\w+)", functions[name]):
            assert field in tables[table], (name, variable, field)

expected_writes = {
    "update_progress": {("anime_entries", "UPDATE"), ("xp_events", "INSERT"), ("profiles", "UPDATE")},
    "unlock_achievement": {("user_achievements", "INSERT"), ("xp_events", "INSERT"), ("profiles", "UPDATE")},
    "grant_xp": {("xp_events", "INSERT"), ("profiles", "UPDATE")},
    "send_friend_request": {("friendships", "INSERT"), ("notifications", "INSERT")},
    "accept_friend_request": {("friendships", "UPDATE"), ("notifications", "INSERT")},
    "reject_friend_request": {("friendships", "DELETE")},
    "cancel_friend_request": {("friendships", "DELETE")},
    "remove_friend": {("friendships", "DELETE")},
}
for name, dependency in dependencies.items():
    assert dependency.writes == expected_writes[name], (name, dependency.writes)

# Canonical reward parity and one real condition per supported catalog key.
constants = (ROOT / "base44/shared/xpConstants.ts").read_text(encoding="utf-8")
reward_block = constants.split("export const ACHIEVEMENT_XP")[1].split("};", 1)[0]
canonical_rewards = {key: int(xp) for key, xp in re.findall(r"(\w+):\s*(\d+)", reward_block)}
sql_rewards = json.loads(re.search(r"v_rewards constant jsonb := '(.*?)'::jsonb", functions["unlock_achievement"], re.S)[1])
assert sql_rewards == canonical_rewards, "Achievement XP drift"
condition_block = functions["unlock_achievement"].split("v_condition := CASE v_key", 1)[1].split("ELSE false END;", 1)[0]
assert set(re.findall(r"WHEN '(\w+)' THEN", condition_block)) == set(canonical_rewards)
assert not re.search(r"THEN\s+(true|false)\b", condition_block), "Unvalidated/disabled condition"
for record in ("library", "social"):
    fields = set(re.findall(r"v_" + record + r"\.(\w+)", condition_block))
    assert all(re.search(r"\bAS " + field + r"\b", functions["unlock_achievement"], re.I) for field in fields), (record, fields)

progress = functions["update_progress"]
grant = functions["grant_xp"]
for name in ("update_progress", "grant_xp", "unlock_achievement"):
    body = functions[name]
    assert "FROM public.profiles p WHERE p.id = v_user FOR UPDATE" in body, name
    assert "ON CONFLICT ON CONSTRAINT uq_xp_events_user_id_idempotency_key DO NOTHING" in body, name
    assert "p.last_activity_date < v_today" in body and "AT TIME ZONE 'UTC'" in body, name
assert "WHERE e.id = v_entry_id AND e.user_id = v_user FOR UPDATE" in progress
assert "WHERE r.id = v_entry.release_id FOR SHARE" in progress
assert "coalesce(v_release.episode_count, v_entry.total_episodes)" in progress
assert "coalesce(v_release.chapter_count, v_entry.total_chapters)" in progress
assert "NOT v_airing" in progress and "TOTAL_UNKNOWN" in progress and "BATCH_TOO_LARGE" in progress
assert "v_entry.release_id::text" in progress and "v_entry.release_id::text" in grant
assert "NOT IN ('post_created', 'anime_added', 'level_up', 'legacy_migration')" in grant
assert "LEGACY_MIGRATION_DISABLED" in grant and "IF NOT public.is_admin()" in grant
for forbidden in ("episode_watched", "chapter_read", "work_completed", "achievement_unlocked"):
    assert f"'{forbidden}'" not in grant, forbidden
for name, owner, state in (
    ("accept_friend_request", "receiver_id", "pending"),
    ("reject_friend_request", "receiver_id", "pending"),
    ("cancel_friend_request", "requester_id", "pending"),
):
    body = functions[name]
    assert f"f.{owner} = v_user FOR UPDATE" in body
    assert f"IF v_friendship.status <> '{state}'" in body
assert "IF v_friendship.status <> 'accepted'" in functions["remove_friend"]
assert "f.requester_id = v_user OR f.receiver_id = v_user" in functions["remove_friend"]

print(f"PASS: {len(statements)} statements; exactly eight SECURITY DEFINER RPCs; restricted EXECUTE grants.")
print(f"PASS: eight PL/pgSQL bodies and {count} embedded SQL statements/expressions parsed offline.")
print(f"PASS: schema targets/write columns, XP authority/locks/guards, {len(canonical_rewards)} rewards and conditions.")
for name in expected:
    print(f"  {name}: {', '.join(sorted(dependencies[name].reads))}")
print("NOT EXECUTED: database migrations, real RLS/ACL checks, rollback injection, replay/concurrency tests.")
