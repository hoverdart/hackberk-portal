import { AuthForm } from "@/components/auth/auth-form";
import { signUpAction } from "../auth-actions";

export default function SignUpPage() {
  return <AuthForm mode="sign-up" action={signUpAction} />;
}
