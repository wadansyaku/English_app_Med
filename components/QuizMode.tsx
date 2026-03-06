import React, { useEffect, useState } from 'react';
import { WordData, UserProfile } from '../types';
import { storage } from '../services/storage';
import { generateAIQuiz, AIQuizQuestion } from '../services/gemini';
import { AlertCircle, BrainCircuit, CheckCircle, Eye, HelpCircle, Loader2, RotateCcw } from 'lucide-react';

interface QuizModeProps {
  user: UserProfile;
  bookId: string;
  onBack: () => void;
}

interface Question {
  word: WordData;
  options: string[];
  answer: string;
  isAiGenerated?: boolean;
}

const QuizMode: React.FC<QuizModeProps> = ({ user, bookId, onBack }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('クイズを準備中...');
  const [missedQuestions, setMissedQuestions] = useState<Question[]>([]);
  const [attemptSeed, setAttemptSeed] = useState(0);

  useEffect(() => {
    const initQuiz = async () => {
      try {
        setLoading(true);
        setCurrentQIndex(0);
        setShowOptions(false);
        setSelectedOption(null);
        setScore(0);
        setCompleted(false);
        setMissedQuestions([]);

        const allWords = await storage.getWordsByBook(bookId);
        if (allWords.length === 0) {
          setQuestions([]);
          return;
        }

        const targetWords = [...allWords].sort(() => 0.5 - Math.random()).slice(0, 5);
        setLoadingMessage('AIが難問を作成中...');

        let aiQuestions: AIQuizQuestion[] = [];
        try {
          aiQuestions = await generateAIQuiz(targetWords);
        } catch (e) {
          console.warn('AI Generation failed, using local fallback', e);
        }

        const finalQuestions: Question[] = targetWords.map((target) => {
          const aiData = aiQuestions.find((q) => q.wordId === target.id);

          if (aiData && aiData.options.length === 4 && aiData.options.includes(aiData.correctOption)) {
            return {
              word: target,
              options: aiData.options,
              answer: aiData.correctOption,
              isAiGenerated: true,
            };
          }

          const distractors = allWords
            .filter((word) => word.id !== target.id)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3)
            .map((word) => word.definition);

          while (distractors.length < 3) {
            distractors.push('その他の意味');
          }

          return {
            word: target,
            options: [...distractors, target.definition].sort(() => 0.5 - Math.random()),
            answer: target.definition,
            isAiGenerated: false,
          };
        });

        setQuestions(finalQuestions);
      } catch (e) {
        console.error('Quiz Init Error', e);
      } finally {
        setLoading(false);
      }
    };

    initQuiz();
  }, [attemptSeed, bookId]);

  const handleShowOptions = () => {
    setShowOptions(true);
  };

  const handleOptionClick = async (option: string) => {
    if (selectedOption) return;

    setSelectedOption(option);

    const currentQuestion = questions[currentQIndex];
    const correct = option === currentQuestion.answer;

    if (correct) {
      setScore((prev) => prev + 1);
    } else {
      setMissedQuestions((prev) =>
        prev.some((question) => question.word.id === currentQuestion.word.id) ? prev : [...prev, currentQuestion],
      );
    }

    await storage.saveHistory(user.uid, {
      wordId: currentQuestion.word.id,
      bookId,
      status: correct ? 'learning' : 'review',
      lastStudiedAt: Date.now(),
      correctCount: correct ? 1 : 0,
      attemptCount: 1,
    });

    setTimeout(() => {
      if (currentQIndex < questions.length - 1) {
        setCurrentQIndex((prev) => prev + 1);
        setSelectedOption(null);
        setShowOptions(false);
      } else {
        setCompleted(true);
      }
    }, 1200);
  };

  const restartQuiz = () => {
    setAttemptSeed((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex h-80 flex-col items-center justify-center text-medace-600">
        <Loader2 className="mb-4 h-12 w-12 animate-spin" />
        <p className="animate-pulse text-lg font-bold">{loadingMessage}</p>
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
    const reviewTargets = missedQuestions.slice(0, 3);
    const nextReviewCopy = reviewTargets.length > 0
      ? '10分後に間違えた単語だけもう一度。そのあと明日の最初に1回確認すると定着しやすいです。'
      : '間違いはありません。明日に1回だけ軽く確認すれば十分です。';

    return (
      <div className="mx-auto max-w-2xl rounded-[32px] bg-white p-8 shadow-lg animate-in zoom-in duration-300">
        <div className="text-center">
          <div className="mb-5 inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            {percentage >= 80 ? (
              <CheckCircle className="h-10 w-10 text-green-500" />
            ) : (
              <AlertCircle className="h-10 w-10 text-medace-500" />
            )}
          </div>
          <h2 className="text-3xl font-black text-slate-900">テスト完了</h2>
          <p className="mt-2 text-sm text-slate-500">点数より、次に直すところだけ見れば十分です。</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-medace-50 px-4 py-2 text-sm font-bold text-medace-700">
            正解 {score} / {questions.length}
            <span className="text-medace-400">{percentage}%</span>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">次に直す3語</div>
            {reviewTargets.length > 0 ? (
              <div className="mt-4 space-y-3">
                {reviewTargets.map((question) => (
                  <div key={question.word.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-bold text-slate-900">{question.word.word}</div>
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">10分後</span>
                    </div>
                    <div className="mt-1 text-sm text-slate-500">{question.answer}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-medium text-emerald-700">
                直しが必要な単語はありません。このセットはそのまま卒業で大丈夫です。
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-medace-100 bg-[#fff8ef] p-5">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">次の一手</div>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="rounded-2xl bg-white px-4 py-4">
                <div className="font-bold text-slate-900">次の復習タイミング</div>
                <div className="mt-1 leading-relaxed">{nextReviewCopy}</div>
              </div>
              <div className="rounded-2xl bg-white px-4 py-4">
                <div className="font-bold text-slate-900">おすすめの次アクション</div>
                <div className="mt-1 leading-relaxed">
                  {reviewTargets.length > 0 ? 'いまは再挑戦より、間違えた語だけ先に見直すほうが効率的です。' : '余裕があれば別のコースのテストに進むか、学習モードで軽く復習してください。'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 rounded-2xl bg-slate-100 py-3 font-bold text-slate-700 transition-colors hover:bg-slate-200"
          >
            ダッシュボードへ戻る
          </button>
          <button
            onClick={restartQuiz}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-medace-600 py-3 font-bold text-white transition-colors hover:bg-medace-700"
          >
            <RotateCcw className="h-4 w-4" /> すぐ再挑戦
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQIndex];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <div className="mb-2 flex justify-between text-sm font-medium text-slate-500">
          <div className="flex items-center gap-2">
            <span>第 {currentQIndex + 1} 問</span>
            {currentQuestion.isAiGenerated && (
              <span className="flex items-center gap-1 rounded-full border border-purple-100 bg-purple-50 px-2 py-0.5 text-xs text-purple-600">
                <BrainCircuit className="h-3 w-3" /> AI生成
              </span>
            )}
          </div>
          <span className="font-bold text-medace-600">正解数: {score}</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-medace-500 transition-all duration-500 ease-out"
            style={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="relative mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-md">
        <span className="mb-3 block text-xs font-bold uppercase tracking-widest text-slate-400">単語</span>
        <h2 className="mb-4 text-4xl font-bold text-slate-800">{currentQuestion.word.word}</h2>

        {!showOptions && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent p-4">
            <p className="mb-3 text-sm text-slate-500">頭の中で意味を思い浮かべてください</p>
          </div>
        )}
      </div>

      {!showOptions ? (
        <div className="animate-in slide-in-from-bottom-2 flex flex-col gap-4 fade-in">
          <button
            onClick={handleShowOptions}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 py-4 font-bold text-white shadow-lg transition-all hover:bg-slate-700"
          >
            <Eye className="h-5 w-5" /> 選択肢を表示する
          </button>
          <div className="flex items-center justify-center gap-1 text-center text-sm text-slate-400">
            <HelpCircle className="h-4 w-4" />
            <span>まずは自力で思い出すことで記憶が定着します</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 animate-in zoom-in duration-200 fade-in">
          {currentQuestion.options.map((option, index) => {
            let buttonClass = 'bg-white border-2 border-slate-100 hover:border-medace-300 hover:bg-orange-50 text-slate-700 shadow-sm';
            let icon = null;

            if (selectedOption) {
              if (option === currentQuestion.answer) {
                buttonClass = 'bg-green-50 border-green-500 text-green-700 ring-2 ring-green-200';
                icon = <CheckCircle className="h-5 w-5 text-green-600" />;
              } else if (option === selectedOption) {
                buttonClass = 'bg-red-50 border-red-500 text-red-700';
                icon = <AlertCircle className="h-5 w-5 text-red-600" />;
              } else {
                buttonClass = 'bg-slate-50 border-slate-100 text-slate-400 opacity-50';
              }
            }

            return (
              <button
                key={`${currentQuestion.word.id}-${index}`}
                onClick={() => handleOptionClick(option)}
                disabled={!!selectedOption}
                className={`flex w-full items-center justify-between rounded-xl p-5 text-left text-lg font-semibold transition-all duration-200 ${buttonClass}`}
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
