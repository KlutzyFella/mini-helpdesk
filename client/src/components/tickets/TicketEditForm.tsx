import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { ApiError } from "../../lib/api";
import { fieldErrors, messageFor } from "../../lib/errors";
import type { TicketView } from "../../lib/types";
import { FormField } from "../FormField";
import { SelectField, TextAreaField } from "./fields";
import { CATEGORY_OPTIONS } from "./options";
import { updateTicket, useInvalidateTicket } from "./ticketApi";

interface Props {
  ticket: TicketView;
  onDone: () => void;
}

export function TicketEditForm({ ticket, onDone }: Props) {
  const invalidate = useInvalidateTicket();
  const [error, setError] = useState("");
  const save = useMutation({
    mutationFn: (f: FormData) =>
      updateTicket(ticket.id, {
        title: String(f.get("title")),
        description: String(f.get("description")),
        category: String(f.get("category")) as TicketView["category"],
      }),
    onSuccess: async () => {
      await invalidate(ticket.id);
      onDone();
    },
    onError: async (err) => {
      setError(messageFor(err));
      // A locked ticket changed under us: refetch so the permissions flags catch up.
      if (err instanceof ApiError && err.status === 409) await invalidate(ticket.id);
    },
  });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    save.mutate(new FormData(e.currentTarget));
  }

  const errors = fieldErrors(save.error);
  return (
    <form onSubmit={onSubmit} aria-label="Edit ticket" className="space-y-4 rounded border border-neutral-200 bg-white p-4">
      {error && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      <FormField label="Title" name="title" defaultValue={ticket.title} required minLength={3} maxLength={120} error={errors.title} />
      <TextAreaField
        label="Description"
        name="description"
        rows={6}
        defaultValue={ticket.description}
        required
        minLength={10}
        maxLength={5000}
        error={errors.description}
      />
      <SelectField label="Category" name="category" defaultValue={ticket.category} options={CATEGORY_OPTIONS} error={errors.category} />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={save.isPending || !ticket.permissions.edit}
          className="rounded bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {save.isPending ? "Saving..." : "Save changes"}
        </button>
        <button type="button" onClick={onDone} className="rounded border border-neutral-300 bg-white px-3 py-2 text-sm hover:bg-neutral-100">
          Cancel
        </button>
      </div>
    </form>
  );
}
