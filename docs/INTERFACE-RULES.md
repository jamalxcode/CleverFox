# Interface rules

How CleverFox's pages look and behave. Follow these when changing `index.html`, `style.css`, `app.js`, `render.js`, `you.js` or any page the build writes. The exact numbers the code applies are in [BUSINESS-RULES.md](BUSINESS-RULES.md) section 11, and the reasons are in [DECISIONS.md](DECISIONS.md). Update this file in the same commit when an interface rule changes.

## 1. Purpose comes first

- **The page answers what people ask** (decision 45): good for, runs locally, free, how to pay, where it works, hardware, how smart, barriers. Answers sit on the card and in the details, each from stated data. Unknowns are gathered into one "❓ Unknown:" line, never guessed.
- **Usefulness over time spent** (decision 77). People come back because something new fits their task, device and country, or to get back to what they found. Never add a feature only to keep people on the page.
- **One page per listing, no page per filter combination.** Listing pages are shareable and previewable, and filters live in the main page.

## 1a. Answers at a glance (decision 79)

- **Every card and listing page leads with the verdict strip:** what it means for *you*, in plain words, with ✓ yes, ✗ no, ! maybe, ? not stated, • information and → a prompt. It covers device fit, your country, free, pay without a card, sign-up and license, and your language. Verdicts only restate stated facts. Each one has words after its icon.
- **Then a plain one-sentence description.** Template descriptions are replaced by what the model does ("Turns speech into text"). The original description is kept under it on listing pages.
- **At most 3 positive badges.** Warnings always show. Raw details (license once, size, platforms in words, downloads) go in one quiet grey line.
- **Facts are labelled rows** (label: value), not emoji sentences. Jargon gets a small "?" link to the glossary.
- **Country-specific facts follow the chosen country.** A payment method noted for other countries is shown as "(not for <country>)" and never counts as a way for you to pay.

## 2. One primary action per screen

- **Main page:** the question bar ("I want to … on …", then "Show my picks") is the main action, right under a one-sentence intro. Device, country and AI language are its setup pickers. The interface language is a small 🌐 in the header, kept apart from "AI that speaks". Picks show on every visit without a link. Browsing the tabs is secondary.
- **Filters fold:** search and the capability chips are visible, and the rest sits behind "⚙️ Filters (n)", which opens by itself when filters are in use. On phones the chips are one sideways row and the tabs a 2×2 grid.
- **After picks:** the one main step is "How to start with <top pick> →", which links to `#start` on its page. "Show my picks" turns into a quiet outline button until the question changes. Compare and ☆ Save are secondary buttons.
- **Details and listing pages:** the order is the action row (☆ Save · ⚖️ Compare · 📤 Share ▾ · More ▾), then How to start, then "🌍 Using it in [country]", then the labelled facts, then links and sources. The X and YouTube summaries appear once: in the side panels on listing pages, and in the details on the main page.
- **Listing pages redraw for the visitor** using their stored device, country and language. The "Using it in" box has its own country picker, so nobody is sent back to the main page.
- **Primary styling:** the bright filled button (`.go-btn`) is for the one primary action only. Everything else uses `.share-btn` (outlined) or `.linkish` (text).

## 3. Sensible defaults, little setup

- **Choices are remembered** in the browser: device memory, country, language, look, the last picks question, and the last tab, search and filters.
- **The setup line** shows ✓ for what's set and ○ for what's missing, each with one tap to fix it. The country suggested from the browser's language is offered as one tap and never set by itself.
- **Returning visitors** see their picks again without a tap, refreshed with today's catalog.
- **A link's hash wins over remembered state** (`#start=…`, `#compare=…`, `#app`), so shared links show exactly what was shared.

## 4. Every result leads somewhere, and every stop is clear

- **Empty results:** offer the filter to remove, with how many results it would bring back, other tabs with matches, and "clear all filters". Never just "no results".
- **Empty pick column:** offer the nearest alternative (use it online, my computer, chat).
- **After a listing:** "Similar" (up to 4, with what they share) and "Original" for derived models.
- **No endless scrolling and no autoplay:** "Show more" stays a button, and videos play only when pressed.

## 5. Rewards are useful facts, never games

- **Allowed:** reasons on every pick ("fits 8 GB", "pay without a card", "🗣️ Swahili"), "New for you since <date>", setup progress, and ⭐ highlighting of what suits you.
- **Never:** badges, points, streaks, countdowns, fake scarcity, random rewards, or warnings that progress will be lost.

## 6. Personal data stays with the person

