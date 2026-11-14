# CleverFox: conversation log

Short notes from design conversations and working sessions: what was asked, what was decided, what was left open. Newest first. Keep entries brief; put lasting decisions in [DECISIONS.md](DECISIONS.md) and the full design in [SPECIFICATION.md](SPECIFICATION.md).

Entry format:

```
## YYYY-MM-DD: <topic>
**Where:** <e.g. Claude chat, Claude Code session>
**Asked:** ...
**Outcome:** ...
**Open:** ...
```

## 2026-11-14: hosting into Phase 1
**Where:** Claude Code session.
**Asked:** move hosting to Phase 1.
**Outcome:** done (DECISIONS 26). Phase 1 is models, web AI apps and AI hosting with local data centers, plus access and payment info. Phase 2 is templates, compatibility, datasets and guides. Phase 3 is pricing.

## 2026-11-14: web AI apps and payment access
**Where:** Claude Code session.
**Asked:** include web-based AI apps in the directory, popular ones too. Many people outside the US can't pay with Visa or other cards or aren't banked, so payment by crypto, local methods, or free options matters.
**Outcome:** added a web AI app record type (spec 7a) and an access-and-payment block for apps and paid APIs (spec 7b): free tier, payment methods, a "no card needed" flag, country availability and signup requirements, each with its source. Added filters and browse pages for them. Apps and access info join Phase 1. Claude added a rule to list only official payment routes, with no resellers or workaround guides (DECISIONS 24, to confirm).
**Outcome (follow-up):** the owner added that AI servers and hosting through local data centers are also important. Hosting moved to Phase 2, with data-center country and city, stated data-residency claims and the same access/payment block. Local and regional providers are in scope (spec section 12, DECISIONS 25). Datasets moved to phase 3.
**Open:** refresh window for payment facts; whether to add how-to-pay guides; seed list of local data-center providers; whether hosting belongs in Phase 1.

## 2026-11-14: spec review and answers
**Where:** Claude Code session.
**Asked:** Claude reviewed the repo and spec, then asked the review's questions one by one.
**Outcome:** a cross-source model catalog covering Hugging Face, GitHub, other hubs and API-only providers. It includes obscure as well as well-known models, with special focus on local models and on models outside the US or for other languages. Automated inclusion rules, no human review. Phase 1 is models only, and hardware fit is out for now. Key claims carry per-field sources. "Verified" means confirmed at the primary source. Guides are AI-written under evidence rules. All four success measures count. The site is CleverFox at cleverfox.sala.company, MIT license. The spec was converted to Markdown and revised, and DECISIONS.md entries 1–8 were confirmed, with 9–21 added. The owner had no preference on git churn or AI accuracy checks, so Claude chose "commit only on content change" and "structured data first plus a labeled test set".
**Open:** see the open list in DECISIONS.md.

## 2026-11-14: repository setup
**Where:** Claude Code session.
**Asked:** set up the empty `cleverfox` repo with a README, add the AI resource catalog spec, add CLAUDE.md, and add a place to collect conversation and design notes.
**Outcome:** added `README.md`, the spec (verbatim, as `docs/SPECIFICATION.txt`, since archived), `CLAUDE.md`, `docs/DECISIONS.md` (seeded from the spec) and this log.
**Open:** everything in the spec's section 19, starting with product name, stack and initial catalog scope.

## 2026-11-14: feasibility assessment and spec
**Where:** earlier Claude conversation (not in this repo). This entry is reconstructed from the spec's section 21, not from the conversation itself.
**Asked:** can a Hugging Face–style discovery site for models, datasets, compute, templates and docs, with pricing later, run on GitHub Pages using Flattery's patterns?
**Outcome:** yes for a curated static metadata catalog; the hard parts are classification, identity, version relationships, evidence and freshness, not hosting. Consolidated into the original spec, now `docs/archive/SPECIFICATION-2026-11-14.txt`. Based on Flattery's README only; no code audit and no live verification.
**Open:** confirm GitHub Pages limits and Hugging Face rate limits before building.
