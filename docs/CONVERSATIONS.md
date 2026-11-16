# CleverFox: conversation log

Short notes from design conversations and working sessions: what was asked, what was decided, what was left open. Newest first. Keep entries brief; put lasting decisions in [DECISIONS.md](DECISIONS.md) and the full design in [SPECIFICATION.md](SPECIFICATION.md).

Entry format:

```
## YYYY-MM-DD: <topic>
**Where:** <e.g. Claude chat, Claude Code session>
**Asked:** ...
**Outcome:** ...
**Open:** ...
```

## 2026-11-16: originals of derived models
**Where:** Claude Code session.
**Asked:** for models pointing to Hugging Face copies, find the original through the model card (base model, model tree, `base_model` metadata). Link it if found, otherwise keep the Hugging Face link. The owner pasted notes: Hugging Face can be the original host itself, and merges list several parents.
**Outcome (decision 76):**
- `tools/import.mjs` follows `base_model` upstream, with a parent cache in `origins.json`.
- Listings show "🌱 Original:", linked to the catalog listing or to Hugging Face. Direct parents in the catalog are now links too (they were plain text).
- The local run traced 229 models, 88 past their direct parent (for example a quantized uncensored fine-tune back to Qwen/Qwen3.8-27B).
- It reaches the live site with the next daily full refresh.

## 2026-11-16: new models from Replicate
**Where:** Claude Code session.
**Asked:** pull new releases from replicate.com for new AI models to catalog.
**Outcome (decision 75):**
- A Replicate source in `tools/discover.mjs`: model list (newest version first), collections as tasks, a baseline on the first run, official or 500+ runs.
- `tools/import.mjs` makes candidate listings with nothing invented, skipping models already listed (seed or Hugging Face). The build adds Replicate under "Use it online" and "new on Replicate" on New this week.
**Notes:**
- Replicate's API needs a token even to read, so it waits on the owner adding `REPLICATE_API_TOKEN`.
- This session couldn't reach replicate.com (network), so the API's shape was taken from Replicate's official JavaScript client on npm. The first real run must be checked (TODO).
- A local test caught a duplicate: a seed listing (Qwen3.8-27B) wasn't checked at first. Seed records are now included.

## 2026-11-16: language filter cleanup
**Where:** Claude Code session.
**Asked:** the language dropdown showed languages that don't exist (screenshot: "atj", "av" and repeated names); fix it.
**Outcome (decision 74):** the filter shows each language once, by name, with a count, and leaves out codes that have no name; choosing a language matches all its codes. 150 languages instead of about 220 entries.
**Also:** the docs were updated for the YouTube feature (CLAUDE.md, spec, workflow, TODO).

## 2026-11-16: YouTube videos on listings
**Where:** Claude Code session.
**Asked:** like "Reactions on X", add related YouTube videos for each AI.
**Outcome (decision 73):**
- A "▶️ Videos on YouTube" button on every listing: a live YouTube search, newest first, with no quota used.
- Already-collected videos that name the listing show under "▶️ On YouTube", official channels first; 6 listings matched on the first build.
- Why not a search per listing: the YouTube API charges 100 units per search, and the free daily allowance can't cover about 1,240 listings.
- The first deploy failed on a GitHub glitch (the build's upload "github-pages" wasn't found). Rerunning only the deploy job failed too; rerunning the whole run worked.
- The session's network then refused the live site (403), so the live page is still to be checked (TODO).

## 2026-11-16: a Matrix / cyberpunk look
**Where:** Claude Code session.
**Asked:** give the website a less boring look, really functional but fun to read, in a Matrix cyberpunk style.
**Outcome (decision 72):**
- The dark terminal look is now the default, with neon accents, code-style lettering for headings and labels, digital rain behind the header, glowing card brackets, prompts on section titles and scanlines.
- A light "terminal paper" mode stays available from the footer.
- The page check now switches looks the way the site does, and caught one low-contrast tab count in light mode, which was fixed.
- No sideways scrolling on phones; the contrast check passes in both looks.
- **Follow-up:** the owner still saw the light look, because the old theme button had saved "light" under `theme`. The new design stores its choice under `look` and ignores the old setting, so everyone starts on Matrix.

## 2026-11-16: YouTube key added; checking the new sources
**Where:** Claude Code session.
**Asked:**
- simple steps for a YouTube API key, then the same as Cloud Shell commands: create a project, enable the YouTube Data API v3 and API Keys, create a key restricted to YouTube, add it as the `YOUTUBE_API_KEY` secret;
- then check whether YouTube scanning works.

