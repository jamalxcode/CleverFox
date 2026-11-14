# CleverFox: specification

**Status:** revised 14 November 2026: no reports from people; access facts, feedback and warnings come from public posts (mainly X) and directories. Design requirements, not a description of existing code (there is none yet).
**Site:** https://jamalxcode.github.io/CleverFox/ (custom domain https://cleverfox.sala.company planned, waiting on DNS) · **Repo:** `jamalxcode/cleverfox`
**History:** the original proposal is kept unchanged in [archive/SPECIFICATION-2026-11-14.txt](archive/SPECIFICATION-2026-11-14.txt). Why each choice was made is in [DECISIONS.md](DECISIONS.md).

## 1. Product

CleverFox is **a global catalog of AI models, apps and hosting, with access information built in.** Two ideas carry equal weight:

1. **One catalog from every source.** It covers AI models wherever they live: Hugging Face, GitHub, Ollama, Kaggle, ModelScope and other hubs, plus API-only models from providers such as OpenAI, Anthropic and Google. It also covers web-based AI apps, and AI servers and hosting. Obscure listings sit alongside well-known ones.
2. **Access from anywhere.** For each listing, people outside the US can see whether they can use it from their country and how they can pay. That means free options, crypto, mobile money, UPI, Pix, app-store billing and other methods that don't need a Visa or Mastercard. They can also see whether it runs locally on their own machine, whether it works in their language, and whether there is a server in a data center near them.

CleverFox is a metadata directory. It links to official sources for downloads, inference, access, signup and billing. It does not host model files, run inference, provision servers, handle credentials or take payments.

**Focus areas:**
- **Obscure and well-known alike.** Niche models, apps and providers get in through gap rules, not popularity alone (section 4).
- **Local models:** local-ready formats and runtimes (GGUF/llama.cpp, Ollama, MLX, ONNX and similar) are first-class data and filters.
- **No card needed:** many people outside the US have no international card or no bank account. Payment methods and free options are first-class data and filters.
- **Local data centers:** AI hosting is listed by data-center location, including local and regional providers, not only the big US clouds.
- **Beyond the USA:** publishers from every region, and models and apps for specific languages (e.g. Arabic, Indic, Southeast Asian and African languages). Publisher region and language are first-class filters.

**Users:** developers and enthusiasts choosing AI tools, especially people outside the US and people running models locally, plus the owner as a personal tool. Section 2 gives concrete journeys.

### Success measures (provisional targets, to adjust after launch)
- **Coverage:** a notable new model or app appears within 48 hours of its official release. At launch: at least 300 models, 150 apps and 40 hosting providers, of which at least half are from outside the US or serve non-English users.
- **Freshness:** official facts are rechecked at least weekly. Access and payment facts older than 30 days are shown as stale. Source status is visible.
- **Accuracy:** at least 95% of fields correct on the labeled test set. Reported errors are fixed or marked within 7 days.
- **Search traffic:** 1,000 monthly visits within 3 months of launch and 10,000 within 12 months, measured with GoatCounter.
- **Personal use:** the owner uses it weekly.

## 2. User journeys

The spec is tested against these. Each must be answerable from the site.

1. **Free AI in my language without a card.** A student in Nigeria wants a chat AI that understands Yoruba, is free or payable by mobile money, and is available in Nigeria. *Needs:* app language data, free tier, payment methods, country availability, and a country picker.
2. **A server in my country.** A clinic in Egypt needs a GPU server or managed model hosting inside Egypt or nearby, billed in local currency or payable by bank transfer. *Needs:* hosting data-center locations, data-residency claims, payment methods and local-currency billing.
3. **Run it offline on my laptop.** A developer in Indonesia wants a model that runs offline on an 8 GB laptop and handles Indonesian. *Needs:* local formats, runtimes, file sizes and languages. Hardware fit arrives in phase 1.5.
4. **Pay for an API with crypto.** A freelancer in Argentina wants API access to a strong model and can only pay with crypto or a local method. *Needs:* API distributions, payment methods per route, and authorized aggregators shown as routes (section 8b).
5. **What's new from my region.** A researcher in India wants recent model releases from Indian labs, or models for Indic languages. *Needs:* release feed, publisher region and language filters.

