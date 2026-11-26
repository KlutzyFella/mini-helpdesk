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
    <div role="status" className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
      The server is waking up. This can take up to a minute.
    </div>
  );
}
