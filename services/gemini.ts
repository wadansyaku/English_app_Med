import { BookMetadata, EnglishLevel, LearningPlan, StudentRiskLevel, UserGrade, WordData } from '../types';
import { ApiError, apiPost } from './apiClient';

export interface GeneratedContext {
  english: string;
  japanese: string;
}

export interface AIQuizQuestion {
  wordId: string;
  options: string[];
  correctOption: string;
}

export interface ExtractedResult {
  words: { word: string; definition: string; }[];
  contextSummary: string;
}

export interface InstructorFollowUpDraft {
  message: string;
}

export interface DiagnosticQuestion {
  id: string;
  type: 'MCQ' | 'FILL_IN' | 'WRITING';
  question: string;
  options?: string[];
  answer?: string;
  level: EnglishLevel;
}

const callAi = async <TResponse, TPayload = unknown>(action: string, payload?: TPayload): Promise<TResponse> => {
  return apiPost<TResponse>('/api/ai', { action, payload });
};

const isRateLimitError = (error: unknown): boolean => error instanceof ApiError && error.status === 429;

export const generateGeminiSentence = async (
  word: string,
  definition: string,
  userLevel: EnglishLevel = EnglishLevel.B1,
  sourceContext?: string
): Promise<GeneratedContext> => {
  try {
    return await callAi<GeneratedContext, { word: string; definition: string; userLevel: EnglishLevel; sourceContext?: string }>('generateGeminiSentence', {
      word,
      definition,
      userLevel,
      sourceContext,
    });
  } catch (error) {
    if (isRateLimitError(error)) {
      return { english: 'AI利用制限に達しました。', japanese: 'しばらく待ってから再試行してください。' };
    }
    console.error('Sentence generation failed:', error);
    return { english: '例文を生成できませんでした。', japanese: 'エラーが発生しました。' };
  }
};

export const generateWordImage = async (word: string, definition: string): Promise<string | null> => {
  try {
    return await callAi<string | null, { word: string; definition: string }>('generateWordImage', { word, definition });
  } catch (error) {
    if (isRateLimitError(error)) {
      return null;
    }
    console.error('Image generation failed:', error);
    return null;
  }
};

export const generateAIQuiz = async (targetWords: WordData[]): Promise<AIQuizQuestion[]> => {
  if (targetWords.length === 0) return [];

  try {
    return await callAi<AIQuizQuestion[], { targetWords: WordData[] }>('generateAIQuiz', { targetWords });
  } catch (error) {
    if (!isRateLimitError(error)) {
      console.error('AI quiz generation failed:', error);
    }
    return [];
  }
};

export const extractVocabularyFromText = async (rawText: string): Promise<ExtractedResult> => {
  try {
    return await callAi<ExtractedResult, { rawText: string }>('extractVocabularyFromText', { rawText });
  } catch (error) {
    if (isRateLimitError(error)) {
      throw new Error('AIの利用制限(RPM)に達しました。1分ほど待ってから再試行してください。(Error: 429)');
    }
    throw new Error(error instanceof Error ? error.message : 'AIによる抽出に失敗しました。');
  }
};

export const extractVocabularyFromMedia = async (base64Data: string, mimeType: string): Promise<ExtractedResult> => {
  try {
    return await callAi<ExtractedResult, { base64Data: string; mimeType: string }>('extractVocabularyFromMedia', { base64Data, mimeType });
  } catch (error) {
    if (isRateLimitError(error)) {
      throw new Error('AIの利用制限(RPM)に達しました。1分ほど待ってから再試行してください。(Error: 429)');
    }
    throw new Error(error instanceof Error ? error.message : 'AIによる画像解析に失敗しました。');
  }
};

export const generateLearningPlan = async (
  grade: UserGrade,
  level: EnglishLevel,
  availableBooks: BookMetadata[]
): Promise<LearningPlan | null> => {
  if (availableBooks.length === 0) return null;

  try {
    return await callAi<LearningPlan | null, { grade: UserGrade; level: EnglishLevel; availableBooks: BookMetadata[] }>('generateLearningPlan', {
      grade,
      level,
      availableBooks,
    });
  } catch (error) {
    console.error('Plan generation failed:', error);
    return null;
  }
};

export const generateInstructorFollowUp = async (input: {
  instructorName: string;
  studentName: string;
  riskLevel: StudentRiskLevel;
  daysSinceActive: number;
  totalLearned: number;
  currentLevel?: EnglishLevel;
  customInstruction?: string;
}): Promise<InstructorFollowUpDraft | null> => {
  try {
    return await callAi<InstructorFollowUpDraft, typeof input>('generateInstructorFollowUp', input);
  } catch (error) {
    if (!isRateLimitError(error)) {
      console.error('Instructor follow-up generation failed:', error);
    }
    return null;
  }
};

export const generateDiagnosticTest = async (grade: UserGrade): Promise<DiagnosticQuestion[]> => {
  try {
    return await callAi<DiagnosticQuestion[], { grade: UserGrade }>('generateDiagnosticTest', { grade });
  } catch (error) {
    console.error('Diagnostic test generation failed:', error);
    return [];
  }
};

export const generateAdvancedDiagnosticTest = async (grade: UserGrade, learningHistorySummary: string): Promise<DiagnosticQuestion[]> => {
  try {
    return await callAi<DiagnosticQuestion[], { grade: UserGrade; learningHistorySummary: string }>('generateAdvancedDiagnosticTest', {
      grade,
      learningHistorySummary,
    });
  } catch (error) {
    console.error('Advanced diagnostic test generation failed:', error);
    return generateDiagnosticTest(grade);
  }
};

export const evaluateAdvancedTest = async (
  grade: UserGrade,
  questions: DiagnosticQuestion[],
  userAnswers: Record<string, string>
): Promise<EnglishLevel> => {
  try {
    return await callAi<EnglishLevel, { grade: UserGrade; questions: DiagnosticQuestion[]; userAnswers: Record<string, string> }>('evaluateAdvancedTest', {
      grade,
      questions,
      userAnswers,
    });
  } catch (error) {
    console.error('Advanced test evaluation failed:', error);
    return EnglishLevel.A2;
  }
};
