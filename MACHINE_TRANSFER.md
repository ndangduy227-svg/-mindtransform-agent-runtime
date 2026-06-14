# Hướng dẫn cho AI tools (Claude / Codex) trên máy mới

Cập nhật: 2026-06-14 · Owner: Founder (Duy)
Mục đích: Founder vừa chuyển từ laptop công ty sang máy mới. File này là bản
brief để **Claude Code / Codex CLI** trên máy mới đọc đầu phiên, nắm trạng thái
dự án và biết phải làm gì.

> Khi bạn (AI tool) khởi động lần đầu trên máy mới, đọc hết file này trước
> khi sửa code. Bỏ qua §10 nếu Founder đã xác nhận laptop cũ đã trả.

---

## 1. Bối cảnh — bạn đang xem dự án gì

**Mind Agent Platform** — hệ thống workflow AI nội bộ cho Mindtransform.

**Hai repo:**

| Repo | Path local (sau khi clone) | Mục đích |
|---|---|---|
| `agent-runtime` | `C:\Dev\agent-runtime` | Engine LangGraph.js + Control Plane Next.js |
| `website` | `C:\Dev\website` | Web public mind-transform.vercel.app |

**Hai service trong agent-runtime:**

- **Control Plane** (Next.js root): UI, API routes, dùng `.env.local`
- **Engine** (`agent-service/` subfolder): worker LangGraph, dùng `.env`

Đó là lý do **có 2 file env trong cùng 1 repo** — không phải lỗi.

---

## 2. Trạng thái code lúc bàn giao

### agent-runtime
- `main` @ `428f8f4`: work do Claude làm (P0 → Step 4 — Lark adapter thật).
- `codex/the-mind-flow-runtime-qc` @ `8625b4d` + handoff commits: work do Codex
  làm (publisher CMS, golden specs, migration `0005_workflow_integrity_and_publishing.sql`,
  GraphRAG relevance gate, blog page Next). **Chưa merge vào main**, Draft PR #1.
- Migration 0005 **đã apply** lên DB live. Không chạy lại mù.

### website
- `main` @ `20e7413`: vừa push static post Ô Tô Hợp Nhất (6 webp + content MD +
  cmsService merge logic).
- Branch backup `codex/machine-transfer-blogpost-backup-2026-06-14` @ `f6cd164`:
  giữ thay đổi `BlogPost.jsx` (Codex xóa SEO meta) — chưa merge, cần review tích hợp.

### Run đang dở trên Supabase (không mất khi đổi máy)
- Project: `Ô Tô Hợp Nhất - The Mind Flow QC`
- Run `bcbfc6d6-fbee-4d9a-8939-d7fc7df7b283` ở `awaiting_approval` tại
  `scope_approval`. State + checkpoint + queue nằm trên Supabase.
- Khởi động worker → nó nhặt job từ pg-boss → Founder bấm Approve/Reject trên
  Control Plane UI để workflow chạy tiếp.

---

## 3. File `.env` — KHÔNG cần backup tay

Cả 2 file env nằm trong Google Drive folder:

```
G:\My Drive\Mindtransform.gdrive\mindtransform-agent-runtime\.env.local                       (Control Plane)
G:\My Drive\Mindtransform.gdrive\mindtransform-agent-runtime\agent-service\.env               (Engine)
```

Khi Founder bật Google Drive desktop trên máy mới, các file này tự về cùng repo.
**Không cần copy paste qua password manager** — Drive là source of truth.

**Quan trọng**: cả 2 file đều ở trong `.gitignore`, không bao giờ lên repo
GitHub. Drive cloud + máy local là 2 nơi duy nhất chứa chúng.

Khi Founder ngắt Drive desktop trên laptop cũ, file biến mất khỏi laptop cũ
nhưng vẫn an toàn trên Drive cloud.

---

## 4. Setup máy mới — checklist Claude/Codex thực thi

### 4.1 Verify môi trường

```powershell
node --version          # >= 20
git --version
gh --version
gh auth status          # phải đã login
```

Nếu thiếu cái nào, dừng và yêu cầu Founder cài (`winget install Git.Git OpenJS.NodeJS GitHub.cli`).

### 4.2 Verify Drive đã sync về

```powershell
Test-Path "G:\My Drive\Mindtransform.gdrive\mindtransform-agent-runtime\agent-service\.env"
# Phải True. Nếu False — Founder chưa kết nối Drive xong, đợi.
```

