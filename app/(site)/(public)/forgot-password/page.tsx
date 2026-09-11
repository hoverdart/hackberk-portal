import { AuthForm } from "@/components/auth/auth-form";
import { forgotPasswordAction } from "../auth-actions";

export default function ForgotPasswordPage() {
  return <AuthForm mode="forgot" action={forgotPasswordAction} />;
}
