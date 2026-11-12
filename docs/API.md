# API reference

Base URL (local): `http://localhost:<PORT>` (the code default is 4000). All bodies and responses are JSON. Realtime events are documented in [ARCHITECTURE.md](ARCHITECTURE.md#events).

## Conventions

**Authentication.** Protected routes need `Authorization: Bearer <accessToken>`. Get a token from `POST /auth/login`. `POST /auth/refresh` uses the refresh cookie instead, so send requests with credentials included.

**Incident access.** Routes marked *member* also require the user to be a responder on the incident, or an admin.

**Errors.** Failures return `{ "error": "message" }` with an HTTP status.

| Status | Meaning |
|---|---|
| 400 | Invalid or missing input |
| 401 | Missing, invalid or expired token; or the session was revoked |
| 403 | Authenticated but not allowed on this incident |
| 404 | Incident, task or user not found |
| 409 | Conflict: lost a race, or an illegal status change |

Errors from the auth middleware: `Missing or invalid Authorization header`, `Invalid or expired token`, `Session no longer valid`. Access middleware: `You do not have access to this incident` (403), `Task not found` (404).

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | none | Health check |
| POST | `/auth/register` | none | Create an account |
| POST | `/auth/login` | none | Log in |
| POST | `/auth/refresh` | refresh cookie | New access token |
| POST | `/auth/logout` | bearer | Revoke all tokens for the user |
| GET | `/incidents` | bearer | List incidents the user can open |
| POST | `/incidents` | bearer | Create an incident |
| GET | `/incidents/:incidentId` | bearer, member | Full incident |
| PATCH | `/incidents/:incidentId/status` | bearer, member | Change status |
| GET | `/incidents/:incidentId/summary` | bearer, member | Post-incident summary |
| POST | `/incidents/:incidentId/responders` | bearer, member | Add a responder by email |
| POST | `/incidents/:incidentId/comments` | bearer, member | Add a comment |
| POST | `/incidents/:incidentId/decisions` | bearer, member | Log a decision |
| POST | `/incidents/:incidentId/tasks` | bearer, member | Create a task |
| POST | `/tasks/:taskId/claim` | bearer, member | Claim a task |
| POST | `/tasks/:taskId/complete` | bearer, member | Complete your task |

---

## System

### GET /health
```json
{ "status": "OK" }
```

## Auth

### POST /auth/register
Body: `{ "email": "alex@example.com", "password": "at-least-8-chars", "name": "Alex" }`
(`password` minimum 8 characters, `name` 1 to 100 characters.)

**201**
```json
{ "user": { "id": "<uuid>", "email": "alex@example.com", "name": "Alex", "role": "RESPONDER", "tokenVersion": 0, "createdAt": "2026-11-03T09:00:00.000Z" } }
```
Errors: **400** invalid input (`{ "error": "Invalid input", "details": { ... } }`), **409** `An account with this email already exists`.

### POST /auth/login
Body: `{ "email": "...", "password": "..." }`

**200** returns `{ "accessToken": "<jwt>", "user": { ... } }` and sets an httpOnly `refreshToken` cookie (7 days).
Errors: **400** invalid input, **401** `Invalid email or password` (same message whether the email or the password is wrong).

### POST /auth/refresh
No body. Requires the `refreshToken` cookie.

**200** `{ "accessToken": "<jwt>", "user": { ... } }`
Errors: **401** `No refresh token` or `Invalid or expired refresh token` (including a revoked session).

### POST /auth/logout
Bearer required. Increments the user's `tokenVersion` (all existing tokens stop working) and clears the cookie.

**200** `{ "message": "Logged out" }`

## Incidents

### GET /incidents
**200** `{ "incidents": [ ... ] }`, newest first. Admins see every incident; other users see only those they are a responder on. Each item is an incident row plus:
- `responders`: `[{ incidentId, userId, joinedAt, leftAt, user: { id, name, email } }]`
- `tasks`: `[ { ... } ]`

### POST /incidents
Body: `{ "title": "API latency spike", "description": "P99 up 400%", "severity": "SEV2" }`
(`severity`: `SEV1`, `SEV2`, `SEV3` or `SEV4`.) The creator becomes the first responder and the timeline records `incident.created`.

**201** `{ "incident": { "id": "<uuid>", "title": "...", "description": "...", "severity": "SEV2", "status": "DETECTED", "commanderId": null, "createdBy": "<uuid>", "createdAt": "...", "resolvedAt": null, "resolutionNote": null } }`
Errors: **400** missing or invalid fields.

### GET /incidents/:incidentId
**200** `{ "incident": { ... } }`: the incident row plus the following (this is also the `incident:snapshot` payload):

| Field | Contents |
|---|---|
| `tasks` | Tasks, each with `claimer: { name, role } \| null` |
| `comments` | Oldest first, each with `author: { name, role } \| null` |
| `decisions` | Oldest first, each with `author` |
| `timelineEvents` | Oldest first, each with `actor: { name, role } \| null` |
| `responders` | Responders with `user: { id, name, email }` |
| `allowedTransitions` | Statuses this incident may move to next |

Errors: **403** not a responder, **404** not found.

### PATCH /incidents/:incidentId/status
Body: `{ "status": "ACKNOWLEDGED" }`. When moving to `RESOLVED`, add a note of at least 10 characters (maximum 2000): `{ "status": "RESOLVED", "note": "Rolled back v2.8.1; pool recovered" }`.

**200** `{ "incident": { ... } }`

Errors:
- **400** unknown status (`{ "error": "Invalid status value", "valid": [ ... ] }`), or resolving without a valid note
- **404** incident not found
- **409** illegal transition: `{ "error": "Cannot transition from DETECTED to RESOLVED", "allowedTransitions": ["ACKNOWLEDGED"] }`
- **409** the status was changed by someone else at the same moment

Legal transitions are listed in [ARCHITECTURE.md](ARCHITECTURE.md#incident-state-machine).

### GET /incidents/:incidentId/summary
Computed on request; nothing extra is stored.

**200**
```json
{
  "summary": {
    "incidentId": "<uuid>",
    "title": "API latency spike",
    "severity": "SEV2",
    "status": "RESOLVED",
    "inProgress": false,
    "startedAt": "2026-11-03T09:00:00.000Z",
    "resolvedAt": "2026-11-03T09:18:45.000Z",
    "durationMs": 1125000,
    "timeToAcknowledgeMs": 60000,
    "commander": null,
    "resolution": "Rolled back v2.8.1; pool recovered",
    "phases": [{ "status": "INVESTIGATING", "durationMs": 420000 }],
    "counts": { "tasks": 3, "tasksCompleted": 2, "decisions": 1, "comments": 5 },
    "people": [{ "userId": "<uuid>", "name": "Alex", "isCommander": false, "tasksCompleted": 2, "comments": 3, "decisions": 1 }],
    "decisions": [{ "decisionText": "Rollback v2.8.1", "reason": "Latency rose after deploy", "madeBy": "Alex", "createdAt": "..." }]
  }
}
```
While an incident is unresolved, `inProgress` is `true` and `durationMs` runs to the current time. Errors: **403**, **404**.

### POST /incidents/:incidentId/responders
Gives a user access. Body: `{ "email": "sam@example.com" }`

- **201** `{ "message": "Responder added" }` (records `responder.added` on the timeline, naming who added whom)
- **200** `{ "message": "Already a responder" }` (safe to repeat)
- **404** `No user with that email`
- **400** missing email

### POST /incidents/:incidentId/comments
Body: `{ "body": "Checking connection pool metrics" }`
**201** `{ "comment": { "id", "incidentId", "userId", "body", "createdAt" } }`. Errors: **400** missing `body`, **404**.

### POST /incidents/:incidentId/decisions
Body: `{ "decisionText": "Scale up connection pool", "reason": "Pool exhaustion confirmed" }`
**201** `{ "decision": { "id", "incidentId", "madeBy", "decisionText", "reason", "status": "APPROVED", "createdAt" } }`. Records `decision.created`. Errors: **400**, **404**.

### POST /incidents/:incidentId/tasks
Body: `{ "title": "Check database connection pool health" }`
**201** `{ "task": { "id", "incidentId", "title", "status": "UNCLAIMED", "claimedBy": null, "claimedAt": null, "completedAt": null, "version": 0, "createdAt" } }`. Records `task.created`. Errors: **400**, **404**.

## Tasks

### POST /tasks/:taskId/claim
No body. The claim is a single conditional database update, so with simultaneous requests exactly one wins.

**200** you won
```json
{ "outcome": "claimed", "task": { "id": "<uuid>", "status": "CLAIMED", "claimedBy": "<uuid>", "claimedAt": "...", "version": 1, "claimer": { "name": "Alex", "role": "Responder" } } }
```
**409** you lost (the task is returned so the client can show who won)
```json
{ "outcome": "conflict", "message": "This task was already claimed.", "task": { "status": "CLAIMED", "claimer": { "name": "Sam", "role": "Responder" } } }
```
**404** `Task not found`. **403** not a responder on the task's incident.

### POST /tasks/:taskId/complete
No body. Only the user who claimed the task can complete it.

**200** `{ "task": { ... "status": "COMPLETED", "completedAt": "..." } }`
**409** `{ "error": "Only the person who claimed this task can complete it" }` (also returned if the task is unclaimed or already done).
