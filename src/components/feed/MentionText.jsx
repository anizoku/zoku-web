import { Link } from "react-router-dom";

// Renders comment text with @username mentions highlighted as links.
// profiles: UserProfile[] to resolve username -> email.
export default function MentionText({ content, profiles = [] }) {
  if (!content) return null;
  const usernameMap = new Map();
  for (const p of profiles) {
    if (p.username) usernameMap.set(p.username.toLowerCase(), p.user_email);
  }

  const parts = content.split(/(@[\w.]+)/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^@([\w.]+)$/);
        if (m) {
          const email = usernameMap.get(m[1].toLowerCase());
          if (email) {
            return (
              <Link
                key={i}
                to={`/u/${email}`}
                className="text-primary font-semibold hover:underline"
              >
                {part}
              </Link>
            );
          }
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}