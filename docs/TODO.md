# CleverFox: outstanding tasks

What's still to do, as of 15 November 2026. Decisions behind each item are in [DECISIONS.md](DECISIONS.md); open design questions are in [spec section 19](SPECIFICATION.md#19-open-decisions). Tick items off here (or delete them) when they're done, in the same commit.

## For the owner (needs your accounts or money)

- [ ] **YouTube keyword search (optional):** create a free YouTube Data API key in Google Cloud (YouTube Data API v3) and add it as the `YOUTUBE_API_KEY` repo secret. Official channels work without it.

- [ ] **cron-job.org timer:**
  - make a fine-grained GitHub token for CleverFox (Actions: read and write);
  - make one cron-job.org job: minute 41, hours 3, 11 and 19 UTC, `POST https://api.github.com/repos/jamalxcode/CleverFox/actions/workflows/pages.yml/dispatches`, body `{"ref":"main"}`, with the `Authorization`, `Accept`, `X-GitHub-Api-Version` and `Content-Type` headers;
  - test it: the answer should be 204. Steps are in [WORKFLOW.md](WORKFLOW.md) section 1.
- [ ] **Renew that GitHub token** in the cron-job.org job before it expires.
- [ ] **X credits** are shared with another project:
  - set a billing cycle cap in the X developer portal;
  - decide on auto-recharge. The balance was about $81 with roughly $10 a day of spend on 15 November.
- [ ] **Artificial Analysis benchmarks:** add the free `AA_API_KEY` repo secret. This gives more models an independent score, which helps picks.
- [ ] **Weekly X post (optional):** add `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN` and `X_ACCESS_SECRET` (read and write), and set the variable `X_POST_ENABLED` to `true`.
- [ ] **Custom domain:**
  - add the DNS record for `cleverfox.sala.company`;
  - then add the `CNAME` file back and change `SITE` in `tools/build.mjs`, and the `og:image` and canonical links in `index.html` and `glossary/index.html`.
- [ ] **Translations:** ask native speakers to review the Arabic, Hindi, Portuguese, Indonesian and Swahili interface text in `i18n.js`.
- [ ] **Network for research sessions (optional):** allow `support.apple.com`, `itunes.apple.com`, `apps.apple.com` and `play.google.com` in the environment's network settings, so sessions can read official store pages directly.

## Scheduled fetching (cron): finish, check and document

**How it's done.** cron-job.org calls GitHub's API at 03:41, 11:41 and 19:41 UTC, which starts `.github/workflows/pages.yml`; GitHub's own schedule (05:07, 13:07, 21:07) is a late backup. `tools/mode.mjs` picks the run type:
- **full refresh:** the first run 20 or more hours after the last one;
- **quick scan:** the other runs.

Each run reads its sources, builds, checks the pages, saves the data to the `data` branch and deploys. A separate manual workflow, "Fetch pages for verification", reads official pages for the verification reviews. Details are in WORKFLOW.md section 1.

**Sources, by run type:**

