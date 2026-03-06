import React, { useEffect, useMemo, useState } from 'react';
import { UserProfile, WorksheetQuestionMode, WordData } from '../types';
import { storage } from '../services/storage';
import { generateAIQuiz, AIQuizQuestion } from '../services/gemini';
import { isBusinessPlan } from '../config/subscription';
import { GeneratedWorksheetQuestion, generateWorksheetQuestions, isCorrectSpellingHintAnswer, toWorksheetSourceWords, WORKSHEET_MODE_COPY } from '../utils/worksheet';
import { BrainCircuit, CheckCircle, Eye, HelpCircle, Loader2, PencilLine, RefreshCw, RotateCcw, SpellCheck, XCircle } from 'lucide-react';

interface QuizModeProps {
  user: UserProfile;
  bookId: string;
  onBack: () => void;
}

const QUESTION_COUNT = 5;

const shuffle = <T,>(items: T[]): T[] => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
};

const buildAiEnhancedQuestions = (targetWords: WordData[], aiQuestions: AIQuizQuestion[]): GeneratedWorksheetQuestion[] => {
  return targetWords.map((target, index) => {
    const aiData = aiQuestions.find((question) => question.wordId === target.id);
    if (aiData && aiData.options.length === 4 && aiData.options.includes(aiData.correctOption)) {
      return {
        id: `${target.id}:EN_TO_JA:${index}`,
        mode: 'EN_TO_JA',
        wordId: target.id,
        bookId: target.bookId,
        promptLabel: '英単語',
        promptText: target.word,
        answer: aiData.correctOption,
        options: aiData.options,
      };
    }

    const distractors = shuffle(
      targetWords
        .filter((candidate) => candidate.id !== target.id)
        .map((candidate) => candidate.definition)
    ).slice(0, 3);

    while (distractors.length < 3) {
      distractors.push(`その他 ${distractors.length + 1}`);
    }

    return {
      id: `${target.id}:EN_TO_JA:${index}`,
      mode: 'EN_TO_JA',
      wordId: target.id,
      bookId: target.bookId,
      promptLabel: '英単語',
      promptText: target.word,
      answer: target.definition,
      options: shuffle([...distractors, target.definition]),
    };
  });
};

const modeIcon = (mode: WorksheetQuestionMode) => {
  if (mode === 'JA_TO_EN') return <RotateCcw className="h-4 w-4" />;
  if (mode === 'SPELLING_HINT') return <SpellCheck className="h-4 w-4" />;
  return <BrainCircuit className="h-4 w-4" />;
};

