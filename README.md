# Caption Check v0.2.3

Grammarly-style helper for Encord annotation captions, built against the real Encord label editor markup.

## Install / update
1. Unzip. In Chrome open chrome://extensions, turn on Developer mode, Load unpacked, pick this folder.
2. To update: replace the files, click the refresh icon on the extension card, reload the Encord tab.

## What it does (in Annotate mode)
- Underlines problems in the caption box (red = error, amber = check). Uses Encord's own hidden mirror of the box, so underlines line up.
- "Caption check" card (left side, click its title to collapse) with one-click fixes. Alt+Q applies the first fix.
- Badges on each Suggested caption card (clean / N to check / N errors) so you can pick with keys 1-3.
- Live counter in the card: "23 of 24 segments captioned" (with a bar). Counts every segment on the Detailed Caption timeline, whichever one you are on, so jumping around or pasting the same caption does not confuse it.
- Segments with no caption get a red outline on the timeline and are listed in the card (with a button to jump to each). Only in Annotate mode, not while segmenting.
- Before Submit: warns if segments are still awaiting review, have no caption, or contain errors. You can still submit.
- Checks: unfinished caption, caption ending in "and", repeated connectors, subject-verb agreement, simple present, missing object, vague words, ";" spacing, form/from and common typos, repeated words.
- An empty caption box is NOT flagged while you choose a suggestion.

## Suggest object name (optional; sends one frame to Google Gemini)
Click the button, paste a Gemini API key once. Get permission first: it uploads a frame.

## Knobs
- rules.js: BASE verb list, GLOSSARY, ALT_UNITS.
- background.js: MODEL name. If the screenshot fallback errors, add "<all_urls>" to host_permissions.
- node test.js prints how the rules judge sample captions.
