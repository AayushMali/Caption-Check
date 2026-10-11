// Caption rules engine. Pure functions, no DOM, so it can be tested in Node.
(function (root) {
  // Preferred object names for your project. Used to steer the "suggest name" button.
  const GLOSSARY = []; // e.g. ["cardboard box", "tape roll", "packet"]

  // Action verbs (base form). Add the verbs your tasks use.
  const BASE = new Set((
    "pick grab hold place put move slide fold unfold open close push pull press lift lower turn rotate flip insert remove take set " +
    "position align adjust attach detach fasten tighten loosen screw unscrew tape seal pack unpack stack carry pass drop release cut trim " +
    "wipe clean stir pour sew thread feed straighten smooth tuck wrap unwrap hang tie untie twist swing tap hit hammer drill spray apply " +
    "check scan pat pinch squeeze rub scrub fill empty load unload sort arrange gather collect reach lay spread flatten roll peel stick " +
    "clip clamp lock unlock hook plug unplug connect disconnect measure mark cap uncap shake dip wash rinse dry bend wave point stretch " +
    "support steady keep rest hold slip dress cover uncover tear separate join mix"
  ).split(/\s+/));

  const PARTICLES = new Set(["up", "down", "out", "in", "off", "on", "away", "over", "back", "into", "onto", "together", "apart", "aside"]);
  const CONNECTORS = ["and", "then", "while", "but"];
  const ALT_UNITS = ["and", "then", "while", ";", "and then"];

  const isAdv = (w) => /ly$/.test(w);
  const cands = (w) => {
    const o = [];
    if (/ies$/.test(w)) o.push(w.slice(0, -3) + "y");
    if (/s$/.test(w)) o.push(w.slice(0, -1));
    if (/es$/.test(w)) o.push(w.slice(0, -2));
    return o;
  };
  const baseOf = (w) => (BASE.has(w) ? w : cands(w).find((c) => BASE.has(c)) || null);
  const conj3 = (b) => {
    if (b === "go") return "goes";
    if (b === "do") return "does";
    if (/(s|x|z|ch|sh)$/.test(b)) return b + "es";
    if (/[^aeiou]y$/.test(b)) return b.slice(0, -1) + "ies";
    return b + "s";
  };
  const ingEd = (w) => {
    let s, list = [];
    if (/ing$/.test(w)) { s = w.slice(0, -3); list = [s, s + "e", s.slice(0, -1)]; }
    else if (/ed$/.test(w)) { s = w.slice(0, -2); list = [s, w.slice(0, -1), s.slice(0, -1)]; }
    return list.find((c) => BASE.has(c)) || null;
  };

  function tokenize(text) {
    const re = /[A-Za-z][A-Za-z'-]*|;|,|\S/g, toks = [];
    let m;
    while ((m = re.exec(text))) toks.push({ w: m[0], l: m[0].toLowerCase(), s: m.index, e: m.index + m[0].length });
    return toks;
  }
  const handAt = (t, i) =>
    t[i] && ["left", "right", "both"].includes(t[i].l) && t[i + 1] && /^hands?$/.test(t[i + 1].l);

  // Connectors that join two actions ("... box and right hand picks ...", "... then places ...").
  // "and" inside a noun list ("the box and tape roll") is NOT a joiner.
  function findJoiners(toks) {
    const out = [];
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      let unit = null, endIdx = i;
      if (t.l === ";") unit = ";";
      else if (t.l === "and" && toks[i + 1] && toks[i + 1].l === "then") { unit = "and then"; endIdx = i + 1; }
      else if (CONNECTORS.includes(t.l)) unit = t.l;
      if (!unit) continue;
      let j = endIdx + 1;
      while (toks[j] && isAdv(toks[j].l)) j++;
      const n = toks[j];
      if (n) {
        const nextIsClause = handAt(toks, j) || (/s$/.test(n.l) && baseOf(n.l) !== null);
        if (nextIsClause) out.push({ unit, start: t.s, end: toks[endIdx].e, next: handAt(toks, j) ? toks[j].l + " " + toks[j + 1].l : n.w });}
      i = endIdx;
    }
    return out;
  }

  function tidy(s) {
    return s.replace(/[ \t]+/g, " ").replace(/ ;/g, ";").replace(/;(?=\S)/g, "; ").trim();
  }
  function applyFix(text, fix) {
    return tidy(text.slice(0, fix.start) + fix.text + text.slice(fix.end));
  }

  function check(text, opts) {
    opts = opts || {};
    const issues = [];
    const add = (o) => issues.push(Object.assign({ fixes: [] }, o));

    if (!text.trim()) {
      // An empty box is normal while you choose a suggestion, so only flag it when asked.
      if (opts.flagBlank) add({ id: "blank", sev: "error", start: 0, end: 0, msg: "This segment is blank. Add a caption." });
      return issues;
    }
    const toks = tokenize(text);

    // 1) Per-hand clause checks: unfinished, missing object, agreement, tense
    for (let i = 0; i < toks.length; i++) {
      if (!handAt(toks, i)) continue;
      const hand = toks[i].l + " " + toks[i + 1].l;
      const plural = toks[i].l === "both";
      const hs = toks[i].s, he = toks[i + 1].e;
      let j = i + 2;
      while (toks[j] && isAdv(toks[j].l)) j++;
      let k = j;
      while (k < toks.length && !handAt(toks, k) && toks[k].l !== ";") k++;
      const body = toks.slice(j, k);
      while (body.length && CONNECTORS.includes(body[body.length - 1].l)) body.pop();

      if (!body.length) {
        add({ id: "unfinished", sev: "error", start: hs, end: he, msg: `"${hand}" has no action after it. Finish the caption.` });
        continue;
      }
      const v = body[0];
      const b = baseOf(v.l), ie = ingEd(v.l);
      if (b) {
        if (plural && v.l !== b)
          add({ id: "agree", sev: "error", start: v.s, end: v.e, msg: `"${hand}" needs "${b}", not "${v.w}".`, fixes: [{ label: `Use "${b}"`, start: v.s, end: v.e, text: b }] });
        else if (!plural && v.l === b)
          add({ id: "agree", sev: "error", start: v.s, end: v.e, msg: `"${hand}" needs "${conj3(b)}", not "${v.w}".`, fixes: [{ label: `Use "${conj3(b)}"`, start: v.s, end: v.e, text: conj3(b) }] });
      } else if (ie) {
        const f = plural ? ie : conj3(ie);
        add({ id: "tense", sev: "warn", start: v.s, end: v.e, msg: `Use simple present: "${f}" instead of "${v.w}".`, fixes: [{ label: `Use "${f}"`, start: v.s, end: v.e, text: f }] });
      } else {
        add({ id: "verb", sev: "warn", start: v.s, end: v.e, msg: `"${v.w}" doesn't look like an action verb. Check the sentence.` });
      }
      const rest = body.slice(1).filter((t) => !PARTICLES.has(t.l) && !/^[,;]$/.test(t.l));
      if (b && !rest.length)
        add({ id: "object", sev: "warn", start: v.s, end: v.e, msg: `Add what the ${hand} ${plural ? "act on" : "acts on"} after "${v.w}".` });
    }

    // 2) Caption ends with a joiner ("... and")
    const last = toks[toks.length - 1];
    if (last && (CONNECTORS.includes(last.l) || last.l === ";"))
      add({ id: "dangling", sev: "error", start: last.s, end: last.e, msg: `Caption ends with "${last.w}". Finish it or remove it.` });

    // 3) Same connector repeated to join actions
    const joiners = findJoiners(toks);
    const used = new Set(joiners.map((x) => x.unit));
    const groups = {};
    joiners.forEach((x) => (groups[x.unit] = groups[x.unit] || []).push(x));
    Object.keys(groups).forEach((unit) => {
      const arr = groups[unit];
      if (arr.length < 2) return;
      arr.slice(1).forEach((x) => {
        const alts = ALT_UNITS.filter((u) => !used.has(u));
        add({
          id: "repeat", sev: "warn", start: x.start, end: x.end,
          msg: `"${unit}" is repeated before "${x.next}". Use then / while / ;`,
          fixes: alts.map((u) => ({ label: `Use "${u}"`, start: x.start, end: x.end, text: u })),
        });
      });
    });

    // 4) Vague object words
    for (const m of text.matchAll(/\b(?:an?|the|some)\s+(?:object|item|thing|stuff)s?\b|\b(?:something|anything)\b/gi))
      add({ id: "vague", sev: "warn", suggest: true, start: m.index, end: m.index + m[0].length, msg: `"${m[0]}" is vague. Name the object.` });

    // 5) Spacing around ";"
    for (const m of text.matchAll(/ +;/g))
      add({ id: "space", sev: "warn", start: m.index, end: m.index + m[0].length, msg: 'No space before ";".', fixes: [{ label: "Fix spacing", start: m.index, end: m.index + m[0].length, text: ";" }] });
    for (const m of text.matchAll(/;(?=[^\s])/g))
      add({ id: "space", sev: "warn", start: m.index, end: m.index + 1, msg: 'Add a space after ";".', fixes: [{ label: "Fix spacing", start: m.index, end: m.index + 1, text: "; " }] });
    for (const m of text.matchAll(/ {2,}/g))
      add({ id: "space", sev: "warn", start: m.index, end: m.index + m[0].length, msg: "Double space.", fixes: [{ label: "Fix spacing", start: m.index, end: m.index + m[0].length, text: " " }] });

    // 6) Common slips: "form the table" -> "from the table", known misspellings, repeated words
    for (const m of text.matchAll(/\bform(?=\s+(?:the|a|an|his|her|their|its)\b)/gi))
      add({ id: "slip", sev: "warn", start: m.index, end: m.index + 4, msg: '"form" should probably be "from".', fixes: [{ label: 'Use "from"', start: m.index, end: m.index + 4, text: "from" }] });
    const SLIPS = { teh: "the", hte: "the", adn: "and", wiht: "with", palce: "place", plcae: "place", recieve: "receive" };
    for (const m of text.matchAll(/\b(teh|hte|adn|wiht|palce|plcae|recieve)\b/gi))
      add({ id: "typo", sev: "error", start: m.index, end: m.index + m[0].length, msg: `"${m[0]}" is a typo. Did you mean "${SLIPS[m[0].toLowerCase()]}"?`, fixes: [{ label: `Use "${SLIPS[m[0].toLowerCase()]}"`, start: m.index, end: m.index + m[0].length, text: SLIPS[m[0].toLowerCase()] }] });
    for (const m of text.matchAll(/\b([A-Za-z]+)\s+\1\b/gi))
      add({ id: "dup", sev: "warn", start: m.index, end: m.index + m[0].length, msg: `Repeated word "${m[1]}".`, fixes: [{ label: "Remove repeat", start: m.index + m[1].length, end: m.index + m[0].length, text: "" }] });

    return issues.sort((a, b) => a.start - b.start);
  }

  const api = { check, applyFix, tidy, GLOSSARY };
  root.CaptionRules = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
