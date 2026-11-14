# CleverFox

A global catalog of AI models, AI apps and AI hosting, built for people everywhere, not just the US.

- **Find it wherever it lives:** models from Hugging Face, Ollama, GitHub, Kaggle, ModelScope and API-only providers; web AI apps; and AI servers and hosting by data-center location. Obscure listings sit alongside well-known ones.
- **See if you can actually use it:** whether it's available in your country, whether it's free, and whether you can pay without a Visa or Mastercard (crypto, mobile money, UPI, Pix, app-store billing and more). Also whether it runs locally on your own machine, which languages it supports, and whether there's a data center near you.

CleverFox is a metadata directory. It links to official sources and never hosts model files. It will be a lightweight static site at https://cleverfox.sala.company, built by a scheduled pipeline on GitHub Actions. Facts carry their sources, and community reports are labeled as such.

**Status:** design stage, no code yet. Next: a seed prototype.

## Docs

- [Specification](docs/SPECIFICATION.md): what CleverFox is, user journeys, competitors and how it will work.
- [Decisions](docs/DECISIONS.md): what was decided and why.
- [Conversation log](docs/CONVERSATIONS.md): notes from design sessions.

## Roadmap

1. Thin launch: models (Hugging Face, Ollama, API-only), top AI apps and hosting providers, with access and payment info, community reports, scam warnings and a country picker.
1.5. More sources and apps, individual hosting offerings, and "will it run on my machine?".
2. Environment templates, datasets and short guides.
3. Timestamped pricing comparisons.

## Contributing

Issues and pull requests are welcome. For larger changes, open an issue first.

## License

Code: [MIT](LICENSE). Catalog data: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
