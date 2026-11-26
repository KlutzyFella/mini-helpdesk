import { CATEGORIES, CATEGORY_LABELS, PRIORITIES, PRIORITY_LABELS, STATUSES, STATUS_LABELS } from "../../lib/enums";

const toOptions = <K extends string>(keys: readonly K[], labels: Record<K, string>) =>
  keys.map((k) => ({ value: k, label: labels[k] }));

export const STATUS_OPTIONS = toOptions(STATUSES, STATUS_LABELS);
export const PRIORITY_OPTIONS = toOptions(PRIORITIES, PRIORITY_LABELS);
export const CATEGORY_OPTIONS = toOptions(CATEGORIES, CATEGORY_LABELS);
