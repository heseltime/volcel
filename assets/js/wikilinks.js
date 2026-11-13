// Wiki links ([[Title]] and [[Label::https://url]]) and hover previews.
// Exposes Garden.linkify(root) so stacked panes loaded later get the same treatment.
(function () {
  "use strict";

  const notes = (window.GARDEN && window.GARDEN.notes) || [];
  // Kramdown turns ' and " into curly quotes, so compare titles with quotes straightened.
  const norm = t => t.trim().toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"');
  const byTitle = new Map(notes.map(n => [norm(n.title), n]));
  const WIKI = /\[\[([^\]]+)\]\]/g;

  function insideCode(node) {
    for (let el = node.parentElement; el; el = el.parentElement) {
      if (el.tagName === "CODE" || el.tagName === "PRE" ||
          el.classList.contains("highlighter-rouge") || el.classList.contains("highlight")) {
        return true;
      }
    }
    return false;
  }

  function makeLink(text) {
    const a = document.createElement("a");
    if (text.includes("::")) {
      const [label, url] = text.split("::");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = label;
      return a;
    }
    // Obsidian-style [[Target|label]] and [[Target#Heading]].
    const [target, label] = text.split("|");
    const [title, heading] = target.split("#");
    const note = byTitle.get(norm(title));
    a.textContent = (label || target).trim();
    if (!note) {
      // Not on the site: unpublished (published: false), private (_notes/Private)
      // or not written yet. Keep the words, drop the link; it turns into a real
      // link on its own once a note with this title is published.
      const span = document.createElement("span");
      span.className = "private-link";
      span.textContent = a.textContent;
      span.title = (window.GARDEN && GARDEN.privateMsg) || "This note hasn't been published yet.";
      return span;
    }
    if (heading) {
      a.href = note.url + "#" + heading.trim().toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
      a.className = note.hidden ? "wiki-link is-hidden" : "wiki-link";
      return a;
    }
    a.href = note.url;
    a.className = note.hidden ? "wiki-link is-hidden" : "wiki-link";
    a.addEventListener("mouseenter", () => showPreview(a, note));
    a.addEventListener("mouseleave", hidePreview);
    a.addEventListener("click", hidePreview);
    return a;
  }

  function linkifyText(node) {
    const text = node.textContent;
    WIKI.lastIndex = 0;
    if (!WIKI.test(text) || insideCode(node)) return;
    WIKI.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let last = 0;
    let m;
    while ((m = WIKI.exec(text)) !== null) {
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      const span = document.createElement("span");
      span.appendChild(makeLink(m[1]));
      frag.appendChild(span);
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    node.parentNode.replaceChild(frag, node);
  }

  function linkify(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(linkifyText);
  }

  function showPreview(link, note) {
    hidePreview();
    const preview = document.createElement("div");
    preview.className = "link-preview";
    const inner = document.createElement("div");
    inner.className = "preview-content";
    const title = document.createElement("strong");
    title.textContent = note.title;
    const body = document.createElement("p");
    body.textContent = note.excerpt;
    inner.append(title, body);
    preview.appendChild(inner);
    document.body.appendChild(preview);
    const rect = link.getBoundingClientRect();
    preview.style.position = "fixed";
    preview.style.left = rect.left + "px";
    preview.style.top = rect.bottom + 5 + "px";
    preview.style.zIndex = "2000";
  }

  function hidePreview() {
    document.querySelectorAll(".link-preview").forEach(p => p.remove());
  }

  window.Garden = Object.assign(window.Garden || {}, { linkify, hidePreview });

  function init() {
    document.querySelectorAll(".content").forEach(linkify);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
