# CleverFox: specification

**Status:** revised 14 November 2026 with the owner's answers to the first review. Design requirements, not a description of existing code (there is none yet).
**Site:** https://cleverfox.sala.company (planned) · **Repo:** `jamalxcode/cleverfox`
**History:** the original proposal is kept unchanged in [archive/SPECIFICATION-2026-11-14.txt](archive/SPECIFICATION-2026-11-14.txt). Why each choice was made is in [DECISIONS.md](DECISIONS.md).

## 1. Product

CleverFox is a **cross-source catalog of AI models**: one place to find a model wherever it lives. That covers open models on Hugging Face, models released only on GitHub, models on other hubs (Ollama library, Kaggle Models, ModelScope), and API-only models from providers such as OpenAI, Anthropic and Google, which Hugging Face doesn't list.

It also lists **web-based AI apps and services**: chat assistants, image, video, audio and coding tools people use in a browser or app, popular ones and obscure ones alike (section 7a).

Every listing links to its canonical sources for downloads, inference, access approval, authentication and billing. CleverFox is a metadata directory. It does not host weights or other large files, run inference, provision compute or handle credentials.

**Breadth and focus:**
- **Obscure and well-known models alike.** The catalog isn't limited to famous releases. Small, niche and little-known models are in scope when they pass the inclusion rules (section 3).
- **Special focus on local models:** models people can download and run on their own machines. Local-ready formats and runtimes (GGUF/llama.cpp, Ollama, MLX, ONNX and similar) are first-class data and filters.
- **Access without a US-style bank card.** Many people outside the US can't pay with Visa or Mastercard, or have no bank account. For every paid app and API, CleverFox shows how you can pay: crypto, local payment methods (mobile money, UPI, Pix, Alipay/WeChat Pay and similar), app-store billing, prepaid or gift cards, PayPal. It also shows what is free and which countries the service is available in (section 7b).
- **Local data centers.** People and businesses outside the US often need AI servers and hosting close to home, for lower latency, data-residency and sovereignty rules, local-currency billing and local payment. CleverFox lists AI hosting by data-center location, including regional and local providers, not only the big US clouds (section 12).
- **Appeal beyond the USA:** models from publishers outside the US (e.g. China, Europe, the Middle East, India, Japan, Korea, Africa, Latin America), and models built for specific languages and regions (e.g. Arabic, Indic, Southeast Asian and African languages). Language and publisher region are first-class filters.

**Wedge versus Hugging Face:** Hugging Face covers its own hub well. CleverFox shows one model across all the places it is distributed: its Hugging Face repo, its Ollama tag, its GitHub release and its official API. It also includes the closed, API-only models people compare open ones against.

**Users:** developers and enthusiasts choosing a model, especially people running models locally and people outside the US looking for models in their language or region, plus the owner as a personal tool.

### Success measures
- **Search traffic:** generated pages rank, and visits are measured with GoatCounter (`https://salacompany.goatcounter.com/count`, the shared snippet from Flattery).
- **Coverage:** notable new models appear within a set time of release (target to be set).
- **Freshness and accuracy:** listings stay current, and few errors are found or corrected.
- **Personal use:** the owner finds it useful day to day.

## 2. Scope and phases

| Phase | Scope |
|---|---|
| 1 | **Models, web AI apps and AI hosting.** Cross-source model records. A directory of web-based AI apps and services. AI servers and hosting with local and regional data centers first-class: providers, GPU/VM offerings, managed model hosting and inference endpoints (section 12). Payment and access information for apps, APIs and hosting (free tier, payment methods, country availability). Static detail pages, search and filters, recent-releases feed, visible evidence, verification and freshness. |
| 2 | Environment templates and documented deployment compatibility. Datasets. Short AI-written guides (section 11). |
| 3 | Timestamped third-party pricing. Hosting-policy review before any monetization. |

**Out of scope for now:** hardware fit ("will it run on my GPU?"), including VRAM estimates. Phase 1 still shows which local formats and runtimes each model has, with download sizes where the source lists them. Revisit hardware fit early, given the local-model focus. Also hosting binaries, running inference or user code, provisioning, credentials, accounts, private collections, subscriptions and checkout.

