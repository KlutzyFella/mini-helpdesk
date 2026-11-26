import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { FormField } from "../../components/FormField";
import { SelectField, TextAreaField } from "../../components/tickets/fields";
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS } from "../../components/tickets/options";
import { createTicket } from "../../components/tickets/ticketApi";
import { fieldErrors, messageFor } from "../../lib/errors";
import type { TicketCategory, TicketPriority } from "../../lib/types";

export function NewTicket() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [formError, setFormError] = useState("");
  const create = useMutation({
    mutationFn: (f: FormData) =>
      createTicket({
        title: String(f.get("title")),
        description: String(f.get("description")),
        category: String(f.get("category")) as TicketCategory,
        priority: String(f.get("priority")) as TicketPriority,
      }),
    onSuccess: async (ticket) => {
      await qc.invalidateQueries({ queryKey: ["tickets"] });
      navigate(`/tickets/${ticket.id}`);
    },
    onError: (err) => setFormError(messageFor(err)),
  });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    create.mutate(new FormData(e.currentTarget));
  }

  const errors = fieldErrors(create.error);
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-semibold">New ticket</h1>
      <form onSubmit={onSubmit} className="space-y-4 rounded border border-neutral-200 bg-white p-6">
        {formError && (
          <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">
            {formError}
          </p>
        )}
        <FormField label="Title" name="title" required minLength={3} maxLength={120} error={errors.title} />
        <TextAreaField
          label="Description"
          name="description"
          rows={6}
          required
          minLength={10}
          maxLength={5000}
          error={errors.description}
        />
        <SelectField label="Category" name="category" defaultValue="OTHER" options={CATEGORY_OPTIONS} error={errors.category} />
        <SelectField label="Priority" name="priority" defaultValue="MEDIUM" options={PRIORITY_OPTIONS} error={errors.priority} />
        <button
          type="submit"
          disabled={create.isPending}
          className="rounded bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {create.isPending ? "Creating..." : "Create ticket"}
        </button>
      </form>
    </div>
  );
}
