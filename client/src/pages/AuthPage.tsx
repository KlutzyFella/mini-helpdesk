import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { homeFor } from "../auth/guards";
import { ErrorAlert, useDocumentTitle } from "../components/ui/feedback";
import { BrandMark } from "../components/ui/Icon";
import { button } from "../components/ui/styles";
import { WakeBanner } from "../components/WakeBanner";
import { fieldErrors, messageFor } from "../lib/errors";
import type { PublicUser } from "../lib/types";

interface Props {
  title: string;
  subtitle: string;
  submitLabel: string;
  busyLabel: string;
  footer: ReactNode;
  submit: (form: FormData) => Promise<PublicUser>;
  children: (errors: Record<string, string>) => ReactNode;
}

export function AuthPage({ title, subtitle, submitLabel, busyLabel, footer, submit, children }: Props) {
  const { user } = useAuth();
  useDocumentTitle(title);
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
    <div className="flex min-h-dvh flex-col">
      <WakeBanner />
      <main className="flex flex-1 flex-col items-center px-4 pt-[12vh] pb-16">
        <div className="w-full max-w-[22rem]">
          <Link to="/" className="mb-8 inline-flex items-center gap-2.5 rounded-md">
            <BrandMark className="size-8" />
            <span className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Mini Helpdesk</span>
          </Link>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink">{title}</h1>
          <p className="mt-1.5 text-sm text-ink-2">{subtitle}</p>
          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            {formError && <ErrorAlert>{formError}</ErrorAlert>}
            {children(errors)}
            <button type="submit" disabled={busy} className={`${button("primary")} w-full`}>
              {busy ? busyLabel : submitLabel}
            </button>
          </form>
          <p className="mt-8 border-t border-line pt-6 text-sm text-ink-2">{footer}</p>
        </div>
      </main>
    </div>
  );
}

export function authLink(to: string, text: string) {
  return (
    <Link to={to} className="font-medium text-accent-ink hover:underline">
      {text}
    </Link>
  );
}
