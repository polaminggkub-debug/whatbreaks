# WhatBreaks — Dev Runtime & Future Phases

> Do NOT implement until MVP is complete and shipped.

## Phase 2: Dev Runtime

### Live File Watcher
- Re-scan on file save, graph updates in real-time
- WebSocket push from CLI to UI
- Incremental scan (only re-parse changed files)

### Git Diff Integration
- `whatbreaks diff` — highlight files changed since last commit
- `whatbreaks diff --branch main` — compare against branch
- Show which tests need re-running based on diff

### Test Runner Integration
- Run tests, auto-detect failures, auto-highlight in graph
- Playwright/Vitest plugin — auto-run `whatbreaks failing` on test failure

### History & Aggregation
- Track scan results over time
- Show "this file has caused N test failures in the last week"
- Risk scoring based on historical breakage patterns

## Phase 3: AI Features

### AI Flow Detection
- LLM reads code, generates logical flow clusters
- e.g., "Upload Attendance Flow", "Payroll Calculation Flow"
- Auto-group nodes by business domain

### AI Explain
- "Why might this test fail?" based on recent changes + graph
- Natural language root cause suggestions

## Phase 4: Ecosystem

### MCP Server
- Expose as MCP tool for native AI assistant integration
- Tools: `whatbreaks_refactor`, `whatbreaks_failing`, `whatbreaks_impact`

### Multi-Language Support
- Python, Go, PHP, Rust parsers
- Language-agnostic graph format

### CI Integration
- `whatbreaks ci --changed` — output only affected tests for selective test running
- GitHub Action / GitLab CI template
- PR comment with blast radius summary
