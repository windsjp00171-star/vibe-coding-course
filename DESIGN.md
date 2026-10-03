---
name: Vibe Coding 實戰課
description: 給非軟體背景上班族的 AI 課程網站；每個單元是講師在會議室白板前把一件事講清楚。
colors:
  board-enamel: "#f5f7f6"
  board-wiped: "#e8ecec"
  paper-sheet: "#ffffff"
  marker-black: "#1d2327"
  marker-black-faint: "#4d5961"
  board-line: "#d3d9dc"
  aluminium-rim: "#aeb7bd"
  marker-blue: "#1f4fbf"
  marker-blue-deep: "#173c93"
  marker-blue-wash: "#e2e9f8"
  marker-green: "#176b3b"
  marker-green-fill: "#1b7f45"
  marker-green-wash: "#e1f1e7"
  marker-red: "#b3261e"
  marker-red-fill: "#c62d29"
  marker-red-wash: "#fbe4e2"
  sticky-yellow: "#ffe27a"
  sticky-ink-brown: "#7a5600"
  sticky-wash: "#fff3bf"
  teacher-purple: "#6d35c9"
  teacher-purple-wash: "#f0e9fb"
  projected-screen: "#1b2226"
  glass-board: "#14181b"
  glass-board-sheet: "#20272c"
  glass-chalk: "#eef2f3"
typography:
  display:
    fontFamily: "LXGW WenKai TC, Noto Sans TC, system-ui, sans-serif"
    fontSize: "clamp(2.3rem, 1.4rem + 3.8vw, 4.4rem)"
    fontWeight: 700
    lineHeight: 1.38
    letterSpacing: "0"
  headline:
    fontFamily: "LXGW WenKai TC, Noto Sans TC, system-ui, sans-serif"
    fontSize: "clamp(1.6rem, 1.2rem + 1.7vw, 2.4rem)"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0"
  title:
    fontFamily: "Inter, Noto Sans TC, system-ui, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 800
    lineHeight: 1.25
  body:
    fontFamily: "Inter, Noto Sans TC, system-ui, sans-serif"
    fontSize: "clamp(1.0625rem, 1rem + 0.25vw, 1.1875rem)"
    fontWeight: 400
    lineHeight: 1.75
  annotation:
    fontFamily: "LXGW WenKai TC, Noto Sans TC, system-ui, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 700
    letterSpacing: "0"
  numeral:
    fontFamily: "Kalam, LXGW WenKai TC, Noto Sans TC, system-ui, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 700
    lineHeight: 1
  code:
    fontFamily: "ui-monospace, Cascadia Code, Consolas, monospace"
    fontSize: "0.9em"
rounded:
  sheet: "3px"
  s: "6px"
  m: "10px"
  l: "14px"
  hand-box: "14px 22px 16px 26px / 22px 14px 24px 16px"
  magnet-round: "50%"
spacing:
  gutter: "16px"
  grid: "32px"
  section: "clamp(3rem, 2rem + 4vw, 6rem)"
  wrap: "1120px"
components:
  button-magnet:
    backgroundColor: "{colors.paper-sheet}"
    textColor: "{colors.marker-black}"
    rounded: "{rounded.m}"
    padding: "10px 20px"
  button-primary:
    backgroundColor: "{colors.marker-blue}"
    textColor: "{colors.paper-sheet}"
    rounded: "{rounded.m}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.marker-blue-deep}"
  button-ok:
    backgroundColor: "{colors.marker-green-fill}"
    textColor: "{colors.paper-sheet}"
    rounded: "{rounded.m}"
  button-danger:
    backgroundColor: "{colors.marker-red-fill}"
    textColor: "{colors.paper-sheet}"
    rounded: "{rounded.m}"
  chip-selected:
    backgroundColor: "{colors.marker-blue}"
    textColor: "{colors.paper-sheet}"
  header-tool:
    backgroundColor: "transparent"
    textColor: "{colors.marker-black}"
    padding: "6px 9px"
  header-tool-hover:
    backgroundColor: "{colors.marker-blue-wash}"
  card-sheet:
    backgroundColor: "{colors.paper-sheet}"
    rounded: "{rounded.sheet}"
  sticky-goal:
    backgroundColor: "{colors.sticky-yellow}"
    textColor: "{colors.marker-black}"
    padding: "22px 18px 18px"
  analogy-box:
    backgroundColor: "transparent"
    rounded: "{rounded.hand-box}"
    padding: "18px 22px"
  input-field:
    backgroundColor: "{colors.paper-sheet}"
    textColor: "{colors.marker-black}"
    rounded: "{rounded.m}"
    padding: "10px 14px"
