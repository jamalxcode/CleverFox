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

## Open decisions

See [spec section 19](SPECIFICATION.md#19-open-decisions) for the current list.
