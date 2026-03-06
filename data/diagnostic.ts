import { EnglishLevel, UserGrade } from '../types';

export type DiagnosticSkill = 'grammar' | 'vocabulary' | 'reading';
export type DiagnosticPhase = 'warmup' | 'core' | 'stretch';
export type SelfAssessmentKey = 'FOUNDATION' | 'SCHOOL' | 'EXAM' | 'ADVANCED';

export interface DiagnosticQuestion {
  id: string;
  level: EnglishLevel;
  skill: DiagnosticSkill;
  phase: DiagnosticPhase;
  prompt?: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface SelfAssessmentOption {
  id: SelfAssessmentKey;
  title: string;
  description: string;
  helper: string;
  estimatedBand: EnglishLevel;
}

export interface SkillSummary {
  skill: DiagnosticSkill;
  label: string;
  correct: number;
  total: number;
  ratio: number;
  status: 'strong' | 'steady' | 'developing';
  message: string;
}

export interface DiagnosticReviewItem {
  id: string;
  level: EnglishLevel;
  skill: DiagnosticSkill;
  question: string;
  prompt?: string;
  userAnswer: string | null;
  correctAnswer: string;
  explanation: string;
  isCorrect: boolean;
}

export interface DiagnosticResult {
  level: EnglishLevel;
  correctCount: number;
  missedCount: number;
  totalQuestions: number;
  weightedScore: number;
  confidence: 'HIGH' | 'MEDIUM';
  phaseScores: Record<DiagnosticPhase, { correct: number; total: number }>;
  skillSummaries: SkillSummary[];
  reviewItems: DiagnosticReviewItem[];
  summaryTitle: string;
  summaryBody: string;
  nextFocus: string[];
  recommendedDailyGoal: number;
  alignmentNote: string;
}

const LEVEL_WEIGHTS: Record<EnglishLevel, number> = {
  [EnglishLevel.A1]: 1,
  [EnglishLevel.A2]: 2,
  [EnglishLevel.B1]: 3,
  [EnglishLevel.B2]: 4,
  [EnglishLevel.C1]: 5,
  [EnglishLevel.C2]: 6,
};

const SKILL_LABELS: Record<DiagnosticSkill, string> = {
  grammar: '文法',
  vocabulary: '語彙',
  reading: '読解',
};

const PHASE_LABELS: Record<DiagnosticPhase, string> = {
  warmup: 'Warm-up',
  core: 'Core',
  stretch: 'Stretch',
};

export const DIAGNOSTIC_PHASE_LABELS = PHASE_LABELS;

export const SELF_ASSESSMENT_OPTIONS: SelfAssessmentOption[] = [
  {
    id: 'FOUNDATION',
    title: '基礎から整えたい',
    description: '自己紹介や短い案内なら追えるが、少し長い英文だと不安がある。',
    helper: 'A1-A2 付近を想定して始めます。',
    estimatedBand: EnglishLevel.A2,
  },
  {
    id: 'SCHOOL',
    title: '学校英語はだいたい分かる',
    description: '授業や定期テストの英文は追えるが、初見の長文はまだ時間がかかる。',
    helper: 'A2-B1 付近の学習導線に向いています。',
    estimatedBand: EnglishLevel.B1,
  },
  {
    id: 'EXAM',
    title: '入試・英検に伸ばしたい',
    description: '英検準2級〜2級や入試長文に触れていて、文脈で読む力を伸ばしたい。',
    helper: 'B1-B2 付近の出発点を想定します。',
    estimatedBand: EnglishLevel.B2,
  },
  {
    id: 'ADVANCED',
    title: '抽象文や学術文も扱う',
    description: '抽象的な説明文やアカデミックな英文も読む。細かな語感まで詰めたい。',
    helper: 'B2-C1 付近の精度を見にいきます。',
    estimatedBand: EnglishLevel.C1,
  },
];

export const DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  {
    id: 'q1',
    level: EnglishLevel.A1,
    skill: 'grammar',
    phase: 'warmup',
    question: '次の空欄に入るもっとも自然な語を選んでください。 I ___ a student at Sakura Junior High.',
    options: ['am', 'is', 'are', 'be'],
    answer: 'am',
    explanation: 'I には be 動詞の am を使います。',
  },
  {
    id: 'q2',
    level: EnglishLevel.A1,
    skill: 'reading',
    phase: 'warmup',
    prompt: 'School Notice: The library closes at 6:00 p.m. today because of a staff meeting.',
    question: 'この案内から分かることはどれですか。',
    options: [
      '本を借りるなら午後6時より前に行く必要がある',
      '図書館は今日は午後9時まで開いている',
      '職員会議は図書館で開かれない',
      '今日は本の貸し出しが無料になる',
    ],
    answer: '本を借りるなら午後6時より前に行く必要がある',
    explanation: '6時に閉まるので、利用はそれまでに済ませる必要があります。',
  },
  {
    id: 'q3',
    level: EnglishLevel.A2,
    skill: 'grammar',
    phase: 'warmup',
    question: 'My sister usually ___ to school by bike.',
    options: ['go', 'goes', 'going', 'gone'],
    answer: 'goes',
    explanation: '三人称単数現在なので goes になります。',
  },
  {
    id: 'q4',
    level: EnglishLevel.A2,
    skill: 'reading',
    phase: 'warmup',
    prompt: 'Hi Aki, the science club meeting will be on Thursday instead of Tuesday because the lab is being cleaned.',
    question: 'ミーティングの日が変わった理由は何ですか。',
    options: [
      '実験室の清掃が入ったから',
      'Aki が火曜日に欠席するから',
      '科学部が木曜日で終わるから',
      '先生が会議を忘れていたから',
    ],
    answer: '実験室の清掃が入ったから',
    explanation: 'because the lab is being cleaned が理由です。',
  },
  {
    id: 'q5',
    level: EnglishLevel.B1,
    skill: 'grammar',
    phase: 'core',
    question: 'If it ___ tomorrow, we will practice indoors.',
    options: ['rains', 'will rain', 'rained', 'raining'],
    answer: 'rains',
    explanation: 'If 節では未来でも現在形を使います。',
  },
  {
    id: 'q6',
    level: EnglishLevel.B1,
    skill: 'vocabulary',
    phase: 'core',
    question: 'The museum tour was cancelled because of heavy rain, but it has been ___ until next Friday.',
    options: ['postponed', 'invented', 'hidden', 'folded'],
    answer: 'postponed',
    explanation: 'postpone は「延期する」です。',
  },
  {
    id: 'q7',
    level: EnglishLevel.B1,
    skill: 'reading',
    phase: 'core',
    prompt: 'Many students say they forget new words after a few days. To solve this, our English department will send short review quizzes every Friday. The quizzes are not for grades; they are only for practice.',
    question: 'このクイズの主な目的は何ですか。',
    options: [
      '定期的に復習する習慣を作ること',
      '成績を決めること',
      'スピーキング力だけを測ること',
      '宿題を完全になくすこと',
    ],
    answer: '定期的に復習する習慣を作ること',
    explanation: '記憶の定着のために毎週 review quizzes を送ると書かれています。',
  },
  {
    id: 'q8',
    level: EnglishLevel.B2,
    skill: 'grammar',
    phase: 'core',
    question: '___ the experiment was repeated three times, the researchers remained cautious about the result.',
    options: ['Although', 'Because', 'Unless', 'During'],
    answer: 'Although',
    explanation: '「〜にもかかわらず」の逆接が必要なので Although が最適です。',
  },
  {
    id: 'q9',
    level: EnglishLevel.B2,
    skill: 'vocabulary',
    phase: 'stretch',
    question: 'The article gives a ___ explanation of how vaccines work, using clear examples without unnecessary detail.',
    options: ['concise', 'fragile', 'random', 'silent'],
    answer: 'concise',
    explanation: 'concise は「簡潔で要点を押さえた」という意味です。',
  },
  {
    id: 'q10',
    level: EnglishLevel.B2,
    skill: 'reading',
    phase: 'stretch',
    prompt: 'More universities are offering hybrid classes. Supporters say this gives students greater flexibility, while critics warn that weaker study habits can lead to lower participation if courses are not carefully designed.',
    question: '批判側が懸念しているのはどれですか。',
    options: [
      '設計が甘いと参加度が下がること',
      '大学がテクノロジーを使わなくなること',
      '学生が必ず紙の教材を好むこと',
      '対面授業が完全になくなること',
    ],
    answer: '設計が甘いと参加度が下がること',
    explanation: 'lower participation if courses are not carefully designed が懸念点です。',
  },
  {
    id: 'q11',
    level: EnglishLevel.C1,
    skill: 'grammar',
    phase: 'stretch',
    question: 'Not until the final stage of the study ___ how unreliable the earlier measurements had been.',
    options: [
      'did the team realize',
      'the team realized',
      'realized the team',
      'had the team realized',
    ],
    answer: 'did the team realize',
    explanation: 'Not until を文頭に置く倒置なので did the team realize になります。',
  },
  {
    id: 'q12',
    level: EnglishLevel.C1,
    skill: 'reading',
    phase: 'stretch',
    prompt: 'While the treatment produced promising short-term gains, the sample was small and unusually homogeneous. The authors therefore cautioned against assuming that the same results would appear in more diverse populations.',
    question: '著者がもっとも注意している点はどれですか。',
    options: [
      '今回の結果が他の集団にも当てはまるとは限らないこと',
      '治療自体に効果がなかったこと',
      '研究期間が長すぎたこと',
      'データ収集の速度が遅すぎたこと',
    ],
    answer: '今回の結果が他の集団にも当てはまるとは限らないこと',
    explanation: 'generalise widely できるかは慎重に見るべきだと述べています。',
  },
];

