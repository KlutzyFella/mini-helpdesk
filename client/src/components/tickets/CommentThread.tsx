import { useState, type FormEvent, type KeyboardEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { fieldErrors, messageFor } from "../../lib/errors";
import { formatDateTime } from "../../lib/format";
import type { CommentView } from "../../lib/types";
import { ErrorAlert, Skeleton } from "../ui/feedback";
import { Icon } from "../ui/Icon";
import { button } from "../ui/styles";
import { fetchComments, postComment, useInvalidateTicket } from "./ticketApi";
import { TextAreaField } from "./fields";

interface Props {
  ticketId: string;
  canComment: boolean;
}

const MAX_COMMENT = 2000;

function Avatar({ name, admin }: { name: string; admin: boolean }) {
  const letter = name.trim()[0]?.toUpperCase() ?? "?";
  return (
    <span
      aria-hidden="true"
      className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${
        admin ? "bg-accent text-on-accent" : "bg-surface-2 text-ink-2 ring-1 ring-line ring-inset"
      }`}
    >
      {letter}
    </span>
  );
}

function Comment({ c }: { c: CommentView }) {
  const admin = c.author.role === "ADMIN";
  return (
    <li className="flex gap-3">
      <Avatar name={c.author.name} admin={admin} />
      <div className={`min-w-0 flex-1 rounded-xl border px-4 py-3 ${admin ? "border-line bg-accent-soft/50" : "border-line bg-surface"}`}>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
          <span className="font-medium text-ink">{c.author.name}</span>
          {admin && <span className="rounded-md bg-accent px-1.5 py-px text-[11px] font-semibold text-on-accent">Admin</span>}
          <time dateTime={c.createdAt} className="text-[13px] text-ink-3">
            {formatDateTime(c.createdAt)}
          </time>
        </p>
        <p className="mt-1.5 max-w-[72ch] text-[15px] leading-relaxed whitespace-pre-wrap text-ink">{c.body}</p>
      </div>
    </li>
  );
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
  const canPost = !add.isPending && body.trim() !== "";

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (canPost) add.mutate();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canPost) {
      e.preventDefault();
      add.mutate();
    }
  }

  const count = comments.data?.length;

  return (
    <section aria-labelledby="comments-heading" className="space-y-4">
      <h2 id="comments-heading" className="flex items-baseline gap-2 text-base font-semibold text-ink">
        Comments
        {count !== undefined && count > 0 && <span className="text-sm font-normal text-ink-3 tabular">{count}</span>}
      </h2>
      {comments.isPending && (
        <div role="status" aria-label="Loading comments" className="flex gap-3">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-20 flex-1 rounded-xl" />
        </div>
      )}
      {comments.isError && <ErrorAlert>{messageFor(comments.error)}</ErrorAlert>}
      {count === 0 && (
        <p className="text-sm text-ink-3">No comments yet.{canComment && " Start the conversation below."}</p>
      )}
      {count !== undefined && count > 0 && (
        <ul className="space-y-4">
          {comments.data?.map((c) => (
            <Comment key={c.id} c={c} />
          ))}
        </ul>
      )}
      {canComment ? (
        <form onSubmit={onSubmit} className="space-y-3 pt-2">
          {add.isError && <ErrorAlert>{messageFor(add.error)}</ErrorAlert>}
          <div className="rounded-xl border border-line-strong bg-surface transition-[border-color,box-shadow] duration-150 focus-within:border-accent focus-within:ring-3 focus-within:ring-[color-mix(in_oklab,var(--accent)_22%,transparent)]">
            <TextAreaField
              label="Add a comment"
              hideLabel
              name="comment"
              rows={3}
              required
              maxLength={MAX_COMMENT}
              placeholder="Write a reply…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={onKeyDown}
              error={fieldErrors(add.error).body}
              className="block w-full resize-y rounded-t-xl border-0 bg-transparent px-4 pt-3 pb-2 text-[15px] leading-relaxed text-ink focus:outline-none"
            />
            <div className="flex items-center justify-between gap-3 border-t border-line px-3 py-2">
              <span className="hidden text-xs text-ink-3 sm:inline">
                <kbd className="font-sans">Ctrl</kbd> + <kbd className="font-sans">Enter</kbd> to post
              </span>
              <span className="ml-auto flex items-center gap-3">
                {body.length > MAX_COMMENT * 0.8 && (
                  <span className="text-xs text-ink-3 tabular">
                    {body.length}/{MAX_COMMENT}
                  </span>
                )}
                <button type="submit" disabled={!canPost} className={button("primary", "sm")}>
                  <Icon name="send" className="size-3.5" />
                  {add.isPending ? "Posting…" : "Post comment"}
                </button>
              </span>
            </div>
          </div>
        </form>
      ) : (
        <p className="rounded-lg bg-surface-2 px-4 py-3 text-sm text-ink-2">This ticket is closed, so it takes no new comments.</p>
      )}
    </section>
  );
}
