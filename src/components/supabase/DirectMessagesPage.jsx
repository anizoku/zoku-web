import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { getSupabaseAuthClient } from '../../api/supabaseClient.js';
import { useSupabaseAuth } from '../../lib/SupabaseAuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';


function otherUserId(friendship, myId) {
  return friendship.requester_id === myId
    ? friendship.receiver_id
    : friendship.requester_id;
}


function profileName(profile, fallbackId) {
  if (!profile) return fallbackId;

  return (
    profile.display_name ||
    (profile.username ? `@${profile.username}` : null) ||
    fallbackId
  );
}


function formatTime(value) {
  if (!value) return '';

  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return '';
  }
}


/**
 * Returns true when a message belongs to the currently open conversation.
 *
 * We check both directions because the same conversation contains:
 * - messages sent by the current user;
 * - messages received from the other user.
 */
function belongsToConversation(
  message,
  myId,
  otherUserIdValue
) {
  if (!message || !myId || !otherUserIdValue) {
    return false;
  }

  return (
    (
      message.sender_id === myId &&
      message.receiver_id === otherUserIdValue
    ) ||
    (
      message.sender_id === otherUserIdValue &&
      message.receiver_id === myId
    )
  );
}


/**
 * Inserts or updates one message in the local conversation state.
 *
 * Realtime can deliver:
 * - INSERT when a new message is created;
 * - UPDATE when read_at changes.
 *
 * Using the message UUID prevents duplicated messages when a local
 * send and a Realtime event happen almost at the same time.
 */
function mergeMessage(currentMessages, incomingMessage) {
  const existingIndex = currentMessages.findIndex(
    (message) => message.id === incomingMessage.id
  );

  let nextMessages;

  if (existingIndex === -1) {
    nextMessages = [
      ...currentMessages,
      incomingMessage,
    ];
  } else {
    nextMessages = currentMessages.map(
      (message, index) =>
        index === existingIndex
          ? {
              ...message,
              ...incomingMessage,
            }
          : message
    );
  }

  return nextMessages.sort(
    (a, b) =>
      new Date(a.created_at).getTime() -
      new Date(b.created_at).getTime()
  );
}


