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

### 25. AI servers and hosting in local data centers move to Phase 2
**Situation:** the revised plan had compute and templates in phase 3, after datasets.
**Decision:** AI servers and hosting (GPU/VM offerings, managed model hosting, inference endpoints, templates) become Phase 2, with data-center location as a first-class field and filter. Local and regional data-center operators are in scope alongside the global clouds. Each offering carries the same access and payment block as apps, plus stated data-residency claims. Datasets and guides move to phase 3.
**Why:** the owner's point that hosting through local data centers matters to people outside the US, for latency, data residency, local billing and payment. Moving it ahead of datasets is Claude's reading of "also important"; it could move into Phase 1 instead.

### 26. AI hosting moves into Phase 1
**Decision:** AI servers and hosting (providers, GPU/VM offerings, managed model hosting, inference endpoints), with local data centers first-class, are part of Phase 1. Environment templates and deployment compatibility move to phase 2 with datasets and guides. Pricing becomes phase 3.
**Why:** the owner's call. Supersedes the phase placement in entry 25. Phase 1 now covers models, web AI apps, hosting, and access and payment information for all three.

### 27. Catalog and access carry equal weight
**Situation:** the second review argued that "AI access for people outside the US" is the unique idea and should be the headline.
**Decision:** both ideas lead equally: a global catalog of models, apps and hosting, with access information (country, payment without a card, local, language, nearby data centers) built in.
**Why:** the owner's choice. The competitor scan (spec section 16) shows the access angle is where CleverFox has no neutral competitor, so it drives the long-tail pages.

### 28. Community reports, labeled and automated
**Situation:** payment methods, country availability and free-tier limits are rarely published in machine-readable form, so official-only automation would leave most access fields `unknown`.
**Decision:** people can submit access facts with evidence (screenshot or link, personal data removed). An automated check accepts or rejects them. Accepted reports show as `community_reported`, separate from official facts and never overriding them, and go stale after 30 days. No manual approval. This amends entry 11: listings are still automated, but the community now feeds access facts.
**Why:** the owner's choice, and the only realistic way to fill the access data.

### 29. Thin Phase 1, then 1.5
**Decision:** Phase 1 keeps all three types but thin: models from Hugging Face, Ollama and official API docs; top apps; hosting at provider + region + GPU types. Phase 1.5 adds more sources and apps, individual hosting offerings and hardware fit.
**Why:** the owner's choice, to make the launch achievable. Refines entry 26.

