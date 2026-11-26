import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { homeFor } from "../auth/guards";
import { WakeBanner } from "../components/WakeBanner";
import { fieldErrors, messageFor } from "../lib/errors";
import type { PublicUser } from "../lib/types";

interface Props {
  title: string;
  submitLabel: string;
  footer: ReactNode;
  submit: (form: FormData) => Promise<PublicUser>;
  children: (errors: Record<string, string>) => ReactNode;
}

export function AuthPage({ title, submitLabel, footer, submit, children }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    setErrors({});
    try {
      const signedIn = await submit(new FormData(e.currentTarget));
      const from = (location.state as { from?: { pathname: string; search?: string } } | null)?.from;
      const allowed = signedIn.role === "USER" ? from?.pathname.startsWith("/tickets") : from?.pathname.startsWith("/admin");
      navigate(allowed && from ? `${from.pathname}${from.search ?? ""}` : homeFor(signedIn.role), { replace: true });
    } catch (err) {
      setErrors(fieldErrors(err));
      setFormError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <WakeBanner />
      <div className="mx-auto mt-16 w-full max-w-sm px-4">
        <h1 className="mb-6 text-2xl font-semibold">{title}</h1>
        <form onSubmit={onSubmit} className="space-y-4 rounded border border-neutral-200 bg-white p-6">
          {formError && (
            <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">
              {formError}
            </p>
          )}
          {children(errors)}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {busy ? "Please wait..." : submitLabel}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-neutral-600">{footer}</p>
      </div>
    </div>
  );
}

export function authLink(to: string, text: string) {
  return (
    <Link to={to} className="text-accent hover:underline">
      {text}
    </Link>
  );
}
