# Lesson file format

A lesson is one JSON file. Import it in the app (**Import lessons**), or save it as `src/data/lessons/lesson-N.json` to bundle it
with your local copy of the project. Only `lesson` and `title` are required, plus at least one of the lists below. Everything else
has a sensible default.

```json
{
  "lesson": 1,
  "title": "At the café",
  "titleKo": "카페에서",
  "vocab": [
    { "ko": "커피", "en": "coffee", "pos": "noun", "set": 1 },
    { "ko": "마시다", "en": "to drink", "pos": "verb", "forms": ["마셔요"], "set": 1 },
    { "ko": "주스", "en": "juice", "set": 2 },
    { "ko": "우유", "en": "milk", "fromTable": true }
  ],
  "sentences": [
    { "ko": "저는 커피를 마셔요.", "en": "I drink coffee." },
    "물 주세요. | Water, please."
  ],
  "paragraphs": [
    {
      "title": "카페에서",
      "titleEn": "At the café",
      "lines": [
        { "speaker": "직원", "ko": "어서 오세요.", "en": "Welcome." },
        { "speaker": "손님", "ko": "커피 주세요.", "en": "Coffee, please." }
      ]
    }
  ],
  "grammar": [
    {
      "title": "The object particle 을/를",
      "pattern": "N을/를 V",
      "category": "particle",
      "explanation": "Use 을 after a consonant and 를 after a vowel.",
      "examples": [{ "ko": "커피를 마셔요.", "en": "I drink coffee." }]
    }
  ],
  "exercises": [
    { "type": "blank", "sentence": "저는 커피___ 마셔요.", "en": "I drink coffee.", "answers": ["를"], "choices": ["을", "를"], "explanation": "커피 ends in a vowel." },
    { "type": "conjugate", "base": "마시다", "baseEn": "to drink", "target": "polite form (-어요)", "answers": ["마셔요"], "choices": ["마셔요", "마시어요", "마세요"] }
  ]
}
```

Download a working starter from the Import page ("Download template").

## Fields

**Lesson**
| field | required | notes |
|---|---|---|
| `lesson` | yes | a whole number 1–99. Importing a lesson with the same number replaces the old one. |
| `title` | yes | shown in the library and lesson picker |
| `titleKo` | no | Korean title |
| `set2StartPage` | no | page where the book's second new-words list starts; words on earlier `page`s are Set 1 (an alternative to giving each word a `set`) |

**`vocab`** (words, particles, expressions): `ko` and `en` are required.
- `pos`: `noun`, `pronoun`, `number`, `verb`, `adjective`, `copula`, `counter`, `particle`, `adverb`, `interjection`, `determiner`, `conjunction`, `suffix` or `expression` (default `noun`).
- `forms`: other accepted spellings or conjugations (for example the polite form `마셔요`). In *recall* typing mode any of them is accepted. Write `은/는`-style pairs as `"은/는"`.
- `set`: `1` or `2`, which of the lesson's two new-word lists the word belongs to. The library can star a whole set.
- `fromTable`: `true` for words that came from a table, note or exercise rather than the main new-words list. The "New words only" switch leaves these out.
- `note`, `page`: optional. A second meaning of the same word is a second entry; it gets its own id automatically.

**`sentences`**: each is `{ "ko", "en" }` or the shorthand `"한국어 | English"`. The words a sentence uses are matched to your vocab automatically.

**`paragraphs`** (dialogues and narrations): `title`, and `lines` (`{ "speaker"?, "ko", "en" }` or `"한국어 | English"`). `kind` is `dialogue` when
lines have speakers and `narration` otherwise, or set it yourself.

**`grammar`**: `title` is required. `pattern`, `explanation`, `category` (`particle`, `ending`, `copula`, `question`, `other`), `examples` (`{ ko, en }`) are optional.

**`exercises`**
- `type: "blank"`: `sentence` with exactly one `___`, `answers` (the first is canonical; extra accepted forms go after it), `choices` for multiple-choice mode
  (must include the first answer), plus `en` and `explanation`.
- `type: "conjugate"`: `base`, `baseEn`, `target` (what is asked, for example `polite form (-어요)`), `answers`, `choices`.
- `grammarId` ties an exercise to a grammar point; default is the first one (or a placeholder if there is none). `focus` is one of
  `particle`, `ending`, `question`, `conjugation`, `other`.

**Optional on any item:** `id` (otherwise generated and stable), `source` (`"textbook"` default, or `"generated"`), `verify: true`.

## Tips

- Ids are generated from the word (vocab) or the position in the list (sentences, passages, grammar, exercises). Review history is keyed on them, so when you add to a lesson, **append** new items at the end of each list instead of inserting them in the middle. Or give items explicit `id`s.
- An AI assistant can turn notes or textbook pages into this format. Give it this page and ask for the JSON.
- Audio for imported lessons uses the browser's Korean voice. To generate natural audio, put the file in `src/data/lessons/` and run `npm run build-audio`.
