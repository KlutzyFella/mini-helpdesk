# API reference

The Mini Helpdesk API is a JSON REST API. Every route except `/health` is under `/api`.

| Environment | Base URL |
|---|---|
| Live | `https://mini-helpdesk-api.onrender.com` |
| Local | `http://localhost:4000` |

The live API runs on Render's free tier and sleeps when idle. The first request after a pause can take up to about a minute.

## Authentication

`POST /api/auth/register` and `POST /api/auth/login` return a JWT. Send it on every other request in the `Authorization` header:

```
Authorization: Bearer <token>
```

The token is signed with HS256, carries only the user id in `sub`, and expires after `JWT_EXPIRES_IN` (1 day by default). On each request the server loads the user's id, name, email, and role from the database. A missing, malformed, expired, or wrongly signed token returns `401 UNAUTHENTICATED`. A valid token for a user who no longer exists returns the same.

## Response envelope

Every response body has the same four keys.

```json
{ "success": true, "data": { "status": "ok" }, "error": null, "meta": null }
```

```json
{
	"success": false,
	"data": null,
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Validation failed",
		"details": [{ "field": "title", "message": "Too small: expected string to have >=3 characters" }]
	}
}
```

- `data` is the resource, a list, or `null` on an error.
- `meta` is `null` except on the ticket list and the notification list.
- `error.details` appears only on `VALIDATION_ERROR` and `EMAIL_TAKEN`. Each item names a `field`. A nested field uses a dotted path.
- `error.requestId` appears only on `INTERNAL_ERROR`. It matches the request id in the server log. A 500 never carries a stack trace.
- `DELETE /api/tickets/:id` returns `204 No Content` with no body.

All timestamps are ISO 8601 strings in UTC, such as `2026-11-26T12:25:08.794Z`.

## Error codes

The API returns only these codes. The list lives in `server/src/lib/errors.ts`.

| Code | Status | When |
|---|---|---|
| `VALIDATION_ERROR` | 400 | The body or query fails its Zod schema. This includes an unknown key in a body. |
| `INVALID_JSON` | 400 | The body is not valid JSON. |
| `UNAUTHENTICATED` | 401 | The token is missing, malformed, expired, or wrongly signed, or its user no longer exists. |
| `INVALID_CREDENTIALS` | 401 | Login failed. An unknown email and a wrong password return the same body. |
| `FORBIDDEN` | 403 | The route requires the other role. |
| `NOT_FOUND` | 404 | The ticket or notification does not exist, belongs to another user, or has a malformed id. Also returned for an unknown route. |
| `EMAIL_TAKEN` | 409 | Register with an email that is already registered, in any letter case. |
| `TICKET_LOCKED` | 409 | The owner edits or deletes a ticket that is no longer `OPEN`. |
| `INVALID_TRANSITION` | 409 | The admin status move is not in the transition table. |
| `TICKET_CLOSED` | 409 | An admin change or a new comment on a `CLOSED` ticket. |
| `CONCURRENT_UPDATE` | 409 | Another request moved the ticket's status between the check and the write. Reload and retry. |
| `CONFLICT` | 409 | A unique-constraint violation that no service handles itself. No current endpoint reaches it. |
| `PAYLOAD_TOO_LARGE` | 413 | The JSON body is over 100 kb. |
| `RATE_LIMITED` | 429 | Too many login and register requests from one IP. |
| `INTERNAL_ERROR` | 500 | Any other failure. The message is always "Internal server error". |

### Order of checks

Each request runs its checks in a fixed order, and the first failure decides the response.

| Order | Check | Status |
|---|---|---|
| 1 | `authenticate` reads the token | 401 |
| 2 | `authorize(role)` on the route | 403 |
| 3 | The controller parses `:id`, then the body or query | 404 for the id, 400 for the body or query |
| 4 | The service finds the ticket inside the caller's scope | 404 |
| 5 | The rules in `tickets.rules.ts` check the ticket's state | 409 |
| 6 | The guarded write finds the row changed | 409 |