## 3. Scope and phases

| Phase | Scope |
|---|---|
| 1 (thin launch) | **Models** from 2–3 sources (Hugging Face, Ollama, and API-only models from official provider docs). **Top web AI apps.** **AI hosting** at provider + region + GPU types (not every machine size). An access block for apps, paid APIs and hosting. **Datasets** and **documentation links** imported from Hugging Face. **X monitoring** for new announcements and feedback. Public reports and warnings read from the web. Country picker. Detail pages, search, filters, release feed, evidence, verification and freshness. |
| 1.5 | More model sources (GitHub, Kaggle, ModelScope, regional hubs). More apps. Individual hosting offerings and managed endpoints. **Hardware fit:** file sizes per format plus clearly labeled RAM/VRAM estimates. |
| 2 | Environment templates and documented deployment compatibility. Short AI-written guides (section 13). |
| 3 | Timestamped pricing comparisons. Hosting-policy review before any monetization. |

**Out of scope for now:** running inference or user code, provisioning, handling credentials or payments, accounts, private collections, subscriptions, checkout, and hosting any model or dataset files.

## 4. Curation

Listings are chosen by **written, automated inclusion rules**. Nobody approves listings before they go live, as in Flattery. One input feeds in besides the scanner: a hand-edited corrections file (attach, separate, hide, fix a field). CleverFox takes no reports from people directly; feedback comes from public posts (section 9). The inclusion rules are part of the spec and must be written before code (numbers in section 19).