| Source | What it gives | Quick scan | Full refresh | Tool |
|---|---|---|---|---|
| X (API v2 recent search) | announcements (Hugging Face and Ollama links, app and hosting launch posts), posts about listings | ✓ | ✓ | `tools/x.mjs` |
| Hugging Face new releases | models and datasets created in the last 14 days with early interest | ✓ | ✓ | `tools/discover.mjs` |
| llm-releases.com | Hugging Face links and release announcements (robots.txt respected) | ✓ | ✓ | `tools/discover.mjs` |
| GitHub search | brand-new AI projects (4 searches, last 14 days) | ✓ | ✓ | `tools/discover.mjs` |
| GitHub releases | latest releases of the watchlist and projects linked from listings | ✓ | ✓ | `tools/discover.mjs` |
| YouTube official channels (RSS) | new videos from AI makers; Hugging Face links in descriptions | ✓ | ✓ | `tools/discover.mjs` |
| YouTube search (with `YOUTUBE_API_KEY`) | recent AI release videos, not reviewed | ✓ | ✓ | `tools/discover.mjs` |
| Hugging Face (fill-in) | details for models and datasets found above | ✓ (`--x-only`) | ✓ | `tools/import.mjs` |
| Hugging Face Inference Providers, OpenRouter | API providers per model, with prices | ✓ | ✓ | `tools/providers.mjs` |
| Hugging Face (bulk) and the Ollama library | top, liked, trending and gap-rule models and datasets; local models | | ✓ | `tools/import.mjs` |
| Epoch AI (Artificial Analysis with a key) | independent benchmarks | | ✓ | `tools/benchmarks.mjs` |
| Apple's iTunes lookup and search | official apps, App Store countries, look-alikes | | ✓ | `tools/appstore.mjs` |
| Official access pages | page changes, gone pages, payment and free words | | ✓ | `tools/recheck.mjs` |
| Official pages, store listings (manual workflow) | text for verification reviews | | | `tools/fetch-pages.mjs` |

**To do:**
- [ ] **Owner:** set up the cron-job.org job (TODO above) and check that the first three runs in a day show "full", "x", "x".
- [ ] Check the first run on GitHub of each new source:
  - llm-releases.com layout and robots.txt;
  - GitHub releases with the workflow token;
  - Hugging Face new releases.
- [x] Make "Fetch pages for verification" finish reliably: hard stops at 45 seconds per page and 38 minutes overall. The 16 November run finished, with 395 pages for the remaining 40.
- [x] Review the remaining 40 listings against those pages: 26 more verified, so 82 of 96 are now verified.
- [ ] Freshness: add discovery (Hugging Face new, llm-releases, GitHub) to the footer's "Last refreshed" line.
- [ ] Decide whether quick scans should run more often than 3 times a day (each run rebuilds the site; X reads stay within the same daily share).
- [ ] Keep this table and WORKFLOW.md in step whenever a source is added or removed.

## Data to research

- [ ] **App and hosting launches spotted on X** ("New this week" → "Spotted on X"): research each at its official site and add it to `data/seed/` with sources.
- [ ] **App Store payment methods per country:** read Apple's page (support.apple.com/en-us/111741) directly and add an `app_store` table to `data/store-payments.json`. The search summaries contradicted each other (decision 64).
- [ ] **Price amounts:** 60 prices on 8 listings so far (Claude, Mistral Vibe, Hetzner, OVHcloud with INR, Nebius, Hugging Face, Alibaba Model Studio, DeepSeek with CNY), read on official pages on 15 November. Still missing: Gemini, ChatGPT, RunPod, Vast and most regional apps (their pages were blocked or price by script). Amounts seen only in search snippets are kept out.
- [ ] **Mobile money:** now 3 listings (adding Dala Studio in Ethiopia, and Servercore in Kenya), all candidates. Look for services that take M-Pesa, MTN MoMo or Airtel Money directly, for example through Paystack or Flutterwave checkouts.
- [ ] **More regional hosting:** Servercore (Nairobi) and HostAfrica (Johannesburg) added as candidates. AWS (Cape Town) and Oracle (Johannesburg) were found but held back: their records listed only African regions, which would misrepresent global providers; add them with all their GPU regions. Look for GPU or inference providers in Nigeria, Kenya, Egypt, Morocco and South Africa.
- [ ] **App Store ids to check:**
  - rejected by seller: Jais Chat (listed under MBZUAI), PocketPal AI (Gooya UG), Locally AI (Element Labs);
  - not found: Microsoft Copilot, uLesson, Hailuo AI, Qwen Chat, Kanana. Kanana was reported shut down in October 2026; confirm it and mark it withdrawn;
  - Qwen Chat's publisher ("Nth Power…") looks odd.
