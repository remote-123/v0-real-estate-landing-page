# Claude Code Configuration - RuFlo V3

## Skills (Always Enforced)

Before starting any task, check `.agent/skills/` and `.claude/agents/skills/` for a relevant skill. If one or multiple exists, use it to guide the approach.

## Behavioral Rules (Always Enforced)

- Do what has been asked; nothing more, nothing less
- think, plan, ask before you code anything
- Utilize Skills & Agents to achieve the goal
- NEVER create files unless they're absolutely necessary for achieving your goal
- ALWAYS prefer editing an existing file to creating a new one
- NEVER proactively create documentation files (*.md) or README files unless explicitly requested
- NEVER save working files, text/mds, or tests to the root folder
- Never continuously check status after spawning a swarm — wait for results
- ALWAYS read a file before editing it
- NEVER commit secrets, credentials, or .env files
- Summarize your work in the `docs/DAILY_LOG.md` file after every task
- **Vault** (`vault/`) is the project's Obsidian knowledge base — treat it as living documentation and second brain
  - At session start, consult relevant vault notes before diving into unfamiliar areas
  - After completing any task that changes architecture, DB schema, API routes, ops, strategy, OR cost/performance — update the relevant vault note(s) alongside DAILY_LOG.md
  - Vault structure: `00-Index/MOC.md` (master index), `01-Architecture/`, `02-Features/`, `03-Data/`, `04-Ops/`, `05-Decisions/`, `06-Strategy/`
- **Auto-memory** (`memory/MEMORY.md` + `memory/*.md`) — Claude Code's cross-session context. Separate from vault.
  - At session start, read `memory/MEMORY.md` to restore context before starting work
  - After ANY significant change — new feature, infra change, cost/billing optimization, new DB pattern, schema change, new API route, cron setup, discovered bug pattern — save a memory entry
  - Triggers that ALWAYS require a memory write: adding caching (unstable_cache, Redis), changing DB connection config, adding/modifying cron jobs, changing auth, adding new terminal pages, any DB cost/billing optimization
  - Memory vs vault vs DAILY_LOG: DAILY_LOG = what happened today (ephemeral). Vault = long-term project knowledge (architecture, decisions). Memory = session context for Claude (patterns, gotchas, current state of tables/routes).

## File Organization

- NEVER save to root folder — use the directories below
- `app/` — Next.js App Router pages and API routes
- `components/` — React components
- `lib/` — shared utilities, DB client, helpers
- `scripts/` — ingestion and utility scripts (TypeScript, run via tsx)
- `docs/` — documentation and markdown files (including DAILY_LOG.md)
- `vault/` — Obsidian knowledge base (never auto-generate vault notes; update existing ones)
- `memory/` — Claude Code auto-memory files
- `dld_data/` — CSV data files (gitignored)

## Project Architecture

- Follow Domain-Driven Design with bounded contexts
- Keep files under 500 lines
- Use typed interfaces for all public APIs
- Prefer TDD London School (mock-first) for new code
- Use event sourcing for state changes
- Ensure input validation at system boundaries

### Project Config

- **Topology**: hierarchical-mesh
- **Max Agents**: 15
- **Memory**: hybrid
- **HNSW**: Enabled
- **Neural**: Enabled

## Session Checklist

### Session Start
1. Read `memory/MEMORY.md` — restore context on tables, routes, recent changes
2. Check `vault/00-Index/MOC.md` if working in unfamiliar area
3. Check git log (`git log --oneline -10`) to understand recent state

### Session End / After Significant Task
1. Write `docs/DAILY_LOG.md` entry
2. Update `memory/MEMORY.md` + relevant `memory/*.md` if anything significant changed
3. Update relevant `vault/` note if architecture, schema, ops, or strategy changed

## DB Patterns (Project-Specific)

- DB client: `lib/db.ts` — `postgres(DATABASE_URL, { ssl: 'require', max: 1 })`. `max:1` is intentional — Vercel serverless, not a pool server.
- `DATABASE_URL` = DigitalOcean Managed Postgres connection string (in Vercel env + `.env.local`)
- postgres.js returns `NUMERIC` columns as strings — always coerce: `Number(row.field)` before arithmetic or `.toFixed()`
- **Caching**: Use `unstable_cache` from `next/cache` on all terminal server components that run expensive queries. Revalidate: 3600s (1h) minimum.
- Ingest scripts use `scripts/ingest/db-client.ts`. Run with `npx tsx --env-file=.env.local scripts/ingest/...`

## Build & Test

```bash
# Build
npm run build

# Test
npm test

# Lint
npm run lint
```

- ALWAYS run tests after making code changes
- ALWAYS verify build succeeds before committing

## Security Rules

- NEVER hardcode API keys, secrets, or credentials in source files
- NEVER commit .env files or any file containing secrets
- Always validate user input at system boundaries
- Always sanitize file paths to prevent directory traversal
- Run `npx @claude-flow/cli@latest security scan` after security-related changes

## Concurrency: 1 MESSAGE = ALL RELATED OPERATIONS