---

# Design System: Vibe Coding 實戰課

## Overview

**Creative North Star: "會議室白板"**

Every unit is the instructor standing at a conference-room whiteboard, making one thing clear: the headline written big in black marker, the key phrase circled in red, structure and links in blue, correct answers ticked in green. The mood is 可靠、清楚、有一點玩心: dependable and legible first, with a little hand-drawn play in the circles, ticks and taped paper. It must never feel like a cold engineer's tool, and it must never feel childish.

The board is a cool white enamel with a faint 32px grid, not beige paper. Things written on the board are flat. Things stuck to the board have physical logic: paper sheets are held by a translucent strip of tape, sticky notes are taped flat, and anything you can press is a magnet with soft thickness that sinks into the board when pressed. The header is the pen tray along the bottom edge of the board. In dark mode the same board becomes a glass blackboard (玻璃黑板) with brightened inks.

The density suits the audience: non-technical office workers, often reading on a phone, so body text is a large, calm print face and the hand-drawn voice is reserved for headings, numerals and annotations. Motion is short and never blocks input.

**Key Characteristics:**
- Four marker inks plus sticky-note yellow; teacher-mode purple is the only exception.
- Hand-written headings and annotations, printed body.
- Written = flat; taped paper = tape strip; pressable = magnet.
- Answers are marked with ink: green tick, red strike-through.
- Faint 32px grid board ground; glass blackboard in dark mode.

## Colors

A strictly counted marker set on cool white enamel: black, blue, red, green, and one sticky-note yellow.

### Primary
- **Blue Marker** (marker-blue): links, structure, section-number circles, analogy frames, focus rings, progress, selected magnets. Its deeper sibling (marker-blue-deep) is the hover state of filled blue magnets; the wash (marker-blue-wash) is the hover ground of header tools.

### Secondary
- **Green Marker** (marker-green for text, marker-green-fill for solid fills with white text): correct answers, done states, 課後 phase, OK callouts.
- **Red Marker** (marker-red for text, marker-red-fill for solid fills): the hand-drawn circle around the h1 key phrase, wrong answers, danger callouts, unread dot, quiz streak.

### Tertiary
- **Sticky-Note Yellow** (sticky-yellow): learning-goal sticky notes, text selection, and at reduced opacity the tape strip (`rgb(255 226 122 / 55%)`, 38% in dark). Yellow is never text; warning text uses the brown sticky ink (sticky-ink-brown) on the yellow wash.
- **Teacher Purple** (teacher-purple, teacher-purple-wash): appears only in teacher mode (banner, dashed teacher notes). Students never see it.

### Neutral
- **Board Enamel** (board-enamel): the page ground, carrying the grid.
- **Wiped Board** (board-wiped): recessed areas, the pen tray header, option key discs, range tracks.
- **Paper Sheet** (paper-sheet): taped paper cards and magnet faces.
- **Black Marker** (marker-black): body text, h1/h2, the workshop frame, the unit-number underline. **Faint Black** (marker-black-faint) for lead and secondary text (6.8:1 on the board).
- **Board Line / Aluminium Rim** (board-line, aluminium-rim): dividers, and magnet edges plus the header's 4px tray edge.
- **Projected Screen** (projected-screen): code blocks, terminals and generated-output panes, which read as a dark screen projected onto the board.
- **Glass Board** (glass-board, glass-board-sheet, glass-chalk): dark-mode ground, sheets and ink. Dark inks brighten (blue `#86a8ff`, green `#5fd08f`, red `#ff8078`); solid fills use separate darker `*-fill` values so white text stays readable.

