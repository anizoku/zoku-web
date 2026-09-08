import AuthPage from "@/pages/AuthPage";

/**
 * Custom Auth Pages entrypoint — Base44 expects this filename.
 * Renders the Zoku AuthPage (split-screen design) in forgot mode.
 */
export default function ForgotPassword() {
  return <AuthPage mode="forgot" />;
}