### 4.3 Clone repo về local (KHÔNG chạy git trực tiếp trong Drive)

```powershell
mkdir C:\Dev -Force | Out-Null
cd C:\Dev
git clone https://github.com/ndangduy227-svg/-mindtransform-agent-runtime.git agent-runtime
git clone https://github.com/ndangduy227-svg/mind_transform.git website
```

### 4.4 Mang `.env` từ Drive vào repo local

```powershell
copy "G:\My Drive\Mindtransform.gdrive\mindtransform-agent-runtime\.env.local" C:\Dev\agent-runtime\.env.local
copy "G:\My Drive\Mindtransform.gdrive\mindtransform-agent-runtime\agent-service\.env" C:\Dev\agent-runtime\agent-service\.env
```

### 4.5 Kiểm tra credential còn dùng được — TRƯỚC khi npm install

```powershell
# Đọc URL từ .env, smoke test Supabase + Neo4j + Lark token
# Nếu Founder đã rotate (xem §10), credentials trong .env có thể đã LỖI THỜI.
# Báo Founder cập nhật file .env trên Drive nếu test fail.

# Quick test Supabase:
$env:SUPABASE_URL = (Select-String "SUPABASE_URL=" C:\Dev\agent-runtime\agent-service\.env | Select -First 1).Line -replace "SUPABASE_URL=",""
curl "$env:SUPABASE_URL/rest/v1/" -H "apikey: <paste anon key from .env>"
# Trả 401 với "API key found" = OK; "Invalid API key" = key đã rotate, cần update
```

### 4.6 Install deps

```powershell
cd C:\Dev\agent-runtime
npm ci
cd agent-service
npm ci
cd ..\..\website
npm ci
```

### 4.7 Smoke test

```powershell
cd C:\Dev\agent-runtime\agent-service
npx tsc --noEmit                  # 0 lỗi
npm test                          # 16 pass trên main, 20 pass nếu đã merge codex

cd ..
npm run build                     # 16 routes generate
```

### 4.8 Quyết định cần Founder trước khi tiếp tục

Hỏi Founder 2 câu **trước khi sửa code**:

1. **agent-runtime**: merge `codex/the-mind-flow-runtime-qc` vào `main` hay tiếp tục trên branch riêng?
   - Codex commits có publisher CMS, golden specs, blog page Next, relevance gate.
   - Nếu merge, migration 0005 đã apply rồi — không chạy lại.

2. **website**: `src/pages/BlogPost.jsx` có branch backup
   `codex/machine-transfer-blogpost-backup-2026-06-14` xóa SEO meta. Giữ SEO meta
   của main hay theo Codex?
   - Khuyến nghị: giữ SEO meta cũ, chỉ cherry-pick `cover_image` fallback từ branch backup.

### 4.9 Khởi động dev (nếu Founder muốn chạy lại run đang dở)

3 terminal:

```powershell
# Terminal 1 — Control Plane UI
cd C:\Dev\agent-runtime
npm run dev               # http://localhost:3000

# Terminal 2 — Engine API
cd C:\Dev\agent-runtime\agent-service
npm run dev:server        # :8080

# Terminal 3 — Worker (queue consumer)
cd C:\Dev\agent-runtime\agent-service
npm run dev:worker
```

Mở localhost:3000 → Projects → mở `Ô Tô Hợp Nhất - The Mind Flow QC` → bấm
Approve/Reject trên scope gate. **Không gọi thẳng API `/approve` để bỏ qua
human review.**

---

## 5. Nguồn truth cần đọc khi quyết định

Trước khi tự ý sửa kiến trúc / scope:

- `12_Agents/01_Workflows/WF_01_The_Mind_Flow.md` — workflow chính thức
- `12_Agents/08_Agent_Runtime_Tool/Agents_Architecture_v3_GraphRAG.md` — kiến trúc
- `12_Agents/08_Agent_Runtime_Tool/BUILD_BRIEF_The_Mind_Flow_Runtime_v1.md` — scope v1
- `12_Agents/08_Agent_Runtime_Tool/HANDOFF_Oto_Hop_Nhat_Runtime_QC_2026-06-11.md` — QC baseline
- `12_Agents/03_Task_Packets/oto-hop-nhat-sales-garage-ops/` — case study đầu tiên đã chạy
- `agent-runtime/README.md` — status table verification levels

