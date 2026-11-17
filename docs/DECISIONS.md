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

### 43. Bulk import from Hugging Face and the Ollama library; datasets in Phase 1
**Decision:** `tools/import.mjs` imports models and datasets from Hugging Face's API: popular, liked and trending items, plus gap rules for 40+ non-English languages. It also imports every Ollama library family, matched to Hugging Face models by name and size. Licenses, languages, sizes, formats, base-model relations, papers, and GitHub and documentation links come from the sources' own metadata and cards. Anything not stated stays unknown; descriptions are short templates, not copied text. It runs daily in the deploy workflow. Imports live on a `data` branch overwritten as one commit, and a failed or shrunken import keeps the previous files. The page loads each listing type only when its tab is opened, shows 50 at a time, and builds details on demand.
**Why:** the owner asked to populate the catalog as much as possible from Hugging Face and other directories, especially their external links, models, datasets and documentation. The data-branch pattern comes from Flattery, and it avoids repo growth from daily download-count changes.

### 44. Filling unknowns from the sources themselves
**Decision:**
- Ollama families are linked to their original Hugging Face repo, giving publisher, license, languages, papers and links. The match is by name, word by word. Failing that, a family is credited to the publisher with at least 2 own repos named after it. When unsure, it stays "Listed by Ollama".
- Ollama model pages give license and per-size download size, context window and inputs.
- Publisher countries come from Wikidata through a reviewed mapping of Hugging Face accounts to organisations.
- "First published" is the first upload on Hugging Face, labeled as such and never as a release date.

**Why:** the owner asked for all four options. Each uses the source's own data, and an honest "unknown" stays when no source states the fact.

