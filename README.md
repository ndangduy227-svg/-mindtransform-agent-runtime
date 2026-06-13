# Mindtransform Agent Runtime

Runtime cho **The Mind Flow** (`wf_01_the_mind_flow`): từ project chat, research,
plan, approval, build Lark, evidence, tài liệu, blog và publish.

## Kiến trúc

```text
Next.js Control Plane (:3000)
  - Projects / Chat / Graph / Outputs / Usage
  - Approval API và trang blog public
              |
              v
Agent Service (:8080)
  - LangGraph.js + Postgres checkpoint
  - pg-boss API/worker
  - GraphRAG relevance gate
  - Lark, evidence và publisher adapters
              |
              v
Supabase Postgres + Neo4j Aura + Lark
```

## Trạng thái đã kiểm chứng

- The Mind Flow có 13 node và 2 approval gate.
- Mỗi project pin một workflow; objective và user chat được đưa vào run input.
- Assistant output không được đưa ngược vào brief.
- Approval decision được ghi atomically trước khi resume graph.
- GraphRAG có domain relevance gate để chặn context chéo ngành.
- Lark adapter hỗ trợ Base, table, field, linked record, sample record, view,
  form, dashboard, dashboard block và Lark Doc.
- Lark writes có registry, receipt, idempotency theo từng workflow run và read-back verification.
- Evidence `api_render` đọc dữ liệu thật từ Lark và ghi disclosure.
- Publisher nội bộ ghi `blog_posts`, phục vụ tại `/blog/[slug]`, sau đó verify URL.
- UI hiển thị graph state, approval, node inspector, outputs, receipts và token/cost.

Live QC ngày 12/06/2026:

- Project: `Ô Tô Hợp Nhất - The Mind Flow QC`
- Run: `bcbfc6d6-fbee-4d9a-8939-d7fc7df7b283`
- Trạng thái: `awaiting_approval` tại `scope_approval`
- GraphRAG Spa context: `relevance=0.00 rejected`
- Chưa có Lark side effect trước khi người dùng approve.
- Migration `0005` đã apply; 3 approval decision trùng cũ được lưu vào bảng archive.

## Chạy local

```bash
# Control Plane
npm ci
npm run dev

# Engine, mở hai terminal
cd agent-service
npm ci
npm run dev:server
npm run dev:worker
```

Biến môi trường mẫu nằm tại `.env.example` và `agent-service/.env.example`.
`AGENT_SERVICE_KEY` phải khớp `ENGINE_API_KEY`.

## Kiểm thử

```bash
# Control Plane
npm run lint
npm run build

# Engine
cd agent-service
npm run typecheck
npm test
```

Baseline hiện tại: `20/20` agent tests, TypeScript clean, Next.js build clean,
ESLint clean.

## Luồng Ô Tô Hợp Nhất

Golden spec hiện tại yêu cầu:

- 9 bảng nghiệp vụ.
- 7 views.
- 5 forms.
- Dashboard BOD gồm 5 blocks.
- Sales pipeline nối đơn hàng, xe tồn, garage, giữ chỗ vật tư và QC bàn giao.
- Không writeback KiotViet và không sửa Base cũ.

Sau khi duyệt scope trên UI, worker mới được phép tạo tài nguyên Lark. Sau build
và verify, graph dừng lần hai tại `publish_approval`; chỉ khi duyệt lần hai mới
publish blog public.

## Cấu trúc repo

```text
src/                  Next.js Control Plane
agent-service/        LangGraph engine, worker và adapters
supabase/migrations/  Database schema và integrity migrations
```
