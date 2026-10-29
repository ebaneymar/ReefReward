# Summative artwork

The six matching royal pair sheets supplied by the teacher are used for this collection. The heart pair also matches the separately attached reference. Original point-reward artwork is unchanged.

Each atlas was prepared with the built-in image-generation tool in edit mode, with `transparent_background: true`. The requested edit removed the gray/white backdrop and ground shadows, kept the existing faces, colors, crowns, pearls, books, symbols, fins and tails, separated the male and female into individually selectable sprites, and oriented both to the right. No replacement characters were requested. Sprite regions select the two characters from each transparent atlas without changing its stored pixels.

| Pair | Saved project asset | Character names |
| --- | --- | --- |
| Hearts | game-src/artwork/summative-hearts.png | Aurelian Heartfin / Rosalune Heartfin |
| Letters | game-src/artwork/summative-letters.png | Lexicon Tidekeeper / Lyrabelle Scrollfin |
| Infinity | game-src/artwork/summative-infinity.png | Infinitus Starweaver / Eternelle Orbitfin |
| Heritage | game-src/artwork/summative-heritage.png | Hiraya Goldweave / Mutya Pearlweave |
| Sun & Stars | game-src/artwork/summative-sunstar.png | Lakan Suncrest / Tala Starcrest |
| Celestial Scholars | game-src/artwork/summative-scholars.png | Astraeus Lorefin / Seraphina Lorefin |

## Editing prompt set

All prompts specified background extraction of the exact supplied pair, true alpha transparency, male on the left and female on the right, both facing right, full crowns and tail tips, no redesign, no new characters, no scenery, no captions, and no painted checkerboard. They also specified these invariants for each sheet:

- Hearts: red/gold male and pink/gold female; original heart crowns, heart gems, pearl ornaments, scales and flowing fins.
- Letters: blue/gold male with book and quill; cyan/lavender female with scroll and pearls; recognizable letter ornaments after mirroring.
- Infinity: deep blue/cyan male and lavender/cyan female; infinity jewels, geometric constellations, pearl planets and golden armor.
- Heritage: crimson and cream scales, golden woven fin patterns, pearl sun crowns, flowers and pearl chains.
- Sun & Stars: red, blue, white and gold fins, radiant sun crowns, pearls and golden star chains.
- Celestial Scholars: blue/gold male and pink/lavender female, golden books, planets, letters, infinity motifs and heart jewels; extra-wide atlas with transparent spacing.

The game embeds all six images for offline play. Faces stay rigid while fins, tails and hair flow using the existing bounded swimming mesh and pose cache. Powers and themed trail glyphs are drawn by the offline canvas renderer.
