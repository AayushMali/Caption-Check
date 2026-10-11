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
  "repeat word": "left hand picks up the the box",
};
for (const [name, t] of Object.entries(cases)) {
  console.log("\n## " + name);
  const is = R.check(t);
  if (!is.length) console.log("  (no issues)");
  is.forEach((i) => console.log(`  [${i.sev}] ${i.id}: ${i.msg}` + (i.fixes.length ? "  fixes: " + i.fixes.map((f) => f.label).join(", ") : "")));
}
const t = cases["repeated 'and' (your example)"];
const iss = R.check(t).find((i) => i.id === "repeat");
console.log("\nApplied 'then':", R.applyFix(t, iss.fixes.find((f) => f.text === "then")));
const s = R.check(cases["screenshot caption"]);
let x = cases["screenshot caption"];
for (const id of ["agree", "space"]) { const i = R.check(x).find((q) => q.id === id); if (i) x = R.applyFix(x, i.fixes[0]); }
console.log("Screenshot caption after fixes:", x);
