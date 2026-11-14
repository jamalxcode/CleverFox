# Data snapshot: 14 November 2026

A frozen copy of everything CleverFox had collected on 14 November 2026, kept in the repo for the record. The live data refreshes daily and lives on the `data` branch (see `docs/BUSINESS-RULES.md`, section 9). This folder is not used by the build.

## Files

| File | What it is |
|---|---|
| `catalog.json` | The full published catalog as built that day: every listing with its computed answers, hardware estimates, platforms and matched benchmarks. Seed research notes are stripped. |
| `meta.json` | Counts, the country list, runtime documentation links and benchmark source credits. |
| `imported-models.json` | Raw import of models from Hugging Face and the Ollama library (`tools/import.mjs`). |
| `imported-datasets.json` | Raw import of datasets from Hugging Face. |
| `benchmarks.json` | Independent benchmark results from Epoch AI (`tools/benchmarks.mjs`), keyed by normalized model name. |

The hand-researched seed records are in `data/seed/` and publisher countries in `data/publishers.json`.

## What it contains

- **1,135 listings:** 874 models, 232 datasets, 18 web AI apps, 11 hosting providers.
- **Model sources:** 664 from Hugging Face, 189 Ollama-only families, 21 hand-researched.
- **Local use:** 446 models run locally, 596 have hardware estimates, and 61 run on phones.
- **Access:** 510 models have no barriers; 85 are uncensored or abliterated variants.
- **Languages and publishers:** 237 models cover non-English languages; 370 listings have a publisher country (from Wikidata or research).
- **Benchmarks:** 52 models have independent results (Epoch AI); 57 have self-reported results.
- **Good for, by model count:**
  - writing 437, chat 408, vision 203, speech 132, tools 125, reasoning 104;
  - images 73, search 60, translation 47, coding 33, video 29, math 8.

## Licenses and credit

- **Catalog data:** CC BY 4.0, credited to CleverFox.
- **Epoch AI data:** CC BY 4.0, credit "Epoch AI, 'Capabilities & benchmarking', https://epoch.ai/benchmarks".
- **Third-party facts:** each keeps its source link and the date it was checked.
