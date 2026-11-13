// Stacked notes: following a link to a note or post opens it as a new pane to
// the right instead of navigating away. Following a link from an earlier pane
// drops everything to its right, so the reading path branches left to right.
// Open panes live in the URL (?stackedNotes=notes/a&stackedNotes=notes/b), so
// a path can be shared and the back button walks it. Below 800px the site
// behaves like ordinary page navigation.
(function () {
  "use strict";

  const stack = document.querySelector(".stack");
  if (!stack) return;

  const wide = window.matchMedia("(min-width: 800px)");
  const PARAM = "stackedNotes";
  const basePath = new URL(((window.GARDEN && window.GARDEN.base) || "") + "/", location.href).pathname;

  function spineWidth() {
    return parseFloat(getComputedStyle(stack).getPropertyValue("--spine")) || 40;
  }

  // Stack id for a URL: its path relative to the site base, e.g. "notes/wiki-links".
  // Only notes and blog posts stack; index pages, menus and external links don't.
  function idFor(href) {
    let u;
    try { u = new URL(href, location.href); } catch (e) { return null; }
    if (u.origin !== location.origin || !u.pathname.startsWith(basePath)) return null;
    const rel = decodeURIComponent(u.pathname.slice(basePath.length))
      .replace(/\/index\.html$/, "").replace(/\.html$/, "").replace(/\/$/, "");
    return /^(notes|blog)\/[^/]+/.test(rel) ? rel : null;
  }

  const panes = () => Array.from(stack.querySelectorAll(":scope > .pane"));

  // ---- loading -----------------------------------------------------------

  const cache = new Map();

  function fetchPane(id) {
    if (!cache.has(id)) {
      const p = fetch(basePath + id)
        .then(r => (r.ok ? r : fetch(basePath + id + "/")))
        .then(r => { if (!r.ok) throw new Error(r.status + " " + id); return r.text(); })
        .then(html => {
          const doc = new DOMParser().parseFromString(html, "text/html");
          const src = doc.querySelector(".stack > .pane .pane-scroll");
          if (!src) throw new Error("no pane in " + id);
          src.querySelectorAll(".footer, script").forEach(n => n.remove());
          const h1 = src.querySelector("h1");
          return { title: h1 ? h1.textContent.trim() : doc.title, html: src.innerHTML };
        });
      p.catch(() => cache.delete(id));
      cache.set(id, p);
    }
    return cache.get(id);
  }

  function addSpine(pane, title) {
    if (pane.querySelector(":scope > .pane-spine")) return;
    const spine = document.createElement("a");
    spine.className = "pane-spine";
    spine.href = pane.dataset.id ? basePath + pane.dataset.id : location.pathname;
    spine.title = title;
    spine.textContent = title;
    pane.prepend(spine);
  }

  function emptyPane(id) {
    const pane = document.createElement("article");
    pane.className = "pane is-loading";
    pane.dataset.id = id;
    const scroll = document.createElement("div");
    scroll.className = "pane-scroll";
    pane.appendChild(scroll);
    return pane;
  }

  function fill(pane, data) {
    const scroll = pane.querySelector(".pane-scroll");
    scroll.innerHTML = data.html;
    pane.classList.remove("is-loading");
    addSpine(pane, data.title);
    scroll.querySelectorAll(".content").forEach(el => {
      if (window.Garden && Garden.linkify) Garden.linkify(el);
      if (window.Garden && Garden.sidenotes) Garden.sidenotes(el);
    });
    if (window.Garden && Garden.crossings) Garden.crossings(scroll);
  }

  function failed(pane, id) {
    pane.classList.remove("is-loading");
    const scroll = pane.querySelector(".pane-scroll");
    scroll.innerHTML = "";
    const p = document.createElement("p");
    p.className = "pane-error";
    const a = document.createElement("a");
    a.href = basePath + id;
    a.textContent = "Open " + id;
    p.append("This note couldn't be loaded. ", a);
    scroll.appendChild(p);
    addSpine(pane, id);
  }

  // Append panes for ids (in order) after the current last pane.
  function append(ids, anchor) {
    const created = ids.map((id, i) => {
      const pane = emptyPane(id);
      stack.appendChild(pane);
      fetchPane(id)
        .then(d => {
          if (!pane.isConnected) return;
          fill(pane, d);
          const t = i === ids.length - 1 && findIn(pane, anchor);
          if (t) requestAnimationFrame(() => reveal(t));
        }, () => pane.isConnected && failed(pane, id))
        .then(layout);
      return pane;
    });
    layout();
    return created;
  }

  function truncateAfter(pane) {
    let next = pane.nextElementSibling;
    while (next) {
      const n = next.nextElementSibling;
      if (next.classList.contains("pane")) next.remove();
      next = n;
    }
  }

  // ---- URL state ---------------------------------------------------------

  function idsFromUrl() {
    return new URLSearchParams(location.search).getAll(PARAM).filter(Boolean);
  }

  function writeUrl(push) {
    const ids = panes().slice(1).map(p => p.dataset.id);
    const q = new URLSearchParams(location.search);
    q.delete(PARAM);
    ids.forEach(id => q.append(PARAM, id));
    const qs = q.toString();
    const url = location.pathname + (qs ? "?" + qs : "") + location.hash;
    history[push ? "pushState" : "replaceState"]({ stack: ids }, "", url);
  }

  // Make the stack match ids, keeping the common prefix that is already open.
  function restore(ids) {
    const open = panes();
    let keep = 1;
    while (keep < open.length && open[keep].dataset.id === ids[keep - 1]) keep++;
    truncateAfter(open[keep - 1]);
    append(ids.slice(keep - 1));
  }

  // ---- layout ------------------------------------------------------------

  function natural(list, i) {
    let x = 0;
    for (let k = 0; k < i; k++) x += list[k].offsetWidth;
    return x;
  }

  // Sticky panes slide over each other; a pane that is (almost) fully covered
  // collapses to its spine, which shows the title vertically.
  function layout() {
    const list = panes();
    const spine = spineWidth();
    stack.classList.toggle("is-single", list.length === 1);
    const visualLeft = i => Math.max(i * spine, natural(list, i) - stack.scrollLeft);
    list.forEach((p, i) => {
      p.style.left = i * spine + "px";
      p.style.zIndex = String(i + 1);
      const next = list[i + 1];
      const shown = next ? visualLeft(i + 1) - i * spine : Infinity;
      p.classList.toggle("is-collapsed", wide.matches && shown < spine * 2);
      p.classList.toggle("is-overlapped", wide.matches && !!next && shown < p.offsetWidth - 1);
    });
    markTrail(list);
    if (window.Garden && Garden.threadLine) Garden.threadLine(wide.matches ? list : []);
  }

  // Highlight, in each pane, the link that opened the pane to its right.
  function markTrail(list) {
    stack.querySelectorAll("a.is-trail").forEach(a => a.classList.remove("is-trail"));
    list.forEach((p, i) => {
      const next = list[i + 1];
      if (!next) return;
      p.querySelectorAll(".pane-scroll .content a[href]").forEach(a => {
        if (idFor(a.href) === next.dataset.id) a.classList.add("is-trail");
      });
    });
  }

  function focus(pane, smooth) {
    const list = panes();
    const i = list.indexOf(pane);
    if (i < 0) return;
    const left = Math.max(0, natural(list, i) - i * spineWidth());
    stack.scrollTo({ left, behavior: smooth === false ? "auto" : "smooth" });
    pane.classList.remove("is-flash");
    void pane.offsetWidth;
    pane.classList.add("is-flash");
  }

  // ---- events ------------------------------------------------------------

  function findIn(pane, anchor) {
    const id = decodeURIComponent(anchor || "");
    return id ? Array.from(pane.querySelectorAll("[id]")).find(el => el.id === id) : null;
  }

  function reveal(el) {
    const target = el.closest(".sidenote") ? el : (el.matches("li[id^='fn']") && el.closest(".pane.has-sidenotes")
      ? findSidenote(el) : el);
    target.scrollIntoView({ block: "center", behavior: "smooth" });
    target.classList.remove("is-flash");
    void target.offsetWidth;
    target.classList.add("is-flash");
  }

  function findSidenote(li) {
    const pane = li.closest(".pane");
    return (pane && pane.querySelector('.sidenote[data-for="' + CSS.escape(li.id) + '"]')) || li;
  }

  function open(fromPane, id, anchor) {
    const existing = panes().find(p => p.dataset.id === id);
    if (existing) {
      focus(existing);
      const t = findIn(existing, anchor);
      if (t) reveal(t);
      return;
    }
    truncateAfter(fromPane);
    const [pane] = append([id], anchor);
    writeUrl(true);
    requestAnimationFrame(() => focus(pane));
  }

  stack.addEventListener("click", e => {
    if (!wide.matches || e.defaultPrevented || e.button !== 0 ||
        e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest("a[href]");
    if (!a || (a.target && a.target !== "_self")) return;
    if (a.getAttribute("href").startsWith("#")) {
      // In-note anchors (footnotes, headings): resolve inside this pane only,
      // since ids like fn:1 repeat across panes.
      const pane = a.closest(".pane");
      const target = pane && findIn(pane, a.getAttribute("href").slice(1));
      if (target) { e.preventDefault(); reveal(target); }
      return;
    }
    const pane = a.closest(".pane");
    if (!pane) return;
    if (a.classList.contains("pane-spine")) {
      e.preventDefault();
      focus(pane);
      return;
    }
    const id = idFor(a.href);
    if (!id) return;
    e.preventDefault();
    if (window.Garden && Garden.hidePreview) Garden.hidePreview();
    open(pane, id, new URL(a.href, location.href).hash.slice(1));
  });

  window.addEventListener("popstate", () => restore(idsFromUrl()));
  stack.addEventListener("scroll", () => requestAnimationFrame(layout), { passive: true });
  window.addEventListener("resize", layout);
  wide.addEventListener("change", layout);

  // ---- init --------------------------------------------------------------

  const root = panes()[0];
  root.dataset.id = idFor(location.href) || "";
  const h1 = root.querySelector(".pane-scroll h1");
  addSpine(root, h1 ? h1.textContent.trim() : document.title);
  const initial = idsFromUrl().filter(id => /^(notes|blog)\/[^/]+/.test(id) && id !== root.dataset.id);
  if (initial.length && wide.matches) {
    const created = append(initial);
    writeUrl(false);
    requestAnimationFrame(() => focus(created[created.length - 1], false));
  } else {
    layout();
    unfold();
  }

  // A page can name a note to unfold next to it on arrival (front matter
  // `unfold: notes/about`, rendered as data-unfold on .stack). The note opens as
  // the second pane; the first pane glides from the centre to the left instead
  // of jumping, and the new pane unfolds from its left edge like a page.
  function unfold() {
    const id = stack.dataset.unfold;
    if (!id || !wide.matches || panes().length > 1 || id === root.dataset.id) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    fetchPane(id).then(() => {
      if (panes().length > 1) return; // the reader already opened something
      setTimeout(() => {
        if (panes().length > 1) return;
        const before = root.getBoundingClientRect().left;
        const [pane] = append([id]);
        writeUrl(false);
        if (still) return;
        const shift = before - root.getBoundingClientRect().left;
        if (shift) {
          root.animate([{ transform: `translateX(${shift}px)` }, { transform: "none" }],
            { duration: 650, easing: "cubic-bezier(.2,.7,.2,1)" });
        }
        pane.classList.add("is-unfolding");
        pane.addEventListener("animationend", () => pane.classList.remove("is-unfolding"), { once: true });
      }, 450);
    }, () => {});
  }
})();
