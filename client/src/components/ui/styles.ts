// The single source for control and button class strings, so every screen shares one vocabulary.

export type ButtonVariant = "primary" | "secondary" | "danger" | "dangerSolid" | "ghost";
export type ButtonSize = "sm" | "md";

const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-150 disabled:cursor-not-allowed";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent shadow-sm hover:bg-accent-hover disabled:bg-line-strong disabled:text-ink-3 disabled:shadow-none",
  secondary:
    "bg-surface text-ink ring-1 ring-inset ring-line-strong hover:bg-surface-2 disabled:text-ink-3 disabled:hover:bg-surface",
  danger:
    "bg-surface text-danger ring-1 ring-inset ring-line-strong hover:bg-[color-mix(in_oklab,var(--danger)_8%,var(--surface))] disabled:opacity-60",
  dangerSolid: "bg-danger text-on-accent shadow-sm hover:bg-danger-hover disabled:opacity-60",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink disabled:opacity-60",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
};

export function button(variant: ButtonVariant = "secondary", size: ButtonSize = "md"): string {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]}`;
}

export const CONTROL =
  "block w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink shadow-[0_1px_0_0_var(--line)] transition-[border-color,box-shadow] duration-150 hover:border-ink-3 focus:border-accent focus:outline-none focus:ring-3 focus:ring-[color-mix(in_oklab,var(--accent)_22%,transparent)] aria-invalid:border-danger aria-invalid:focus:ring-[color-mix(in_oklab,var(--danger)_22%,transparent)] disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-3";

export const INPUT = `${CONTROL} h-10`;
export const TEXTAREA = `${CONTROL} py-2.5 leading-relaxed`;
export const SELECT = `${CONTROL} select-chevron h-10 pr-9`;

export const LABEL = "mb-1.5 block text-[13px] font-medium text-ink-2";

export const FIELD_ERROR = "mt-1.5 text-[13px] text-danger";

export const PANEL = "rounded-xl border border-line bg-surface";
