import type { BlankExercise, ConjugateExercise, Focus } from '../../data/types'

/** "3.1" means this lesson's G3.1; "2:2.2" means lesson 2's G2.2 (an exercise can practise an earlier point). */
const gid = (lesson: number, code: string) => {
  const [gl, gc] = code.includes(':') ? code.split(':') : [String(lesson), code]
  return `l${gl}-g-${gc}`
}

/** Factories shared by the per-lesson generators. Ids are `g<lesson>:<key>`: stable, so the SRS can track them. */
export function makeBlank(
  lesson: number,
  key: string,
  grammarCode: string,
  focus: Focus,
  sentence: string,
  en: string,
  answers: string[],
  choices: string[],
  explanation: string,
): BlankExercise {
  return {
    id: `g${lesson}:${key}`,
    grammarId: gid(lesson, grammarCode),
    lesson,
    focus,
    source: 'generated',
    explanation,
    type: 'blank',
    sentence,
    en,
    answers,
    choices: dedupe(choices),
  }
}

export function makeConj(
  lesson: number,
  key: string,
  grammarCode: string,
  base: string,
  baseEn: string,
  target: string,
  answers: string[],
  choices: string[],
  explanation: string,
  irregular?: string,
): ConjugateExercise {
  return {
    id: `g${lesson}:${key}`,
    grammarId: gid(lesson, grammarCode),
    lesson,
    focus: 'conjugation',
    source: 'generated',
    explanation,
    type: 'conjugate',
    base,
    baseEn,
    target,
    answers,
    choices: dedupe(choices),
    ...(irregular ? { irregular } : {}),
  }
}

export const dedupe = <T>(a: T[]): T[] => [...new Set(a)]
