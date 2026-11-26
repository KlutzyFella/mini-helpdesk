import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

const WAKE_DELAY_MS = 3000;

export function WakeBanner() {
  const [waking, setWaking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const slowTimer = setTimeout(() => {
      if (!cancelled) setWaking(true);
    }, WAKE_DELAY_MS);

    const ping = () => {
      apiFetch("/health")
        .then(() => {
          if (cancelled) return;
          clearTimeout(slowTimer);
          setWaking(false);
        })
        .catch(() => {
          if (!cancelled) timer = setTimeout(ping, WAKE_DELAY_MS);
        });
    };
    ping();

    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
      clearTimeout(timer);
    };
  }, []);

  if (!waking) return null;
  return (
    <div role="status" className="tone-amber tone-soft border-b border-line">
      <p className="mx-auto flex max-w-6xl items-center justify-center gap-2.5 px-4 py-2 text-center text-sm">
        <span aria-hidden="true" className="size-2 shrink-0 rounded-full tone-fill animate-pulse-dot" />
        The server is waking up. This can take up to a minute.
      </p>
    </div>
  );
}
