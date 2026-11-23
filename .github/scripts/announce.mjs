// Announces notes marked `announce: true` on Bluesky and Mastodon and records
// the posts in _data/social.yml, where _includes/Responses.html finds them.
// Run by .github/workflows/announce.yml. Notes already listed for a platform
// are skipped, so a run that failed halfway only retries what is missing.
//
// Env: BLUESKY_HANDLE, BLUESKY_APP_PASSWORD, [BLUESKY_SERVICE],
//      MASTODON_INSTANCE, MASTODON_TOKEN, [DRY_RUN=true], [WAIT_SECONDS]
// A platform without credentials is skipped.

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import yaml from "js-yaml";

const ROOT = process.cwd();
const NOTES_DIR = path.join(ROOT, "_notes/Public");
const DATA_FILE = path.join(ROOT, "_data/social.yml");
const DRY = process.env.DRY_RUN === "true";
const WAIT_SECONDS = Number(process.env.WAIT_SECONDS || 600);

const config = yaml.load(await fs.readFile(path.join(ROOT, "_config.yml"), "utf8"));
const SITE = String(config.url).replace(/\/$/, "");

const bsky = process.env.BLUESKY_HANDLE && process.env.BLUESKY_APP_PASSWORD
  ? { handle: process.env.BLUESKY_HANDLE, password: process.env.BLUESKY_APP_PASSWORD,
      service: (process.env.BLUESKY_SERVICE || "https://bsky.social").replace(/\/$/, "") }
  : null;
const masto = process.env.MASTODON_INSTANCE && process.env.MASTODON_TOKEN
  ? { instance: process.env.MASTODON_INSTANCE.replace(/^https?:\/\//, "").replace(/\/$/, ""),
      token: process.env.MASTODON_TOKEN }
  : null;
if (!bsky) console.log("Bluesky: no credentials, skipping.");
if (!masto) console.log("Mastodon: no credentials, skipping.");

// ---- notes -----------------------------------------------------------------

// Jekyll's default slugify: runs of anything but letters and digits become "-".
const slugify = s => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");

function splitFrontMatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  return m ? { fm: yaml.load(m[1]) || {}, body: m[2] } : { fm: {}, body: src };
}

