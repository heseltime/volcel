// Torte view: the whole lattice at once, drawn flat as the top of a Linzer
// torte. Topics are strips running one diagonal, notes (newest in the middle)
// the other, woven over and under; jam shows through the gaps, and a drop of
// jam sits on every crossing where a topic reaches a note (smaller when it is
// two links away). Hover a strip to see its label at the pointer; click it to
// continue the current thread with that note. On touch, the first tap shows
// the label and the second opens. Data comes from lattice.js.
(function () {
  "use strict";

  const buttons = Array.from(document.querySelectorAll(".torte-toggle, .torte-open"));
  if (!buttons.length || !window.Garden || !Garden.latticeData) return;

  const NS = "http://www.w3.org/2000/svg";
  const R = 92;                       // the filling, inside the crust ring
  let overlay = null;
  let lastFocus = null;

  function el(name, attrs, parent) {
    const node = document.createElementNS(NS, name);
    Object.entries(attrs || {}).forEach(([k, v]) => node.setAttribute(k, v));
    if (parent) parent.appendChild(node);
    return node;
  }

  // Positions of n parallel strips across the tart, middle first, outwards,
  // so the first item (the newest note) lies across the centre.
  function lanes(n) {
    const step = (2 * R) / (n + 1);
    const slots = Array.from({ length: n }, (_, i) => -R + (i + 1) * step);
    const mid = (n - 1) / 2;
    const pos = slots.map((x, i) => ({ x, d: Math.abs(i - mid), i }))
      .sort((a, b) => a.d - b.d || a.i - b.i).map(s => s.x);
    return { pos, width: Math.min(step * 0.62, 30) };
  }

  // The newest notes, up to the configured limit, plus any note we must show
  // (the one you came from). Kept in date order, so the newest stay in the middle.
  function pick(all, include) {
    const cfg = (window.GARDEN && GARDEN.torte) || {};
    const small = window.matchMedia("(max-width: 600px)").matches;
    const max = Math.max(1, (small ? cfg.maxSmall : cfg.max) || (small ? 12 : 21));
    const chosen = all.slice(0, max);
    include.forEach(url => {
      const n = all.find(x => x.url === url);
      if (n && !chosen.includes(n)) chosen.splice(chosen.length - 1, 1, n);
    });
    const order = new Map(all.map((n, k) => [n, k]));
    chosen.sort((a, b) => order.get(a) - order.get(b));
    return { notes: chosen, hidden: all.length - chosen.length };
  }

  function draw(include) {
    const data = Garden.latticeData();
    const { topics, depth, fmtDate } = data;
    const { notes, hidden } = pick(data.notes, include);
    const svg = el("svg", { viewBox: "-104 -104 208 208", class: "torte-svg", role: "img",
      "aria-labelledby": "torte-title torte-desc" });
    el("desc", { id: "torte-desc" }, svg).textContent =
      `${topics.length} topics and ${notes.length} notes woven as a lattice; jam marks where a topic reaches a note.`;
    const clip = el("clipPath", { id: "torte-clip" }, el("defs", {}, svg));
    el("circle", { r: R }, clip);

    el("circle", { r: 102, class: "torte-crust" }, svg);
    el("circle", { r: R, class: "torte-jam" }, svg);

    const lattice = el("g", { transform: "rotate(45)" },
      el("g", { "clip-path": "url(#torte-clip)" }, svg));
    const N = lanes(notes.length);
    const T = lanes(topics.length);
    T.width = Math.min(T.width, N.width * 1.5);
    const L = 140;

    notes.forEach((n, j) => {
      const r = el("rect", { x: -L, y: N.pos[j] - N.width / 2, width: 2 * L, height: N.width,
        class: "torte-strip torte-note" }, lattice);
      r.style.setProperty("--i", j);
      r.dataset.kind = "note"; r.dataset.index = j;
    });
    topics.forEach((t, i) => {
      const r = el("rect", { x: T.pos[i] - T.width / 2, y: -L, width: T.width, height: 2 * L,
        class: "torte-strip torte-topic" }, lattice);
      r.style.setProperty("--i", i + notes.length);
      r.dataset.kind = "topic"; r.dataset.index = i;
    });
    // Weave: on every other crossing the note strip goes back over the topic.
    topics.forEach((t, i) => notes.forEach((n, j) => {
      if ((i + j) % 2) return;
      const r = el("rect", { x: T.pos[i] - T.width / 2, y: N.pos[j] - N.width / 2,
        width: T.width, height: N.width, class: "torte-strip torte-note torte-over" }, lattice);
      r.style.setProperty("--i", notes.length + topics.length + j);
      r.dataset.kind = "note"; r.dataset.index = j;
    }));

    const drops = [];
    topics.forEach((t, i) => notes.forEach((n, j) => {
      const d = depth(t, n);
      if (d === null) return;
      const size = Math.min(N.width, T.width) * (d === 2 ? 0.16 : 0.26);
      const c = el("circle", { cx: T.pos[i], cy: N.pos[j], r: size,
        class: "torte-drop" + (d === 2 ? " is-far" : "") + (d === 0 ? " is-self" : "") }, lattice);
      c.style.setProperty("--i", j + i);
      c.dataset.topic = i; c.dataset.note = j;
      drops.push(c);
    }));

    // The mark: an outer group carries the position (SVG attribute), the inner
    // group carries the CSS pulse, so the animation never overrides the position.
    const mark = el("g", { class: "torte-markpos" }, lattice);
    const pulse = el("g", { class: "torte-markgroup" }, mark);
    el("circle", { r: 1, class: "torte-mark-outer" }, pulse);
    el("circle", { r: 1, class: "torte-mark" }, pulse);
    mark.style.display = "none";

    return { svg, lattice, mark, N, T, notes, hidden, topics, depth, fmtDate, drops };
  }

  function build(include) {
    if (overlay) overlay.remove();
    overlay = document.createElement("div");
    overlay.className = "torte";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "torte-title");
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="torte-head">
        <h2 id="torte-title">The lattice, as a torte</h2>
        <button type="button" class="torte-close" aria-label="Close">×</button>
      </div>
      <div class="torte-figure" tabindex="0" aria-label="Torte. Arrow keys move between crossings, Enter opens the note, Escape closes."></div>
      <div class="torte-label" aria-hidden="true"><strong></strong><span></span></div>
      <p class="torte-key">
        <span class="torte-key-drop"></span>a topic reaches the note
        <span class="torte-key-drop is-far"></span>two links away
        <span class="torte-key-sep">·</span>topics run ╱, notes ╲, newest in the middle
        <span class="torte-key-sep">·</span>arrow keys move, Enter opens, Esc closes
      </p>
      <p class="torte-live" aria-live="polite"></p>
      <ul class="torte-list"></ul>`;
    document.body.appendChild(overlay);

    const view = draw(include);
    overlay.querySelector(".torte-figure").appendChild(view.svg);
    if (view.hidden > 0) {
      const more = document.createElement("span");
      more.className = "torte-more";
      more.innerHTML = `<span class="torte-key-sep">·</span>+ ${view.hidden} older note${view.hidden === 1 ? "" : "s"}, all in <a href="${(GARDEN.base || "")}/">All notes</a>`;
      overlay.querySelector(".torte-key").appendChild(more);
    }
    const label = overlay.querySelector(".torte-label");
    const live = overlay.querySelector(".torte-live");
    let hot = null;               // "note:3" / "topic:0"

    function describe(kind, index) {
      if (kind === "note") {
        const n = view.notes[index];
        const crossed = view.topics.filter(t => view.depth(t, n) !== null).map(t => t.label);
        return {
          title: n.title,
          meta: [n.date ? view.fmtDate(n.date) : "", crossed.length ? "crosses " + crossed.join(", ") : "on no topic yet"]
            .filter(Boolean).join(" · "),
        };
      }
      const t = view.topics[index];
      const count = view.notes.filter(n => view.depth(t, n) !== null).length;
      return { title: (t.emoji ? t.emoji + " " : "") + t.label, meta: `topic · reaches ${count} note${count === 1 ? "" : "s"}` };
    }

    // A crossing: both strips lit, the mark on it, the label beside it.
    function markCrossing(i, j) {
      const t = view.topics[i], n = view.notes[j];
      const d = view.depth(t, n);
      const size = Math.min(view.N.width, view.T.width) * 0.42;
      view.mark.setAttribute("transform", `translate(${view.T.pos[i]} ${view.N.pos[j]})`);
      view.mark.querySelectorAll("circle").forEach((c, k) => c.setAttribute("r", size + (k ? 0 : 1.6)));
      view.mark.style.display = "";
      current = { i, j };
      hot = "cross:" + i + ":" + j;
      view.svg.classList.add("is-hovering");
      view.svg.querySelectorAll(".torte-strip").forEach(s =>
        s.classList.toggle("is-hot", (s.dataset.kind === "note" && s.dataset.index === String(j)) ||
          (s.dataset.kind === "topic" && s.dataset.index === String(i))));
      view.drops.forEach(dr => dr.classList.toggle("is-hot", dr.dataset.topic === String(i) && dr.dataset.note === String(j)));
      const meta = d === null ? "no link yet" : d === 0 ? "this note is the topic"
        : d === 1 ? "direct link" : "two links away";
      label.querySelector("strong").textContent = n.title + " × " + (t.emoji ? t.emoji + " " : "") + t.label;
      label.querySelector("span").textContent = meta;
      live.textContent = n.title + " and " + t.label + ": " + meta;
      label.classList.add("is-on");
      const placeAtMark = () => {
        const b = view.mark.getBoundingClientRect();
        place(b.left + b.width / 2, b.top + b.height / 2);
      };
      placeAtMark();
      if (settle) { clearTimeout(settle); }
      settle = setTimeout(placeAtMark, 750);    // after the strips have settled
    }
    let current = null;
    let settle = 0;

    // Keyboard: arrows move along the strips from crossing to crossing,
    // Enter opens the note, Esc closes.
    overlay.addEventListener("keydown", e => {
      const keys = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (keys[e.key]) {
        e.preventDefault();
        const c = current || { i: 0, j: 0 };
        const fresh = !current || current.strip;
        const i = fresh ? c.i : Math.min(view.topics.length - 1, Math.max(0, c.i + keys[e.key][0]));
        const j = fresh ? c.j : Math.min(view.notes.length - 1, Math.max(0, c.j + keys[e.key][1]));
        markCrossing(i, j);
      } else if (e.key === "Enter" && current && !e.target.closest("a, button")) {
        e.preventDefault();
        const n = view.notes[current.j];
        close();
        Garden.openNote(n.url);
      }
    });
    overlay.markCrossing = markCrossing;

    // A whole strip: lit, its label in the middle of the tart. Arrow keys then
    // carry on along that strip.
    function focusStrip(kind, index) {
      view.mark.style.display = "none";
      hot = null;
      highlight(kind, index);
      const strip = view.svg.querySelector(`.torte-${kind}:not(.torte-over)[data-index="${index}"]`);
      const where = () => {
        const svgBox = view.svg.getBoundingClientRect();
        const lane = kind === "note" ? view.N.pos[index] : view.T.pos[index];
        // the strip's midpoint on the tart: its lane, rotated by 45 degrees
        const ux = kind === "note" ? -lane * Math.SQRT1_2 : lane * Math.SQRT1_2;
        const uy = lane * Math.SQRT1_2;
        const scale = svgBox.width / 208;
        place(svgBox.left + svgBox.width / 2 + ux * scale, svgBox.top + svgBox.height / 2 + uy * scale);
      };
      where();
      clearTimeout(settle);
      settle = setTimeout(where, 750);
      current = kind === "note" ? { i: 0, j: index, strip: true } : { i: index, j: 0, strip: true };
    }
    overlay.focusStrip = focusStrip;

    function highlight(kind, index, x, y) {
      const key = kind === null ? null : kind + ":" + index;
      if (key !== hot) {
        hot = key;
        view.svg.classList.toggle("is-hovering", key !== null);
        view.svg.querySelectorAll(".torte-strip").forEach(s =>
          s.classList.toggle("is-hot", s.dataset.kind === kind && s.dataset.index === String(index)));
        view.drops.forEach(d => d.classList.toggle("is-hot",
          (kind === "topic" && d.dataset.topic === String(index)) || (kind === "note" && d.dataset.note === String(index))));
        if (key === null) {
          label.classList.remove("is-on");
        } else {
          const text = describe(kind, index);
          label.querySelector("strong").textContent = text.title;
          label.querySelector("span").textContent = text.meta;
          live.textContent = text.title + ", " + text.meta;
          label.classList.add("is-on");
        }
      }
      if (key !== null && x !== undefined) place(x, y);
    }

    // The label sits just above and to the right of the pointer, kept on screen.
    function place(x, y) {
      const w = label.offsetWidth, h = label.offsetHeight, pad = 12;
      let left = x + 16, top = y - h - 14;
      if (left + w > innerWidth - pad) left = x - w - 16;
      if (top < pad) top = y + 20;
      label.style.transform = `translate(${Math.max(pad, left)}px, ${top}px)`;
    }

    // Pointer over the jam between strips: take the nearest strip, so every
    // point on the tart answers.
    function stripAt(e) {
      const direct = e.target.closest(".torte-strip");
      if (direct) return direct;
      const ctm = view.lattice.getScreenCTM();
      if (!ctm) return null;
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
      if (Math.hypot(p.x, p.y) > R) return null;
      const near = (lanes, coord) => lanes.pos.reduce((best, v, i) =>
        Math.abs(v - coord) < best.d ? { i, d: Math.abs(v - coord) } : best, { i: -1, d: Infinity });
      const n = near(view.N, p.y), t = near(view.T, p.x);
      const pick = t.i >= 0 && t.d - view.T.width / 2 < n.d - view.N.width / 2 ? ["topic", t.i] : ["note", n.i];
      return view.svg.querySelector(`.torte-${pick[0]}[data-index="${pick[1]}"]`);
    }

    function itemFor(s) {
      return s.dataset.kind === "note" ? view.notes[s.dataset.index] : view.topics[s.dataset.index];
    }

    view.svg.addEventListener("pointermove", e => {
      const s = stripAt(e);
      if (s) highlight(s.dataset.kind, Number(s.dataset.index), e.clientX, e.clientY);
      else if (e.pointerType !== "touch") highlight(null);
    });
    view.svg.addEventListener("pointerleave", e => { if (e.pointerType !== "touch") highlight(null); });
    view.svg.addEventListener("pointerup", e => {
      const s = stripAt(e);
      if (!s) { highlight(null); return; }
      const key = s.dataset.kind + ":" + s.dataset.index;
      if (e.pointerType === "touch" && hot !== key) {      // first tap: show the label
        highlight(s.dataset.kind, Number(s.dataset.index), e.clientX, e.clientY);
        return;
      }
      const item = itemFor(s);
      close();
      Garden.openNote(item.url);
    });

    // The same content as links, for keyboards and screen readers.
    const list = overlay.querySelector(".torte-list");
    view.notes.forEach((n, j) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = n.url;
      const text = describe("note", j);
      a.textContent = text.title + " · " + text.meta;
      a.addEventListener("focus", () => {
        highlight("note", j);
        const strip = view.svg.querySelector(`.torte-note[data-index="${j}"]`);
        const box = strip.getBoundingClientRect();
        place(box.left + box.width / 2, box.top + box.height / 2);
      });
      a.addEventListener("click", e => { e.preventDefault(); close(); Garden.openNote(n.url); });
      li.appendChild(a);
      list.appendChild(li);
    });

    overlay.querySelector(".torte-close").addEventListener("click", close);
    overlay.addEventListener("keydown", e => {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      if (e.key === "Tab") {
        const f = Array.from(overlay.querySelectorAll("button, a[href]"));
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    overlay.highlightNone = () => { view.mark.style.display = "none"; current = null; highlight(null); };
    overlay.view = view;
  }

  // Notes to always show: the given one, or the notes open in the panes.
  function open(noteUrl) {
    let include = [];
    if (noteUrl) include = [noteUrl];
    else {
      const base = new URL(((window.GARDEN && GARDEN.base) || "") + "/", location.href);
      include = Array.from(document.querySelectorAll(".stack > .pane"))
        .map(p => p.dataset.id).filter(Boolean).map(id => new URL(id, base).href);
      const all = Garden.latticeData().notes;
      include = include.map(h => (all.find(n => new URL(n.url, location.href).href === h) || {}).url).filter(Boolean);
    }
    build(include);
    lastFocus = document.activeElement;
    overlay.hidden = false;
    overlay.highlightNone();
    overlay.classList.remove("is-shown");
    void overlay.offsetWidth;            // restart the lay-in animation
    overlay.classList.add("is-shown");
    document.documentElement.classList.add("torte-open");
    buttons.forEach(b => b.setAttribute("aria-expanded", "true"));
    overlay.querySelector(".torte-figure").focus();
  }

  function close() {
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    document.documentElement.classList.remove("torte-open");
    buttons.forEach(b => b.setAttribute("aria-expanded", "false"));
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  buttons.forEach(b => b.addEventListener("click", () => (overlay && !overlay.hidden ? close() : open())));

  // From the All notes lattice: open the torte with one crossing marked.
  window.Garden = Object.assign(window.Garden || {}, {
    openTorte(noteUrl, topicUrl) {
      open(noteUrl);
      const v = overlay.view;
      const j = v.notes.findIndex(n => n.url === noteUrl);
      const i = v.topics.findIndex(t => t.url === topicUrl);
      if (i >= 0 && j >= 0) overlay.markCrossing(i, j);
      else if (j >= 0) overlay.focusStrip("note", j);
      else if (i >= 0) overlay.focusStrip("topic", i);
    },
  });
})();
