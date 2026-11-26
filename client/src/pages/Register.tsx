import { useAuth } from "../auth/AuthContext";
import { FormField } from "../components/FormField";
import { AuthPage, authLink } from "./AuthPage";

export function Register() {
  const { register } = useAuth();
  return (
    <AuthPage
      title="Create an account"
      submitLabel="Register"
      footer={<>Already registered? {authLink("/login", "Sign in")}</>}
      submit={(f) => register(String(f.get("name")), String(f.get("email")), String(f.get("password")))}
    >
      {(errors) => (
        <>
          <FormField label="Name" name="name" autoComplete="name" required maxLength={80} error={errors.name} />
          <FormField label="Email" name="email" type="email" autoComplete="email" required maxLength={254} error={errors.email} />
          <FormField
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            error={errors.password}
          />
        </>
      )}
    </AuthPage>
  );
}
