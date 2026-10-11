(() => {
  const SEL = 'textarea[aria-label="Segment caption"]';
  const OPTS = '[data-testid="chorus-panel-options"]';
  const CARD = '[data-testid^="chorus-option-"]:not([data-testid$="-diff"])';
  const BAR = '[data-testid="vla-range-bar"][data-track-id="detailed"]';
  const R = globalThis.CaptionRules;
  const COLORS = { error: "#d92d20", warn: "#e08a00", ok: "#067647" };
  let collapsed = false, lastSig = "", lastIssues = [];

  const style = document.createElement("style");
  style.textContent = `
  ::highlight(cc-err){text-decoration:underline wavy ${COLORS.error};text-decoration-thickness:1.5px}
  ::highlight(cc-warn){text-decoration:underline wavy ${COLORS.warn};text-decoration-thickness:1.5px}
  ${BAR}[data-cc-empty]{outline:2px solid ${COLORS.error};outline-offset:2px}
  ${CARD}{position:relative}
  ${CARD}[data-cc]::after{content:attr(data-cc-label);position:absolute;top:-10px;right:12px;font:600 11px/1 system-ui,sans-serif;
    padding:3px 8px;border-radius:10px;background:#fff;border:1px solid currentColor;pointer-events:none}
  ${CARD}[data-cc="ok"]::after{color:${COLORS.ok}} ${CARD}[data-cc="warn"]::after{color:${COLORS.warn}} ${CARD}[data-cc="err"]::after{color:${COLORS.error}}
  #cc-panel{position:fixed;right:24px;bottom:24px;width:340px;max-height:45vh;overflow:auto;z-index:2147483647;display:none;
    background:#fff;color:#1d2433;border:1px solid #d9dde5;border-radius:8px;box-shadow:0 6px 24px rgba(20,30,50,.18);
    font:13px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;padding:10px 12px}
  #cc-panel h4{margin:0;font-size:13px;font-weight:600;display:flex;justify-content:space-between;cursor:pointer;gap:8px}
  #cc-panel .cc-sub{color:#5b6475;font-size:12px;margin-top:2px}
  #cc-panel .cc-i{display:flex;gap:8px;padding:6px 0;border-top:1px solid #eef0f4;margin-top:6px}
  #cc-panel .cc-d{flex:none;width:8px;height:8px;border-radius:50%;margin-top:5px}
  #cc-panel button{font:inherit;cursor:pointer;border:1px solid #c9cfda;background:#f6f7f9;color:#1d2433;border-radius:6px;padding:2px 8px;margin:4px 6px 0 0}
  #cc-panel button:hover{background:#e9ecf2}
  `;
  document.documentElement.appendChild(style);

  const panel = document.createElement("div");
  panel.id = "cc-panel";
  document.documentElement.appendChild(panel);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const getTA = () => document.querySelector(SEL);

  // Annotate mode = past Step 1 (segmenting). Only then does an uncaptioned segment count as a problem.
  const annotating = () => !document.querySelector('[data-testid="chorus-segment-step-intro"]') && !!(document.querySelector(OPTS) || getTA());
  let lastEmpty = [], lastTotal = 0;
  function scanBars() {
    const on = annotating(), found = [];
    const bars = document.querySelectorAll(BAR);
    lastTotal = on ? bars.length : 0; // every detailed-track segment, whichever one you are on
    bars.forEach((b) => {
      const t = ((b.querySelector('[data-testid="vla-range-text"]') || {}).textContent || "").trim();
      const empty = on && !t;
      b.toggleAttribute("data-cc-empty", empty);
      if (empty) found.push({ el: b, a: +b.dataset.rangeStart, b: +b.dataset.rangeEnd });
    });
    lastEmpty = found.sort((x, y) => x.a - y.a);
  }

  function setValue(ta, v) {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(ta, v); // React-controlled field
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  }

  // Underlines: reuse Encord's own invisible mirror behind the caption box (same text, same wrapping).
  function underline(ta, issues) {
    if (!(window.CSS && CSS.highlights)) return;
    const errs = [], warns = [];
    const mirror = ta.parentElement.querySelector(':scope > div[aria-hidden="true"]');
    const node = mirror && document.createTreeWalker(mirror, NodeFilter.SHOW_TEXT).nextNode();
    if (node && node.data.slice(0, ta.value.length) === ta.value) {
      issues.forEach((i) => {
        if (i.end <= i.start || i.end > node.length) return;
        const r = new Range(); r.setStart(node, i.start); r.setEnd(node, i.end);
        (i.sev === "error" ? errs : warns).push(r);
      });
    }
    CSS.highlights.set("cc-err", new Highlight(...errs));
    CSS.highlights.set("cc-warn", new Highlight(...warns));
  }

  // Badges on the suggested caption cards, so you can pick a clean one with keys 1-3.
  function scanCards() {
    document.querySelectorAll(`${OPTS} ${CARD}`).forEach((card) => {
      const el = card.querySelector("p.text-sm") || card.querySelector(".sr-only");
      const text = el ? el.textContent.trim() : "";
      const iss = text ? R.check(text) : [];
      const errs = iss.filter((i) => i.sev === "error").length;
      const state = errs ? "err" : iss.length ? "warn" : "ok";
      const label = errs ? `${errs} error${errs > 1 ? "s" : ""}` : iss.length ? `${iss.length} to check` : "clean";
      if (card.dataset.cc !== state) card.dataset.cc = state;
      if (card.dataset.ccLabel !== label) card.dataset.ccLabel = label;
    });
  }

  function awaiting() {
    const p = document.querySelector(`${OPTS} > p`);
    const m = p && /(\d+)\s+awaiting review/i.exec(p.textContent);
    return m ? +m[1] : null;
  }

  function scan() {
    scanCards();
    scanBars();
    const ta = getTA();
    const aw = awaiting();
    const text = ta ? ta.value : "";
    const issues = ta ? R.check(text) : [];
    if (ta) underline(ta, issues);
    else if (window.CSS && CSS.highlights) { CSS.highlights.delete("cc-err"); CSS.highlights.delete("cc-warn"); }
    lastIssues = issues;

    const sig = JSON.stringify([!!ta, text, aw, collapsed, issues.map((i) => [i.id, i.start, i.end]), lastEmpty.map((e) => [e.a, e.b]), lastTotal]);
    if (sig === lastSig) return; // don't rebuild the card while you're clicking it
    lastSig = sig;
    if (!ta && !lastTotal) { panel.style.display = "none"; return; }
    const filled = lastTotal - lastEmpty.length;

    const total = issues.length + lastEmpty.length;
    const status = total ? `${total} to fix` : text.trim() ? "Looks good" : "Waiting for a caption";
    if (collapsed) {
      panel.innerHTML = `<h4 data-toggle="1"><span>Caption check</span><span>${lastTotal ? `${filled}/${lastTotal} captioned` : status}</span></h4>`;
    } else {
      let h = `<h4 data-toggle="1"><span>Caption check</span><span>${status}</span></h4>`;
      if (lastTotal) {
        const pct = Math.round((filled / lastTotal) * 100), done = filled === lastTotal;
        h += `<div class="cc-sub"><b style="color:${done ? COLORS.ok : COLORS.error}">${filled} of ${lastTotal} segments captioned</b>` +
          (aw !== null ? ` · ${aw} awaiting review` : "") +
          `</div><div style="height:6px;border-radius:3px;background:#eef0f4;margin:5px 0 2px"><div style="height:100%;width:${pct}%;border-radius:3px;background:${done ? COLORS.ok : COLORS.warn}"></div></div>`;
      } else if (aw !== null) h += `<div class="cc-sub">${aw} awaiting review</div>`;
      if (lastEmpty.length) {
        h += `<div class="cc-i"><span class="cc-d" style="background:${COLORS.error}"></span><div><b>${lastEmpty.length} segment${lastEmpty.length > 1 ? "s" : ""} with no caption</b><br>` +
          lastEmpty.slice(0, 6).map((e, i) => `<button data-e="${i}">Frames ${e.a}–${e.b}</button>`).join("") +
          (lastEmpty.length > 6 ? ` +${lastEmpty.length - 6} more` : "") + "</div></div>";
      }
      issues.forEach((it, n) => {
        h += `<div class="cc-i"><span class="cc-d" style="background:${COLORS[it.sev]}"></span><div>${esc(it.msg)}<br>` +
          it.fixes.map((f, q) => `<button data-i="${n}" data-f="${q}">${esc(f.label)}</button>`).join("") + "</div></div>";
      });
      panel.innerHTML = h;
    }
    panel.style.display = "block";
  }

  panel.addEventListener("mousedown", (e) => e.preventDefault()); // keep focus in the caption box
  panel.addEventListener("click", (e) => {
    if (e.target.closest("[data-toggle]")) { collapsed = !collapsed; scan(); return; }
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.e) { const t = lastEmpty[+b.dataset.e]; if (t) t.el.click(); return; } // jump to that segment
    const ta = getTA();
    if (!ta) return;
    const fix = lastIssues[+b.dataset.i].fixes[+b.dataset.f];
    setValue(ta, R.applyFix(ta.value, fix));
  });

  // Alt+Q applies the first available fix (free in Chrome and in Encord's shortcut list).
  document.addEventListener("keydown", (e) => {
    if (!(e.altKey && !e.ctrlKey && !e.shiftKey && e.code === "KeyQ")) return;
    const ta = getTA(); if (!ta) return;
    const it = R.check(ta.value).find((i) => i.fixes.length);
    if (it) { e.preventDefault(); setValue(ta, R.applyFix(ta.value, it.fixes[0])); }
  }, true);

  // Warn before Submit if anything is uncaptioned or has errors. You can still choose to submit.
  document.addEventListener("click", (e) => {
    if (!e.target.closest('[data-testid="editor-task-submit"]')) return;
    const probs = [], aw = awaiting();
    if (aw > 0) probs.push(`${aw} segment(s) still awaiting review`);
    const texts = [...document.querySelectorAll(BAR)].map((b) => ((b.querySelector('[data-testid="vla-range-text"]') || {}).textContent || "").trim());
    const empty = texts.filter((t) => !t).length;
    if (empty) probs.push(`${empty} of ${texts.length} segment(s) have no caption`);
    const bad = texts.filter((t) => t && R.check(t).some((i) => i.sev === "error")).length;
    if (bad) probs.push(`${bad} caption(s) have errors`);
    if (probs.length && !confirm("Caption Check found:\n- " + probs.join("\n- ") + "\n\nSubmit anyway?")) {
      e.preventDefault(); e.stopImmediatePropagation();
    }
  }, true);

  let raf = 0;
  const queue = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(scan); };
  new MutationObserver(queue).observe(document.body, { childList: true, subtree: true, characterData: true });
  document.addEventListener("input", queue, true);
  scan();

  // ---- Small card next to the caption box ----
  (() => {
    const WANT = new Set(["unfinished", "dangling", "object", "repeat"]);
    const mini = document.createElement("div");
    mini.id = "cc-mini";
    const st = document.createElement("style");
    st.textContent = `#cc-mini{position:fixed;z-index:2147483647;display:none;box-sizing:border-box;padding:6px 10px;background:#fff;color:#1d2433;border:1px solid #d9dde5;border-radius:8px;box-shadow:0 4px 14px rgba(20,30,50,.15);font:12.5px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif}
    #cc-mini .m{display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:2px 0}
    #cc-mini .d{flex:none;width:7px;height:7px;border-radius:50%}
    #cc-mini button{font:inherit;cursor:pointer;border:1px solid #c9cfda;background:#f6f7f9;border-radius:5px;padding:0 6px}`;
    document.documentElement.append(st, mini);
    let shown = [], sig = "";
    function place() {
      const ta = document.querySelector(SEL);
      if (!ta || !ta.value.trim()) { mini.style.display = "none"; sig = ""; return; }
      shown = R.check(ta.value).filter((i) => WANT.has(i.id));
      if (!shown.length) { mini.style.display = "none"; sig = ""; return; }
      const s = JSON.stringify(shown.map((i) => [i.id, i.start, i.end, i.msg]));
      if (s !== sig) {
        sig = s;
        mini.innerHTML = shown.map((it, n) => `<div class="m"><span class="d" style="background:${COLORS[it.sev]}"></span><span>${esc(it.msg)}</span>` +
          it.fixes.slice(0, 3).map((f, q) => `<button data-i="${n}" data-f="${q}">${esc(f.label)}</button>`).join("") + "</div>").join("");
      }
      const r = ta.getBoundingClientRect();
      mini.style.display = "block";
      mini.style.left = r.left + "px";
      mini.style.width = Math.min(Math.max(r.width, 260), 460) + "px";
      const below = r.bottom + 6;
      mini.style.top = (below + mini.offsetHeight > innerHeight - 8 ? r.top - mini.offsetHeight - 6 : below) + "px";
    }
    mini.addEventListener("mousedown", (e) => e.preventDefault());
    mini.addEventListener("click", (e) => {
      const b = e.target.closest("button"), ta = document.querySelector(SEL);
      if (!b || !ta) return;
      setValue(ta, R.applyFix(ta.value, shown[+b.dataset.i].fixes[+b.dataset.f]));
    });
    let raf = 0;
    const q = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(place); };
    new MutationObserver(q).observe(document.body, { childList: true, subtree: true, characterData: true });
    ["input", "scroll", "resize", "mouseup"].forEach((ev) => addEventListener(ev, q, true));
    addEventListener("mousemove", (e) => { if (e.buttons) q(); }, true);
    place();
  })();
})();