- **Personal things live only in localStorage:** saved listings, recently viewed, visits and reminders, in `cf_you` (`you.js`). Device, country, language and look each have their own key. Nothing personal is sent to analytics or anywhere else.
- **The visitor controls their data:** "Download my data", "load it on another device" and "clear it" are always available in "Your CleverFox".
- **Analytics:** GoatCounter counts page views and a few anonymous events (picks shown, empty searches with the filters used). Never the words typed, and never anything about the person.
- **Third-party content loads only on request:** X posts after "Show the posts", YouTube after "▶ Play here" (youtube-nocookie.com). Thumbnails and widgets don't load by themselves.
- **Reminders are the visitor's own:** a calendar event (.ics) and RSS feeds. CleverFox has no accounts and sends nothing.

## 7. Honest labels

- **Every fact links to its source** behind ⓘ, with the date it was checked.
- **Unchecked apps and hosts** show "⚠️ Not yet verified" as their first badge, with a dashed border, and are kept out of picks and guides.
- **Estimates say so:** "≈ 4 GB+ recommended (estimate)". Publishers' own benchmark scores say "self-reported".
- **Content found by search** (YouTube reviews, X posts, launches spotted on X) is labeled "not reviewed by CleverFox", and tone sorted by word rules is called "a rough guide".
- **A listing is never named after something it only copies:** derived models show their relation ("fine-tune of …") and their original.

## 8. Look and feel (decision 72)

- **Matrix look by default:** dark terminal colours, neon green accents (cyan and magenta for secondary marks), monospace for headings, labels, chips and buttons, and the sans-serif Inter for body text.
- **Three looks** (decision 80): Dark (Matrix, the default), In between (dim slate: flat background, no scanlines, faint rain, no glow) and Light ("terminal paper"). They're chosen with the 🌓 picker in the header and stored as `look` (`''`, `dim`, `light`). Every page sets it before drawing. The browser's light/dark preference doesn't choose the look.
- **Decoration never costs readability:** the digital rain sits behind the header only, faintly, pauses when the tab is hidden, and is off for reduced motion and in light mode. Scanlines are faint and off in light mode.
- **Colour roles:** green means good (✓ verdicts, positive badges) and the one primary button. Links are cyan, warnings amber, problems pink-red. Headings use the text colour. Badges, verdicts and facts use the body font, and monospace is kept for headings, labels, buttons and commands.
- **Colours are tokens** on `:root` (`--bg`, `--surface`, `--text`, `--muted`, `--accent`, `--accent-text`, `--ok`, `--no`, `--warn`, …), redefined for light mode. Never hard-code a colour in a component.
- **Emoji lead lines and badges** as signposts (🎯 good for, 💻 runs locally, 🆓 free, 💳 pay, 🕊️ no barriers, 🔒 only for real gates). They are never the only carrier of meaning: text always follows.
- **The fox mascot** is the brand. It appears in the header and on empty states.

## 9. Accessibility and phones (checked before every deploy)

- **Contrast:** WCAG AA in all three looks, checked by axe-core in `tools/ui-check.cjs` on 8 pages, including a returning visitor's "Your CleverFox" panel.
- **`[hidden]` always hides** (`display: none !important`), so a component's own display rule can't reveal it.
- **No sideways scrolling at 320 and 375 px** (`tools/ui-check.cjs`; four phone sizes in `tools/phone-check.cjs`). Long names wrap (`overflow-wrap: anywhere`).
- **Phones:** the side panels (X, YouTube) drop below the listing under 900 px. Pick columns stack.
- **Keyboard and screen readers:** tabs use `role="tab"` with arrow keys. Toggle buttons use `aria-pressed` (capabilities, ☆ Save). Live regions announce picks and result counts. Every control has a label or `aria-label`. Touch targets are at least about 28–40 px.
- **Motion:** respect `prefers-reduced-motion` (no rain, no blinking cursor, no card transitions).

## 10. Words

- **Plain language for people anywhere:** short sentences and everyday words. Terms are explained in the glossary ("what's a token?").
- **The interface comes in 6 languages** (`i18n.js`: en, ar, hi, pt, id, sw), as drafted translations to be reviewed by native speakers. New interface text is written in English first and added to `i18n.js` (the return-visit text is still to do; see TODO).
- **Say what something is and what to do:** "Choose your country to see what works there", not "Missing parameter".
- **Numbers are rounded for reading** (23.7M downloads, ~4 GB), with exact values in the sources.

## 11. Performance

- **First load under 200 KB,** excluding the search index. Each tab loads only its own slim list, 50 listings at a time, and details are built when a card opens (`record.json`).
- **No framework, no build step for the page.** Vanilla HTML, CSS and JavaScript modules. `?v=__BUILD__` stays on asset links (CI replaces it).
