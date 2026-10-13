// Caption rules engine. Pure functions, no DOM, so it can be tested in Node.
(function (root) {
  // Set to false if the "not in the label bank" spelling hints are too noisy for your project.
  const CHECK_UNKNOWN_WORDS = true;

  // Words you accept even when they are not in the label bank (tools and objects in your tasks).
  const EXTRA_WORDS = new Set([]); // e.g. ["pliers", "wire", "insulated"]

  // Everyday words that always count as known.
  const COMMON = new Set((
    "a an the of on in onto into from to with using use while then and but or up down out off over back away apart together aside at by for " +
    "under inside outside near next left right both hand hands it its them they this that those these his her their one two each other " +
    "another same between through across along around behind front top bottom side edge end single own until after before once again also " +
    "not no more as is are be been being has have had do does did " +
    "table chair desk bench counter stool shelf drawer cabinet floor ground wall sink faucet rack surface " +
    "cup mug glass bottle can jar bowl plate dish box packet bag bin tray basket container pot pan lid cap cover handle knob button switch lever door " +
    "string rope wire cord cable thread paper cardboard cloth towel sponge wipe rag foil plastic metal wood rubber tape screw nut bolt nail clip clamp pin plug strip piece part component " +
    "tool pliers scissors knife screwdriver wrench pen pencil marker brush spatula pipette tweezers beaker vial tube " +
    "finger fingers thumb palm wrist arm " +
    "battery batteries " +
    "towards toward " +
    "object item things items objects failure success"
  ).split(/\s+/));

  // Action verbs (base form). Add the verbs your tasks use.
  const BASE = new Set((
    "pick grab hold place put move slide fold unfold open close push pull press lift lower turn rotate flip insert remove take set " +
    "position align adjust attach detach fasten tighten loosen screw unscrew tape seal pack unpack stack carry pass drop release cut trim " +
    "wipe clean stir pour sew thread feed straighten smooth tuck wrap unwrap hang tie untie twist swing tap hit hammer drill spray apply " +
    "check scan pat pinch squeeze rub scrub fill empty load unload sort arrange gather collect reach lay spread flatten roll peel stick " +
    "clip clamp lock unlock hook plug unplug connect disconnect measure mark cap uncap shake dip wash rinse dry bend wave point stretch " +
    "support steady keep rest hold slip dress cover uncover tear separate join mix " +
    "fail attempt try touch guide nudge catch fumble drag hover tilt tip steer orient"
  ).split(/\s+/));

  const PREPS = new Set([
    "to", "into", "onto", "from", "towards", "toward", "near", "against",
    "beside", "between", "with", "at", "by", "in", "under", "over", "past", "around"
  ]);
  const DETERMINERS = new Set(["the", "a", "an", "its", "his", "her", "their", "one", "other", "each"]);

  function isPrepObject(toks, i) {
    let p = i - 1;
    while (p >= 0 && DETERMINERS.has(toks[p].l)) p--;
    return p >= 0 && PREPS.has(toks[p].l);
  }

  const PARTICLES = new Set(["up", "down", "out", "in", "off", "on", "away", "over", "back", "into", "onto", "together", "apart", "aside"]);
  const CONNECTORS = ["and", "then", "while", "but"];
  const ALT_UNITS = ["and", "then", "while", ";"];

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
  const isKnown = (w, vocab, extra) => {
    const ok = (x) => COMMON.has(x) || EXTRA_WORDS.has(x) || (extra && extra.has(x)) || BASE.has(x) || (vocab && vocab.has(x));
    if (ok(w) || baseOf(w)) return true;
    const alts = cands(w);
    if (/ing$/.test(w)) alts.push(w.slice(0, -3), w.slice(0, -3) + "e", w.slice(0, -4));
    if (/ed$/.test(w)) alts.push(w.slice(0, -2), w.slice(0, -1), w.slice(0, -3));
    return alts.some((a) => a && ok(a));
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
      else if (CONNECTORS.includes(t.l)) unit = t.l;
      if (!unit) continue;
      let j = endIdx + 1;
      while (toks[j] && isAdv(toks[j].l)) j++;
      const n = toks[j];
      if (n) {
        const nextIsClause = (handAt(toks, j) && !isPrepObject(toks, j)) || (/s$/.test(n.l) && baseOf(n.l) !== null);
        if (nextIsClause) out.push({ unit, start: t.s, end: toks[endIdx].e, next: handAt(toks, j) ? toks[j].l + " " + toks[j + 1].l : n.w });
      }
      i = endIdx;
    }
    return out;
  }

  function tidy(s) {
    return s.replace(/[ \t]+/g, " ").replace(/ ;/g, ";").replace(/;(?=\S)/g, "; ").trim();
  }
  function applyFix(text, fix) {
    if (!fix || fix.action === "whitelist") return text;
    return tidy(text.slice(0, fix.start) + fix.text + text.slice(fix.end));
  }

  function check(text, opts) {
    opts = opts || {};
    const extraWords = opts.extraWords ? (opts.extraWords instanceof Set ? opts.extraWords : new Set(opts.extraWords)) : new Set();
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
      if (!handAt(toks, i) || isPrepObject(toks, i)) continue;
      const hand = toks[i].l + " " + toks[i + 1].l;
      const plural = toks[i].l === "both";
      const hs = toks[i].s, he = toks[i + 1].e;
      let j = i + 2;
      while (toks[j] && isAdv(toks[j].l)) j++;
      let k = j;
      while (k < toks.length && !(handAt(toks, k) && !isPrepObject(toks, k)) && toks[k].l !== ";") k++;
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
        else if (!plural && v.l === b && b !== "move")
          add({ id: "agree", sev: "error", start: v.s, end: v.e, msg: `"${hand}" needs "${conj3(b)}", not "${v.w}".`, fixes: [{ label: `Use "${conj3(b)}"`, start: v.s, end: v.e, text: conj3(b) }] });
      } else if (ie) {
        const f = plural ? ie : conj3(ie);
        add({ id: "tense", sev: "warn", start: v.s, end: v.e, msg: `Use simple present: "${f}" instead of "${v.w}".`, fixes: [{ label: `Use "${f}"`, start: v.s, end: v.e, text: f }] });
      } else {
        add({ id: "verb", sev: "warn", start: v.s, end: v.e, msg: `"${v.w}" doesn't look like an action verb. Check the sentence.` });
      }
      const rest = body.slice(1).filter((t) => !PARTICLES.has(t.l) && !/^[,;.!?]$/.test(t.l));
      if (b && !rest.length)
        add({ id: "object", sev: "warn", start: v.s, end: v.e, msg: `Add what the ${hand} ${plural ? "act on" : "acts on"} after "${v.w}".` });
    }

    // 2) Caption ends with a joiner ("... and")
    const last = toks[toks.length - 1];
    if (last && (CONNECTORS.includes(last.l) || last.l === ";"))
      add({ id: "dangling", sev: "error", start: last.s, end: last.e, msg: `Caption ends with "${last.w}". Finish it or remove it.` });

    // 2b) Strict checks (Detailed Caption track only)
    const clean = text.trim();
    const hasHand = toks.some((_, i) => handAt(toks, i) && !isPrepObject(toks, i));
    const isLabel = /^(DO|ID|NU|FAIL|NA)$/.test(clean); // exact idle/status labels must be capital
    const labelLike = !hasHand && /^[^A-Za-z]*(DO|ID|NU|FAIL|NA)[^A-Za-z]*$/i.test(clean);
    if (opts.strict && labelLike && !isLabel) {
      const m = clean.match(/(DO|ID|NU|FAIL|NA)/i);
      const lab = m ? m[1].toUpperCase() : clean.slice(0, 4).toUpperCase();
      add({
        id: "label", sev: "error", start: 0, end: text.length,
        msg: 'A label must be exactly "DO", "ID", "NU", "FAIL" or "NA", with nothing else. Remove the extra characters.',
        fixes: [{ label: `Use "${lab}"`, start: 0, end: text.length, text: lab }],
      });
    } else if (opts.strict && !isLabel) {
      if (!hasHand)
        add({ id: "nohand", sev: "error", start: 0, end: text.length, msg: 'This does not look like a caption. Start with "left hand", "right hand" or "both hands".' });
      if (CHECK_UNKNOWN_WORDS && opts.vocab && opts.vocab.size > 50) {
        toks.forEach((t) => {
          if (t.w.length < 2 || !/^[A-Za-z][A-Za-z'-]*$/.test(t.w)) return;
          if (!isKnown(t.l, opts.vocab, extraWords))
            add({
              id: "unknown",
              sev: "warn",
              start: t.s,
              end: t.e,
              msg: `"${t.w}" is not in the label bank or the common word list. Check the spelling.`,
              fixes: [
                { label: `Allow "${t.w.toLowerCase()}"`, action: "whitelist", word: t.w.toLowerCase(), start: t.s, end: t.e, text: t.w }
              ]
            });
        });
      }
    }

    // 3) The same connector used twice IN A ROW to join actions (and ... and, then ... then).
    //    A mix like and / then / while / ; / and is fine, even if "and" shows up again later.
    const joiners = findJoiners(toks);
    joiners.forEach((x, i) => {
      const prev = joiners[i - 1], next = joiners[i + 1];
      if (!prev || prev.unit !== x.unit) return;
      if (/\band\s+$/i.test(text.slice(0, x.start))) return; // part of "and then", reported below
      const alts = ALT_UNITS.filter((u) => u !== x.unit && !(next && u === next.unit));
      add({
        id: "repeat", sev: "warn", start: x.start, end: x.end,
        msg: `"${x.unit}" is used twice in a row, before "${x.next}". Use ${alts.join(" / ")}`,
        fixes: alts.map((u) => ({ label: `Use "${u}"`, start: x.start, end: x.end, text: u })),
      });
    });

    // 3b) "and then" together is not allowed: use only one connector (shown in the small card as a "repeat" issue)
    for (const m of text.matchAll(/\band\s+then\b/gi))
      add({
        id: "repeat", sev: "error", start: m.index, end: m.index + m[0].length,
        msg: '"and then" together is not allowed. Use only one: then / and / while / ;',
        fixes: ["then", "and", "while", ";"].map((u) => ({ label: `Use "${u}"`, start: m.index, end: m.index + m[0].length, text: u })),
      });

    // 4) Vague object words ("something", "various", etc. are wrong words)
    for (const m of text.matchAll(/\b(?:an?|the|some|various)\s+(?:objects?|items?|things?|stuff)\b|\b(?:something|anything|various)\b/gi))
      add({ id: "vague", sev: "warn", start: m.index, end: m.index + m[0].length, msg: `"${m[0]}" is vague. Name the object.` });

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

    // 7) Disallowed symbols ("/", "&", "+", brackets, etc.; only letters, numbers, spaces, ",", ";", ".", and words allowed)
    for (const m of text.matchAll(/\s*\/+\s*/g)) {
      add({
        id: "symbol", sev: "error", start: m.index, end: m.index + m[0].length,
        msg: 'Symbol "/" is not allowed in captions. Use words like "or" or "and".',
        fixes: [
          { label: 'Use "or"', start: m.index, end: m.index + m[0].length, text: " or " },
          { label: 'Use "and"', start: m.index, end: m.index + m[0].length, text: " and " },
        ]
      });
    }
    for (const m of text.matchAll(/\s*&+\s*/g)) {
      add({
        id: "symbol", sev: "error", start: m.index, end: m.index + m[0].length,
        msg: 'Symbol "&" is not allowed in captions. Use "and".',
        fixes: [{ label: 'Use "and"', start: m.index, end: m.index + m[0].length, text: " and " }]
      });
    }
    for (const m of text.matchAll(/\s*\++\s*/g)) {
      add({
        id: "symbol", sev: "error", start: m.index, end: m.index + m[0].length,
        msg: 'Symbol "+" is not allowed in captions. Use "and".',
        fixes: [{ label: 'Use "and"', start: m.index, end: m.index + m[0].length, text: " and " }]
      });
    }
    for (const m of text.matchAll(/\s+(?:--?|—)\s+/g)) {
      add({
        id: "symbol", sev: "error", start: m.index, end: m.index + m[0].length,
        msg: 'Symbol "-" is not allowed as a separator. Use ";" or a connector word.',
        fixes: [
          { label: 'Use ";"', start: m.index, end: m.index + m[0].length, text: "; " },
          { label: 'Use "and"', start: m.index, end: m.index + m[0].length, text: " and " }
        ]
      });
    }
    const symRe = /[^\w\s,;.\'-]|(?<![A-Za-z0-9])[-']|[-'](?![A-Za-z0-9])|_/g;
    for (const m of text.matchAll(symRe)) {
      const s = m[0];
      if (issues.some((i) => i.id === "symbol" && i.start <= m.index && i.end >= m.index + s.length)) continue;
      add({
        id: "symbol", sev: "error", start: m.index, end: m.index + s.length,
        msg: `Symbol "${s}" is not allowed in captions. Remove it.`,
        fixes: [{ label: `Remove "${s}"`, start: m.index, end: m.index + s.length, text: "" }]
      });
    }

    // one message per word: drop generic "not a verb" or "unknown" if already flagged as symbol or vague
    const out = issues.filter((i) => {
      if (i.id === "verb" && issues.some((u) => u.id === "unknown" && u.start === i.start)) return false;
      if (i.id === "unknown" && issues.some((v) => (v.id === "vague" || v.id === "symbol") && v.start <= i.start && v.end >= i.end)) return false;
      return true;
    });
    return out.sort((a, b) => a.start - b.start);
  }

  const api = { check, applyFix, tidy };
  root.CaptionRules = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);