### 45. The site answers what people ask
**Decision:** cards and an "At a glance" section answer each question from stated data:
- good for (capabilities)
- runs locally
- free
- pay without a card
- how smart (publisher's self-reported benchmarks, labeled)
- highlights
- uncensored / abliterated
- gatekeeping
- no barriers

There's a "What do you need?" row of capability choices, plus quick filters for runs locally, free, no barriers, uncensored and has benchmarks.

**Why:** the owner listed what users look for. "No barriers" summarizes access, not quality, so the no-best-model-score rule holds. Independent leaderboards for "how smart" stay an open decision.

### 46. Import abliterated and uncensored models
**Decision:** the importer also takes the most downloaded abliterated, uncensored and "heretic" models on Hugging Face (up to 30 per term, at least 500 downloads). It keeps their GGUF packages even though they're tagged as copies of the original, and links each to its original as "Uncensored variant of". They carry the uncensored flag and filter as a neutral fact.
**Why:** the owner asked for it. Uncensored variants are what many local-model users look for, and the earlier import found only 3.

### 47. Hardware advice now, as labeled estimates (supersedes 34's phase 1.5)
**Decision:** each model with a local download shows estimated memory per size: download size × 1.2 + 0.5 GB, or from the parameter count when there's no download size (about 0.6 GB per billion parameters at 4-bit, 2 GB at 16-bit). It also shows the kind of device that has that memory, and processor advice (CPU vs graphics card vs Apple Silicon, mixture-of-experts note). A "Your device" memory picker marks each model ✓ fits, ⚠ tight (over 80% of memory) or ✗ too big, and adds a "Fits my device" filter. The editorial rule still holds: these are estimates with the method shown, not publisher requirements, and parameter count is not presented as a VRAM requirement.
**Why:** the owner asked for advice on memory and processor. The download size per size is real data from Ollama, which makes the estimate reasonably grounded.

### 48. A shareable page for every listing, and a link to reactions on X
**Decision:** the build writes a static page for every listing (`l/<type>/<publisher>/<name>/`), with the full details, link-preview tags and a canonical URL, plus `sitemap.xml` and `robots.txt`. Rendering moved into `render.js`, shared by the page and the build, so both look the same. Every listing gets a share row (its own page, copy link, the phone's share menu, X, WhatsApp) and a live X search link for reviews and reactions.
**Why:** the owner wanted a link for each entry that can be shared, posted, sent and shown on its own, and an X search for reactions. Static pages preview properly in X, WhatsApp and Slack and can be found by search engines. They're detail pages, not filter-combination pages, so the spec rule holds. The X link is the first step toward X feedback (section 9) before the X API is set up.

### 49. Recommended memory size
**Decision:** next to the estimated memory need, each local size shows a recommended memory: the smallest standard size (4, 8, 16, 24, 32, 48, 64, 96, 128 GB and up) at or above the need × 1.25. Cards show "X GB+ recommended", and each size chip reads "7b → 16 GB".
**Why:** the owner asked for it. Buyers think in standard memory sizes, and the 25% headroom matches the "tight" threshold already used for fit marks.

### 50. Where it runs: Windows, macOS, Linux, phone, cloud
**Decision:** platforms are derived from a model's runtimes and formats, using each runtime's documented platform support:
- Ollama, llama.cpp (GGUF) and Transformers: Windows, macOS, Linux.
- ONNX Runtime: those plus phones.
- MLX: Apple Silicon Macs.
- Core ML: Apple devices.
- TensorFlow Lite: phones.

Downloadable models can also run on a rented cloud server; API models and web apps run in the provider's cloud. Shown as 🪟🍎🐧📱☁️ on cards, as a "Runs on" line with the runtime and its docs, and as a filter. Memory needs stay separate (hardware line).

**Why:** the owner asked whether a model runs on Windows, Linux, macOS or a cloud server, with an emoji for each. The runtime support is documented by each project, so this avoids guessing.

### 51. A dove for "No barriers"
**Decision:** "No barriers" uses 🕊️, "No sign-in needed" uses 🚪, and uncensored uses ✂️. Only gated downloads keep a padlock (🔒).
**Why:** the owner pointed out that a padlock suggests something locked, not freedom.

### 52. Independent benchmarks from Epoch AI and Artificial Analysis
**Decision:** `tools/benchmarks.mjs` downloads the Epoch AI Benchmarking Hub daily (CC BY 4.0, credited on every page that shows it). It uses only Epoch's own data: the Epoch Capabilities Index and Epoch's runs of GPQA Diamond, SWE-bench Verified, MATH Level 5, AIME, FrontierMath and SimpleQA. Results Epoch collected from other leaderboards keep their licenses, so they're skipped. The Artificial Analysis Intelligence, Coding and Math indices are added when an `AA_API_KEY` secret is set (free API, attribution required). Results are matched by name, stored with the imports (last good data kept), shown as separate linked chips labeled "independent", and counted by the "Has benchmarks" filter. LMArena and MTEB are linked, not scored: LMArena's dataset license is unclear, and MTEB only publishes raw results.
**Why:** the owner approved this set. It answers "how smart is it?" from independent sources without a universal score. First run: 427 models in Epoch's data, 52 matched to listings.

### 53. Business rules in one document; dated data snapshots in the repo
**Decision:** `docs/BUSINESS-RULES.md` lists every rule and number the code applies (inclusion, answers, hardware, platforms, benchmarks, freshness, access, site), and is updated in the same commit as any rule change. Dated snapshots of the collected data (catalog, imports, benchmarks) are saved under `data/snapshots/<date>/`; the first is 2026-11-14. The live data still refreshes daily on the `data` branch, and snapshots aren't used by the build.
**Why:** the owner asked to save all business rules, information, conversations, design decisions and the data collected so far to the repo. Snapshots are taken on request, so daily changes don't grow the history.

### 54. Highlight what suits the visitor's device and country
**Decision:** a hint under the pickers explains that choosing your device memory and country makes CleverFox put first, and highlight with ⭐, the models that fit your machine and the apps and services available in your country that accept a payment you can make (or are free). Unknowns aren't highlighted; misfits go last.
**Why:** the owner asked to explain the pickers this way. Doing it, not only saying it, makes the pickers worth using.

### 55. X monitoring by keyword rules, within a monthly read budget
**Decision:** X is read with the official API (recent search, bearer token in the `X_BEARER_TOKEN` secret). Each daily run spends its share of a monthly budget (`X_MONTHLY_READS`, default 10,000): up to a third on an announcement search for posts linking to Hugging Face or the Ollama library, the rest on a rotating batch of listings, most popular first. Tone (positive, critical, general) comes from multilingual word and emoji lists with a negation guard, not AI. A listing counts as "praised on X" with at least 3 positive posts from 3 different accounts and 100+ likes between them. Announcements with 25+ likes let a new Hugging Face model in below the download floor, through the usual checks. Only post links, authors and counts are stored; buzz older than 30 days is dropped. Without a token the step is skipped and nothing changes.
**Why:** the owner wants announcements, praise and validation through likes and reposts from X. Word rules are cheap, testable and need no AI, which matches the decision to review by other parameters. Likes from several accounts, not one viral post, are what validation means. Storing no text respects X's terms.

### 56. "What people say on X" side panel on listing pages
**Decision:** each listing page has a side panel (stacked under the details on phones) with positive/critical/general counts, a tone bar, likes, and the most-liked posts overall and per tone, shown as X's own embedded posts (the X script loads only on pages that have posts). The main list shows a one-line summary with a link to the panel. The panel says tone is a rough guide.
**Why:** the owner asked for a side view of top posts to show whether opinion is positive, negative or neutral. Embeds show the real posts without copying them.

### 57. Search X by the short name people actually write
**Decision:** the per-listing X search adds the model's short name (cut at size and variant tags, versions kept) to the full name and Hugging Face address. Derivatives, fine-tunes and bare brand names get no short name. Listings that found nothing before are retried first with the new query.
**Why:** the first live run (18 listings, 123 reads) found nothing for 8 well-known models, such as "Llama 4 Scout 17B-16E Instruct", because people write "Llama 4 Scout". The owner approved the fix. Keeping versions and refusing derivatives stops posts about one model being credited to another.

### 58. Slim list files; full records on demand
**Decision:** `data/<type>s.json` holds only what the list needs. Each listing's full record is written next to its page (`record.json`) and fetched when its card opens. Apps and hosts stay whole (they're small).
**Why:** the Models tab loaded 3.1 MB, against the spec's 200 KB first-load budget, on the slow and costly connections the site is meant for. Now about 70 KB compressed.

### 59. Curate at build time: corrections file, dataset quality bar, re-uploads grouped
**Decision:** the build applies `data/corrections.json` (hide, merge, keep, each with a reason), hides imported datasets without a real dataset card (two of license, task, size, paper, language, own summary; 100+ likes pass), and groups format re-uploads and declared quantizations under the listed original as "other versions". Fine-tunes, adapters and uncensored versions stay separate. Grouped and hidden listings are recorded in `catalog.json`, and their old pages redirect or explain. First run: 18 grouped, 59 hidden.
**Why:** test and spam repos with bot downloads (`wegrthj/e94fjt-qi9l-raw` and the like) and FP8/GGUF copies made the catalog look careless. The spec already says a quantization isn't a new model. Uncensored versions stay because the owner asked for them to be included.

### 60. Re-check access source pages daily; warn, never auto-edit
**Decision:** a daily step fingerprints the visible text of each access fact's source page. A change after the facts were observed puts a "pricing page changed" warning on the listing; a page that's gone (404/410 twice) is flagged; facts older than 180 days are marked old. Nothing is rewritten automatically.
**Why:** payment and country facts were hand-researched and nothing re-checked them, so they would go stale silently. Detecting change is cheap and reliable; reading the new facts correctly isn't, and the rule is never to invent metadata. Bot walls are ignored so big help centers don't produce false alarms.

### 61. Growing the access side: researched regional apps, API providers and GPU hosts
**Decision:** added 27 regional apps (Africa, Middle East, South and Southeast Asia, East Asia, Latin America), 14 API providers and aggregators (as hosts of kind `inference_endpoint`) and 13 regional GPU hosts, researched from publishers' own pages with a source per fact. Most are `candidate`, because this session's network blocked the official sites, and the facts come from search results on the publishers' domains. In review, card checkouts (Stripe, cloud marketplaces, card-funded wallets) and China-only methods on global listings were removed, and a generic wrapper app was dropped. Country lists stay unknown where no official page states them, so those apps aren't highlighted for a country yet.
**Why:** the access side, which is what sets CleverFox apart, had 18 apps and 11 hosts against 874 models. The daily re-check (decision 60) now watches these listings' source pages.

### 62. Make CleverFox an advisor: the "more useful" plan
**Decision:** after a second critique, the owner chose to do every improvement: use-it-online links from models to API providers, top picks with a guided start (shareable), how-to-start commands and download buttons, an App Store country check with official-app and look-alike marks, offline phone apps, local prices, new this week with RSS, compare, and interface languages. Picks are built only from stated facts, with the reasons shown. Country availability from the App Store counts as official (Apple's own storefront data) and is used only for apps whose official store link is confirmed.
**Why:** the site answered "what exists and can I use it" but not "what should I use and how do I start", which is where people outside the US get stuck. Most of the data for picks already exists; the App Store check fills the biggest hole (app country availability) without hand research.

### 63. Hand-kept data files are committed, and ignored files are checked
**Decision:** `data/corrections.json` and `data/app-stores.json` are explicit exceptions in `.gitignore` (which ignores generated `data/*.json`). New hand-kept files in `data/` need the same exception.
**Why:** both had been silently ignored, so the live build ran without the corrections file and the App Store check without its candidate ids. Found by comparing the first live App Store run (12 apps) with the 38 expected.

### 64. Pay through the app store: Google Play by country, App Store later
**Decision:** a sourced table of the payment methods Google Play accepts per country (72 countries, read from Google Play Help) lets every app sold through Google Play show how people in each country can pay, phrased "if you subscribe in the Android app". The App Store table waits until Apple's support page can be read directly; search summaries contradicted each other (for example on carrier billing in Kenya).
**Why:** only 1 listing had mobile money as a payment method; most people outside the US who lack a card can still pay through their phone's app store. One official table covers dozens of apps without researching each one. It also corrected an assumption: Google Play in Kenya names Airtel Money, not M-Pesa.

### 65. Three scans a day, started by cron-job.org; launches are queued for research
**Decision:** cron-job.org starts the workflow 3 times a day through GitHub's API, with GitHub's schedule as a late backup. The first run in 20 hours is a full refresh; the others are quick scans that read X announcements and fill in new models and datasets from Hugging Face. Each UTC day still has one X read share, split across up to 3 scans at least 5 hours apart; a run outside a scan slot reads nothing. A second search finds AI app and hosting launch posts; those are listed as "Spotted on X" until researched, because payment and country facts can't be read from a post (and no AI is used to guess them).
**Why:** the owner asked for X scans 3 times a day for new models, datasets, apps and hosting, with the rest of the information filled in, timed by cron-job.org as for Flattery, whose lesson is that GitHub's schedules run late or not at all. The daily read share keeps X costs the same however many runs start.

### 66. Apply the outside review: the page is as careful as the pipeline
**Decision:** an outside review (15 November) found the live page could overstate facts. Applied:
- **Full records:** apps and hosts keep their full access records in the list, and every card loads its full record.
- **Google Play:** a country missing from the table is unknown.
- **Verified:** the page check no longer promotes listings to verified. Candidates are flagged first on cards and kept out of picks and guides.
- **Picks:** only listings that claim a task count for it, the ordering is published on the page, and X praise is out of the ordering.
- **Praise detection:** stricter (no emoji-only posts, no single CJK characters, 5 posts from 4 accounts with 200+ likes). Failed searches keep their scan slot. Listing names are cleaned before they go into a query.
- **Memory:** estimates from the parameter count are labelled and need twice the room in picks.
- **Validator:** links must be http(s).
- **Footer:** shows when each source last refreshed.
- **X embeds:** load on click.
- **GoatCounter:** events carry filters, not search words.
- **Deploy:** the weekly X post runs after it and can't fail it. A page check (phone widths, contrast) and a slim-record test stop the deploy on a regression. The data-branch push uses the checkout's credentials instead of a token in the URL.
- **Footer text:** "Prototype" is gone.

**Why:** the parts that make CleverFox different (country, payment, verified, what to use) were the ones most likely to overstate a fact. Hiding the doubtful ones, and saying what we don't know, matters more than looking complete. Fewer apps in picks and guides is the honest result of only 17 being verified.

### 67. Verification reviews: official pages fetched by GitHub, facts compared with quotes
**Decision:** a manual workflow ("Fetch pages for verification") downloads the readable text of each unverified listing's official pages to the `pages-cache` branch, because this session's network reaches only a few of those sites. A review session compares every stated fact with that text. Each confirmation or correction quotes the page exactly, and `tools/apply-verification.mjs` applies a listing only if every quote is found on its pages. A listing is verified when every stated fact is confirmed or corrected. Generic "credit card" counts as card payment; a processor like Stripe isn't a payment method. Decision 66's "a person" now means this review, which reads the pages; a keyword match still never verifies.
**Why:** the owner asked to verify the 76 unverified apps and hosts. Quotes checked by a program keep the review honest: nothing can be "confirmed" from memory. First run (16 November): 79 listings, 472 pages fetched, 39 verified, 154 corrections, 0 quotes rejected. Verified apps and hosts went from 17 to 56 of 96. Second run, 16 November, with rendering and store listings (decision 69): 38 listings reviewed, 26 verified, 73 corrections, 0 quotes rejected. That makes 82 of 96 verified.

### 68. Discovery beyond X: Hugging Face new releases, llm-releases.com, GitHub
**Decision:** every scan also:
- looks at Hugging Face's newest and trending models and datasets created in the last 14 days, keeping those with early interest;
- reads llm-releases.com (respecting robots.txt), whatever its layout, for links to Hugging Face models and datasets, plus announcements;
- runs 4 GitHub repository searches for brand-new AI projects;
- checks the latest releases of a watchlist (`data/github-watch.json` plus GitHub projects linked from listings).

Models and datasets found go through the usual import and checks. New GitHub projects and releases are shown separately on New this week and never become listings automatically.
**Why:** the owner asked to track new releases on llm-releases.com, Hugging Face and GitHub, keeping "new project" and "release" apart, as their GitHub notes advise: watching a repository doesn't discover new ones, and a new repository isn't a release. The first local run found 67 new Hugging Face models, 28 datasets and 93 new GitHub projects, and added 16 models and 26 datasets. Scans run 3 times a day rather than every 30 minutes, because each run rebuilds the site.

### 69. Fetching official pages: render JavaScript pages honestly, never get around refusals
**Decision:** the verification fetch (`tools/fetch-pages.mjs`):
- adds each listing's App Store and Google Play pages, and its `/pricing`, `/plans`, `/faq` and `/terms` pages;
- opens a page in a headless browser only when it answered 200 but showed almost no text (built by JavaScript);
- always identifies itself as CleverFox's checker; pages that refuse automated visitors (401, 403, 429) stay refused;
- stops starting new pages after 35 minutes and saves what it has, so a slow run never loses everything. Rendering waits for the page to load plus 2.5 seconds, at most 20 seconds.

**Why:** 40 listings stayed unverified after the first review, mostly because their pages need JavaScript or block bots. A first version pretended to be a normal Chrome browser, and the session's safety check refused it as getting around access controls. That was right: CleverFox respects sites that block automated visitors, and those listings stay unverified rather than being read by other means. Two runs with rendering hit the 50-minute limit and saved nothing, because some pages never finish loading. So each page also has a hard stop at 45 seconds, and the run saves what it has and exits at 38 minutes. The third run fetched 395 pages for the 40 listings (256 readable, 83 rendered).

### 70. YouTube: official channels by RSS, keyword search only with a key
**Decision:** every scan reads the RSS feeds of AI makers' official YouTube channels (`data/youtube-channels.json`, by @handle; free, no key). Each channel's id is confirmed from its own page and never guessed, so a wrong or impersonating handle is skipped rather than followed. Hugging Face links in video descriptions feed the catalog like other announcements. With an optional `YOUTUBE_API_KEY`, 4 keyword searches a scan add a separate "not reviewed" list.
**Why:** the owner asked to scan YouTube for new AI announcements. Official channels are a trustworthy, free signal. A keyword search reaches further, but anyone can post, so it's shown apart and never fills the catalog. The first channel list is mostly American labs; regional makers' channels should be added once their handles are confirmed on their own websites.

### 71. YouTube through the Data API; llm-releases.com through its own release pages
**Decision:** with a key, official channels are read from their uploads lists through the YouTube Data API (about 8 units a scan), and RSS stays as the fallback. llm-releases.com is read through its home page plus up to 25 of its own release pages, which is where its Hugging Face links are; robots.txt is respected and pages are read one at a time.
**Why:** the first runs on GitHub showed that YouTube's RSS feeds answered 404 for 7 of 8 channels. After switching to the API, 33 official videos came through in 14 days. llm-releases.com's home page links only to itself; following its release pages found 84 Hugging Face models. Diagnostics (feed status per channel, page size and domains for llm-releases) now sit in `discover.json`, so failures show instead of passing silently.

### 72. A Matrix / cyberpunk look, readable first
**Decision:** the default look is a dark terminal:
- near-black background with neon green, plus cyan and magenta accents;
- code-style lettering for headings, tabs, badges and labels, while long text stays in the system font;
- a faint "digital rain" canvas behind the header, paused when the tab is hidden and off for reduced motion;
- glowing panels with corner brackets, `>_` and `//` prompts on section titles, and faint scanlines.

A light "terminal paper" mode is available from the footer button (stored as `look: light`; the old `theme` setting from the previous design is ignored, because visitors who had chosen light before kept seeing light). The browser's light/dark preference no longer chooses the look; dark is the default.
**Why:** the owner asked for a less boring, functional but fun look in a Matrix cyberpunk style. Readability comes first: the deploy's contrast check now tests both looks the way the site switches them (it caught the selected tab's count in light mode), and the rain is decorative only, so it's never needed to read anything.

### 73. YouTube videos on each listing
**Decision:** each listing gets a "▶️ Videos on YouTube" button beside "Reactions on X": a live search link that uses no quota. Up to 3 already-collected videos whose titles name the listing are also shown, official channels first.
**Why:** the owner asked for YouTube videos about each AI, like the X reactions. A per-listing API search would cost 100 quota units each, far over the free daily allowance for about 1,240 listings. A search link plus matches from videos already collected give the same help for free. The first build matched 6 listings (ChatGPT, Gemini, Perplexity, DeepSeek, Gemma 4, LongCat-2.5).

### 74. Language filter lists language names, not codes
**Decision:** the "Any language" filter groups codes by their English name. It shows each language once with a listing count, and leaves out codes that have no name.
**Why:** the owner found the list full of raw codes ("atj", "av") and repeats (Aymara and Azerbaijani three times each). Hugging Face cards mix 2- and 3-letter codes and tag hundreds of languages. With grouping, the list went from about 220 entries to 150 real languages. The records stay unchanged (never invent or drop metadata).

### 75. New models from Replicate
**Decision:** every scan reads Replicate's public model list and collections, using a free account's API token. New models that are official or have 500+ runs become candidate listings, with tasks taken from Replicate's collections. Availability, license and size stay unknown. A model that is already listed gets Replicate under "Use it online" instead of a second listing.
**Why:** the owner asked to catalog new models from Replicate. Its API needs a token even to read, so it's a repo secret (reading costs nothing). Replicate runs both makers' own models and copies of open models. So matching by name and owner keeps one record per model, and nothing that Replicate doesn't state is filled in. The 500-run bar keeps out the many personal test models. The first run is a baseline, so the back catalog isn't called new.

### 76. Trace each model back to its original
**Decision:** derived models (fine-tunes, adapters, merges, uncensored variants, quantized copies) are followed up the `base_model` chain on Hugging Face to the original. The listing links the original: its CleverFox listing if there is one, otherwise its Hugging Face page. A model with no `base_model` keeps its own Hugging Face link.
**Why:** the owner asked to point listings to the original source where it can be found, and otherwise keep the Hugging Face link. Hugging Face's model tree (the uploader's `base_model` metadata) is the documented way to find it. Hugging Face is often the original host itself, so there's no separate site to look for. The first local run traced 229 derived models, 88 of them past their direct parent. Parents are cached so the daily refresh reads few pages.

