import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSupabaseAuth } from '../../lib/SupabaseAuthContext';
import { Button } from '../ui/button';

function friendshipOtherId(friendship, myId) {
  if (friendship.requester_id === myId) {
    return friendship.receiver_id;
  }

  return friendship.requester_id;
}

function displayName(profile, fallbackId) {
  if (!profile) return fallbackId;

  return (
    profile.display_name ||
    (profile.username ? `@${profile.username}` : null) ||
    fallbackId
  );
}

export default function FriendsPage() {
  const { user, friendService } = useSupabaseAuth();

  const [friendships, setFriendships] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState('');

  const myId = user?.id;

  async function load() {
    if (!myId) return;

    setLoading(true);
    setError('');

    try {
      const rows = await friendService.list();

      const otherIds = rows.map((friendship) =>
        friendshipOtherId(friendship, myId)
      );

      const profileRows = await friendService.profilesByIds(otherIds);

      setFriendships(rows);
      setProfiles(profileRows);
    } catch (err) {
      setError(err?.message || 'Não foi possível carregar as amizades.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [myId]);

  const profileMap = useMemo(
    () =>
      new Map(
        profiles.map((profile) => [
          profile.id,
          profile,
        ])
      ),
    [profiles]
  );

  const accepted = friendships.filter(
    (friendship) => friendship.status === 'accepted'
  );

  const received = friendships.filter(
    (friendship) =>
      friendship.status === 'pending' &&
      friendship.receiver_id === myId
  );

  const sent = friendships.filter(
    (friendship) =>
      friendship.status === 'pending' &&
      friendship.requester_id === myId
  );

  async function run(friendshipId, operation) {
    setActionId(friendshipId);
    setError('');

    try {
      await friendService[operation](friendshipId);
      await load();
    } catch (err) {
      setError(err?.message || 'Não foi possível concluir a ação.');
    } finally {
      setActionId(null);
    }
  }

  if (loading) {
    return (
      <section className="py-8">
        <p className="text-muted-foreground">
          Carregando amizades...
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-8 py-8">
      <div>
        <h1 className="font-space text-2xl font-bold">
          Amigos
        </h1>

        <p className="text-sm text-muted-foreground mt-1">
          Suas amizades agora são vinculadas ao UUID da conta,
          não ao endereço de e-mail.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold text-lg">
          Pedidos recebidos
        </h2>

        {received.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum pedido pendente.
          </p>
        ) : (
          <div className="space-y-2">
            {received.map((friendship) => {
              const otherId = friendship.requester_id;
              const profile = profileMap.get(otherId);
              const pending = actionId === friendship.id;

              return (
                <div
                  key={friendship.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4"
                >
                  <div>
                    <Link
                      to={`/u/${otherId}`}
                      className="font-medium hover:text-primary"
                    >
                      {displayName(profile, otherId)}
                    </Link>

                    {profile?.username && (
                      <p className="text-xs text-muted-foreground">
                        @{profile.username}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      disabled={pending}
                      onClick={() =>
                        run(friendship.id, 'accept')
                      }
                    >
                      Aceitar
                    </Button>

                    <Button
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        run(friendship.id, 'reject')
                      }
                    >
                      Recusar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-lg">
          Pedidos enviados
        </h2>

        {sent.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum pedido enviado.
          </p>
        ) : (
          <div className="space-y-2">
            {sent.map((friendship) => {
              const otherId = friendship.receiver_id;
              const profile = profileMap.get(otherId);
              const pending = actionId === friendship.id;

              return (
                <div
                  key={friendship.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4"
                >
                  <div>
                    <Link
                      to={`/u/${otherId}`}
                      className="font-medium hover:text-primary"
                    >
                      {displayName(profile, otherId)}
                    </Link>

                    {profile?.username && (
                      <p className="text-xs text-muted-foreground">
                        @{profile.username}
                      </p>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      run(friendship.id, 'cancel')
                    }
                  >
                    Cancelar pedido
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-lg">
          Meus amigos
        </h2>

        {accepted.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Você ainda não possui amigos.
          </p>
        ) : (
          <div className="space-y-2">
            {accepted.map((friendship) => {
              const otherId = friendshipOtherId(
                friendship,
                myId
              );

              const profile = profileMap.get(otherId);
              const pending = actionId === friendship.id;

              return (
                <div
                  key={friendship.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4"
                >
                  <div>
                    <Link
                      to={`/u/${otherId}`}
                      className="font-medium hover:text-primary"
                    >
                      {displayName(profile, otherId)}
                    </Link>

                    {profile?.username && (
                      <p className="text-xs text-muted-foreground">
                        @{profile.username}
                      </p>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      run(friendship.id, 'remove')
                    }
                  >
                    Remover amigo
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}