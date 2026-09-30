# Monsoon Traders

A local browser strategy game for one merchant versus a computer harbor master, or two people sharing a device. Each side owns six ports, seeded with four crates apiece. Sow cargo with the current trade wind, score at your own harbor, capture from the opposing port when your final crate reaches one of your own empty ports, and earn two coins when it lands at your marked contract port. Each fleet has a seeded spice market worth one coin when the last crate lands there. The wind reverses every four voyages. A final crate in your harbor earns another voyage. The game ends when a side empties or after 60 voyages, at which point remaining cargo is banked.

## Play

Open `index.html` in a browser, or upload the ZIP as an HTML5 game to itch.io with `index.html` at the archive root. If the browser restricts local storage under `file://`, serve the folder locally, for example `python3 -m http.server`.

Start with **Learn with two practice voyages** if you are new. The first voyage shows how crates move one at a time and how a crate at your BANK becomes a coin. The second sets up an empty owned port opposite rival cargo to teach a capture. Practice does not use a second profile or write a match record. Afterward, start a full match against the computer or return home.

For local two-player, create two profiles first. The game announces each merchant's turn before handing off the device. There is no hidden information in this game.

The game board is a fictional coast chart. Its translucent coastline and islands vary by match seed, while the twelve numbered ports and their route stay fixed. Amber ships mark ports 1–6 and teal ships mark ports 7–12. Tap a glowing port to preview its landing, score, capture, charter progress, and extra voyage. The numbered **Crate stops** below the chart show each drop in order; BANK means a coin is scored. Tap the same port again or use **Sail** to commit. A coloured ship then visits each stop in wind order as the port counts change. Dotted flow lines show the current wind direction, and BANK markers show where each merchant scores while that wind blows. The wind reverses every four voyages, so the harbor entry moves to the other end of each merchant's shore. Use **Skip animation** to finish a long voyage immediately. The device's reduced-motion setting removes the movement while preserving the cargo and outcome readout.

In full matches, **How does a voyage work?** is available above the chart as a quick reminder. Order cards are in an optional section below the score so the first decision stays focused on ports and cargo.

## Harbor charters

One public charter lasts for each four-voyage wind cycle. Both fleets can earn its two-coin reward once by completing its objective before the wind turns. The objectives rotate in a fixed sequence determined by the match seed:

| Charter | Objective |
| --- | --- |
| Harbor tribute | Bank two crates. |
| Spice passage | Finish a voyage at your own spice market. |
| Coast watch | Capture at least three rival crates. |

The charter panel shows each fleet's progress and the number of voyages remaining. A charter's reward is paid as soon as its goal is reached. The voyage preview includes the expected charter progress. Wind changes introduce the next charter in the log, and the result records how many charters the winning fleet fulfilled.

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
