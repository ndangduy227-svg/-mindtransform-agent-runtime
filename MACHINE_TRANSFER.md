# Bàn giao chuyển máy — Mind Agent Runtime

Cập nhật: 2026-06-14 · Owner: Founder (Duy)
Lý do: laptop công ty sắp trả, dựng lại trên máy mới.

> **Đọc file này TRƯỚC khi tắt laptop cũ.** Có việc bảo mật phải làm hôm nay
> (rotate credentials), nếu không sẽ rò secret cho IT công ty.

---

## 1. Hai repo của dự án — cả 2 đều cần

| Repo | URL | Branch quan trọng | Mục đích |
|---|---|---|---|
| **agent-runtime** | `https://github.com/ndangduy227-svg/-mindtransform-agent-runtime` | `main` + `codex/the-mind-flow-runtime-qc` | Engine + Control Plane |
| **website** | `https://github.com/ndangduy227-svg/mind_transform` | `main` | Web public (mind-transform.vercel.app) |

Trạng thái lúc bàn giao (2026-06-14):

- **agent-runtime `main`** @ `428f8f4` — work của tôi (P0 → Step 4: Lark adapter thật).
- **agent-runtime `codex/the-mind-flow-runtime-qc`** @ `8625b4d` — work của Codex
  (publisher CMS, golden specs, migration 0005, GraphRAG relevance gate, blog page
  Next). **Chưa merge vào main**, có Draft PR #1. Trên máy mới phải quyết định:
  merge hay giữ branch.
- **website `main`** @ `20e7413` — vừa push case Ô Tô Hợp Nhất (static post + 6
  webp + cmsService merge logic).
- **website**: file `src/pages/BlogPost.jsx` **chưa commit** (Codex xóa SEO
  meta/JSON-LD — nhìn như regression, cố ý không commit để review).

---

## 2. Việc bảo mật — LÀM NGAY (trước khi trả máy)

Những secret sau đã từng nằm trong `.env`/transcript chat trên laptop cũ. IT
công ty có thể đọc disk image. **Rotate hết:**

| Service | Where | Action |
|---|---|---|
| **Groq API key** | console.groq.com → API Keys | Delete key `gsk_CYqv...` → create new |
| **Lark app secret** | open.larksuite.com → app `cli_aa97b25e6c619ed3` → Credentials | Click "Refresh app secret" |
| **Supabase DB password** | supabase.com → project `jcuqnhgfbqhsjuhnwkjp` → Settings → Database | Reset database password |
| **Supabase service_role key** | Settings → API → service_role | Regenerate |
| **Supabase anon key** | Settings → API → anon | Có thể regenerate nếu cần |
| **ENGINE_API_KEY** | (tự sinh) | Sinh random mới khi setup máy mới — không quan trọng để rotate ngay |
| **NEO4J_PASSWORD** | console.neo4j.io → instance `e209f021` → Reset password | Optional — chưa lộ ra ngoài chat |

Sau khi rotate xong, **không update** `.env` trên laptop cũ — chỉ ghi vào file
mã hoá (1Password / Bitwarden / file .txt mã hoá trên USB) để mang sang máy mới.

---

## 3. Sao chép thông tin cần mang sang máy mới

### 3.1 Credentials — bỏ vào password manager (KHÔNG email)

Sau rotate ở mục 2, ghi lại:

- Supabase: `URL`, `anon_key` (mới), `service_role_key` (mới), `DATABASE_URL` (mới với password mới)
- Neo4j Aura: `URI`, `username` (e209f021), `password`, `database`
- Lark: `app_id` (cli_aa97b25e6c619ed3), `app_secret` (mới)
- Groq: `api_key` (mới)
- (sau khi có) Google AI: `api_key`
- GitHub: dùng `gh auth login` qua web flow trên máy mới, không lưu PAT

### 3.2 Repo / docs