## 3. Curation

Listings are chosen by **written, automated inclusion rules**. Nobody reviews listings before they go live, as in Flattery. A hand-edited corrections file (attach, separate, hide, fix a field) handles mistakes. The inclusion rules are part of the spec and must be written before code (thresholds still to be set, section 17).

Rule shape (numbers TBD):
- Official releases from a tracked publisher list are always included.
- Community models are included above usage thresholds per source (e.g. Hugging Face downloads or likes, GitHub stars, Ollama pulls).
- **Obscure models get a way in.** Popularity thresholds alone would exclude niche, regional and low-resource-language models, so lower thresholds (or none) apply to models that fill a gap: a language or region with few models, a new local-ready format of a notable model, or a publisher from an underrepresented region. Minimum quality bars still apply: a real model card or README, files that exist, and a stated license or a clear `unknown`.
- API-only models are included when listed in a provider's official model documentation.
- Web AI apps are included when they have a working official site and a clear AI function. Popular apps are always in. Obscure and regional apps get in through the same gap rules as models (e.g. an app serving a language or region with few options, or one that accepts payment without a card).
- Conversions and quantizations attach to their parent, as distributions or variants, and never become standalone families.

## 4. Sources

| Source | Gives | Role |
|---|---|---|
| Hugging Face Hub API | open models, card metadata, `base_model`, file lists, downloads/likes | authoritative for HF-hosted models |
| Provider model docs / APIs (OpenAI, Anthropic, Google, …) | API-only models, context limits, availability | authoritative for API-only models |
| GitHub repos and releases | GitHub-only models, licenses, releases | authoritative for GitHub-released models |
| Other hubs: Ollama library, Kaggle Models, ModelScope | distributions, tags, usage | authoritative for their own listings |
| Official app sites, pricing pages, help and FAQ pages, app-store listings | web AI apps, free tiers, payment methods, country availability | authoritative for each app's own access and payment facts |
| Regional publishers and hubs (e.g. ModelScope for China, plus national AI labs and university releases) | non-US models, language-specific models | authoritative for their own listings; list to be built |
| Official publisher announcements and docs | release facts | evidence |
| X, Hacker News, Reddit (e.g. r/LocalLLaMA), non-English communities | early signals, local-model releases, regional releases | discovery only: creates candidates, proves nothing |

Respect each source's terms, access controls, rate limits (including HTTP 429 with backoff) and attribution. Check every connector's permitted use before building it. Don't copy model-card text wholesale: write short original descriptions and link to the source.

## 5. Pipeline

```
sources -> scheduled scan (incremental, per-source budgets)
  -> candidate extraction -> normalization
  -> identity resolution (dedupe across sources, attach distributions/variants)
  -> verification at primary source
  -> persist small metadata records (commit only on content change)
  -> static detail pages + compact search index + feed
  -> GitHub Pages deploy
```

- A Node workflow runs on a schedule in GitHub Actions, following Flattery's pattern. No backend. Nothing runs in visitors' browsers except search over prebuilt indexes.
- Credentials live only in workflow secrets, never in generated files, logs or client bundles.
- **Prefer structured data over AI.** Take fields from structured APIs (Hugging Face metadata, GitHub, provider model lists) wherever possible. AI classifies candidates, extracts what structured data lacks, and writes summaries.
- **AI accuracy is tested.** A hand-labeled set of about 50 records runs in CI and blocks changes that lower extraction accuracy.

## 6. Identity and relationships

A **model record** is one model, wherever it is distributed. It has:
- a stable internal `id` (e.g. `cf:model:<publisher>/<slug>`) that never changes once assigned,
- `aliases` and source-native IDs for deduplication,
- `distributions`: one entry per place the model is available, each with `{source, native_id, url, availability, observed_at}`, e.g. its HF repo, Ollama tag, GitHub release and API model name.

Hierarchy:
```
family
  -> release / checkpoint            (a model record)
     -> official variants (size, base, instruct)   (model records, typed relation)
     -> community conversions / quantizations      (distributions or variant records)
  -> later releases                   (model records, typed relation)
```

