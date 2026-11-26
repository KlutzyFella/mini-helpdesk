import type { ListMeta } from "../../lib/types";

interface Props {
  meta: Pick<ListMeta, "page" | "totalPages" | "total">;
  onPage: (page: number) => void;
}

const BTN =
  "rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50";

export function Pagination({ meta, onPage }: Props) {
  const { page, totalPages, total } = meta;
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-3">
      <p className="text-sm text-neutral-600">
        Page {page} of {totalPages} ({total} tickets)
      </p>
      <div className="flex gap-2">
        <button type="button" className={BTN} disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </button>
        <button type="button" className={BTN} disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Next
        </button>
      </div>
    </nav>
  );
}
