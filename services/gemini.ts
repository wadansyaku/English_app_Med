
import { GoogleGenAI, Type } from "@google/genai";
import { WordData, EnglishLevel, UserGrade, LearningPlan, BookMetadata } from "../types";

const API_KEY = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey: API_KEY });

export interface GeneratedContext {
  english: string;
  japanese: string;
}

// --- 1. Context-Aware Sentence Generation ---
export const generateGeminiSentence = async (
    word: string, 
    definition: string, 
    userLevel: EnglishLevel = EnglishLevel.B1,
    sourceContext?: string // New: Style/Context guide
): Promise<GeneratedContext> => {
  if (!API_KEY) return { english: "AI機能が無効です。", japanese: "APIキーを確認してください。" };

  try {
    // Enhanced prompt to use sourceContext
    let styleInstruction = "Create a practical example sentence.";
    if (sourceContext) {
        styleInstruction = `Create an example sentence that fits the following context/style: "${sourceContext}". If the context is hard to apply, keep it natural but related to the theme.`;
    }

    const prompt = `
      Target Audience: Japanese Student (Level ${userLevel}).
      Word: "${word}"
      Meaning: "${definition}"
      
      Task:
      1. Analyze if the word is "Modern English" or "Classical Japanese (古文)".
      2. IF ENGLISH: ${styleInstruction}
      3. IF CLASSICAL JAPANESE: Create a famous or natural example sentence from classical literature or typical usage.
      
      Output JSON format:
      {
        "english": "The example sentence (or Classical Japanese sentence)",
        "japanese": "Natural modern Japanese translation"
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            english: { type: Type.STRING },
            japanese: { type: Type.STRING }
          },
          required: ["english", "japanese"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as GeneratedContext;
    }
    throw new Error("No response text");
  } catch (error: any) {
    if (error.status === 429 || error.message?.includes('429')) {
        console.warn("Gemini API Rate Limit (429) hit during sentence generation.");
        return { english: "AI利用制限に達しました。", japanese: "しばらく待ってから再試行してください。" };
    }
    console.error("Gemini generation error:", error);
    return { english: "例文を生成できませんでした。", japanese: "エラーが発生しました。" };
  }
};

export const generateWordImage = async (word: string, definition: string): Promise<string | null> => {
  if (!API_KEY) return null;

  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: `A minimal, flat vector icon representing "${word}" (Meaning: ${definition}). Simple geometric shapes, white background.`,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '1:1',
      },
    });

    const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (base64ImageBytes) {
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    }
    return null;
  } catch (error: any) {
    if (error.status === 429 || error.message?.includes('429')) {
        console.warn("Imagen API Rate Limit (429).");
        return null;
    }
    console.error("Gemini image generation error:", error);
    return null;
  }
};

export interface AIQuizQuestion {
  wordId: string;
  options: string[];
  correctOption: string;
}

export const generateAIQuiz = async (targetWords: WordData[]): Promise<AIQuizQuestion[]> => {
  if (!API_KEY || targetWords.length === 0) return [];

  const selectedWords = targetWords.slice(0, 5);
  const inputList = selectedWords.map(w => ({ word: w.word, meaning: w.definition, id: w.id }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Create a multiple-choice quiz. Input: ${JSON.stringify(inputList)}. Output JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              wordId: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctOption: { type: Type.STRING }
            },
            required: ["wordId", "options", "correctOption"]
          }
        }
      }
    });

    if (response.text) return JSON.parse(response.text) as AIQuizQuestion[];
    return [];
  } catch (error: any) {
    if (error.status === 429 || error.message?.includes('429')) {
         console.warn("Gemini API Rate Limit (429) during quiz generation.");
         return [];
    }
    console.error("AI Quiz Generation Failed:", error);
    return [];
  }
};

export interface ExtractedResult {
    words: {word: string, definition: string}[];
    contextSummary: string;
}

// --- 2. Context-Aware Extraction ---
export const extractVocabularyFromText = async (rawText: string): Promise<ExtractedResult> => {
  if (!API_KEY) throw new Error("API Key Missing");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
        Task 1: Extract 10 important English words (CEFR A2-B2) from the text.
        Task 2: Summarize the "style" and "context" of this text in 1 short English sentence (e.g., "Casual conversation about hobbies", "Formal business email", "Lyrics of a love song").
        
        Text: """${rawText.slice(0, 5000)}"""
        
        Output JSON: { "words": [{word, definition}], "contextSummary": "..." }
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
             words: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                    word: { type: Type.STRING },
                    definition: { type: Type.STRING }
                    },
                    required: ["word", "definition"]
                }
             },
             contextSummary: { type: Type.STRING, description: "The style/theme of the source text" }
          },
          required: ["words", "contextSummary"]
        }
      }
    });

    if (response.text) return JSON.parse(response.text) as ExtractedResult;
    throw new Error("Empty Response");
  } catch (error: any) {
    if (error.status === 429 || error.message?.includes('429')) {
        throw new Error("AIの利用制限(RPM)に達しました。1分ほど待ってから再試行してください。(Error: 429)");
    }
    console.error("Vocabulary Extraction Failed:", error);
    throw new Error("AIによる抽出に失敗しました。");
  }
};

export const extractVocabularyFromMedia = async (base64Data: string, mimeType: string): Promise<ExtractedResult> => {
  if (!API_KEY) throw new Error("API Key Missing");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        },
        {
          text: `
            You are an expert English tutor.
            1. Identify the 10 most important English vocabulary words in this image.
            2. Analyze the context/style of the content (e.g., "Textbook page about history", "Street sign", "Handwritten note").
            
            Output JSON: { "words": [{word, definition}], "contextSummary": "..." }
          `
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
               words: {
                  type: Type.ARRAY,
                  items: {
                      type: Type.OBJECT,
                      properties: {
                      word: { type: Type.STRING },
                      definition: { type: Type.STRING }
                      },
                      required: ["word", "definition"]
                  }
               },
               contextSummary: { type: Type.STRING }
            },
            required: ["words", "contextSummary"]
        }
      }
    });

    if (response.text) return JSON.parse(response.text) as ExtractedResult;
    throw new Error("Empty Response");
  } catch (error: any) {
    if (error.status === 429 || error.message?.includes('429')) {
        throw new Error("AIの利用制限(RPM)に達しました。1分ほど待ってから再試行してください。(Error: 429)");
    }
    console.error("Media Extraction Failed:", error);
    throw new Error("AIによる画像解析に失敗しました。");
  }
};

// --- 3. Learning Plan Generation (Gemini 3.0 Pro) ---

export const generateLearningPlan = async (
    grade: UserGrade,
    level: EnglishLevel,
    availableBooks: BookMetadata[]
): Promise<LearningPlan | null> => {
    if (!API_KEY) return null;

    try {
        const bookList = availableBooks.map(b => ({ id: b.id, title: b.title, priority: b.isPriority }));
        
        const prompt = `
          User Profile: Grade ${grade}, Level ${level}.
          Available Books: ${JSON.stringify(bookList)}.
          
          Task: Create a personalized learning plan (Curriculum).
          1. Select the most appropriate books (Max 5) for this user's level to focus on FIRST. Do not select everything.
          2. Determine a realistic daily word goal (e.g., 10-30 words).
          3. Set a goal description and target completion days.
          
          Output JSON.
        `;

        const response = await ai.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
               type: Type.OBJECT,
               properties: {
                 goalDescription: { type: Type.STRING, description: "Encouraging goal message (Japanese)" },
                 targetDays: { type: Type.NUMBER, description: "Days to complete this phase" },
                 dailyWordGoal: { type: Type.NUMBER },
                 selectedBookIds: { type: Type.ARRAY, items: { type: Type.STRING } }
               },
               required: ["goalDescription", "targetDays", "dailyWordGoal", "selectedBookIds"]
            }
          }
        });

        if (response.text) {
            const res = JSON.parse(response.text);
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + (res.targetDays || 30));
            
            return {
                uid: '', // Filled by caller
                createdAt: Date.now(),
                targetDate: targetDate.toISOString().split('T')[0],
                goalDescription: res.goalDescription,
                dailyWordGoal: res.dailyWordGoal,
                selectedBookIds: res.selectedBookIds,
                status: 'ACTIVE'
            };
        }
        return null;

    } catch (e) {
        console.error("Plan Generation Failed", e);
        return null;
    }
};

// --- DIAGNOSTIC TESTS ---

export interface DiagnosticQuestion {
  id: string;
  type: 'MCQ' | 'FILL_IN' | 'WRITING';
  question: string;
  options?: string[];
  answer?: string;
  level: EnglishLevel;
}

export const generateDiagnosticTest = async (grade: UserGrade): Promise<DiagnosticQuestion[]> => {
  if (!API_KEY) return [];

  try {
    // Prompt updated to ensure Japanese instructions AND varied topics
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
        Generate 5 English multiple-choice questions for a Japanese student (Grade: ${grade}). 
        Levels: Easy to Hard (A1 to B2).
        
        IMPORTANT RULES:
        1. The 'question' field MUST contain the instruction in JAPANESE (e.g., "次の空欄に当てはまる最も適切な単語を選びなさい") followed by the English sentence.
        2. Ensure VARIETY in topics: Mix Science, Travel, Daily Conversation, Culture, and History. Do NOT make all questions about the same topic.
        
        Output JSON.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["MCQ"] },
              question: { type: Type.STRING, description: "Instruction in Japanese + English Question" },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              answer: { type: Type.STRING },
              level: { type: Type.STRING, enum: Object.values(EnglishLevel) }
            },
            required: ["id", "type", "question", "options", "answer", "level"]
          }
        }
      }
    });

    if (response.text) return JSON.parse(response.text) as DiagnosticQuestion[];
    return [];
  } catch (error: any) {
    console.error("Diagnostic Gen Failed:", error);
    return [];
  }
};

export const generateAdvancedDiagnosticTest = async (grade: UserGrade, learningHistorySummary: string): Promise<DiagnosticQuestion[]> => {
  if (!API_KEY) return [];

  try {
    // Prompt updated to ensure Japanese instructions AND varied topics
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `
        You are an expert linguist. Create a comprehensive 10-question English diagnostic test.
        Target: Japanese Student, Grade: ${grade}.
        Past Performance Context: ${learningHistorySummary}
        
        Requirements:
        - 4 Multiple Choice Questions (Vocabulary/Grammar). Instruction in Japanese.
        - 3 Fill-in-the-blank Questions (Cloze test). Provide options as empty array []. Instruction in Japanese.
        - 3 Writing/Translation Questions (Japanese to English or Short Essay). Provide options as empty array []. Instruction in Japanese.
        - Mix of CEFR levels (A1 to C1) to accurately find the ceiling.
        - **VARIETY IS KEY**: Cover topics like Nature, Technology, Social Issues, and Fiction.
        
        IMPORTANT: The 'question' field MUST contain the instruction in JAPANESE (e.g., "次の英文を和訳しなさい", "次の日本語を英語にしなさい") followed by the content.
        
        Output JSON.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["MCQ", "FILL_IN", "WRITING"] },
              question: { type: Type.STRING, description: "Instruction in Japanese + Question Content" },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              answer: { type: Type.STRING, description: "Correct answer or grading criteria key points" },
              level: { type: Type.STRING, enum: Object.values(EnglishLevel) }
            },
            required: ["id", "type", "question", "options", "answer", "level"]
          }
        }
      }
    });

    if (response.text) return JSON.parse(response.text) as DiagnosticQuestion[];
    return [];
  } catch (error: any) {
    console.error("Advanced Diagnostic Gen Failed:", error);
    return generateDiagnosticTest(grade);
  }
};

