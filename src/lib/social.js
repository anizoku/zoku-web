// Social helpers — friendship status, notification creation
import { base44 } from "@/api/base44Client";

export async function sendFriendRequest(requester, receiverEmail, receiverName) {
  // Create friendship record
  await base44.entities.Friendship.create({
    requester_email: requester.email,
    receiver_email: receiverEmail,
    requester_name: requester.full_name,
    receiver_name: receiverName,
    status: "pending",
  });
  // Notify receiver
  await base44.entities.Notification.create({
    recipient_email: receiverEmail,
    type: "friend_request",
    message: `${requester.full_name} enviou uma solicitação de amizade`,
    from_name: requester.full_name,
    from_email: requester.email,
  });
}

export async function acceptFriendRequest(friendshipId, friendship, currentUser) {
  await base44.entities.Friendship.update(friendshipId, { status: "accepted" });
  await base44.entities.Notification.create({
    recipient_email: friendship.requester_email,
    type: "friend_accepted",
    message: `${currentUser.full_name} aceitou sua solicitação de amizade`,
    from_name: currentUser.full_name,
    from_email: currentUser.email,
  });
}

export async function notifyEventInvite(eventTitle, participantEmail, inviterName) {
  await base44.entities.Notification.create({
    recipient_email: participantEmail,
    type: "event_invite",
    message: `${inviterName} criou o evento: ${eventTitle}`,
    from_name: inviterName,
  });
}

export function getFriendshipStatus(friendships, myEmail, targetEmail) {
  const f = friendships.find(
    (f) =>
      (f.requester_email === myEmail && f.receiver_email === targetEmail) ||
      (f.receiver_email === myEmail && f.requester_email === targetEmail)
  );
  if (!f) return null;
  return { ...f, iAmRequester: f.requester_email === myEmail };
}

export function getMyFriends(friendships, myEmail) {
  return friendships
    .filter((f) => f.status === "accepted" &&
      (f.requester_email === myEmail || f.receiver_email === myEmail))
    .map((f) => ({
      email: f.requester_email === myEmail ? f.receiver_email : f.requester_email,
      name: f.requester_email === myEmail ? f.receiver_name : f.requester_name,
    }));
}