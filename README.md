# Monsoon Traders

A local browser strategy game for one merchant versus a computer harbor master, or two people sharing a device. Each side owns six ports, seeded with four crates apiece. Sow cargo with the current trade wind, score at your own harbor, capture from the opposing port when your final crate reaches one of your own empty ports, and earn two coins when it lands at your marked contract port. Each fleet has a seeded spice market worth one coin when the last crate lands there. The wind reverses every four voyages. A final crate in your harbor earns another voyage. The game ends when a side empties or after 60 voyages, at which point remaining cargo is banked.

## Play

Open `index.html` in a browser, or upload the ZIP as an HTML5 game to itch.io with `index.html` at the archive root. If the browser restricts local storage under `file://`, serve the folder locally, for example `python3 -m http.server`.

For local two-player, create two profiles first. The game announces each merchant's turn before handing off the device. There is no hidden information in this game.

The game board is a fictional coast chart. Its translucent coastline and islands vary by match seed, while the twelve numbered ports and their route stay fixed. Amber ships mark ports 1–6 and teal ships mark ports 7–12. Tap a glowing port to launch its cargo. A coloured ship then visits each stop in wind order as the port counts change. Dotted flow lines show the current wind direction, and BANK markers show where each merchant scores while that wind blows. The wind reverses every four voyages, so the harbor entry moves to the other end of each merchant's shore. Use **Skip animation** to finish a long voyage immediately. The device's reduced-motion setting removes the movement while preserving the cargo and outcome readout.

## Orders and influence

Banking a crate grants one influence, up to six. Each fleet begins with two order cards, draws one after every third voyage of its own, and holds at most three. Spend influence to play at most one card before a voyage. Cards and effects are public for local play.

| Order | Cost | Effect |
| --- | ---: | --- |
| Mercenary blockade | 2 | A selected rival port cannot launch on its owner's next voyage. Cargo can still pass through. If it is their only occupied port, they can launch from it so play cannot stall. |
| Invoke Garuda | 1 | Call on Garuda to reverse your sailing direction for one voyage only. The global wind schedule is unchanged. |
| Naga's ward | 1 | A serpent spirit shields a selected occupied port from the next attempted capture; then the ward is spent. |
| Spice caravan | 2 | Add two crates to a selected owned port. |

These orders make short-term choices matter without adding a technology tree or more phases. Contract and market markers remain visible on the chart; no information is hidden from the other player.

## Mythic setting

Garuda and naga appear in traditions across South and Southeast Asia. The fictional coast draws on their imagery as a bird in the sky and a serpent associated with water. The wind-changing and capture-guarding powers are invented game mechanics, not claims about a particular tradition. The characters and art are original rather than reproductions of sacred or historic works. Background: [British Museum on Garuda in Thailand](https://www.britishmuseum.org/collection/object/A_1954-0715-21) and [Smithsonian National Museum of Asian Art on naga in Southeast Asia](https://asia.si.edu/explore-art-culture/collections/collections-areas/southeast-asian/sacred-sites-in-southeast-asia/naga-bridge-spean-ta-ong/).

## Saves and scope

Profiles and the last 30 completed matches per profile are kept in browser local storage. Profiles can be exported as JSON and imported on another device; importing replaces this game's current profiles. A match in progress is not saved across refreshes. There is no remote matchmaking, account, or server.

The sowing structure draws on a longstanding family of games. The reversing trade wind, moving contracts, art, text, and code are original to this release.