**Outcome (decision 71):**
- **The key works:** keyword search returned 51 recent videos.
- **Official channels:** all 8 confirmed, but their RSS feeds answered 404 for 7 of 8. They're now read through the API (uploads lists): 33 official videos in 14 days.
- **llm-releases.com:** robots.txt allows reading, but the home page links only to itself. Following its 16 release pages found 84 Hugging Face models, now filled in. Generic link labels ("open") are replaced by site and path.
- **GitHub:** 113 new projects and 13 releases.
- **Diagnostics:** per-channel feed status, and page size, link count and domains for llm-releases, saved in `discover.json`.
- **Fixed:** search titles showed HTML codes.

## 2026-11-16: scanning YouTube
**Where:** Claude Code session.
**Asked:** scan YouTube for new AI announcements too.
**Outcome (decision 70):**
- `tools/discover.mjs` reads official AI makers' channels through YouTube's free RSS feeds, with every scan. The first list has 8 channels: OpenAI, Google DeepMind, Anthropic, AI at Meta, Hugging Face, NVIDIA, Google for Developers and Microsoft.
- Channel ids are confirmed from each channel's own page, and unconfirmed handles are skipped.
- Hugging Face links in video descriptions feed the catalog. New this week gets "▶️ On YouTube".
- With an optional `YOUTUBE_API_KEY`, 4 keyword searches add "🔎 Spotted on YouTube (not reviewed)".
- YouTube is unreachable from this session, so it runs on GitHub's servers; tested offline.

**Open:**
- the owner may add the API key;
- regional makers' channels are to add once confirmed;
- check the first run's skipped handles.

## 2026-11-16: docs brought up to date
**Where:** Claude Code session.
**Asked:** update the repo with the design decisions and the chat.
**Outcome:**
- The decisions (66 to 69) and the session entries below were already recorded.
- Refreshed the summaries that had fallen behind: CLAUDE.md "Current state" (about 1,240 listings, 82 of 96 apps and hosts verified, discovery sources, deploy checks), the README status, and spec section 20. CLAUDE.md's commands now include the page check.

## 2026-11-16: verifying the remaining 40
**Where:** Claude Code session.
**Asked:**
- verify the remaining 40 unverified apps and hosts;
- update the repo with the design decisions and the chat (twice);
- add a TODO on scheduled (cron) fetching: how it's done and its sources.

**Outcome:**
- **The page fetch** now reads store listings and pricing, plans, FAQ and terms pages, and renders JavaScript pages in a headless browser that always identifies itself (decision 69).
- **A first version was refused.** It disguised itself as Chrome, and the session's safety check rejected it; sites that refuse bots stay unverified.
- **Two runs hit the 50-minute limit** because some pages never finish loading. Hard stops fixed it: 45 seconds per page, and save and exit at 38 minutes.
- **The third run fetched 395 pages** (256 readable, 83 rendered).
- **The review:** three reviewers covered 38 listings under decision 67's rules. 26 more verified, 73 corrections, 0 quotes rejected. **82 of 96 apps and hosts are now verified.**
- **Corrections included:**
  - Kling's terms name only Stripe, so its payment methods became unknown; its plans now show $0 Basic and the paid tiers' prices.
  - The Gemini API gains Google's 230-country availability list.
  - Perplexity, Liner and Cerebras dropped payment methods their current pages don't state.
  - Rav Dicta is now Iluy.
  - Jais Chat's publisher is now MBZUAI.
  - Addis AI's and uLesson's countries became unknown, because their governing law and address disagree.
- **New TODO section:** scheduled fetching (cron), with how it works, every source by run type, and what's left.

**Open:** 14 still unverified, listed in TODO.md with what blocks each.

## 2026-11-16: tracking new releases on llm-releases.com, Hugging Face and GitHub
**Where:** Claude Code session.
**Asked:**
- track new releases on llm-releases.com, and on Hugging Face;
- GitHub notes on discovering new projects (repository search) separately from tracking releases (watching), with sample queries and a design: poll, de-duplicate by id, and keep NEW PROJECT apart from RELEASE.

**Outcome (decision 68):** `tools/discover.mjs` runs with every scan:
- Hugging Face new releases with early interest are filled in like X announcements;
- llm-releases.com is read from GitHub's servers, since it's unreachable from this session, with robots.txt respected;
- GitHub's 4 searches over a rolling 14 days, de-duplicated by repository id;
- watchlist releases.

