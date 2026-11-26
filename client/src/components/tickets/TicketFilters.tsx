import type { TicketCategory, TicketPriority, TicketStatus } from "../../lib/types";
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS, STATUS_OPTIONS } from "./options";
import { SelectField } from "./fields";

export interface TicketFilterValues {
  status: TicketStatus | "";
  priority: TicketPriority | "";
  category: TicketCategory | "";
  search: string;
}

interface Props {
  value: TicketFilterValues;
  onChange: (patch: Partial<TicketFilterValues>) => void;
}

export function TicketFilters({ value, onChange }: Props) {
  return (
    <form role="search" aria-label="Filter tickets" onSubmit={(e) => e.preventDefault()} className="grid gap-3 sm:grid-cols-4">
      <SelectField
        label="Status"
        name="status"
        value={value.status}
        options={STATUS_OPTIONS}
        placeholder="All statuses"
        onChange={(e) => onChange({ status: e.target.value as TicketFilterValues["status"] })}
      />
      <SelectField
        label="Priority"
        name="priority"
        value={value.priority}
        options={PRIORITY_OPTIONS}
        placeholder="All priorities"
        onChange={(e) => onChange({ priority: e.target.value as TicketFilterValues["priority"] })}
      />
      <SelectField
        label="Category"
        name="category"
        value={value.category}
        options={CATEGORY_OPTIONS}
        placeholder="All categories"
        onChange={(e) => onChange({ category: e.target.value as TicketFilterValues["category"] })}
      />
      <div>
        <label htmlFor="search" className="mb-1 block text-sm font-medium">
          Search
        </label>
        <input
          id="search"
          name="search"
          type="search"
          maxLength={100}
          placeholder="Title or description"
          value={value.search}
          onChange={(e) => onChange({ search: e.target.value })}
          className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
    </form>
  );
}
