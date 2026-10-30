# Nexus Service Marketing System (Node.js)

[![CI](https://github.com/htn2408/nexus-management-system/actions/workflows/ci.yml/badge.svg)](https://github.com/htn2408/nexus-management-system/actions/workflows/ci.yml)

Full-stack app for a telecom provider's orders, connections, billing and inventory. The REST API is a Node.js / Express rewrite of the original ASP.NET Core backend that keeps the same database and the same API contract. The frontend in [`frontend-react/`](frontend-react) is built in plain JavaScript with React 19, Vite, Tailwind CSS, and Socket.IO for real-time updates.

## Technology stack

- **Backend:** Node.js 22+ / Express 5 (plain JavaScript, ES modules)
- **Database:** SQL Server through the `mssql` driver, with hand-written SQL in the repository layer
- **Document store:** MongoDB through Mongoose, for chat, OTP codes and notification history
- **Auth:** JWT with role-based authorization and session persistence across page reloads
- **Real-time:** Socket.IO for notifications and chat
- **Frontend:** React 19, plain JavaScript, React Router 7, Vite, Tailwind CSS, served by nginx in production

## Architecture

The code is organised in layers. Each layer only calls the layer directly below it.

```
Route → Middleware → Controller → Service → Repository → Database
```

| Layer | Responsibility |
|---|---|
| `routes/` | Declares URLs and wires middleware and controllers together |
| `middlewares/` | JWT authentication, role checks, input validation, error handling |
| `controllers/` | Reads the request, calls a service and sends the response |
| `services/` | Business rules: billing, discounts, ID generation, transactions |
| `repositories/` | All SQL Server and MongoDB queries |

```text
src/
├── config/        environment, SQL Server pool, MongoDB connection
├── constants/     roles, statuses, bulk discounts, realtime event names
├── routes/
├── middlewares/
├── controllers/
├── services/
├── repositories/
├── models/        Mongoose schemas
├── validators/    request validation rules
├── utils/         AppError, JWT, money (decimal.js), dates, ID helpers
├── sockets/       Socket.IO setup and group handling
├── app.js         Express app (exported for tests)
└── server.js      starts HTTP + Socket.IO
database/
└── NexusSystem_Database.sql   SQL Server schema and seed data
```

## Getting started

### Quick demo (one command)

The fastest way to try the whole system needs only Docker:

```bash
npm run demo:up      # docker compose -f docker-compose.demo.yml up -d --build
```

It starts a fresh SQL Server seeded from `database/NexusSystem_Database.sql`, MongoDB, the API and the frontend, on their own ports and volumes so nothing else on the machine is touched:

| What | Where |
|---|---|
| Frontend | `http://localhost:3100` |
| API and Swagger UI | `http://localhost:5205`, `http://localhost:5205/api-docs` |
| SQL Server | `localhost,14330`, user `sa`, password in `docker-compose.demo.yml` |

Every seeded staff account and every seeded customer with an email signs in with the password `1234567890`, for example `sarah.jenkins@nexus.telecom` (Manager), `david.chen@nexus.telecom` (Retail Staff), `marcus.ramirez@nexus.telecom` (Field Engineer) and `elena.rostova@nexus.telecom` (Senior Accountant). The demo passwords and JWT key are for local use only.

Customers sign in with their Account ID and a one-time code sent by email (try `B064-000000000002`). The demo has no SMTP server, so every email is written as an `.html` file to `logs/demo-emails/`; the OTP is the last six digits of the file name.

`npm run demo:down` stops the demo and deletes its data; the next `demo:up` seeds it again.

### Local development

Prerequisites: Node.js 22 or later, and Docker (for SQL Server and MongoDB).

```bash
npm install
cp .env.example .env

# Start only the databases (the schema is seeded on first run)
docker compose up -d sqlserver sqlserver-init mongodb

# Start the API with auto-reload
npm run dev
```

The API listens on `http://localhost:5105`. `GET /api/health` reports whether SQL Server and MongoDB are reachable.

Interactive API documentation (Swagger UI) is served at `http://localhost:5105/api-docs`, and the raw OpenAPI spec at `/api-docs.json`. Log in through `POST /api/auth/login`, click **Authorize** and paste the token to try protected endpoints. Set `API_DOCS=false` to turn it off.

### Frontend

```bash
cd frontend-react
pnpm install
pnpm dev
# hoặc gọi API của stack demo (cổng 5205):
VITE_API_URL= API_PROXY_TARGET=http://localhost:5205 pnpm dev
```

The dev server runs on `http://localhost:3000` and calls the API at `http://localhost:5105` (override with `VITE_API_URL`). Seeded staff accounts sign in with the password `1234567890`, which the staff login form fills in.

### Whole stack in containers

```bash
docker compose up -d --build
```

This starts SQL Server, MongoDB, the API on port 5105, and the frontend on `http://localhost:3000`. nginx in the `web` container forwards `/api` and the Socket.IO path `/hubs` to the API. The SA password is read from `DB_PASSWORD` in `.env` (default `Nexus@12345`).

> This Compose file shares its data volumes (`moinhat_sqlserver_data`, `moinhat_mongodb_data`) and host ports (1433, 27017, 5105) with the original ASP.NET project, so both backends work on the same data. Never run both stacks at the same time: stop one before starting the other.

## API modules

| Area | Base path | Who can call it |
|---|---|---|
| Health | `/api/health` | Anyone |
| Auth and customer OTP login | `/api/auth` | Anyone |
| Self-service order form | `/api/public/orders` | Anyone |
| Live chat | `/api/chat` | Guests chat without an account; listing sessions, marking them read and replying as admin need Manager |
| Notification history | `/api/notifications` | Signed in; only the caller's own role group or account IDs |
| Plans, vendors, retail shops, employees, stock, purchase orders, settings | `/api/admin/*` | Manager |
| Customer feedback | `/api/admin/feedback` | Manager; any signed-in user can submit |
| Orders, feasibility, installation, connections, equipment, stock | `/api/Technical/*` | Signed in; writes need Field Engineer or Manager |
| Equipment import requests | `/api/technical/equipment-requests`, `/api/admin/equipment-requests` | Field Engineer and Manager; Manager fulfils |
| Bills and payments | `/api/billing` | Senior Accountant |
| Counter and online payments | `/api/retail/payments` | Retail Staff, Manager, Accountant, Customer (own bills only) |
| Customer portal | `/api/customer` | Customer |
| Own profile and password | `/api/profile` | Any signed-in user |

### Business flow

1. A customer orders at a retail shop or through the self-service form. The order gets an 11-character ID (`B`/`D`/`T` + a 10-digit system-wide serial) and starts as `PendingRetail`. Bulk discounts (25 / 50 / 75 / 100 %) are computed on the server.
2. Retail staff approve or reject the paperwork. A technician can only be assigned after approval.
3. The field engineer runs the feasibility check. Dial-Up needs both the landline and the internet leg. A feasible order reserves a 16-character account ID (connection type + 3-digit city code + 12-digit serial), generated inside a `SERIALIZABLE` transaction.
4. Each connection is provisioned with an in-stock device. Stock is decremented, and the order becomes `Connection Provided` once every bulk connection is live. Suspending, restoring and terminating a connection keep the device and stock in sync.
5. Accounts raise bills. Subtotal, the 12.24 % service tax and the totals are always recomputed on the server with `decimal.js`, rounding half away from zero. Orders above 50 connections pay no deposit.
6. Payments are recorded by accounts, at the counter, or by the customer online. The first payment emails the customer their login account ID.

### Notes on the ASP.NET version

The rewrite keeps the API contract, but fixes a few issues found while porting:

- Account IDs are looked up in both the dashed (`T064-000000000001`) and plain (`T064000000000001`) forms. The original looked up only the dashed form, so newly provisioned connections could not be fetched or suspended.
- `PUT /api/profile` no longer returns the password hash.
- Notification history, admin chat actions and real-time groups now require a token, and each user only reaches their own data. The original left them open, so anyone could read other users' notifications, listen in on staff groups, or reply to customers as admin.
- The frontend no longer ships the dev-only `sql-bridge.js`, which read the whole database through `sqlcmd` without authentication.
- Constraint violations return `409` with a readable message instead of `500`.
- When a shop or supplier is inferred from free text, an exact ID match wins over a partial name match.
- Timestamps are returned in UTC with a `Z` suffix.

Staff log in with email and password. Customers log in in two steps: they enter their account ID, then a 6-digit one-time code sent to their registered email. OTP codes are stored in MongoDB as SHA-256 hashes, expire after 5 minutes through a TTL index, and are locked after 5 wrong attempts.

When `EMAIL_USER` / `EMAIL_PASSWORD` are empty, emails are written to `logs/emails/` instead of being sent, so the whole flow can be tested without an SMTP account.

## Tests

```bash
npm test
```

Uses the built-in `node:test` runner and needs no database. The suite covers utilities, validators, request validation, and an authorization matrix that checks every protected endpoint rejects anonymous requests (401) and wrong roles (403).

### End-to-end tests

```bash
npm run test:e2e
```

Requires Docker. The run starts throwaway SQL Server and MongoDB containers, loads `database/NexusSystem_Database.sql`, starts the API in-process, and walks through the whole business flow: catalogue management, ordering, retail approval, feasibility, provisioning, connection status changes, billing, customer OTP login, online payment, feedback, chat and notifications. The containers are removed when the run ends.

Both suites, plus a frontend type check and production build, run on every push through [GitHub Actions](.github/workflows/ci.yml).

## Backup and restore

Docker volumes live inside Docker Desktop's Linux VM, so these scripts copy the data out to the `backups/` folder on the host. They work with whichever stack's containers are running, Node or ASP.NET.

```bash
npm run db:backup                          # creates backups/<yyyyMMdd-HHmmss>/
npm run db:restore                         # restores the newest backup (asks for confirmation)
npm run db:restore -- 20261027-153012      # restores a specific backup
npm run db:restore -- 20261027-153012 --yes   # skips the confirmation prompt
```

Each backup folder contains `NexusSystem.bak` (SQL Server `BACKUP DATABASE`) and `NexusChat.archive.gz` (`mongodump`). A restore **overwrites** both databases and disconnects any open SQL Server sessions while it runs.

## Configuration

All settings are read from environment variables. See [.env.example](.env.example) for the full list.

| Variable | Purpose |
|---|---|
| `PORT` | HTTP port (default `5105`) |
| `CORS_ORIGINS` | Comma-separated allowed origins; empty allows all |
| `DB_SERVER`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | SQL Server connection |
| `MONGO_URI`, `MONGO_DB` | MongoDB connection |
| `JWT_KEY`, `JWT_ISSUER`, `JWT_EXPIRES_IN_MINUTES` | Token signing |
| `EMAIL_*` | SMTP settings for OTP emails |

## Real-time events

Socket.IO is served at the path `/hubs/notifications`. After connecting, clients join groups by emitting `JoinRole`, `JoinAccount` or `JoinChatSession` (and the matching `Leave*` events). The server pushes `notification`, `notificationRead`, `notificationsRead`, `chatMessage`, `chatSession` and `dataChanged`.

## Error format

Errors are returned as `{ "message": "..." }`. Validation errors add an `errors` object keyed by field name:

```json
{ "message": "Dữ liệu gửi lên không hợp lệ", "errors": { "email": ["Email không hợp lệ"] } }
```
