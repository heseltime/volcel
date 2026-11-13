// The lattice: topics run one way, threads of reading run across them, and a
// note sits where they cross. Built from window.GARDEN (titles each note links
// to), no extra markup in the notes.
//
//   Garden.crossings(scrollEl)  marks under a note's title: topics that reach it
//   Garden.latticeView(el)      All notes as a grid: notes down, topics across
//   Garden.threadLine(panes)    the current thread, drawn under the top bar
//
// A topic "reaches" a note when it links to it (direct) or links to a note that
// links to it (two steps).
(function () {
  "use strict";

  const G = window.GARDEN || { notes: [] };
  const basePath = new URL((G.base || "") + "/", location.href).pathname;
  const norm = t => String(t).trim().toLowerCase()
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"');

  const notes = G.notes.map(n => {
    const path = new URL(n.url, location.href).pathname;
    return Object.assign({}, n, {
      key: norm(n.title),
      id: decodeURIComponent(path.startsWith(basePath) ? path.slice(basePath.length) : path)
        .replace(/\.html$/, "").replace(/\/$/, ""),
    });
  });
  const byKey = new Map(notes.map(n => [n.key, n]));
  const byId = new Map(notes.map(n => [n.id, n]));
  const out = new Map(notes.map(n => [n.key,
    new Set(n.links.map(norm).filter(k => byKey.has(k) && k !== n.key))]));
  const topics = notes.filter(n => n.topic)
    .sort((a, b) => (a.order - b.order) || a.title.localeCompare(b.title));

  // reach.get(topicKey) -> Map(noteKey -> 1 | 2)
  const reach = new Map(topics.map(t => {
    const m = new Map();
    out.get(t.key).forEach(k => m.set(k, 1));
    out.get(t.key).forEach(k => out.get(k).forEach(k2 => {
      if (k2 !== t.key && !m.has(k2)) m.set(k2, 2);
    }));
    return [t.key, m];
  }));

  function crossingsOf(note) {
    return topics
      .map(t => ({ topic: t, depth: t.key === note.key ? 0 : (reach.get(t.key).get(note.key) || null) }))
      .filter(c => c.depth !== null);
  }

  function topicLabel(t) {
    return (t.emoji ? t.emoji + " " : "") + t.label;
  }

  function noteFor(scrollEl) {
    const pane = scrollEl.closest(".pane");
    const id = pane && pane.dataset.id;
    if (id && byId.has(id)) return byId.get(id);
    const h1 = scrollEl.querySelector(":scope > h1");
    if (!h1) return null;
    const copy = h1.cloneNode(true);
    copy.querySelectorAll(".note-emoji").forEach(e => e.remove());
    return byKey.get(norm(copy.textContent)) || null;
  }

  // (1) Crossing marks under the title.
  function crossings(scrollEl) {
    if (!scrollEl || scrollEl.querySelector(":scope > .crossings")) return;
    const h1 = scrollEl.querySelector(":scope > h1");
    const note = h1 && noteFor(scrollEl);
    if (!note || !topics.length) return;
    const list = crossingsOf(note);
    if (!list.length) return;
    const p = document.createElement("p");
    p.className = "crossings";
    const lead = document.createElement("span");
    lead.className = "crossings-lead";
    lead.textContent = list.some(c => c.depth === 0) && list.length === 1 ? "topic" : "crosses";
    p.appendChild(lead);
    list.forEach(c => {
      const a = document.createElement("a");
      a.href = c.topic.url;
      a.className = "crossing" + (c.depth === 2 ? " is-far" : "") + (c.depth === 0 ? " is-self" : "");
      a.textContent = topicLabel(c.topic);
      a.title = c.depth === 0 ? "This note is a topic"
        : c.depth === 1 ? c.topic.title + " links here" : "Two steps from " + c.topic.title;
      p.appendChild(a);
    });
    h1.after(p);
  }

  // (2) All notes as a lattice: one row per note (title, date) and one column
  // per topic, with a dot where the topic reaches the note.
  const fmtDate = d => d ? new Date(d + "T00:00:00Z").toLocaleDateString("en-GB",
    { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "";

  function latticeView(el) {
    if (!el) return;
    const rows = notes.slice()
      .sort((a, b) => (b.date || "").localeCompare(a.date || "") || a.title.localeCompare(b.title));
    const grid = document.createElement("div");
    grid.className = "lattice";
    grid.style.setProperty("--cols", String(topics.length));
    grid.setAttribute("role", "table");
    grid.setAttribute("aria-label", "All notes, newest first, with the topics that reach each one");

    const head = document.createElement("div");
    head.className = "lattice-row lattice-head";
    head.setAttribute("role", "row");
    ["Note", "Date"].forEach(label => {
      const h = document.createElement("span");
      h.className = "lattice-colhead";
      h.setAttribute("role", "columnheader");
      h.textContent = label;
      head.appendChild(h);
    });
    topics.forEach(t => {
      const cell = document.createElement("span");
      cell.className = "lattice-topic";
      cell.setAttribute("role", "columnheader");
      const a = document.createElement("a");
      a.href = t.url;
      a.textContent = topicLabel(t);
      a.title = t.title;
      cell.appendChild(a);
      head.appendChild(cell);
    });
    grid.appendChild(head);

    rows.forEach(n => {
      const row = document.createElement("div");
      row.className = "lattice-row";
      row.setAttribute("role", "row");

      const name = document.createElement("span");
      name.className = "lattice-name";
      name.setAttribute("role", "rowheader");
      const a = document.createElement("a");
      a.href = n.url;
      a.textContent = (n.topic && n.emoji ? n.emoji + " " : "") + n.title;
      name.appendChild(a);
      row.appendChild(name);

      const date = document.createElement("span");
      date.className = "lattice-date";
      date.setAttribute("role", "cell");
      if (n.date) {
        const time = document.createElement("time");
        time.dateTime = n.date;
        time.textContent = fmtDate(n.date);
        date.appendChild(time);
      }
      row.appendChild(date);

      topics.forEach(t => {
        const depth = t.key === n.key ? 0 : (reach.get(t.key).get(n.key) || null);
        const cell = document.createElement("span");
        cell.className = "lattice-cell" + (depth === null ? "" : depth === 2 ? " is-far" : " is-near");
        cell.setAttribute("role", "cell");
        if (depth !== null) {
          cell.title = depth === 0 ? n.title + " is this topic"
            : depth === 1 ? t.title + " links to " + n.title : n.title + " is two steps from " + t.title;
          cell.setAttribute("aria-label", cell.title);
        }
        row.appendChild(cell);
      });
      grid.appendChild(row);
    });
    el.replaceChildren(grid);
  }

  // (3) The current thread under the top bar: one tick per open pane, marked
  // where the pane's note crosses a topic.
  function threadLine(panes) {
    const line = document.querySelector(".thread-line");
    if (!line) return;
    line.replaceChildren();
    if (!panes || panes.length < 2) { line.classList.remove("is-on"); return; }
    line.classList.add("is-on");
    panes.forEach((pane, i) => {
      const n = byId.get(pane.dataset.id);
      const tick = document.createElement("button");
      tick.type = "button";
      tick.className = "thread-tick";
      const crossed = n ? crossingsOf(n) : [];
      if (crossed.length) tick.classList.add("is-crossing");
      tick.style.left = (panes.length === 1 ? 0 : (i / (panes.length - 1)) * 100) + "%";
      tick.title = (n ? n.title : "This page") +
        (crossed.length ? " · " + crossed.map(c => c.topic.label).join(", ") : "");
      tick.addEventListener("click", () => {
        const spine = pane.querySelector(".pane-spine");
        if (spine) spine.click();
      });
      line.appendChild(tick);
    });
  }

  window.Garden = Object.assign(window.Garden || {}, { crossings, latticeView, threadLine });

  function init() {
    document.querySelectorAll(".stack > .pane > .pane-scroll").forEach(crossings);
    const view = document.querySelector(".lattice-view");
    if (view) {
      latticeView(view);
      const list = document.querySelector(".all-notes");
      if (list) list.hidden = true;
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