const QuizMode: React.FC<QuizModeProps> = ({ user, bookId, onBack }) => {
  const businessQuizEnabled = useMemo(() => isBusinessPlan(user.subscriptionPlan), [user.subscriptionPlan]);
  const [quizMode, setQuizMode] = useState<WorksheetQuestionMode>('EN_TO_JA');
  const [questions, setQuestions] = useState<GeneratedWorksheetQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [showAnswerPanel, setShowAnswerPanel] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('クイズを準備中...');

  useEffect(() => {
    const initQuiz = async () => {
      try {
        setLoading(true);
        setLoadingMessage('クイズを準備中...');
        setCurrentQIndex(0);
        setShowAnswerPanel(false);
        setSelectedOption(null);
        setTypedAnswer('');
        setIsCorrect(null);
        setScore(0);
        setCompleted(false);

        const allWords = await storage.getWordsByBook(bookId);
        if (allWords.length === 0) {
          setQuestions([]);
          return;
        }

        if (quizMode === 'EN_TO_JA') {
          const targetWords = shuffle(allWords).slice(0, Math.min(QUESTION_COUNT, allWords.length));
          setLoadingMessage('AIが難問を作成中...');

          let aiQuestions: AIQuizQuestion[] = [];
          try {
            aiQuestions = await generateAIQuiz(targetWords);
          } catch (error) {
            console.warn('AI Generation failed, using local fallback', error);
          }

          setQuestions(buildAiEnhancedQuestions(targetWords, aiQuestions));
          return;
        }

        setLoadingMessage(quizMode === 'JA_TO_EN' ? '日本語から英語を引き出す問題を準備中...' : '先頭2文字ヒント問題を準備中...');
        setQuestions(generateWorksheetQuestions(toWorksheetSourceWords(allWords), quizMode, QUESTION_COUNT));
      } catch (error) {
        console.error('Quiz Init Error', error);
      } finally {
        setLoading(false);
      }
    };

    initQuiz();
  }, [bookId, quizMode]);

  const currentQ = questions[currentQIndex];
  const modeCopy = WORKSHEET_MODE_COPY[quizMode];

  const saveResult = async (correct: boolean) => {
    if (!currentQ) return;

    await storage.saveHistory(user.uid, {
      wordId: currentQ.wordId,
      bookId,
      status: correct ? 'learning' : 'review',
      lastStudiedAt: Date.now(),
      correctCount: correct ? 1 : 0,
      attemptCount: 1,
    });
  };

  const moveToNextQuestion = () => {
    window.setTimeout(() => {
      if (currentQIndex < questions.length - 1) {
        setCurrentQIndex((previous) => previous + 1);
        setSelectedOption(null);
        setTypedAnswer('');
        setIsCorrect(null);
        setShowAnswerPanel(false);
      } else {
        setCompleted(true);
      }
    }, 1500);
  };

  const finalizeAnswer = async (correct: boolean) => {
    setIsCorrect(correct);
    if (correct) {
      setScore((previous) => previous + 1);
    }
    await saveResult(correct);
    moveToNextQuestion();
  };

  const handleOptionClick = async (option: string) => {
    if (selectedOption || !currentQ) return;
    setSelectedOption(option);
    await finalizeAnswer(option === currentQ.answer);
  };

  const handleSpellingSubmit = async () => {
    if (!currentQ || currentQ.mode !== 'SPELLING_HINT' || isCorrect !== null) return;
    if (!typedAnswer.trim()) return;

    const correct = isCorrectSpellingHintAnswer(typedAnswer, currentQ.answer, currentQ.hintPrefix || '');
    await finalizeAnswer(correct);
  };

  if (loading) {
    return (
      <div className="flex h-80 flex-col items-center justify-center text-medace-600">
        <Loader2 className="mb-4 h-12 w-12 animate-spin" />
        <p className="text-center text-lg font-bold animate-pulse">{loadingMessage}</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">学習する単語がまだありません。</p>
        <button onClick={onBack} className="mt-4 text-medace-600 underline">戻る</button>
      </div>
    );
  }

  if (completed) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="mx-auto max-w-md rounded-2xl bg-white p-8 text-center shadow-lg animate-in zoom-in duration-300">
        <div className="mb-6">
          {percentage >= 80 ? (
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 animate-bounce">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
          ) : (
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-100">
              <RefreshCw className="h-10 w-10 text-medace-500" />
            </div>
          )}
        </div>
        <h2 className="mb-2 text-2xl font-bold text-slate-800">テスト完了！</h2>
        <p className="mb-2 text-slate-500">結果が保存されました</p>
        <p className="mb-6 text-sm text-slate-400">{modeCopy.label} モードで {questions.length} 問に挑戦しました。</p>

        <div className="mb-8 flex items-end justify-center gap-2">
          <span className="text-5xl font-bold text-medace-600">{percentage}</span>
          <span className="mb-2 text-xl text-medace-400">%</span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 rounded-xl bg-slate-100 py-3 font-medium text-slate-700 transition-colors hover:bg-slate-200"
          >
            戻る
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 rounded-xl bg-medace-600 py-3 font-medium text-white shadow-lg transition-colors hover:bg-medace-700"
          >
            再挑戦
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {businessQuizEnabled && (
        <section className="mb-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Business Quiz Modes</p>
              <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">確認方向を切り替えて定着を深くする</h2>
              <p className="mt-2 text-sm text-slate-500">
                ビジネスプランでは、意味確認だけでなく逆方向の想起と綴り確認まで同じ単語帳で回せます。
              </p>
            </div>
            <div className="rounded-full border border-medace-200 bg-medace-50 px-3 py-1 text-xs font-bold text-medace-800">
              ビジネスプラン限定
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {(Object.keys(WORKSHEET_MODE_COPY) as WorksheetQuestionMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setQuizMode(mode)}
                className={`rounded-3xl border px-4 py-4 text-left transition-all ${
                  quizMode === mode
                    ? 'border-medace-500 bg-medace-50 shadow-sm'
                    : 'border-slate-200 bg-slate-50 hover:border-medace-200 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  {modeIcon(mode)}
                  {WORKSHEET_MODE_COPY[mode].label}
                </div>
                <div className="mt-2 text-sm leading-relaxed text-slate-500">
                  {WORKSHEET_MODE_COPY[mode].description}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="mb-8">
        <div className="mb-2 flex justify-between text-sm font-medium text-slate-500">
          <div className="flex items-center gap-2">
            <span>第 {currentQIndex + 1} 問</span>
            {quizMode === 'EN_TO_JA' && (
              <span className="flex items-center gap-1 rounded-full border border-purple-100 bg-purple-50 px-2 py-0.5 text-xs text-purple-600">
                <BrainCircuit className="h-3 w-3" /> AI補助あり
              </span>
            )}
          </div>
          <span className="font-bold text-medace-600">スコア: {score}</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-medace-500 transition-all duration-500 ease-out"
            style={{ width: `${(currentQIndex / questions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="relative mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-md">
        <span className="mb-3 block text-xs font-bold uppercase tracking-widest text-slate-400">{currentQ.promptLabel}</span>
        <h2 className="mb-4 text-4xl font-bold text-slate-800">{currentQ.promptText}</h2>

        {currentQ.mode === 'SPELLING_HINT' && (
          <div className="mx-auto mt-4 max-w-xl rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
            <div className="flex items-center justify-center gap-2 text-sm font-bold text-amber-800">
              <PencilLine className="h-4 w-4" />
              先頭2文字ヒント
            </div>
            <div className="mt-3 text-2xl font-black tracking-[0.28em] text-slate-900">
              {currentQ.maskedAnswer}
            </div>
          </div>
        )}

        {!showAnswerPanel && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent p-4">
            <p className="mb-3 text-sm text-slate-500">
              {currentQ.mode === 'SPELLING_HINT'
                ? '頭の中で綴りを組み立ててから入力へ進んでください'
                : currentQ.mode === 'JA_TO_EN'
                  ? 'まずは意味から英語を思い出してから選択肢を見ましょう'
                  : '頭の中で意味を思い浮かべてください'}
            </p>
          </div>
        )}
      </div>

      {!showAnswerPanel ? (
        <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-col gap-4">
          <button
            onClick={() => setShowAnswerPanel(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 py-4 font-bold text-white shadow-lg transition-all hover:bg-slate-700"
          >
            <Eye className="h-5 w-5" />
            {currentQ.mode === 'SPELLING_HINT' ? '綴りを入力する' : '回答を表示する'}
          </button>
          <div className="flex items-center justify-center gap-1 text-center text-sm text-slate-400">
            <HelpCircle className="h-4 w-4" />
            <span>{modeCopy.description}</span>
          </div>
        </div>
      ) : currentQ.mode === 'SPELLING_HINT' ? (
        <div className="animate-in fade-in zoom-in duration-200 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-3 text-sm font-bold text-slate-500">先頭2文字は見えています。残りを入力してください。</div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex items-center justify-center rounded-2xl border border-medace-200 bg-medace-50 px-5 py-4 text-2xl font-black tracking-[0.2em] text-medace-800">
              {currentQ.hintPrefix}
            </div>
            <input
              type="text"
              value={typedAnswer}
              onChange={(event) => setTypedAnswer(event.target.value)}
              disabled={isCorrect !== null}
              placeholder="残りのつづり、または単語全体を入力"
              className="min-w-0 flex-1 rounded-2xl border border-slate-300 px-4 py-4 text-lg font-bold text-slate-800 outline-none focus:border-medace-500 focus:ring-2 focus:ring-medace-100 disabled:bg-slate-50"
            />
            <button
              type="button"
              onClick={handleSpellingSubmit}
              disabled={isCorrect !== null || !typedAnswer.trim()}
              className="rounded-2xl bg-medace-700 px-5 py-4 text-sm font-bold text-white hover:bg-medace-800 disabled:opacity-50"
            >
              回答する
            </button>
          </div>

          {isCorrect !== null && (
            <div className={`mt-4 rounded-2xl border px-4 py-4 text-sm ${
              isCorrect ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'
            }`}>
              <div className="flex items-center gap-2 font-bold">
                {isCorrect ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {isCorrect ? '正解です' : '正解は別でした'}
              </div>
              <div className="mt-2">
                正解: <span className="font-black">{currentQ.answer}</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="animate-in fade-in zoom-in duration-200 grid grid-cols-1 gap-3">
          {currentQ.options?.map((option, index) => {
            let buttonClass = 'bg-white border-2 border-slate-100 text-slate-700 shadow-sm hover:border-medace-300 hover:bg-orange-50';
            let icon = null;

            if (selectedOption) {
              if (option === currentQ.answer) {
                buttonClass = 'bg-green-50 border-green-500 text-green-700 ring-2 ring-green-200';
                icon = <CheckCircle className="h-5 w-5 text-green-600" />;
              } else if (option === selectedOption) {
                buttonClass = 'bg-red-50 border-red-500 text-red-700';
                icon = <XCircle className="h-5 w-5 text-red-600" />;
              } else {
                buttonClass = 'bg-slate-50 border-slate-100 text-slate-400 opacity-50';
              }
            }

            return (
              <button
                key={`${option}:${index}`}
                onClick={() => handleOptionClick(option)}
                disabled={!!selectedOption}
                className={`relative flex w-full items-center justify-between rounded-xl p-5 text-left text-lg font-semibold transition-all duration-200 ${buttonClass}`}
              >
                <span>{option}</span>
                {icon}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default QuizMode;
