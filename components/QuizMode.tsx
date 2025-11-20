import React, { useState, useEffect } from 'react';
import { WordData, UserProfile } from '../types';
import { storage } from '../services/storage';
import { CheckCircle, XCircle, AlertCircle, ChevronRight } from 'lucide-react';

interface QuizModeProps {
  user: UserProfile;
  bookId: string;
  onBack: () => void;
}

const QuizMode: React.FC<QuizModeProps> = ({ user, bookId, onBack }) => {
  const [words, setWords] = useState<WordData[]>([]);
  const [questions, setQuestions] = useState<{word: WordData, options: string[], answer: string}[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initQuiz = async () => {
      try {
        const data = await storage.getWordsByBook(bookId);
        // Filter out words if needed, or just shuffle all
        if (data.length === 0) {
          setLoading(false);
          return;
        }
        
        // Shuffle and pick up to 10
        const shuffled = [...data].sort(() => 0.5 - Math.random()).slice(0, 10);
        
        const qs = shuffled.map(target => {
          // Create options: target + 3 distractors
          const distractors = data
            .filter(w => w.id !== target.id)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3)
            .map(w => w.definition);
          
          const options = [...distractors, target.definition].sort(() => 0.5 - Math.random());
          return {
            word: target,
            options,
            answer: target.definition
          };
        });
        
        setWords(data);
        setQuestions(qs);
      } catch (e) {
        console.error("Error initializing quiz:", e);
      } finally {
        setLoading(false);
      }
    };
    initQuiz();
  }, [bookId]);

  const handleOptionClick = async (option: string) => {
    if (selectedOption) return; // Prevent double click
    
    setSelectedOption(option);
    const currentQ = questions[currentQIndex];
    const correct = option === currentQ.answer;
    setIsCorrect(correct);

    if (correct) setScore(s => s + 1);

    // --- CORE REQUIREMENT: Save Learning History ---
    // We perform this as a side effect. In a real app, we might want to wait,
    // but for UI responsiveness we fire-and-forget with error logging.
    storage.saveHistory(user.uid, {
      wordId: currentQ.word.id,
      bookId: bookId,
      status: correct ? 'learned' : 'review',
      lastStudiedAt: Date.now(),
      correctCount: correct ? 1 : 0, // This will be added to existing count in storage
      attemptCount: 1
    }).catch(err => console.error("Failed to save progress:", err));

    setTimeout(() => {
      if (currentQIndex < questions.length - 1) {
        setCurrentQIndex(prev => prev + 1);
        setSelectedOption(null);
        setIsCorrect(null);
      } else {
        setCompleted(true);
      }
    }, 1500);
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-medace-500"></div>
    </div>
  );
  
  if (questions.length === 0) return (
    <div className="text-center p-8">
      <p className="text-slate-500">このコースにはまだ単語がありません。</p>
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
        <p className="text-slate-500 mb-6">学習記録を保存しました。</p>
        
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
            onClick={() => window.location.reload()} // Cheap reset
            className="flex-1 bg-medace-600 text-white py-3 rounded-xl font-medium hover:bg-medace-700 transition-colors shadow-lg shadow-medace-200"
          >
            もう一度挑戦
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
          <span>第 {currentQIndex + 1} 問 <span className="text-slate-300">/</span> 全 {questions.length} 問</span>
          <span className="text-medace-600 font-bold">スコア: {score}</span>
        </div>
        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
          <div 
            className="bg-medace-500 h-full transition-all duration-500 ease-out"
            style={{ width: `${((currentQIndex) / questions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-10 mb-6 text-center">
        <span className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3 block">正しい意味を選択してください</span>
        <h2 className="text-4xl font-bold text-slate-800">{currentQ.word.word}</h2>
      </div>

      <div className="grid grid-cols-1 gap-3">
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
    </div>
  );
};

export default QuizMode;