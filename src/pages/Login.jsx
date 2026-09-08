import AuthPage from "@/pages/AuthPage";

/**
 * Custom Auth Pages entrypoint — Base44 expects this filename.
 * Renders the Zoku AuthPage (split-screen design) instead of the
 * generic template, preserving the approved visual experience.
 */
export default function Login() {
  return <AuthPage mode="login" />;
}