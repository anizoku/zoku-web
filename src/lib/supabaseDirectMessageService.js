function assertUuid(value, name = 'id') {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  ) {
    throw new Error(`INVALID_${name.toUpperCase()}`);
  }

  return value;
}

function normalizeContent(content) {
  if (typeof content !== 'string') {
    throw new Error('INVALID_MESSAGE_CONTENT');
  }

  const value = content.trim();

  if (!value) {
    throw new Error('EMPTY_MESSAGE');
  }

  if (value.length > 3000) {
    throw new Error('MESSAGE_TOO_LONG');
  }

  return value;
}

export function createDirectMessageService(client, currentUserId) {
  if (!client) {
    throw new Error('SUPABASE_CLIENT_REQUIRED');
  }

  function requireCurrentUser() {
    return assertUuid(currentUserId, 'current_user_id');
  }

  async function conversation(otherUserId) {
    const me = requireCurrentUser();
    const other = assertUuid(otherUserId, 'other_user_id');

    const { data, error } = await client
      .from('direct_messages')
      .select(
        'id, sender_id, receiver_id, content, read_at, created_at'
      )
      .or(
        `and(sender_id.eq.${me},receiver_id.eq.${other}),and(sender_id.eq.${other},receiver_id.eq.${me})`
      )
      .order('created_at', { ascending: true });

    if (error) throw error;

    return data || [];
  }

  async function inbox() {
    const me = requireCurrentUser();

    const { data, error } = await client
      .from('direct_messages')
      .select(
        'id, sender_id, receiver_id, content, read_at, created_at'
      )
      .or(`sender_id.eq.${me},receiver_id.eq.${me}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  }

  async function send(receiverId, content) {
    const me = requireCurrentUser();
    const receiver = assertUuid(receiverId, 'receiver_id');
    const message = normalizeContent(content);

    if (receiver === me) {
      throw new Error('CANNOT_MESSAGE_SELF');
    }

    const { data, error } = await client
      .from('direct_messages')
      .insert({
        sender_id: me,
        receiver_id: receiver,
        content: message,
      })
      .select(
        'id, sender_id, receiver_id, content, read_at, created_at'
      )
      .single();

    if (error) throw error;

    return data;
  }

  async function markRead(messageId) {
    const me = requireCurrentUser();
    const id = assertUuid(messageId, 'message_id');

    const { data, error } = await client
      .from('direct_messages')
      .update({
        read_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('receiver_id', me)
      .is('read_at', null)
      .select(
        'id, sender_id, receiver_id, content, read_at, created_at'
      )
      .maybeSingle();

    if (error) throw error;

    return data;
  }

  async function markConversationRead(otherUserId) {
    const me = requireCurrentUser();
    const other = assertUuid(otherUserId, 'other_user_id');

    const { data, error } = await client
      .from('direct_messages')
      .update({
        read_at: new Date().toISOString(),
      })
      .eq('sender_id', other)
      .eq('receiver_id', me)
      .is('read_at', null)
      .select('id');

    if (error) throw error;

    return data || [];
  }

  return {
    conversation,
    inbox,
    send,
    markRead,
    markConversationRead,
  };
}