## Endpoints

| Method | Path | Who may call it |
|---|---|---|
| GET | `/health` | anyone |
| POST | `/api/auth/register` | anyone, rate-limited |
| POST | `/api/auth/login` | anyone, rate-limited |
| GET | `/api/auth/me` | any signed-in user |
| GET | `/api/tickets` | any signed-in user |
| POST | `/api/tickets` | USER |
| GET | `/api/tickets/:id` | the owner or an ADMIN |
| PATCH | `/api/tickets/:id` | the owning USER, while the ticket is `OPEN` |
| DELETE | `/api/tickets/:id` | the owning USER, while the ticket is `OPEN` |
| PATCH | `/api/admin/tickets/:id` | ADMIN |
| GET | `/api/tickets/:id/comments` | the owner or an ADMIN |
| POST | `/api/tickets/:id/comments` | the owner or an ADMIN |
| GET | `/api/tickets/:id/activity` | the owner or an ADMIN |
| GET | `/api/notifications` | any signed-in user |
| PATCH | `/api/notifications/:id/read` | the recipient |
| GET | `/api/admin/stats` | ADMIN |

### `GET /health`

Returns `200` with `{ "status": "ok" }`. It does not touch the database. The client calls it to detect a sleeping server.

### `POST /api/auth/register`

Creates a USER account and signs it in. Nobody can register as an ADMIN.

| Field | Rule |
|---|---|
| `name` | string, trimmed, 1 to 80 characters |
| `email` | valid email, at most 254 characters, trimmed and lowercased |
| `password` | at least 8 characters and at most 72 UTF-8 bytes |

Any other key, `role` included, returns 400.

Success: `201`.

```json
{
	"success": true,
	"data": {
		"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
		"user": { "id": "adc4371f-9d86-47cc-8058-8fc48d654607", "name": "Dana", "email": "dana@example.com", "role": "USER" }
	},
	"error": null,
	"meta": null
}
```

Errors: `VALIDATION_ERROR`, `INVALID_JSON`, `EMAIL_TAKEN`, `RATE_LIMITED`.

### `POST /api/auth/login`

| Field | Rule |
|---|---|
| `email` | valid email, trimmed and lowercased |
| `password` | string, 1 to 1024 characters |

Success: `200` with the same `{ token, user }` shape as register.

Errors: `VALIDATION_ERROR`, `INVALID_JSON`, `INVALID_CREDENTIALS`, `RATE_LIMITED`. Login does not apply the register password rules, so a wrong password shorter than 8 characters returns `INVALID_CREDENTIALS`, not `VALIDATION_ERROR`.

### Rate limit

Login and register share one limiter: `AUTH_RATE_LIMIT` requests per minute per client IP, 10 by default. The response carries the `RateLimit` and `RateLimit-Policy` headers. Request 11 within the minute returns `429 RATE_LIMITED`. No other route is limited.

### `GET /api/auth/me`

Returns `200` with the signed-in user: `{ id, name, email, role }`.

Errors: `UNAUTHENTICATED`.

### `GET /api/tickets`

Lists tickets. A USER sees only their own tickets. An ADMIN sees every ticket.

| Parameter | Rule | Default |
|---|---|---|
| `status` | `OPEN`, `IN_PROGRESS`, `RESOLVED`, or `CLOSED` | none |
| `priority` | `LOW`, `MEDIUM`, `HIGH`, or `URGENT` | none |
| `category` | `BUG`, `BILLING`, `ACCOUNT`, `FEATURE_REQUEST`, or `OTHER` | none |
| `search` | trimmed, at most 100 characters. Matches `title` or `description`, case-insensitive. `%`, `_`, and `\` match literally. An empty value is ignored. | none |
| `sort` | `createdAt`, `updatedAt`, or `priority` | `createdAt` |
| `order` | `asc` or `desc` | `desc` |
| `page` | integer, at least 1 | `1` |
| `limit` | integer, 1 to 50 | `20` |

- A value out of range returns `400 VALIDATION_ERROR`. An unknown parameter is ignored.
- `id` is always the second sort key, so a row never appears on two pages.
- `priority` sorts in enum order: `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
- A page past the end returns `200` with an empty list.
- The list and its count read one database snapshot, so `meta.total` always matches the rows.

