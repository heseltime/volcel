# volcel

Personal notes by Jack Heseltine: **https://heseltime.github.io/volcel/**

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

## Preview

```bash
docker run --rm -p 4000:4000 -v "$PWD":/srv/site -w /srv/site ruby:3.1.1-alpine3.15 \
  sh -c "apk add --no-cache build-base && gem install bundler:2.4.22 && bundle install && bundle exec jekyll serve --host 0.0.0.0 --config _config.yml,debug.yml --unpublished"
```

Then open http://localhost:4000; unpublished notes show with a "Hidden" banner. Pushing to `main` publishes through GitHub Pages.

## Credits

Built on [Jekyll Garden](https://github.com/Jekyll-Garden/jekyll-garden.github.io) (MIT), after [Simply Jekyll](https://github.com/raghudotcc/simply-jekyll). The reading model follows [Andy Matuschak's notes](https://notes.andymatuschak.org/); no code was taken from them. Code is MIT (see `LICENSE`). Notes are © Jack Heseltine, CC BY-NC 4.0.