// The note's opening as plain text, like _includes/Description.html.
function excerpt(body, max = 200) {
  const text = body
    .replace(/^\[\^[^\]]+\]:.*$/gm, "")                     // footnote definitions
    .replace(/\[\^[^\]]+\]/g, "")                           // footnote markers
    .split(/\n\s*\n/).map(p => p.trim())
    .filter(p => p && !/^(#|```|\$\$|>|\||<)/.test(p))      // skip headings, code, math, quotes, tables, HTML
    .join(" ")
    .replace(/\[\[([^\]]*?)::[^\]]*\]\]/g, "$1")             // [[Label::url]]
    .replace(/\[\[[^\]]*?\\?\|([^\]]*)\]\]/g, "$1")          // [[Note|label]], [[Note\|label]]
    .replace(/\[\[([^\]#]*)(#[^\]]*)?\]\]/g, "$1")           // [[Note]], [[Note#Heading]]
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")               // [text](url), images
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ").trim();
  return truncate(text, max);
}

const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const graphemes = s => [...seg.segment(s)].length;

function truncate(s, max) {
  if (graphemes(s) <= max) return s;
  const parts = [...seg.segment(s)].slice(0, max - 1).map(x => x.segment).join("");
  return parts.replace(/\s+\S*$/, "") + "…";
}

async function loadNotes() {
  const files = (await fs.readdir(NOTES_DIR)).filter(f => f.endsWith(".md"));
  const notes = [];
  for (const file of files) {
    const { fm, body } = splitFrontMatter(await fs.readFile(path.join(NOTES_DIR, file), "utf8"));
    if (fm.announce !== true || fm.published === false) continue;
    const key = fm.permalink
      ? "/" + String(fm.permalink).replace(/^\/|\/$/g, "").replace(/\.html$/, "")
      : "/notes/" + slugify(path.basename(file, ".md"));
    notes.push({
      file, key,
      title: String(fm.title || path.basename(file, ".md")),
      summary: String(fm.announce_text || fm.description || excerpt(body)),
      lang: fm.lang ? String(fm.lang) : null,
      url: SITE + key,
    });
  }
  return notes;
}

// ---- data file ---------------------------------------------------------------

async function loadData() {
  let src = "";
  try { src = await fs.readFile(DATA_FILE, "utf8"); } catch { /* first run */ }
  const header = (src.match(/^(?:#.*\n|\s*\n)*/) || [""])[0];
  return { header, data: yaml.load(src) || {} };
}

async function saveData({ header, data }) {
  if (DRY) return;
  const body = Object.keys(data).length ? yaml.dump(data, { lineWidth: -1, quotingType: '"' }) : "";
  await fs.writeFile(DATA_FILE, header.replace(/\s*$/, "\n\n") + body);
}

// ---- helpers -------------------------------------------------------------------

async function http(url, opts = {}) {
  const r = await fetch(url, opts);
  const text = await r.text();
  if (!r.ok) throw new Error(`${opts.method || "GET"} ${url}: ${r.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

const sleep = ms => new Promise(res => setTimeout(res, ms));

// Don't post a link before GitHub Pages has published the note.
async function waitUntilLive(url) {
  const until = Date.now() + WAIT_SECONDS * 1000;
  for (;;) {
    try {
      const r = await fetch(url, { redirect: "follow" });
      if (r.ok) return true;
    } catch { /* not yet */ }
    if (Date.now() > until) return false;
    await sleep(15000);
  }
}

async function ogImage(pageUrl) {
  try {
    const html = await (await fetch(pageUrl)).text();
    const m = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/)
      || html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/);
    return m ? new URL(m[1], pageUrl).href : null;
  } catch { return null; }
}

// ---- Bluesky ---------------------------------------------------------------------

let bskySession = null;

async function bskyLogin() {
  if (!bskySession) {
    bskySession = await http(bsky.service + "/xrpc/com.atproto.server.createSession", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: bsky.handle, password: bsky.password }),
    });
  }
  return bskySession;
}

async function postBluesky(note) {
  const link = note.url;
  const head = note.title + (note.summary ? "\n\n" : "");
  const room = 300 - graphemes(head) - graphemes(link) - 2;
  const text = head + truncate(note.summary, Math.max(room, 0)) + "\n\n" + link;
  if (DRY) { console.log(`  [dry run] Bluesky:\n${indent(text)}`); return null; }

  const s = await bskyLogin();
  const auth = { Authorization: "Bearer " + s.accessJwt };
  const enc = new TextEncoder();
  const byteStart = enc.encode(text.slice(0, text.lastIndexOf(link))).length;
  const external = { uri: link, title: note.title, description: note.summary };

  const img = await ogImage(link);
  if (img) {
    try {
      const r = await fetch(img);
      const type = r.headers.get("content-type") || "image/png";
      const bytes = Buffer.from(await r.arrayBuffer());
      if (r.ok && bytes.length < 1_000_000 && type.startsWith("image/")) {
        const up = await http(bsky.service + "/xrpc/com.atproto.repo.uploadBlob", {
          method: "POST", headers: { ...auth, "Content-Type": type }, body: bytes,
        });
        external.thumb = up.blob;
      }
    } catch (e) { console.log("  Bluesky: no card image (" + e.message + ")"); }
  }

  const record = {
    $type: "app.bsky.feed.post",
    text,
    createdAt: new Date().toISOString(),
    facets: [{
      index: { byteStart, byteEnd: byteStart + enc.encode(link).length },
      features: [{ $type: "app.bsky.richtext.facet#link", uri: link }],
    }],
    embed: { $type: "app.bsky.embed.external", external },
  };
  if (note.lang) record.langs = [note.lang];

  const res = await http(bsky.service + "/xrpc/com.atproto.repo.createRecord", {
    method: "POST", headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ repo: s.did, collection: "app.bsky.feed.post", record }),
  });
  return {
    bluesky: res.uri,
    bluesky_url: `https://bsky.app/profile/${s.handle}/post/${res.uri.split("/").pop()}`,
  };
}

// ---- Mastodon --------------------------------------------------------------------

async function postMastodon(note) {
  // Mastodon counts every link as 23 characters; stay well under 500.
  const head = note.title + (note.summary ? "\n\n" : "");
  const room = 500 - graphemes(head) - 23 - 2 - 20;
  const status = head + truncate(note.summary, Math.max(room, 0)) + "\n\n" + note.url;
  if (DRY) { console.log(`  [dry run] Mastodon:\n${indent(status)}`); return null; }

  const body = { status, visibility: "public" };
  if (note.lang) body.language = note.lang;
  const res = await http(`https://${masto.instance}/api/v1/statuses`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + masto.token,
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.createHash("sha256").update("volcel:" + note.key).digest("hex"),
    },
    body: JSON.stringify(body),
  });
  return { mastodon_id: String(res.id), mastodon_url: res.url };
}

const indent = s => s.replace(/^/gm, "    ");

// ---- main ------------------------------------------------------------------------

const notes = await loadNotes();
const store = await loadData();
let failures = 0;

for (const note of notes) {
  const entry = store.data[note.key] || {};
  const todo = [
    bsky && !entry.bluesky && ["Bluesky", postBluesky],
    masto && !entry.mastodon_id && ["Mastodon", postMastodon],
  ].filter(Boolean);
  if (!todo.length) continue;

  console.log(`${note.title} (${note.key})`);
  if (!DRY && !(await waitUntilLive(note.url))) {
    console.log(`  ${note.url} isn't live after ${WAIT_SECONDS}s; will retry on the next run.`);
    failures++;
    continue;
  }
  for (const [name, post] of todo) {
    try {
      const got = await post(note);
      if (!got) continue;
      store.data[note.key] = Object.assign(store.data[note.key] || {}, got);
      if (!store.data[note.key].hide) store.data[note.key].hide = [];
      await saveData(store);                       // keep each success, even if the next fails
      console.log(`  ${name}: ${Object.values(got).pop()}`);
    } catch (e) {
      console.log(`  ${name} failed: ${e.message}`);
      failures++;
    }
  }
}

if (!notes.length) console.log("No notes with `announce: true`.");
process.exitCode = failures ? 1 : 0;
