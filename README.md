# 한글 Study

A fully offline study app for learning Korean from **your own material** (a textbook, class notes, a word list). No backend, no
account, no API keys: everything runs in the browser and your progress stays in your browser.

It comes with a tiny made-up sample lesson so every mode works out of the box. Import your own lessons from a JSON file
(see [`docs/CONTENT-FORMAT.md`](docs/CONTENT-FORMAT.md)) and study them with all of the modes below.

> **No textbook content is included.** This repository contains only the app. The lessons it was originally built with are
> copyrighted and are not part of it. Use material you have the right to use, and please don't publish a book's content.

## Features

- **Flashcards** and **spaced-repetition review** (an SM-2 scheduler with learning steps, lapses, a daily new-card limit and a 4 am day rollover).
- **Typing practice** for vocabulary, sentences and whole passages (Monkeytype-style WPM, accuracy and history). Each letter of a
  Hangul block lights up as you type it, and a built-in 두벌식 composer means you can type on a **regular keyboard** without switching
  input sources. Copy / recall / dictation (listen and type) modes.
- **Grammar and endings practice** (fill the blank, conjugate), with spaced repetition on the exercises.
- Mistake log, "weak items" sessions, daily goal and streak, stars, a lesson library with Set 1 / Set 2 word lists, per-lesson sections.
- **Import your own lessons** in the app, plus a progress backup/restore (one JSON file).
- Optional natural audio: pre-generate it with a local neural Korean voice (MeloTTS) or edge-tts. Without it, the browser's Korean voice is used.

## Run it

Requires Node 20+.

```bash
npm install
npm run dev          # development server → http://localhost:5173
npm run build        # production build (type-checks first)
npm run preview      # serve the production build
npm test             # unit tests
```

Progress (review schedule, stars, history, settings, imported lessons) is stored in this browser's IndexedDB. Browser storage can be
cleared, so use **Settings → Backup → Export** now and then. Use the same browser each time, and avoid private windows.

## Your own content

Open **Import lessons** (Library → "+ Import lessons", or Settings), download the template, fill it in, and import it. Only `lesson`
and `title` are required; ids, part of speech and which words a sentence uses are filled in for you. Full details, with every field,
are in [`docs/CONTENT-FORMAT.md`](docs/CONTENT-FORMAT.md). Imported lessons replace the sample lesson.

Lessons you import in the app use the browser's voice for audio and plain text for any character the project has no letter outlines for.
For the full experience (natural audio, per-letter lighting for every character) you can instead put lesson files in the project:

1. Save the lesson as `src/data/lessons/lesson-N.json` (this folder is git-ignored, so your content is never committed).
2. `npm run validate-content` to check the files, `npm run build-glyphs` to generate letter outlines for every character in them.
3. `npm run build-audio` to generate audio (see below).
4. Optional: `scripts/author/kit.ts` is a small helper for writing lesson files in code, with automatic polite and honorific forms from
   the built-in conjugation engine, and with practice-exercise generators like the ones in `src/lib/grammar/`.

## Project layout

```
src/data/types.ts            the content schema
src/data/sample/             the bundled sample lesson (original content)
src/data/lessons/            your own lesson files (git-ignored)
src/lib/                     pure logic: hangul, composer, SM-2 scheduler, conjugation engine, content import, audio, backup; unit-tested
src/store/app.ts             app state (settings, lesson scope, stars, streak) persisted to IndexedDB
src/pages, src/components    UI
scripts/                     validate-content, build-glyphs, build-audio (+ MeloTTS worker), authoring helpers
docs/CONTENT-FORMAT.md       the lesson file format
```

## Content rules

- Every item has a stable id (`l1-v-학생`, `l1-s-001`, ...). **Never renumber or reuse ids**; review state and stats key on them.
- `source: "textbook"` marks content taken from your book, `source: "generated"` content you or a tool wrote; `verify: true` marks anything to double-check.
- `npm run validate-content` checks ids, blanks and references; it fails if an item uses vocabulary or grammar from a *later* lesson
  and warns about unknown tokens in generated items.

## Audio

Every vocab word, sentence and paragraph has pre-generated audio in `public/audio/` (files are named by hash; `manifest.json`
maps item ids to files). The app plays the file, and falls back to the browser's Korean voice (Web Speech API) if one is missing.

```bash
npm run build-audio              # only generates new or changed items
npm run build-audio -- --force   # regenerate everything
npm run build-audio -- --prune   # also delete files no longer referenced
npm run build-audio -- --samples # write voice comparison clips to voice-samples/
```

The app ships a single female voice (MeloTTS), so there is no voice setting. If more voices are added to `scripts/audio-config.json` later,
the picker in `src/lib/audio.ts` already chooses between them at random (never the same voice three times in a row).
Dialogue lines always use the voice matching the speaker's gender. Voices, speaking rate, and which speakers sound male/female are
in `scripts/audio-config.json` (add more voices there and re-run `npm run build-audio`). Two engines are supported:

