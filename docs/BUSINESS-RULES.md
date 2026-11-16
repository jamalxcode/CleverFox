# CleverFox: business rules

Every rule the code applies, in one place. Keep this file in sync with the code: when a rule or number changes in `tools/import.mjs`, `tools/build.mjs`, `tools/benchmarks.mjs` or `render.js`, update it here in the same commit. Why each rule exists is in [DECISIONS.md](DECISIONS.md); the product design is in [SPECIFICATION.md](SPECIFICATION.md).

Last updated: 14 November 2026.

## 1. What CleverFox is (and isn't)

- A **metadata directory** of AI models, datasets, web AI apps and AI hosting, with access information built in. It links to official sources.
- It **never** hosts model, dataset or image files, runs AI, provisions servers, takes payments, or holds credentials.
- It takes **no reports from people**. Feedback comes from public posts (mainly X), linked to their source (planned, see section 10).
- It stays a **public informational directory**: no accounts, checkout or subscriptions while on GitHub Pages.

## 2. Facts and evidence

- **Never invent a fact.** Anything no source states is `unknown` and shown as "unknown". AI output is never treated as certification.
- **Key facts carry their source:** license, availability, parameters, release date, first-published date, languages, publisher country, benchmarks, and every access fact. Each has a source URL, a source type (`official`, `third_party`, `independently_verified`, `web_reported`) and the date it was checked. The page shows them as a small ⓘ link.
- **Public reports never override official facts.**
- **Descriptions are short templates** built from the source's own fields (e.g. "Text-generation model published by Qwen on Hugging Face"), never copied text.
- **Editorial rules:**
  - open weights are not open source;
  - parameter count is not a memory requirement;
  - publisher benchmarks are labeled as self-reported;
  - popularity is not quality;
  - dataset access is not a reuse license;
  - there is no universal "best model" score.

## 3. Listing types and identity

- Types: `model`, `dataset`, `app`, `host`. IDs are stable and never reassigned: `cf:model:<publisher>/<name>`, `cf:dataset:…`, `cf:app:…`, `cf:host:<provider>`.
- **One record per model across all sources:** a model's Hugging Face repo, Ollama tags and API are distributions of one record. No two public records may share a distribution URL or native ID (enforced by the build).
- **Quantized copies are not separate models.** They're skipped, except abliterated or uncensored packages (section 4).
- **Relations:** `variant_of`, `uncensored_variant_of`, `finetune_of`, `quantization_of`, `merge_of`, `adapter_of`, `successor_of`, from Hugging Face's `base_model` tags.
- **Hand-researched seed records win:** the importer skips anything a seed record covers. Seed research notes are never published.
- **Records are never silently lost:** withdrawn or broken listings are marked, not dropped (planned for the pipeline). Imports keep last-known-good data (section 9).

## 4. What gets listed (inclusion rules)

**Curation at build time** (`curate()` in `tools/build.mjs`; nothing is silently lost: `catalog.json` lists every grouped and hidden listing, and their old pages say where they went):
- **Corrections file** `data/corrections.json`: `hide` (removed, with a reason), `merge` (listed as another version of another listing), `keep` (a dataset listed despite the quality bar). Every entry needs a reason.
- **Dataset quality bar:** an imported dataset needs at least two of: a known license, a task, a size category, a paper, a language, its own summary (not the placeholder "Dataset published by … on Hugging Face."). Datasets with 100+ likes pass anyway. The importer applies the same bar and fetches the top 250 by downloads and 100 by likes, so real datasets fill the slots.
- **Re-uploads grouped under their original:** an imported model whose name is a listed model's name plus only format tags (FP8, BF16, GGUF, AWQ, GPTQ, EXL2, MLX, ONNX, OpenVINO, 4bit, Q4_K_M…), or that declares `quantization_of` a listed model, becomes one of that model's "other versions" (🔁 on the card) instead of its own listing. Fine-tunes, adapters and uncensored versions stay their own listings.

All numbers are provisional, in `tools/import.mjs`.

**Hugging Face models**, across 15 tasks (text generation, vision-language, text-to-image, speech recognition, text-to-speech, embeddings, sentence similarity, translation, image-to-text, text-to-video, image-to-image, audio-language, any-to-any, summarization, text classification):
- the most downloaded (≈250), most liked (≈120) and trending (≈120), spread across those tasks;
- **gap rule:** up to 10 models per language for 42 non-English languages (Arabic, Persian, Urdu, Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Swahili, Yoruba, Hausa, Igbo, Amharic, Zulu, Xhosa, Somali, Indonesian, Malay, Tagalog, Vietnamese, Thai, Burmese, Khmer, Turkish, Kazakh, Uzbek, Hebrew, Nepali, Sinhala, Portuguese, Spanish, French, Russian, Ukrainian, Polish, Japanese, Korean, Chinese), each with at least **200 downloads**;
- **uncensored rule:** up to 30 per search term ("abliterated", "uncensored", "heretic"), each with at least **500 downloads**, GGUF packages included.

