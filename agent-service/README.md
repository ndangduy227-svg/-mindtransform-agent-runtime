# Agent Service

Engine của **The Mind Flow**, chạy tách khỏi Next.js Control Plane.

## Thành phần

- `src/server.ts`: `/health`, `/status`, `/consult`, `/run`, `/approve`.
- `src/worker.ts`: pg-boss consumer, invoke/resume LangGraph và persist state.
- `src/graphs/the_mind_flow.ts`: graph 13 node, 2 human approval gates.
- `src/graphrag/`: Neo4j query và domain relevance guard.
- `src/tools/lark.ts`: Lark Base/Doc adapter có registry, receipt và verification.
- `src/tools/evidence.ts`: evidence từ dữ liệu API thật.
- `src/tools/publisher.ts`: internal CMS publisher.
- `src/workflows/golden_specs.ts`: golden spec Ô Tô Hợp Nhất.

## Chạy

```bash
npm ci
npm run dev:server
npm run dev:worker
```

`ENGINE_API_KEY` bảo vệ các route ghi. `PUBLIC_APP_URL` là origin dùng để tạo
và verify URL blog sau publish.

## Kiểm thử

```bash
npm run typecheck
npm test
```

Baseline: 20 tests, gồm approval pause/resume/reject, blocked honesty, retry,
golden spec Ô Tô Hợp Nhất và GraphRAG cross-domain rejection.
