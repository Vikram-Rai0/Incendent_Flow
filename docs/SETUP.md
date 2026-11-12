# Setup

Local development setup for the IncidentFlow monorepo. The commands are for Windows PowerShell; on macOS or Linux they are the same apart from path separators.

## Prerequisites

| Tool | Notes |
|---|---|
| Node.js 20 or newer | Developed on Node 24. Check with `node -v` |
| npm | Comes with Node |
| Docker Desktop | Runs PostgreSQL and Redis. It must be **running** before database commands |
| Git | |

## 1. Install dependencies

From the repository root (npm workspaces installs both apps):

```powershell
npm install
```

## 2. Start PostgreSQL and Redis

```powershell
docker compose up -d
docker compose ps
```

Both services should show `Up`. The database name, user and password are defined in `docker-compose.yml` (development values only). Data is kept in a Docker volume; `docker compose down` stops the containers and keeps the data, while `docker compose down -v` also deletes it.

Redis is started but not used by the application yet.

## 3. Configure the API

Create `apps/api/.env`:

```
PORT=5000
CLIENT_ORIGIN=http://localhost:3000
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/<database>"
JWT_ACCESS_SECRET=<long random string>
JWT_REFRESH_SECRET=<a different long random string>
```

- Take `<user>`, `<password>` and `<database>` from `docker-compose.yml`.
- Generate each secret with the command below and use two different values:

```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

| Variable | Notes |
|---|---|
| `PORT` | Optional. The code falls back to 4000 |
| `CLIENT_ORIGIN` | Must match the web app's address exactly (`http://localhost:3000`) |
| `NODE_ENV` | Optional. `production` makes the refresh cookie secure-only |

`.env` files are git-ignored. Do not commit them.

## 4. Configure the web app

Create `apps/web/.env.local`, using the same port as `PORT` above:

```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=http://localhost:5000
```

Both variables are needed. Without `NEXT_PUBLIC_WS_URL` the browser tries to open the socket on the web server (port 3000) and fails with 404 errors. Next.js reads `.env.local` at startup, so restart `npm run dev` after changing it.

## 5. Set up the database

```powershell
cd apps/api
npx prisma migrate deploy
npx prisma generate
```

`migrate deploy` applies the migrations in `apps/api/prisma/migrations/`. Use `npx prisma migrate dev --name <change>` instead when you are changing the schema.

Optional demo data:

```powershell
npx prisma db seed
```

The seeded users have placeholder password hashes and cannot log in. Register real accounts in the app instead.

## 6. Run the apps

API (terminal 1):

```powershell
cd apps/api
npm run dev
```

Web (terminal 2):

```powershell
cd apps/web
npm run dev
```

The web app is at `http://localhost:3000`. Use exactly that address (not `127.0.0.1`), because the CORS origin and the refresh cookie are tied to it.

## 7. Try it

1. Register an account at `/register`.
2. Declare an incident.
3. In an incognito window, register a second account and open the same incident URL. You should see "You don't have access".
4. In the first window, add the second user by email in the Responders panel, then refresh the second window.
5. Change the status, add tasks, and claim a task from both windows at once.

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| `ECONNREFUSED` from Prisma or the API | Docker Desktop is not running, or the containers are down. Run `docker compose up -d` |
| Prisma error about `url` in `schema.prisma`, or it uses a `prisma+postgres://` URL | The connection string belongs in `DATABASE_URL` in `apps/api/.env` and is read by `prisma.config.ts`. Use a normal `postgresql://` URL |
| `secretOrPrivateKey must have a value` | `JWT_ACCESS_SECRET` or `JWT_REFRESH_SECRET` is missing or `.env` was not loaded. Restart the API after editing `.env` |
| Socket requests to `localhost:3000/socket.io` return 404 | `NEXT_PUBLIC_WS_URL` is missing or the web server was not restarted |
| CORS errors, or logged out on every reload | The browser address does not match `CLIENT_ORIGIN`. Open `http://localhost:3000` |
| Type errors mentioning missing Prisma fields | Run `npx prisma generate` and restart the editor's TypeScript server |
| Port already in use | Change `PORT` in `apps/api/.env` and update both `NEXT_PUBLIC_*` variables to match |