**Hugging Face datasets:** the most downloaded (150) and most liked (80), plus up to 6 per gap language with at least 200 downloads. Hugging Face's own documentation-asset repos are excluded.

**Ollama library:** every family. Each is matched in this order:
1. Name plus size against imported Hugging Face models (e.g. `qwen3:14b` → `Qwen/Qwen3-14B`).
2. Otherwise, the family's original Hugging Face repo, matched by name word by word, so `gemma` doesn't match `gemma-3` and `llama3` doesn't match `llama-3.1`. Known re-packagers (bartowski, unsloth, TheBloke, lmstudio-community, mlx-community and similar) are excluded.
3. Otherwise, the publisher with at least 2 own repos named after the family, followed by a size or a variant word (instruct, mini, vision…).
4. Otherwise, listed on its own as "Listed by Ollama".

**Web AI apps and hosting providers:** hand-researched seed records for now.

**Publisher countries:** only organisations in `data/publisher-map.json` (never individuals), looked up on Wikidata by the "Publishers" workflow and reviewed before use.

## 5. Answers shown for every listing

Computed in `tools/build.mjs` (`answers`), from stated data only.

- **🎯 Good for** (chat, writing, coding, reasoning, math, analytics, images, vision, speech, video, translation, search, tools & agents) comes from the source's task, tags and capability labels (e.g. Ollama's "tools, thinking, vision"), and from the name only for clear words such as "coder" or "math". For apps it comes from their categories.
- **💻 Runs locally:** at least one downloadable local format or runtime: GGUF, MLX, ONNX, TFLite, or an Ollama tag.
- **🆓 Free:**
  - "free download" for any downloadable or gated open model or dataset;
  - otherwise free, free tier or trial from the access facts;
  - otherwise "paid" or "unknown".
- **Gate:** from Hugging Face. `none` → 🚪 "No sign-in needed"; `auto` → 🔒 "Log in and accept terms"; `manual` → 🔒 "Needs approval".
- **📜 License kind:**
  - **open:** permissive or copyleft, namely MIT, Apache-2.0, BSD, CC-BY-4.0, CC0, Unlicense, OpenRAIL, CC-BY-SA-4.0, ODC-BY, GPL-3.0, LGPL-3.0, AGPL-3.0, MPL-2.0.
  - **non-commercial:** the license name contains "nc", "non-commercial" or "research".
  - **restricted:** any other custom license (e.g. the Llama or Gemma terms).
- **"✓ commercial"** shows next to the license when the license kind is open; **"✗ commercial"** when it's non-commercial. The highlights line "Permissive license: free for commercial use" uses a stricter list: MIT, Apache-2.0, BSD, CC-BY-4.0, CC0, OpenRAIL and Unlicense.
- **🚧 Barriers**, each listed when it applies:
  - log in and accept terms;
  - needs approval;
  - license forbids commercial use;
  - custom license with conditions;
  - API only;
  - paid only;
  - paying needs a card;
  - sign-up needs phone or ID verification;
  - not available in N countries.
- **🕊️ No barriers:**
  - **models and datasets:** downloadable, no gate, and an open license;
  - **apps:** free or free tier, with no known barriers;
  - this is an access summary, not a quality score.
- **✂️ Uncensored / abliterated:** the name or tags contain abliterat-, uncensored, heretic, unfiltered, unaligned or decensored.
- **💳 Pay without a card:** at least one payment method that isn't an international or local card. A separate derived field, `no_card_needed`, is true when there's a free option or a non-card method.

## 6. Hardware advice

In `tools/build.mjs` (`hardware`) and `render.js`. All values are labeled as rough estimates, never as publisher requirements.

- **Memory needed per size:**
  - from the download size: download × 1.2 + 0.5 GB, rounded up to the next 0.5 GB;
  - from the parameter count when there's no download size: 4-bit ≈ 0.6 GB per billion parameters + 0.5 GB, and 16-bit ≈ 2 GB per billion + 1 GB.
- **Recommended memory:** the smallest standard size (4, 8, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512, 768, 1024 GB) that is at least the need × 1.25.
- **Fit against "Your device":**
  - ✓ fits when the need is at most 80% of the device's memory;
  - ⚠ tight when it's between 80% and 100%;
  - ✗ too big when it's over.
  - The "Fits my device" filter uses the smallest size.