Success: `200`. `data` is an array of tickets, and `meta` is `{ page, limit, total, totalPages }`.

```json
{
	"success": true,
	"data": [
		{
			"id": "74b2848d-2deb-4b15-acdb-f02ba525c6fd",
			"title": "Cannot export report",
			"description": "The CSV export button returns an error.",
			"category": "BUG",
			"priority": "MEDIUM",
			"status": "OPEN",
			"createdById": "adc4371f-9d86-47cc-8058-8fc48d654607",
			"resolvedAt": null,
			"createdAt": "2026-11-26T12:25:08.794Z",
			"updatedAt": "2026-11-26T12:25:08.794Z",
			"createdBy": { "id": "adc4371f-9d86-47cc-8058-8fc48d654607", "name": "Dana" },
			"permissions": { "edit": true, "priority": false, "delete": true, "comment": true, "nextStatuses": [] }
		}
	],
	"error": null,
	"meta": { "page": 1, "limit": 1, "total": 1, "totalPages": 1 }
}
```

Errors: `UNAUTHENTICATED`, `VALIDATION_ERROR`.

### `POST /api/tickets`

Creates a ticket owned by the caller. An ADMIN gets 403.

| Field | Rule |
|---|---|
| `title` | string, trimmed, 3 to 120 characters |
| `description` | string, trimmed, 10 to 5000 characters |
| `category` | a `TicketCategory` value |
| `priority` | optional `TicketPriority` value. Defaults to `MEDIUM`. |

The status always starts at `OPEN`.

Success: `201` with one ticket, in the shape of a list item.

Errors: `UNAUTHENTICATED`, `FORBIDDEN`, `VALIDATION_ERROR`, `INVALID_JSON`.

### `GET /api/tickets/:id`

Success: `200` with one ticket, in the shape of a list item.

Errors: `UNAUTHENTICATED`, `NOT_FOUND`. A USER gets 404 for another user's ticket, not 403.

### `PATCH /api/tickets/:id`

The owner edits the content of an `OPEN` ticket. An ADMIN gets 403 and uses the admin route instead.

| Field | Rule |
|---|---|
| `title` | optional, same rule as create |
| `description` | optional, same rule as create |
| `category` | optional `TicketCategory` value |

Send at least one field. Any other key, `status` and `priority` included, returns 400 naming the field.

Success: `200` with the updated ticket.

Errors: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `INVALID_JSON`, `TICKET_LOCKED`.

### `DELETE /api/tickets/:id`

The owner deletes an `OPEN` ticket. Its comments, activity, and notifications are deleted with it. An ADMIN gets 403, because admins close tickets instead.

Success: `204` with no body.

Errors: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `TICKET_LOCKED`.

### `PATCH /api/admin/tickets/:id`

An ADMIN changes the status, the priority, or both. A USER gets 403.

| Field | Rule |
|---|---|
| `status` | optional `TicketStatus` value. Must be an allowed move from the current status. |
| `priority` | optional `TicketPriority` value |

Send at least one field. The server checks a patch with both fields as a whole: if the status move is not allowed, the priority does not change either.

The allowed status moves:

| From | To |
|---|---|
| `OPEN` | `IN_PROGRESS`, `CLOSED` |
| `IN_PROGRESS` | `RESOLVED`, `OPEN` |
| `RESOLVED` | `CLOSED`, `IN_PROGRESS` |
| `CLOSED` | none |

