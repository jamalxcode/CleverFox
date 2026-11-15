# Data snapshot, 15 November 2026

A frozen copy of the data CleverFox had collected on this day, for the record. Not used by the build. The live data refreshes on the `data` branch.

- `catalog.json`: the full published catalog. 1,195 listings: 859 models, 243 datasets, 55 apps and 38 hosts (14 API providers, 24 GPU hosts).
- `meta.json`: counts, countries, languages, runtimes, and the Google Play payment table.
- `imported-models.json`, `imported-datasets.json`: the Hugging Face and Ollama imports.
- `benchmarks.json`: independent benchmarks (Epoch AI, CC BY 4.0).
- `appstore.json`: the App Store check (34 official apps confirmed by seller, countries checked so far, look-alike counts).
- `recheck.json`: the access source-page re-check (fingerprints, words found, changes).
- `x.json`: X announcements and buzz. Post links, authors and counts only, never post text.

Left out: the provider list (`providers.json`, about 6 MB, rebuilt daily from public APIs).

Compared with the 14 November snapshot:
- **Listings:** apps went from 18 to 55 and hosts from 11 to 38.
- **Verified apps and hosts:** from 17 to 39.
- **Apps with known languages:** from 4 to 37.
- **New:** API providers per model, the App Store check, Google Play payment methods, and automatic fact checks.