const getExpectedBandFromSelfAssessment = (key: SelfAssessmentKey): EnglishLevel => {
  return SELF_ASSESSMENT_OPTIONS.find((option) => option.id === key)?.estimatedBand || EnglishLevel.A2;
};

const getAlignmentNote = (selfAssessment: SelfAssessmentKey, level: EnglishLevel): string => {
  const expected = getExpectedBandFromSelfAssessment(selfAssessment);
  const order = [EnglishLevel.A1, EnglishLevel.A2, EnglishLevel.B1, EnglishLevel.B2, EnglishLevel.C1];
  const expectedIndex = order.indexOf(expected);
  const resultIndex = order.indexOf(level);

  if (resultIndex >= expectedIndex + 1) {
    return '自己評価より高めのスタート帯が見えています。最初から少し背伸びした教材でも対応できそうです。';
  }

  if (resultIndex <= expectedIndex - 1) {
    return 'まずは基礎の定着を優先した方が伸びやすい判定です。スピードより再現性を重視しましょう。';
  }

  return '自己評価と近い帯でした。いまの感覚に合った難度から始められます。';
};

const getDailyGoal = (level: EnglishLevel, grade: UserGrade): number => {
  const baseGoals: Record<EnglishLevel, number> = {
    [EnglishLevel.A1]: 10,
    [EnglishLevel.A2]: 12,
    [EnglishLevel.B1]: 15,
    [EnglishLevel.B2]: 18,
    [EnglishLevel.C1]: 22,
    [EnglishLevel.C2]: 24,
  };

  if (grade === UserGrade.JHS1 || grade === UserGrade.JHS2) return Math.max(8, baseGoals[level] - 2);
  return baseGoals[level];
};

