# CLAUDE.md

This file guides Claude Code when working in this repository.

## Overview

CleverFox is a planned discovery website for AI resources: models, datasets, VM/GPU compute offerings, environment templates and documentation, with third-party pricing comparisons later. It is a metadata directory, not a hosting or execution platform. Every listing links out to its canonical source for downloads, inference, access approval, provisioning, authentication and billing.

The full product spec is `docs/SPECIFICATION.txt`. Read it before making design or data decisions; it is the source of truth until code exists.

## Current state

No code yet. The repo holds only `README.md`, this file and the spec. The framework, static generator, search implementation, product name/domain, source allowlist, scan cadence, AI models and budgets are all still open (spec section 19). Don't present any of these as decided; propose and confirm.

## Intended architecture (from the spec)

- Hosting: static files on GitHub Pages, with the build kept portable so hosting can change.
- Pipeline: a scheduled Node workflow in GitHub Actions, modeled on Flattery (`jamalxcode/flattery`): scan sources -> extract candidates -> normalize -> deduplicate and resolve relationships -> verify against primary evidence -> persist small metadata records -> generate static detail pages and compact search indexes -> deploy. No backend, and nothing runs in visitors' browsers except search over prebuilt indexes.
- Source priority: Hugging Face APIs, official repos and releases, official publisher announcements and docs, provider pages, then X and Hacker News as supplementary discovery only. An announcement creates a candidate; it proves nothing about availability, license or performance.
- Phases: (1) curated models and datasets, detail pages, recent-announcements feed, visible evidence and freshness; (2) compute, templates, guides, relationships and compatibility; (3) pricing.

## Rules that must hold

- Never commit or publish model weights, datasets, VM images or other large resource files. Store only small metadata, original content and site assets.
- Never invent metadata. Unknown values stay `null` or explicitly unknown; AI output is not certification. Material claims keep their evidence URLs.
- Every listing has a stable ID (source-native where possible, e.g. `hf:model:org/name`), type, canonical URL, `first_seen_at`, `last_checked_at`, availability and verification status.
- Availability values are distinct: announced, downloadable, gated, API-only, discontinued/withdrawn, unknown. Announced is never shown as available.
- Models are hierarchical (family -> release -> official variants -> community conversions/quantizations). Don't flatten versions into one record or treat each quantization as a new family.
- Keep popularity, availability, compatibility, evidence and performance separate. No universal "best model" score. Open weights is not open source; parameter count is not a VRAM requirement; publisher benchmarks are not verified results; dataset access is not a reuse license.
- Records are never silently lost: mark withdrawals, deletions and broken links instead of dropping them. Connector or AI failures keep last-known-good data and surface freshness warnings. A successful scan must not imply every source refreshed.
- Secrets live only in workflow secrets; never in generated files, logs or client bundles. Respect each source's terms, rate limits (handle HTTP 429 with backoff) and attribution.
- Prices (later) are separate observations with source, timestamp, currency, billing unit, region and conditions. Never claim "cheapest" without equivalent configurations.
- Stay a public informational directory. No accounts, checkout, subscriptions or provisioning without a hosting-policy review (GitHub Pages disallows commercial SaaS/e-commerce use).
- Don't generate a page per filter combination; generate detail pages and compact indexes, and load full records only when needed.

## Conventions

- Design notes live in `docs/`:
  - `docs/SPECIFICATION.txt`: the product spec. Update it when a decision changes the design.
  - `docs/DECISIONS.md`: numbered decisions with situation, decision and why. Add an entry whenever something is decided or reversed (mark old ones superseded, don't rewrite them), and move items out of its open list as they're settled.
  - `docs/CONVERSATIONS.md`: a brief log of each design conversation or working session, newest first. Add an entry at the end of any session that discusses or changes the design. When the user pastes notes from another conversation, summarize them here and move lasting decisions into DECISIONS.md.
- Update this file with real commands (install, test, scan, build) once code exists.