- **Device classes** (by recommended memory):
  - up to 4 GB: 📱 phone / Pi;
  - 8 GB: 💻 laptop;
  - 16 GB: 💻 laptop / Mac;
  - 24 GB: 🎮 GPU / 32 GB Mac;
  - 48 GB: 🖥️ GPU / 64 GB Mac;
  - 96 GB: 🖥️ 128 GB Mac / multi-GPU;
  - more: 🏢 server GPUs.
- **Processor advice** (same for all models):
  - a CPU works, slowly;
  - a GPU is fast if the model fits;
  - on a Mac, shared memory counts;
  - mixture-of-experts models (name has "A<n>B" or tag `moe`) run faster than their size suggests.

## 7. Where it runs

From each runtime's documented platform support (`RUNTIMES` in `tools/build.mjs`, each linked to its docs):

| Runtime | 🪟 Windows | 🍎 macOS | 🐧 Linux | 📱 Phone |
|---|---|---|---|---|
| Ollama, llama.cpp (GGUF), Transformers (safetensors/PyTorch) | ✓ | ✓ | ✓ | |
| ONNX Runtime | ✓ | ✓ | ✓ | ✓ |
| MLX | | ✓ (Apple Silicon) | | |
| Core ML (name contains "coreml") | | ✓ | | ✓ |
| TensorFlow Lite | | | | ✓ |