const getFocusByLevel = (level: EnglishLevel): string[] => {
  switch (level) {
    case EnglishLevel.A1:
      return [
        'be動詞・一般動詞・基本語順を毎日少しずつ反復する',
        '高頻度語を短い例文と一緒に覚える',
        '一度に進めすぎず、翌日の復習を必ず入れる',
      ];
    case EnglishLevel.A2:
      return [
        '日常語彙を増やしながら、短い説明文に慣れる',
        '時制・比較・前置詞のミスを減らす',
        '1回で覚えるより、3回で定着させる設計にする',
      ];
    case EnglishLevel.B1:
      return [
        '文脈の中で語彙を増やし、単語帳と短文読解を組み合わせる',
        '接続語や条件文など、意味の流れを作る文法を固める',
        '週に数回はテストモードで思い出す練習を入れる',
      ];
    case EnglishLevel.B2:
      return [
        '抽象語彙・論理接続・要旨把握をセットで鍛える',
        '説明文や評論文で「なぜそう言えるか」を意識して読む',
        '復習では意味だけでなく語感や使い分けも確認する',
      ];
    default:
      return [
        'アカデミック語彙と論証の流れを精読で確認する',
        '似た意味の語のニュアンス差まで押さえる',
        '学んだ語を自分の説明文で使い直して定着させる',
      ];
  }
};

const getSummaryCopy = (level: EnglishLevel): { title: string; body: string; } => {
  switch (level) {
    case EnglishLevel.A1:
      return {
        title: '基礎を土台から積み上げる段階です',
        body: '短くて明確な英文なら追えています。まずは高頻度語と基本文法の再現性を上げると、伸びが急に安定します。',
      };
    case EnglishLevel.A2:
      return {
        title: '学校英語の基礎は見えてきています',
        body: '短い説明文や連絡文は読めています。語彙の幅と文法の正確さを少しずつ上げると、B1 への移行が速い帯です。',
      };
    case EnglishLevel.B1:
      return {
        title: '標準レベルの学習に十分入れる状態です',
        body: '日常的な英文や学校レベルの説明文を処理する土台があります。ここからは復習の頻度と語彙の文脈理解が差になります。',
      };
    case EnglishLevel.B2:
      return {
        title: '長文読解と抽象語彙に踏み込める段階です',
        body: '論理の流れや説明文の要点をかなり追えています。抽象語彙と精読を組み合わせると上位帯へ伸ばしやすいです。',
      };
    default:
      return {
        title: 'かなり高い帯から始められます',
        body: '複雑な構文や含意の読み取りまで対応できています。今後は精度と語感の差を詰める設計が効果的です。',
      };
  }
};