### 77. Return visits: useful triggers, one next step, personal value kept in the browser
**Decision:** six engagement principles, applied to CleverFox's purpose:
- **Triggers:** an optional calendar reminder and a feed for your task.
- **Effortless core action:** "Find what to use" remembers your question and shows your picks on return, and a setup line makes missing settings one tap.
- **One next step:** "How to start with <top pick>".
- **Useful rewards:** reasons for each pick, "new for you since your last visit" and setup progress. No badges or streaks.
- **Continuation:** "Similar" listings, empty results that offer the filter to remove, and alternatives for empty pick columns. Show more stays a button.
- **Accumulating value:** saved listings, recently viewed and resuming the last search. Kept only in the browser, with download, load and clear.

**Why:** the owner asked for the principles, with genuine usefulness over time spent. People come back to CleverFox when something new fits their task, device and country, or to get back to what they found. So every piece serves that.
- **No push notifications:** they need a server, accounts and a subscription store, and the site is a static directory with no accounts (spec rules). A calendar event and RSS give the same "remind me" under the visitor's control.
- **Privacy:** personal data stays in localStorage, and GoatCounter still sees only page views and the existing anonymous events.
- **Language:** the new text is English for now; adding it to `i18n.js` is in the TODO.

### 78. "What people show on YouTube" panel
**Decision:** listing pages get a YouTube panel beside the X panel. It shows reviews found by searching "<name> review" (a few listings per scan, rotating weekly; titles must name the listing), and videos from makers and release news that name it. Videos play in the page only when pressed.
**Why:** the owner asked for YouTube reviews like "What people say on X". Searching every listing every day would cost far more than the free quota (100 units per search). Rotating 15 per scan covers about 200 listings every 4 to 5 days within 4,500 units. Click-to-play keeps YouTube from loading for visitors who don't ask for it, like the X posts' "Show the posts" button.

