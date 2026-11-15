# CleverFox: workflow

How the data flows, what runs when, and how changes are made. Rules and numbers are in [BUSINESS-RULES.md](BUSINESS-RULES.md); why each choice was made is in [DECISIONS.md](DECISIONS.md).

## 1. The daily pipeline

`.github/workflows/pages.yml` ("Import and deploy") runs **three times a day**. cron-job.org starts it at 03:41, 11:41 and 19:41 UTC through GitHub's API, as Flattery does: `POST https://api.github.com/repos/jamalxcode/CleverFox/actions/workflows/pages.yml/dispatches`, body `{"ref":"main"}`, with a fine-grained token limited to this repo (*Actions: read and write*). GitHub's own schedule (05:07, 13:07, 21:07) is a late backup.

Every scan (quick and full) also runs `tools/discover.mjs`: Hugging Face new releases, llm-releases.com, GitHub new projects and watchlist releases (with the workflow's own GitHub token).

`tools/mode.mjs` decides each run's mode:
- **full:** the first run 20 or more hours after the last full refresh. It does every step below.
- **x:** the other runs, a quick scan. It does the X scan, then `import.mjs --x-only` (fill in models and datasets announced on X from Hugging Face) and `providers.mjs`, then build, save and deploy.
- A manual run can force `full` or `x`.

In order:

1. **Restore** the last imports from the `data` branch into `data/imported/`.
2. **X scan** (`tools/x.mjs`, needs the `X_BEARER_TOKEN` secret; the read budget is the `X_MONTHLY_READS` variable). It finds announcement posts linking to Hugging Face or Ollama, and reads posts about a rotating batch of listings (tone, likes, "praised"). Output: `x.json`, `x-state.json`.
3. **Import** (`tools/import.mjs`). Hugging Face models and datasets and the Ollama library, with the inclusion, gap and quality rules. New models announced on X can come in too. Output: `models.json`, `datasets.json`.
4. **Benchmarks** (`tools/benchmarks.mjs`): Epoch AI, plus Artificial Analysis if `AA_API_KEY` is set. Output: `benchmarks.json`.
5. **Use it online** (`tools/providers.mjs`): which API providers serve each model, with prices, from Hugging Face's provider mapping and OpenRouter's model list. Output: `providers.json`.
6. **App Store check** (`tools/appstore.mjs`): confirms official App Store ids by seller, checks which countries' App Stores carry them (rotating), and counts look-alike apps. Output: `appstore.json`.
7. **Access re-check** (`tools/recheck.mjs`). It fingerprints the source pages of every access fact (pricing, payments, countries) and notes changes and pages that are gone. Output: `recheck.json`.
8. **Test and build** (`npm test`, `npm run build`):
   - validate every record;
   - curate: apply the corrections file, the dataset quality bar, and group re-uploads under their original;
   - attach benchmarks, X buzz and re-check results;
   - derive answers and hardware;
   - write the slim list files, `catalog.json`, a page and `record.json` per listing, the sitemap, and pages for grouped or hidden listings.
9. **Save** `data/imported/*.json` to the `data` branch as one overwritten commit, so daily changes don't grow the history.
10. **Assemble and deploy** the public files only (`data/seed/` stays private because it holds research notes), with `__BUILD__` replaced by the commit id.

**Safety rules:**
- Every step keeps the last good data if a source fails or shrinks below 80%.
- X and the re-check are skipped or degrade quietly without their secrets or network.
- A push to `main` runs only steps 1, 8 and 10: it builds and deploys what's committed, without importing.

## 2. Data flow

```
Hugging Face, Ollama ─┐
X (posts) ────────────┼─> data/imported/*.json ─┐
Epoch / AA ───────────┤   (data branch)         │
source pages ─────────┘                         ├─> tools/build.mjs ─> data/*.json, l/**, sitemap ─> GitHub Pages
data/seed/*.json (researched, in main) ─────────┤
data/corrections.json (hand fixes, in main) ────┘
```

- **Seed records** (`data/seed/`): researched apps, hosts, API providers and some models. These are the source of truth for access facts. Each record has `research_notes`, which are stripped before publishing.
- **Imported records**: regenerated daily and never edited by hand. To fix one, use `data/corrections.json`.
- **Generated files** (`data/*.json`, `l/`, `new/`, `feed.xml`, `sitemap.xml`): built at deploy time and not committed. `.gitignore` ignores `data/*.json`, so a hand-kept file there (like `corrections.json` or `app-stores.json`) needs an exception line, or it never reaches the repo.

## 3. How changes are made

Work happens in Claude Code sessions and is pushed straight to `main`, which deploys within minutes.

**Code or design change:**
1. Change the code.
2. Run `npm test`, plus `npm run build` and a browser check (`npm run serve`, `node tools/phone-check.cjs`).
3. Update the docs in the same commit:
   - BUSINESS-RULES for any rule or number;
   - DECISIONS for what was decided and why;
   - SPECIFICATION if the design changed;
   - CONVERSATIONS for the session;
   - CLAUDE.md for new files or commands.
4. Push to `main` and check the deploy succeeded.

**Researching new listings** (apps, hosts, API providers):
1. Brief researchers in parallel, one per region or kind. Each writes records in the seed format with a source for every fact, and validates them with `node tools/build.mjs --check` in a scratch copy.
2. Review before merging. Remove anything that breaks the access rules:
   - card checkouts presented as non-card payment;
   - methods that only apply to another edition of a product;
   - generic wrapper apps;
   - guesses.
   Note each removal in the record's `research_notes`.
3. Records are `verified` only when the official page was actually read; otherwise they're `candidate`. The daily re-check then watches their source pages.

**Verifying listings** (decision 67):
1. Start **Fetch pages for verification** in GitHub Actions. It renders JavaScript-only pages in a headless browser, never gets around sites that refuse bots, and saves what it has after 35 minutes. (tick "all" to include verified listings for a re-check). It saves each listing's official pages as readable text to the `pages-cache` branch.
2. Bring them into the session: `git fetch origin pages-cache` and `git archive FETCH_HEAD | tar -x -C <dir>`.
3. Review in groups, comparing every stated fact with the pages and quoting each confirmation or correction exactly.
4. Apply with `node tools/apply-verification.mjs --pages <dir> --date <YYYY-MM-DD> <review files>`, which rejects any listing with a quote that isn't on its page.
5. Run `npm test`, which includes the 30-word description limit, then commit.

**Fixing or removing a listing:** add an entry with a reason to `data/corrections.json`:
- `hide` to remove a listing;
- `merge` to list it as another version of another listing;
- `keep` to list a dataset despite the quality bar.

Its old page then explains where it went.

**Saving the data on request:** copy the current catalog, imports and benchmarks into `data/snapshots/<date>/`.

## 4. Settings

| Setting | Where | What it does |
|---|---|---|
| `X_BEARER_TOKEN` | repo secret | Turns on X scanning |
| `X_MONTHLY_READS` | repo variable | Monthly X read budget (default 10,000; set to 2,000) |
| `HF_TOKEN` | repo secret (optional) | Higher Hugging Face rate limits |
| `AA_API_KEY` | repo secret (optional) | Artificial Analysis benchmarks |
| `X_POST_ENABLED` | repo variable (optional) | `true` turns on the weekly X post |
| `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET` | repo secrets (optional) | X posting keys (OAuth 1.0a, read and write) for the weekly post |

X credits are shared with another project on the same X account, so keep the read budget modest and set a billing cap in the X developer portal.
