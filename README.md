# 🦊 CleverFox

![CleverFox mascot: a smiling fox in sunglasses](img/fox.webp)

> **AI you can actually use, wherever you live.**
> **Live:** https://jamalxcode.github.io/CleverFox/

Most AI directories assume you live in San Francisco, own a Visa card and a big graphics card, and speak English. CleverFox doesn't.

Tell the fox what you want to do, what you're using, and where you are. It sniffs through about **1,310 AI models, datasets, apps and hosting providers** and tells you what works for *you*:

- 🌍 Is it available in my country?
- 💳 Can I pay without a Visa or Mastercard? (mobile money, UPI, Pix, crypto, app stores, phone bill…)
- 🆓 Is it free, or free enough?
- 💻 Will it run on my laptop or phone, offline?
- 🗣️ Does it speak my language?

No sign-up. No tracking of you. Just answers, each with the source it came from.

---

## 🎯 Three questions, three picks

```
I want to [ code ▾ ]  on  [ my computer ▾ ]   ▶ SHOW MY PICKS
```

The fox gives you three picks in each lane: **run it yourself**, **apps**, and **use it online**. Every pick comes with the reasons it was picked: "fits 8 GB", "pay without a card", "🗣️ Swahili", "ECI 151 (Epoch AI)". There's no secret score, so you can see why.

Then it gives you **one clear next step**, "How to start with qwen2.5-coder →", with the exact command for your memory, or the app download buttons.

## 🧭 Every listing answers what people actually ask

| | |
|---|---|
| 🎯 **Good for** | chat, writing, coding, reasoning, images, speech, video, translation, search… |
| 💻 **Runs locally?** | formats, runtimes, and 🪟 Windows · 🍎 macOS · 🐧 Linux · 📱 phone · ☁️ cloud |
| 🖥️ **Hardware** | memory needed and recommended, and whether it fits *your* device |
| 🆓 **Free?** | free, free tier, trial or paid, with the limits |
| 💳 **How to pay** | every official way to pay, including Google Play's methods in your country |
| 🧠 **How smart** | independent benchmarks (Epoch AI), never mixed up with makers' own claims |
| 🕊️ **Barriers** | sign-in gates, license limits, country blocks, ✂️ uncensored variants flagged |
| 🌱 **Where it came from** | fine-tunes and copies traced back up the family tree to the original model |
| 👀 **What people say** | the most-liked posts on X, sorted into positive, critical and general |
| ▶️ **What people show** | YouTube reviews and walkthroughs, which play only when you press play |
| ☁️ **Use it online** | API providers that run it for you, with prices per million tokens |

Unknown means unknown. If no source says it, CleverFox doesn't make it up.

## 🔁 It gets more useful the more you come back

- **Picks remembered.** Come back, and your picks are already there, refreshed with today's catalog.
- **🆕 New for you since your last visit.** New listings matching your task, your device and your country. Not everything new, just what's new *for you*.
- **☆ Save** anything to find it again, and pick up where you left off.
- **🔎 Similar** listings on every page, and a helping hand when a search finds nothing ("remove *Free* → 34 results").
- **🔔 Optional reminders** in *your own* calendar, plus an RSS feed for each task. Delete the event and it's gone. CleverFox never sends you anything.

All of this lives in your browser. Download it, move it to another device, or wipe it whenever you like. There are no streaks, no badges and no endless scrolling, because the goal is to help you, not to keep you here.

## 📡 The fox never sleeps (well, three times a day)

A scheduled pipeline wakes up 3 times a day and goes hunting:

```
  𝕏  announcements, launches and reactions  ─┐
  🤗 Hugging Face new releases               ─┤
  📰 llm-releases.com                        ─┤
  🐙 GitHub new projects and releases        ─┼─▶ check ─▶ catalog ─▶ 🦊 site
  ▶️ YouTube makers' channels and reviews    ─┤
  🔁 Replicate new models (needs its token)  ─┤
  ☁️ OpenRouter · 📰 makers' news · 📄 papers ─┤
  🟧 Hacker News · 🦋 Bluesky · 📱 App Store ─┘
```

Once a day it also refreshes the big imports (Hugging Face, Ollama), API providers and prices, benchmarks, the App Store check, and a re-check of every access fact's source page. If a source fails, the last good data stays, and the footer tells you what's stale.

## 🔍 Trust, but verify

- **82 of 96 apps and hosts are verified:** their facts were compared with quotes from their official pages. The rest wear a ⚠️ "not yet verified" badge and stay out of picks and guides.
- **Every fact has a source** behind ⓘ, with the date it was checked.
- **Sites that block bots stay blocked.** The fox doesn't sneak in. Those listings simply stay unverified.
- **The App Store check** finds the official app and flags look-alikes.

## 😎 The look

A dark **Matrix terminal**: neon green, faint digital rain behind the header, and monospace labels. It's readable first: every colour passes WCAG AA, and the rain stops for anyone who prefers less motion. Prefer daylight? Tap 🌗 **In between** for a softer slate grey with colour-blind-friendly colours, or ☀️ **Light** for "terminal paper". The interface also comes in English, العربية, हिन्दी, Português, Bahasa Indonesia and Kiswahili.

## 🧰 Under the hood

- **Plain HTML, CSS and JavaScript.** No framework, no build step for the page, no backend. Hosted on GitHub Pages.
- **Node 22 pipeline** in GitHub Actions, started by cron-job.org, with no npm dependencies.
- **Every deploy is gated** by offline tests and a page check: no sideways scrolling on phones, and colour contrast in both looks.
- **Light on data:** each tab loads a slim list, and full details load only when you open a card.

### Run it yourself

```sh
npm run import                 # models and datasets from Hugging Face and Ollama (behind a proxy: NODE_USE_ENV_PROXY=1)
node tools/benchmarks.mjs      # independent benchmarks (Epoch AI; Artificial Analysis with AA_API_KEY)
npm run build                  # validate and write the data files, listing pages, feeds and sitemap
npm test                       # offline tests and validation
npm run serve                  # then open http://localhost:8000
```

## 📚 The fox's notebook

| Doc | What's inside |
|---|---|
| [Specification](docs/SPECIFICATION.md) | what CleverFox is, who it's for, user journeys and competitors |
| [Business rules](docs/BUSINESS-RULES.md) | every rule and number the code applies |
| [Interface rules](docs/INTERFACE-RULES.md) | how the pages look and behave |
| [Workflow](docs/WORKFLOW.md) | the daily pipeline and how changes are made |
| [Decisions](docs/DECISIONS.md) | 79 numbered decisions, each with the why |
| [Design ideas](docs/DESIGN-IDEAS.md) | built, planned, still open, and turned down (with reasons) |
| [Lessons learned](docs/LESSONS.md) | what broke or surprised us, so it doesn't happen twice |
| [Conversation log](docs/CONVERSATIONS.md) | notes from every design session |
| [TODO](docs/TODO.md) | what's next |
| [Snapshots](data/snapshots/) | dated copies of the data collected |

## 🧡 What CleverFox is *not*

It's a directory. It links to official sources and **never** hosts model files, runs AI, rents servers or takes payments. It lists only official ways to pay: no resellers, no gray-market top-ups, no tricks for getting around country restrictions.

## 📜 License

Code: [MIT](LICENSE). Catalog data: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Benchmark data from [Epoch AI](https://epoch.ai/benchmarks) (CC BY 4.0).

*Made by a curious fox for people everywhere.* 🦊
