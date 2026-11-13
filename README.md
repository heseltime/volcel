# Jekyll Garden
![screenshot](https://github.com/user-attachments/assets/f5752b1a-eb11-4385-a2ad-09f0e698ad30)
A simple Jekyll theme that turns your Obsidian notes into a beautiful website. Perfect for sharing your thoughts and knowledge online. If you use Obsidian for note-taking, this theme makes it easy to publish your markdown files as a connected website with wiki-style links and full-text search.


### What it does

Jekyll Garden connects your notes together with simple `[[note title]]` links, just like in Obsidian. You can find any note quickly with the built-in search that works as you type. The design focuses on your content with a clean, minimal look that works great on phones, tablets, and computers. Choose between dark and light themes, and when you want to write traditional blog posts, you can do that too. The theme also supports mathematical expressions if you need to write equations.

## Stacked notes

On screens 800px and wider, following a link to a note or post opens it as a new pane to the right, in the style of [Andy Matuschak's notes](https://notes.andymatuschak.org/). Following a different link from an earlier pane drops the panes to its right, so a reading session branches left to right instead of going back up a tree. Older panes collapse to a vertical title spine; the open panes are kept in the URL (`?stackedNotes=notes/a&stackedNotes=notes/b`). Narrow screens navigate page by page as before.

Notes stay plain Markdown:

| Write | Result |
|:--|:--|
| `[[Note Title]]` | link to a note (opens a pane) |
| `[[Note Title\|label]]` | link with custom text; escape the pipe so Markdown doesn't read it as a table |
| `[[Note Title#Heading]]` | link to a heading |
| `[[Label::https://example.com]]` | external link |
| `Claim.[^id]` + `[^id]: aside` | margin note in the right-hand column (footnote list on phones) |

### Topics, threads and the lattice

There is no notes/blog split: everything is a note in `_notes/`. The home page is **All notes**: search, then every note newest first by `date` (undated last), drawn as a lattice. A **topic** is a note that starts reading paths; it gets a link in the top bar:

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

A **thread** is what you read from a topic, pane by pane. Topics run one way and threads run across them, so the site is drawn as a lattice, all derived from the `[[links]]`, no extra markup:

- under each note's title, the topics that reach it (directly, or two links away, shown lighter);
- All notes itself: one row per note with its date, one column per topic, a dot where they cross;
- a thin line under the top bar with one tick per open pane, blue where that note crosses a topic;
- "Links to this note" split into *On these topics* and *From other notes*;
- a faint trellis pattern behind the panes.

Hover the sun (top left) to choose between this site and heseltime.github.io.

### Hiding notes and pages

| How | Effect |
|:--|:--|
| `published: false` in front matter | not built, so not on the site. **The file is still public in the repo.** |
| file in `_notes/Private/` | never built and git-ignored: stays on this machine |

Link to hidden or not-yet-written notes as usual. On the site those links show as plain text with a hint ("This note hasn't been published yet.", from `privatelinks` in `_config.yml`) and turn into real links once the note is published. The local preview below builds `published: false` notes with a "Hidden" banner so you can read them.

Every note ends with **Links to this note**: each note that links to it, with the paragraph the link sits in.

Code: `assets/js/stack.js` (panes), `assets/js/wikilinks.js` (links, previews), `assets/js/sidenotes.js` (margin notes), `assets/css/stack.css` (layout and colors), `_includes/Backlinks.html`. Try it with the `Stacked Notes` note.

### Local preview

```bash
docker run --rm -p 4000:4000 -v "$PWD":/srv/site -w /srv/site ruby:3.1.1-alpine3.15 \
  sh -c "apk add --no-cache build-base && gem install bundler:2.4.22 && bundle install && bundle exec jekyll serve --host 0.0.0.0 --config _config.yml,debug.yml --unpublished"
```

## Getting Started

Getting started is straightforward. First, download this theme to your computer. Then edit the settings in the `_config.yml` file with your website information. Add your notes to the `_notes` folder, and finally deploy to GitHub Pages, Netlify, or any web hosting service.

## Basic Setup

Edit `_config.yml` with your information:

```yaml
title: "My Website"
heading: "Your Name"
description: "A brief description of your site"
url: "https://yoursite.com"
```

### Deployment Options

You can deploy your site to a subdomain (like `notes.yoursite.com`) or a subdirectory (like `yoursite.com/notes`):

**For subdomains:**
```yaml
url: "https://notes.yoursite.com"
baseurl: ""
```

**For subdirectories:**
```yaml
url: "https://yoursite.com"
baseurl: "/notes"
```

See `SUBDOMAIN_SETUP.md` for more details.

## Writing Notes

### Creating a Note

Each note is just a markdown file with a title. You write your content in markdown format, just like you would in Obsidian or any other markdown editor.

```yaml
---
title: "My First Note"
date: 2025-01-15
---
```

## Features

### Linking Notes Together
Connect your notes by using `[[note title]]` to link to other notes. This creates the same kind of connections you're used to in Obsidian, but now they work on your website too.


### Simple Linking
The linking system works just like Obsidian. Write `[[note title]]` and the links are created automatically. When you hover over a link, you'll see a preview of the connected note.

### Search
Finding content is easy with the built-in search. It searches through all your notes instantly as you type, looking at both titles and content to help you find exactly what you need.

### Backlinks
See which notes link to the current one you're reading. This helps you discover related content and explore the connections between your ideas, just like the backlinks feature in Obsidian.

### Math
If you need to write mathematical expressions, the theme supports it. Use `$x = y$` for inline math and `$$\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}$$` for complex equations.

## How to Publishing Your Site

### GitHub Pages (Free)
GitHub Pages is the easiest way to get started. Upload your files to GitHub, enable GitHub Pages in the repository settings, and your site goes live automatically.

### Netlify (Free)
Netlify is another great option. Connect your GitHub repository to Netlify, and it will build and host your site. Every time you update your files, your site updates automatically.

### Local Testing
Test your site locally before publishing. Run `bundle install` to install dependencies, then `bundle exec jekyll serve` to start a local server and see your site in action.

### Customization
Change the look of your site by editing the `assets/css/style.css` file. You can modify colors, fonts, and other visual elements to match your preferences. If you want to customize the layout, you can modify files in the `_layouts/` folder. Add your own CSS and JavaScript as needed, but remember to keep it simple.

## Contributing
Found a bug or have an idea for improvement? Contributions are welcome. Fork the repository, make your changes, and submit a pull request.

## License

MIT License - use it freely for any project.
