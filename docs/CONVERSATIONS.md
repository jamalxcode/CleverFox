# CleverFox: conversation log

Short notes from design conversations and working sessions: what was asked, what was decided, what was left open. Newest first. Keep entries brief; put lasting decisions in [DECISIONS.md](DECISIONS.md) and the full design in [SPECIFICATION.txt](SPECIFICATION.txt).

Entry format:

```
## YYYY-MM-DD: <topic>
**Where:** <e.g. Claude chat, Claude Code session>
**Asked:** ...
**Outcome:** ...
**Open:** ...
```

## 2026-11-14: repository setup
**Where:** Claude Code session.
**Asked:** set up the empty `cleverfox` repo with a README, add the AI resource catalog spec, add CLAUDE.md, and add a place to collect conversation and design notes.
**Outcome:** added `README.md`, `docs/SPECIFICATION.txt` (verbatim), `CLAUDE.md`, `docs/DECISIONS.md` (seeded from the spec) and this log.
**Open:** everything in the spec's section 19, starting with product name, stack and initial catalog scope.

## 2026-11-14: feasibility assessment and spec
**Where:** earlier Claude conversation (not in this repo).
**Asked:** can a Hugging Face–style discovery site for models, datasets, compute, templates and docs, with pricing later, run on GitHub Pages using Flattery's patterns?
**Outcome:** yes for a curated static metadata catalog; the hard parts are classification, identity, version relationships, evidence and freshness, not hosting. Consolidated into `docs/SPECIFICATION.txt`. Based on Flattery's README only; no code audit and no live verification.
**Open:** confirm GitHub Pages limits and Hugging Face rate limits before building.
