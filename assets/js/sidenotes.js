// Margin notes from plain Markdown footnotes.
//
//   Some claim.[^why]
//   [^why]: The reasoning, shown in the right-hand column next to the claim.
//
// Kramdown renders footnotes as <sup><a class="footnote" href="#fn:why"> plus an
// <ol> in .footnotes at the end. On wide screens each footnote is copied into a
// <span class="sidenote"> right after its reference and floated into the margin
// column; on narrow screens CSS hides the copies and the usual footnote list shows.
(function () {
  "use strict";

  function sidenotes(root) {
    if (!root || root.dataset.sidenotes) return;
    const list = root.querySelector(".footnotes");
    if (!list) return;
    const items = new Map(Array.from(list.querySelectorAll("li[id]")).map(li => [li.id, li]));
    let count = 0;

    root.querySelectorAll("a.footnote[href^='#']").forEach(ref => {
      const id = decodeURIComponent(ref.getAttribute("href").slice(1));
      const li = items.get(id);
      if (!li) return;

      const note = document.createElement("span");
      note.className = "sidenote";
      note.setAttribute("role", "note");
      note.dataset.for = id;

      const num = document.createElement("span");
      num.className = "sidenote-number";
      num.textContent = ref.textContent;
      note.appendChild(num);

      const body = li.cloneNode(true);
      body.querySelectorAll(".reversefootnote").forEach(a => a.remove());
      // Flatten <p> wrappers so the note can live inline inside the paragraph.
      Array.from(body.childNodes).forEach((child, i) => {
        if (i > 0) note.appendChild(document.createTextNode(" "));
        if (child.nodeType === Node.ELEMENT_NODE && child.tagName === "P") {
          note.append(...child.childNodes);
        } else {
          note.appendChild(child);
        }
      });

      (ref.closest("sup") || ref).after(note);
      count++;
    });

    if (count) {
      root.dataset.sidenotes = String(count);
      root.classList.add("has-sidenotes");
      const pane = root.closest(".pane");
      if (pane) pane.classList.add("has-sidenotes");
      if (window.Garden && Garden.linkify) Garden.linkify(root);
    }
  }

  window.Garden = Object.assign(window.Garden || {}, { sidenotes });

  function init() {
    document.querySelectorAll(".content").forEach(sidenotes);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
