import { StudentWorksheetWord, WordData, WorksheetQuestionMode } from '../types';

type WorksheetSourceWord = Pick<StudentWorksheetWord, 'word' | 'definition' | 'bookId' | 'bookTitle'> & {
  wordId?: string;
  id?: string;
};

export interface GeneratedWorksheetQuestion {
  id: string;
  mode: WorksheetQuestionMode;
  wordId: string;
  bookId: string;
  bookTitle?: string;
  promptLabel: string;
  promptText: string;
  answer: string;
  options?: string[];
  hintPrefix?: string;
  maskedAnswer?: string;
}

export const WORKSHEET_MODE_COPY: Record<WorksheetQuestionMode, { label: string; description: string; }> = {
  EN_TO_JA: {
    label: '英語 -> 日本語',
    description: '英単語を見て、日本語の意味を素早く確認します。',
  },
  JA_TO_EN: {
    label: '日本語 -> 英語',
    description: '意味から英語を思い出し、逆向きの想起を鍛えます。',
  },
  SPELLING_HINT: {
    label: '先頭2文字ヒント',
    description: '最初の2文字をヒントに、残りの英語を思い出します。',
  },
};

const shuffle = <T>(items: T[]): T[] => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
};

const toWordId = (word: WorksheetSourceWord): string => word.wordId || word.id || `${word.bookId}:${word.word}`;

const uniqueValues = (values: string[]): string[] => [...new Set(values.filter(Boolean))];

const createOptions = (answer: string, pool: string[]): string[] => {
  const distractors = shuffle(uniqueValues(pool.filter((item) => item !== answer))).slice(0, 3);
  while (distractors.length < 3) {
    distractors.push(`その他 ${distractors.length + 1}`);
  }
  return shuffle([...distractors, answer]);
};

const revealPrefix = (word: string, visibleLetters = 2): string => {
  let count = 0;
  let prefix = '';
  for (const character of word) {
    if (/[A-Za-z]/.test(character)) {
      count += 1;
      prefix += character;
      if (count >= visibleLetters) break;
    } else if (count === 0) {
      prefix += character;
    } else {
      prefix += character;
    }
  }
  return prefix || word.slice(0, visibleLetters);
};

export const maskWordWithPrefix = (word: string, visibleLetters = 2): string => {
  let revealed = 0;
  return [...word].map((character) => {
    if (/[A-Za-z]/.test(character)) {
      revealed += 1;
      return revealed <= visibleLetters ? character : '_';
    }
    if (character === ' ' || character === '-' || character === '\'') {
      return character;
    }
    return '_';
  }).join('');
};

const normalizeEnglish = (value: string): string => value.trim().replace(/\s+/g, ' ').toLowerCase();

export const isCorrectSpellingHintAnswer = (input: string, answer: string, hintPrefix: string): boolean => {
  const normalizedInput = normalizeEnglish(input);
  const normalizedAnswer = normalizeEnglish(answer);
  const normalizedSuffix = normalizeEnglish(answer.slice(hintPrefix.length));
  return normalizedInput === normalizedAnswer || normalizedInput === normalizedSuffix;
};

export const generateWorksheetQuestions = (
  sourceWords: WorksheetSourceWord[],
  mode: WorksheetQuestionMode,
  questionCount: number,
): GeneratedWorksheetQuestion[] => {
  if (sourceWords.length === 0) return [];

  const selectedWords = shuffle(sourceWords).slice(0, Math.min(questionCount, sourceWords.length));
  const definitionPool = sourceWords.map((word) => word.definition);
  const englishPool = sourceWords.map((word) => word.word);

  return selectedWords.map((word, index) => {
    const wordId = toWordId(word);

    if (mode === 'JA_TO_EN') {
      return {
        id: `${wordId}:${mode}:${index}`,
        mode,
        wordId,
        bookId: word.bookId,
        bookTitle: word.bookTitle,
        promptLabel: '日本語の意味',
        promptText: word.definition,
        answer: word.word,
        options: createOptions(word.word, englishPool),
      };
    }

    if (mode === 'SPELLING_HINT') {
      const hintPrefix = revealPrefix(word.word, 2);
      return {
        id: `${wordId}:${mode}:${index}`,
        mode,
        wordId,
        bookId: word.bookId,
        bookTitle: word.bookTitle,
        promptLabel: '日本語の意味',
        promptText: word.definition,
        answer: word.word,
        hintPrefix,
        maskedAnswer: maskWordWithPrefix(word.word, 2),
      };
    }

    return {
      id: `${wordId}:${mode}:${index}`,
      mode,
      wordId,
      bookId: word.bookId,
      bookTitle: word.bookTitle,
      promptLabel: '英単語',
      promptText: word.word,
      answer: word.definition,
      options: createOptions(word.definition, definitionPool),
    };
  });
};

export const toWorksheetSourceWords = (
  words: Array<WordData | StudentWorksheetWord>,
  bookTitles: Record<string, string> = {},
): WorksheetSourceWord[] => {
  return words.map((word) => ({
    id: 'id' in word ? word.id : undefined,
    wordId: 'wordId' in word ? word.wordId : undefined,
    word: word.word,
    definition: word.definition,
    bookId: word.bookId,
    bookTitle: 'bookTitle' in word ? word.bookTitle : bookTitles[word.bookId],
  }));
};
