import type { ListMeta } from "../../lib/types";
import { button } from "../ui/styles";

interface Props {
  meta: Pick<ListMeta, "page" | "totalPages" | "total" | "limit">;
  onPage: (page: number) => void;
}

export function Pagination({ meta, onPage }: Props) {
  const { page, totalPages, total, limit } = meta;
  if (totalPages <= 1) return null;
  const first = (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);
  return (
    <nav aria-label="Pagination" className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-ink-2 tabular">
        Showing <span className="font-medium text-ink">{first}–{last}</span> of {total} · Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <button type="button" className={button("secondary", "sm")} disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </button>
        <button type="button" className={button("secondary", "sm")} disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Next
        </button>
      </div>
    </nav>
  );
}
