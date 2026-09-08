import ResetPasswordPage from "@/pages/ResetPasswordPage";

/**
 * Custom Auth Pages entrypoint — Base44 expects this filename.
 * Renders the Zoku ResetPasswordPage (PT-BR, with getResetToken helper
 * that accepts both `resetToken` and `token` query params).
 */
export default function ResetPassword() {
  return <ResetPasswordPage />;
}