- **edge** (edge-tts neural voices, mp3): the most natural. Needs internet and Microsoft's service to accept the request.
- **melo** (MeloTTS, a local neural Korean model, m4a): natural-sounding, offline, free. It has one female voice. It runs from a
  separate Python 3.11 environment in `.venv-tts` (created with `uv`; the install also needs a small patch to MeloTTS's Japanese
  module because its mecab package collides with the Korean one on a case-insensitive Mac). If `.venv-tts` ever goes missing,
  ask Claude Code to "set up MeloTTS again". Text like `3층` or `5명` is spelled out (삼 층, 다섯 명) before synthesis.
- **say** (macOS built-in voices, m4a): offline fallback.
- **auto** (default): tries edge, then melo, then say.

Each manifest entry records the engine and voice it was built with, so when edge-tts starts working again, one `npm run build-audio`
upgrades every file that was built with the fallback. As of October 2026 Microsoft's endpoint returns `403` for many users
(upstream issue rany2/edge-tts#490), which is why the audio is built with the local melo voice instead.

## Typing

**Regular keyboard, no input-source switching.** By default the typing screens turn letter keys into Korean letters themselves
using the standard 두벌식 layout (`G K S` → 한, Shift for ㅃ ㅉ ㄸ ㄲ ㅆ ㅒ ㅖ), so you never have to switch macOS to the Korean
keyboard. `src/lib/composer.ts` does the composing, including moving a trailing consonant onto the next block (ㅎㅏㄴ → 한, then
ㅏ → 하나) and jamo-by-jamo Backspace (한 → 하 → ㅎ). It uses the *physical* key (`KeyboardEvent.code`), so it works on any OS
layout. If you do switch to a Korean input source, that works too (its keystrokes are left alone). Turn the built-in keyboard off
in Settings if you prefer your own IME.

**It only moves on when the word is typed correctly.** There is no submit button. A wrong letter turns red with a "Backspace to fix
your mistake" hint; the first mistake on a word is logged to the Mistake log, flags the word weak, and brings the word back once
more later. In Recall mode, ↓ (or the button) shows the answer, which also counts as a miss.

**Letter-by-letter progress.** Each letter turns white the moment you type it. Words are drawn from real glyph outlines
(Gothic A1 Bold, SIL OFL) in `src/data/glyphs.json`, with every syllable split into one vector shape per letter, so nothing is
clipped and syllables sit at their natural width. A row of key tiles under the word shows what is typed and the next key.
After importing or changing a lesson run:

```bash
npm run build-glyphs     # regenerate src/data/glyphs.json from the lesson data
npm run validate-content # fails if a character has no glyph outline
```

**What counts as correct.** Copy mode: exactly the word on screen. Recall mode: the headword or any other form the book lists
(안녕하다 / 안녕하세요). Slash entries (은/는, 이/가) always need the whole thing.

**How comparison avoids false errors.** Both the typed text and the target are flattened into the stream of keystroke jamo
(ㅘ → ㅗㅏ, ㄳ → ㄱㅅ) in `src/lib/hangul.ts` and compared as streams, so regrouping into blocks never looks like a mistake.
`src/lib/ime-corpus.test.ts` replays **every word, sentence and answer in the data** through the composer and asserts no
keystroke is ever flagged wrong; run `npm test` after importing a lesson.

Vocabulary typing has Copy / Recall modes, logs misses to the Mistake log, and can drill starred or weak words only.

## Spaced repetition (SRS)

Every vocabulary word has persistent review data (`SrsState`: ease, interval, due date, lapses, reps, phase, weak flag, the day it
was introduced). The scheduler is a small pure module, `src/lib/srs/scheduler.ts`, so it can be swapped for FSRS later: replace
`schedule`, `previewLabels` and `isDue`, keep the state shape. It is covered by unit tests (`src/lib/srs/*.test.ts`).

**SM-2 with learning steps (Anki's classic scheduler).**

- A new card walks through learning steps of **1 min, then 10 min**; *Good* on the last step graduates it to **1 day**; *Easy* skips
  straight to **4 days**. *Again* sends it back to the first step; *Hard* repeats the step (on the first step it waits the average
  of the first two, 5.5 min).
- A review card answered **Good** gets `interval × ease` (ease starts at 2.5); **Hard** gets `interval × 1.2` and ease −0.15;
  **Easy** gets `interval × ease × 1.3` and ease +0.15; **Again** is a *lapse*: ease −0.2 (never below 1.3), the card goes
  back to a 10-minute relearning step, then returns to review at 1 day. Hard < Good < Easy always differ by at least a day.
- Cards reviewed late get credit for the extra days (Hard +¼, Good +½, Easy +all of the overdue time).
- Review cards come due on a **study-day** basis, any time before **4am** the next morning, like Anki. Learning cards come due by
  the minute. If nothing else is waiting, a learning card due within 20 minutes is shown early so a short session never stalls.
- The grade buttons show the next interval ("10 min", "4 days", "1.1 mo").

**What a session shows, in order:** a learning card whose wait is over → due reviews (flagged-weak first, then most overdue) → new
cards up to **New cards per day** (Settings; cards first answered today count against it) → learn-ahead. "Learn 5 more new cards"
appears when you're done early. Everything is limited to the selected lesson scope.

**Shared with every mode.** A mistake in typing flags the word *weak* and makes it due right away; the review queue then shows
weak cards first. Answering Good or Easy clears the flag, Again sets it. "Review just my weak items" on the dashboard runs a
session on only those cards.

**Keys:** Space shows the answer (then Good); 1–4 grade; ← Again, → Good (drag the card the same way); Z or Backspace undo the last
answer; P plays audio; S stars the card.

**Stats page** (`/#/stats`): cards due today and tomorrow, new / learning / young (<21 days) / mature counts, a 30-day forecast, a
30-day review history, retention (the share of review-card answers that weren't *Again*), and your most-lapsed cards.

## Flashcards

Free-form study, separate from the scheduler: sort cards into *Know* / *Still learning* (drag right/left, ←/→, or the buttons),
flip with Space or a click, undo with Backspace. Choose Korean-first, English-first or random, shuffle, auto-play audio, include
sentences, or study only starred cards. At the end of a round you can review just the ones you missed. Flashcard sorting does
not change SRS data; use Spaced review for that.

## Sentence typing

One sentence at a time with audio and the English below, drawn only from the selected lessons (textbook sentences and practice
sentences). **Copy** mode shows the Korean; **Dictation** hides it so you listen (Tab replays) and type what you hear, with an optional
English hint and ↓ to show the answer. Like word typing, it only moves on when the sentence is correct; the first mistake is logged,
the sentence returns once later, and the vocabulary word where you slipped is flagged weak (a slip in 사람 blames 사람, not the
이에요 after it).

## Paragraph typing and WPM

Pick a passage (dialogue or narration), then type it straight through, Monkeytype-style. Press **Space** after each word to commit
it. A wrong word stays red (letters you skipped are marked wrong too) and you carry on, so one slip never throws the rest of the
passage out of alignment. Backspace can step back into an earlier word. The passage finishes when the last word is typed correctly,
or press Enter/Esc to finish early. Dialogue audio uses a different voice per speaker; the English translation can be toggled.

**How WPM is calculated.** Korean has no spaces-per-word equivalent to English, so the unit is the **syllable block** (one 한글
block such as 한 or 국; digits and punctuation count one each, like characters):

```
WPM  = (syllable blocks in correctly typed words, plus the spaces after them) ÷ 5, per minute
Raw  = (everything typed) ÷ 5, per minute
타수 = jamo keystrokes inside correct words, per minute   (the usual Korean typing measure)
Accuracy = correct keystrokes ÷ all keystrokes (Backspace is free; regrouping by an IME is not a keystroke)
```

Dividing by 5 mirrors Monkeytype's "5 characters = 1 word", so the number moves in a familiar way and stays comparable between
your own runs. It will read lower than an English WPM because a block holds more than one letter's worth of effort, so compare
against yourself, not against English scores. Time runs from your first keystroke to the last. Each run is saved (WPM, accuracy,
errors, time, missed words) and charted on the picker and results screens.

The results screen lists your most-missed syllables and the words you got wrong.


## Grammar & endings practice

Fill-in-the-blank and conjugation exercises, limited to the grammar points of your selected lessons. You can filter by focus
(Particles, Endings, Questions, Conjugation) and by individual grammar point, answer by typing or multiple choice, and run 10 / 20 /
50 or endless exercises. Typing is checked as you type (a correct answer is accepted at once; Enter checks a wrong one, ↓ shows the
answer). Every answer shows the rule behind it, the full correct sentence, and the grammar point it belongs to. Accepted answers can be
several (contracted and uncontracted forms, 네 / 예).

**Where the exercises come from.** The book's own exercises (answers the book left blank are filled in and flagged) plus **generators**
(`src/lib/grammar/lessonN.ts`) that enumerate every combination of people × predicates for each pattern. Lesson 1 alone yields
over a thousand exercises. Answers come from the batchim rule, not from hand-typing, and a test checks that every word used is
vocabulary or a name from that lesson or earlier ones. Each exercise has a stable id.

**Missed exercises come back sooner.** Grammar exercises use the same SM-2 scheduler as vocabulary (deck `grammar`): a miss is
scheduled again in about a minute and flagged weak, a hit is pushed out. Within a session, patterns where your accuracy is under
70% are dealt twice as often, and accuracy per grammar point is tracked and shown on the dashboard ("Weakest grammar").

**Adding a generator for a new lesson.** Create `src/lib/grammar/lessonN.ts` exporting a function that returns `Exercise[]` (see
`lesson1.ts`), register it in `src/lib/grammar/index.ts`, and run `npm test`. The tests catch malformed blanks and words from later
lessons.

**The conjugation engine** (`src/lib/conjugate.ts`) produces the polite (-어요/아요) and honorific (-(으)세요) forms, including vowel
contraction, ㅡ-drop, and the ㅎ / ㅂ / ㄷ / ㅅ / 르 irregulars. Exercise answers for verbs come from it (and are unit-tested), never from
hand-typing. `src/lib/grammar/lesson4.ts` also holds the Sino-Korean and native Korean number readers (`sino`, `native`) and
`lesson5.ts` the (으)러 and clock-time helpers.