### 79. Clarity pass: answers first, one question bar, labelled facts
**Decision:** following the owner's UI critique, the interface was reworked so the answer can be read at a glance:
- **Verdict strip:** every card and listing page leads with what the listing means for you, in plain words: ✓ yes, ✗ no, ! maybe, ? not stated. It covers fits your device, works in your country, free, pay without a card, sign-up and license, and speaks your language.
- **Plain description:** imported models whose description is only a template get a plain sentence from their stated tasks ("Turns text into numbers for search tools, not a chatbot").
- **Fewer badges:** warnings always, then up to 3 notable positives. Raw details go in one quiet line, with the license said once.
- **One question bar:** "I want to … on …", with device, country and AI language as the setup pickers (✓ when set). The country is suggested from the browser as one tap. The interface language is a small 🌐 in the header. The repeated explanations are gone.
- **Picks first** on every visit without a link. With nothing narrowed, everyday models come before building blocks such as embeddings.
- **Folded filters:** search plus capability chips, and the rest behind "⚙️ Filters (n)". On phones the tabs form a 2×2 grid and the chips are one sideways row.
- **Details reordered:** actions folded into Save · Compare · Share ▾ · More ▾. Then How to start, then "🌍 Using it in [country]" (availability, free plan with limits, every way to pay with its note written out, the full sign-up text, prices), then labelled facts with glossary links, then links and sources.
- **Listing pages redraw for you:** with the visitor's stored device, country and language, and with a country picker in the "Using it in" box. They no longer repeat the X and YouTube lines from the side panels.
- **Country-aware payments:** a way to pay whose note names other countries but not yours ("Pix · Brazil") no longer counts as "pay without a card" for you. This applies to verdicts, picks, the highlighting, the filter and compare.
- **Colour roles:** green means good and the one primary action, links are cyan, badges use the body font, and names are bigger.

