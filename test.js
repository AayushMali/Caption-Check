const R = require("./rules.js");
const cases = {
  "repeated 'and' (your example)": "left hand picks up the cardboard box and right hand picks up the tape roll and left hand places the cardboard box on the table",
  "fixed version (should be clean)": "left hand picks up the cardboard box and right hand picks up the tape roll then left hand places the cardboard box on the table",
  "unfinished": "both hands",
  "box and tape roll (noun list, clean)": "left hand picks up the box and tape roll",
  "dangling": "left hand picks up the box and",
  "screenshot caption": "left hand holds the packet and right hand grabs an object then places it into the packet and then both hands folds the packet ;right hand places the packet on the side",
  "blank (not flagged live)": "   ",
  "typos": "right hand pick up the tape roll form the table",
  "their real caption (no repeat flag expected)": "right hand picks up pliers from the metal components and left hand picks up the wire from the floor then right hand cuts the wire using pliers while left hand holds the wire; right hand places the pliers onto the component and both hands adjust the wire",
  "then then (flag expected)": "left hand picks up the box then right hand picks up the tape then left hand places it on the table",
  "and then (flag expected)": "and then right hand holds the box",
  "repeat word": "left hand picks up the the box",
  "passes to right hand (preposition object, clean)": "left hand picks up the string from the table and passes it to the right hand",
  "chair and table (clean)": "left hand places the cup on the chair",
  "fail action verb (clean)": "left hand fails to pick up the string",
  "both hands fail (clean)": "both hands fail to open the container",
  "FAIL label (clean)": "FAIL",
  "ID / DO / NU in capital (clean)": "ID",
  "id lowercase (flag expected)": "id",
  "door (should not flag as label)": "door",
  "something is vague (flag expected)": "left hand move towards something",
  "various objects is vague (flag expected)": "right hand picks up various objects",
  "various screws is vague (flag expected)": "right hand holds various screws",
  "left hand move towards the table (clean)": "left hand move towards the table",
  "left hand picks up the container from the floor (clean)": "left hand picks up the container from the floor",
  "right hand holds the battery (clean)": "right hand holds the battery",
  "right hand passes the screws to left hand (clean)": "right hand passes the screws to left hand",
  "missing object with period (flag expected)": "left hand picks up.",
  "slash symbol in caption (flag expected)": "left hand picks up the box/container",
  "slash with spaces (flag expected)": "left hand picks up the box / container",
  "ampersand symbol (flag expected)": "left hand picks up the box & tape roll",
  "plus symbol (flag expected)": "left hand picks up the box + tape roll",
  "parentheses symbol (flag expected)": "left hand picks up the box (red)",
  "comma allowed (clean)": "left hand picks up the box, tape roll and wire",
  "semicolon allowed (clean)": "left hand picks up the box; right hand picks up the tape roll",
};
for (const [name, t] of Object.entries(cases)) {
  console.log("\n## " + name);
  const is = R.check(t, { strict: true, vocab: new Set(Array.from({ length: 60 }, (_, i) => "bank" + i)) });
  if (!is.length) console.log("  (no issues)");
  is.forEach((i) => console.log(`  [${i.sev}] ${i.id}: ${i.msg}` + (i.fixes.length ? "  fixes: " + i.fixes.map((f) => f.label).join(", ") : "")));
}
const t = cases["repeated 'and' (your example)"];
const iss = R.check(t).find((i) => i.id === "repeat");
console.log("\nApplied 'then':", R.applyFix(t, iss.fixes.find((f) => f.text === "then")));
let x = cases["screenshot caption"];
for (const id of ["agree", "space"]) { const i = R.check(x).find((q) => q.id === id); if (i) x = R.applyFix(x, i.fixes[0]); }
console.log("Screenshot caption after fixes:", x);