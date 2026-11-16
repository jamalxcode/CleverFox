# CLAUDE.md

This file guides Claude Code when working in this repository.

## Overview

CleverFox (live at https://jamalxcode.github.io/CleverFox/; the custom domain cleverfox.sala.company is planned, waiting on DNS) is a global catalog of AI models, web AI apps and AI hosting, with access information built in. The two carry equal weight:
- **Catalog:** models from every source (Hugging Face, Ollama, GitHub, Kaggle, ModelScope, API-only providers), web AI apps, and hosting providers by data-center location. Obscure listings sit alongside well-known ones.
- **Access from anywhere:** for people outside the US, whether a listing is available in their country, how to pay without an international card (crypto, mobile money, UPI, Pix, app-store billing and others), what's free, whether a model runs locally, language support, and local data centers.

It is a metadata directory: it links to official sources and never hosts model files, runs inference, provisions servers or takes payments.

Read `docs/TODO.md` (outstanding tasks), `docs/SPECIFICATION.md` (the spec, including user journeys, competitors and what we're aiming for), `docs/WORKFLOW.md` (the daily pipeline, data flow and how changes and research are made), `docs/BUSINESS-RULES.md` (every rule and number the code applies) and `docs/DECISIONS.md` before design or data decisions. `docs/archive/` is history only.

## Current state

The site is live with about 1,240 listings: 875 models, 268 datasets, 56 apps and 40 hosts (including 14 API providers). **82 of the 96 apps and hosts are verified**: their facts were compared with their official pages, with quotes (decision 67); the rest are flagged "not yet verified" and kept out of picks and guides. It combines:
- researched seed records;
- daily imports from Hugging Face and the Ollama library;
- independent benchmarks (Epoch AI);
- Wikidata publisher countries;
- API providers per model (Hugging Face Inference Providers, OpenRouter);
- an App Store check and Google Play payment methods per country;
- a daily re-check of access pages;
- discovery: X, Hugging Face new releases, llm-releases.com, GitHub new projects and releases, YouTube, Replicate (new models become candidate listings; needs the `REPLICATE_API_TOKEN` secret);
- on each listing, "Reactions on X" and "Videos on YouTube" buttons, plus up to 3 collected YouTube videos that name it (decision 73), and on listing pages a "What people show on YouTube" panel with reviews (decision 78).

cron-job.org starts the workflow 3 times a day, and `tools/mode.mjs` picks a full refresh or a quick scan. The site gives:
- picks ("Find what to use");
- how to start, and use it online;
- compare;
- guides and a glossary;
- New this week (with GitHub new projects and releases) and RSS (all new, plus one feed per capability under `feeds/`);
- return visits: a setup line, picks remembered, one next step, saved and recently viewed, "new for you", similar listings, and help for empty results (decision 77);
- a freshness line;
- an interface in 6 languages.

Every deploy is gated by tests and a page check. What's left to do is in `docs/TODO.md`; open design questions are in spec section 19. Don't present them as decided.

## Commands

Node 22, no dependencies.

```sh
NODE_USE_ENV_PROXY=1 node tools/import.mjs [--quick]  # import from Hugging Face + Ollama into data/imported/ (the env var only matters behind a proxy)
npm test            # offline tests (X, re-check, providers, App Store, X post, run mode, slim records, discovery), then node tools/build.mjs --check: validate seed + imported records
node tools/ui-check.cjs --root .  # page check (phone widths, contrast); needs Playwright and axe-core (npm i --no-save axe-core)
node tools/benchmarks.mjs  # independent benchmarks into data/imported/benchmarks.json (Epoch AI; Artificial Analysis if AA_API_KEY is set)
npm run build       # validate and write data/meta.json, data/{models,datasets,apps,hosts}.json, data/catalog.json, listing pages under l/ and sitemap.xml
npm run serve       # python3 -m http.server 8000, then open http://localhost:8000
node tools/phone-check.cjs  # with the server running: no sideways scrolling on four phone sizes (needs Playwright)
```

## Files

- `img/`: the fox mascot (`fox.webp`), logo (`fox-logo.webp`), favicons and link-preview image (`og.jpg`; its URL in `index.html` is absolute, so update it when the custom domain is set). `img/source/` keeps the original artwork and the transparent cut-out; it isn't deployed.
- `i18n.js`: interface languages (en, ar, hi, pt, id, sw) for the main page chrome via `data-i18n` attributes; drafted translations, to be reviewed by native speakers.
- `you.js`: "Your CleverFox": saved listings, recently viewed, resume, "new for you since your last visit", calendar reminder, and data download, load and clear. Kept only in localStorage (`cf_you`); used by `app.js` and every listing page (decision 77).
- `picks.js`: top picks for "Find what to use" (task, device, country), from stated facts with reasons; imported by `app.js`.
- `index.html`, `style.css`, `app.js`, `render.js`: the page. Vanilla, no build step. `render.js` holds the listing rendering (pure string functions), shared by `app.js` and `tools/build.mjs`, which writes a static page for every listing under `l/` plus `sitemap.xml` and `robots.txt` (generated, not committed). The site address is `SITE` at the top of `tools/build.mjs`; change it when the custom domain is set. Keep `?v=__BUILD__` on asset links (to be replaced by CI, as in Flattery).
- `data/seed/*.json`: hand-entered records, the source of truth for now. Each record keeps `research_notes` (caveats, unconfirmed facts), which the build strips from the published catalog.
- `data/imported/*.json`: written by `tools/import.mjs`; not committed to main. CI stores them on the `data` branch (one commit, overwritten) and restores them before each build.
- `data/*.json`: generated by `npm run build` and not committed. The page loads `meta.json`, then one slim type file per tab (only what cards, filters, search and sorting need; `slim()` in `tools/build.mjs`). Opening a card fetches that listing's full record from `l/<type>/<publisher>/<name>/record.json`. `catalog.json` is the full download.
- `data/snapshots/<date>/`: frozen copies of the data collected (catalog, imports, benchmarks), for the record; not used by the build. Add a new dated folder when asked to save the data.
- `data/corrections.json`: hand corrections (`hide`, `merge`, `keep`, each with a reason) applied by the build's curation step, which also hides datasets below the quality bar and groups format re-uploads under their original (BUSINESS-RULES section 4).
- `data/store-payments.json`: payment methods Google Play accepts per country (official, Google Play Help); shown on apps sold through Google Play. `data/app-stores.json`: candidate official store ids for the App Store check. Both are hand-kept and listed as exceptions in `.gitignore`.
- `data/publisher-map.json` (hand-made: Hugging Face account -> organisation; organisations only) and `data/publishers.json` (generated from Wikidata by `tools/publishers.mjs` via the manual "Publishers" workflow; review changes before relying on them).
- `tools/benchmarks.mjs`: independent benchmarks (Epoch AI's own data, CC BY 4.0; Artificial Analysis if `AA_API_KEY` is set) into `data/imported/benchmarks.json`, matched to listings by name in the build. Credit the source wherever scores show.
- `tools/x.mjs`: X monitoring (needs the `X_BEARER_TOKEN` secret; skipped without it). Announcements and per-listing posts within the `X_MONTHLY_READS` budget, tone by word rules, into `data/imported/x.json` (links and counts only, never post text) and `x-state.json` (budget and cursor). Tested offline by `tools/test-x.mjs` (part of `npm test`). The build attaches `x_buzz` to listings; listing pages show the "What people say on X" panel.
- `tools/recheck.mjs`: daily re-check of access facts' source pages (fingerprints visible text) into `data/imported/recheck.json`; the build adds `access_check` (changed pages, gone pages, fact age) and listings show warnings. Tested offline by `tools/test-recheck.mjs` (part of `npm test`). It never edits facts.
- `tools/providers.mjs`: "use it online": API providers per model with prices (Hugging Face Inference Providers mapping, OpenRouter model list) into `data/imported/providers.json`; the build attaches `online` to models. Tested by `tools/test-providers.mjs`.
- `tools/appstore.mjs`: App Store check (confirms official ids by seller, countries per storefront, look-alike counts) into `data/imported/appstore.json`; candidates in `data/app-stores.json`. Tested by `tools/test-appstore.mjs`.
- `tools/xpost.mjs`: weekly X post of what's new (Mondays, off unless `X_POST_ENABLED` is `true` and the posting keys are set). Tested by `tools/test-xpost.mjs`.
- `glossary/index.html`: plain-language glossary (static). `guides/`, `new/` and `feed.xml` are written by the build.
- `tools/mode.mjs`: decides each workflow run's mode (full refresh if the last was 20+ hours ago, else a quick X scan; `none` on push). Tested by `tools/test-mode.mjs`. cron-job.org starts the workflow at 03:41, 11:41 and 19:41 UTC.
- `tools/slim.mjs`: the slim list records (models slimmed; apps and hosts keep their access block). Tested by `tools/test-slim.mjs`, which reads them back with `render.js` as the browser does.
- `tools/ui-check.cjs`: page check before deploy (phone widths 320 and 375, axe contrast in light and dark); needs Playwright and axe-core, which the workflow installs (`npm i --no-save`).
- `tools/save-data.sh`: saves `data/imported/` to the `data` branch with the checkout's credentials.
- `tools/fetch-pages.mjs` (workflow "Fetch pages for verification", output on the `pages-cache` branch) and `tools/apply-verification.mjs` (applies a review after checking every quote against the pages): the verification review (decision 67).
- `tools/discover.mjs`: Hugging Face new releases, llm-releases.com (robots.txt respected), GitHub new projects and watchlist releases (`data/github-watch.json`), YouTube official channels (`data/youtube-channels.json`; read through the Data API with the `YOUTUBE_API_KEY` secret, which also runs keyword search; RSS fallback), Replicate (public model list and collections, with the `REPLICATE_API_TOKEN` secret; `tools/import.mjs` turns new models into candidate listings), into `data/imported/discover.json` with per-source diagnostics; every scan (decisions 68, 70, 71, 75). Tested by `tools/test-discover.mjs`.
- `tools/import.mjs --x-only`: quick mode that only adds models and datasets announced on X.
- `tools/import.mjs`: bulk importer with inclusion and gap rules. It skips anything a seed record covers and keeps previous files if a source fails or shrinks.
- `.github/workflows/pages.yml`: on push, restores imports and deploys. Three times a day (cron-job.org, GitHub's schedule as backup) it scans X, imports (full refresh once a day, quick X-only fill-in otherwise) and saves to the `data` branch. Only public files are deployed. `data/seed/` stays out because it holds research notes.
- `tools/build.mjs`: the validator and catalog builder. It enforces vocabularies, claim provenance, ISO country codes, identity tests and access blocks, and derives `no_card_needed`.

## Flattery

`jamalxcode/flattery` is a **reference only**, not part of this project. Reuse its lessons and patterns (pipeline shape, last-known-good data, corrections file, freshness checks, GoatCounter snippet, accessibility checks), but never include it in CleverFox's environments, commits or scope.

## Intended architecture (from the spec)

- Static files on GitHub Pages (custom domain `cleverfox.sala.company` later; add a `CNAME` file back when it's set). Vanilla HTML/CSS/JS like Flattery. First load under 200 KB, excluding the search index. English interface with a country picker.
- A scheduled Node pipeline in GitHub Actions, modeled on Flattery (`jamalxcode/flattery`): scan -> extract -> normalize -> resolve identity -> verify at the primary source -> merge community reports and corrections -> persist (commit only on content change) -> pages, index, feeds -> deploy. No backend.
- Records share a base schema (spec 7.1) and come in three types: `model`, `app`, `host`. Apps, paid API distributions and hosts have an `access` block (spec 8a). It is global per listing, with country limits in each method's note.
- Automated inclusion rules, with gap rules for obscure, regional and no-card listings. A corrections file. No reports from people: X is the main source for announcements and feedback (replies and quotes), plus Reddit, forums, app-store reviews and news. Public feedback becomes `web_reported` claims linked to the posts; credible public scam reports drive `reported` and `dont_touch` warnings.
- Structured API data first (Hugging Face and other directories in bulk: models, datasets, documentation and external links). Whether AI classifies posts is an open decision. A labeled test set guards any extraction.
- Phases: 1 thin (models from HF, Ollama and API docs; top apps; hosting providers), 1.5 (more sources, offerings, hardware fit), 2 (templates, datasets, guides), 3 (pricing).

## Rules that must hold

- Never commit or publish model weights, datasets, VM images or other large resource files. Store only small metadata, original content and site assets.
- Never invent metadata. Unknown values stay `null` or explicitly unknown; AI output is not certification. Material claims keep their evidence URLs.
- Every record has a stable internal ID (`cf:model:<publisher>/<slug>`, never reassigned), `schema_version`, one entry per distribution (source, native ID, URL), availability and `verification_status` (`candidate`, `verified` = confirmed at the primary source, or `check_failed`).
- License, availability, parameters, benchmarks and release date carry their own source URL, source type (official / third_party / independently_verified) and observation time.
- Language, publisher region, formats and local readiness come from evidence or are `unknown`.
- Availability values are distinct: announced, downloadable, gated, API-only, discontinued/withdrawn, unknown. Announced is never shown as available.
- One model record per model across all sources; no two public records share a distribution URL or native ID. Models are hierarchical with typed relations (`variant_of`, `finetune_of`, `quantization_of`, `merge_of`, `adapter_of`, `successor_of`). Don't flatten versions or treat a quantization as a new family.
- Keep popularity, availability, compatibility, evidence and performance separate. No universal "best model" score. Open weights is not open source; parameter count is not a VRAM requirement; publisher benchmarks are not verified results; dataset access is not a reuse license.
- Records are never silently lost: mark withdrawals, deletions and broken links instead of dropping them. Connector or AI failures keep last-known-good data and surface freshness warnings. A successful scan must not imply every source refreshed.
- Secrets live only in workflow secrets; never in generated files, logs or client bundles. Respect each source's terms, rate limits (handle HTTP 429 with backoff) and attribution.
- Access facts carry a source, source type (`official`, `third_party`, `independently_verified`, `web_reported`) and observation time, or are `unknown`. Public (`web_reported`) claims never override official ones. List official payment routes and labeled authorized API aggregators only: no account resellers, gray-market top-ups or guides to getting around country restrictions or sanctions.
- Prices (later) are separate observations with source, timestamp, currency, billing unit, region and conditions. Never claim "cheapest" without equivalent configurations.
- Stay a public informational directory. No accounts, checkout, subscriptions or provisioning without a hosting-policy review (GitHub Pages disallows commercial SaaS/e-commerce use).
- Don't generate a page per filter combination; generate detail pages and compact indexes, and load full records only when needed.

## Conventions

- Design notes live in `docs/`:
  - `docs/BUSINESS-RULES.md`: every rule and number the code applies. Update it in the same commit whenever a rule or threshold changes.
  - `docs/SPECIFICATION.md`: the product spec. Update it when a decision changes the design.
  - `docs/DECISIONS.md`: numbered decisions with situation, decision and why. Add an entry whenever something is decided or reversed (mark old ones superseded, don't rewrite them), and move items out of its open list as they're settled.
  - `docs/CONVERSATIONS.md`: a brief log of each design conversation or working session, newest first. Add an entry at the end of any session that discusses or changes the design. When the user pastes notes from another conversation, summarize them here and move lasting decisions into DECISIONS.md.
- Keep the shared GoatCounter snippet (endpoint `https://salacompany.goatcounter.com/count`) on every page once the site exists.
- Update this file with real commands (install, test, scan, build) once code exists.