- All operations MUST be concurrent/parallel in a single message
- Use Claude Code's Task tool for spawning agents, not just MCP
- ALWAYS batch ALL todos in ONE TodoWrite call (5-10+ minimum)
- ALWAYS spawn ALL agents in ONE message with full instructions via Task tool
- ALWAYS batch ALL file reads/writes/edits in ONE message
- ALWAYS batch ALL Bash commands in ONE message

## Swarm Orchestration

- MUST initialize the swarm using CLI tools when starting complex tasks
- MUST spawn concurrent agents using Claude Code's Task tool
- Never use CLI tools alone for execution — Task tool agents do the actual work
- MUST call CLI tools AND Task tool in ONE message for complex work

### 3-Tier Model Routing (ADR-026)

| Tier | Handler | Latency | Cost | Use Cases |
|------|---------|---------|------|-----------|
| **1** | Agent Booster (WASM) | <1ms | $0 | Simple transforms (var→const, add types) — Skip LLM |
| **2** | Haiku | ~500ms | $0.0002 | Simple tasks, low complexity (<30%) |
| **3** | Sonnet/Opus | 2-5s | $0.003-0.015 | Complex reasoning, architecture, security (>30%) |

- Always check for `[AGENT_BOOSTER_AVAILABLE]` or `[TASK_MODEL_RECOMMENDATION]` before spawning agents
- Use Edit tool directly when `[AGENT_BOOSTER_AVAILABLE]`

## Swarm Configuration & Anti-Drift

- ALWAYS use hierarchical topology for coding swarms
- Keep maxAgents at 6-8 for tight coordination
- Use specialized strategy for clear role boundaries
- Use `raft` consensus for hive-mind (leader maintains authoritative state)
- Run frequent checkpoints via `post-task` hooks
- Keep shared memory namespace for all agents

```bash
npx @claude-flow/cli@latest swarm init --topology hierarchical --max-agents 8 --strategy specialized
```

## Swarm Execution Rules

- ALWAYS use `run_in_background: true` for all agent Task calls
- ALWAYS put ALL agent Task calls in ONE message for parallel execution
- After spawning, STOP — do NOT add more tool calls or check status
- Never poll TaskOutput or check swarm status — trust agents to return
- When agent results arrive, review ALL results before proceeding

## V3 CLI Commands

### Core Commands

| Command | Subcommands | Description |
|---------|-------------|-------------|
| `init` | 4 | Project initialization |
| `agent` | 8 | Agent lifecycle management |
| `swarm` | 6 | Multi-agent swarm coordination |
| `memory` | 11 | AgentDB memory with HNSW search |
| `task` | 6 | Task creation and lifecycle |
| `session` | 7 | Session state management |
| `hooks` | 17 | Self-learning hooks + 12 workers |
| `hive-mind` | 6 | Byzantine fault-tolerant consensus |

### Quick CLI Examples

```bash
npx @claude-flow/cli@latest init --wizard
npx @claude-flow/cli@latest agent spawn -t coder --name my-coder
npx @claude-flow/cli@latest swarm init --v3-mode
npx @claude-flow/cli@latest memory search --query "authentication patterns"
npx @claude-flow/cli@latest doctor --fix
```

## Available Agents (60+ Types)

### Core Development
`coder`, `reviewer`, `tester`, `planner`, `researcher`

### Specialized
`security-architect`, `security-auditor`, `memory-specialist`, `performance-engineer`

### Swarm Coordination
`hierarchical-coordinator`, `mesh-coordinator`, `adaptive-coordinator`

### GitHub & Repository
`pr-manager`, `code-review-swarm`, `issue-tracker`, `release-manager`

### SPARC Methodology
`sparc-coord`, `sparc-coder`, `specification`, `pseudocode`, `architecture`

## Memory Commands Reference

```bash
# Store (REQUIRED: --key, --value; OPTIONAL: --namespace, --ttl, --tags)
npx @claude-flow/cli@latest memory store --key "pattern-auth" --value "JWT with refresh" --namespace patterns

# Search (REQUIRED: --query; OPTIONAL: --namespace, --limit, --threshold)
npx @claude-flow/cli@latest memory search --query "authentication patterns"

# List (OPTIONAL: --namespace, --limit)
npx @claude-flow/cli@latest memory list --namespace patterns --limit 10

# Retrieve (REQUIRED: --key; OPTIONAL: --namespace)
npx @claude-flow/cli@latest memory retrieve --key "pattern-auth" --namespace patterns
```

## Quick Setup

```bash
claude mcp add claude-flow -- npx -y @claude-flow/cli@latest
npx @claude-flow/cli@latest daemon start
npx @claude-flow/cli@latest doctor --fix
```

## Claude Code vs CLI Tools

- Claude Code's Task tool handles ALL execution: agents, file ops, code generation, git
- CLI tools handle coordination via Bash: swarm init, memory, hooks, routing
- NEVER use CLI tools as a substitute for Task tool agents

## Support

- Documentation: https://github.com/ruvnet/claude-flow
- Issues: https://github.com/ruvnet/claude-flow/issues