Repo nằm trong Google Drive `G:\My Drive\Mindtransform.gdrive\` — Drive desktop
sync sẽ kéo về máy mới tự động. KHÔNG chạy git ngay trong Drive (file lock,
chậm); clone về `C:\Dev\` thay vì làm trực tiếp trong Drive folder.

### 3.3 Files local quan trọng

- `agent-service/.env` (engine secrets) → ghi vào password manager
- `.env.local` ở root (control plane secrets) → ghi vào password manager
- Lark credentials .txt từ thư mục Downloads → ghi vào password manager

---

## 4. Việc sign-out / cleanup trên laptop cũ

Trước khi trả máy:

### 4.1 Sign out
- [ ] **Google Drive desktop**: pause sync → đợi icon hết "syncing" → unlink account → uninstall
- [ ] **GitHub CLI**: `gh auth logout`
- [ ] **VS Code / Cursor / IDE**: sign out GitHub Copilot, Settings Sync
- [ ] **Claude Code / Codex CLI**: thoát session, `claude /logout` nếu có
- [ ] **Browser**: clear cookies + history cho github, supabase, neo4j, larksuite, vercel, claude.ai, openai
- [ ] **Windows account**: đăng xuất khỏi local user nếu là Microsoft account

### 4.2 Xóa file local
- [ ] `C:\temp\agent-service`, `C:\temp\agent-runtime`, `C:\temp\mind_transform` (chứa node_modules + `.env` copy)
- [ ] `%LOCALAPPDATA%\npm-cache`
- [ ] Recycle Bin → Empty
- [ ] (tuỳ chọn) `cipher /w:C:` để wipe free space

### 4.3 Revoke connected apps (an toàn nhất)
- [ ] GitHub Settings → Applications → Authorized OAuth Apps → revoke Claude Code, Codex, GitHub CLI
- [ ] Supabase: không có revoke cá nhân; thay vì revoke, đảm bảo đã rotate keys ở §2

---

## 5. Setup trên máy mới

### 5.1 Cài tool

```powershell
# Cài Git, Node 20 LTS, npm
winget install Git.Git OpenJS.NodeJS.LTS GitHub.cli

# Cài Google Drive desktop → sign in → đợi sync G:\My Drive\Mindtransform.gdrive\
```

### 5.2 Clone repo về local (không phải Drive)

```powershell
mkdir C:\Dev
cd C:\Dev
gh auth login                                   # web flow, authorize
git clone https://github.com/ndangduy227-svg/-mindtransform-agent-runtime.git agent-runtime
git clone https://github.com/ndangduy227-svg/mind_transform.git website
```

### 5.3 agent-runtime — điền env mới + cài deps

```powershell
cd C:\Dev\agent-runtime

# Control Plane env
copy .env.example .env.local
notepad .env.local
# → Điền NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (mới),
#         SUPABASE_SERVICE_ROLE_KEY (mới), AGENT_SERVICE_KEY (random 48 hex)

# Engine env
cd agent-service
copy .env.example .env
notepad .env
# → Điền Supabase (URL, service_role, anon, DATABASE_URL pooler aws-1-ap-southeast-2),
#         Neo4j (URI, user, password, database=e209f021),
#         Lark (LARK_APP_ID, LARK_APP_SECRET — mới sau rotate),
#         Groq (GROQ_API_KEY mới),
#         ENGINE_API_KEY = giá trị giống AGENT_SERVICE_KEY ở .env.local

# Cài dependencies
cd ..
npm ci
cd agent-service
npm ci
```

### 5.4 Smoke test

```powershell
# Engine — verify code build
cd C:\Dev\agent-runtime\agent-service
npx tsc --noEmit                       # phải 0 lỗi
npm test                                # 16/16 pass (nhánh main) hoặc 20/20 (nhánh codex)

# Control Plane
cd ..
npm run build                           # 16 routes generate
```

### 5.5 Quyết định branch agent-runtime

```powershell
cd C:\Dev\agent-runtime

# Đọc commit Codex
git log --oneline main..origin/codex/the-mind-flow-runtime-qc
git show 8625b4d --stat

# Lựa chọn A: merge vào main (lấy publisher CMS + golden specs)
git switch main
git merge origin/codex/the-mind-flow-runtime-qc
# → Apply migration 0005:
cd agent-service
npx tsx --env-file=.env src/db/migrate.ts ../supabase/migrations/0005_workflow_integrity_and_publishing.sql
git push origin main

# Lựa chọn B: work tiếp trên codex branch
git switch codex/the-mind-flow-runtime-qc
```

### 5.6 Quyết định website BlogPost.jsx

```powershell
cd C:\Dev\website
git status                              # sẽ thấy M src/pages/BlogPost.jsx
git diff src/pages/BlogPost.jsx         # Codex xóa canonical/og:url/twitter/JSON-LD

