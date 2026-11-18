# PostyFox Frontend

The web app for PostyFox: write a post once and send it to many social platforms, now or on a
schedule. It runs on top of [postyfox-core](https://github.com/PostyFox/postyfox-core), which does
the posting.

## What you can do

- Connect accounts on Discord, Telegram, Bluesky, Tumblr, Instagram, the Fediverse, FurAffinity,
  Toyhouse, Ko-fi, SoFurry, DeviantArt, Artconomy and X.
- Compose a post with images or video, pick where it goes, and set each site's own options.
- Schedule posts, save drafts, and set reposts or deletions for later.
- Follow each post's progress and browse your history.
- Reuse templates, text snippets and tag presets.
- Create API keys, set up webhook triggers, and give someone else access to your account.

The interface is in UK English and translated through Crowdin.

## Quick start

You need Node.js 24 and the postyfox-core stack running locally.

```bash
npm install
npm start
```

Sign in once at <http://localhost:4180> as `postyfox` / `postyfox`, then open
<http://127.0.0.1:4200>. To run the frontend inside the full stack instead, see the
[development guide](./docs/DEVELOPMENT.md#run-the-whole-stack-spa--apis--auth).

## Build and test

```bash
npm run build
npm run lint
npm test
```

## Documentation

| Doc | For |
|-----|-----|
| [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) | Stack, running locally, translations, project layout |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | How auth works, the container, CI/CD, the Helm chart |
| [docs/OBSERVABILITY.md](./docs/OBSERVABILITY.md) | Browser tracing |
| [docs/DECISIONS.md](./docs/DECISIONS.md) | Why it's built this way (ADRs) |

## Releases

Current (production ready) releases can be found here on GitHub.
In development releases can be found on https://packages.neillans.co.uk, however, you should ONLY use these if you know what you are doing or have been asked to test something specific!

The packages server (packages.neillans.co.uk) is available through the great generosity of Inedo by providing us with an Enterprise License for our Open Source projects.