- [ ] **Facts not found on their source pages:** the automatic page check lists 15 (7 partly found, 8 not found). Re-check them by hand.
- [ ] **Unverified listings:** 14 of 96 after the two reviews of 16 November (decisions 67 and 69). What blocks each:
  - **Sites refuse automated visitors** (they stay unverified; don't get around it):
    - ChatGPT: help pages return 403, so Pix, UPI, Korean payments and local prices can't be confirmed;
    - HUMAIN Chat: 403;
    - Vultr: 403 on marketing pages, so its regions and some GPUs are unconfirmed;
    - K2 Think: MBZUAI's pages return 403;
    - Akamai: its locations page returns 403, so its US region is unconfirmed;
    - Tencent Yuanbao: a "change your browser" page.
  - **No readable page at all:** Karnak Chat, BelMasry.
  - **Facts not on the readable pages:**
    - Z.ai Chat: free status;
    - Kimi: free plan, and "chat";
    - Botnoi Voice: PromptPay and cards, since the FAQ answer isn't in the page text;
    - DeepSeek API: payment methods, for the same reason;
    - Hyperbolic: crypto, whose blog post returned HTTP 500.
  - **May be discontinued:** Kanana, now apparently part of KakaoTalk; decide whether to mark it withdrawn.

  Options: confirm these facts from another official page, mark facts unknown when official pages are clearly silent, or leave them unverified.
- [ ] **Listings that may have changed** (found in the review):
  - Kanana seems folded into KakaoTalk;
  - Locally AI is now "by LM Studio" (Element Labs), so the publisher needs updating;
  - Jais Chat is run by Core42 per G42 (its site shows "Jais 3 - MBZUAI");
  - Lintasarta's Deka GPU page moved to lintasarta.net;
  - ERNIE Bot redirects to "Wenxin Assistant";
  - OpenRouter's purchase by Stripe is pending.
- [ ] **Country lists for apps:** many apps still show "unknown" outside the App Store check. Use official availability pages where they exist.
- [ ] **Publisher countries:** extend `data/publisher-map.json` beyond the first 59 organisations.

## Development

- [ ] **YouTube channels:** after the first run on GitHub, check that every handle in `data/youtube-channels.json` resolved, in the `skipped` list in `discover.json`. Add regional AI makers' official channels (Qwen, DeepSeek, Mistral, Sarvam, G42 and others) once their handles are confirmed on their own websites.

- [ ] **Check the first llm-releases.com read** on GitHub: does its layout give Hugging Face links and announcements? Adjust `releasesFromHtml` if not, and confirm robots.txt allows it.

- [ ] **Tone test set:** label about 200 real posts by hand, measure the praise and criticism rules, and only then consider putting praise back into the ordering.
- [ ] **Translation review first:** native speakers review the interface translations before more text or languages are added.

- [x] **Checks before deploy:** phone widths and axe contrast in light and dark (`tools/ui-check.cjs`) stop the deploy (decision 66).
- [x] **Freshness:** the footer shows when each source last refreshed, with ⚠️ when stale (decision 66).
- [x] **Click-to-load X embeds** (decision 66).
- [ ] **Public feedback from X:**
  - turn credible posts about access and payment into `web_reported` claims, shown separately and never overriding official facts;
  - add `reported` and `dont_touch` warnings from public scam reports, with thresholds still to decide (spec section 19).
- [ ] **A labeled test set for tone:** check the positive / critical / general word rules against hand-labelled posts before relying on them more.
- [ ] **More sources that link out:** ModelScope, Kaggle, GitHub releases, and API providers' own model lists.
- [ ] **Translate more:** listing details, reasons and filters are English only.
- [ ] **Google Play availability per country:** there's no public API. Revisit if one appears.
- [ ] **Re-check JavaScript-only pages:** some source pages render only with JavaScript and can't be fingerprinted or fact-checked. Consider a headless browser for those few.
- [ ] **LMArena ranks:** show them once the leaderboard dataset's license is confirmed (link only for now).
- [ ] **Guides:** add more as the "no results" events in GoatCounter show what people look for.
- [ ] **Snapshots:** save a dated copy in `data/snapshots/` when asked.