const buildSkillMessage = (skill: DiagnosticSkill, ratio: number): string => {
  if (ratio >= 0.75) {
    return skill === 'reading'
      ? '情報のつながりや要点を比較的安定して読めています。'
      : skill === 'grammar'
        ? '形の選択が安定しており、学習の土台になっています。'
        : '文脈に合う語を選ぶ感覚がかなり育っています。';
  }

  if (ratio >= 0.45) {
    return skill === 'reading'
      ? '短めの文脈では読めていますが、抽象度が上がると揺れが出ます。'
      : skill === 'grammar'
        ? '基本は取れています。やや複雑な構文での取りこぼしが残っています。'
        : '高頻度語は見えています。語のニュアンス差を詰める余地があります。';
  }

  return skill === 'reading'
    ? '読むときの手がかりを増やすと理解が大きく安定します。'
    : skill === 'grammar'
      ? 'まずは頻出の型を繰り返して自動化するのが近道です。'
      : '単語の意味を文脈と一緒に覚えると伸びやすい状態です。';
};

export const evaluateDiagnostic = (
  answers: Record<string, string>,
  selfAssessment: SelfAssessmentKey,
  grade: UserGrade
): DiagnosticResult => {
  const bandCorrect: Partial<Record<EnglishLevel, number>> = {};
  const phaseScores: Record<DiagnosticPhase, { correct: number; total: number }> = {
    warmup: { correct: 0, total: 0 },
    core: { correct: 0, total: 0 },
    stretch: { correct: 0, total: 0 },
  };

  const skillCounter: Record<DiagnosticSkill, { correct: number; total: number }> = {
    grammar: { correct: 0, total: 0 },
    vocabulary: { correct: 0, total: 0 },
    reading: { correct: 0, total: 0 },
  };
  const reviewItems: DiagnosticReviewItem[] = [];

  let correctCount = 0;
  let weightedScore = 0;

  DIAGNOSTIC_QUESTIONS.forEach((question) => {
    const isCorrect = answers[question.id] === question.answer;
    reviewItems.push({
      id: question.id,
      level: question.level,
      skill: question.skill,
      question: question.question,
      prompt: question.prompt,
      userAnswer: answers[question.id] || null,
      correctAnswer: question.answer,
      explanation: question.explanation,
      isCorrect,
    });
    phaseScores[question.phase].total += 1;
    skillCounter[question.skill].total += 1;

    if (!isCorrect) return;

    correctCount += 1;
    weightedScore += LEVEL_WEIGHTS[question.level];
    phaseScores[question.phase].correct += 1;
    skillCounter[question.skill].correct += 1;
    bandCorrect[question.level] = (bandCorrect[question.level] || 0) + 1;
  });

  let level = EnglishLevel.A1;
  if (weightedScore >= 30 && (bandCorrect[EnglishLevel.C1] || 0) >= 1 && (bandCorrect[EnglishLevel.B2] || 0) >= 1) {
    level = EnglishLevel.C1;
  } else if (weightedScore >= 22 && (bandCorrect[EnglishLevel.B2] || 0) >= 1 && (bandCorrect[EnglishLevel.B1] || 0) >= 2) {
    level = EnglishLevel.B2;
  } else if (weightedScore >= 12 && (bandCorrect[EnglishLevel.B1] || 0) >= 2) {
    level = EnglishLevel.B1;
  } else if (weightedScore >= 6 && (bandCorrect[EnglishLevel.A2] || 0) >= 1) {
    level = EnglishLevel.A2;
  }

  const confidence = correctCount >= 8 || correctCount <= 3 ? 'HIGH' : 'MEDIUM';
  const summaryCopy = getSummaryCopy(level);

  const skillSummaries: SkillSummary[] = (Object.keys(skillCounter) as DiagnosticSkill[]).map((skill) => {
    const current = skillCounter[skill];
    const ratio = current.total === 0 ? 0 : current.correct / current.total;
    return {
      skill,
      label: SKILL_LABELS[skill],
      correct: current.correct,
      total: current.total,
      ratio,
      status: ratio >= 0.75 ? 'strong' : ratio >= 0.45 ? 'steady' : 'developing',
      message: buildSkillMessage(skill, ratio),
    };
  });

  return {
    level,
    correctCount,
    missedCount: DIAGNOSTIC_QUESTIONS.length - correctCount,
    totalQuestions: DIAGNOSTIC_QUESTIONS.length,
    weightedScore,
    confidence,
    phaseScores,
    skillSummaries,
    reviewItems,
    summaryTitle: summaryCopy.title,
    summaryBody: summaryCopy.body,
    nextFocus: getFocusByLevel(level),
    recommendedDailyGoal: getDailyGoal(level, grade),
    alignmentNote: getAlignmentNote(selfAssessment, level),
  };
};
