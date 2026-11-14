# CleverFox: design decisions

What we decided while designing and building CleverFox, and why. Each entry gives the situation, the decision, and why, including things tried first and changed. Add a new numbered entry whenever a decision is made or reversed; don't rewrite old ones, mark them superseded and link the replacement.

The open questions are listed at the bottom. Move one into a numbered entry once it is decided.

Entries 1–8 came from the original proposal and were confirmed by the owner on 2026-11-14. Entries 9 onward are the owner's answers to the first review that day.

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

### 9. A cross-source model catalog
**Situation:** the review found no user or wedge: Hugging Face already does model search well.
**Decision:** CleverFox is one place to find a model wherever it lives: Hugging Face, GitHub, other hubs (Ollama, Kaggle, ModelScope) and API-only providers (OpenAI, Anthropic, Google, …). Each model record lists all its distributions.
**Why:** Hugging Face covers only its own hub and leaves out closed, API-only models. The owner chose this over "where to run it", a release tracker or a beginner guide.

### 10. Obscure, local and non-US models are the focus
**Decision:** include obscure models as well as well-known ones. Give special focus to models people can run locally, and to models from outside the US or built for other languages and regions. Language, publisher region, local formats and runtimes are first-class fields and filters. Inclusion rules give niche models a way in through gap rules, not popularity alone.
**Why:** the owner's stated idea. Popularity thresholds alone would show only the famous, mostly US models every other site already covers.

### 11. Automated inclusion rules, no human review
**Decision:** written rules decide listings, and a corrections file fixes mistakes, as in Flattery.
**Why:** the owner's choice. It makes the written inclusion rules part of the product.

### 12. Phase 1 is models only
**Situation:** the original plan put models and datasets in Phase 1.
**Decision:** Phase 1 is models only, done well. Then datasets and guides; then compute and templates; then pricing.
**Why:** a smaller first launch. This supersedes the original phase plan.

### 13. Hardware fit is out of scope for now
**Decision:** no "will it run on my GPU?" answers or VRAM estimates in the first version. Local formats, runtimes and listed download sizes are shown.
**Why:** the owner's choice. Revisit early, because entry 10 makes local use a focus.

### 14. Sources stated per field for key claims
**Decision:** license, availability, parameters, benchmarks and release date each carry their own value, source URL, source type (official, third-party, independently verified) and observation time. Other fields use the record's evidence list.
**Why:** the original schema had one evidence list per record, which contradicted "keep the source next to each claim".

### 15. "Verified" means confirmed at the primary source
**Decision:** `verified` means the canonical page or API was fetched and confirms the model exists and its availability. The other states are `candidate` and `check_failed`.
**Why:** this can be checked automatically, which fits entry 11.

### 16. Commit only on content change
**Decision:** routine scans don't rewrite records. Check times live in a separate small status file.
**Why:** avoids the git growth of rewriting the whole catalog each scan. The owner had no preference, so this is Claude's default.

### 17. Structured data first, AI accuracy tested
**Decision:** take fields from structured APIs wherever possible. AI classifies, fills gaps and summarizes. A hand-labeled test set of about 50 records runs in CI and blocks accuracy drops.
**Why:** no human reviews listings, so accuracy must be measured. The owner had no preference, so this is Claude's default.

### 18. AI-written guides under the evidence rules
**Decision:** guides (phase 2) are AI-written from official docs. Every material claim links its source, and nothing is invented.
**Why:** the owner's choice. The evidence rules keep it consistent with entry 5.

### 19. Success means traffic, coverage, accuracy and personal use
**Decision:** all four count. Traffic is measured with the shared GoatCounter.

### 20. Name, domain and license
**Decision:** CleverFox at `cleverfox.sala.company`, under the MIT license.

### 21. Spec in Markdown
**Decision:** the spec is `docs/SPECIFICATION.md`, revised with these answers. The original text is kept unchanged in `docs/archive/`.

### 22. Web AI apps are in the directory
**Decision:** web-based AI apps and services (chat, image, video, audio, coding, search and others) are listed alongside models, popular ones and obscure ones alike. Apps and models link to each other when the publisher states which models an app uses. Apps join Phase 1.
**Why:** the owner asked for it. Most people meet AI through apps, not model files. This widens entry 12's "models only" Phase 1.

### 23. Access and payment information is first-class
**Situation:** many people outside the US have no Visa or Mastercard, or no bank account at all, so a listing that only shows a price doesn't tell them whether they can use the service.
**Decision:** every app and paid API carries an `access` block with free or free-tier status, accepted payment methods (crypto, mobile money, UPI, Pix, Alipay/WeChat Pay, app-store billing, prepaid cards, PayPal, cards), a derived "no card needed" flag, country availability and signup requirements. Each fact has its source and observation time. These are filters and browse pages, and they are part of Phase 1, separate from phase 4 pricing.
**Why:** the owner's point that card access is a real barrier outside the US. It fits entry 10's focus on people outside the US.

### 24. Official payment routes only, no workarounds
**Decision:** list only payment methods the service or its official app-store listing offers. No resellers, account sellers or unofficial top-ups. No guides to getting around country restrictions or sanctions.
**Why:** resellers carry scam and ban risk, and workaround guides would put the site in legal trouble. Claude's default; confirm.

## Open decisions

- UI framework/static generator and search library.
- Inclusion thresholds per source, the tracked publisher list, and the gap rules for obscure, regional and low-resource-language models.
- Regional hubs, labs and communities to watch.
- Whether the site interface is translated (e.g. Arabic, right-to-left), or only the catalog is multilingual.
- When to bring hardware fit back into scope.
- Refresh window for payment and availability facts.
- Whether to add "how to pay" guides per payment method (official routes only).
- Scan cadence and refresh tiers.
- AI models for extraction, and spending caps.
- Each connector's permitted use.
- Coverage target.
- Operating budget and migration thresholds.
