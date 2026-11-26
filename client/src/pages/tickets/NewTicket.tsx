import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { FormField } from "../../components/FormField";
import { SelectField, TextAreaField } from "../../components/tickets/fields";
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS } from "../../components/tickets/options";
import { createTicket } from "../../components/tickets/ticketApi";
import { ErrorAlert, PageHeader } from "../../components/ui/feedback";
import { button, PANEL } from "../../components/ui/styles";
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
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader title="New ticket" description="Tell us what went wrong. You can edit the ticket until work on it starts." />
      <form onSubmit={onSubmit} className={`${PANEL} space-y-6 p-5 sm:p-6`}>
        {formError && <ErrorAlert>{formError}</ErrorAlert>}
        <FormField
          label="Title"
          name="title"
          required
          minLength={3}
          maxLength={120}
          placeholder="A short summary of the problem"
          error={errors.title}
        />
        <TextAreaField
          label="Description"
          name="description"
          rows={7}
          required
          minLength={10}
          maxLength={5000}
          placeholder="What happened, what you expected, and any steps to reproduce it."
          error={errors.description}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField label="Category" name="category" defaultValue="OTHER" options={CATEGORY_OPTIONS} error={errors.category} />
          <SelectField label="Priority" name="priority" defaultValue="MEDIUM" options={PRIORITY_OPTIONS} error={errors.priority} />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-5">
          <Link to="/tickets" className={button("ghost")}>
            Cancel
          </Link>
          <button type="submit" disabled={create.isPending} className={button("primary")}>
            {create.isPending ? "Creating…" : "Create ticket"}
          </button>
        </div>
      </form>
    </div>
  );
}