**Why:** the critique found the facts right but the page hard to read. Everything had equal weight, about 27 controls came before the first result (2.5 screens on a phone), the first results were embeddings, and access answers were scattered across 5 places with notes hidden behind an asterisk. Nothing new is claimed: the verdicts restate facts the listings already carry. The country check fixed a real error, where ChatGPT showed "Pay without a card: Pix, UPI" to someone in Kenya.

### 80. Three looks: Dark, In between, Light
**Decision:** a third look, "In between", sits between the Matrix dark look and the light "terminal paper" look. It uses dim slate colours, a flat background, no scanlines, faint digital rain and no neon glow. A 🌓 picker in the header (next to 🌐) chooses Dark, In between or Light, stored as `look` (`''`, `dim`, `light`). Every page reads it before drawing, and the page check tests contrast in all three.
**Why:** the owner asked for a light, a dark and an in-between mode. Pure black with neon can tire the eyes, and bright light can glare at night. The middle look keeps the character with less contrast strain. The footer's "Light mode" button became the header picker, because three choices don't fit a toggle.

### 81. Look buttons instead of a dropdown (refines 80)
**Decision:** the look is chosen with three buttons side by side (🌙 Dark · 🌗 In between · ☀️ Light), with the current one shown pressed. Below 720 px only the icons show, and the words stay for screen readers.
**Why:** the owner asked for buttons. With only three choices, buttons show them all at once and switch in one tap, where a dropdown takes two.