### Named Rules
**The Four Pens Rule.** Only black, blue, red, green and sticky yellow appear on the board. There is no fifth hue, no gray gradient, no rainbow. Teacher purple exists only behind teacher mode.

**The Ink Means Something Rule.** Red marks emphasis and wrongness, green marks rightness and done, blue marks structure and action. A colour is never used for decoration alone.

## Typography

**Display Font:** LXGW WenKai TC (with Noto Sans TC, system-ui)
**Numeral Font:** Kalam (with LXGW WenKai TC fallback for any CJK)
**Body Font:** Inter + Noto Sans TC (with system-ui)
**Mono Font:** ui-monospace, Cascadia Code, Consolas

**Character:** The instructor's handwriting (WenKai at 700, thickened with a thin same-colour text-stroke of .022em on h1 and .012em on h2, painted under the fill) sits above a calm, highly legible print body. Kalam supplies the hand-drawn digits.

### Hierarchy
- **Display** (h1): the one big statement at the centre of the board, max 14em wide. Its `<em>` phrase stays black and is circled in red.
- **Headline** (h2): section titles beside a blue-circled Kalam number.
- **Title** (h3, print face, 800): card and block subheads.
- **Body** (print face, line-height 1.75): all reading text; the lead runs 1.1 to 1.32rem at line-height 1.85, max 38em.
- **Annotation** (WenKai 700, about 1.05rem): short marker notes, such as the goals label, the 課前/課中/課後 meta row, the analogy label, and the note under a section heading.
- **Numeral** (Kalam 700): unit number (2rem, underlined 3px in black), section numbers (1.6rem, 1.25rem on mobile), quiz keys, step numbers and stats.

### Named Rules
**The Hand For Headings Rule.** Handwriting (`--hand-text`) is for h1, h2 and short annotations only. Paragraphs, options, form text and quiz questions stay in the print face, because they must stay easy to read on a phone.

**The Kalam Is For Digits Rule.** `--hand` (Kalam) is used only for numerals and short number-like marks, never for sentences.

## Layout

Content sits in a centred column of `min(1120px, 100% - 32px)`. The header row widens to 1440px and stays a single non-wrapping row about 58px tall; the tool list scrolls horizontally with a fade mask when it overflows, and the help button stays pinned at the right end. Sections are separated by the section spacing token and a soft 2px "wiped" smudge between consecutive slides, not a hard rule. The ground carries a 32px grid at 3.2% black ink. Learning goals sit as a row of sticky notes with 22px/18px gaps. At 640px and below the section numbers shrink, sticky notes lose their tilt and the analogy padding tightens. Presentation mode scales the root to 125% and steps through slides one at a time; print strips tape, shadows and header ground.

## Elevation & Depth

Depth is physical and has exactly three levels. Writing on the board is flat. Paper taped to the board has a low, soft paper shadow. Magnets (pressable controls) have a soft, short shadow with an inset top highlight. Nothing uses hard offset blocks or glows.

### Shadow Vocabulary
- **Magnet at rest** (`--magnet`: `0 1px 0 rgb(255 255 255 / 70%) inset, 0 1px 1px rgb(29 35 39 / 14%), 0 4px 10px -3px rgb(29 35 39 / 28%)`): every pressable control.
- **Magnet lifted** (`--magnet-up`): hover, paired with `translateY(-1px)`.
- **Magnet pressed** (`--magnet-down`: inset `0 1px 2px rgb(29 35 39 / 20%)`): active and selected states, paired with `translateY(1px)` into the board.
- **Taped paper** (`0 1px 1px rgb(29 35 39 / 6%), 0 14px 26px -18px rgb(29 35 39 / 40%)`): cards, classify cards, quiz frames.
- **Sticky note** (`0 1px 1px rgb(29 35 39 / 10%), 0 12px 16px -12px rgb(29 35 39 / 40%)`): learning goals.
- **Pen tray** (`0 8px 16px -14px rgb(29 35 39 / 45%)`): under the sticky header.

