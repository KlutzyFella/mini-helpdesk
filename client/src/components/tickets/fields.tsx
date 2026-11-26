import { forwardRef, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { FIELD_ERROR, LABEL, SELECT, TEXTAREA } from "../ui/styles";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
}

export function SelectField({ label, error, id, options, placeholder, className = "", ...select }: SelectProps) {
  const fieldId = id ?? select.name;
  return (
    <div className={className}>
      <label htmlFor={fieldId} className={LABEL}>
        {label}
      </label>
      <select
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={SELECT}
        {...select}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${fieldId}-error`} className={FIELD_ERROR}>
          {error}
        </p>
      )}
    </div>
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hideLabel?: boolean;
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextAreaField(
  { label, error, hideLabel = false, id, ...area },
  ref,
) {
  const fieldId = id ?? area.name;
  return (
    <div>
      <label htmlFor={fieldId} className={hideLabel ? "sr-only" : LABEL}>
        {label}
      </label>
      <textarea
        ref={ref}
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={TEXTAREA}
        {...area}
      />
      {error && (
        <p id={`${fieldId}-error`} className={FIELD_ERROR}>
          {error}
        </p>
      )}
    </div>
  );
});
