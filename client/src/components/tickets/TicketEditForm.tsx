import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { ApiError } from "../../lib/api";
import { fieldErrors, messageFor } from "../../lib/errors";
import type { TicketView } from "../../lib/types";
import { FormField } from "../FormField";
import { ErrorAlert } from "../ui/feedback";
import { button, PANEL } from "../ui/styles";
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
    <form
      onSubmit={onSubmit}
      onKeyDown={(e) => e.key === "Escape" && !save.isPending && onDone()}
      aria-label="Edit ticket"
      className={`${PANEL} space-y-5 p-5`}
    >
      {error && <ErrorAlert>{error}</ErrorAlert>}
      <FormField
        label="Title"
        name="title"
        defaultValue={ticket.title}
        required
        minLength={3}
        maxLength={120}
        autoFocus
        error={errors.title}
      />
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
      <SelectField
        label="Category"
        name="category"
        defaultValue={ticket.category}
        options={CATEGORY_OPTIONS}
        error={errors.category}
        className="sm:max-w-xs"
      />
      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <button type="submit" disabled={save.isPending || !ticket.permissions.edit} className={button("primary", "sm")}>
          {save.isPending ? "Saving…" : "Save changes"}
        </button>
        <button type="button" onClick={onDone} className={button("ghost", "sm")}>
          Cancel
        </button>
      </div>
    </form>
  );
}
