// Builds the bundled sample lesson (original, made-up content, not from any textbook) from the friendly import format.
//   node scripts/author/run.mjs scripts/author/sample.ts
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { normalizeLesson } from '../../src/lib/content'

const input = {
  lesson: 1,
  title: 'Sample: At the Café',
  titleKo: '카페에서',
  vocab: [
    { ko: '카페', en: 'café, coffee shop', pos: 'noun', set: 1 },
    { ko: '커피', en: 'coffee', pos: 'noun', set: 1 },
    { ko: '물', en: 'water', pos: 'noun', set: 1 },
    { ko: '빵', en: 'bread', pos: 'noun', set: 1 },
    { ko: '케이크', en: 'cake', pos: 'noun', set: 1 },
    { ko: '마시다', en: 'to drink', pos: 'verb', forms: ['마셔요'], set: 1 },
    { ko: '먹다', en: 'to eat', pos: 'verb', forms: ['먹어요'], set: 1 },
    { ko: '맛있다', en: 'to be delicious', pos: 'adjective', forms: ['맛있어요'], set: 1 },
    { ko: '주문하다', en: 'to order', pos: 'verb', forms: ['주문해요'], set: 1 },
    { ko: '주스', en: 'juice', pos: 'noun', set: 2 },
    { ko: '차', en: 'tea', pos: 'noun', set: 2 },
    { ko: '메뉴', en: 'menu', pos: 'noun', set: 2 },
    { ko: '직원', en: 'staff member', pos: 'noun', set: 2 },
    { ko: '손님', en: 'customer', pos: 'noun', set: 2 },
    { ko: '여기', en: 'here', pos: 'pronoun', set: 2 },
    { ko: '주세요', en: 'please give me', pos: 'expression', set: 2, note: 'N 주세요 = "N, please."' },
    { ko: '얼마예요?', en: 'How much is it?', pos: 'expression', set: 2 },
    { ko: '감사합니다', en: 'thank you', pos: 'expression', set: 2 },
    { ko: '우유', en: 'milk', pos: 'noun', fromTable: true },
    { ko: '사과', en: 'apple', pos: 'noun', fromTable: true },
  ],
  sentences: [
    '저는 커피를 마셔요. | I drink coffee.',
    '친구는 빵을 먹어요. | My friend eats bread.',
    '케이크가 맛있어요. | The cake is delicious.',
    '카페에서 커피를 주문해요. | I order coffee at the café.',
    '여기 메뉴 주세요. | The menu, please.',
    '물 주세요. | Water, please.',
    '이 빵은 얼마예요? | How much is this bread?',
    '차를 마셔요. | I drink tea.',
    '주스가 맛있어요. | The juice is delicious.',
    '손님이 카페에 있어요. | A customer is in the café.',
    '우유도 주세요. | Milk too, please.',
    '감사합니다. | Thank you.',
  ],
  paragraphs: [
    {
      title: '카페에서',
      titleEn: 'At the café',
      lines: [
        { speaker: '직원', ko: '어서 오세요.', en: 'Welcome.' },
        { speaker: '손님', ko: '커피 주세요.', en: 'Coffee, please.' },
        { speaker: '직원', ko: '케이크도 있어요.', en: 'We have cake too.' },
        { speaker: '손님', ko: '네, 케이크도 주세요.', en: 'Yes, cake too, please.' },
        { speaker: '손님', ko: '얼마예요?', en: 'How much is it?' },
        { speaker: '직원', ko: '팔천 원이에요.', en: "It's 8,000 won." },
        { speaker: '손님', ko: '감사합니다.', en: 'Thank you.' },
      ],
    },
    {
      title: '저는 카페에 가요',
      titleEn: 'I go to the café',
      kind: 'narration',
      lines: [
        '저는 카페에 가요. | I go to the café.',
        '커피를 마셔요. | I drink coffee.',
        '빵도 먹어요. | I eat bread too.',
        '케이크가 아주 맛있어요. | The cake is really delicious.',
      ],
    },
  ],
  grammar: [
    {
      title: 'The object particle 을/를',
      pattern: 'N을/를 V',
      category: 'particle',
      explanation: 'Attach 을/를 to the thing an action is done to. Use 을 after a consonant (빵을) and 를 after a vowel (커피를).',
      examples: [
        { ko: '커피를 마셔요.', en: 'I drink coffee.' },
        { ko: '빵을 먹어요.', en: 'I eat bread.' },
      ],
    },
    {
      id: 'l1-g-please',
      title: 'Asking for something: N 주세요',
      pattern: 'N 주세요',
      category: 'ending',
      explanation: 'Put 주세요 after the thing you want to ask for. It means "N, please" (literally "please give me N").',
      examples: [
        { ko: '물 주세요.', en: 'Water, please.' },
        { ko: '메뉴 주세요.', en: 'The menu, please.' },
      ],
    },
  ],
  exercises: [
    { grammarId: 'l1-g-1', focus: 'particle', type: 'blank', sentence: '저는 커피___ 마셔요.', en: 'I drink coffee.', answers: ['를'], choices: ['을', '를'], explanation: '커피 ends in a vowel, so the object particle is 를.' },
    { grammarId: 'l1-g-1', focus: 'particle', type: 'blank', sentence: '친구는 빵___ 먹어요.', en: 'My friend eats bread.', answers: ['을'], choices: ['을', '를'], explanation: '빵 ends in a consonant, so the object particle is 을.' },
    { grammarId: 'l1-g-1', focus: 'particle', type: 'blank', sentence: '차___ 마셔요.', en: 'I drink tea.', answers: ['를'], choices: ['을', '를'], explanation: '차 ends in a vowel, so the object particle is 를.' },
    { grammarId: 'l1-g-please', focus: 'ending', type: 'blank', sentence: '물 ___.', en: 'Water, please.', answers: ['주세요'], choices: ['주세요', '마셔요', '먹어요'], explanation: 'To ask for something, put 주세요 after it.' },
    { grammarId: 'l1-g-1', type: 'conjugate', base: '마시다', baseEn: 'to drink', target: 'polite form (-어요)', answers: ['마셔요'], choices: ['마셔요', '마시어요', '마시아요', '마세요'], explanation: '마시 + 어요 contracts to 마셔요.' },
    { grammarId: 'l1-g-1', type: 'conjugate', base: '먹다', baseEn: 'to eat', target: 'polite form (-어요)', answers: ['먹어요'], choices: ['먹어요', '먹아요', '먹요'], explanation: '먹 + 어요 = 먹어요.' },
  ],
}

const r = normalizeLesson(input, 'sample')
if (!r.lesson) throw new Error(r.errors.join('\n'))
// fix the grammar ids the exercises point to (the first grammar point gets the generated id l1-g-1)
const lesson = { ...r.lesson, sample: true as const }
writeFileSync(join(process.cwd(), 'src', 'data', 'sample', 'sample-lesson.json'), JSON.stringify(lesson, null, 2) + '\n')
console.log('sample lesson written:', lesson.vocab.length, 'words,', lesson.sentences.length, 'sentences,', lesson.paragraphs.length, 'passages,', lesson.exercises.length, 'exercises', r.warnings)
