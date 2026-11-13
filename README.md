# volcel

Personal notes by Jack Heseltine, live at **https://heseltime.github.io/volcel/**.

It's a Jekyll site for linked Markdown notes that reads like [Andy Matuschak's working notes](https://notes.andymatuschak.org/). Following a link opens the note as a new pane to the right, so a reading session is a path left to right, not a walk up and down a tree. Topics run one way, threads of reading run across them, and the home page draws the whole thing as a lattice.

Built on [Jekyll Garden](https://github.com/Jekyll-Garden/jekyll-garden.github.io) (MIT). The notes themselves are © Jack Heseltine, CC BY-NC.

## Contents

- [How it reads](#how-it-reads)
- [Writing notes](#writing-notes)
- [Topics, threads and the lattice](#topics-threads-and-the-lattice)
- [Hiding notes](#hiding-notes)
- [Sketches](#sketches)
- [Local preview](#local-preview)
- [Publishing](#publishing)
- [Using this as your own site](#using-this-as-your-own-site)
- [Code map](#code-map)

## How it reads

- **Panes.** On screens 800px and wider, a link to a note opens it as a new pane on the right. Follow a different link from an earlier pane and everything to its right closes, so the path branches. Older panes slide under newer ones and collapse to a spine with the title written vertically; click a spine to bring the pane back. Narrow screens navigate page by page.
- **Shareable paths.** The open panes are kept in the URL (`?stackedNotes=notes/a&stackedNotes=notes/b`), so a path can be linked, and the back button walks it.
- **Home.** All notes, newest first, drawn as the lattice. About unfolds next to it on arrival.
- **Top bar.** The sun (hover it to pick this site or the parent site), the site name (home), the topics, and a light/dark switch on the right. The theme follows the system setting until the reader picks one.
- **Margin notes.** Markdown footnotes appear in the right margin next to their sentence, and as a list at the end on phones.
- **Links to this note.** The end of every note lists the notes that link to it, each with the paragraph the link sits in, grouped into *On these topics* and *From other notes*.

## Writing notes

Notes are plain Markdown files in `_notes/Public/`, the same files you'd edit in Obsidian:

```markdown
---
title: Why Books Don't Work
date: 2026-11-13
---

Text with a [[Wiki Link]], a [[Wiki Link\|custom label]], a [[Note#Heading]]
and an external [[Label::https://example.com]] link.

A claim that needs an aside.[^why]

[^why]: This shows up in the right margin.
```

| Syntax | Result |
|:--|:--|
| `[[Note Title]]` | link to a note; opens a pane |
| `[[Note Title\|label]]` | link with custom text. Escape the pipe, or Markdown reads the line as a table. |
| `[[Note Title#Heading]]` | link to a heading in a note |
| `[[Label::https://…]]` | external link, opens in a new tab |
| `Claim.[^id]` + `[^id]: aside` | margin note |
| `$x = y$`, `$$…$$` | math (KaTeX) |

Titles are matched without regard to case or curly quotes. A link to a note that isn't published shows as plain text and becomes a link once the note is published.

## Topics, threads and the lattice

There is no notes/blog split; everything is a note. A **topic** is a note that starts reading paths, and it gets a link in the top bar:

```yaml
---
title: Observability for Inner Space
topic: true
order: 2              # place in the top bar (lower first, unordered last)
label: Observability  # text in the top bar (default: title)
emoji: 🔭             # topics only
date: 2026-11-13
---
```

A **thread** is what you read from a topic, pane by pane. The lattice is worked out from the `[[links]]` alone; nothing else needs marking:

- **Crossings:** under each note's title, the topics that reach it, either directly or two links away (shown lighter).
- **All notes:** one row per note with its date, one column per topic, ● for a direct link, ○ for two steps.
- **Thread line:** a thin line under the top bar, one tick per open pane, blue where that note crosses a topic.
- **Trellis:** a faint pattern behind the panes.

Front matter for special pages: `all_notes: true` renders a page as the lattice (used by `pages/notes.md`, the home page), and `unfold: notes/about` opens that note beside the page on arrival.

## Hiding notes

| How | Effect |
|:--|:--|
| `published: false` in front matter | not built, so not on the site. **The file is still public in the repository.** |
| file in `_notes/Private/` | never built and git-ignored, so it stays on your machine |

The local preview builds `published: false` notes with a "Hidden" banner so you can read them.

## Sketches

Line drawings live in `_includes/sketches/*.svg` and go into a note like this:

```html
<figure class="sketch">
{% include sketches/great-divorce-bus.svg %}
<figcaption>Caption.</figcaption>
</figure>
```

The style:
- one ink colour (`stroke="currentColor"`: navy in light mode, pale in dark);
- two line weights: 2.5 for outlines, 1.25 for detail and hatching;
- round caps and joins, no fills;
- one colour, for light only: shapes with `class="sketch-light"` (fill) or `sketch-light-line` (stroke) use the lime of the sun logo;
- shading by short parallel hatching, never grey.

Keep a `<title>` and `<desc>` in each SVG for screen readers, and no blank lines inside it, or Markdown will split it.

## Local preview

You need Docker. Ruby isn't required.

```bash
docker run --rm -p 4000:4000 -v "$PWD":/srv/site -w /srv/site ruby:3.1.1-alpine3.15 \
  sh -c "apk add --no-cache build-base && gem install bundler:2.4.22 && bundle install && bundle exec jekyll serve --host 0.0.0.0 --config _config.yml,debug.yml --unpublished"
```

Open http://localhost:4000. `debug.yml` points links at localhost, and `--unpublished` shows drafts. Restart after changing `_config.yml`.

## Publishing

Push to `main`. GitHub Pages builds the site from `main` with its own Jekyll 3.10, which ignores the `Gemfile` and custom plugins. Everything here runs on both 3.10 and the Jekyll 4 used locally.

## Using this as your own site

The repository is both a theme and my notes. To start your own:

1. **Copy it.** Use GitHub's **Use this template** button if it's shown, or **Fork** if you want to pull theme changes later (see below).
2. **Clear the notes.** Delete everything in `_notes/Public/` and write an `About.md`.
3. **Set `_config.yml`:**
   - `title`, `heading`, `description`;
   - `url` and `baseurl`: for a project site `https://<you>.github.io/<repo>`, or `url` = your domain and `baseurl` = `""`;
   - `parent_site`: the second entry in the sun menu; remove it if you don't want one;
   - `footer.copyright`.
4. **Replace the images** in `assets/img/`: `favicon.svg`, `volcel-badge.svg` (the top-left sun) and `apple-touch-icon.png`.
5. **Set the home page.** In `pages/notes.md`, set `unfold:` to your About note, or remove it.
6. **Publish.** Settings → Pages → deploy from `main` / root.

**Fork or template?**

| | Fork | Template |
|:--|:--|:--|
| Theme updates later | yes: `git pull upstream main` | no, copy changes by hand |
| History | shares mine | clean start |
| Can be private | no; forks of public repos stay public | yes |
| Merge conflicts | in the notes, if you pull | none |

If you fork, add the upstream once and pull theme updates from it:

```bash
git remote add upstream https://github.com/heseltime/volcel.git
git pull upstream main
```

Your notes and mine live in different files, so conflicts stay small. The longer-term plan is a separate theme repository that sites load with `remote_theme:`, which GitHub Pages supports; then a fork would hold only notes.

## Code map

| File | What it does |
|:--|:--|
| `assets/js/stack.js` | panes, the URL state, collapsing, unfolding |
| `assets/js/wikilinks.js` | `[[links]]`, hover previews, links to unpublished notes |
| `assets/js/sidenotes.js` | footnotes into margin notes |
| `assets/js/lattice.js` | crossings, the All notes lattice, the thread line |
| `assets/css/stack.css` | layout, colours, dark mode, everything above |
| `_includes/GardenData.html` | the note and link data the scripts read |
| `_includes/Backlinks.html` | "Links to this note", with context and grouping |
| `_includes/Nav.html` | top bar, sun menu, theme switch |
| `_layouts/Post.html` | page shell; notes, All notes and static pages |

## Credits

- Theme base: [Jekyll Garden](https://github.com/Jekyll-Garden/jekyll-garden.github.io), MIT, after [Simply Jekyll](https://github.com/raghudotcc/simply-jekyll) by Raghuveer S.
- Reading model: [Andy Matuschak's notes](https://notes.andymatuschak.org/). No code was taken; the site's code isn't public.
- Search: [Lunr](https://lunrjs.com/); math: [KaTeX](https://katex.org/).

## License

Code: MIT (see `LICENSE`). Notes in `_notes/`: © Jack Heseltine, CC BY-NC 4.0.
