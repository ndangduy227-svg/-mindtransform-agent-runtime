# Bàn Giao Chuyển Máy

Ngày kiểm tra: 2026-06-14, Asia/Bangkok.

## Nguồn Chuẩn

- Repo: `https://github.com/ndangduy227-svg/-mindtransform-agent-runtime`
- Branch hiện tại: `codex/the-mind-flow-runtime-qc`
- Commit: `8625b4dcb4856a6f517267fa5a6874a23ef3ddd8`
- Draft PR: `https://github.com/ndangduy227-svg/-mindtransform-agent-runtime/pull/1`
- `main` chưa chứa commit QC này. Không clone `main` rồi kết luận code bị mất.

## Trạng Thái Runtime

- The Mind Flow có 13 node và 2 approval gate.
- Live QC project: `Ô Tô Hợp Nhất - The Mind Flow QC`.
- Run: `bcbfc6d6-fbee-4d9a-8939-d7fc7df7b283`.
- Run đang `awaiting_approval` tại `scope_approval`.
- State, checkpoint, queue và usage nằm trên Supabase, không nằm riêng trên laptop.
- API và worker chưa deploy Railway. Khi laptop cũ tắt, workflow chỉ chạy tiếp sau
  khi dựng lại agent service hoặc deploy engine.
- Migration `0005_workflow_integrity_and_publishing.sql` đã apply vào database thật.

## Biến Môi Trường

Không commit file secret.

Control Plane cần `.env.local` với:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
AGENT_SERVICE_KEY
```

Agent Service cần `agent-service/.env` theo
`agent-service/.env.example`, gồm Supabase, database, Neo4j, model provider,
Lark và engine credentials.

`AGENT_SERVICE_KEY` phải bằng `ENGINE_API_KEY`.

Do secret từng tồn tại trên laptop công ty và Lark secret từng xuất hiện trong
chat/process configuration, phải rotate credential sau khi máy mới chạy ổn.

## Dựng Lại Trên Máy Mới

Khuyến nghị clone repo vào thư mục local như `C:\Dev`, không chạy Git repo trực
tiếp trong Google Drive.

```powershell
git clone https://github.com/ndangduy227-svg/-mindtransform-agent-runtime.git
cd -mindtransform-agent-runtime
git switch codex/the-mind-flow-runtime-qc

npm ci
Push-Location agent-service
npm ci
Pop-Location
```

Mở ba terminal:

```powershell
npm run dev
```

```powershell
cd agent-service
npm run dev:server
```

```powershell
cd agent-service
npm run dev:worker
```

## Xác Minh

```powershell
npm run lint
npm run build

cd agent-service
npm run typecheck
npm test
```

Baseline ngày 2026-06-14:

- Agent tests: `20/20`.
- TypeScript: clean.
- Next.js ESLint: clean.
- Next.js production build: clean.
- Root dependency audit: 0 vulnerability.
- Agent service còn 7 cảnh báo transitive trong dòng dependency LangChain cũ.

Sau khi API và worker chạy, mở project Ô Tô Hợp Nhất trên UI. Chỉ bấm Approve
khi đã kiểm tra scope. Approval lần một mới cho phép Lark write; approval lần hai
mới cho phép publish.