export default function DirectMessagesPage() {
  const {
    user,
    friendService,
    directMessageService,
  } = useSupabaseAuth();

  const myId = user?.id;

  const [friendships, setFriendships] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [activeUserId, setActiveUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');

  const [loadingFriends, setLoadingFriends] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sending, setSending] = useState(false);

  const [error, setError] = useState('');


  async function loadFriends() {
    if (!myId) return;

    setLoadingFriends(true);
    setError('');

    try {
      const rows = await friendService.list();

      const accepted = rows.filter(
        (friendship) => friendship.status === 'accepted'
      );

      const ids = accepted.map((friendship) =>
        otherUserId(friendship, myId)
      );

      const profileRows =
        await friendService.profilesByIds(ids);

      setFriendships(accepted);
      setProfiles(profileRows);

      if (
        activeUserId &&
        !ids.includes(activeUserId)
      ) {
        setActiveUserId(null);
        setMessages([]);
      }
    } catch (err) {
      setError(
        err?.message ||
          'Não foi possível carregar seus amigos.'
      );
    } finally {
      setLoadingFriends(false);
    }
  }


  useEffect(() => {
    void loadFriends();
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


  const friends = useMemo(
    () =>
      friendships.map((friendship) => {
        const id = otherUserId(
          friendship,
          myId
        );

        return {
          friendship,
          id,
          profile: profileMap.get(id),
        };
      }),
    [friendships, profileMap, myId]
  );


  const activeProfile =
    activeUserId
      ? profileMap.get(activeUserId)
      : null;


  async function openConversation(userId) {
    if (!userId) return;

    setActiveUserId(userId);
    setLoadingConversation(true);
    setError('');

    try {
      const rows =
        await directMessageService.conversation(
          userId
        );

      setMessages(rows);

      /**
       * Opening the conversation marks every unread message received
       * from this user as read.
       *
       * The database only allows the receiver to change read_at.
       */
      await directMessageService.markConversationRead(
        userId
      );

      const refreshed =
        await directMessageService.conversation(
          userId
        );

      setMessages(refreshed);
    } catch (err) {
      setError(
        err?.message ||
          'Não foi possível carregar a conversa.'
      );
    } finally {
      setLoadingConversation(false);
    }
  }


  /**
   * Realtime subscription for the currently open conversation.
   *
   * The subscription listens for INSERT and UPDATE events on
   * public.direct_messages.
   *
   * INSERT:
   * - makes new messages appear without refreshing the page.
   *
   * UPDATE:
   * - updates read_at so the sender can see "Lida" without refreshing.
   *
   * RLS remains the security boundary. The UI is not responsible for
   * deciding which database rows a user is authorized to access.
   */
  useEffect(() => {
    if (!myId || !activeUserId) {
      return undefined;
    }

    const supabase = getSupabaseAuthClient();

    const channel = supabase
      .channel(
        `direct-messages:${myId}:${activeUserId}`
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
        },
        (payload) => {
          const incomingMessage = payload.new;

          if (
            !belongsToConversation(
              incomingMessage,
              myId,
              activeUserId
            )
          ) {
            return;
          }

          setMessages((currentMessages) =>
            mergeMessage(
              currentMessages,
              incomingMessage
            )
          );

          /**
           * If the user is currently looking at the conversation,
           * an incoming message should immediately become read.
           *
           * We only do this when the current user is the receiver.
           */
          if (
            incomingMessage.receiver_id === myId &&
            incomingMessage.sender_id === activeUserId &&
            !incomingMessage.read_at
          ) {
            void directMessageService
              .markRead(incomingMessage.id)
              .catch((err) => {
                console.error(
                  'Failed to mark realtime message as read:',
                  err
                );
              });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'direct_messages',
        },
        (payload) => {
          const updatedMessage = payload.new;

          if (
            !belongsToConversation(
              updatedMessage,
              myId,
              activeUserId
            )
          ) {
            return;
          }

          setMessages((currentMessages) =>
            mergeMessage(
              currentMessages,
              updatedMessage
            )
          );
        }
      )
      .subscribe((status) => {
        /**
         * SUBSCRIBED means the browser is actively listening to
         * database changes for this channel.
         *
         * We intentionally do not show a UI error for temporary
         * reconnect states because Supabase Realtime can reconnect
         * automatically after short network interruptions.
         */
        if (status === 'CHANNEL_ERROR') {
          console.error(
            'Direct message Realtime channel error.'
          );
        }
      });

    /**
     * Important cleanup:
     * remove the previous channel when:
     * - another conversation is selected;
     * - the logged-in user changes;
     * - this page unmounts.
     *
     * This prevents duplicate subscriptions and duplicate messages.
     */
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [myId, activeUserId]);


  async function sendMessage(event) {
    event.preventDefault();

    if (
      !activeUserId ||
      sending
    ) {
      return;
    }

    const content = messageText.trim();

    if (!content) return;

    setSending(true);
    setError('');

    try {
      await directMessageService.send(
        activeUserId,
        content
      );

      setMessageText('');

      /**
       * We still refresh the conversation after a local send.
       *
       * Realtime will normally deliver the INSERT too, but keeping
       * this fetch gives us a deterministic fallback if the Realtime
       * connection is temporarily reconnecting.
       *
       * mergeMessage() prevents Realtime duplicates.
       */
      const rows =
        await directMessageService.conversation(
          activeUserId
        );

      setMessages(rows);
    } catch (err) {
      if (
        err?.code === '42501' ||
        err?.code === 'PGRST301'
      ) {
        setError(
          'Você só pode enviar mensagens para amigos.'
        );
      } else {
        setError(
          err?.message ||
            'Não foi possível enviar a mensagem.'
        );
      }
    } finally {
      setSending(false);
    }
  }


  if (loadingFriends) {
    return (
      <section className="py-8">
        <p className="text-muted-foreground">
          Carregando conversas...
        </p>
      </section>
    );
  }


  return (
    <section className="space-y-6 py-8">
      <div>
        <h1 className="font-space text-2xl font-bold">
          Mensagens
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Converse diretamente com seus amigos no Zoku.
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

      <div className="grid min-h-[520px] overflow-hidden rounded-xl border border-border bg-card md:grid-cols-[280px_1fr]">
        <aside className="border-b border-border md:border-b-0 md:border-r">
          <div className="border-b border-border p-4">
            <h2 className="font-semibold">
              Amigos
            </h2>
          </div>

          {friends.length === 0 ? (
            <div className="p-4">
              <p className="text-sm text-muted-foreground">
                Você ainda não possui amigos para conversar.
              </p>

              <Link
                to="/friends"
                className="mt-3 inline-block text-sm text-primary underline"
              >
                Abrir amizades
              </Link>
            </div>
          ) : (
            <div>
              {friends.map(
                ({
                  friendship,
                  id,
                  profile,
                }) => (
                  <button
                    key={friendship.id}
                    type="button"
                    onClick={() =>
                      openConversation(id)
                    }
                    className={`w-full border-b border-border p-4 text-left transition-colors hover:bg-secondary/50 ${
                      activeUserId === id
                        ? 'bg-secondary'
                        : ''
                    }`}
                  >
                    <p className="truncate font-medium">
                      {profileName(
                        profile,
                        id
                      )}
                    </p>

                    {profile?.username && (
                      <p className="truncate text-xs text-muted-foreground">
                        @{profile.username}
                      </p>
                    )}
                  </button>
                )
              )}
            </div>
          )}
        </aside>

        <div className="flex min-h-[520px] flex-col">
          {!activeUserId ? (
            <div className="flex flex-1 items-center justify-center p-6 text-center">
              <div>
                <p className="font-medium">
                  Selecione um amigo
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Escolha alguém na lista para abrir a conversa.
                </p>
              </div>
            </div>
          ) : (
            <>
              <header className="flex items-center justify-between border-b border-border p-4">
                <div>
                  <Link
                    to={`/u/${activeUserId}`}
                    className="font-semibold hover:text-primary"
                  >
                    {profileName(
                      activeProfile,
                      activeUserId
                    )}
                  </Link>

                  {activeProfile?.username && (
                    <p className="text-xs text-muted-foreground">
                      @{activeProfile.username}
                    </p>
                  )}
                </div>
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {loadingConversation ? (
                  <p className="text-sm text-muted-foreground">
                    Carregando conversa...
                  </p>
                ) : messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-center">
                    <div>
                      <p className="font-medium">
                        Nenhuma mensagem ainda
                      </p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        Envie a primeira mensagem.
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map(
                    (message) => {
                      const mine =
                        message.sender_id ===
                        myId;

                      return (
                        <div
                          key={message.id}
                          className={`flex ${
                            mine
                              ? 'justify-end'
                              : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[80%] rounded-xl px-3 py-2 ${
                              mine
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-foreground'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words text-sm">
                              {
                                message.content
                              }
                            </p>

                            <div className="mt-1 flex items-center justify-end gap-2 text-[10px] opacity-70">
                              <span>
                                {formatTime(
                                  message.created_at
                                )}
                              </span>

                              {mine && (
                                <span>
                                  {message.read_at
                                    ? 'Lida'
                                    : 'Enviada'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )
                )}
              </div>

              <form
                onSubmit={sendMessage}
                className="flex gap-2 border-t border-border p-4"
              >
                <Input
                  value={messageText}
                  onChange={(event) =>
                    setMessageText(
                      event.target.value
                    )
                  }
                  placeholder="Escreva uma mensagem..."
                  maxLength={3000}
                  disabled={sending}
                  autoComplete="off"
                />

                <Button
                  type="submit"
                  disabled={
                    sending ||
                    !messageText.trim()
                  }
                >
                  {sending
                    ? 'Enviando...'
                    : 'Enviar'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}