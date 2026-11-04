---
name: flow-voices
description: Record Parlance's unrecorded voice lines with dev/voices.js, commit them to main and publish them to the artifact. Run by a one-off task that the flow cycle schedules in the Default environment (which holds the Google Text-to-Speech key) when the cycle's own environment couldn't record, or by hand when Matt asks to record the voices.
---

# Record and ship the voices

The flow's scheduled cycles run in an environment that can't reach Google's voice service, so they hand recording to this one-off job in the **Default** environment. It needs no connectors: git, Node, the proxy that adds the key, and the Artifact tool. Read `CLAUDE.md` ("Recorded voices" under shipping) and `docs/ARCHITECTURE.md` ("Recorded voices") first.

**Never cost Matt anything.** `dev/voices.js` stops at 900,000 characters a month, under Google's free million. Never raise that cap, edit the script, split a run to get around it, or use another key or service.

1. **Code.** If the repo isn't checked out, attach it with add_repo (owner mcolfax, repo parlance, access push), clone it, and call register_repo_root. Then `git checkout main && git pull --ff-only origin main && npm ci`.
2. **Count.** `node dev/voices.js --dry`. If every language says 0 to record, report "No voice lines were waiting." and stop.
3. **Record.** `node dev/voices.js > "$SCRATCH/voices.log" 2>&1; tail -20 "$SCRATCH/voices.log"` (your scratchpad; a 15-minute timeout).
   - "Google turned the key down", `API_KEY_INVALID` or a 403 from Google: the key in the Default environment's network secrets is bad. Stop and report: "The Google Text-to-Speech key in the Default environment is refused, so <n> voice lines still use the phone's voice. To fix it, replace the key under the environment's network secrets for texttospeech.googleapis.com (header X-Goog-Api-Key)."
   - It stopped for the monthly cap: report how many lines wait and that the month resets on the 1st (Pacific time).
4. **Check.** `node dev/voices.js --dry` shows 0 left, and `mkdir -p flow/shots && NODE_OPTIONS=--max-old-space-size=6144 npm test > flow/shots/test.log 2>&1; tail -12 flow/shots/test.log` ends with `FAIL 0` (it takes 15–20 minutes: a 30-minute timeout).
5. **Commit and push.** `git add media/voice dev/voice-usage.json`, commit to `main` as `Voices: <n> new lines (de <a>, es <b>, it <c>)` with the attribution lines your session's instructions give, and push (retry on a network failure: 2s, 4s, 8s, 16s). Vercel deploys the web version from it.
6. **Publish to the artifact** with the Artifact tool: `file_path` the absolute path to `index.html`, `url` `https://claude.ai/artifact/8ZNHqMUCms2THTSfDkTp72`, and `files` only the voice files that changed (`git diff --name-only HEAD~1 -- media/voice`), each mapped from its repo path to its absolute path. Leave `capabilities` out. If the publish is refused because the published files differ from what this session has seen, read them (`read` with `paths`), check the differences, then publish.
7. No version bump and no `latest` change: the app picks the new clips up the next time it loads.
8. **Report** in one or two lines (send a push notification if the tool is available): how many lines were recorded in each language, this month's total against the 900,000 cap, and the commit.
