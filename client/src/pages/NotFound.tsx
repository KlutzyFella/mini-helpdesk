import { Link } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { homeFor } from "../auth/guards";
import { EmptyState, useDocumentTitle } from "../components/ui/feedback";
import { button } from "../components/ui/styles";

export function NotFound() {
  const { user } = useAuth();
  useDocumentTitle("Page not found");
  return (
    <div className="mx-auto max-w-lg pt-8">
      <h1 className="sr-only">Page not found</h1>
      <EmptyState
        icon="compass"
        title="This page does not exist"
        action={
          <Link to={user ? homeFor(user.role) : "/login"} className={button("secondary")}>
            Go to your tickets
          </Link>
        }
      >
        The link may be old, or the address may have a typo.
      </EmptyState>
    </div>
  );
}
