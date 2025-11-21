
import React, { useState, useEffect } from 'react';
import { WordData, UserProfile } from '../types';
import { storage } from '../services/storage';
import { generateAIQuiz, AIQuizQuestion } from '../services/gemini';
import { CheckCircle, XCircle, AlertCircle, BrainCircuit, Loader2, Eye, HelpCircle } from 'lucide-react';

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
  const [showOptions, setShowOptions] = useState(false); // Scaffolding state
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("クイズを準備中...");

  useEffect(() => {
    const initQuiz = async () => {
      try {
        setLoading(true);
        const allWords = await storage.getWordsByBook(bookId);
        
        if (allWords.length === 0) {
          setLoading(false);
          return;
        }
        
        const targetWords = [...allWords].sort(() => 0.5 - Math.random()).slice(0, 5);
        
        setLoadingMessage("AIが難問を作成中...");
        
        let aiQuestions: AIQuizQuestion[] = [];
        try {
          aiQuestions = await generateAIQuiz(targetWords);
        } catch (e) {
          console.warn("AI Generation failed, using local fallback", e);
        }

        const finalQuestions: Question[] = targetWords.map(target => {
          const aiData = aiQuestions.find(q => q.wordId === target.id);
          
          if (aiData && aiData.options.length === 4 && aiData.options.includes(aiData.correctOption)) {
            return {
              word: target,
              options: aiData.options,
              answer: aiData.correctOption,
              isAiGenerated: true
            };
          }

          const distractors = allWords
            .filter(w => w.id !== target.id)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3)
            .map(w => w.definition);
          
          while (distractors.length < 3) {
             distractors.push("その他の意味");
          }
          
          const options = [...distractors, target.definition].sort(() => 0.5 - Math.random());
          
          return {
            word: target,
            options,
            answer: target.definition,
            isAiGenerated: false
          };
        });
        
        setQuestions(finalQuestions);
      } catch (e) {
        console.error("Quiz Init Error", e);
      } finally {
        setLoading(false);
      }
    };
    initQuiz();
  }, [bookId]);

  const handleShowOptions = () => {
    setShowOptions(true);
  };

  const handleOptionClick = async (option: string) => {
    if (selectedOption) return;
    
    setSelectedOption(option);
    const currentQ = questions[currentQIndex];
    const correct = option === currentQ.answer;
    setIsCorrect(correct);

    if (correct) setScore(s => s + 1);

    // Save using simplified logic for Quiz (or full SRS if we wanted)
    // For Quiz, we stick to simple save but it updates LastStudied
    storage.saveHistory(user.uid, {
      wordId: currentQ.word.id,
      bookId: bookId,
      status: correct ? 'learning' : 'review', // Keep simplistic for quiz, SRS is handled in StudyMode mostly
      lastStudiedAt: Date.now(),
      correctCount: correct ? 1 : 0, 
      attemptCount: 1
    });

    setTimeout(() => {
      if (currentQIndex < questions.length - 1) {
        setCurrentQIndex(prev => prev + 1);
        setSelectedOption(null);
        setIsCorrect(null);
        setShowOptions(false); // Reset Scaffolding
      } else {
        setCompleted(true);
      }
    }, 1500);
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center h-80 text-medace-600">
      <Loader2 className="animate-spin h-12 w-12 mb-4" />
      <p className="font-bold text-lg animate-pulse">{loadingMessage}</p>
    </div>
  );
  
  if (questions.length === 0) return (
    <div className="text-center p-8">
      <p className="text-slate-500">学習する単語がまだありません。</p>
      <button onClick={onBack} className="mt-4 text-medace-600 underline">戻る</button>
    </div>
  );

  if (completed) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-8 text-center animate-in zoom-in duration-300">
        <div className="mb-6">
          {percentage >= 80 ? (
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
          ) : (
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10 text-medace-500" />
            </div>
          )}
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">テスト完了！</h2>
        <p className="text-slate-500 mb-6">結果が保存されました</p>
        
        <div className="flex justify-center items-end gap-2 mb-8">
          <span className="text-5xl font-bold text-medace-600">{percentage}</span>
          <span className="text-xl text-medace-400 mb-2">%</span>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={onBack}
            className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-medium hover:bg-slate-200 transition-colors"
          >
            戻る
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="flex-1 bg-medace-600 text-white py-3 rounded-xl font-medium hover:bg-medace-700 transition-colors shadow-lg"
          >
            再挑戦
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQIndex];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex justify-between text-sm font-medium text-slate-500 mb-2">
          <div className="flex items-center gap-2">
            <span>第 {currentQIndex + 1} 問</span>
            {currentQ.isAiGenerated && (
              <span className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                <BrainCircuit className="w-3 h-3" /> AI生成
              </span>
            )}
          </div>
          <span className="text-medace-600 font-bold">スコア: {score}</span>
        </div>
        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
          <div 
            className="bg-medace-500 h-full transition-all duration-500 ease-out"
            style={{ width: `${((currentQIndex) / questions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-10 mb-6 text-center relative overflow-hidden">
        <span className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3 block">単語</span>
        <h2 className="text-4xl font-bold text-slate-800 mb-4">{currentQ.word.word}</h2>
        
        {/* Scaffolding Hint */}
        {!showOptions && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent">
                <p className="text-slate-500 text-sm mb-3">頭の中で意味を思い浮かべてください</p>
            </div>
        )}
      </div>

      {!showOptions ? (
        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
            <button 
                onClick={handleShowOptions}
                className="w-full py-4 bg-slate-800 text-white rounded-xl font-bold shadow-lg hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
            >
                <Eye className="w-5 h-5" /> 選択肢を表示する
            </button>
            <div className="text-center text-slate-400 text-sm flex items-center justify-center gap-1">
                <HelpCircle className="w-4 h-4" />
                <span>まずは自力で思い出すことで記憶が定着します</span>
            </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 animate-in fade-in zoom-in duration-200">
            {currentQ.options.map((opt, idx) => {
            let btnClass = "bg-white border-2 border-slate-100 hover:border-medace-300 hover:bg-orange-50 text-slate-700 shadow-sm";
            let icon = null;
            
            if (selectedOption) {
                if (opt === currentQ.answer) {
                btnClass = "bg-green-50 border-green-500 text-green-700 ring-2 ring-green-200"; 
                icon = <CheckCircle className="w-5 h-5 text-green-600" />;
                } else if (opt === selectedOption && opt !== currentQ.answer) {
                btnClass = "bg-red-50 border-red-500 text-red-700"; 
                icon = <XCircle className="w-5 h-5 text-red-600" />;
                } else {
                btnClass = "bg-slate-50 border-slate-100 text-slate-400 opacity-50";
                }
            }

            return (
                <button
                key={idx}
                onClick={() => handleOptionClick(opt)}
                disabled={!!selectedOption}
                className={`relative w-full p-5 rounded-xl text-left font-semibold text-lg transition-all duration-200 flex items-center justify-between ${btnClass}`}
                >
                <span>{opt}</span>
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