# Khuyến nghị REVERT (giữ SEO meta cũ):
git checkout -- src/pages/BlogPost.jsx
# Hoặc nếu Codex có lý do hợp lệ:
git commit -am "chore: simplify BlogPost meta (per Codex)"
git push
```

---

## 6. Run đang dở trên Supabase

- Project trên DB: `Ô Tô Hợp Nhất - The Mind Flow QC` (theo MACHINE_TRANSFER cũ của Codex)
- Run `bcbfc6d6-fbee-4d9a-8939-d7fc7df7b283` ở trạng thái `awaiting_approval` tại
  `scope_approval` — không tự chạy tiếp khi laptop cũ tắt vì worker không
  always-on.
- Cách xử lý trên máy mới:
  - Khởi động worker → nó nhặt job từ pg-boss queue (job đã queued sẵn trong DB)
  - Mở Control Plane UI → Projects → mở project Ô Tô → bấm Approve hoặc Reject
  - Hoặc gọi thẳng API engine `/approve`
- State, checkpoint, queue, model_calls đều nằm trên Supabase nên **không mất gì
  khi đổi máy** — chỉ cần dựng lại worker/engine.

---

## 7. Mục tiêu trước khi deploy production

Để workflow chạy 24/7 không phụ thuộc laptop:

1. Engine + worker deploy **Railway** (2 service từ chung 1 Docker image, xem `agent-service/Dockerfile`)
2. Set env vars trên Railway (cùng giá trị `.env`)
3. Trên Vercel: thêm 2 env mới `SUPABASE_SERVICE_ROLE_KEY` + `AGENT_SERVICE_URL` (URL Railway) + `AGENT_SERVICE_KEY`
4. Redeploy Vercel → Control Plane gọi đúng engine production

---

## 8. Drive docs (không phải git)

`12_Agents/` ở Google Drive — phương pháp, brief, handoff QC. Google Drive
desktop **tự sync** miễn là máy còn online. Trước khi tắt:

- Verify Drive icon = "Up to date" (không phải "Syncing 5 items...")
- File quan trọng nhất ở Drive: `12_Agents/08_Agent_Runtime_Tool/HANDOFF_Oto_Hop_Nhat_Runtime_QC_2026-06-11.md`,
  `BUILD_BRIEF_The_Mind_Flow_Runtime_v1.md`, `Agents_Architecture_v3_GraphRAG.md`,
  case packet `12_Agents/03_Task_Packets/oto-hop-nhat-sales-garage-ops/`

---

## 9. Checklist nhanh (in ra hoặc tick trên laptop)

**Trước khi trả máy:**
- [ ] §2: Rotate hết secret (Groq, Lark, Supabase DB pw + service_role)
- [ ] §3.1: Lưu credentials mới vào password manager
- [ ] §4.1: Sign out tất cả app (Drive, gh, IDE, browser)
- [ ] §4.2: Xóa `C:\temp\*` + npm cache + Recycle Bin
- [ ] §4.3: Revoke OAuth apps trên GitHub
- [ ] §8: Verify Drive sync xong (icon = up to date)

**Trên máy mới:**
- [ ] §5.1-5.3: Cài tool, clone repo về `C:\Dev\`, điền env mới
- [ ] §5.4: Smoke test (tsc + tests)
- [ ] §5.5: Quyết định merge codex branch
- [ ] §5.6: Quyết định BlogPost.jsx
- [ ] §6: Khởi động worker → approve run đang dở trên UI
- [ ] §7: Lên kế hoạch deploy Railway

---

## 10. Liên hệ / nguồn

- Architecture: `12_Agents/08_Agent_Runtime_Tool/Agents_Architecture_v3_GraphRAG.md`
- Build brief: `12_Agents/08_Agent_Runtime_Tool/BUILD_BRIEF_The_Mind_Flow_Runtime_v1.md`
- QC handoff: `12_Agents/08_Agent_Runtime_Tool/HANDOFF_Oto_Hop_Nhat_Runtime_QC_2026-06-11.md`
- Lark Setup status: `12_Agents/04_Tool_Specs/LARK_CLI_SETUP_STATUS.md` (nếu còn)