Relationships are typed: `variant_of`, `finetune_of`, `quantization_of`, `merge_of`, `adapter_of`, `successor_of`. Use Hugging Face's `base_model` metadata where present. Never flatten versions into one record. Never treat a quantization as a new family.

Acceptance test: no two public records share a distribution URL or a source-native ID.

## 7. Model record schema

Every record has a `schema_version`.

**Common fields:** `id`, `type` (`model`), `name`, `description` (original, short), `publisher`, `family`, `distributions`, `official_repository_url`, `documentation_urls`, `license`, `availability`, `announced_at`, `released_at`, `first_seen_at`, `last_content_change_at`, `verification_status`, `relations`, `tasks`, `modalities`, `languages`, `official` (bool), `publisher_region` (country or region of the publisher, from evidence), `formats` (e.g. safetensors, GGUF, MLX, ONNX), `local_runtimes` (e.g. llama.cpp, Ollama, MLX, LM Studio, as documented by a distribution), `local_ready` (true when at least one distribution is a downloadable local format), `popularity` (per source, each with source and `observed_at`).

**Key claims carry their own provenance.** These fields are objects, not bare values:
- `license`
- `availability`
- `parameters`
- `benchmarks` (each entry also states the evaluation conditions)
- `released_at`

```json
{ "value": "apache-2.0", "source_url": "https://…", "source_type": "official", "observed_at": "2026-11-14T10:00:00Z" }
```
`source_type` is `official`, `third_party` or `independently_verified`. Other fields rely on the record's `evidence_urls`.

**License:** an SPDX identifier when one applies, `custom` (with a link to the terms) for community or bespoke licenses, or `unknown`. Gated access terms are recorded separately from the license.

**Availability:** `announced`, `downloadable`, `gated`, `api_only`, `withdrawn`, `unknown`. Announced is never shown as available.

**Verification:** `verification_status` is
- `candidate`: seen only in an announcement or secondary source,
- `verified`: the canonical page (HF repo, official docs, provider API, GitHub release) was fetched and confirms the model exists and its availability,
- `check_failed`: the last attempt to confirm at the primary source failed, and earlier data is kept.

**Unknown values stay `null` or `unknown`. Never fill them with AI guesses.**

Example:
```json
{
  "schema_version": 1,
  "id": "cf:model:organization/model-name",
  "type": "model",
  "name": "Model Name",
  "publisher": "Organization",
  "distributions": [
    { "source": "huggingface", "native_id": "organization/model-name",
      "url": "https://huggingface.co/organization/model-name",
      "availability": "downloadable", "observed_at": "2026-11-14T10:00:00Z" }
  ],
  "tasks": ["text-generation"],
  "license": { "value": "unknown", "source_url": null, "source_type": null, "observed_at": "2026-11-14T10:00:00Z" },
  "availability": { "value": "downloadable", "source_url": "https://huggingface.co/organization/model-name", "source_type": "official", "observed_at": "2026-11-14T10:00:00Z" },
  "verification_status": "verified",
  "announced_at": null,
  "first_seen_at": "2026-11-14T10:00:00Z",
  "last_content_change_at": "2026-11-14T10:00:00Z",
  "evidence_urls": [],
  "relations": []
}
```

## 7a. Web AI app records

A **web AI app** is a service people use directly through a website or app (e.g. a chat assistant, image generator or coding tool). The model records describe the models themselves.

Fields: `id` (`cf:app:<publisher>/<slug>`), `type` (`app`), `name`, `description` (original, short), `publisher`, `publisher_region`, `url` (official site), `app_store_urls`, `categories` (chat, image, video, audio, coding, search, writing, …), `languages` (interface languages supported, from evidence), `models_used` (relations to model records, only when the publisher states them), `access` (section 7b), `verification_status`, freshness fields and `evidence_urls`.

Apps and models link both ways: a model page lists the apps that officially use it, and an app page lists its stated models.

## 7b. Access and payment

Every app record, every paid API distribution of a model, and every hosting offering has an `access` block. This is about **whether and how you can get access**. It is not a price comparison (that is phase 3). Each field carries its own source and observation time, like the key claims in section 7.