New this week shows "📦 Releases" and "🧪 New projects on GitHub" separately. The first local run added 16 new models and 26 new datasets.

**Open:** llm-releases.com's page layout is unknown until the first run on GitHub; GitHub releases work only with the workflow's token. CleverFox has no Telegram, so the NEW PROJECT and RELEASE split is shown on the site instead.

## 2026-11-16: verifying the unverified apps and hosts
**Where:** Claude Code session.
**Asked:** verify the 76 unverified apps and hosts.
**Outcome (decision 67):**
- **Fetching:** this session reached only 3 of 102 official sites, so a new workflow fetches the official pages from GitHub's servers to a `pages-cache` branch. 472 pages for 79 listings, with readable text for 73 of them.
- **Review:** five reviewers compared every fact with the page text, quoting each confirmation and correction. A program checked every quote against the pages: none were rejected.
- **Result:** 39 newly verified and 154 corrections. Verified apps and hosts went from 17 to 56 of 96.
- **Examples of corrections:**
  - Biznet Gio takes Mandiri Clickpay and XL Tunai, not "e-wallets and QRIS";
  - Latitude.sh adds Pix, Boleto, Alipay and ACH;
  - Akamai's GPUs are in 20 regions;
  - Private LLM costs $4.99 and has an Android beta;
  - Layla has a free version;
  - Jarvislabs has no free trial;
  - uLesson adds Ghana mobile money;
  - CloudAfrica's H200 servers are live.
- Qwen Chat's Stripe "payment method" was removed.
**Open:** 40 still unverified, mostly JavaScript-only or bot-blocked pages, listed in TODO.md with the listings that may have changed.

## 2026-11-15: outside review applied
**Where:** Claude Code session.
**Asked:** apply the attached review "CleverFox: how to make it better": 4 must-dos, 8 important items, 8 nice-to-haves.
**Outcome (decision 66):**
- **Must-dos, all done:**
  - full app and host records on the page;
  - Google Play's missing countries shown as unknown;
  - no automatic promotion to verified (verified apps and hosts went back from 39 to 17);
  - the X post runs after the deploy and can't fail it.
- **Important, all done:**
  - candidates are flagged first and kept out of picks and guides;
  - picks count only listings that claim the task, X praise is out of the ordering, and the ordering is shown;
  - a stricter praise detector;
  - memory estimates labelled;
  - a failed scan keeps its slot;
  - a slim-record test, plus phone and contrast checks that stop the deploy;
  - a freshness line;
  - the validator accepts http(s) links only.
- **Nice-to-haves done:**
  - click-to-load X embeds;
  - no search words sent to GoatCounter;
  - names cleaned before X queries;
  - the data-branch push uses the checkout's credentials instead of a token in the URL;
  - "Prototype" removed from the footer.
- **Research merged:**
  - 60 prices on 8 listings, read on official pages;
  - Dala Studio, an Ethiopian AI studio that takes M-Pesa, Telebirr, Airtel Money and MTN MoMo;
  - Servercore, Nairobi GPU hosting that takes M-Pesa;
  - HostAfrica, Johannesburg GPU servers;
  - all new listings are candidates.
- **Held back:**
  - snippet-only prices;
  - AWS and Oracle records that listed only their African regions.
