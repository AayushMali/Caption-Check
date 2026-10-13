# Caption Check v0.3.0

A Grammarly-style Chrome extension for Encord video & robotic manipulation annotators. It automatically detects grammatical errors, forbidden symbols, vague words, and uncaptioned segments in real time directly within the Encord label editor.

---

## 🚀 Installation Guide (For Annotators)

### Step 1: Download the Extension
Choose **one** of the following options:

* **Option A (No Git needed - Recommended for non-technical annotators):**
  1. Visit the GitHub repository: [https://github.com/AayushMali/Caption-Check](https://github.com/AayushMali/Caption-Check)
  2. Click the green **`<> Code`** button and select **Download ZIP**.
  3. Extract (unzip) the downloaded zip file on your computer.

* **Option B (Using Git):**
  ```bash
  git clone https://github.com/AayushMali/Caption-Check.git
  ```

---

### Step 2: Load into Google Chrome

1. Open Google Chrome (or any Chromium browser like Brave or Edge).
2. In the address bar, type `chrome://extensions` and press **Enter**.
3. Toggle on **Developer mode** in the top-right corner of the page.
4. Click the **Load unpacked** button in the top-left corner.
5. In the file picker, select the `caption-check` folder (the folder containing `manifest.json`).
6. You will see **Caption Check** appear in your extension list! 🎉

---

### Step 3: Updating the Extension
When an update or bugfix is released:
1. Replace/pull the files in your local folder (`git pull` or extract the new ZIP into the same folder).
2. Go back to `chrome://extensions`.
3. Find **Caption Check** and click the **🔄 Refresh** icon on the card.
4. Reload your Encord annotation tab.

---

## ✍️ How to Use It During Annotation

Once installed, **Caption Check** runs automatically in the background on any Encord annotation tab (`https://*.encord.com/*`).

### 1. Real-Time Wavy Underlines
As you type in the **Segment caption** text box, issues are underlined automatically:
* 🔴 **Red Wavy Underline (Error)**: Critical problems that need fixing (forbidden symbols, invalid status labels, subject-verb disagreement, missing objects, unfinished clauses).
* 🟠 **Amber Wavy Underline (Check / Warning)**: Vague terminology (`something`, `various`), spacing mistakes, or unlisted words.

### 2. Instant One-Click Fixes (`Alt + Q` / `Option + Q`)
* **Dashboard (Bottom Right)**: Displays all issues in the active segment, uncaptioned frames, and quick fix buttons.
* **Mini Card**: A small floating card appears beneath your active caption box with quick fix buttons.
* **Keyboard Shortcut**: Press `Alt + Q` (Windows) or `Option + Q` (macOS) to instantly apply the first recommended fix without taking your hands off the keyboard.

### 3. Allowed Words & Whitelisting (+ Allow)
If a project uses specialized tools or terms (e.g. `beaker`, `pipette`, `chisel`):
* Click **`Allow "<word>"`** directly on the warning.
* Or type the term into the **"+ Allow"** input box at the bottom of the dashboard.
* Whitelisted words are permanently saved across tasks in your browser storage.

### 4. Segment Progress & Navigation
* **Live Counter**: The dashboard shows a live progress bar (e.g. `23 of 24 segments captioned`).
* **Uncaptioned Segments**: Empty segments are outlined in red on the timeline. Click any frame button in the dashboard (e.g. `Frames 120–180`) to jump directly to that uncaptioned segment.

### 5. Safe Submission Guard
* When you click the **Submit** button in Encord, Caption Check checks your whole task. If any segment has unreviewed items, missing captions, or critical errors, a warning popup will alert you before submitting.

---

## 📋 Annotation Rules Cheat Sheet

| Category | ✅ Allowed / Correct | ❌ Forbidden / Flagged |
| :--- | :--- | :--- |
| **Sentence Starter** | `"left hand ..."`, `"right hand ..."`, `"both hands ..."` | Captions not introducing a hand or valid status label |
| **Status Labels** | Must be strictly uppercase: `DO`, `ID`, `NU`, `FAIL`, `NA` | Lowercase or punctuated: `do`, `id`, `[NU]`, `fail.` |
| **Symbols** | Standard commas (`,`) and semicolons (`;`) | **No slashes (`/`)**, no `&`, `+`, `-`, `@`, `#`, `()`, `[]` |
| **Vague Words** | Name the specific object (`"container"`, `"box"`, `"battery"`) | **Do not use `"something"`, `"various"`, `"various objects"`** |
| **Connector Repeat** | Alternate connectors: `and` $\rightarrow$ `then` $\rightarrow$ `while` $\rightarrow$ `;` | Repeating connectors twice in a row (`and ... and`, `and then`) |
| **Present Tense** | `"picks up"`, `"holds"`, `"passes"`, `"move towards"` | Past or progressive forms (`"picked up"`, `"holding"`) |

---

## 🛠️ Testing & Rule Development

To test and verify the rule engine locally without launching Chrome:
```bash
node test.js
```
This runs the full test suite against real annotation edge cases, connector heuristics, label validation, and auto-fix replacements.
