import AuthPage from "@/pages/AuthPage";

/**
 * Custom Auth Pages entrypoint — Base44 expects this filename.
 * Renders the Zoku AuthPage (split-screen design) in signup mode.
 */
export default function Register() {
  return <AuthPage mode="signup" />;
}