A move to `RESOLVED` sets `resolvedAt`. A move to `CLOSED` keeps it. Any other move clears it.

Success: `200` with the updated ticket.

```json
{
	"success": true,
	"data": {
		"id": "74b2848d-2deb-4b15-acdb-f02ba525c6fd",
		"title": "Cannot export CSV report",
		"status": "IN_PROGRESS",
		"priority": "HIGH",
		"resolvedAt": null,
		"permissions": { "edit": false, "priority": true, "delete": false, "comment": true, "nextStatuses": ["RESOLVED", "OPEN"] }
	},
	"error": null,
	"meta": null
}
```

Some ticket fields are left out of this example. The full shape is the same as a list item.

Errors: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `INVALID_JSON`, `TICKET_CLOSED`, `INVALID_TRANSITION`, `CONCURRENT_UPDATE`.

### `GET /api/tickets/:id/comments`

Returns `200` with the ticket's comments, oldest first. A `CLOSED` ticket still lists its comments.

```json
{
	"success": true,
	"data": [
		{
			"id": "918ee060-c093-4448-abc3-e01d6a4efb04",
			"body": "Looking into it.",
			"createdAt": "2026-11-26T12:25:08.927Z",
			"author": { "id": "3fddf249-16a5-4090-8271-0b4af5529254", "name": "Admin", "role": "ADMIN" }
		}
	],
	"error": null,
	"meta": null
}
```

Errors: `UNAUTHENTICATED`, `NOT_FOUND`.

### `POST /api/tickets/:id/comments`

| Field | Rule |
|---|---|
| `body` | string, trimmed, 1 to 2000 characters |

Success: `201` with one comment, in the shape of a list item.

Errors: `UNAUTHENTICATED`, `NOT_FOUND`, `VALIDATION_ERROR`, `INVALID_JSON`, `TICKET_CLOSED`.

### `GET /api/tickets/:id/activity`

Returns `200` with the ticket's activity, in the order it happened.

```json
{
	"success": true,
	"data": [
		{
			"id": 192,
			"type": "STATUS_CHANGED",
			"metadata": { "from": "OPEN", "to": "IN_PROGRESS" },
			"createdAt": "2026-11-26T12:25:08.905Z",
			"actor": { "id": "3fddf249-16a5-4090-8271-0b4af5529254", "name": "Admin", "role": "ADMIN" }
		}
	],
	"error": null,
	"meta": null
}
```

Errors: `UNAUTHENTICATED`, `NOT_FOUND`.

### `GET /api/notifications`

Returns `200` with the caller's newest 20 notifications. `meta.unreadCount` counts every unread notification, not only the 20 returned.

```json
{
	"success": true,
	"data": [
		{
			"id": "12a890ba-dce4-40f1-8e0c-4ea588f61a7c",
			"type": "TICKET_RESOLVED",
			"message": "\"Cannot export CSV report\" was resolved",
			"readAt": null,
			"createdAt": "2026-11-26T12:25:08.967Z",
			"ticket": { "id": "74b2848d-2deb-4b15-acdb-f02ba525c6fd", "title": "Cannot export CSV report" }
		}
	],
	"error": null,
	"meta": { "unreadCount": 3 }
}
```

Errors: `UNAUTHENTICATED`.

### `PATCH /api/notifications/:id/read`

Marks one of the caller's notifications as read. The request has no body. A second call returns `200` with the same `readAt`.

Success: `200` with the notification.

Errors: `UNAUTHENTICATED`, `NOT_FOUND`. Another user's notification returns 404.

### `GET /api/admin/stats`

Returns `200` with ticket counts and the mean time to resolve. Each count object has a key for every enum value, so an empty bucket reads `0`. `total` is the sum of `byStatus`. All five values come from one snapshot.