export const evaluateAdvancedTest = async (
  grade: UserGrade, 
  questions: DiagnosticQuestion[], 
  userAnswers: Record<string, string>
): Promise<EnglishLevel> => {
  if (!API_KEY) return EnglishLevel.A1;

  try {
    const transcript = questions.map(q => ({
      id: q.id,
      type: q.type,
      question: q.question,
      level: q.level,
      correctOrCriteria: q.answer,
      userAnswer: userAnswers[q.id] || "(No Answer)"
    }));

    const prompt = `
      You are an English Level Assessor.
      Student Grade: ${grade}.
      
      Review the following test transcript (Questions vs User Answers):
      ${JSON.stringify(transcript, null, 2)}
      
      Task:
      1. Grade each answer (Strictly for grammar/vocab, lenient for typos).
      2. Determine the overall CEFR Level (A1-C2) based on the difficulty of questions answered correctly.
      3. Ignore questions that were left blank.
      
      Return ONLY the CEFR Level as a string (e.g., "B1").
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt
    });

    const text = response.text?.trim() || "";
    const foundLevel = Object.values(EnglishLevel).find(l => text.includes(l));
    return foundLevel || EnglishLevel.A1;

  } catch (error) {
    console.error("Evaluation Failed:", error);
    return EnglishLevel.A2;
  }
};
