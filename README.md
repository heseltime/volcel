# volcel

Personal notes by Jack Heseltine: **https://heseltime.github.io/volcel/**

The theme is published separately as **[Linzer Lattice](https://github.com/heseltime/linzer-lattice)**, so other sites can use it.

## A lattice, not a garden

Published notes are usually called a *digital garden*. The word brings a shape with it: beds and paths, notes growing from seedling to evergreen, and, seen through an index, a tree of categories with a note at every leaf.

These notes don't sort into one hierarchy, so the site is drawn as a **lattice** instead. **Topics** run one way, as parallel lines. **Threads** of reading run across them. A note is where a thread crosses a topic.

```
              Observability   This site
 thread  ─────────●────────────────○─────
 thread  ─────────┼────────────────●─────
 thread  ─────────○────────────────●─────
```

The word fits in three ways. A *trellis* gives growth a direction without fixing its form. A *grille* is the lattice screen of an enclosed monastery, something you speak through that also marks a boundary, as unpublished notes do here. And an *order*, in mathematics, is a lattice where any two elements meet and join. The note [A Lattice, Not a Garden](https://heseltime.github.io/volcel/notes/a-lattice-not-a-garden) says more.

## How the site shows it

- **Threads are panes.** Following a link opens the note to the right of the one you're reading, as on [Andy Matuschak's notes](https://notes.andymatuschak.org/). Go back to an earlier pane and follow another link, and the thread branches from there. The open panes stay in the URL, so a thread can be shared.
- **Topics are in the top bar.** Any note with `topic: true` in its front matter becomes one.
- **Crossings sit under each title:** the topics that reach the note, directly or two links away.
- **The home page is the lattice:** every note, newest first, one column per topic, a dot where they cross.
- **A thread line under the top bar** marks each open pane, blue where it crosses a topic.
- **Links to this note** end every note, split into topics and other notes, with the sentence each link sits in.
- **The torte.** The button next to the light/dark switch shows the whole lattice as the top of a Linzer torte: topics are pastry strips one way, notes the other, and a drop of redcurrant jam marks each crossing. Click a strip to open that note.

Nothing is tagged by hand. All of it comes from the `[[links]]` between notes.

## Writing

Notes are Markdown files in `_notes/Public/`, readable in Obsidian:

```markdown
---
title: Observability for Inner Space
topic: true            # optional: makes it a topic
label: Observability   # optional: text in the top bar
emoji: 🔭              # optional, topics only
date: 2026-11-13
---

A [[Note Title]], a [[Note Title\|label]] (escape the pipe), a [[Note#Heading]],
an external [[Label::https://example.com]] link, and a margin note.[^aside]

[^aside]: Footnotes show up in the right margin.
```

To keep a note off the site, add `published: false`; the file stays in the repository. To keep it on your machine only, put it in `_notes/Private/`. Links to either show as plain text until the note is published.

## Responses

A note with `announce: true` in its front matter is posted to the volcel Bluesky and Mastodon accounts when it reaches `main`, by `.github/workflows/announce.yml`. Replies to those posts appear at the foot of the note under **Responses**. They load in the reader's browser when the reader opens the list, so each pane stays quiet until then. A reply-by-email link sits next to them.

```markdown
---
title: A Note
announce: true
description: One or two sentences for link previews and the post.  # optional
announce_text: Text for the post instead of the description.       # optional
---
```

- The posts are recorded in `_data/social.yml`, keyed by the note's URL. The Action commits that file, so `git pull` after an announcement. To link a post you made by hand, add an entry yourself.
- To hide a reply, add its post URL or AT URI to `hide:` under the note in `_data/social.yml`. Replies you hide in the Bluesky app are left out on their own.
- The accounts and the email address are set under `responses:` in `_config.yml`. The workflow needs the repository secrets `BLUESKY_HANDLE`, `BLUESKY_APP_PASSWORD`, `MASTODON_INSTANCE` and `MASTODON_TOKEN` (scope `write:statuses`). Run it by hand with "dry run" to see what it would post.

## Preview

```bash
docker run --rm -p 4000:4000 -v "$PWD":/srv/site -w /srv/site ruby:3.1.1-alpine3.15 \
  sh -c "apk add --no-cache build-base && gem install bundler:2.4.22 && bundle install && bundle exec jekyll serve --host 0.0.0.0 --config _config.yml,debug.yml --unpublished"
```

Then open http://localhost:4000; unpublished notes show with a "Hidden" banner. Pushing to `main` publishes through GitHub Pages.

## Credits

The theme lives on as [Linzer Lattice](https://github.com/heseltime/linzer-lattice). Built on [Jekyll Garden](https://github.com/Jekyll-Garden/jekyll-garden.github.io) (MIT), after [Simply Jekyll](https://github.com/raghudotcc/simply-jekyll). The reading model follows [Andy Matuschak's notes](https://notes.andymatuschak.org/); no code was taken from them. Code is MIT (see `LICENSE`). Notes are © Jack Heseltine, CC BY-NC 4.0.
