# Monsoon Traders

A complete local browser strategy game for one merchant versus a computer harbor master, or two people sharing a device. Each side owns six ports, seeded with four crates apiece. Sow cargo with the current trade wind, score at your own harbor, capture from the opposing port when your final crate reaches one of your own empty ports, and earn two coins when it lands at your marked contract port. The wind reverses every four turns. A final crate in your harbor earns an extra turn. The game ends when a side empties or after 60 turns, at which point remaining cargo is banked.

## Play

Open `index.html` in a browser, or upload the ZIP as an HTML5 game to itch.io with `index.html` at the archive root. If the browser restricts local storage under `file://`, serve the folder locally, for example `python3 -m http.server`.

For local two-player, create two profiles first. The game announces each merchant's turn before handing off the device. There is no hidden information in this game.

## Saves and scope

Profiles and the last 30 completed matches per profile are kept in browser local storage. Profiles can be exported as JSON and imported on another device; importing replaces this game's current profiles. A match in progress is not saved across refreshes. There is no remote matchmaking, account, or server.

The sowing structure draws on a longstanding family of games. The reversing trade wind, moving contracts, art, text, and code are original to this release.