### Named Rules
**The Pressable Is A Magnet Rule.** If it can be pressed, it is a magnet: aluminium-rim 1.5px edge, white face, the magnet shadow, a pointer cursor, lift on hover and a 1px press into the board. If it cannot be pressed, it is flat and does not move or glow on hover.

**The Answered Goes Flat Rule.** Disabled or answered controls lose the magnet: no shadow, no transform, transparent ground, board-line edge.

## Shapes

Paper is nearly square (3px). Magnets and fields use gently rounded corners (10px). Round magnets (brand mark, option keys, install-step numbers) are circles. Anything drawn in marker (analogy, callouts, workshop, teacher note) uses the irregular hand-drawn box radius, four uneven corners. Section numbers sit in a slightly wobbly blue circle (`46% 54% 52% 48% / 54% 46% 55% 45%`, rotated -4deg). Sticky notes have a curled bottom-left corner and tilt by under 1 degree. Tape strips are small translucent rectangles, rotated 2 to 3 degrees.

## Components

### Buttons (magnets)
- **Shape:** gently rounded (10px), 1.5px aluminium rim.
- **Default:** white face, black text, magnet shadow.
- **Primary / OK / Danger:** solid blue, green or red fill with white text; primary hover deepens to marker-blue-deep.
- **Hover / Active:** magnet-up plus 1px lift; press returns to magnet-down plus 1px sink. Focus is a 3px blue outline at 2px offset.
- **Disabled:** flat, 45% opacity, no transform.

### Chips, tabs and options
- **Style:** the same magnet treatment (options, classify choices, chips, tab buttons, checklist rows, map jumps, review items).
- **Selected:** blue magnet pressed into the board (blue fill, white text, magnet-down).
- **Quiz options:** Kalam key in a wiped-board disc that turns blue on hover. After answering, the option goes flat; right = green edge on green wash with a green tick, wrong = red edge on red wash with a red strike through the text.

### Cards / Containers (taped paper)
- **Corner Style:** near square (3px).
- **Background:** paper sheet, with a hairline border at 70% board-line.
- **Shadow Strategy:** taped-paper shadow (see Elevation).
- **Tape:** a 72x20px translucent yellow strip centred on the top edge, rotated 2deg — only on things that really are a sheet of paper: the workshop handout (`.ws-how`), the landing page's sign-up page mock, and sticky notes. Ordinary cards carry no tape, so the tape keeps its meaning.

### Inputs / Fields
- **Style:** white field, 1.5px board-line edge, 10px radius, 10px 14px padding; blue caret and accent colour.
- **Range:** 10px wiped-board track with a rim edge and a round blue thumb ringed in white.
- **Code input:** projected-screen dark ground in monospace.

### Navigation (pen tray)
- **Style:** flat wiped-board tray at 94% opacity with blur, a solid 4px aluminium bottom edge, and one soft tray shadow.
- **Tools:** flat, borderless and without magnet shadow, padded 6px 9px; hover and current page use the blue wash. Each tool pairs its label with one icon from a single stroke SVG set (24px viewBox, stroke-width 2, round caps, currentColor).
- **Brand mark:** a round blue magnet carrying a Kalam "V".
- **Progress:** a 4px blue line under the tray.

### Sticky-note goals
Flat yellow notes with a tape strip, black 700 text and slight alternating tilt (-.8deg, .6deg, -.3deg). They are only for reading: they do not lift or press.

