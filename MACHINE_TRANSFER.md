# Machine Transfer - Mindtransform Agent Runtime

Updated: 2026-06-14, Asia/Bangkok.

This is a temporary setup handoff for the first agent working on the new
machine. The canonical project entrypoint is:

`G:\My Drive\Mindtransform.gdrive\00_START_HERE_NEW_MACHINE_HANDOFF.md`

## Canonical State

- Repository:
  `https://github.com/ndangduy227-svg/-mindtransform-agent-runtime`
- Canonical branch after final handoff: `main`
- The Mind Flow implementation includes:
  - 13 LangGraph nodes and 2 human approval gates;
  - durable project/session/model usage state;
  - GraphRAG cross-domain relevance guard;
  - real Lark Base and Doc adapter with idempotency and receipts;
  - evidence artifacts;
  - internal blog publisher and public blog route;
  - graph, approval, output, resource and receipt visibility in the UI.
- Database migration `0005_workflow_integrity_and_publishing.sql` was already
  applied to the live database. Do not rerun it blindly.

## Interrupted Live Run

- Project: `Ô Tô Hợp Nhất - The Mind Flow QC`
- Run: `bcbfc6d6-fbee-4d9a-8939-d7fc7df7b283`
- State: `awaiting_approval`
- Node: `scope_approval`
- No Lark write occurred in this run before approval.

Workflow state is stored in Supabase. It will survive the machine transfer, but
it will not progress until the API and worker are running again.

## Secret Boundary

`.env.local` and `agent-service/.env` are intentionally ignored by Git.

Google Drive copies, if still present during transfer, are temporary transport
copies only. They are not the long-term secret source of truth. Move credentials
to a personal password manager, rotate credentials that existed on the company
laptop, update the new machine, then remove plaintext secret copies from Drive.

Never copy these Codex files to the new machine:

- `~/.codex/auth.json`
- `~/.codex/.sandbox-secrets/`
- Codex session, memory or SQLite databases

Install Codex on the new machine and sign in again.

## New Machine Setup

Clone to a local development directory, not into Google Drive:

```powershell
New-Item -ItemType Directory -Force C:\Dev | Out-Null
Set-Location C:\Dev
git clone https://github.com/ndangduy227-svg/-mindtransform-agent-runtime.git agent-runtime
Set-Location agent-runtime

npm ci
Push-Location agent-service
npm ci
Pop-Location
```

Recreate:

- `C:\Dev\agent-runtime\.env.local`
- `C:\Dev\agent-runtime\agent-service\.env`

Use `.env.example` files as the variable-name contract. Ensure
`AGENT_SERVICE_KEY` equals `ENGINE_API_KEY`.

## Verification

```powershell
Set-Location C:\Dev\agent-runtime
npm run lint
npm run build

Push-Location agent-service
npm run typecheck
npm test
Pop-Location
```

Expected baseline:

- agent tests: `20/20`;
- agent TypeScript: clean;
- Next.js ESLint: clean;
- Next.js production build: clean.

Start three processes:

```powershell
# Control Plane
npm run dev
```

```powershell
# Engine API
Set-Location agent-service
npm run dev:server
```

```powershell
# Worker
Set-Location agent-service
npm run dev:worker
```

Then verify:

1. `http://127.0.0.1:3000` loads.
2. `http://127.0.0.1:8080/health` returns healthy.
3. The Ô Tô Hợp Nhất project and graph history are visible.
4. The approval banner is still at `scope_approval`.
5. Founder reviews the scope and uses the UI to Approve or Reject.

Do not call the approval API directly to bypass human review.

## Remaining Work

- Deploy the Agent API and worker to always-on infrastructure.
- Run the Ô Tô Hợp Nhất golden regression through both approval gates.
- Perform the coordinated LangChain major-version migration for remaining
  transitive advisories.

## Handoff Lifecycle

After the new machine passes all verification steps:

1. Update the root Drive handoff with completion evidence.
2. Move the root handoff into
   `99_Archive/2026-06-14_Machine_Transfer/`.
3. Delete this `MACHINE_TRANSFER.md` from the repository in a cleanup commit,
   because normal operation must rely on `README.md`, not a stale transfer file.
