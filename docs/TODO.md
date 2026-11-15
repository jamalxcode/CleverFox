# CleverFox: outstanding tasks

What's still to do, as of 15 November 2026. Decisions behind each item are in [DECISIONS.md](DECISIONS.md); open design questions are in [spec section 19](SPECIFICATION.md#19-open-decisions). Tick items off here (or delete them) when they're done, in the same commit.

## For the owner (needs your accounts or money)

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

## Data to research

- [ ] **App and hosting launches spotted on X** ("New this week" → "Spotted on X"): research each at its official site and add it to `data/seed/` with sources.
- [ ] **App Store payment methods per country:** read Apple's page (support.apple.com/en-us/111741) directly and add an `app_store` table to `data/store-payments.json`. The search summaries contradicted each other (decision 64).
- [ ] **Price amounts:** `access.prices` (plan, amount, currency, period, source) is ready, but none are filled in.
- [ ] **Mobile money:** only 1 listing has it as its own payment method. Look for services that take M-Pesa, MTN MoMo or Airtel Money directly, for example through Paystack or Flutterwave checkouts.
- [ ] **More regional hosting:** only 2 hosts have African data centers. Look for GPU or inference providers in Nigeria, Kenya, Egypt, Morocco and South Africa.
- [ ] **App Store ids to check:**
  - rejected by seller: Jais Chat (listed under MBZUAI), PocketPal AI (Gooya UG), Locally AI (Element Labs);
  - not found: Microsoft Copilot, uLesson, Hailuo AI, Qwen Chat, Kanana. Kanana was reported shut down in October 2026; confirm it and mark it withdrawn;
  - Qwen Chat's publisher ("Nth Power…") looks odd.
- [ ] **Facts not found on their source pages:** the automatic page check lists 15 (7 partly found, 8 not found). Re-check them by hand.
- [ ] **Unverified listings:** 76 of 93 apps and hosts are candidates now that the page check no longer verifies automatically (decision 66). They're kept out of picks and guides until a person reads their official page. This is the most valuable research task.
- [ ] **Country lists for apps:** many apps still show "unknown" outside the App Store check. Use official availability pages where they exist.
- [ ] **Publisher countries:** extend `data/publisher-map.json` beyond the first 59 organisations.

## Development

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
