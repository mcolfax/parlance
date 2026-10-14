# Parlance

A German, Latin American Spanish and Italian course from A1 to C2, built to replace paid language apps. It has lessons, illustrated stories, a tutor you can talk to, spaced review, daily quests, Pip the parrot, an intro film and a theme song. It runs as a Claude artifact and keeps each learner's progress in their own account.

- **App:** https://claude.ai/artifact/8ZNHqMUCms2THTSfDkTp72 (private until shared from its Share menu)
- **How it's built:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- **Working on it with Claude Code:** [`CLAUDE.md`](CLAUDE.md)
- **Design system:** open `styleguide.html` in the preview

```sh
npm ci
npm test          # end-to-end tests, must end with FAIL 0
npm run preview   # http://127.0.0.1:8765/_preview.html
```

The theme song, "ABC Adventure", is in `media/`.
