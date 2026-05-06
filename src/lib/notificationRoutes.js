// Maps notification types to their destination routes
export function getNotificationRoute(notification) {
  const { type, reference_id, from_email } = notification;

  switch (type) {
    case "friend_request":
    case "friend_accepted":
      return "/friends?tab=requests";

    case "event_invite":
    case "event_reminder":
      return reference_id ? `/events?eventId=${reference_id}` : "/events";

    case "watch_together_invite":
    case "watch_together_near_5":
    case "watch_together_near_1":
      return "/friends?tab=friends";

    case "post_liked":
    case "post_commented":
      return reference_id ? `/?postId=${reference_id}` : "/";

    case "direct_message":
      return from_email ? `/friends?chat=${from_email}` : "/friends";

    default:
      return null;
  }
}