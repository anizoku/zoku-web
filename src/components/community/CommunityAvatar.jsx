export default function CommunityAvatar({ community, size = "md" }) {
  const sizes = {
    sm: "w-12 h-12 text-lg",
    md: "w-14 h-14 text-2xl",
    lg: "w-20 h-20 text-3xl",
  };

  if (community?.avatar_url) {
    return (
      <div className={`${sizes[size]} rounded-xl overflow-hidden shrink-0`}>
        <img
          src={community.avatar_url}
          alt={community.name}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className={`${sizes[size]} rounded-xl bg-primary/10 flex items-center justify-center shrink-0`}>
      <span className={`font-space font-bold text-primary ${size === "sm" ? "text-lg" : size === "lg" ? "text-3xl" : "text-2xl"}`}>
        {community?.name?.[0] ?? "?"}
      </span>
    </div>
  );
}