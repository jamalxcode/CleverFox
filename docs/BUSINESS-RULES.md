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

## 11. The site

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
- **Choices remembered in the browser:**
  - a country picker, which filters availability;
  - a device memory picker, which drives the fit marks.
- **Every listing has its own page** at `l/<type>/<publisher>/<name>/`, with link-preview tags, a share row (copy, share menu, X, WhatsApp) and a live X search for reactions. `sitemap.xml` lists every page.
- **No pages for filter combinations.** Each tab loads only its own data, 50 listings at a time, and details are built when a card opens.
- **Phones:** no sideways scrolling on four phone sizes (`tools/phone-check.cjs`). Light and dark themes.
- **Brand:** the fox mascot. 🕊️ for no barriers, 🚪 for no sign-in, 🔒 only for real gates.
- **Licenses:** code is MIT, catalog data is CC BY 4.0. GoatCounter analytics through the shared sala.company snippet.
