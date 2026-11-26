import type { InputHTMLAttributes } from "react";
import { FIELD_ERROR, INPUT, LABEL } from "./ui/styles";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function FormField({ label, error, hint, id, className = "", ...input }: Props) {
  const fieldId = id ?? input.name;
  const describedBy = [error && `${fieldId}-error`, hint && `${fieldId}-hint`].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={fieldId} className={LABEL}>
        {label}
      </label>
      <input id={fieldId} aria-invalid={error ? true : undefined} aria-describedby={describedBy} className={INPUT} {...input} />
      {hint && !error && (
        <p id={`${fieldId}-hint`} className="mt-1.5 text-[13px] text-ink-3">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${fieldId}-error`} className={FIELD_ERROR}>
          {error}
        </p>
      )}
    </div>
  );
}