`avgResolutionHours` is the mean of `resolvedAt - createdAt` in hours, rounded to 2 decimals, over every ticket with a `resolvedAt`. A ticket that was resolved and then closed keeps its `resolvedAt` and still counts. A ticket moved back to `IN_PROGRESS` loses it and drops out. The value is `null` when no ticket has resolved.

```json
{
	"success": true,
	"data": {
		"total": 12,
		"byStatus": { "OPEN": 4, "IN_PROGRESS": 3, "RESOLVED": 2, "CLOSED": 3 },
		"byPriority": { "LOW": 2, "MEDIUM": 5, "HIGH": 4, "URGENT": 1 },
		"byCategory": { "BUG": 5, "BILLING": 2, "ACCOUNT": 2, "FEATURE_REQUEST": 2, "OTHER": 1 },
		"avgResolutionHours": 26.4
	},
	"error": null,
	"meta": null
}
```

Errors: `UNAUTHENTICATED`, `FORBIDDEN`.

## The `permissions` object

Every ticket in a list or detail response carries `permissions`. The server computes it from the caller's role and the ticket's status, with the same functions that guard the writes. The client shows a button only when its flag allows it, and copies no rule.

| Key | Type | True when |
|---|---|---|
| `edit` | boolean | the caller is the owning USER and the ticket is `OPEN` |
| `delete` | boolean | the caller is the owning USER and the ticket is `OPEN` |
| `priority` | boolean | the caller is an ADMIN and the ticket is not `CLOSED` |
| `comment` | boolean | the ticket is not `CLOSED` |
| `nextStatuses` | array of `TicketStatus` | the statuses an ADMIN may move to. Always empty for a USER. |

## Activity types

Each change writes one row per event. An admin request that changes status and priority writes two rows: the status event first, then `TICKET_UPDATED`.

| `type` | Written when | `metadata` |
|---|---|---|
| `TICKET_CREATED` | a USER creates a ticket | `null` |
| `TICKET_UPDATED` | the owner edits content, or an admin changes priority | `{ "changes": { ... } }` with only the fields that changed, among `title`, `description`, `category`, and `priority` |
| `STATUS_CHANGED` | an admin moves status to anything except `RESOLVED` | `{ "from": "<status>", "to": "<status>" }` |
| `TICKET_RESOLVED` | an admin moves status to `RESOLVED` | `{ "from": "<status>", "to": "RESOLVED" }` |
| `COMMENT_ADDED` | anyone adds a comment | `{ "commentId": "<uuid>" }` |

The same events create notifications. The person who acted is never notified.

| `type` | Who is notified |
|---|---|
| `TICKET_CREATED` | every admin |
| `TICKET_UPDATED` | nobody |
| `STATUS_CHANGED` | the owner |
| `TICKET_RESOLVED` | the owner |
| `COMMENT_ADDED` by the owner | every admin |
| `COMMENT_ADDED` by an admin | the owner |

## Run the Postman collection

`docs/helpdesk.postman_collection.json` has 30 requests in 7 folders, with test assertions on each request. It registers a new user with a random email, creates a ticket, and walks the ticket through comments, triage, activity, and notifications, then checks the admin stats against the ticket list. Each step saves the ids and tokens that later steps need.

To run it in Postman:

1. Import `docs/helpdesk.postman_collection.json`.
2. Set the collection variables `baseUrl`, `adminEmail`, and `adminPassword`.
3. Run the whole collection in order with the collection runner.

To run it from the command line with newman, start from the repository root. For the live API:

```sh
npx newman@6.2.3 run docs/helpdesk.postman_collection.json \
	--env-var baseUrl=https://mini-helpdesk-api.onrender.com \
	--env-var adminEmail=admin@email.com \
	--env-var adminPassword=password
```

For a local server, set `baseUrl=http://localhost:4000` and use the `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `server/.env`. To run one folder, add `--folder <name>`, such as `--folder Tickets`. Later folders depend on variables that earlier folders set, so run `Auth` and `Tickets` first.
