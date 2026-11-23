// Responses: replies to a note's Bluesky and Mastodon announcement posts,
// shown under "Links to this note" (see _includes/Responses.html). Reply
// counts load when the block scrolls into view; the threads load only when
// the reader opens it. Both use the platforms' public APIs, no login.
// stack.js calls Garden.responses(pane) for each pane it opens.
(function () {
  "use strict";

  const BSKY = "https://public.api.bsky.app/xrpc/";
  // Bluesky labels that keep a reply off the page.
  const BSKY_HIDE_LABELS = new Set(["porn", "sexual", "nudity", "graphic-media", "gore", "spam"]);

  // ---- fetching ----------------------------------------------------------

  const cache = new Map();

  function getJSON(url) {
    if (!cache.has(url)) {
      const opts = { credentials: "omit", headers: { Accept: "application/json" } };
      if (window.AbortSignal && AbortSignal.timeout) opts.signal = AbortSignal.timeout(12000);
      const p = fetch(url, opts).then(r => {
        if (!r.ok) throw new Error(r.status + " " + url);
        return r.json();
      });
      p.catch(() => cache.delete(url));
      cache.set(url, p);
    }
    return cache.get(url);
  }

  function sources(sec) {
    let hide = [];
    try { hide = JSON.parse(sec.dataset.hide || "[]") || []; } catch (e) { /* bad YAML: show all */ }
    return {
      bsky: sec.dataset.bsky || null,
      masto: sec.dataset.mastoInstance && sec.dataset.mastoId
        ? { instance: sec.dataset.mastoInstance, id: sec.dataset.mastoId } : null,
      hide: new Set(hide.map(String)),
    };
  }

  // ---- Bluesky -----------------------------------------------------------

  function bskyWebUrl(post) {
    const rkey = post.uri.split("/").pop();
    return "https://bsky.app/profile/" + (post.author.handle || post.author.did) + "/post/" + rkey;
  }

  function bskyLabelled(post) {
    const labels = (post.labels || []).concat(post.author.labels || []);
    return labels.some(l => l.val && (l.val[0] === "!" || BSKY_HIDE_LABELS.has(l.val)));
  }

  function bskyThread(src) {
    const url = BSKY + "app.bsky.feed.getPostThread?depth=6&parentHeight=0&uri=" + encodeURIComponent(src.bsky);
    return getJSON(url).then(d => {
      const gate = d.threadgate || (d.thread && d.thread.post && d.thread.post.threadgate);
      const hidden = new Set((gate && gate.record && gate.record.hiddenReplies) || []);
      const walk = node => (node.replies || [])
        .filter(r => r && r.$type === "app.bsky.feed.defs#threadViewPost" && r.post)
        .filter(r => !hidden.has(r.post.uri) && !src.hide.has(r.post.uri)
          && !src.hide.has(bskyWebUrl(r.post)) && !bskyLabelled(r.post))
        .map(r => ({
          via: "Bluesky",
          url: bskyWebUrl(r.post),
          name: r.post.author.displayName || r.post.author.handle,
          handle: "@" + r.post.author.handle,
          profile: "https://bsky.app/profile/" + r.post.author.handle,
          avatar: r.post.author.avatar,
          date: r.post.record.createdAt || r.post.indexedAt,
          body: bskyBody(r.post.record),
          children: walk(r),
        }));
      return d.thread ? walk(d.thread) : [];
    });
  }

  // Post text with its facets (links, mentions, tags) as links. Facet offsets
  // count UTF-8 bytes, not characters.
  function bskyBody(record) {
    const out = document.createDocumentFragment();
    const text = record.text || "";
    const bytes = new TextEncoder().encode(text);
    const dec = new TextDecoder();
    const facets = (record.facets || [])
      .filter(f => f.index && f.index.byteEnd > f.index.byteStart)
      .sort((a, b) => a.index.byteStart - b.index.byteStart);
    let pos = 0;
    facets.forEach(f => {
      const { byteStart, byteEnd } = f.index;
      if (byteStart < pos) return;
      out.append(dec.decode(bytes.slice(pos, byteStart)));
      const label = dec.decode(bytes.slice(byteStart, byteEnd));
      const feat = (f.features || [])[0] || {};
      let href = null;
      if (feat.$type === "app.bsky.richtext.facet#link") href = feat.uri;
      else if (feat.$type === "app.bsky.richtext.facet#mention") href = "https://bsky.app/profile/" + feat.did;
      else if (feat.$type === "app.bsky.richtext.facet#tag") href = "https://bsky.app/hashtag/" + encodeURIComponent(feat.tag);
      out.append(href ? link(href, label) : label);
      pos = byteEnd;
    });
    out.append(dec.decode(bytes.slice(pos)));
    const embed = record.embed && (record.embed.media || record.embed);
    if (embed && embed.images && embed.images.length) {
      const note = document.createElement("span");
      note.className = "response-media";
      note.textContent = embed.images.length === 1 ? " (image)" : " (" + embed.images.length + " images)";
      out.append(note);
    }
    const p = document.createElement("p");
    p.className = "response-text";
    p.append(out);
    return p;
  }

  // ---- Mastodon ----------------------------------------------------------

  function mastoThread(src) {
    const { instance, id } = src.masto;
    const url = "https://" + instance + "/api/v1/statuses/" + encodeURIComponent(id) + "/context";
    return getJSON(url).then(ctx => {
      const byParent = new Map();
      (ctx.descendants || []).forEach(s => {
        if (src.hide.has(s.url) || src.hide.has(s.uri) || src.hide.has(String(s.id))) return;
        const k = String(s.in_reply_to_id);
        if (!byParent.has(k)) byParent.set(k, []);
        byParent.get(k).push(s);
      });
      const build = pid => (byParent.get(String(pid)) || []).map(s => ({
        via: "Mastodon",
        url: s.url || s.uri,
        name: s.account.display_name || s.account.username,
        handle: "@" + s.account.acct + (s.account.acct.includes("@") ? "" : "@" + instance),
        profile: s.account.url,
        avatar: s.account.avatar_static || s.account.avatar,
        date: s.created_at,
        body: mastoBody(s),
        children: build(s.id),
      }));
      return build(id);
    });
  }

  function mastoBody(s) {
    const body = sanitize(s.content || "");
    if (s.media_attachments && s.media_attachments.length) {
      const note = document.createElement("p");
      note.className = "response-media";
      note.textContent = s.media_attachments.length === 1 ? "(attachment)" : "(" + s.media_attachments.length + " attachments)";
      body.append(note);
    }
    if (!s.spoiler_text) return body;
    const cw = document.createElement("details");
    cw.className = "response-cw";
    const sum = document.createElement("summary");
    sum.textContent = s.spoiler_text;
    cw.append(sum, body);
    return cw;
  }

  // Mastodon sends HTML. Copy only text, paragraphs, line breaks and http(s)
  // links into new nodes; everything else is dropped. DOMParser documents are
  // inert, so nothing in the input runs or loads.
  function sanitize(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const out = document.createElement("div");
    out.className = "response-text";
    (function copy(from, into) {
      from.childNodes.forEach(n => {
        if (n.nodeType === Node.TEXT_NODE) { into.append(n.nodeValue); return; }
        if (n.nodeType !== Node.ELEMENT_NODE) return;
        const tag = n.tagName;
        if (n.classList.contains("invisible")) return;          // shortened URL parts
        if (tag === "SCRIPT" || tag === "STYLE" || tag === "TEMPLATE") return;
        if (tag === "BR") { into.append(document.createElement("br")); return; }
        if (tag === "P") { const p = document.createElement("p"); copy(n, p); into.append(p); return; }
        if (tag === "A") {
          const href = n.getAttribute("href") || "";
          if (/^https?:\/\//i.test(href)) { const a = link(href, ""); copy(n, a); into.append(a); return; }
        }
        copy(n, into);
        if (n.classList.contains("ellipsis")) into.append("\u2026");
      });
    })(doc.body, out);
    return out;
  }

  // ---- rendering ---------------------------------------------------------

  function link(href, text) {
    const a = document.createElement("a");
    a.href = href;
    a.rel = "nofollow ugc noopener";
    a.target = "_blank";
    if (text) a.textContent = text;
    return a;
  }

  const rtf = window.Intl && Intl.RelativeTimeFormat ? new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }) : null;

  function ago(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    const s = (d - Date.now()) / 1000;
    if (!rtf) return d.toLocaleDateString();
    const steps = [[60, "second"], [60, "minute"], [24, "hour"], [7, "day"], [4.35, "week"], [12, "month"], [Infinity, "year"]];
    let v = s;
    for (const [n, unit] of steps) {
      if (Math.abs(v) < n) return rtf.format(Math.round(v), unit);
      v /= n;
    }
    return d.toLocaleDateString();
  }

  const byDate = (a, b) => new Date(a.date) - new Date(b.date);

  function count(items) {
    return items.reduce((n, it) => n + 1 + count(it.children), 0);
  }

  function renderList(items) {
    const ol = document.createElement("ol");
    ol.className = "responses-replies";
    items.slice().sort(byDate).forEach(it => {
      const li = document.createElement("li");
      li.className = "response response-" + it.via.toLowerCase();

      const head = document.createElement("div");
      head.className = "response-head";
      if (it.avatar && /^https:\/\//.test(it.avatar)) {
        const img = document.createElement("img");
        img.className = "response-avatar";
        img.src = it.avatar;
        img.alt = "";
        img.loading = "lazy";
        img.referrerPolicy = "no-referrer";
        head.append(img);
      }
      const who = link(it.profile, "");
      who.className = "response-author";
      const name = document.createElement("span");
      name.className = "response-name";
      name.textContent = it.name;
      const handle = document.createElement("span");
      handle.className = "response-handle";
      handle.textContent = it.handle;
      who.append(name, " ", handle);
      const when = link(it.url, "");
      when.className = "response-date";
      const time = document.createElement("time");
      time.dateTime = it.date;
      time.title = new Date(it.date).toLocaleString();
      time.textContent = ago(it.date);
      when.append(time);
      const via = document.createElement("span");
      via.className = "response-via";
      via.textContent = it.via;
      head.append(who, when, via);

      li.append(head, it.body);
      if (it.children.length) li.append(renderList(it.children));
      ol.append(li);
    });
    return ol;
  }

  function para(text, cls) {
    const p = document.createElement("p");
    p.className = cls;
    p.textContent = text;
    return p;
  }

  function setLabel(sec, n) {
    const label = sec.querySelector(".responses-count");
    if (label) label.textContent = n === 0 ? "No replies yet" : n === 1 ? "1 reply" : n + " replies";
  }

  // ---- wiring ------------------------------------------------------------

  function counts(sec, src) {
    const jobs = [];
    if (src.bsky) {
      jobs.push(getJSON(BSKY + "app.bsky.feed.getPosts?uris=" + encodeURIComponent(src.bsky))
        .then(d => (d.posts && d.posts[0] && d.posts[0].replyCount) || 0));
    }
    if (src.masto) {
      jobs.push(getJSON("https://" + src.masto.instance + "/api/v1/statuses/" + encodeURIComponent(src.masto.id))
        .then(s => s.replies_count || 0));
    }
    Promise.allSettled(jobs).then(res => {
      if (sec.dataset.loaded) return;               // the full thread already set it
      const ok = res.filter(r => r.status === "fulfilled");
      if (ok.length) setLabel(sec, ok.reduce((n, r) => n + r.value, 0));
    });
  }

  function load(sec, src) {
    const list = sec.querySelector(".responses-list");
    list.replaceChildren(para("Loading replies\u2026", "responses-status"));
    const jobs = [
      src.bsky ? bskyThread(src) : Promise.resolve(null),
      src.masto ? mastoThread(src) : Promise.resolve(null),
    ];
    Promise.allSettled(jobs).then(([b, m]) => {
      const items = [];
      const failed = [];
      [[b, "Bluesky"], [m, "Mastodon"]].forEach(([r, name]) => {
        if (r.status === "fulfilled") { if (r.value) items.push(...r.value); }
        else failed.push(name);
      });
      list.replaceChildren();
      if (items.length) list.append(renderList(items));
      else if (!failed.length) list.append(para("No replies yet.", "responses-status"));
      failed.forEach(name => list.append(para("Couldn't load " + name + " replies.", "responses-status responses-error")));
      if (failed.length < [src.bsky, src.masto].filter(Boolean).length) setLabel(sec, count(items));
    });
  }

  function email(sec) {
    const span = sec.querySelector("span.responses-email");
    if (!span || !span.dataset.user || !span.dataset.domain) return;
    const a = document.createElement("a");
    a.className = "responses-email";
    a.href = "mailto:" + span.dataset.user + "@" + span.dataset.domain
      + "?subject=" + encodeURIComponent(span.dataset.subject || "")
      + "&body=" + encodeURIComponent("\n\n(In response to " + (span.dataset.url || location.href) + ")");
    a.textContent = "by email";
    span.replaceWith(a);
  }

  function setup(sec) {
    sec.dataset.ready = "1";
    email(sec);
    const details = sec.querySelector(".responses-thread");
    if (!details) return;
    const src = sources(sec);
    if (!src.bsky && !src.masto) return;

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(entries => {
        if (entries.some(e => e.isIntersecting)) { io.disconnect(); counts(sec, src); }
      }, { rootMargin: "200px" });
      io.observe(sec);
    } else {
      counts(sec, src);
    }

    details.addEventListener("toggle", () => {
      if (details.open && !sec.dataset.loaded) {
        sec.dataset.loaded = "1";
        load(sec, src);
      }
    });
  }

  function responses(root) {
    (root || document).querySelectorAll(".responses:not([data-ready])").forEach(setup);
  }

  window.Garden = Object.assign(window.Garden || {}, { responses });

  function init() { responses(document); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
