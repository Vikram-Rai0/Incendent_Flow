# IncidentFlow

**Real-time incident coordination.** Responders join one shared room to investigate, claim tasks, record decisions and resolve an incident. The backend is authoritative: every rule (who can claim a task, which status changes are legal, who can open an incident) is enforced on the server and pushed to every connected client.

> Portfolio project in active development. See [Known limitations](#known-limitations).

## Features

**Accounts and access**
- Register and log in with email and password (bcrypt hashes).
- Short-lived access token (15 minutes) plus a refresh token in an httpOnly cookie (7 days). The app restores the session silently on page reload.
- Logging out invalidates every token for that user at once (`tokenVersion`).
- Incidents are restricted: only responders and admins can open one. The creator becomes the first responder, and teammates are added by email.

**Incident room (realtime)**
- Status lifecycle enforced by the server: Detected, Acknowledged, Investigating, Identified, Mitigating, Resolved, Closed (with two legal steps back to Investigating).
- Investigation tasks with atomic claiming: if two people claim at once, exactly one wins and the other is told who got there first. Only the owner can mark a task done.
- "Who is doing what": each responder's current task, derived from claimed tasks.
- Automatic timeline showing the name and role of whoever acted.
- Decision log (decision plus reason) and a discussion thread.
- Live presence and a connection indicator (Live, Reconnecting, Disconnected). On join and on reconnect the client receives a full snapshot from the server.

**Resolution and review**
- Resolving requires a written note (enforced by the API).
- Summary tab: duration, time to acknowledge, time per phase, who did what, decisions made.

**Incident list**
- Search, filter by status and severity, sort.

## Screenshots

Add images to `docs/screenshots/` and link them here.

| Screen | Placeholder |
|---|---|
| Incident list | `docs/screenshots/incident-list.png` |
| Incident room | `docs/screenshots/incident-room.png` |
| Task claim conflict | `docs/screenshots/claim-conflict.png` |
| Post-incident summary | `docs/screenshots/summary.png` |

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React, TypeScript, Tailwind CSS v4, Zustand, socket.io-client, lucide-react |
| Backend | Node.js, Express 5, TypeScript, Socket.IO, Zod, bcrypt, jsonwebtoken, cookie-parser, cors |
| Database | PostgreSQL 16 accessed with Prisma 7 (`@prisma/adapter-pg`) |
| Local infrastructure | Docker Compose (PostgreSQL and Redis; Redis is provisioned but not used by the code yet) |
| Tooling | npm workspaces monorepo, `tsx` for running TypeScript |

## Project structure

```
.
├── docker-compose.yml        PostgreSQL + Redis for local development
├── package.json              npm workspaces root
├── docs/                     ARCHITECTURE, API, DATABASE, SETUP
└── apps/
    ├── api/                  Express + Socket.IO backend
    │   ├── prisma/           schema.prisma, migrations/, seed.ts
    │   ├── prisma.config.ts  Prisma 7 config (datasource + seed command)
    │   └── src/
    │       ├── server.ts     HTTP server, routes, Socket.IO wiring
    │       ├── db/           shared Prisma client
    │       ├── middleware/   auth + incident/task access checks
    │       ├── modules/
    │       │   ├── auth/       register, login, refresh, logout, JWT helpers
    │       │   ├── incidents/  incidents, state machine, access rule, timeline, summary
    │       │   ├── tasks/      atomic claim and complete
    │       │   └── user/       user lookup
    │       └── realtime/     socket auth + rooms, broadcaster
    └── web/                  Next.js frontend
        ├── app/              routes: login, register, dashboard, incidents, incidents/[id]
        ├── components/       auth/, incidents/, ui/
        ├── hooks/            useAuth, useIncidentRoom
        ├── lib/              api client, socket client, client-side state machine, formatting
        └── store/            Zustand stores (auth, incident)
```

## Quick start

Full instructions: [docs/SETUP.md](docs/SETUP.md).

```powershell
npm install                                   # repo root
docker compose up -d                          # PostgreSQL + Redis
cd apps/api
# create apps/api/.env (see SETUP.md), then:
npx prisma migrate deploy
npx prisma generate
npm run dev                                   # API
# in a second terminal
cd apps/web
# create apps/web/.env.local (see SETUP.md), then:
npm run dev                                   # web on http://localhost:3000
```

Open `http://localhost:3000`, register two accounts (use a second browser profile or an incognito window) and try the incident room with both.

## Environment variables

| File | Variable | Purpose |
|---|---|---|
| `apps/api/.env` | `DATABASE_URL` | PostgreSQL connection string |
| | `JWT_ACCESS_SECRET` | Signs access tokens |
| | `JWT_REFRESH_SECRET` | Signs refresh tokens (must differ from the access secret) |
| | `CLIENT_ORIGIN` | Web app origin allowed by CORS and Socket.IO |
| | `PORT` | API port (code default: 4000) |
| | `NODE_ENV` | `production` makes the refresh cookie secure-only |
| `apps/web/.env.local` | `NEXT_PUBLIC_API_URL` | Base URL of the REST API |
| | `NEXT_PUBLIC_WS_URL` | Base URL of the Socket.IO server (same host and port as the API) |

Never commit `.env` files. Generate secrets as described in [docs/SETUP.md](docs/SETUP.md).

## Commands

| Where | Command | What it does |
|---|---|---|
| root | `npm install` | Installs dependencies for all workspaces |
| root | `docker compose up -d` / `docker compose down` | Starts or stops PostgreSQL and Redis |
| `apps/api` | `npm run dev` | API with auto-restart (`tsx watch`) |
| | `npm run build` / `npm start` | Compile to `dist/` and run it |
| | `npx prisma migrate dev` | Create and apply a migration (development) |
| | `npx prisma migrate deploy` | Apply existing migrations |
| | `npx prisma generate` | Regenerate the Prisma client |
| | `npx prisma db seed` | Optional demo data |
| `apps/web` | `npm run dev` | Next.js dev server on port 3000 |
| | `npm run build` / `npm start` | Production build and server |
| | `npm run lint` | ESLint |

## Documentation

- [Architecture](docs/ARCHITECTURE.md): how the pieces fit, realtime model, auth, consistency decisions
- [API reference](docs/API.md): every REST endpoint
- [Database](docs/DATABASE.md): models, relationships, ER diagram
- [Setup](docs/SETUP.md): step-by-step local setup and troubleshooting

## Deployment

There is no Dockerfile or CI pipeline in the repository yet. `docker-compose.yml` is for local development only. The intended target is Vercel (web) and Railway (API and PostgreSQL). Checklist for any deployment:

1. Provision PostgreSQL and set `DATABASE_URL`.
2. Set `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (new values, not the development ones) and `NODE_ENV=production`.
3. API: `npm run build`, then `npm start`. Run `npx prisma migrate deploy` before the first start and after schema changes.
4. Set `CLIENT_ORIGIN` to the deployed web URL.
5. Web: set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` to the deployed API URL, then `npm run build`. These values are baked in at build time, so rebuild after changing them.
6. The host must support WebSocket connections.
7. The refresh token is an httpOnly cookie. Serve the web app and API from the same site, or review the cookie `SameSite` settings in `auth.controller.ts`, otherwise the browser will not send the cookie and every reload will log the user out.

## Known limitations

- No automated tests yet.
- Redis is provisioned in `docker-compose.yml` but not used. Presence is held by Socket.IO in memory, so the API currently runs as a single instance.
- `GET /incidents` returns everything (no pagination).
- The schema has an incident `commanderId`, but there is no endpoint to assign a commander yet.
- Several user references (`commanderId`, `createdBy`, `claimedBy`, `madeBy`, `Comment.userId`) are plain strings, not database foreign keys.
- Socket events from the client are minimally validated (`incident:join` and `incident:leave` accept only string ids).
