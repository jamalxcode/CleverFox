# CleverFox

![CleverFox mascot](img/fox.webp)

A global catalog of AI models, datasets, web AI apps and AI hosting, built for people everywhere, not just the US. **Live:** https://jamalxcode.github.io/CleverFox/

For every listing, CleverFox answers the questions people actually ask:

- 🎯 **What is it good for?** chat, writing, coding, reasoning, images, speech, search and more
- 💻 **Can I run it myself?** local formats, and 🪟 Windows · 🍎 macOS · 🐧 Linux · 📱 phone · ☁️ cloud
- 🖥️ **What hardware do I need?** memory needed and recommended per size, and whether it fits your device
- 🆓 **Is it free?** And 💳 can I pay without a Visa or Mastercard (crypto, mobile money, UPI, Pix, app stores)?
- 🧠 **How smart is it?** independent benchmarks (Epoch AI), kept separate from publishers' own claims
- 🕊️ **Any barriers?** sign-in gates, license limits, country blocks; ✂️ uncensored variants flagged
- 👀 **What do people say?** a live X search for reactions; every listing has its own shareable page

CleverFox is a metadata directory. It links to official sources and never hosts model files. Every fact carries its source and the date it was checked; "unknown" means no source states it.

**Status:** prototype with about 1,100 listings: hand-researched apps and hosting, plus models and datasets imported daily from Hugging Face and the Ollama library. Next: monitoring X for announcements and feedback.

## Docs

- [Specification](docs/SPECIFICATION.md): what CleverFox is, user journeys, competitors and how it works.
- [Business rules](docs/BUSINESS-RULES.md): every rule and number the code applies.
- [Decisions](docs/DECISIONS.md): what was decided and why.
- [Conversation log](docs/CONVERSATIONS.md): notes from each design session.
- [Data snapshots](data/snapshots/): dated copies of the data collected.

## Run it locally

```sh
npm run import                 # models and datasets from Hugging Face and Ollama (behind a proxy: NODE_USE_ENV_PROXY=1)
node tools/benchmarks.mjs      # independent benchmarks (Epoch AI; Artificial Analysis with AA_API_KEY)
npm run build                  # validate and write the data files, listing pages and sitemap
npm run serve                  # then open http://localhost:8000
```

## License

Code: [MIT](LICENSE). Catalog data: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Benchmark data from [Epoch AI](https://epoch.ai/benchmarks) (CC BY 4.0).
