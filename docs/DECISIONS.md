# CleverFox: design decisions

What we decided while designing and building CleverFox, and why. Each entry gives the situation, the decision, and why, including things tried first and changed. Add a new numbered entry whenever a decision is made or reversed; don't rewrite old ones, mark them superseded and link the replacement.

The open questions are listed at the bottom. Move one into a numbered entry once it is decided.

## Product

### 1. A metadata directory, not a host
**Situation:** the idea was a Hugging Face–style site for models, datasets, compute, templates and docs.
**Decision:** list and describe resources and link to their canonical sources. Never host weights, datasets, VM images or other large files, and never run inference, provision VMs or handle provider credentials.
**Why:** keeps the site static and cheap, avoids licensing and hosting-policy problems, and sends users through each source's own access rules.

### 2. Static site on GitHub Pages, Flattery-style pipeline
**Decision:** a scheduled Node workflow in GitHub Actions collects and verifies metadata and generates static pages and compact search indexes, deployed to GitHub Pages. No backend at first.
**Why:** the pattern is proven in Flattery (`jamalxcode/flattery`): incremental scans, AI triage, verification, dedup, corrections, last-known-good data, freshness checks. Keep the build portable so hosting can change.

### 3. Primary sources first, social as discovery only
**Decision:** Hugging Face APIs, official repos and releases, publisher docs and provider pages are authoritative. X and Hacker News only create candidates.
**Why:** an announcement doesn't prove availability, license or performance.

### 4. Adapt Flattery, don't copy its ratings
**Decision:** reuse Flattery's pipeline patterns but not its social reception ratings or flat project grouping.
**Why:** popularity is not model quality, and a model version can be a materially different resource. Models are a hierarchy: family -> release -> official variants -> community conversions and quantizations.

### 5. No invented facts, no single "best" score
**Decision:** unknown fields stay null; material claims keep evidence links; popularity, availability, compatibility, evidence and performance stay separate.
**Why:** AI extraction is not certification, and a combined score would hide what is actually known.

### 6. Records are never silently lost
**Situation:** Flattery's rule is "the catalog never shrinks".
**Decision:** replace it with "records are never silently lost": withdrawals, deletions and broken links are marked, not dropped, and connector failures keep last-known-good data with visible freshness warnings.
**Why:** AI resources really do get withdrawn or gated; hiding that would mislead, but deleting on a failed fetch would lose good data.

### 7. Pricing is a later, separate layer
**Decision:** prices are timestamped observations stored apart from resource identity, with unit, currency, region and conditions. No "cheapest" claims without equivalent configurations.
**Why:** billing units differ too much (tokens, GPU-hours, spot vs on-demand) for one price field, and stale prices mislead.

### 8. Stay informational
**Decision:** no accounts, checkout or subscriptions while on GitHub Pages.
**Why:** GitHub Pages disallows use as free hosting for commercial SaaS or e-commerce. Review hosting before any monetization.

## Open decisions

From spec section 19, not yet decided:
- Final product name, domain (CleverFox is the working repo name).
- UI framework/static generator and search implementation.
- Source/provider allowlist and connector permissions.
- Scan cadence, refresh tiers, retention.
- AI models, extraction schema enforcement, spending caps.
- Initial catalog scope and inclusion thresholds.
- Provider APIs, compatibility tests, price adapters.
- Operating budget and migration thresholds.
