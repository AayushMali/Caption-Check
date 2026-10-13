# Caption Check v0.3.0

Grammarly-style helper for Encord annotation captions, built against the real Encord label editor markup.

## Install / update
1. In Chrome, open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and pick this folder.
2. To update: replace the files, click the refresh icon on the extension card, and reload your Encord tab.

## What it does (in Annotate mode)
- Underlines problems in the caption box (red = error, amber = check). Uses Encord's own hidden mirror of the box, so underlines line up.
- **"Caption check" dashboard** with one-click fixes. `Alt+Q` (or `Option+Q` on macOS) applies the first fix without inserting special characters.
- **Word list exception support**: Click `Allow "<word>"` on any flagged unknown word, or type words into the card's "+ Allow" input to whitelist project-specific terms permanently across sessions (stored in `localStorage`).
- **Prepositional hand phrasing**: Supports sentences like *"passes it to the right hand"* or *"from the left hand"* without misidentifying the recipient hand as an unfinished clause.
- **Expanded vocabulary**: Pre-loaded with common robotics/workspace objects (`chair`, `table`, `string`, `box`, `cup`, `tool`, etc.) and action verbs (`fail`, `fails`, `attempt`, `try`, etc.), plus idle/status labels (`DO`, `ID`, `NU`, `FAIL`, `NA`).
- Badges on each Suggested caption card (clean / N to check / N errors) so you can pick with keys 1-3.
- Live counter in the card: "23 of 24 segments captioned" (with a progress bar).
- Segments with no caption get a red outline on the timeline and are listed in the card (with a button to jump to each).
- Before Submit: warns if segments are still awaiting review, have no caption, or contain errors. You can still submit.
- Checks: unfinished caption, caption ending in "and", repeated connectors, subject-verb agreement, simple present, missing object, vague words, ";" spacing, form/from and common typos, repeated words.

## Testing & Verifying
Run `node test.js` in the terminal to verify the rules against test captions.