- `free`: `free` (fully free), `free_tier` (with stated limits), `trial`, `paid_only` or `unknown`. Stated limits are recorded as text with their source.
- `payment_methods`: a list from a fixed vocabulary: `card_international` (Visa/Mastercard/Amex), `card_local`, `paypal`, `crypto` (with the coins or networks listed), `mobile_money` (e.g. M-Pesa), `upi`, `pix`, `alipay`, `wechat_pay`, `bank_transfer`, `app_store_billing` (Apple/Google, which often accepts local methods and carrier billing), `prepaid_or_gift_card`, `carrier_billing`, `other` (named).
- `no_card_needed`: derived. True when a free option or at least one non-card payment method exists.
- `countries_available` / `countries_unavailable`: from the service's official supported-countries list, or `unknown`.
- `signup_requirements`: e.g. email only, phone number (and whether non-US numbers work, if stated), ID verification.
- `local_currency_pricing`: whether prices are shown or charged in local currencies, if stated.

**Rules:**
- Only payment methods the service itself (or its official app-store listing) offers. Resellers, account sellers and unofficial top-up services are not listed: they carry scam and account-ban risk.
- CleverFox reports official availability. It does not give instructions for getting around country restrictions, sanctions or terms of service (no VPN or workaround guides).
- Payment and availability facts change often. Show the observation time, and mark facts older than the refresh window as stale.

## 8. Editorial rules

- Open weights do not automatically mean open source.
- Parameter count does not establish a VRAM requirement.
- Publisher benchmarks are not independently verified performance.
- Popularity does not establish quality, safety, reliability or legality.
- No universal "best model" score. Popularity, availability, evidence and performance stay separate.
- AI output is not certification.

## 9. Freshness and storage

- **Commit only on content change.** Per-record check times (`last_checked_at`) live in a small separate status file, so routine scans don't rewrite every record.
- Each source tracks a `last_successful_check`. A successful scan overall must not imply every source refreshed. Publish a source status page and freshness warnings.
- **Records are never silently lost:** withdrawals, deletions and broken links are marked, not dropped. Unavailable models can leave normal results, but their record stays. Connector or AI failures keep last-known-good data.
- Store only small metadata, original content and site assets. Never weights, datasets, images or archives.
- Scan cadence is set per source by update frequency and cost (TBD).

## 10. Site

- A static detail page per model shows its distributions, availability, license, relations, evidence and last change and check times. No pages for filter combinations.
- A compact client-side search index is built at deploy time. Apps and models have separate filter sets. Filters suit models: source, publisher, publisher region, language, task, modality, license, availability, official/community, local-ready, format/runtime.
- Access filters for apps and API models: free, free tier, no card needed, payment method (crypto, mobile money, UPI, Pix, …) and available in my country. Static browse pages for "free", "no card needed", and each payment method with enough listings.
- Browse views for local models and for models by language and region, as static pages (one per language or region with enough models, not per filter combination).
- Model descriptions and names can be in many languages. Names prefer plain letters matching the source, as in Flattery.
- Recent-releases feed (page and RSS).
- Link to stable model or repository pages, not temporary download URLs.
- Analytics via the shared GoatCounter snippet.
- WCAG AA contrast and no sideways scrolling on phones, as in Flattery.

## 11. Guides (phase 2)

AI writes short original guides from official documentation, under the same evidence rules: every material claim links its source, and nothing is invented. Upstream docs are linked, not mirrored.

## 12. AI servers and hosting (phase 1; templates phase 2)

- **Hosting provider:** a company offering AI compute or model hosting. Global clouds, GPU clouds and **local and regional data-center operators** are all in scope, with the same gap rules as models: a provider serving a country or region with few options gets in.
- **Compute offering:** a provider VM, GPU instance or bare-metal server.
- **Managed hosting / inference endpoint:** a service that hosts models for you (dedicated or serverless endpoints, per-region).
- **Environment template:** a prepared software stack or launch configuration.
- **Deployment compatibility:** documented evidence that a specific model runs under a stated configuration.

