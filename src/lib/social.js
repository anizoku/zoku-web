// Social helpers — friendship, notifications, watch together
import { base44 } from "@/api/base44Client";

export async function sendFriendRequest(requester, receiverEmail, receiverName) {
  await base44.entities.Friendship.create({
    requester_email: requester.email,
    receiver_email: receiverEmail,
    requester_name: requester.full_name,
    receiver_name: receiverName,
    status: "pending",
  });
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
  await base44.entities.ActivityFeed.create({
    actor_email: currentUser.email,
    actor_name: currentUser.full_name,
    target_email: friendship.requester_email,
    target_name: friendship.requester_name,
    activity_type: "friend_added",
    description: `${currentUser.full_name} e ${friendship.requester_name} agora são amigos`,
  });
}

export async function sendWatchTogetherInvite(initiator, friendEmail, friendName, mediaTitle, mediaType, targetEp) {
  const wt = await base44.entities.WatchTogether.create({
    initiator_email: initiator.email,
    initiator_name: initiator.full_name,
    friend_email: friendEmail,
    friend_name: friendName,
    media_title: mediaTitle,
    media_type: mediaType,
    target_episode: mediaType === "anime" ? targetEp : undefined,
    target_chapter: mediaType === "manga" ? targetEp : undefined,
    status: "pending",
  });
  const label = mediaType === "manga" ? "ler" : "assistir";
  const epLabel = mediaType === "manga" ? `Capítulo ${targetEp}` : `EP ${targetEp}`;
  await base44.entities.Notification.create({
    recipient_email: friendEmail,
    type: "watch_together_invite",
    message: `${initiator.full_name} quer ${label} ${mediaTitle} ${epLabel} com você`,
    from_name: initiator.full_name,
    from_email: initiator.email,
    reference_id: wt.id,
  });
  await base44.entities.ActivityFeed.create({
    actor_email: initiator.email,
    actor_name: initiator.full_name,
    target_email: friendEmail,
    target_name: friendName,
    activity_type: "watch_together_created",
    media_title: mediaTitle,
    media_episode: targetEp,
    description: `${initiator.full_name} e ${friendName} marcaram ${mediaTitle} ${epLabel} para ${mediaType === "manga" ? "Ler Juntos" : "Assistir Juntos"}`,
  });
}

export async function checkWatchTogetherProximity(userEmail, userName, entries, watchTogetherList) {
  for (const wt of watchTogetherList) {
    if (wt.status !== "accepted") continue;
    const isInitiator = wt.initiator_email === userEmail;
    const isFriend = wt.friend_email === userEmail;
    if (!isInitiator && !isFriend) continue;

    const target = wt.media_type === "manga" ? wt.target_chapter : wt.target_episode;
    const entry = entries.find(e => e.title === wt.media_title);
    if (!entry) continue;

    const current = wt.media_type === "manga" ? (entry.current_chapter || 0) : (entry.current_episode || 0);
    const diff = target - current;
    const otherEmail = isInitiator ? wt.friend_email : wt.initiator_email;
    const label = wt.media_type === "manga" ? "ler" : "assistir";
    const epLabel = wt.media_type === "manga" ? `Capítulo ${target}` : `EP ${target}`;
    const action = wt.media_type === "manga" ? "Ler Juntos" : "Assistir Juntos";

    if (diff === 5 && !wt.notified_5) {
      await base44.entities.Notification.create({
        recipient_email: otherEmail,
        type: "watch_together_near_5",
        message: `Faltam 5 ${wt.media_type === "manga" ? "capítulos" : "episódios"} para vocês ${label}em ${wt.media_title} ${epLabel} juntos`,
        from_name: userName,
        from_email: userEmail,
        reference_id: wt.id,
      });
      await base44.entities.WatchTogether.update(wt.id, { notified_5: true });
    } else if (diff === 1 && !wt.notified_1) {
      await base44.entities.Notification.create({
        recipient_email: otherEmail,
        type: "watch_together_near_1",
        message: `O próximo ${wt.media_type === "manga" ? "capítulo" : "episódio"} é o combinado! Prepare-se para ${label} ${wt.media_title} ${epLabel} junto com seu amigo`,
        from_name: userName,
        from_email: userEmail,
        reference_id: wt.id,
      });
      await base44.entities.WatchTogether.update(wt.id, { notified_1: true });
    }
  }
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