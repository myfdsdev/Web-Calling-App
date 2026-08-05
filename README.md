# ringwebai — Conversational Web Voice-Agent Studio

Build **Vapi voice agents through a guided AI chatbot** instead of a long form. Answer a few
questions and the app generates the system prompt, greeting, voice configuration and business setup,
then creates a real Vapi assistant you can test through **browser web calling**.

- **Frontend** — React + Vite, Tailwind CSS, Framer Motion, React Router, TanStack Query, Zustand,
  Sonner, `@vapi-ai/web`.
- **Backend** — Node + Express, MongoDB (Mongoose), JWT auth, Zod validation, Gemini (with a
  deterministic fallback), Vapi REST API.

The private Vapi key lives **only** on the backend. All assistant create/update/delete calls go
through the server; the browser uses only the public key for web calling.

---

## Quick start

```bash
# 1. Install everything (root, server, client)
npm run install:all

# 2. Configure env (optional in dev — see below)
cp server/.env.example server/.env
cp client/.env.example client/.env

# 3. Run both apps (server on :5000, client on :5173)
npm run dev
```

Open http://localhost:5173, create an account, and click **Create Agent**.

### Zero-config dev

The app runs with **no external services** in development:

- **MongoDB** — if `MONGODB_URI` is empty, an in-memory MongoDB starts automatically (data resets on
  restart). Set a real URI (e.g. MongoDB Atlas) for persistence / production.
- **Gemini** — if `GEMINI_API_KEY` is empty, a deterministic generator produces the greeting, value
  extraction and system prompt. Add a key for AI-authored copy.
- **Vapi** — assistant creation requires `VAPI_PRIVATE_API_KEY`. Without it the whole builder still
  works and your setup is saved; only the final "Create Voice Agent" step reports that Vapi is not
  configured (your draft is preserved so you can retry once configured).

---

## Environment variables

### `server/.env`

| Var | Purpose |
| --- | --- |
| `PORT` | API port (default 5000) |
| `NODE_ENV` | `development` / `production` / `test` |
| `CLIENT_URL` | Allowed browser origin(s), comma-separated |
| `BACKEND_URL` | Public URL of this server (used to build the Vapi webhook URL) |
| `MONGODB_URI` | Mongo connection string (blank ⇒ in-memory in dev) |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | Auth token signing |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Conversational setup + extraction (optional) |
| `VAPI_PRIVATE_API_KEY` | **Server-only.** Never exposed to the browser |
| `VAPI_PUBLIC_KEY` | Optional; browser-safe key surfaced via `/api/vapi/config` |
| `VAPI_BASE_URL` | Defaults to `https://api.vapi.ai` |
| `VAPI_WEBHOOK_URL` / `VAPI_WEBHOOK_SECRET` | Inbound Vapi events |

### `client/.env`

| Var | Purpose |
| --- | --- |
| `VITE_API_URL` | API base (default `/api`, proxied to the server in dev) |
| `VITE_VAPI_PUBLIC_KEY` | **Public** Vapi key for browser web calling |

---

## How it works

1. **Create Agent** opens a conversational builder — one question at a time (name, business, type,
   purpose, services, tone, language, greeting, escalation, voice).
2. Every answer is **saved to the backend immediately**; you can leave and resume any unfinished
   agent. A live preview and progress bar update as you go.
3. Gemini normalizes free-text answers into structured values and can author the greeting and system
   prompt; a deterministic fallback covers every case.
4. A **review screen** shows all details (each editable) and the generated system prompt.
5. **Create Voice Agent** builds the payload and creates the assistant on Vapi **through the
   backend**, stores the assistant id, and adds the agent to your dashboard. Creation is idempotent
   (keyed on the draft) so double-clicks never create duplicates.
6. Open the agent to **test it via browser web calling**, or **edit** (updates the same Vapi
   assistant, preserving its id) / **delete** (removes the Vapi assistant) it.
7. **Customize & share**: give the agent a public **bio, tagline, avatar and theme color**, then flip
   it **public** to get a shareable link (`/a/:publicId`). Anyone with the link can open a themed
   page and **talk to the agent in their browser — no login required**. Appearance/publish changes
   are local-only and never touch the Vapi assistant. Public pages expose only display fields + the
   browser-safe assistant id and public key (never the system prompt, escalation, owner or private key).

## Project structure

```
server/   Express API — controllers, models, services (Gemini/Vapi/prompt/flow), routes, tests
client/   React app — pages, components (builder, agents, calling, ui), hooks, services, stores
```

---

## Testing

```bash
npm test          # backend regression suite (Jest + supertest, Vapi/Gemini mocked)
```

The suite covers the acceptance-critical paths: agent creation, assistant-id persistence, duplicate
prevention, assistant update (id preserved), deletion, voice mapping, system-prompt & first-message
mapping, webhook events, the full conversational flow (autosave, resume, one-question-at-a-time,
edit a previous answer, greeting generation), and ownership on every resource.

---

## API overview

```
POST   /api/auth/register | /login            GET /api/auth/me
POST   /api/auth/forgot-password | /reset-password   (rate limited; no account enumeration)
POST   /api/agent-builder/start | /message
GET    /api/agent-builder/voices | /flow | /drafts | /drafts/:id
PATCH  /api/agent-builder/drafts/:id          DELETE /api/agent-builder/drafts/:id
POST   /api/agent-builder/drafts/:id/generate-greeting | /generate-prompt | /review | /create-vapi-agent
GET    /api/agents | /agents/summary | /agents/:id
PATCH  /api/agents/:id                         DELETE /api/agents/:id
GET    /api/vapi/config                         POST /api/vapi/webhook
GET    /api/public/agents/:publicId            (NO AUTH — shareable public agent)

# Store bridge (server-to-server; shared secret via x-platform-secret)
GET    /api/v1/platform/manifest              (PUBLIC — discovery, no secret)
POST   /api/v1/platform/provision | /suspend | /reactivate
```

Client routes: `/dashboard`, `/agents`, `/agents/create`, `/agents/:id`, `/agents/:id/edit`,
`/agents/:id/customize`, `/agents/:id/test`, the public **`/a/:publicId`** share page, and the
auth pages `/login`, `/signup`, `/forgot-password`, `/reset-password`.

All responses use `{ success, message, data }` (or `{ success:false, message, code }` on error).
