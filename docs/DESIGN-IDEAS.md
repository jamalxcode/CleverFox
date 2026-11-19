# Design ideas

Ideas for CleverFox: what's been built, what's planned, what's still open, and what was considered and turned down (with why). Settled choices are numbered in [DECISIONS.md](DECISIONS.md), tasks are in [TODO.md](TODO.md), and open product questions are in the [spec](SPECIFICATION.md) section 19. When an idea is decided, record the decision there and update its status here.

## The idea in one line

A catalog of AI you can actually use where you live. Every model, app and host comes with the answers people outside the US need: does it work in my country, can I pay without a card, is it free, does it run on my device, does it speak my language.

## Built

- **Advisor, not just a list** (decision 62): "Find what to use" picks with reasons, how to start (commands and app buttons), use it online (providers with prices), compare, guides and a glossary.
- **Answers people ask** (45, 47, 49, 50, 52): good for, runs locally, platforms, hardware estimates, free, pay without a card, independent benchmarks, barriers, uncensored variants.
- **Fit for you** (54): device memory, country and language pickers that sort and highlight what suits you.
- **Trust signals** (60, 64, 66, 67): verified versus not yet verified, a daily re-check of access pages, an App Store check, Google Play payments per country, and a freshness line.
- **Discovery** (55, 65, 68, 70, 71, 75, 83): X 3 times a day, Hugging Face new releases, llm-releases.com, GitHub new projects and releases, YouTube, Replicate (waiting on its token). With no sign-up: OpenRouter's new models, AI makers' news feeds, Hugging Face Daily Papers, Hacker News launches, Bluesky, App Store searches in 20 countries (a research queue), and Ollama's newest in quick scans.
- **Pipeline safety and health** (86): listings never dropped, bad imported records quarantined, a status page, the X re-check, makers' news on listings, community versions grouped.
- **Two panes and a top bar** (89): Find on the left, Browse on the right on wide screens, and a bar to every section.
- **Layout pass** (88): compact picks, clear card actions, sticky bar and sort, presets, Surprise me, the fox's tips.
- **Two titled sections** (87): "Find what to use" and "Browse the catalog".
- **Auto-research of new apps** (85): rules-only facts with quotes from the App Store and the app's own pages, so queued apps become "not yet verified" listings.
- **Three looks** (80–82): Dark, In between (brighter slate, colour-blind-safe colours) and Light, as buttons in the header.
- **What people say and show** (56, 73, 78): the X panel, YouTube videos and reviews, all loaded only when asked.
- **Where it came from** (76): derived models traced to their original through `base_model`.
- **Return visits** (77): setup line, remembered picks, one next step, saved and recently viewed, new for you, similar listings, help for empty results, calendar reminder and a feed per task.
- **Answers at a glance** (79): verdict strip, plain descriptions, one question bar, picks first, folded filters, "Using it in [country]", labelled facts, and country-aware ways to pay.
- **A look with character** (72): the Matrix terminal look, readable first, with a light paper look.

## Planned (in TODO)

- **Public feedback from X as `web_reported` claims:** credible posts about access and payment, shown separately and never overriding official facts. Plus `reported` and `dont_touch` warnings from public scam reports, once thresholds are set.
- **Tone test set:** about 200 hand-labelled posts, to measure the praise and criticism word rules before praise counts in picks.
- **App Store payment methods per country,** read from Apple's own page.
- **More regional coverage:** mobile-money services (Paystack and Flutterwave checkouts), GPU hosts in Nigeria, Kenya, Egypt, Morocco and South Africa, and regional AI makers' YouTube channels.
- **More sources:** ModelScope (check its public API first), Kaggle (free key), more makers' news feeds (DeepSeek, Cohere, xAI, Sarvam, G42, regional labs), and other API providers' public model lists.
- **Work through the research queues** on New this week: popular App Store apps and Hacker News launches.
- **Translations:** review the 6 interface languages with native speakers, then translate the return-visit text, listing details, reasons and filters.
- **Prices:** more amounts from official pages (Gemini, ChatGPT, RunPod, Vast, regional apps), as dated observations.
- **Guides driven by gaps:** new guides where GoatCounter's "no results" events show people looking and finding nothing.
- **Custom domain:** `cleverfox.sala.company` once DNS is set (update `SITE`, `og.jpg` URL, add `CNAME`).

## Open ideas (not decided)

- **LMArena ranks** beside independent benchmarks, once the leaderboard data's license is confirmed.
- **A headless browser for re-checking** the few JavaScript-only source pages (honest user agent, refusals respected).
- **More reading sources than X:** Reddit (its API terms need permission), forums and app-store reviews. Each needs its permitted use checked.
- **AI for extraction or classification:** none is used now. Only with a labelled test set and a spending cap.
- **An anonymous "Next step" event** to see whether "How to start" helps people, with nothing personal.
- **Per-country guides** ("Pay without a card in Kenya"), now that ways to pay are country-aware. One page per country, not per filter combination.
- **Verdicts in the 6 interface languages,** after the native-speaker review.
- **YouTube thumbnails** in the panel, only if they can load on request like the videos.
- **A general guide to crypto-funded virtual cards:** undecided. It must never become a guide to getting around country restrictions.
- **Price comparisons across equivalent configurations,** never "cheapest" without matching setups (phase 3).
- **Hardware fit for phones** beyond the offline apps list: phone memory and model sizes.

## Considered and turned down

- **Reports from people through a form** (decisions 39–41, superseded by 42): screenshots and personal details are too risky for a public directory. Public posts are read instead.
- **Push notifications and accounts** (77): they need a server, accounts and a subscription store, which a static directory doesn't have. A calendar reminder and RSS give the same help under the visitor's control.
- **Badges, points and streaks** (77): they reward time spent, not usefulness.
- **Endless scrolling and autoplay** (77): they remove clear stopping points.
- **One page per filter combination:** it bloats the site and search indexes. Detail pages and compact indexes only.
- **A per-listing YouTube search every day** (78): far over the free quota. Rotating 15 listings per scan instead.
- **Pretending to be a normal browser to read blocked sites** (69): refused on principle. Those listings stay unverified.
- **A universal "best model" score:** popularity, benchmarks, availability and fit stay separate, and picks show their reasons.
- **Using the browser's light/dark preference to pick the look** (72): the Matrix look is the brand. Light mode is one tap away.
- **Including Flattery in CleverFox** (38): Flattery is a reference for patterns only, never part of the project.