`README.md` là source of truth duy nhất về **mức độ verified** từng phần. Đừng
nâng claim trong README nếu chưa verify live.

---

## 6. Quy tắc làm việc (giữ nguyên từ phiên trước)

1. **Không hạ RLS** để task chạy qua. Engine + Control Plane phải dùng
   `SUPABASE_SERVICE_ROLE_KEY` server-side; browser không bao giờ nhận key này.
2. **Không gửi service-role key ra Drive / Git / frontend bundle.**
3. **Không đặt external side effect trong node có `interrupt()`** — node sẽ
   re-run khi resume, side effect không idempotent sẽ trùng.
4. **Mỗi tool write phải có idempotency key và side_effect_receipt**. Lark
   adapter trong `agent-service/src/tools/lark.ts` là pattern mẫu.
5. **Tool/credential thiếu** → node trả `blocked`, run status `blocked` — KHÔNG
   tự nhận success với output stub.
6. **Reject ≠ Approve.** Worker đọc `job.decision` thật, không hard-code.
7. **Nodes return delta only** cho `notes[]` reducer (`return { notes: [text] }`,
   không phải `[...state.notes, text]`).
8. **Trước feature mới**: viết test/acceptance test trước. 16-20 tests hiện tại
   ở `agent-service/tests/` là quality bar.

---

## 7. Việc còn lại (backlog hợp lý để gợi ý)

Theo brief §14:

- **Step 5 — Verification gate** (QC §16): HTTP/DOM/media/responsive/regression
  cho post-publish. Hiện stub.
- **Step 6 — Real receipt-and-handoff** với artifact links, public URLs, cost
  summary. Cấu trúc DB đã có (0004 + 0005).
- **GraphRAG relevance gate** — Codex đã thêm `relevance.ts`, cần ingest KB
  thật + tune threshold. Hiện vẫn leak Spa context sang ngành khác.
- **Engine deploy Railway** — Dockerfile + 2-service split (server + worker)
  đã sẵn ở `agent-service/Dockerfile`. Cần Founder tạo Railway project.

Không bắt đầu việc mới trước khi Founder approve scope.

---

## 8. Trạng thái dịch vụ ngoài (cuối phiên cũ)

| Service | Trạng thái |
|---|---|
| Supabase project `jcuqnhgfbqhsjuhnwkjp` | Live, schema 0001-0005 applied, RLS lockdown |
| Neo4j Aura `e209f021` | Live, constraints + vector index + 4 MindPhase seed |
| Lark app `cli_aa97b25e6c619ed3` | Live, 1 base test Spa đã build (`KYScbdo5NaHq92s0X8AlRy5pgod`) |
| Groq | Live |
| Vercel | Website deploy live, agent-runtime UI **chưa deploy** |
| Railway | **Chưa setup** |

⚠️ Nếu Founder đã rotate secret (xem §10), test smoke ở 4.5 sẽ fail — đó là
dấu hiệu cần update `.env` trên Drive với key mới, không phải code lỗi.

---

## 9. Pattern code cần ý thức

- Convention error: `agent-service/AGENTS.md` ghi *"Next.js version có breaking
  changes; đọc node_modules/next/dist/docs trước khi code"*. Lưu ý khi sửa
  API routes hoặc layout.
- `worker.ts` chỉ start loop khi chạy trực tiếp (`process.argv[1]` check) — để
  test import vẫn hoạt động.
- `events.ts` `instrument()` không close out node bị `interrupt()` (re-throw)
  hoặc node trả `blocked` — đó là intentional, đừng "fix".
- Tất cả file env-aware (`models/router.ts`, `tools/capability.ts`,
  `graphrag/neo4j.ts`) đọc env tại invocation, không cache module-level — để
  reload sau khi update `.env` không cần restart trừ khi đổi token cache.

---

## 10. Cleanup laptop cũ — Founder làm trước khi trả

Phần này KHÔNG dành cho AI máy mới đọc. AI máy mới bỏ qua section này.

### 10.1 Rotate secret (làm trước khi xóa file)

| Service | Where | Action |
|---|---|---|
| Groq API key | console.groq.com → API Keys | Delete cũ, create mới |
| Lark app secret | open.larksuite.com → app `cli_aa97b25e6c619ed3` → Credentials | Refresh app secret |
| Supabase DB password | supabase.com → project → Settings → Database | Reset |
| Supabase service_role | Settings → API → service_role | Regenerate |
| Neo4j password | console.neo4j.io → instance `e209f021` | Reset |
| ENGINE_API_KEY | Tự sinh random 48 hex | Sinh mới khi setup máy mới |

