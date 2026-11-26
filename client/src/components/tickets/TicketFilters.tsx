import type { TicketCategory, TicketPriority, TicketStatus } from "../../lib/types";
import { Icon } from "../ui/Icon";
import { INPUT, LABEL } from "../ui/styles";
import { SelectField } from "./fields";
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS, STATUS_OPTIONS } from "./options";

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

export const NO_FILTERS: TicketFilterValues = { status: "", priority: "", category: "", search: "" };

export function TicketFilters({ value, onChange }: Props) {
  return (
    <form
      role="search"
      aria-label="Filter tickets"
      onSubmit={(e) => e.preventDefault()}
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]"
    >
      <div className="col-span-2 sm:col-span-3 lg:col-span-1">
        <label htmlFor="search" className={LABEL}>
          Search
        </label>
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
          <input
            id="search"
            name="search"
            type="search"
            maxLength={100}
            placeholder="Title or description"
            value={value.search}
            onChange={(e) => onChange({ search: e.target.value })}
            className={`${INPUT} pl-9`}
          />
        </div>
      </div>
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
        className="col-span-2 sm:col-span-1"
        onChange={(e) => onChange({ category: e.target.value as TicketFilterValues["category"] })}
      />
    </form>
  );
}
