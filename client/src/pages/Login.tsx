import { useAuth } from "../auth/AuthContext";
import { FormField } from "../components/FormField";
import { AuthPage, authLink } from "./AuthPage";

export function Login() {
  const { login } = useAuth();
  return (
    <AuthPage
      title="Sign in"
      subtitle="Welcome back. Sign in to check on your tickets."
      submitLabel="Sign in"
      busyLabel="Signing in…"
      footer={<>No account? {authLink("/register", "Register")}</>}
      submit={(f) => login(String(f.get("email")), String(f.get("password")))}
    >
      {(errors) => (
        <>
          <FormField label="Email" name="email" type="email" autoComplete="email" required maxLength={254} error={errors.email} />
          <FormField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={1024}
            error={errors.password}
          />
        </>
      )}
    </AuthPage>
  );
}