Sau rotate: cập nhật `agent-service/.env` và `.env.local` trên Drive với key
mới. Drive sync sẽ tự đẩy file mới lên cloud → máy mới nhận được.

### 10.2 Data Claude / Codex trên laptop cũ — XÓA HẾT

Đường dẫn phát hiện được trên máy cũ:

```
C:\Users\GKG\.claude\                                  24 MB   (config + .credentials.json + sessions + transcripts)
C:\Users\GKG\AppData\Roaming\Claude\                   13.9 GB (Claude Desktop: cache + chat history + cowork)
C:\Users\GKG\AppData\Local\Claude\                     19 KB
C:\Users\GKG\AppData\Local\Temp\claude\                2.4 MB  (task output, có thể chứa secret log)
C:\Users\GKG\.codex\                                   1.4 GB  (sessions + memories + sandbox-secrets + sqlite)
C:\Users\GKG\AppData\Roaming\npm\claude.ps1            wrapper script
```

**Nguy hiểm cần biết:**

- `.claude\.credentials.json` chứa OAuth token Claude API. Trước khi xóa →
  revoke ở claude.ai → Settings → Authorized apps → "Claude Code".
- `AppData\Roaming\Claude\claude-code-sessions\` + `local-agent-mode-sessions\`
  chứa **transcript chat đầy đủ** — gồm cả các secret từng paste vào chat
  (Groq, Lark, DB password). Đây là lý do phải rotate ở 10.1.
- `.codex\sandbox-secrets\` — kiểm tra trước khi xóa:
  `Get-ChildItem "C:\Users\GKG\.codex\sandbox-secrets" -Recurse | Select Name, Length`
- `.codex\sessions\` + `.codex\memories\` — transcript + memory Codex tương tự.

### 10.3 Lệnh xóa

```powershell
# Sign out trước
# claude.ai/settings → revoke authorized apps
# Codex: thoát CLI session

# Repo copies trong temp (có .env)
Remove-Item -Recurse -Force "C:\temp\agent-service", "C:\temp\agent-runtime", "C:\temp\mind_transform"

# Claude data
Remove-Item -Recurse -Force "C:\Users\GKG\.claude"
Remove-Item -Recurse -Force "C:\Users\GKG\AppData\Roaming\Claude"
Remove-Item -Recurse -Force "C:\Users\GKG\AppData\Local\Claude"
Remove-Item -Recurse -Force "C:\Users\GKG\AppData\Local\Temp\claude"

# Codex data
Remove-Item -Recurse -Force "C:\Users\GKG\.codex"

# Recycle Bin
Clear-RecycleBin -Force

# Uninstall apps (nếu Founder đã rotate xong)
npm uninstall -g @anthropic-ai/claude-code 2>$null
# Codex CLI: tuỳ install method
```

### 10.4 Drive disconnect

Ngắt Google Drive desktop **SAU CÙNG** sau khi đã xác nhận file `.env` mới
(với key rotated) đã sync lên cloud:

- Drive desktop → ⚙ → Preferences → Sign out → Pause → Wait icon "Up to date" → Disconnect account → Uninstall

Khi đó file `.env` còn trên Drive cloud (an toàn), không còn trên ổ cứng cũ.

### 10.5 Revoke OAuth ở các service

- GitHub Settings → Applications → Authorized OAuth Apps → revoke Claude Code,
  Codex, GitHub CLI (nếu thấy).
- claude.ai → Settings → Authorized apps → revoke tất cả app trên máy cũ.
- (Cách an toàn nhất với Supabase/Neo4j/Lark: dựa vào rotate ở 10.1, không cần
  revoke session riêng.)

---

## 11. Khi xong setup máy mới

Founder confirm bằng cách thấy đủ 3 thứ trên localhost:3000:

1. **Projects tab** liệt kê project Ô Tô Hợp Nhất (kéo từ Supabase).
2. **Project workspace** mở được, thấy graph node + history events.
3. **Approval banner** hiển thị nút Approve/Reject cho run đang awaiting_approval.

Khi cả 3 hiển thị, máy mới đã đầy đủ context. Tiếp tục backlog ở §7.