### 82. In between: brighter and colour-blind friendly (refines 80)
**Decision:** "In between" now uses a lighter slate grey (background #3b4449, surfaces #465055), with colour roles from the Okabe–Ito colour-blind-safe palette: good is sky blue, no is orange, warnings are yellow, and links are lavender and always underlined. Neon glows and coloured badge borders are off. Meaning never rests on colour alone: every verdict keeps its symbol (✓ ✗ ! ?) and its words.
**Why:** the owner asked for a brighter in-between look that's colour-blind friendly. Green against red is the pair most people with colour vision deficiency can't tell apart. Blue against orange and yellow stays distinct under deuteranopia and protanopia (checked with simulated colour blindness), and the page check confirms WCAG AA contrast.

### 83. More discovery sources that need no sign-up
**Decision:** every scan also reads six sources that need no account or key:
- **OpenRouter's public model list:** models added in the last 14 days. Ones that name a Hugging Face model are filled in from there. API-only ones become candidate listings with OpenRouter and its prices under "Use it online". Nothing that OpenRouter doesn't state is filled in.
- **AI makers' official news feeds** (`data/announce-feeds.json`, robots.txt respected): Hugging Face links in posts are filled in, and the posts show on New this week.
- **Hugging Face Daily Papers:** the 15 most upvoted papers, and up to 2 models and 5 datasets linked to each.
- **Hacker News** (Algolia's public API): AI launches with 30+ points in 3 days, shown as "not reviewed". Hugging Face links are filled in.
- **Bluesky's public search:** posts with 25+ likes linking to Hugging Face. It's skipped, not failed, if the search needs signing in.
- **App Store searches** ("AI chat", "AI assistant") in 20 countries, once a day: popular apps (1,000+ ratings) that aren't listed yet go into a research queue on New this week. They're never added automatically, because their access facts must be checked first.

Quick scans also pick up **Ollama's newest models** (up to 12 new families), so local models arrive within hours.

**Not added:**
- Product Hunt (needs a token);
- Reddit (its API terms need permission);
- ModelScope (its public API couldn't be checked from here, so it's in the TODO);
- arXiv (Hugging Face Daily Papers already brings the papers that have models).

**Why:** the owner asked for more places to catch AI announcements, preferring ones that need no sign-up. The statistics showed X had added only 3 listings, and the catalog lacked closed API models, apps and announcements made before Hugging Face. Each source keeps its last good data if it fails. Its findings go through the usual checks (one record per model, nothing invented, sources and dates), and anything that can't be checked automatically is labelled "not reviewed" or queued for research.

### 84. Product Hunt as an app research queue
**Decision:** with the owner's Product Hunt developer token (repo secret `PRODUCT_HUNT_TOKEN`), every scan reads the most-voted launches in Product Hunt's AI topic from the last 3 days. They go into a research queue on New this week, credited to Product Hunt, and are never added automatically.
**Why:** apps are the catalog's thinnest side. Product Hunt is where many AI apps launch, but a launch page doesn't state the access facts CleverFox needs (countries, ways to pay), so each needs checking at the official site first. Product Hunt's API terms allow non-commercial use like this one.

### 85. Auto-research of queued apps, rules only
**Decision:** every scan, `tools/autoresearch.mjs` takes up to 8 apps from the research queues (popular App Store apps not yet listed, Product Hunt launches) and makes "not yet verified" listings. Every fact comes from an official source, with its quote, link and date:
- **The App Store listing:** name, seller, website, price, interface languages.
- **The app's own website** (home page, then its pricing, plans or FAQ pages): a free plan or trial, ways to pay (from pricing or billing pages only, by strict words such as "M-Pesa", "UPI", "PayPal", "Visa"), and sign-up methods.
- **Categories:** from the publisher's own words, by rule.

Countries come later from the daily App Store check, which now includes these listings. Nothing is read from a site's silence. robots.txt is respected, the fetcher says who it is, and refusals are left alone. Each app is researched again after 14 days. The listings say "Not yet verified: collected automatically from official pages", stay out of picks and guides, and are promoted only after the quote-checked review (decision 67). AI reading of pages is a later, optional step (it would need an API key).
**Why:** the owner asked to fill information gaps ourselves so new listings can be featured, rules only first. The App Store and the maker's own pages are official sources. A quote for every fact keeps them checkable, and unknown stays unknown.

## Open decisions

See [spec section 19](SPECIFICATION.md#19-open-decisions) for open design questions, and [TODO.md](TODO.md) for outstanding work.
