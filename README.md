# CleverFox

A global catalog of AI models, datasets, AI apps and AI hosting, built for people everywhere, not just the US.

- **Find it wherever it lives:** models from Hugging Face, the Ollama library and API-only providers; datasets from Hugging Face; web AI apps; and AI servers and hosting by data-center location. Obscure listings sit alongside well-known ones.
- **See if you can actually use it:** whether it's available in your country, whether it's free, and whether you can pay without a Visa or Mastercard (crypto, mobile money, UPI, Pix, app-store billing and more). Also whether a model runs locally, which languages it supports, and whether there's a data center near you.

CleverFox is a metadata directory. It links to official sources (model pages, papers, code, documentation) and never hosts model or dataset files. Every fact carries its source and the date it was checked.

**Live:** https://jamalxcode.github.io/CleverFox/ (custom domain cleverfox.sala.company planned).

**Status:** prototype. Hand-researched listings plus a daily import from Hugging Face and the Ollama library. Next: monitoring X for new announcements and feedback.

## Run it locally

```sh
npm run import   # fetch models and datasets from Hugging Face and Ollama (optional; behind a proxy set NODE_USE_ENV_PROXY=1)
npm run build    # validate everything and write the data files the page loads
npm run serve    # then open http://localhost:8000
```

## Docs

- [Specification](docs/SPECIFICATION.md): what CleverFox is, user journeys, competitors and how it works.
- [Decisions](docs/DECISIONS.md): what was decided and why.
- [Conversation log](docs/CONVERSATIONS.md): notes from design sessions.

## Roadmap

- **Phase 1:** models, datasets, top AI apps and hosting providers, with access and payment info, documentation links, a country picker, X monitoring for announcements and feedback, and warnings from public reports.
- **Phase 1.5:** more sources and apps, individual hosting offerings, and "will it run on my machine?".
- **Phase 2:** environment templates and short guides.
- **Phase 3:** timestamped pricing comparisons.

## License

Code: [MIT](LICENSE). Catalog data: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
