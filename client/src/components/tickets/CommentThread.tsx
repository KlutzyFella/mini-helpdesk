import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { fieldErrors, messageFor } from "../../lib/errors";
import { formatDateTime } from "../../lib/format";
import { fetchComments, postComment, useInvalidateTicket } from "./ticketApi";
import { TextAreaField } from "./fields";

interface Props {
  ticketId: string;
  canComment: boolean;
}

export function CommentThread({ ticketId, canComment }: Props) {
  const invalidate = useInvalidateTicket();
  const [body, setBody] = useState("");
  const comments = useQuery({ queryKey: ["comments", ticketId], queryFn: () => fetchComments(ticketId) });
  const add = useMutation({
    mutationFn: () => postComment(ticketId, body.trim()),
    onSuccess: () => {
      setBody("");
      return invalidate(ticketId);
    },
    onError: () => invalidate(ticketId),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    add.mutate();
  }

  return (
    <section aria-labelledby="comments-heading" className="space-y-4">
      <h2 id="comments-heading" className="text-lg font-semibold">
        Comments
      </h2>
      {comments.isPending && <p className="text-sm text-neutral-500">Loading comments...</p>}
      {comments.isError && (
        <p role="alert" className="text-sm text-red-700">
          {messageFor(comments.error)}
        </p>
      )}
      {comments.data?.length === 0 && <p className="text-sm text-neutral-500">No comments yet.</p>}
      <ul className="space-y-3">
        {comments.data?.map((c) => (
          <li key={c.id} className="rounded border border-neutral-200 bg-white p-3">
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{c.author.name}</span>
              {c.author.role === "ADMIN" && (
                <span className="rounded bg-accent px-1.5 py-0.5 text-xs font-medium text-white">Admin</span>
              )}
              <time dateTime={c.createdAt} className="text-neutral-500">
                {formatDateTime(c.createdAt)}
              </time>
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
          </li>
        ))}
      </ul>
      {canComment ? (
        <form onSubmit={onSubmit} className="space-y-3">
          {add.isError && (
            <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">
              {messageFor(add.error)}
            </p>
          )}
          <TextAreaField
            label="Add a comment"
            name="comment"
            rows={3}
            required
            maxLength={2000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            error={fieldErrors(add.error).body}
          />
          <button
            type="submit"
            disabled={add.isPending || body.trim() === ""}
            className="rounded bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {add.isPending ? "Posting..." : "Post comment"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-neutral-600">This ticket is closed.</p>
      )}
    </section>
  );
}