### 30. Scam reports and warnings, no other trust signals
**Decision:** anyone can report a scam with evidence. Listings show `reported`, or `dont_touch` (like Flattery's ☠️) above a threshold, and stay visible with the warning. Trust signals (domain age, company identity) and privacy facts (data jurisdiction, training use) are not added.
**Why:** the owner picked only report/warning from the options offered.

### 31. Access data stays global, not per country
**Decision:** one access block per listing. Country-specific limits on a payment method go in a free-text note on that method (e.g. "India only").
**Why:** the owner's choice, for simplicity. Trade-off: a "pay without a card in my country" filter can mislead when a method works only in some countries. The country picker filters on `countries_available` and highlights notes.

### 32. English interface with a country picker first
**Decision:** English interface. A country picker filters everything, search handles non-Latin scripts, and translation comes later.

### 33. Catalog data under CC BY 4.0
**Decision:** the catalog data is CC BY 4.0, published as downloadable JSON. The code stays MIT.

### 34. Hardware fit in phase 1.5
**Decision:** file sizes per format plus clearly labeled RAM/VRAM estimates arrive in phase 1.5. Supersedes entry 13's "out of scope for now".

### 35. User journeys, competitors and provisional targets in the spec
**Decision:** the spec now has five user journeys (section 2) that the site must answer, a competitor table (section 16), and provisional success targets (section 1) proposed by Claude, to adjust after launch.

### 36. Authorized aggregators count as access routes
**Situation:** the competitor scan found that few major AI providers accept crypto or local payment directly. People use API aggregators or crypto-funded virtual cards.
**Decision:** authorized API aggregators are listed as model distributions with their own access block, labeled as aggregators. Account resellers and gray-market routes stay excluded (entry 24). Virtual cards aren't listed per service.
**Why:** without this, "pay for this model with crypto" would almost always say no, which isn't true. Claude's proposal; confirm.

### 37. Seed prototype next
**Decision:** before the pipeline, build about 50 hand-entered records with real sources (≈20 models, 20 apps, 10 hosting providers), weighted toward non-US listings, rendered as a static page with the country picker and filters.
**Why:** it tests the schema and the journeys cheaply. The owner chose this as the next step.

### 38. Seed prototype built; Flattery is reference only
**Decision:** the seed prototype exists: 50 records (21 models, 18 apps, 11 hosting providers) in `data/seed/`, a validator and builder (`tools/build.mjs`), and a vanilla static page with a country picker and per-type filters. Records were researched by Claude agents from official pages. Facts that couldn't be fetched are `unknown`, and records not confirmed at an official page are `candidate` and shown as "not yet verified". A personal cloud environment ("CleverFox research") allows 20 official source hosts for this research. Flattery is a reference for patterns only and is never included in CleverFox's environments, commits or scope.
**Why:** the owner chose the prototype as the next step and asked that Flattery stay out of the project. What the prototype taught is in CONVERSATIONS.md (2026-11-14, seed prototype).

### 39. Report form through ntfy.sh, stored in a private repo
**Situation:** community reports (decision 28) need a form. Flattery's lesson: a GitHub issue form needs an account and exposes the owner's profile, and the owner wanted no Google and no sign-up. CleverFox reports also carry screenshots, which may hold personal details, and ntfy.sh keeps messages only 12 hours and attachments about 3.
**Decision:** the site's `report/` page sends reports to an ntfy.sh channel. Screenshots are re-encoded in the browser, which strips location data, and the reporter can black out areas and must confirm they hid personal details. The private repo `jamalxcode/cleverfox-reports` collects the channel hourly, applies rule checks, redacts card numbers, emails and phone numbers in notes, and stores reports privately. It commits only when new reports arrive. The AI evidence check and publishing accepted reports come next.
**Why:** the owner chose a private repo so screenshots never become public. Trade-off: anyone who knows the channel name, which is visible in the page, can read reports for a few hours. The form warns about this.

### 40. Evidence check by Claude, publishing through a deploy key
**Decision:** each hour the private reports repo runs a check after collecting. Claude (`claude-opus-5-5`, medium effort, with the server-side refusal fallback) compares each report's screenshot or evidence page with its claim and returns a structured verdict. A report is accepted only if the evidence supports it, is about the listing, and shows no personal details. At most 20 checks run per hour, and failures are retried for 3 runs. Accepted reports become `public/community.json`: the fact, a neutral summary and a public evidence link only. A deploy key that can write only to `cleverfox` pushes that file as `data/community.json` when it changes, which redeploys the site. The catalog build attaches reports as `community_reported` claims, marks them stale after 30 days, and sets `reported` / `dont_touch` from accepted warnings (1 / 3 within 90 days, provisional).
**Why:** decision 28 requires automated evidence checks with no manual approval. The deploy key keeps the private repo from needing broader access, and it can be revoked on its own. The model choice follows the default for new Claude API code; a cheaper model can be measured later against real reports.

### 41. Reports accepted by rules, not AI (supersedes 40)
**Situation:** the owner held off on the API key and asked that reviews rely on other signals instead of an AI check.
**Decision:** the private reports repo accepts a report when its evidence link is on the listing's own official site and the page mentions the claim, or when enough reports make the same claim on different days with different evidence (2 for access facts, 3 for scam warnings). Unconfirmed reports expire after 60 days. Published text is a fixed sentence built from the fact, never the reporter's words. Screenshots count toward agreement but are never published. The Claude check was removed. The deploy key stays the way to publish, and it waits on the owner adding the secret.
**Why:** no API cost and no AI judgement. Trade-off: reports are anonymous, so one determined person could fake agreement across days. The corrections file and showing contradicting reports side by side are the safeguards.

### 42. No reports from people; read public posts instead, with X first (supersedes 28, 39, 40, 41)
**Situation:** CleverFox had a report form, a private reports repo and rule-based review.
**Decision:** remove everything that takes reports from people directly. The report form, the community display, and the private `cleverfox-reports` repo (archived) are gone. The deploy key was neutralized: the writable key was replaced with a read-only key nobody holds. Access experiences, feedback and scam warnings now come from what people already post publicly. X is the main source for new announcements and for feedback (replies and quotes), as in Flattery, followed by Reddit, forums, app-store reviews, news and security advisories. These become `web_reported` claims linked to the posts. Hugging Face and other AI directories feed the catalog in bulk: models, datasets, documentation and external links.
**Why:** the owner's direction. It removes the moderation and privacy burden of handling people's screenshots, and it follows the approach already proven in Flattery.

## Open decisions

See [spec section 19](SPECIFICATION.md#19-open-decisions) for the current list.