### Analogy and callouts
- **Analogy:** a 2px blue hand-drawn box on the bare board, with its label in blue WenKai. There is no arrow or leader line.
- **Callouts:** the same hand box, in red (danger), green (ok) or yellow-brown (warn), on a 60% wash.
- **Workshop:** a black hand box. **Teacher note:** a dashed purple hand box on the purple wash, shown only in teacher mode.

### Signature: ink marks
- **Circled key phrase:** the h1 `<em>` is circled by an authored SVG marker loop (open start, overshooting end) used as a mask over red. A second `<em>` uses a mirrored loop. Loops are rotated about 1deg.
- **Green tick:** on a correct answer, a green check wipes in via a clip-path draw of 260ms or less.
- **Red strike:** a wrong answer's text is struck through by a 2.5px red line that grows via background-size in 240ms.
- **Reduced motion:** ticks and strikes appear instantly, fully drawn.

### Projected screens
Code, terminal and the Claude Code workbench simulator keep their own dark screen palette as "a screen projected onto the board". The workbench keeps Claude's warm accent inside the screen only.

## Do's and Don'ts

### Do:
- **Do** draw every colour from the four marker inks plus sticky yellow; use teacher purple only in teacher mode.
- **Do** make every new pressable control a magnet (`--magnet` / `--magnet-up` / `--magnet-down`, press = `translateY(1px)`), and add its class to the shared affordance selector list.
- **Do** keep read-only text flat: labels and phases are plain marker text, not capsules.
- **Do** use `--hand-text` for h1, h2 and annotations, `--hand` (Kalam) only for numerals, and Inter + Noto Sans TC for everything people read at length.
- **Do** use `var(--ease)` with `--fast` (150ms) or `--normal` (250ms), stay near 300ms at most, never block interaction during animation, and turn all motion off under `prefers-reduced-motion`.
- **Do** keep the faint 32px grid on the board ground, and keep dark mode as the glass blackboard with brightened inks and separate `*-fill` solids.
- **Do** keep `data-tour` attributes, form `name`s and JS-dependent ids and `data-*` untouched when restyling.
- **Do** label a section only when the label says what the reader does there: `.kicker.mode` with `mode-play` (blue), `mode-class` (ink), `mode-extra` (green), `mode-quiz` (green) or `mode-case` (red). Each gets its stroke icon from CSS.
- **Do** keep emoji that illustrate content (course-map unit pictures, flip-card fronts, quizshow unit chips): they are recognition aids for content, not UI icons.
- **Do** render a row of equal cards inside a section (`.slide .grid-3 > .card`) as one sheet split by marker rules, not as separate floating cards.
- **Do** treat presenter mode as the classroom board, not the website: the header shrinks to a slim unit label (tools and progress hidden, Esc exits), content widens to 1480px, and interactive controls scale up.
- **Do** give a section more space above its heading than below it.

### Don't:
- **Don't** use gradients, glows, neon, sheens or rainbow borders as decoration.
- **Don't** use hard offset block shadows; depth is soft magnet or paper shadow only.
- **Don't** add emoji as new UI icons; use the stroke SVG icon set.
- **Don't** give written or read-only content (sticky notes, labels, phases, headings, classify prompt cards) a hover lift, magnet shadow or pointer cursor.
- **Don't** add an arrow or leader line to the analogy box.
- **Don't** set paragraphs, options or questions in the handwriting faces.
- **Don't** use bouncy or overshoot easings.
- **Don't** loop an animation to ask for attention; show the state once (at most 3 pulses), then hold still.
- **Don't** add a decorative label above or under a heading ("根本原因", "親眼看看"); if it doesn't name the reader's task, leave it out.

### Known debt (not rules)
The index page keeps a hero-metric band (real numbers; kept on purpose for recruiting). The old glow layers in `course.css` are switched off by later overrides, not deleted; remove them in a code-only cleanup. Treat these as cleanup targets, not patterns to copy.
