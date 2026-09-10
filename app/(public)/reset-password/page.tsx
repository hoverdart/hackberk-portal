import { AuthForm } from "@/components/auth/auth-form";
import { updatePasswordAction } from "../auth-actions";

export default function ResetPasswordPage() { return <AuthForm mode="reset" action={updatePasswordAction} />; }