- **Waiting:**
  - App Store payments (Apple's page);
  - translation review;
  - new sources (ModelScope, Kaggle) until the current ones are solid;
  - the custom domain (DNS).

## 2026-11-15: cron-job.org steps; docs brought up to date
**Where:** Claude Code session.
**Asked:**
- simple numbered steps for setting up cron-job.org: a GitHub token, one job at minute 41 and hours 3, 11 and 19 UTC, POST to GitHub's workflow dispatch API with the headers, a test run expecting 204;
- update the repo with all design conversations, decisions, updates, information, development, and outstanding tasks.

**Outcome:**
- New `docs/TODO.md` with everything outstanding: owner actions, data to research, development.
- Spec section 19 now separates settled from open questions; section 20 lists what's live.
- CLAUDE.md "Current state" and the README are refreshed.
- Data snapshot `data/snapshots/2026-11-15/`.

## 2026-11-15: three X scans a day with cron-job.org
**Where:** Claude Code session.
**Asked:** scan X 3 times a day for new model, dataset, app and hosting announcements and fill in the rest of the information; time and start it with cron-job.org as for Flattery.
**Outcome (decision 65):**
- `tools/mode.mjs`: the first run in 20 hours is a full refresh, the others quick scans.
- X scanning: up to 3 announcement scans a day within the same daily read share, plus a launch-post search for apps and hosting.
- `import.mjs --x-only` fills in announced models and datasets from Hugging Face; announced datasets are now picked up in the full refresh too.
- App and hosting launches go on "New this week" as "Spotted on X" until researched.
- Workflow input `mode` (auto, full, x) replaces `import`; GitHub's schedule moved to 05:07, 13:07, 21:07 UTC as the backup.
**Open:**
- the owner sets up cron-job.org: a GitHub fine-grained token and three jobs;
- researching spotted launches is a manual step (research session).

## 2026-11-15: third critique, "do it all", and X caching
**Where:** Claude Code session.
**Asked:**
- Critique again how to make CleverFox more useful, then "do it all".
- Mid-way: "when X is pulled for someone, keep it cached for the next user, only refresh daily if needed".

**Critique (numbers):**
- 17 of 93 apps and hosts verified.
- 1 listing with mobile money.
- 4 of 55 apps with known interface languages.
- 2 hosts with African data centers.
- 52 of 858 models with an independent benchmark.

**Outcome (all published to `main`):**
- **Pay through Google Play:** payment methods per country for 72 countries, read from Google Play Help, shown on apps sold through Google Play; they count as payable without a card (decision 64). Apple's table is held back: its page couldn't be read directly. Google Play in Kenya names Airtel Money, not M-Pesa.
- **Automatic fact checking:** the daily re-check looks for each payment method's and "free"'s words on the source page. Candidates whose facts are all found become verified ("automatic page check").
- **Your language:** a picker, app languages from the App Store listing, 🗣️ badges, and language-aware picks.
- **Picks:** they say "no independent score yet" where a model has none.
- **Gaps and discontinued listings:**
  - empty searches and empty pick columns are counted in GoatCounter;
  - a "possibly discontinued" mark appears when a confirmed App Store app goes missing or a homepage is gone;
  - a new glossary page.
- **Guides and posting:** 10 guide pages built from the catalog, and a weekly X post that is off until `X_POST_ENABLED` and the posting keys are set.
- **X reads:** visitors never cause X reads; the daily run's results serve everyone. Now one day's read share per calendar day, the announcement search once a day, and no listing re-read within 24 hours, so extra runs on the same day cost nothing.

**Open:**
- the App Store payments table needs Apple's page read directly;
- Artificial Analysis needs the free `AA_API_KEY` secret;
- the custom domain needs DNS;
- translations need native review;
- the weekly X post needs posting keys.

## 2026-11-15: second critique, "make it more useful"
**Where:** Claude Code session.
**Asked:** critique how CleverFox can be more useful; then "do it all"; and update the repo with design decisions, the conversation, what we're aiming for, business rules and the workflow process.
**Outcome:**
- Critique: CleverFox is a good directory but weak at advice. People need to know what to pick, how to start, where to use a model online without a GPU, which apps work in their country, which apps are fake, prices in their money, phone-first options, and their own language.
- The aim is written down as "from directory to advisor" (spec section 1) and the plan is in spec section 20 and decision 62.
- New `docs/WORKFLOW.md`: the daily pipeline step by step, the data flow, how changes and research are made and reviewed, and the settings.
- Work started: research on offline phone apps and on official app-store links, and the "use it online" importer (the Hugging Face provider mapping works from this session; OpenRouter's model list is blocked here but should work from GitHub's servers).
- Built the same day, published straight to `main` piece by piece:
  - use it online, with 188 models matched on the first run and OpenRouter answering from GitHub's servers;
  - how to start;
  - 10 offline phone apps;
  - the App Store check: on its first run 9 official apps were confirmed and 3 rejected because the seller didn't match, 50 countries were checked, and look-alikes were counted;
  - find what to use (top picks with reasons and a share link);
  - a local prices badge and a prices field, new this week with RSS, and compare;
  - interface languages.
- Fixed along the way:
  - `.gitignore` had kept `data/corrections.json` and `data/app-stores.json` out of the repo, so the live build had run without the corrections file;
  - the App Store check now stops early when rate-limited (6-minute budget), and the job timeout is 45 minutes;
  - a compare-button loop that froze the page during testing, caught before it was published.

**Open:**
- the App Store check covers only apps with a confirmed official store link;
- price amounts need research;
- interface translations need review by native speakers;
- Google Play availability has no public API.

## 2026-11-15: critique and the three fixes
**Where:** Claude Code session.
**Asked:** critique CleverFox; then do the top three fixes: make the site light, clean up the catalog, grow the access side.
**Outcome:**
- **Light:** list files are slim and full records load when a card opens; the Models list went from 3.1 MB to about 70 KB compressed (decision 58).
- **Clean:** a corrections file (`hide`, `merge`, `keep`), a dataset quality bar and re-uploads grouped under their original; first run grouped 18 and hid 59 junk datasets (decision 59).
- **Access:** a daily re-check of access source pages that warns when a pricing or payment page changes or disappears (decision 60); 27 regional apps, 14 API providers and 13 regional GPU hosts added, from 18 apps and 11 hosts to 45 and 38 (decision 61).
- Other critique points kept for later: X coverage at a small read budget, benchmark coverage, automated checks before deploy, a freshness page, a guided start, compare, "new this week", click-to-load X embeds, more interface languages, the custom domain.

## 2026-11-15: X scanning switched on; short-name search
**Where:** Claude Code session.
**Asked:** step-by-step setup of the X token (a separate "CleverFox" app in the X developer portal, the `X_BEARER_TOKEN` secret, `X_MONTHLY_READS` = 2000); check it works; then fix the searches that found nothing.
**Outcome:**
- First live run: 123 posts read, 30 announcement posts, 18 listings checked; 8 found nothing because the search used full model names.
- The owner's X credits are shared with another project and had no spending cap or auto-recharge; advised setting a billing cycle cap.
- Short-name search added and empty listings retried first (decision 57).

## 2026-11-15: X monitoring and "What people say on X"
**Where:** Claude Code session.
**Asked:**
- X scanning should look for new model announcements, praise and validation through likes and reposts, and good words in general about models, datasets, apps and hosting.
- When a listing is shown, a side view with the top-liked posts that mention it, to give an idea of whether people on X are positive, negative or neutral about it.

**Outcome:**
- `tools/x.mjs` (tested offline by `tools/test-x.mjs`): an announcement search for posts linking to Hugging Face or the Ollama library, and a rotating, budgeted search per listing. Posts are sorted by simple multilingual word rules into positive, critical and general. Only links, authors and like counts are stored, never post text.
- "Praised on X" (validation): at least 3 positive posts from 3 accounts with 100+ likes between them. Badge and filter on every tab.
- New Hugging Face models announced on X (25+ likes) are imported even below the download floor, still subject to the usual checks, and marked "🆕 spotted on X".
- Listing pages gained a side panel: counts, a tone bar and the top posts per tone, shown with X's own embeds. Until the `X_BEARER_TOKEN` secret is added it says nothing is collected yet and links to the live X search.
- Long links now shorten in the middle, so similar names (…-Instruct, …-Instruct-FP8) stay distinguishable.
- Decisions 55 and 56.

## 2026-11-15: personalised highlighting; X monitoring started
**Where:** Claude Code session.
**Asked:**
- Start building X monitoring.
- Explain that choosing memory and country highlights the models that work best for the user and the services that accept their payment options or aren't restricted in their country.

**Outcome:**
- A hint under the pickers.
- Suitable listings sorted first with ⭐ and a green outline (DECISIONS 54).
- X monitoring: see the entry above.

## 2026-11-14: saving everything to the repo
**Where:** Claude Code session.
**Asked:** update and save all business rules, information, conversations, design decisions and the data collected so far to the repo.
**Outcome:**
- New `docs/BUSINESS-RULES.md`, written from the code: every threshold, formula and mapping.
- README rewritten around the questions the site answers.
- `CLAUDE.md` and spec section 20 updated to the current state.
- Decision 53 recorded.
- First data snapshot in `data/snapshots/2026-11-14/`: 1,135 listings, the imports and the benchmarks.
- A misplaced code comment in the importer fixed.

Other sessions that day, in brief:
- The owner asked for the website link (https://jamalxcode.github.io/CleverFox/).
- Benchmark sites were researched before Epoch AI was chosen (see "independent benchmarks").

## 2026-11-14: independent benchmarks
**Where:** Claude Code session.
**Asked:** are there benchmark sites we can use to know how good models are; then go ahead with the suggestion (Epoch AI, Artificial Analysis, MTEB, LMArena links).
**Outcome:**
- Epoch AI data imported daily (index plus own runs, CC BY 4.0): 52 listings matched.
- Artificial Analysis ready behind an optional `AA_API_KEY` secret (free key from an account).
- LMArena and MTEB linked (DECISIONS 52).
- Added epoch.ai and artificialanalysis.ai to the research environment.

**Open:** add `AA_API_KEY` when ready; LMArena ranks pending its data license.

## 2026-11-14: freedom emoji and where it runs
**Where:** Claude Code session.
**Asked:** the "No barriers" padlock should show freedom, not something locked; and whether we can tell if a model runs on Windows, Linux, macOS or a cloud server, with an emoji for each.
**Outcome:**
- 🕊️ No barriers, 🚪 no sign-in, ✂️ uncensored (DECISIONS 51).
- Platforms derived from runtimes, shown as 🪟🍎🐧📱☁️ with a "Runs on" line and filter (DECISIONS 50).
- Results: 834 models run on Windows and Linux, 835 on macOS, 62 on phones, and all 877 in the cloud.

## 2026-11-14: recommended memory
**Where:** Claude Code session.
**Asked:** add a recommended memory size.
**Outcome:** recommended memory per size (the smallest standard size with ~25% headroom), shown on cards, in the hardware line and in the size chips (DECISIONS 49).

## 2026-11-14: compact details
**Where:** Claude Code session.
**Asked:** the details take too much space; compress them with emojis, shorter text and several related fields per line, readable in one quick look.
**Outcome:**
- Details rewritten as emoji-led lines (🎯 good for · 💻 local · ⬇️ download · 🆓 free · 🔓 gate · 📜 license; 🖥️ memory → device, with size chips; ⚙️ processor tips; 📊/🧠 smarts; 📏 context, thinking, tools; 🌍 facts).
- Sources moved into small ⓘ links.
- Unknown fields gathered into one "❓ Unknown:" line.
- Same treatment for apps, hosting and datasets.
- A model's details went from about two screens to one card.

## 2026-11-14: listing pages and X reactions
**Where:** Claude Code session.
**Asked:** a link for each entry that can be shared, posted, sent and shown on its own, and an X search link for its reviews and reactions (like `x.com/search?q=bge-m3&src=typed_query&f=live`).
**Outcome:**
- 1,138 static listing pages with link previews and a sitemap.
- A share row on every listing, plus a "Reactions on X" live search link.
- Rendering shared between the page and the build (DECISIONS 48).

## 2026-11-14: fox mascot and logo
**Where:** Claude Code session.
**Asked:** use the owner's fox-in-sunglasses artwork as the site mascot and logo, and archive the image in the repo.
**Outcome:**
- Background removed while keeping the white fur.
- Head used as the logo and favicon.
- Full fox shown beside the intro (hidden on phones) and in the empty state.
- Link-preview image added.
- Original and cut-out kept in `img/source/`, not deployed.

## 2026-11-14: hardware advice
**Where:** Claude Code session.
**Asked:** something to advise on what hardware (memory and processor) a model needs.
**Outcome:** estimated memory per local size, device class and processor advice in "At a glance". A "Your device" memory picker with fit badges and a "Fits my device" filter. 598 of 877 models have estimates (DECISIONS 47).

## 2026-11-14: uncensored import rule
**Where:** Claude Code session.
**Asked:** add the rule to import abliterated and uncensored models.
**Outcome:** the importer searches Hugging Face for "abliterated", "uncensored" and "heretic" (up to 30 each, at least 500 downloads), keeps their GGUF packages, and links each to its original as "Uncensored variant of" (DECISIONS 46).

## 2026-11-14: filling unknowns; shaping the site around user questions
**Where:** Claude Code session.
**Asked:** how to complete the unknown fields (go ahead with all four options), and shape the site around what users look for:
- capabilities (coding, writing, graphics, analytics)
- runs locally
- free
- payments
- how smart
- fun facts
- abliterated
- gatekeeping
- freedom and no barriers

**Outcome:**
- Ollama families linked to their Hugging Face originals.
- Ollama pages read for license and per-size downloads.
- Wikidata publisher countries through a reviewed mapping and a GitHub workflow. Wikidata rate-limited this session, so the lookup runs on GitHub.
- "First published" dates.
- Answers computed at build time and shown first on cards and in "At a glance", with capability choices and quick filters (DECISIONS 44, 45).

**Open:** independent leaderboards for "how smart".

## 2026-11-14: restart; public posts instead of reports
**Where:** Claude Code session.
**Asked:** summarize the spec. Remove anything involving people reporting directly; read reviews and reports from the internet itself. Populate the catalog as much as possible from Hugging Face and other AI directories (external links, models, datasets, documentation). Most announcements and feedback will come from monitoring X.
**Outcome:** report form and community display removed, `cleverfox-reports` archived, deploy key neutralized, spec sections 9 and 10 rewritten around public feedback with X first (DECISIONS 42). Bulk importer from Hugging Face (models and datasets) and the Ollama library, with daily refresh through a `data` branch (DECISIONS 43). First import: 542 Hugging Face models (35 also on Ollama), 250 more Ollama-only families, 232 datasets, 207 models covering non-English languages. Datasets tab added.
**Open:** X monitoring needs an API token; other directories next.

## 2026-11-14: page review and rule-based reports
**Where:** Claude Code session.
**Asked:** hold the keys, show the page, and do reviews by looking at other signals, not AI.
**Outcome:** screenshots of the live page. They revealed sideways scrolling on real phones (the country picker, GPU filter and long badges), which is fixed, and `tools/phone-check.cjs` was added. The Claude evidence check was replaced by rule-based review: official page or agreement across days (DECISIONS 41). The page now shows how each community report was confirmed.
**Open:** add the `CLEVERFOX_DEPLOY_KEY` secret when ready to publish; the thresholds are provisional.

## 2026-11-14: evidence check and publishing
**Where:** Claude Code session.
**Asked:** build the evidence check and publish accepted reports.
**Outcome:** `tools/check.mjs` and `tools/publish.mjs` in the private reports repo, with offline tests (Claude stubbed). The hourly workflow now runs collect, check, publish, commit, then push to CleverFox. The CleverFox build merges `data/community.json`, and the page shows a "Community reports" section and a per-country badge (DECISIONS 40). A deploy key was created for publishing.
**Open:** the owner must add two secrets to `cleverfox-reports` (`ANTHROPIC_API_KEY`, `CLEVERFOX_DEPLOY_KEY`). Not yet run against the real API.

## 2026-11-14: community report form
**Where:** Claude Code session.
**Asked:** build the community report form.
**Outcome:** a `report/` page linked from every listing and the footer. It covers access facts (paid with, refused, available, blocked, free plan, sign-up) and scam warnings. Evidence is a link or a screenshot, with an in-browser black-out tool and re-encoding that strips metadata. Reports go to ntfy.sh, following Flattery's no-sign-up lesson. The owner chose a new private repo, `cleverfox-reports`, whose hourly workflow collects, rule-checks, redacts and stores them (DECISIONS 39). Both sides were tested offline: a browser test of the form with ntfy intercepted, and a collector test against a fake ntfy server.
**Open:** the AI evidence check and publishing accepted reports to the catalog. The domain is temporarily removed; the site serves at jamalxcode.github.io/CleverFox until DNS is set.

## 2026-11-14: seed prototype
**Where:** Claude Code session.
**Asked:** build the seed prototype. Use lessons from Flattery, but don't include Flattery: it isn't part of this project.
**Outcome:** a static page (country picker; Models, Apps and Hosting tabs; per-type filters; detail panels citing every fact) and `tools/build.mjs` (validation plus catalog build), with 50 records. Verified: 19 of 21 models, 3 of 18 apps, 6 of 11 hosts. The rest are candidates. A personal environment with 20 official hosts was created for the research. Claude spot-checked three verified facts against the live pages (Qwen license and size, InkubaLM license, Hetzner GPUs), and all matched.
**Lessons:**
- Access facts are the hardest data, as the second review predicted. Many official help pages block automated fetching (OpenAI returns 403, and many regional app sites aren't reachable), so most app access fields stay `unknown`. That supports community reports.
- No consumer app publishes a clean supported-countries list except the big US ones (Anthropic, Google), and those list included countries, not exclusions.
- "No card needed" from a free tier is misleading on its own, so the page shows "pay without a card" separately from "free".
- Payment methods often depend on the contracting entity or country (Alibaba Cloud, ChatGPT's Pix and UPI). The global access block with notes holds up but is strained (decision 31).
- Seed lists found no credible Latin American GPU host and no African consumer chat app yet.
- Release dates and publisher countries are rarely on model cards.
**Open:** add more official hosts (regional app sites, app stores) to fill access data; decide on the community-report form next.

## 2026-11-14: second review and answers
**Where:** Claude Code session.
**Asked:** critique what's been gathered so far and what could be better, then go through the questions one by one.
**Outcome:** the catalog and access ideas carry equal weight. Community reports are allowed (labeled, automated checks). Phase 1 is thin, with a phase 1.5. Scam reports and warnings, but no other trust or privacy signals. Access data stays global. English interface with a country picker. Data under CC BY 4.0. Hardware fit in phase 1.5. Claude drafted five user journeys and provisional targets, and ran a competitor scan: app directories, model price sites, GPU price finders and vendor "pay with crypto" pages. Few big AI providers take crypto directly, so Claude proposed listing authorized API aggregators as routes (DECISIONS 36, to confirm). Spec rewritten; DECISIONS 27–37 added. Next step: a seed prototype of about 50 records.
**Open:** spec section 19.

## 2026-11-14: hosting into Phase 1
**Where:** Claude Code session.
**Asked:** move hosting to Phase 1.
**Outcome:** done (DECISIONS 26). Phase 1 is models, web AI apps and AI hosting with local data centers, plus access and payment info. Phase 2 is templates, compatibility, datasets and guides. Phase 3 is pricing.

## 2026-11-14: web AI apps and payment access
**Where:** Claude Code session.
**Asked:** include web-based AI apps in the directory, popular ones too. Many people outside the US can't pay with Visa or other cards or aren't banked, so payment by crypto, local methods, or free options matters.
**Outcome:** added a web AI app record type (spec 7a) and an access-and-payment block for apps and paid APIs (spec 7b): free tier, payment methods, a "no card needed" flag, country availability and signup requirements, each with its source. Added filters and browse pages for them. Apps and access info join Phase 1. Claude added a rule to list only official payment routes, with no resellers or workaround guides (DECISIONS 24, to confirm).
**Outcome (follow-up):** the owner added that AI servers and hosting through local data centers are also important. Hosting moved to Phase 2, with data-center country and city, stated data-residency claims and the same access/payment block. Local and regional providers are in scope (spec section 12, DECISIONS 25). Datasets moved to phase 3.
**Open:** refresh window for payment facts; whether to add how-to-pay guides; seed list of local data-center providers; whether hosting belongs in Phase 1.

## 2026-11-14: spec review and answers
**Where:** Claude Code session.
**Asked:** Claude reviewed the repo and spec, then asked the review's questions one by one.
**Outcome:** a cross-source model catalog covering Hugging Face, GitHub, other hubs and API-only providers. It includes obscure as well as well-known models, with special focus on local models and on models outside the US or for other languages. Automated inclusion rules, no human review. Phase 1 is models only, and hardware fit is out for now. Key claims carry per-field sources. "Verified" means confirmed at the primary source. Guides are AI-written under evidence rules. All four success measures count. The site is CleverFox at cleverfox.sala.company, MIT license. The spec was converted to Markdown and revised, and DECISIONS.md entries 1–8 were confirmed, with 9–21 added. The owner had no preference on git churn or AI accuracy checks, so Claude chose "commit only on content change" and "structured data first plus a labeled test set".
**Open:** see the open list in DECISIONS.md.

## 2026-11-14: repository setup
**Where:** Claude Code session.
**Asked:** set up the empty `cleverfox` repo with a README, add the AI resource catalog spec, add CLAUDE.md, and add a place to collect conversation and design notes.
**Outcome:** added `README.md`, the spec (verbatim, as `docs/SPECIFICATION.txt`, since archived), `CLAUDE.md`, `docs/DECISIONS.md` (seeded from the spec) and this log.
**Open:** everything in the spec's section 19, starting with product name, stack and initial catalog scope.

## 2026-11-14: feasibility assessment and spec
**Where:** earlier Claude conversation (not in this repo). This entry is reconstructed from the spec's section 21, not from the conversation itself.
**Asked:** can a Hugging Face–style discovery site for models, datasets, compute, templates and docs, with pricing later, run on GitHub Pages using Flattery's patterns?
**Outcome:** yes for a curated static metadata catalog; the hard parts are classification, identity, version relationships, evidence and freshness, not hosting. Consolidated into the original spec, now `docs/archive/SPECIFICATION-2026-11-14.txt`. Based on Flattery's README only; no code audit and no live verification.
**Open:** confirm GitHub Pages limits and Hugging Face rate limits before building.