Rule shape:
- Official releases from a tracked publisher list are always included.
- Community models are included above usage thresholds per source (Hugging Face downloads or likes, GitHub stars, Ollama pulls).
- **Gap rules let obscure listings in.** Lower thresholds, or none, apply when a listing fills a gap: a language or region with few options, a new local-ready format of a notable model, a publisher from an underrepresented region, an app or provider serving a country with few options, or one that accepts payment without a card. Minimum quality bars still apply: a real model card, README or official site; files or service that exist; and a stated license or a clear `unknown`.
- API-only models are included when listed in a provider's official model documentation.
- Web AI apps are included when they have a working official site and a clear AI function. Popular apps are always in.
- Hosting providers are included when their official site lists AI-capable compute or model hosting and its regions.
- Conversions and quantizations attach to their parent as distributions or variants. They never become standalone families.
- **Linking Ollama to originals:** an Ollama family is matched to its original Hugging Face repo by name (word by word, so other versions don't match), or credited to the publisher with at least 2 own repos named after it. Otherwise it's listed as "Listed by Ollama". Each Ollama model page supplies the license and each size's download size, context window and input types.
- **Publisher countries** come from Wikidata through a reviewed mapping of Hugging Face accounts to organisations (`data/publisher-map.json` → `data/publishers.json`, "Publishers" workflow). Individuals are never mapped.
- **Bulk imports (tools/import.mjs, provisional numbers):** from Hugging Face, the most downloaded, most liked and trending models across 15 tasks (text, vision, speech, image, embedding and more), plus up to 10 models per gap language (40+ non-English languages) with at least 200 downloads. Datasets: the most downloaded and most liked, plus up to 6 per gap language. Quantized copies are skipped. From the Ollama library, every model family: matched to its Hugging Face record by name and size when possible, otherwise listed on its own. Model cards supply papers, GitHub and documentation links. Hand-researched seed records always win over imports.

## 5. Sources

| Source | Gives | Role |
|---|---|---|
| Hugging Face Hub API | open models, card metadata, `base_model`, file lists and sizes, downloads/likes | authoritative for HF-hosted models |
| Ollama library | local-ready model tags and sizes | authoritative for its own listings |
| Provider model docs / APIs (OpenAI, Anthropic, Google, …) | API-only models, availability, supported-country lists | authoritative for API-only models |
| GitHub, Kaggle Models, ModelScope, regional hubs and labs (phase 1.5) | more models, non-US and language-specific models | authoritative for their own listings |
| Official app sites, pricing, help and FAQ pages, app-store listings | apps, free tiers, payment methods, country availability | authoritative for each app's own facts |
| Hosting provider sites, region lists, provider APIs | providers, data centers, GPU types, payment methods | authoritative for each provider's own facts |
| Public reports (section 9): replies and quotes on X, Reddit, forums, app-store reviews, news, security advisories | access and payment experiences, problems, scam warnings | labeled `web_reported`, linked to each post, never official |
| **X (main discovery source)**, then Hacker News, Reddit (e.g. r/LocalLLaMA), non-English communities | new model, app and hosting announcements; reception and feedback | discovery creates candidates, proves nothing; feedback becomes `web_reported` claims |
| Hugging Face and other AI directories (Ollama library, model/app directories that link out) | models, datasets, documentation and external links (papers, GitHub, official sites) | imported in bulk by the scanner; each link kept as a source |

Respect each source's terms, access controls, rate limits (including HTTP 429 with backoff) and attribution. Check every connector's permitted use before building it. Write short original descriptions; don't copy model cards or app pages wholesale.

## 6. Pipeline

```
sources -> scheduled scan (incremental, per-source budgets)
  -> candidate extraction -> normalization
  -> identity resolution (dedupe across sources, attach distributions/variants)
  -> verification at primary source
  -> read public feedback (X replies and quotes first) -> merge corrections
  -> persist small metadata records (commit only on content change)
  -> static pages + compact search index + feeds
  -> GitHub Pages deploy
```

- A Node workflow runs on a schedule in GitHub Actions, following Flattery's pattern. No backend. Nothing runs in visitors' browsers except search and filtering over prebuilt indexes.
- Credentials live only in workflow secrets, never in generated files, logs or client bundles.
- **Structured data first.** Take fields from structured APIs wherever possible. AI classifies candidates, extracts what structured data lacks, classifies public feedback (section 9) and writes summaries.
- **AI accuracy is tested.** A hand-labeled set of about 50 records runs in CI and blocks changes that lower extraction accuracy.

## 7. Records

### 7.1 Base record (all types)

Every record, whatever its type, has:
- `schema_version`
- `id`: stable, never reassigned. `cf:model:<publisher>/<slug>`, `cf:app:<publisher>/<slug>` or `cf:host:<provider>`.
- `type`: `model`, `app` or `host`.
- `name`, `description` (original, short), `publisher`, `publisher_region` (from evidence)
- `official_urls`, `documentation_urls`, `evidence_urls`
- `verification_status`:
  - `candidate`: seen only in an announcement or secondary source.
  - `verified`: the canonical page or API was fetched and confirms the listing exists and its availability.
  - `check_failed`: the last confirmation attempt failed, and earlier data is kept.
- `warning`: `none`, `reported` (credible public reports of a scam or safety problem), or `dont_touch` (section 10)
- `first_seen_at`, `last_content_change_at`. Check times live in a separate status file (section 11).
- `relations`: typed links to other records.

**Claims with provenance.** Key facts are objects, not bare values:
```json
{ "value": "apache-2.0", "source_url": "https://…", "source_type": "official", "observed_at": "2026-11-14T10:00:00Z" }
```
`source_type` is `official`, `third_party`, `independently_verified` or `web_reported` (from public posts and reviews, section 9). Which fields are key claims is listed per type.

**Unknown values stay `null` or `unknown`. Never fill them with AI guesses.**

### 7.2 Model records

Extra fields: `family`, `distributions` (one per place it's available: `{source, native_id, url, availability, formats, file_size_bytes, access, observed_at}`; paid API distributions carry an `access` block), `tasks`, `modalities`, `languages`, `formats`, `local_runtimes`, `local_ready` (true when a distribution is a downloadable local format), `official` (bool), `popularity` (per source, each with `observed_at`).

Key claims: `license`, `availability`, `parameters`, `benchmarks` (each entry with its evaluation conditions, and `self_reported` when it comes from the publisher's card), `released_at`, `first_published` (first upload on Hugging Face, not a release date), `announced_at`.

Derived fields: `capabilities`, `uncensored`, `gate` (`none`, `login_and_terms`, `approval`), `highlights`, and at build time `answers` (good for, runs locally, free, gate, license kind, barriers, no barriers, pay without card, benchmark count).

- **License:** an SPDX identifier, `custom` (with a link to the terms), or `unknown`. Gated-access terms are recorded separately.
- **Availability:** `announced`, `downloadable`, `gated`, `api_only`, `withdrawn` or `unknown`. Announced is never shown as available.
- **Hierarchy and relations:** family → release (a record) → official variants (records) → community conversions and quantizations (distributions or variant records) → later releases. Relation types: `variant_of`, `finetune_of`, `quantization_of`, `merge_of`, `adapter_of`, `successor_of`. Use Hugging Face's `base_model` where present. Never flatten versions, and never treat a quantization as a new family.

### 7.3 App records

Extra fields: `url`, `app_store_urls`, `categories` (chat, image, video, audio, coding, search, writing, …), `interface_languages`, `models_used` (relations, only when the publisher states them), `access`.

Key claims: everything in `access`, and `models_used`.

### 7.4 Hosting records

Phase 1 lists providers. Phase 1.5 adds individual offerings.

Extra fields: `provider_region`, `kinds` (`gpu_cloud`, `vm`, `bare_metal`, `managed_hosting`, `inference_endpoint`), `data_centers` (`{country, city_or_region, provider_region_code}`, only where the provider's own region list says AI compute is available), `gpu_types` (with the regions that have each, where stated), `data_residency` (stated claims, labeled as provider claims, not verified compliance), `launch_url`, `access`.

Key claims: `data_centers`, `gpu_types`, `data_residency` and everything in `access`.

Phase 1.5 offerings add CPU, RAM, GPU count and memory, and storage per configuration.

### 7.5 Dataset records

Extra fields: `tasks`, `modalities`, `formats`, `size_category` (as the source states it), `paper_urls`, `popularity`.

Key claims: `license`, `availability` (`downloadable` or `gated`), `languages`.

Datasets link out to their source page, papers, code and documentation. CleverFox never hosts dataset files.

### 7.6 Identity tests

No two public records share a distribution URL, source-native ID or official app or provider domain, unless there's an explicit relation between them.

## 8. Access and payment

### 8a. Access block

Apps, paid API distributions and hosting providers each have an `access` block. It describes **whether and how you can get access**, not price comparison (phase 3). Each field is a key claim with its own source and observation time. The block is global, one per listing, not per country. Where a method applies only in some countries, that goes in the method's `note`.

- `free`: `free`, `free_tier` (stated limits as text), `trial`, `paid_only` or `unknown`.
- `payment_methods`: a list. Each entry is `{method, note}`, where `method` comes from a fixed vocabulary: `card_international` (Visa/Mastercard/Amex), `card_local`, `paypal`, `crypto` (coins or networks in the note), `mobile_money` (e.g. M-Pesa), `upi`, `pix`, `alipay`, `wechat_pay`, `bank_transfer`, `app_store_billing` (Apple/Google, often with local methods and carrier billing), `prepaid_or_gift_card`, `carrier_billing` or `other` (named). The note holds limits such as "India only".
- `no_card_needed`: derived. True when a free option or at least one non-card method exists.
- `countries_available` / `countries_unavailable`: from the official supported-countries list, or `unknown`.
- `signup_requirements`: e.g. email only, phone number (and whether non-US numbers work, if stated), ID verification.
- `local_currency_pricing`: whether prices are shown or charged in local currencies, if stated.

### 8b. Access routes

What the competitor scan showed: few major AI providers accept crypto or local methods directly. In practice people pay through API aggregators (services that resell API usage under agreements with model providers) or crypto-funded virtual cards.

- **Authorized API aggregators** that are businesses serving the model under the provider's terms are listed as **distributions** of a model, with their own `access` block. That lets "pay for this model with crypto" be answered honestly. Each one is labeled as an aggregator, not the original provider.
- **Not listed:** account resellers, shared or sold accounts, unofficial top-up services and gray-market resellers. They carry scam and account-ban risk.
- **Crypto-funded virtual cards** are general payment tools, not access routes for a specific service. They are not listed per service. Whether to explain them in a general guide is an open decision.
- CleverFox does not give instructions for getting around country restrictions, sanctions or terms of service (no VPN or workaround guides).

## 9. Announcements and public feedback (X first)

CleverFox takes no reports from people directly. It reads what people already post publicly, the way Flattery reads reactions on X.

- **Announcements:** X is the main discovery source. Scheduled searches find new model, app and hosting announcements (release posts, launch threads, regional and non-English posts). Hacker News, Reddit and AI directories add to it. An announcement creates a candidate; the listing still needs a primary source to be `verified`.
- **Feedback:** for each listing, the scanner reads replies and quotes on X first, then Reddit, forums, app-store reviews and news. It looks for access and payment experiences ("paid with UPI, works", "blocked in Nigeria", "M-Pesa refused"), problems and scam warnings.
- Each finding becomes a `web_reported` claim linked to the public post, with its date. They're shown separately from official facts and never override them. Posts are linked, not copied: CleverFox shows a short fixed sentence built from the fact, never quotes personal details, and respects each platform's terms.
- **Accepted by agreement or authority:** a feedback claim shows once several independent accounts report the same thing within the freshness window (thresholds in section 19), or one authoritative source does (the service's official account, a news report, a security advisory). Contradicting claims are shown side by side. Claims go stale after 30 days unless repeated.
- How posts are read (keyword rules, AI classification or both) and the budget for X reads are open decisions (section 19).

## 10. Warnings

- `reported`: credible public reports that an app, aggregator or provider is a scam, unsafe or misleading, meaning several independent posts or one authoritative source.
- `dont_touch`, like Flattery's ☠️ rating: strong evidence, such as a security advisory, the official service disowning an impersonating site, or many independent reports.
- `dont_touch` listings stay visible with the warning, so people searching for them see it. They are never shown as recommendations.
- Publishers can dispute a warning publicly; the corrections file records the outcome.

## 11. Freshness and storage

- **Commit only on content change.** Per-record check times (`last_checked_at`) live in a small separate status file.
- Imported records live on the `data` branch, overwritten as a single commit, so daily popularity changes don't grow the repo's history. Generated files (`data/*.json`) are built at deploy time and not committed.
- Each source tracks a `last_successful_check`. A successful scan overall must not imply every source refreshed. Publish a source status page and freshness warnings.
- **Records are never silently lost:** withdrawals, deletions, dead apps and broken links are marked, not dropped. Unavailable listings can leave normal results, but their record stays. Connector or AI failures keep last-known-good data.
- Store only small metadata, original content and site assets. Never model weights, datasets, images or archives. Public feedback is kept as links to the posts.
- Scan cadence is set per source by update frequency and cost (section 19).

## 12. Site

**Built around what people ask.** Every listing answers these questions first, on the card and in an "At a glance" section, each from stated data:
- **What is it good for?** Capabilities: chat, writing, coding, reasoning, math, analytics, images, vision, speech, video, translation, search, tools and agents. They come from the source's own task, tags and capability labels (e.g. Ollama's "tools, thinking, vision"), never guessed from prose. A "What do you need?" row filters by them.
- **Can it run locally?** Local formats and runtimes, with the smallest download size.
- **Is it free?** Free download, free tier, trial or paid.
- **What payments are accepted?** Including whether you can pay without a card.
- **How smart is it?** Benchmark results published with the model, labeled as the publisher's own and not independently checked. There's no universal score (section 8). Independent leaderboards are an open decision.
- **Highlights:** short facts built from stated fields (context window, reasoning mode, tool use, vision, mixture-of-experts, number of languages, permissive license, smallest download).
- **Uncensored / abliterated?** Shown when the publisher names or tags a variant as such, as a neutral fact and a filter.
- **Gatekeeping:** login and terms, approval, license limits, API-only access, card-only payment, phone or ID checks, country blocks.
- **Freedom, no barriers:** a "No barriers" badge and filter when a model or dataset is free to download, has no gate, and has an open license; for apps, a free option with no known barriers. This is an access summary, not a quality score.


- **Interface in English, with a country picker first.** The visitor's chosen country (remembered in the browser) filters availability and highlights payment methods noted for it. Search handles non-Latin scripts. Names and descriptions can be in any language, with names in plain letters matching the source, as in Flattery. Interface translation comes later.
- **Lightweight pages.** Many visitors pay for mobile data. Pages are vanilla static HTML/CSS/JS, like Flattery. Target under 200 KB on a first load, excluding the search index, which loads only when needed.
- A static detail page per listing shows its distributions or routes, access, evidence (official and public reports, separately), warnings, relations, and last change and check times.
- Each type has its own filters:
  - **Models:** source, publisher, publisher region, language, task, modality, license, availability, official/community, local-ready, format/runtime.
  - **Apps:** category, interface language, free, no card needed, payment method, available in my country.
  - **Hosting:** data-center country, provider region, kind, GPU type, payment method, no card needed.
- **Browse pages, under a page-count rule:** a static page exists only when it has at least 5 listings. Planned kinds: by language, by publisher region, local models, free, no card needed, each payment method, and "AI hosting in <country>". No pages for filter combinations.
- Recent-releases feed (page and RSS).
- Link to stable official pages, not temporary download URLs.
- Analytics via the shared GoatCounter snippet.
- WCAG AA contrast and no sideways scrolling on phones, as in Flattery.

## 13. Guides (phase 2)

AI writes short original guides from official documentation, under the same evidence rules: every material claim links its source, and nothing is invented. Upstream docs are linked, not mirrored.

## 14. Templates and compatibility (phase 2)

- **Environment template:** a prepared software stack or launch configuration.
- **Deployment compatibility:** documented evidence that a specific model runs under a stated configuration.

Link to official pages only. No one-click deploy claims unless verified.

## 15. Pricing (phase 3)

Prices are observations stored apart from identity: `resource_id`, `provider`, `billing_unit`, `currency`, `amount`, `region`, `purchase_type`, `conditions`, `source_url`, `observed_at`.
- Inference units: input/output/cached tokens, requests, images, audio duration.
- Compute units: instance-hour vs GPU-hour, GPU count, region, spot vs on-demand, minimum billing period, storage and egress.

Show the observation time beside every price, and label stale prices. Never claim "cheapest" without equivalent configurations. Existing price sites (section 16) cover much of this, so build only what they don't.

## 16. Competitors

From a quick web scan on 2026-11-14. The figures are the sites' own claims, taken from third-party roundups, and haven't been checked.

| Area | Examples | What they cover | Gap for CleverFox |
|---|---|---|---|
| AI app directories | There's An AI For That (claims ~50,000 tools), Toolify, Futurepedia, RankmyAI | huge app lists by category, popularity, reviews | little or no payment-method, country-availability or no-card information; US-centric |
| Model price and benchmark sites | OpenRouter, Artificial Analysis, and many aggregators built on them (pricepertoken, llmreference, Enterprise DNA) | API prices, benchmarks, per-provider endpoints | API models only; no local-model, language or access-from-my-country angle |
| GPU and cloud price finders | getdeploying.com (claims ~90 providers), computeprices.com, flopper.io (claims residency normalization), inference.sh, sparecores | GPU prices, regions, some residency | price-first; weaker on local and regional providers, payment methods and no-card access. Check flopper.io closely: it is the closest on residency |
| "Pay for AI with crypto" pages | Coda One (`/pay-with-crypto/<tool>` pages), blog guides | per-tool crypto payment answers | run by vendors selling crypto-funded cards, so not neutral; crypto only |
| Hugging Face, Ollama library | their own hubs | models on one hub | single-source; no apps, hosting or access info |

**Positioning that follows:** don't compete on app count or price tables. Win on the question nobody answers neutrally: *can I use this from my country, how can I pay without a card, and is there a local or offline option?* Long-tail pages such as "AI apps you can pay for with M-Pesa", "free AI in Arabic" and "GPU hosting in Egypt" face little competition.

## 17. Site hosting and licenses

GitHub Pages: about 1 GB published site, 100 GB/month soft bandwidth, 10-minute deploy timeout. Recheck these before building. Pages may not be used as free hosting for commercial SaaS or e-commerce, so CleverFox stays a public informational directory. Keep the build portable. Custom domain `cleverfox.sala.company`, set up like the other sala.company sites.

Code: MIT. Catalog data: CC BY 4.0, with credit to CleverFox, and published as downloadable JSON. Third-party content keeps its own terms, and source links are kept.

## 18. Acceptance criteria (phase 1)

- No model weights, datasets, images or large archives are committed or published.
- Every record has the base fields (section 7.1). The identity tests (section 7.5) pass.
- Key claims carry a source, source type and observation time. Public (`web_reported`) claims are visibly distinct from official ones.
- Model records have `languages`, `formats` and `local_ready` from evidence or `unknown`.
- App records have a working official URL, categories and an `access` block.
- Hosting records list data centers from the provider's own region list, plus an `access` block. Data-residency statements are labeled as provider claims.
- No account resellers, gray-market routes or workaround guides are listed. Aggregators are labeled as aggregators.
- Unknown values are `null` or `unknown`. The labeled test set passes at or above its baseline.
- Announced, candidate and verified are visibly distinct. Warnings are visible on detail pages and in results.
- All five user journeys (section 2) can be completed on the site, with phase 1.5 limits noted.
- The country picker filters availability on every type.
- First-load page weight is under 200 KB, excluding the search index.
- A connector failure keeps last-known-good data and shows a freshness warning. Routine scans with no changes create no record commits.
- Search and filters work as static files with no credentials exposed.
- The catalog JSON is downloadable under CC BY 4.0.
- The site deploys to GitHub Pages at `cleverfox.sala.company`.

## 19. Open decisions

- UI framework/static generator and search library. Vanilla is preferred for page weight.
- Inclusion thresholds per source, the tracked publisher list, and the exact gap rules.
- Seed lists: regional hubs, labs and communities; top apps; local and regional hosting providers by country.
- Which API aggregators count as authorized (section 8b), and the test for it.
- Whether to explain crypto-funded virtual cards in a general guide.
- Thresholds for accepting public feedback (how many independent accounts, which sources count as authoritative) and for `reported` / `dont_touch`.
- X search queries, read budget (X API plan) and cadence; which other platforms to read.
- How public posts are classified: keyword rules, AI, or both.
- Scan cadence and refresh tiers per source.
- AI models for catalog extraction and feedback classification, if any, and spending caps.
- Independent "how smart" sources (public leaderboards such as arena-style rankings), and how to show them without a universal score.
- Extending the publisher mapping beyond the first 59 organisations.
- Each connector's permitted use.
- When to translate the interface, and into which languages.
- Operating budget and migration thresholds.
- Confirm the provisional success targets after launch.

## 20. Next steps

The seed prototype and the first bulk import (Hugging Face models and datasets, Ollama library) are built and deployed. Next:
1. **X monitoring** (section 9): search queries for announcements in many languages, then replies and quotes for feedback. Needs an X API bearer token as a repo secret and a read budget.
2. Other directories that link out: more model hubs (ModelScope, Kaggle, GitHub releases), API model lists (provider docs, aggregators), app directories for the web AI app list.
3. Publisher countries for imported models, from official sources.
