# WhatBreaks

**You changed a file. What just broke?**

WhatBreaks scans your project — no matter what language — and builds a map of how every file connects to every other file. Then it answers two questions:

1. **A test is failing** — which file should I actually look at?
2. **I want to change a file** — what's going to break?

That's it. No AI magic. It just reads your code and draws you a map.

## See it in action (30 seconds)

```bash
npx whatbreaks scan ./src     # Point it at your code
npx whatbreaks serve          # Opens a visual map in your browser
```

You'll see every file as a dot, every import as a line. Click any file to see what depends on it.

## The two things it does

### 1. "My test is failing. Why?"

```bash
npx whatbreaks failing tests/auth.spec.ts
```

You get a list of files to check, **deepest dependency first**. Instead of reading 50 files, you start with the one most likely to be the problem.

### 2. "I want to change this file. What will break?"

```bash
npx whatbreaks refactor src/utils/parser.ts
```

You get:
- Every file that depends on this one (directly or indirectly)
- Every test you need to run
- A copy-paste test command

## Install

```bash
npm install -g whatbreaks
```

Or just use `npx whatbreaks` without installing.

## How it works (the simple version)

```
Your code ──→ whatbreaks scan ──→ .whatbreaks/graph.json ──→ whatbreaks serve (visual map)
                                                         ──→ whatbreaks failing (CLI)
                                                         ──→ whatbreaks refactor (CLI)
```

1. **Scan** reads your files, figures out which ones talk to each other, and saves a map
2. **Serve** shows that map as an interactive graph in your browser
3. **Failing/Refactor** walks that map to answer your question

No database. No backend. Just a JSON file.

## All commands

| Command | What it does |
|---------|-------------|
| `whatbreaks scan <dir>` | Read your code and build the map |
| `whatbreaks serve` | Open the visual map in your browser |
| `whatbreaks failing <test>` | Find root cause of a failing test |
| `whatbreaks refactor <file>` | See what breaks if you change a file |
| `whatbreaks impact <file>` | See all connections (both directions) |
| `whatbreaks hotspots` | Find the most depended-on files |
| `whatbreaks report` | Overall codebase health check |
| `whatbreaks circular` | Find circular dependencies |
| `whatbreaks chains` | Find the deepest dependency chains |

Add `--json` to any command to get machine-readable output (useful for AI coding tools like Claude Code, Cursor, etc).

## The web UI

The interactive map lets you:

- **Switch modes** — toggle between "test failure" and "refactor" analysis
- **Search** — find any file by name
- **Click a file** — see its imports, tests, and connections in a side panel
- **See the impact** — affected files light up, unaffected ones fade out
- **Toggle layers** — show/hide test files, config files, etc.

## Who is this for?

Developers who move fast (especially with AI tools) and need a quick way to understand their codebase without reading every file. If you've ever thought:

- "I changed one file and 30 tests broke... which file actually caused it?"
- "Is it safe to refactor this? What depends on it?"
- "I just joined this project. How does it all connect?"

WhatBreaks answers that in seconds.

## Works with

- **TypeScript / JavaScript** — `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`
- **Vue** — `.vue`
- **Python** — `.py`
- **Go** — `.go`
- **Rust** — `.rs`
- **PHP** — `.php` (including Laravel projects)
- **Ruby** — `.rb`
- **Test files** — automatically found and mapped to the files they test:
  - `.spec.ts`, `.test.ts` (JS/TS)
  - `_test.go` (Go)
  - `test_*.py`, `*_test.py` (Python)
  - `*Test.php` (PHP)
  - `*_spec.rb`, `*_test.rb` (Ruby)

## License

MIT
