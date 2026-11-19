# Lessons learned

What building CleverFox taught us, so the same mistakes aren't made twice. Newest themes first within each section. Add a lesson when something surprised us, broke, or took more than one try.

## Data and sources

- **Rewriting an import from today's top lists silently drops yesterday's listings.** 92 vanished in 3 days, including IndicTrans2. Imports now merge with what they had, re-check what fell out, and mark it, never delete it (decision 86).
- **Judge engagement when it has had time to build.** X posts judged a few hours old rarely had 25 likes. A re-check a day later costs a single lookup.

- **A source's published format isn't proof it works.** YouTube's channel RSS feeds answered 404 for 7 of 8 official channels, so uploads are read through the Data API instead (decision 71). Before relying on a feed, check what it returns from the machine that will run it.
- **Check the identity of a new source against everything already listed, hand-entered records included.** A local Replicate test created a second Qwen3.8-27B listing because only imported records were checked, not the seed. Matching now includes seed records (decision 75).
- **Hugging Face mixes 2- and 3-letter language codes and tags hundreds of languages.** Showing raw codes gave a dropdown full of "atj", "av" and Aymara three times. Group codes by their name and drop codes no browser can name (decision 74).
- **Uploader metadata is the best trail to an original, but it's only as good as the uploader.** `base_model` chains reach the original for most derived models. They stop at deleted or private pages, so say so instead of guessing (decision 76).
- **A site's home page may link only to itself.** llm-releases.com's home page gave 0 outside links. The useful links were on its own release pages, so follow those (robots.txt respected, decision 71).
- **Search snippets contradict each other.** Apple's App Store payment methods per country came out different in each summary. Read the official page itself or leave the fact unknown (decision 64).
- **Bulk imports favour the popular.** Gap rules (per language, regional, no-card) are needed to list obscure and regional models at all (decision 43).
- **Free quotas shape the design.** A YouTube search costs 100 of 10,000 daily units, so per-listing searches rotate a few listings per scan (decision 78). X reads are budgeted per day, and visitors never trigger reads (decision 55).

## Pipeline and deploys

- **One bad outside record shouldn't stop everything.** Imported records that fail validation are now quarantined and reported. Only hand-researched records stop the run.
- **Count every source every run.** Without a history, a source that quietly returns nothing looks like a quiet day. The health report compares each count with its recent median.

- **Test a new source where it will really run.** OpenRouter, Hacker News and the App Store were blocked in the building session. The first GitHub run showed they worked, and also that OpenRouter lists "(batch)" variants and its own routers as models, and that API-only records need an access block to pass validation. The validation stopped that run before anything was saved or deployed.
- **A source that fails every request must fail, not report "0 found".** Otherwise an outage replaces good data with an empty list. Each source now throws when all its requests fail, so the last data is kept.

- **GitHub's schedules run late or not at all.** An outside timer (cron-job.org) starts the workflow, with GitHub's schedule only as a backup (decision 65).
- **Re-running only the failed deploy job doesn't help when the build's upload is missing.** The "github-pages" artifact wasn't found once. Re-running the whole run fixed it.
- **Long fetch jobs need hard stops, not hopes.** The page-fetching workflow hit its 50-minute limit twice. Per-page time limits, a stop for starting new pages and a save-and-exit timer made it finish every time (decision 67).
- **Ignore rules can hide hand-kept files.** `.gitignore` silently dropped `corrections.json` and `app-stores.json`. Hand-kept data files are listed as exceptions, and ignored files are checked (decision 63).
- **Keep the last good data.** Every importer keeps the previous file when a source fails or shrinks by more than 20%, and freshness warnings show what didn't refresh. A successful run never implies every source refreshed.
- **A slimmer list file can drop facts the page needs.** The first slim app list lost the access data that badges and picks used. Now apps and hosts keep their whole record, and a test reads slim records back as the browser does (decision 66).
- **New public files must be added to the deploy list.** The workflow publishes only listed files (`you.js` and `feeds/` had to be added), because `data/seed/` holds research notes and must never be published.

## Interface

- **A payment method isn't global just because it's listed.** ChatGPT's list (Pix · Brazil, UPI · India, Kakao Pay · South Korea) made the page tell someone in Kenya they could pay without a card. Country words in notes now decide where a method counts (decision 79). Read notes as data, not decoration.
- **A component's display rule can beat the `hidden` attribute.** The folded filters showed anyway because `.filters { display: flex }` won. `[hidden] { display: none !important; }` now guarantees it.
- **Never cut text mid-word to make it fit.** The sign-up line was cut at 80 characters ("…Apple; loggin"). Show the full text in a place with room.
- **Equal weight hides the answer.** Nine buttons before the facts, eight badges per card and three repeats of the same hint made correct facts hard to read. Verdicts first, details folded.

- **Old browser settings outlive a redesign.** After the Matrix look shipped, the owner still saw the light design because an old `theme=light` was stored. The new look uses its own key (`look`) and ignores the old one (decision 72).
- **CSS specificity bites in dark mode.** A quiet outline button inherited dark text from a more specific dark-mode rule and failed contrast. The page check caught it before deploy. Make the rule specific enough, and let the automated contrast check run on every change.
- **The page check must see the states people actually see.** A returning visitor's panel isn't on a fresh page, so the check now loads sample saved data and opens the panel.
- **Observers can loop.** A MutationObserver that re-labelled compare buttons triggered itself and froze the page. Change only what differs.
- **One primary action needs enforcing.** Two bright buttons appeared after picks ("Show my picks" and "How to start"). The first now turns quiet once picks are shown (decision 77).

## Working practice

- **A pipe can hide a failed test.** `node test.mjs | tail -1 && git commit` committed after a failing test, because the pipeline's exit status was `tail`'s. GitHub's test step caught it and stopped the deploy. Use `set -o pipefail` (or don't pipe) before chaining on test results.

- **Never get around a site that refuses bots.** A headless fetch that pretended to be Chrome was rightly refused. The fetcher now identifies itself as CleverFox, respects robots.txt, and leaves 401, 403 and 429 responses alone (decision 69).
- **When the session's network blocks a host, use an official mirror of the facts.** replicate.com was unreachable here. Replicate's official JavaScript client on npm documented the API shape, and the first real run is listed in the TODO to check.
- **Reviews must quote the page.** Verification is applied only when every quoted fact is found on the fetched official page. Otherwise the listing stays unverified (decision 67).
- **Reports from people were dropped for public posts** (decision 42, superseding 28 and 39–41). Collecting screenshots and personal details wasn't worth the risk for a public directory.
- **Docs go in the same commit as the change.** BUSINESS-RULES, DECISIONS and CONVERSATIONS stay in step with the code. A later "update the docs" session should find little missing.
- **Keep private details out of outside requests.** The commit email must never appear in anything sent to an outside service. Run edits and commits as separate commands.

## X stopped answering and nothing said why (19 November)
The X step threw on a 401/403 and the run went on with the last saved results, which is right, but it saved nothing about the failure. The status page could only say "not refreshed for 14 h". Now `tools/x.mjs` keeps X's own reason (`last_error`, never the token) and the status page turns it into "Fix X access" with what to do. Lesson: when a source fails but the run carries on, save the reason where the status page can read it.

## New sources need the publisher mapping too (19 November)
Replicate's first run added 139 listings with raw account names ("google", "kwaivgi") and no country, because only Hugging Face accounts went through the publisher mapping. Lesson: every new source that creates listings goes through `applyPublisher`, and quick scans re-apply it to saved listings.

