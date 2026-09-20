function assertUuid(value, name = 'id') {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  ) {
    throw new Error(`INVALID_${name.toUpperCase()}`);
  }

  return value;
}

function assertRpcSuccess(data) {
  const status = data?.status;

  const successStatuses = new Set([
    'SENT',
    'ACCEPTED',
    'REJECTED',
    'CANCELLED',
    'REMOVED',
    'ALREADY_ACCEPTED',
    'ALREADY_FRIENDS',
    'ALREADY_PENDING',
    'INCOMING_REQUEST',
  ]);

  if (!status || !successStatuses.has(status)) {
    const error = new Error(status || 'FRIENDSHIP_ERROR');
    error.code = status || 'FRIENDSHIP_ERROR';
    throw error;
  }

  return data;
}

export function createFriendService(client, currentUserId) {
  if (!client) {
    throw new Error('SUPABASE_CLIENT_REQUIRED');
  }

  async function list() {
    if (!currentUserId) return [];

    assertUuid(currentUserId, 'current_user_id');

    const { data, error } = await client
      .from('friendships')
      .select(
        'id, requester_id, receiver_id, status, created_at, updated_at'
      )
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  }

  async function profilesByIds(ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
      return [];
    }

    const uniqueIds = [...new Set(ids.filter(Boolean))];

    if (uniqueIds.length === 0) {
      return [];
    }

    uniqueIds.forEach((id) => {
      assertUuid(id, 'profile_id');
    });

    const { data, error } = await client
      .from('public_profiles')
      .select(
        'id, username, display_name, avatar_url, avatar_crop, profile_visibility'
      )
      .in('id', uniqueIds);

    if (error) throw error;

    return data || [];
  }

  async function send(receiverId) {
    assertUuid(receiverId, 'receiver_id');

    const { data, error } = await client.rpc(
      'send_friend_request',
      {
        receiver_id: receiverId,
      }
    );

    if (error) throw error;

    return assertRpcSuccess(data);
  }

  async function accept(friendshipId) {
    assertUuid(friendshipId, 'friendship_id');

    const { data, error } = await client.rpc(
      'accept_friend_request',
      {
        friendship_id: friendshipId,
      }
    );

    if (error) throw error;

    return assertRpcSuccess(data);
  }

  async function reject(friendshipId) {
    assertUuid(friendshipId, 'friendship_id');

    const { data, error } = await client.rpc(
      'reject_friend_request',
      {
        friendship_id: friendshipId,
      }
    );

    if (error) throw error;

    return assertRpcSuccess(data);
  }

  async function cancel(friendshipId) {
    assertUuid(friendshipId, 'friendship_id');

    const { data, error } = await client.rpc(
      'cancel_friend_request',
      {
        friendship_id: friendshipId,
      }
    );

    if (error) throw error;

    return assertRpcSuccess(data);
  }

  async function remove(friendshipId) {
    assertUuid(friendshipId, 'friendship_id');

    const { data, error } = await client.rpc(
      'remove_friend',
      {
        friendship_id: friendshipId,
      }
    );

    if (error) throw error;

    return assertRpcSuccess(data);
  }

  return {
    list,
    profilesByIds,
    send,
    accept,
    reject,
    cancel,
    remove,
  };
}