☁️ **Cloud** applies in these cases:
- any downloadable model (it can run on a rented server);
- any model with an API or aggregator distribution;
- every web app (runs in the provider's cloud).

"Runs on" means the software exists for that system. Whether a given machine is big enough is the hardware rule (section 6).

## 8. How smart is it (benchmarks)

`tools/benchmarks.mjs`, matched to listings in `tools/build.mjs`.

- **Epoch AI** (CC BY 4.0, credited wherever shown):
  - the Epoch Capabilities Index, plus Epoch's own runs of GPQA Diamond, SWE-bench Verified, MATH Level 5, AIME (mock), FrontierMath and SimpleQA;
  - the best score across Epoch's runs of each model is kept;
  - results Epoch collected from other leaderboards keep their own licenses and are not used.
- **Artificial Analysis** (free API, attribution required): Intelligence, Coding and Math indices, only when the `AA_API_KEY` secret is set.
- **Matching:**
  - names are compared lowercase with punctuation removed, also trying the name without an instruct/it/chat/hf suffix, and the Hugging Face or API model name;
  - an uncertain match shows nothing.
- **Self-reported** results from a model card's `model-index` (up to 6) are shown separately, labeled "self-reported".
- **Links, not scores:**
  - LMArena, for chat models (its data license is unclear);
  - MTEB, for embedding models (it publishes raw results only, and an average we computed would be unofficial).
- Each source is shown separately. No combined score.

## 9. Data, freshness and safety

- **Access re-check** (`tools/recheck.mjs`, daily after the import): for every app, host and API distribution, the source pages of its access facts (free, payments, countries, sign-up, local pricing), up to 6 per listing, are fetched and their visible text fingerprinted (scripts, tags, long tokens and clock times removed; pages under 400 characters, usually bot walls, are ignored). Results in `data/imported/recheck.json`.
  - **Changed:** a page whose fingerprint changed after the facts citing it were observed gives "⚠️ Pricing page changed" on the card and a note naming the page. Facts are never changed automatically.
  - **Broken:** a source page answering 404 or 410 on 2 checks in a row shows "Source link not loading". Bot walls (401, 403, 429) and network errors never count.
  - **Fact check:** each readable source page is searched for the words of each stated payment method and for "free" (lists in `TERMS` in `tools/recheck.mjs`, many languages; short words match whole words only; "other" can't be checked). Each fact is confirmed, partly confirmed or not found; the listing shows what was found and what wasn't.
  - **No automatic verification:** the page check only reports "found on the source page" or "not found". `verified` is set only by a verification review (decision 67): the listing's official pages are fetched (`tools/fetch-pages.mjs`, in GitHub Actions), every stated fact is compared with them, each confirmation or correction carries an exact quote from the page, and `tools/apply-verification.mjs` rejects a listing if any quote isn't on its page. Pages fetched: homepage, official and documentation links, every fact's source, store listings, and `/pricing`, `/plans`, `/faq`, `/terms`, up to 18 per listing. Pages that answer 200 with under 800 characters are rendered in a headless browser that identifies itself as CleverFox; refusals (401, 403, 429) are never retried by other means. Each page has a hard stop at 45 seconds; the run stops starting pages after 33 minutes, and saves and exits at 38 (decision 69). Verified needs every stated fact confirmed or corrected; facts the pages don't state stay unknown. Listings show "Verified (official pages read, <date>)". Common words (card, wire, wave…) can match by accident, so a match is evidence, not proof.
  - **Old facts:** access facts first observed over 180 days ago show "⏳ Access facts are old".

- **Daily import** (GitHub Actions, 03:41 UTC) imports, gathers benchmarks, builds and deploys. A push to `main` builds and deploys without importing.
- **Last-known-good:** if a source fails, or returns fewer than 80% of last time's records, the previous file is kept. This applies to models, datasets and benchmarks.
- **Storage:**
  - imports live on the `data` branch as a single commit, overwritten each time, so daily changes don't grow history;
  - generated files (`data/*.json`, `l/`, `sitemap.xml`) are built at deploy time and not committed;
  - dated snapshots are kept in `data/snapshots/`.
- **Commit only on content change:** `first_seen_at` is kept across runs, and `last_content_change_at` moves only when a record's content changes. Popularity and dates are ignored for that comparison.
- **Published only:** the page, the listing pages, the catalog data and images. Seed research notes and `img/source/` are never deployed.
- **Respect the sources:** rate limits with backoff on HTTP 429, honest User-Agent strings, attribution where required. Secrets live only in workflow secrets.

## 10. Access and payment (apps, APIs, hosting)

- **One access block per listing** (global, not per country):
  - free status, with any limits;
  - payment methods from a fixed vocabulary: international card, local card, PayPal, crypto, mobile money, UPI, Pix, Alipay, WeChat Pay, bank transfer, app-store billing, official prepaid or gift card, phone bill, other;
  - countries available or unavailable;
  - sign-up requirements;
  - local-currency pricing.
- **Country limits go in the method's note**, shown with `*` and on hover (e.g. "India only").
- **What counts as paying without a card:** a payment processor (Stripe and the like), a cloud marketplace billed to an existing cloud account, or a wallet funded by a card (Google Pay, Apple Pay) is not a non-card method on its own. Methods that apply only to another version of a product (a China-only edition) aren't listed on the global listing. App-store listings written by the publisher count as `official` sources.
- **Only official payment routes**, plus clearly labeled authorized API aggregators:
  - no account resellers, gray-market top-ups, or guides to getting around country restrictions or sanctions.
- **Public feedback (planned, X first):**
  - becomes `web_reported` claims linked to the posts;
  - shown once several independent accounts report the same thing, or one authoritative source does;
  - stale after 30 days.
- **Warnings (planned):**
  - ⚠️ `reported`: credible public reports of a scam or safety problem;
  - ☠️ `dont_touch`: strong evidence such as a security advisory;
  - flagged listings stay visible with the warning.

## 10l. Guides and the weekly X post

- **Guides** (`guides/`, written by the build from the live catalog, in the sitemap): pay without a card; pay with mobile money (with Google Play's mobile-money and phone-bill countries); free AI apps; AI on an 8 GB laptop; AI on a 16 GB laptop or Mac; offline AI on your phone; AI in African languages; AI in Arabic; strong models online for free; GPU hosting near you. Up to 30 listings each, each with the fact it was picked for. Listings with warnings or possibly discontinued are left out; uncensored models are left out of the laptop guides.
- **Weekly X post** (`tools/xpost.mjs`): on Mondays' scheduled run, if the `X_POST_ENABLED` variable is `true` and the posting keys are set (`X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET`), one post: counts of listings new this week by type, up to 3 names (apps and hosts first, then most popular), and a link to "new this week"; within 280 characters. At most once every 6 days. Off by default.

## 10k. Paying through Google Play

- `data/store-payments.json`: the payment methods Google Play accepts in each of 72 countries, from Google Play Help (official, read 2026-11-15, one source link per country). Countries not listed take cards only. E-wallets are `other` with the brand in the note; only operator wallets (Airtel Money, MTN MoMo, Vodafone Cash) are `mobile_money`. Methods Google says are ending are left out.
- **Sold through Google Play:** an app with a Google Play link and paid plans (store billing, a free tier, a trial or paid only).
- A country missing from the table is **unknown**, not cards only (cards-only countries are stored as such).
- With a country chosen, such an app shows "🛒 If you subscribe in the Android app, Google Play in <country> accepts: …" and, when the app has no non-card method of its own, the badge "🪙 Via Google Play: <methods>". It counts as payable without a card in highlighting and picks (+1.5). Without a country, a summary with examples links to Google's page.
- The App Store table isn't included: Apple's page couldn't be read directly, and search summaries aren't good enough (decision 64).

## 10j. Gaps, discontinued listings, glossary

- **What people can't find:** a search with no results (after 2 seconds of no typing) and an empty picks column are counted as GoatCounter events (`search-empty/<tab>/<filters in use>`, `picks-empty/<column>/<task>/<device>/<country>/<language>`). The tab, filters and choices only: never the words typed, nothing about the person. These show which data to research next.
- **Possibly discontinued:** an app whose App Store listing was confirmed before and is missing on 2 checks in a row, or an app or provider whose homepage answers 404/410 on 2 checks, shows "⚠️ Possibly discontinued" with the reason, and is left out of picks. It isn't removed.
- **Glossary** (`glossary/`): plain explanations of model, local, memory, 4-bit, parameters, tokens, API, GGUF, Ollama, open weights and licenses, benchmarks, free tiers, paying without a card, uncensored, verified. The "Use it online" line links to "what's a token?".

## 10i. Your language

- **App languages from the App Store:** a confirmed App Store listing's languages fill an app's `interface_languages` when it's unknown (source: Apple's lookup, official).
- **"Your language" picker** (kept in the browser as `ulang`): the languages handled by at least 3 models or apps (two-letter codes), plus Swahili, Yoruba, Hausa, Amharic, Zulu, Igbo, Somali and Kinyarwanda always. Matching cards show "🗣️ <language>"; picks add +3 and the reason "🗣️ <language>" (models: languages handled; apps: interface languages).

## 10h. Interface languages (`i18n.js`)

- The main page interface (header, pickers, tagline, tabs, search, "Find what to use" and its columns) comes in English, Arabic (right to left), Hindi, Portuguese, Indonesian and Swahili. The language follows the browser's language unless the visitor picks one (kept in the browser as `lang`).
- Listing details, reasons and filters stay in English for now, and non-English pages say so. The translations are drafts for review by native speakers.

## 10g. Prices, new this week, compare

- **Local prices:** apps and hosts whose official pages price in local currency show "💱 Local prices" (and it counts +0.5 in app picks). Price amounts go in `access.prices` as separate observations: plan, amount, 3-letter currency, period (month, year, once, hour, million_tokens, credit_pack), optional country, and source URL, source type and time each. The validator rejects incomplete ones. None are filled in yet; they need research. "Cheapest" is never claimed.
- **New this week** (`new/`, written by the build): listings first seen in the last 7 days, by type, up to 100 per type. The catalog's first day (the initial import) doesn't count as new. **RSS** (`feed.xml`): the 50 most recent new listings.
- **Compare:** up to 3 listings of the same type, from "⚖️ Compare" on an opened card: publisher, good for, free, runs locally, memory, use online, independent benchmark, license, availability in the visitor's country, pay without a card, offline on a phone, praised on X. The choice is kept in the link (`#compare=<id>|<id>`).

## 10f. Find what to use (top picks, `picks.js`)

"I want to <task> on <my computer | my phone | the web>", with memory and country from the pickers. Up to 3 picks per column, at most one per model family; every pick shows its reasons. Uncensored models and listings with a warning are never picked. **Only listings that claim the task count for it** (no "general chat model counts for coding"). **Apps and hosts must be verified** (official page read); candidates stay off picks and guides. **Praise on X isn't part of the ordering** until its word rules are tested against hand-labelled posts. The page shows the ordering in plain words ("How picks are ordered", `ORDERING` in `picks.js`).
- **💻 Run it yourself** (computer): local models that claim the task and fit: a memory figure from the download size must need at most 80% of the visitor's memory, a rough estimate from the parameter count at most 50% (8 GB assumed if none chosen). Score: independent benchmark (ECI or AA index above 100, ×1.5 per 8 points), log of downloads and pulls, +2 × share of memory used (not for rough estimates), +3 your language.
- **📱 Offline on your phone** (phone): verified on-device apps that claim the task. Score: free +3, free tier +2, open source +0.5.
- **📲 Apps**: verified apps that claim the task and aren't unavailable in the visitor's country (on phone: with a store link or on-device). Score: available there +3, made there +2, free +2.5, free tier +2, pay without a card (own or through Google Play) +1.5, local prices +0.5, App Store rating ÷ 2.5, on-device on phone +1.5, log of App Store ratings × 0.3, your language +3.
- **☁️ Use it online**: models that claim the task with API providers. Score: benchmark as above, log of popularity × 0.6, free online +2, a provider that takes payment without a card +1.5, providers (up to 6) × 0.3, your language +3.
- Model picks without an independent benchmark say "📊 no independent score yet", so popularity isn't read as quality.
- **Memory estimates:** a figure from the parameter count only is a rough estimate: the card says "≈ May fit your N GB (estimate)" instead of "✓ Fits", and "recommended" shows "≈ … (estimate)".
- **Sharing:** the choice is kept in the link (`#start=<task>,<device>,<memory>,<country>`); opening it shows the same picks.

## 10e. App Store check (`tools/appstore.mjs`)

- **Candidates:** researched store ids in `data/app-stores.json` and apps.apple.com links in seed records.
- **Confirmation:** an Apple id is used only after Apple's lookup API shows a seller sharing a meaningful word with the researched seller or the publisher (generic words like "AI", "Technology", "Inc" don't count). Rejected and missing ids are never shown. A confirmed link replaces unconfirmed Apple links.
- **Countries:** confirmed apps are looked up in 50 App Store countries a day (rotating; about 175 storefronts, so a full pass takes about 4 days). Being in a country's App Store counts as official availability there ("yes"); being absent doesn't count as unavailable, because the web version may work.
- **Look-alikes:** 10 brands a day, App Store search in the US store: apps whose name contains the brand (first word of the app name, 4+ letters) and also an AI word (AI, chat, chatbot, GPT, bot, assistant, LLM, copilot, agent), and whose seller doesn't match, are counted. Card badge "⚠️ N look-alike apps", and a note naming the official seller. They aren't called scams.
- **Official mark:** "✅ Official app by <seller>" with the App Store rating.
- **Google Play** packages from research are shown as buttons, but aren't confirmed by an API (Google has no public one).

## 10d. Offline on your phone

- Apps with `on_device: true` run AI models on the phone itself and work offline once a model is downloaded. Badge "📱 Offline on your phone"; filter on the Apps tab. First set (10): PocketPal AI, Google AI Edge Gallery, Off Grid, MNN Chat, SmolChat, RTranslator, Layla, Private LLM, Enclave, Locally AI. Open-source ones were verified from their official READMEs; the others are candidates.

## 10c. How to start

- **Local models:** the `ollama run <tag>` command for each Ollama size (up to 4, MLX copies skipped), each with its memory need and a copy button. With the visitor's memory chosen, the biggest size needing at most 80% of it is marked "best fit"; otherwise the smallest is. A Hugging Face model with GGUF files and no Ollama entry gets `ollama run hf.co/<id>`. Point-and-click alternatives: LM Studio and Jan, searching for the Hugging Face id.
- **Apps:** buttons to open it on the web and its official store pages (App Store, Google Play, Microsoft Store) where known.

## 10m. Discovery beyond X (`tools/discover.mjs`, every scan)

- **Hugging Face new releases:** models created in the last 14 days that are in the top 300 trending, or among the 1,000 newest with 10+ likes (supported tasks only); datasets created in the last 14 days among the top 200 trending with 10+ likes. They're filled in from Hugging Face like X announcements, marked "🆕 new on Hugging Face".
- **llm-releases.com:** robots.txt is checked first, and the site is skipped if it disallows crawling. The home page and up to 25 of the site's own release pages are read, one at a time, half a second apart, only where robots.txt allows. Hugging Face models and datasets linked there (or named in embedded data) are filled in, marked "listed on llm-releases.com". Up to 20 outside links show as announcements on New this week; generic labels like "open" are replaced by the link's site and path. The first working run (16 November) found 84 models.
- **GitHub new projects:** 4 repository searches (LLM topic with 10+ stars, "dataset" with 5+, "inference" with 10+, AI-agents topic with 10+), created in the last 14 days and not archived. Remembered by repository id for 30 days, so each appears once. Shown as "🧪 New projects on GitHub", not reviewed: a new repository isn't a usable release, and stars are interest, not quality.
- **GitHub releases:** the latest release of each project in `data/github-watch.json` (local-AI tools such as Ollama, llama.cpp, vLLM, MLX, Jan) and every GitHub project linked from a seed listing. Releases from the last 7 days are shown as "📦 Releases"; kept for 30 days.
- **YouTube, official channels:** AI makers' channels listed in `data/youtube-channels.json` (by @handle). With `YOUTUBE_API_KEY`, each channel's uploads list is read through the Data API (1 quota unit a channel); without a key, its RSS feed. On 16 November the feeds answered 404 for 7 of 8 channels, so the key is the reliable route. A channel's id is taken only from its own page's canonical link (robots.txt respected), then cached; a handle that can't be confirmed is skipped and logged. Videos from the last 14 days are kept; Hugging Face models and datasets linked in their descriptions are filled in (marked "in a <channel> video"). New videos from the last 7 days show as "▶️ On YouTube" on New this week.
- **YouTube search** (only with the `YOUTUBE_API_KEY` secret): 4 searches a scan ("new AI model release", "open source LLM released", "new AI app launch", "GPU cloud launch"), videos from the last 3 days. That's 400 of the free 10,000 daily quota units. Shown as "🔎 Spotted on YouTube (not reviewed)", never added to the catalog automatically.
- Each source keeps its last data when it fails.

## 10b. Use it online (`tools/providers.mjs`)

- Daily, after benchmarks. Sources: Hugging Face's Inference Providers mapping (`/api/models?inference_provider=all`, live providers only) and OpenRouter's public model list (models with a Hugging Face id). Kept in `data/imported/providers.json`; a failed or shrunken source (below 80%) keeps the last data.
- Matched to models by their Hugging Face id. Each provider shows its price per million tokens (input / output) as the source states it, "free" for OpenRouter's free variants, or "price on site" when none is given.
- Order: free first, then cheapest output price; unknown prices last. Up to 5 shown, the rest counted.
- When the provider is one of our host listings, a link goes to its payment facts, with 🪙 if it accepts a way to pay without a card.
- Card badge: "☁️ Free online", "☁️ Online from $X/M" (cheapest output price) or "☁️ Use online". Filter: "☁️ Use it online".

## 10a. X monitoring (`tools/x.mjs`)

- **Read once, shared by everyone:** visitors never cause X reads. The daily run reads X, saves the results on the `data` branch, and every visitor sees that saved copy. Embedded posts load from X's own servers at no cost to us.
- **No double spending:** each calendar day has one share of the monthly budget (remaining ÷ days left, fixed at the day's first run); another run the same day spends only what's left of it. The announcement search runs at most once a day, and a listing read in the last 24 hours isn't read again.
- Runs daily before the import, only if `X_BEARER_TOKEN` is set. Budget: `X_MONTHLY_READS` (default 10,000) per calendar month; each day spends at most remaining ÷ days left.
- **Three scans a day** (started by cron-job.org at 03:41, 11:41 and 19:41 UTC; GitHub's schedule at 05:07, 13:07 and 21:07 is a backup): up to 3 announcement scans per UTC day, at least 5 hours apart. A run that isn't a scan slot reads nothing from X. Each scan gets what's left of today's share divided by the scans still to come (at least 40 reads, never more than what's left), at most a third of it for announcements.
- **Announcements, two searches per scan:**
  - **hub posts** (60% of the announcement reads): `(url:"huggingface.co" OR url:"ollama.com/library") -is:retweet -is:reply`, for new models and datasets;
  - **launch posts** (40%): launch words in several languages (introducing, launching, now available, lanzamos, lançamos, kami meluncurkan, نطلق…) with "AI app", "AI assistant", "AI chatbot", "GPU cloud", "inference API", "GPU servers" or "AI model API", with a link. A launch is kept when it links to a site of its own (not X, YouTube, GitHub, other social sites or the hubs) and has 25+ likes.
  - Up to 300 announcements kept, for 30 days.
- **Filling in the rest:**
  - models and datasets announced with 25+ likes are fetched from Hugging Face (details, README, hardware, capabilities) in every run: the quick scans use `import.mjs --x-only`, which only adds; the full refresh includes them too;
  - announced datasets skip the quality bar, since the engagement vouches for them;
  - app and hosting launches are listed on "New this week" under "Spotted on X" (unless their site is already listed) until they're researched, because access facts can't be read from a post.
- **New models from X:** a Hugging Face model linked by an announcement with 25+ likes is imported even below the download floor, if it has a supported task and isn't a quantizer re-upload. Marked `discovered_via` (🆕 spotted on X).
- **Per listing:** up to 10 posts per listing, listings in a rotating order (seed first, then by popularity), resuming where the last run stopped. Query: the quoted full name, OR its **short name**, OR the Hugging Face address; generic names need extra context or are skipped. No retweets.
- **Short name** (models and datasets): the name cut at its first size or variant tag (7B, A3B, 16E, Instruct, IT, Chat, Base, Preview, FP8, a 4-digit date…), versions kept: "Llama 4 Scout 17B-16E Instruct" → "Llama 4 Scout". Only if everything cut is such a tag, the listing isn't a derivative (abliterated, GGUF and other re-uploads, fine-tunes, merges, or a relation other than `variant_of`), and the result isn't a bare brand (one word needs a digit, like "Qwen3.8"). Listings sharing a short name (sizes of one family) share family buzz.
- **Retry:** listings whose last search found nothing with an older query are searched again first.
- **Tone:** positive if it has a praise word and no negation just before; critical if it has a criticism word; otherwise general. Emoji alone never set the tone. Latin-script words match whole words only; single CJK characters aren't used ("牛" alone isn't praise; "牛逼" is). Multilingual lists in `tools/x.mjs`.
- **Praised on X:** 5+ positive posts, from 4+ accounts, with 200+ likes between them. Shown as a badge and filter; not used in picks.
- **Query safety:** quotes, brackets, operators (OR, AND, NOT, leading minus) and search symbols are stripped from listing names before they go into a query.
- **Failed scans:** a scan slot counts only when an announcement search actually answered; a rate limit or error leaves it open for the next run.
- **Kept:** post URL, author handle, likes, reposts, date, language and tone; never the text. Top 3 per group (most liked, positive, critical, general). Buzz older than 30 days is dropped. On failure the last data is kept.

## 11. The site

- **YouTube on listings:** every listing has a "▶️ Videos on YouTube" button next to "Reactions on X": a live YouTube search for its name (with "AI", "GPU" for hosts or "dataset"), newest first, using no API quota. Videos CleverFox already collected (official channels first, then keyword search) whose titles name the listing show under "▶️ On YouTube", up to 3. Matching uses the full name or short name for models (5+ characters with a digit or space), and the name for apps and hosts.
- **Look (decision 72):** dark "Matrix" by default (the browser's light/dark preference doesn't choose it); light "terminal paper" from the footer button, kept in the browser as `look: light` (the previous design's `theme` setting is ignored, so everyone starts on Matrix). Digital rain behind the header, decorative only: paused when the tab is hidden, off for reduced motion and in light mode. The page check tests contrast in both looks.

- **List records:** apps and hosts keep their whole record in the list (sources, payment notes, prices, App Store countries); only internal notes and the evidence list are left out (`tools/slim.mjs`). Every card loads its full record (`record.json`) when opened. Models keep the slim list.
- **Verified first:** apps and hosts that aren't verified show "⚠️ Not yet verified: facts from search results" as their first badge, with a dashed card border.
- **Freshness line** in the footer: when each source last refreshed (Hugging Face models and datasets, Ollama, X, API providers, benchmarks, App Store check, re-check), flagged ⚠️ when older than 48 hours (X: 24, benchmarks and App Store: 72) or never.
- **X embeds** on listing pages load only when the visitor clicks "Show the posts".
- **Links:** every link that becomes an href (official, documentation, evidence, paper, store, distribution URLs and `url`) must be http(s); the validator rejects anything else.
- **Before every deploy:** `npm test` (including `tools/test-slim.mjs`, which reads a slim app back as the browser does) and `tools/ui-check.cjs` (no sideways scrolling at 320 and 375 px, axe colour contrast in light and dark, on 8 pages). A failure stops the deploy.

- **Page weight:** list files are slim (claim values without sources, a popularity total, hardware minimum and recommendation only, platform names, headline benchmarks, up to 3 distributions). Full records are fetched per listing when a card opens. Models list: about 0.9 MB raw, about 70 KB compressed (was 3.1 MB).

- **Built around the questions people ask:**
  - good for;
  - runs locally;
  - free;
  - payments;
  - where it runs;
  - hardware;
  - how smart;
  - highlights;
  - uncensored;
  - gatekeeping;
  - no barriers.
- **Details layout:** emoji-led lines with several related facts each. Sources sit behind ⓘ, and unknown fields are gathered into one "❓ Unknown:" line.
- **Highlighting what suits you:** with a device memory and/or country chosen, listings that suit are sorted first and marked ⭐ with a green outline. A hint under the pickers explains this.
  - **Models:** the smallest size fits (needs at most 80% of the chosen memory).
  - **Apps, hosting and paid APIs:** available in the chosen country (a hosting data center there counts), and free, free tier, or payable without a card.
  - Unknown availability isn't highlighted, and listings that don't suit (too big, or not offered there) go last.
- **Choices remembered in the browser:**
  - a country picker, which filters availability;
  - a device memory picker, which drives the fit marks.
- **Every listing has its own page** at `l/<type>/<publisher>/<name>/`, with link-preview tags, a share row (copy, share menu, X, WhatsApp) and a live X search for reactions. `sitemap.xml` lists every page.
- **No pages for filter combinations.** Each tab loads only its own data, 50 listings at a time, and details are built when a card opens.
- **Phones:** no sideways scrolling on four phone sizes (`tools/phone-check.cjs`). Light and dark themes.
- **Brand:** the fox mascot. 🕊️ for no barriers, 🚪 for no sign-in, 🔒 only for real gates.
- **Licenses:** code is MIT, catalog data is CC BY 4.0. GoatCounter analytics through the shared sala.company snippet.
