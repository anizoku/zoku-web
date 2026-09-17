"""Offline structural/security audit. Never connects to or executes SQL on a DB.

Requires pglast (python -m pip install pglast).
Run: python supabase/validation/validate_initial_schema.py
This is not a substitute for PostgreSQL/Supabase integration tests.
"""

from pathlib import Path
import re

from pglast import ast, parse_sql
from pglast.parser import parse_plpgsql_json


SQL = Path(__file__).resolve().parents[1] / "migrations/0001_initial_schema.sql"
source = SQL.read_text(encoding="utf-8")
statements = [item.stmt for item in parse_sql(source)]
tables = {}
unique = {"auth.users": {("id",)}}
rls = set()
grants = {}
policies = {}
foreign_keys = []


def names(items):
    return tuple(item.sval for item in items or ())


def relation(node):
    return f"{node.schemaname}.{node.relname}"


def has_constraint(column, kind):
    return any(c.contype.name == kind for c in column.constraints or ())


def column_type(column):
    return names(column.typeName.names)


for stmt in statements:
    if isinstance(stmt, ast.CreateStmt):
        table = relation(stmt.relation)
        assert table not in tables, f"Duplicate table: {table}"
        columns = {c.colname: c for c in stmt.tableElts if isinstance(c, ast.ColumnDef)}
        tables[table] = columns
        unique[table] = set()
        for col, definition in columns.items():
            if any(has_constraint(definition, k) for k in ("CONSTR_PRIMARY", "CONSTR_UNIQUE")):
                unique[table].add((col,))
        pk = "key" if table == "public.achievements" else "id"
        assert has_constraint(columns[pk], "CONSTR_PRIMARY"), table
        assert column_type(columns[pk]) == (("text",) if pk == "key" else ("uuid",)), table
        if pk == "id" and table != "public.profiles":
            assert has_constraint(columns[pk], "CONSTR_DEFAULT"), table
        assert ("legacy_base44_id",) in unique[table], table
        assert not any("email" in col or col in ("liked_by", "members", "participants", "invited_emails") for col in columns), table

    elif isinstance(stmt, ast.AlterTableStmt):
        table = relation(stmt.relation)
        assert table in tables, table
        for command in stmt.cmds:
            if command.subtype.name == "AT_EnableRowSecurity":
                rls.add(table)
            c = command.def_
            if not isinstance(c, ast.Constraint):
                continue
            if c.contype.name == "CONSTR_UNIQUE":
                keys = names(c.keys)
                assert all(k in tables[table] for k in keys), (table, keys)
                unique[table].add(keys)
            if c.contype.name == "CONSTR_FOREIGN":
                target, local, remote = relation(c.pktable), names(c.fk_attrs), names(c.pk_attrs)
                # Checks ordering as well: referenced uniqueness must exist already.
                assert remote in unique[target], (table, local, target, remote)
                assert c.fk_del_action in ("c", "n", "r"), (table, local, "ON DELETE missing")
                for left, right in zip(local, remote, strict=True):
                    col = tables[table][left]
                    expected = ("uuid",) if target == "auth.users" else column_type(tables[target][right])
                    assert column_type(col) == expected, (table, left, target, right)
                    if c.fk_del_action == "n":
                        assert not has_constraint(col, "CONSTR_NOTNULL"), (table, left, "SET NULL on NOT NULL")
                foreign_keys.append((table, local, target))

    elif isinstance(stmt, ast.GrantStmt) and stmt.objtype.name == "OBJECT_TABLE":
        for obj in stmt.objects:
            table = relation(obj)
            for role in stmt.grantees:
                role_name = role.rolename or "PUBLIC"
                rights = grants.setdefault((table, role_name), {})
                if not stmt.is_grant:
                    assert stmt.privileges is None, "Audit expects full initial revocation"
                    rights.clear()
                    continue
                for privilege in stmt.privileges or ():
                    cols = set(names(privilege.cols)) if privilege.cols else {"*"}
                    assert cols == {"*"} or cols <= tables[table].keys(), (table, cols)
                    rights.setdefault(privilege.priv_name.lower(), set()).update(cols)

    elif isinstance(stmt, ast.CreatePolicyStmt):
        table = relation(stmt.table)
        assert table in tables, table
        policies.setdefault(table, set()).add(stmt.cmd_name)

    elif isinstance(stmt, ast.CreateFunctionStmt):
        options = {o.defname: o.arg for o in stmt.options}
        # Fixed search_path applies to invoker and definer functions alike.
        assert "set" in options and options["set"].name == "search_path", names(stmt.funcname)
        if options["language"].sval == "sql":
            parse_sql(options["as"][0].sval)

