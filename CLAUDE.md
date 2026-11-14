# CLAUDE.md

This file guides Claude Code when working in this repository.

## Overview

CleverFox (planned at https://cleverfox.sala.company) is a cross-source catalog of AI models: one place to find a model wherever it lives (Hugging Face, GitHub, Ollama, Kaggle, ModelScope and other hubs, plus API-only providers such as OpenAI, Anthropic and Google). It covers obscure as well as well-known models, with special focus on models people can run locally and on models from outside the US or built for other languages and regions. It also lists web-based AI apps and services, popular and obscure. For every app and paid API it shows how you can get access: free tiers, payment methods beyond international cards (crypto, mobile money, UPI, Pix, app-store billing and others), a "no card needed" flag and country availability, because many people outside the US have no card or bank account. AI servers and hosting are listed by data-center location, including local and regional providers. It is a metadata directory, not a hosting or execution platform. Every listing links out to its canonical sources.

The product spec is `docs/SPECIFICATION.md`. Read it, and `docs/DECISIONS.md`, before making design or data decisions. They are the source of truth until code exists. The original proposal is archived in `docs/archive/` for history only; don't follow it where the current spec differs.

## Current state

No code yet: just docs and an MIT license. Still open (spec section 17 and the end of DECISIONS.md): the stack and search library, inclusion thresholds and gap rules, regional sources to watch, interface translation, scan cadence, AI models and budgets. Don't present these as decided; propose and confirm.

## Intended architecture (from the spec)

- Hosting: static files on GitHub Pages at `cleverfox.sala.company`, with the build kept portable.
- Pipeline: a scheduled Node workflow in GitHub Actions, modeled on Flattery (`jamalxcode/flattery`): scan sources -> extract candidates -> normalize -> resolve identity across sources -> verify at the primary source -> persist small records (commit only on content change) -> generate detail pages, compact search index and feed -> deploy. No backend.
- Listings are chosen by written automated inclusion rules (no human review) plus a corrections file. Gap rules let obscure, regional and low-resource-language models in, not popularity alone.
- Structured API data first. AI classifies, fills gaps and summarizes; a labeled test set in CI guards extraction accuracy.
- Social sources (X, Hacker News, Reddit, non-English communities) only create candidates.
- Phases: (1) models, web AI apps, and AI servers and hosting with local data centers first-class, plus access/payment info for all three; (2) environment templates, deployment compatibility, datasets and AI-written guides; (3) pricing. Hardware fit ("will it run on my GPU?") is out of scope for now.

## Rules that must hold

- Never commit or publish model weights, datasets, VM images or other large resource files. Store only small metadata, original content and site assets.
- Never invent metadata. Unknown values stay `null` or explicitly unknown; AI output is not certification. Material claims keep their evidence URLs.
- Every record has a stable internal ID (`cf:model:<publisher>/<slug>`, never reassigned), `schema_version`, one entry per distribution (source, native ID, URL), availability and `verification_status` (`candidate`, `verified` = confirmed at the primary source, or `check_failed`).
- License, availability, parameters, benchmarks and release date carry their own source URL, source type (official / third_party / independently_verified) and observation time.
- Language, publisher region, formats and local readiness come from evidence or are `unknown`.
- Availability values are distinct: announced, downloadable, gated, API-only, discontinued/withdrawn, unknown. Announced is never shown as available.
- One model record per model across all sources; no two public records share a distribution URL or native ID. Models are hierarchical with typed relations (`variant_of`, `finetune_of`, `quantization_of`, `merge_of`, `adapter_of`, `successor_of`). Don't flatten versions or treat a quantization as a new family.
- Keep popularity, availability, compatibility, evidence and performance separate. No universal "best model" score. Open weights is not open source; parameter count is not a VRAM requirement; publisher benchmarks are not verified results; dataset access is not a reuse license.
- Records are never silently lost: mark withdrawals, deletions and broken links instead of dropping them. Connector or AI failures keep last-known-good data and surface freshness warnings. A successful scan must not imply every source refreshed.
- Secrets live only in workflow secrets; never in generated files, logs or client bundles. Respect each source's terms, rate limits (handle HTTP 429 with backoff) and attribution.
- Access facts (free tier, payment methods, countries, signup) come from official sources with source and observation time, or are `unknown`. List only official payment routes: no resellers, account sellers or guides to getting around country restrictions or sanctions.
- Prices (later) are separate observations with source, timestamp, currency, billing unit, region and conditions. Never claim "cheapest" without equivalent configurations.
- Stay a public informational directory. No accounts, checkout, subscriptions or provisioning without a hosting-policy review (GitHub Pages disallows commercial SaaS/e-commerce use).
- Don't generate a page per filter combination; generate detail pages and compact indexes, and load full records only when needed.

## Conventions

- Design notes live in `docs/`:
  - `docs/SPECIFICATION.md`: the product spec. Update it when a decision changes the design.
  - `docs/DECISIONS.md`: numbered decisions with situation, decision and why. Add an entry whenever something is decided or reversed (mark old ones superseded, don't rewrite them), and move items out of its open list as they're settled.
  - `docs/CONVERSATIONS.md`: a brief log of each design conversation or working session, newest first. Add an entry at the end of any session that discusses or changes the design. When the user pastes notes from another conversation, summarize them here and move lasting decisions into DECISIONS.md.
- Keep the shared GoatCounter snippet (endpoint `https://salacompany.goatcounter.com/count`) on every page once the site exists.
- Update this file with real commands (install, test, scan, build) once code exists.
