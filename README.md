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
- 👀 **What do people say?** reactions on X and ▶️ videos on YouTube; every listing has its own shareable page
- 🌱 **Where did it come from?** fine-tunes and copies are traced back to the original model

CleverFox is a metadata directory. It links to official sources and never hosts model files. Every fact carries its source and the date it was checked; "unknown" means no source states it.

Also:
- 🦊 **Find what to use:** tell it the task, your device, country and language, and it gives three picks with the reasons.
- 🚀 **How to start:** the exact command for your memory, and app download buttons.
- ☁️ **Use it online:** providers with prices.
- 🛒 **Google Play payment methods** in your country.
- ⚖️ **Compare**, 📚 guides and a 📖 glossary.
- 🆕 **New this week**, with RSS (and a feed per task).
- ⭐ **Your CleverFox:** save listings, pick up where you left off, see what's new for you since your last visit, and set an optional calendar reminder. All kept only in your browser.
- 🔎 **Similar listings** on every page, and help when a search finds nothing.

**Status:** live with about 1,240 listings: researched apps, hosting and API providers (82 of 96 verified against their official pages), plus models and datasets imported daily from Hugging Face and the Ollama library. New releases are tracked 3 times a day on X, Hugging Face, llm-releases.com, GitHub, YouTube and Replicate (Replicate once its token is added). What's left to do is in [docs/TODO.md](docs/TODO.md).

## Docs

- [Specification](docs/SPECIFICATION.md): what CleverFox is, user journeys, competitors and how it works.
- [Business rules](docs/BUSINESS-RULES.md): every rule and number the code applies.
- [Workflow](docs/WORKFLOW.md): the daily pipeline, the data flow and how changes are made.
- [Decisions](docs/DECISIONS.md): what was decided and why.
- [Conversation log](docs/CONVERSATIONS.md): notes from each design session.
- [Outstanding tasks](docs/TODO.md): what's left to do.
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