Provider and offering fields, from official sources with source and observation time, or `unknown`:
- `provider_region` (where the company is based) and `data_centers`: a list of `{country, city_or_region, provider_region_code}` locations where each offering is actually available.
- Hardware: CPU, RAM, GPU type and count, GPU memory, storage.
- `data_residency`: stated guarantees about where data is stored and processed, and certifications or local compliance claims, with their source. These are reported claims, not verified compliance.
- `access`: the same access and payment block as apps (section 7b): free tier or credits, payment methods (crypto, local cards, bank transfer, mobile money and others), local-currency billing, signup and KYC requirements, countries served.
- Official configuration or launch URL.

Filters: data center country and region, provider region, GPU type, managed vs raw compute, payment method, no card needed. Static browse pages for "AI hosting in <country>" where enough offerings exist.

Link to official pages only. No one-click deploy claims unless verified. No provisioning, credential proxying or payment. Prefer provider APIs over scraping pages. A data center is listed for an offering only when the provider's own region list says that offering is available there.

## 13. Pricing (phase 3)

Prices are observations stored apart from identity: `resource_id`, `provider`, `billing_unit`, `currency`, `amount`, `region`, `purchase_type`, `conditions`, `source_url`, `observed_at`.
- Inference units: input/output/cached tokens, requests, images, audio duration.
- Compute units: instance-hour vs GPU-hour, GPU count, region, spot vs on-demand, minimum billing period, storage and egress.

Show the observation time beside every price, and label stale prices. Never claim "cheapest" without equivalent configurations. Survey existing comparison sites (e.g. OpenRouter, Artificial Analysis) before building.

## 14. Hosting

GitHub Pages: about 1 GB published site, 100 GB/month soft bandwidth, 10-minute deploy timeout. Recheck these before building. Pages may not be used as free hosting for commercial SaaS or e-commerce, so CleverFox stays a public informational directory. Keep the build portable so hosting can move.

Custom domain `cleverfox.sala.company`, using the same setup as the other sala.company sites (CNAME file, Pages via Actions).

## 15. Acceptance criteria (phase 1)

- No weights, datasets, images or large archives are committed or published.
- Every public record has a stable `id`, `schema_version`, `type`, at least one distribution URL, `verification_status` and freshness data.
- No two public records share a distribution URL or source-native ID.
- Every web AI app record has a working official URL, categories and an `access` block whose fields come from official sources or are `unknown`. No reseller or workaround payment routes are listed.
- Every hosting offering lists its data centers (country, and city or region) from the provider's own region list, plus an `access` block. Data-residency statements are labeled as provider claims.
- Every record has `languages`, `publisher_region`, `formats` and `local_ready` filled from evidence or set to `unknown`.
- Key claims (license, availability, parameters, benchmarks, release date) carry their own source, type and observation time.
- Unknown values are `null` or `unknown`. The labeled test set passes at or above its baseline.
- Announced, candidate and verified are visibly distinct on the page.
- A connector failure keeps last-known-good data and shows a freshness warning. Routine scans with no changes create no record commits.
- Search and filters work as static files with no credentials exposed.
- The site deploys to GitHub Pages at `cleverfox.sala.company`.

## 16. Positioning

One place to find any AI model, web AI app or AI hosting option, famous or obscure, open or API-only, from anywhere in the world, across every hub it's on, including servers in local data centers, and to see how you can actually get access to it: free, with crypto, with local payment methods, or without a bank card. It gives special attention to models you can run locally and models for languages and regions outside the US, with sources, license and availability backed by evidence.

## 17. Open decisions

- UI framework/static generator and search library.
- Inclusion thresholds per source, and the tracked publisher list.
- Scan cadence and refresh tiers per source.
- AI models for extraction, and spending caps.
- Each connector's permitted use (terms for Hugging Face, Ollama, Kaggle, ModelScope and provider docs).
- Coverage target (how soon after release).
- Exact gap rules that let obscure, regional and low-resource-language models in.
- List of regional hubs, labs and communities to watch.
- Whether the site interface itself is translated (e.g. Arabic with right-to-left layout), or only the catalog is multilingual.
- When to bring hardware fit back into scope.
- Refresh window for payment and availability facts, and how to detect changes.
- Seed list of local and regional data-center and GPU providers by country, and their inclusion rules.
- Whether to add a "how to pay" guide per payment method (official routes only).
- Operating budget and migration thresholds.