assert len(tables) == 32
assert rls == tables.keys(), "Every table must enable RLS"
for table in tables:
    for role in ("PUBLIC", "anon", "authenticated"):
        assert (table, role) in grants, (table, "Missing explicit initial REVOKE", role)
        assert not ({"truncate", "trigger", "references"} & grants[(table, role)].keys())

for table in ("xp_events", "user_achievements", "friendships"):
    for role in ("PUBLIC", "anon", "authenticated"):
        assert not ({"insert", "update", "delete"} & grants[(f"public.{table}", role)].keys()), (table, role)
    assert policies[f"public.{table}"] == {"select"}, table

protected = {
    "profiles": {"role", "current_streak", "login_streak", "last_activity_date"},
    "anime_entries": {"status", "current_episode", "current_chapter", "total_episodes", "total_chapters"},
    "posts": {"likes_count", "comments_count", "author_level", "author_name", "author_avatar"},
    "comments": {"likes_count", "author_name", "author_avatar"},
    "communities": {"members_count"},
    "works": {"release_count"},
    "debates": {"replies_count"},
}
for table, columns in protected.items():
    for operation in ("insert", "update"):
        actual = grants[(f"public.{table}", "authenticated")].get(operation, set())
        assert "*" not in actual and not actual & columns, (table, operation, actual & columns)
for table in ("direct_messages", "notifications"):
    assert grants[(f"public.{table}", "authenticated")]["update"] == {"read_at"}
assert "delete" not in grants[("public.direct_messages", "authenticated")]
assert "update" not in grants[("public.anime_entries", "authenticated")]

for table, keys in {
    "xp_events": ("user_id", "idempotency_key"),
    "user_achievements": ("user_id", "achievement_key"),
    "post_likes": ("user_id", "post_id"),
    "comment_likes": ("user_id", "comment_id"),
    "community_members": ("community_id", "user_id"),
    "event_participants": ("event_id", "user_id"),
    "site_config": ("label",),
}.items():
    assert keys in unique[f"public.{table}"], (table, keys)
    assert all(has_constraint(tables[f"public.{table}"][k], "CONSTR_NOTNULL") for k in keys)

assert "LEAST(requester_id, receiver_id), GREATEST(requester_id, receiver_id)" in source
assert "CHECK (requester_id <> receiver_id)" in source
assert "WHERE release_id IS NOT NULL" in source
assert "CREATE TRIGGER protect_message" in source
for table in ("post_likes", "comments", "comment_likes", "community_members", "work_releases"):
    assert re.search(r"AFTER INSERT OR UPDATE OR DELETE ON public\." + table + r"\b", source), table

functions = re.findall(r"CREATE FUNCTION.*?\$\$;", source, re.S)
for function in functions:
    if "LANGUAGE plpgsql" in function:
        # Raw parser API avoids pglast's JSON wrapper bug for trigger records.
        parse_plpgsql_json(function)

print(f"PASS: {len(statements)} SQL statements, {len(tables)} tables, {len(foreign_keys)} FKs, {len(functions)} functions.")
print("PASS: RLS coverage, FK types/order/delete actions, canonical PKs, unique constraints and protected API grants.")
print("Offline only: runtime RLS, triggers and concurrency were NOT executed.")
