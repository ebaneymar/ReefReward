# Reef Rewards

Offline Windows classroom aquarium, with an Update game button in the header and fullscreen tank.

## Play and save

Download Reef_Rewards_Windows.exe from the latest GitHub release. Keep the EXE and open it for offline play. Progress autosaves after changes. Use Settings → Export backup for an extra JSON copy, and Restore backup to recover it or move to another computer. When moving from an HTML file, export from the old file and restore once in the Windows app. Close an older Reef Rewards window before opening a new EXE.

The update source is preconfigured to ebaneymar/ReefReward. The game checks automatically on startup. Click **Update game**, then **Install update & restart** when an update is ready. Classroom data remains on the teacher's computer; game publishing does not upload student records.

## Automatic publishing

A push to main that changes game source, artwork, desktop code, tests or the release workflow runs the checks, builds the Windows app and content update, and publishes both with a matching update manifest. Version numbers are assigned automatically as 1.1.<workflow run number>. Releases remain drafts until all assets finish uploading. Published versions are immutable; a failed build leaves the previous update available.

The repository token is supplied by GitHub Actions only. No publishing credentials are shipped in the game. Download assets and the update source use this public repository's releases.

## Source and artwork

The editable game is game-src/game.template.html. Artwork is stored without changing its original bytes under game-src/artwork; game-src/artwork.json records each checksum. Run `python3 scripts/assemble-game.py` before playing, testing or building from source. It creates app/game.html with all images embedded, so the delivered game still works completely offline as one HTML file. If editing the assembled HTML, run `python3 scripts/decompose-game.py` to sync it back into repository source before committing.

Build requirements: Node.js 24, Python 3 and npm. Run `npm ci --ignore-scripts`, then `npm test`. The GitHub workflow handles normal releases. scripts/build.py checks the official Electron 45.0.0 Windows x64 runtime against a pinned checksum.

Existing points, collections, reusable limited fish, negative growth, Mystery Diver, classroom tools and backups are preserved. The Windows package is unsigned. The Linux release pipeline checks code, saves and packaging; it does not launch Windows itself.
