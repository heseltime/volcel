---
emoji: 🧵
topic: true
order: 3
label: This site
title: Stacked Notes
feed: show
date: 2026-11-13
---

This theme borrows the reading model of [[Andy Matuschak's notes::https://notes.andymatuschak.org/]]: following a link doesn't leave the note you're on. The linked note opens as a new pane to its right, so the screen shows the path you took to get here, left to right. Go back to an earlier pane and follow a different link, and everything to the right of it is dropped; the path branches from there.[^branch] Try it: open [[Wiki Links]] and then [[Theme Features]] from this pane, and watch the second replace the first.

## Why books don't work

Matuschak's essay [[Why books don't work::https://andymatuschak.org/books/]] asks why explanatory non-fiction so often leaves readers without real understanding. Books and lectures, he argues, lean on an implicit model in which knowledge passes from author to reader by absorption.[^transmission] Understanding doesn't work that way: it comes from what the reader does with the ideas. So the essay asks what a medium built around how people actually learn would look like.

His working notes are one answer, at least in their form. A book is linear: one line, set by the author. In the notes the line is the reader's. You choose which link to follow, and you can see where you came from while you read on. That is a small but real shift of the work from author to reader, which is the shift the essay asks for. Because the row can branch, reading becomes a series of choices you can undo, closer to thinking than to listening.

It only works because of how the notes are written. Matuschak calls them [[evergreen notes::https://notes.andymatuschak.org/Evergreen_notes]]: small, each about one idea, and densely linked, so that any note can be the next step in many different paths. His notes are his research environment, not a published tool, so nothing here is his code, only the idea.[^code]

## A lattice, not a garden

People who publish their notes often call the result a *digital garden*.[^garden] The metaphor is generous, but it carries a shape with it: beds and paths, plants that grow from seedling to evergreen, a gardener who prunes. It is about cultivation and structure. Read through an index, it turns into a tree: a trunk of categories, branches of subtopics, a note at every leaf.

That isn't how this writing works at the moment. Too much of it is still open: a working life in observability, a slower question about a religious vocation, music, the lake I grew up on. They don't sort into one hierarchy. They cross.

So the picture I keep coming back to is a lattice. Draw the topics as parallel lines running one way, and the threads of reading as lines running across them. A note is where two lines meet. [[Observability for Inner Space]] sits where the line of my day job crosses the line of prayer. Nothing has to be the root. The panes run horizontally, so a reading session is one line across the lattice; the topics are the lines in the top bar. Where they cross is the part I don't control, and the part I'm most curious about.

The word has three meanings, and I want all of them.

- **A trellis.** The lattice in a garden isn't a plant. It is the frame something climbs, giving growth a direction without fixing its form. That's a fair job description for a set of notes.
- **A grille.** In enclosed monasteries a lattice screen stands between the community and visitors. You can speak and be heard through it, but it also marks a boundary. Some of these notes stay behind it for now.[^hidden]
- **An order.** In mathematics a lattice is a set where any two elements have a meet and a join: a greatest thing below both and a least thing above both. Any two topics here should meet somewhere in a note, and join in something larger I can't name yet.

## How it behaves

- Panes are 625px wide, a bit wider when a note has margin notes. When they no longer fit, older panes slide under newer ones and collapse to a spine with the note's title written vertically. Click a spine to bring that pane back.
- The open panes are kept in the URL as `?stackedNotes=` entries, so a path can be shared and the back button walks it.
- In each pane, the link that opened the next pane stays highlighted, so you can see where you branched.
- Every note ends with *Links to this note*: the notes that link here, each with the paragraph the link appears in. See [[Getting Started]] for an example.
- On narrow screens, links navigate normally, one note per page.

## Margin notes

Asides go in the right-hand margin, next to the sentence they belong to, instead of interrupting it.[^margin] They're ordinary Markdown footnotes, so the same file still reads fine in Obsidian or on GitHub, and on a phone they fall back to a list at the end of the note.

## Writing notes for it

Notes stay plain Markdown, the same files you edit in Obsidian. Link with `[[Note Title]]`, `[[Note Title\|custom label]]` (the backslash keeps Markdown from reading the pipe as a table) or `[[Note Title#Heading]]`. Nothing in a note needs to know about panes; see [[Markdown Guide]] for the rest of the syntax.

[^branch]: Andy Matuschak's notes do the same: the stack is a record of one reading path, not a map of the whole garden.
[^transmission]: He uses the learning-sciences term for it, "transmissionism". The essay is worth reading in full; this is only my summary.
[^code]: His notes site says plainly that the system isn't available for others to use. The panes here were built from scratch.
[^garden]: Maggie Appleton's [[history of the digital garden::https://maggieappleton.com/garden-history]] traces the idea, including the seedling, budding and evergreen stages many gardens label their notes with.
[^hidden]: Literally: a note marked `published: false` stays in the repository but off the site, and links to it show as plain text until it's ready.
[^margin]: Like this one. Write `Some claim.[^why]` in the text and `[^why]: the aside` anywhere below it. Margin notes can hold [[Wiki Links]] too.
