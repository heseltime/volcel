---
emoji: 🧵
topic: true
order: 3
label: This site
title: Stacked Notes
feed: show
date: 2026-11-13
---

This theme borrows the reading model of [[Andy Matuschak's notes::https://notes.andymatuschak.org/]]: following a link doesn't leave the note you're on. The linked note opens as a new pane to its right, so the screen shows the path you took to get here, left to right. For why that matters, see [[Why Books Don't Work]].

## Branching instead of a tree

A digital garden is usually browsed like a tree: an index, then a note, then back. Here a reading session is a flow. I think of the result as [[A Lattice, Not a Garden\|a lattice]] more than a garden. If you go back to an earlier pane and follow a different link, everything to the right of it is dropped and the path branches from there.[^branch] Try it: open [[Wiki Links]] and then [[Theme Features]] from this pane, and watch the second replace the first.

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
[^margin]: Like this one. Write `Some claim.[^why]` in the text and `[^why]: the aside` anywhere below it. Margin notes can hold [[Wiki Links]] too.
