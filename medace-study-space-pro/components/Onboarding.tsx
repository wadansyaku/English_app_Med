
import React, { useState, useEffect } from 'react';
import { UserProfile, UserGrade, EnglishLevel, GRADE_LABELS } from '../types';
import { generateDiagnosticTest, generateAdvancedDiagnosticTest, evaluateAdvancedTest, DiagnosticQuestion } from '../services/gemini';
import { storage } from '../services/storage';
import { GraduationCap, ChevronRight, Loader2, CheckCircle2, BrainCircuit, PenTool, Check, Sparkles } from 'lucide-react';

interface OnboardingProps {
  user: UserProfile;
  onComplete: (updatedUser: UserProfile) => void;
  isRetake?: boolean; // New prop for Retake mode
  historySummary?: string; // Context for AI
}

const GRADES = [
  { id: UserGrade.JHS1, label: GRADE_LABELS[UserGrade.JHS1], desc: "英語を始めたばかり" },
  { id: UserGrade.JHS2, label: GRADE_LABELS[UserGrade.JHS2], desc: "基礎を固めたい" },
  { id: UserGrade.JHS3, label: GRADE_LABELS[UserGrade.JHS3], desc: "受験対策・長文挑戦" },
  { id: UserGrade.SHS1, label: GRADE_LABELS[UserGrade.SHS1], desc: "文法・語彙を強化" },
  { id: UserGrade.SHS2, label: GRADE_LABELS[UserGrade.SHS2], desc: "応用力をつけたい" },
  { id: UserGrade.SHS3, label: GRADE_LABELS[UserGrade.SHS3], desc: "大学受験レベル" },
  { id: UserGrade.UNIVERSITY, label: GRADE_LABELS[UserGrade.UNIVERSITY], desc: "アカデミック/TOEIC" },
  { id: UserGrade.ADULT, label: GRADE_LABELS[UserGrade.ADULT], desc: "ビジネス/教養" },
];

const Onboarding: React.FC<OnboardingProps> = ({ user, onComplete, isRetake = false, historySummary = "" }) => {
  // If retake, skip GRADE selection
  const [step, setStep] = useState<'GRADE' | 'QUIZ_PREP' | 'QUIZ' | 'EVALUATING' | 'RESULT'>(isRetake ? 'QUIZ_PREP' : 'GRADE');
  const [selectedGrade, setSelectedGrade] = useState<UserGrade | null>(isRetake ? (user.grade || UserGrade.ADULT) : null);
  
  // Quiz State
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [textInput, setTextInput] = useState("");
  
  const [loading, setLoading] = useState(false);
  // Use an index for dynamic loading messages
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [finalLevel, setFinalLevel] = useState<EnglishLevel | null>(null);

  // Dynamic Loading Messages
  const LOADING_STEPS_PREP = [
      "ユーザーの学習データを分析しています...",
      "AIが最適な出題範囲を選定中...",
      "問題生成中 (Gemini 2.5 Flash)...",
      "選択肢の整合性をチェックしています...",
      "準備完了！"
  ];
  const LOADING_STEPS_EVAL = [
      "AIが答案を採点しています...",
      "文法と語彙力を詳細に分析中...",
      "CEFRレベルとの照合を行っています...",
      "あなた専用のカリキュラムを構築中..."
  ];

  useEffect(() => {
      let interval: any;
      if (loading) {
          const steps = step === 'EVALUATING' ? LOADING_STEPS_EVAL : LOADING_STEPS_PREP;
          // Faster rotation for better UX feeling (1.5s)
          interval = setInterval(() => {
              setLoadingMsgIndex(prev => (prev + 1) % steps.length);
          }, 1500);
      } else {
          setLoadingMsgIndex(0);
      }
      return () => clearInterval(interval);
  }, [loading, step]);

  const handleGradeSelect = async (grade: UserGrade) => {
    setSelectedGrade(grade);
    setStep('QUIZ_PREP');
  };

  // Start Quiz Logic
  const startQuiz = async () => {
    if (!selectedGrade) return;
    setLoading(true);
    
    try {
      let q: DiagnosticQuestion[] = [];
      
      if (isRetake) {
        // Advanced Test (10 questions, mixed types)
        q = await generateAdvancedDiagnosticTest(selectedGrade, historySummary);
      } else {
        // Simple Test (5 questions, MCQ)
        q = await generateDiagnosticTest(selectedGrade);
      }

      if (q && q.length > 0) {
        setQuestions(q);
        setStep('QUIZ');
      } else {
        throw new Error("Quiz generation failed");
      }
    } catch (e) {
      console.error(e);
      alert("AIの応答が遅れています。簡易モードで開始します。");
      finishOnboarding(EnglishLevel.A2); // Fallback
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (answer: string) => {
    const currentQ = questions[currentQIndex];
    
    // Store answer
    setUserAnswers(prev => ({
        ...prev,
        [currentQ.id]: answer
    }));

    // Clear text input if any
    setTextInput("");

    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(p => p + 1);
    } else {
      submitQuiz();
    }
  };

  const submitQuiz = async () => {
    setStep('EVALUATING');
    setLoading(true);
    
    try {
        let level: EnglishLevel;
        // Small delay to allow UI to render the Loading State first
        await new Promise(r => setTimeout(r, 500));

        if (isRetake) {
            // Advanced AI Grading
            level = await evaluateAdvancedTest(selectedGrade!, questions, userAnswers);
        } else {
            // Simple Score-based Grading for MCQ
            let score = 0;
            questions.forEach(q => {
                if (userAnswers[q.id] === q.answer) score++;
            });
            level = determineSimpleLevel(score, selectedGrade!);
        }

        setFinalLevel(level);
        
        // Save Result to DB immediately
        const updatedUser: UserProfile = {
            ...user,
            grade: selectedGrade || UserGrade.ADULT,
            englishLevel: level,
            needsOnboarding: false
        };
        await storage.updateSessionUser(updatedUser);
        
        // Artificial delay to ensure user sees the "Evaluation complete" message
        await new Promise(r => setTimeout(r, 1000));
        
        setLoading(false);
        setStep('RESULT');

    } catch (e) {
        console.error("Evaluation error", e);
        finishOnboarding(EnglishLevel.B1); // Fail safe
    }
  };

  const determineSimpleLevel = (score: number, grade: UserGrade): EnglishLevel => {
    let baseLevel = EnglishLevel.A1;
    if ([UserGrade.JHS3, UserGrade.SHS1].includes(grade)) baseLevel = EnglishLevel.A2;
    if ([UserGrade.SHS2, UserGrade.SHS3, UserGrade.UNIVERSITY, UserGrade.ADULT].includes(grade)) baseLevel = EnglishLevel.B1;

    const levels = Object.values(EnglishLevel);
    let levelIndex = levels.indexOf(baseLevel);
    
    if (score >= 4) levelIndex = Math.min(levelIndex + 1, levels.length - 1);
    if (score <= 1) levelIndex = Math.max(levelIndex - 1, 0);

    return levels[levelIndex];
  };

  const finishOnboarding = async (level: EnglishLevel) => {
    const updatedUser: UserProfile = {
        ...user,
        grade: selectedGrade || UserGrade.ADULT,
        englishLevel: level,
        needsOnboarding: false
    };
    
    // Ensure storage is updated before notifying App
    await storage.updateSessionUser(updatedUser);
    onComplete(updatedUser);
  };

  if (loading) {
    const steps = step === 'EVALUATING' ? LOADING_STEPS_EVAL : LOADING_STEPS_PREP;
    
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl text-center">
            <div className="relative w-20 h-20 mx-auto mb-6">
                 <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                 <div className="absolute inset-0 border-4 border-medace-500 rounded-full border-t-transparent animate-spin"></div>
                 <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-medace-500 animate-pulse" />
            </div>
            
            <h3 className="text-xl font-bold text-slate-800 mb-6">AIが処理しています...</h3>
            
            <div className="space-y-3 text-left">
                {steps.map((msg, idx) => (
                    <div key={idx} className={`flex items-center gap-3 transition-opacity duration-500 ${idx <= loadingMsgIndex ? 'opacity-100' : 'opacity-30'}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${idx < loadingMsgIndex ? 'bg-medace-500 border-medace-500 text-white' : idx === loadingMsgIndex ? 'border-medace-500 text-medace-500' : 'border-slate-300'}`}>
                            {idx < loadingMsgIndex ? <Check className="w-3 h-3" /> : idx === loadingMsgIndex ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        </div>
                        <span className={`text-sm font-medium ${idx === loadingMsgIndex ? 'text-medace-600 font-bold' : 'text-slate-500'}`}>{msg}</span>
                    </div>
                ))}
            </div>
        </div>
      </div>
    );
  }

  if (step === 'RESULT' && finalLevel) {
      return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
              <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center animate-in zoom-in">
                  <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="w-12 h-12 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">診断完了！</h2>
                  <p className="text-slate-500 mb-6">あなたの現在の推奨レベルは...</p>
                  
                  <div className="text-6xl font-black text-medace-600 mb-8 tracking-tight">
                      {finalLevel}
                  </div>
                  
                  <button 
                    onClick={() => finishOnboarding(finalLevel)}
                    className="w-full py-4 bg-medace-600 text-white rounded-xl font-bold shadow-lg hover:bg-medace-700 transition-all"
                  >
                      学習を開始する
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 p-6 text-center flex-shrink-0">
          <h1 className="text-xl font-bold text-white mb-2">
              {isRetake ? "スキルチェック (再診断)" : "MedAce Pro セットアップ"}
          </h1>
          <div className="flex justify-center gap-2">
             {/* Progress Dots Logic */}
             {[1, 2, 3].map(i => (
                <div key={i} className={`h-1 w-12 rounded-full transition-colors ${
                    (step === 'GRADE' && i === 1) || (step === 'QUIZ_PREP' && i === 1) || (step === 'QUIZ' && i === 2) || (step === 'EVALUATING' && i === 3)
                    ? 'bg-medace-500' 
                    : 'bg-slate-700'
                }`} />
             ))}
          </div>
        </div>

        <div className="p-8 overflow-y-auto flex-grow">
          {step === 'GRADE' && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">現在の学年・立場を選択してください</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {GRADES.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => handleGradeSelect(g.id as UserGrade)}
                    className="p-4 border border-slate-200 rounded-xl hover:border-medace-500 hover:bg-medace-50 transition-all text-left group"
                  >
                    <div className="font-bold text-slate-800 group-hover:text-medace-700">{g.label}</div>
                    <div className="text-xs text-slate-400 group-hover:text-medace-500">{g.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'QUIZ_PREP' && (
            <div className="text-center animate-in zoom-in duration-300 py-4">
              <div className="w-20 h-20 bg-medace-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <BrainCircuit className="w-10 h-10 text-medace-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">
                  {isRetake ? "実力診断テスト (アドバンス)" : "レベル診断テスト"}
              </h2>
              <p className="text-slate-500 mb-8 max-w-md mx-auto text-sm leading-relaxed">
                {isRetake 
                    ? "AI (Gemini 3.0 Pro) があなたの学習履歴と回答内容を深く分析し、より正確なCEFRレベルを判定します。記述問題も含まれます。(所要時間: 約10分)"
                    : "AIがあなたの実力を測定するための短いクイズを作成します。直感で答えてください。(所要時間: 約1分)"}
              </p>
              <button 
                onClick={startQuiz}
                className="px-8 py-4 bg-medace-600 text-white rounded-full font-bold text-lg shadow-lg hover:scale-105 transition-transform flex items-center gap-2 mx-auto"
              >
                診断を開始する <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {step === 'QUIZ' && questions.length > 0 && (
            <div className="animate-in slide-in-from-right duration-300">
              <div className="flex justify-between text-xs font-bold text-slate-400 uppercase mb-2">
                <span>第 {currentQIndex + 1} 問 / 全 {questions.length} 問</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500">{questions[currentQIndex].type}</span>
              </div>
              
              <div className="bg-slate-100 p-6 rounded-2xl mb-6 border-l-4 border-medace-500">
                <h3 className="text-lg md:text-xl font-bold text-slate-800 whitespace-pre-wrap leading-relaxed">{questions[currentQIndex].question}</h3>
              </div>

              {/* Render Input based on Type */}
              {questions[currentQIndex].type === 'MCQ' && questions[currentQIndex].options ? (
                  <div className="grid grid-cols-1 gap-3">
                    {questions[currentQIndex].options!.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAnswer(opt)}
                        className="p-4 bg-white border-2 border-slate-100 rounded-xl font-bold text-slate-700 hover:border-medace-400 hover:bg-medace-50 transition-all text-left flex items-center gap-3 group"
                      >
                        <div className="w-6 h-6 rounded-full border-2 border-slate-200 group-hover:border-medace-500 flex-shrink-0"></div>
                        {opt}
                      </button>
                    ))}
                  </div>
              ) : (
                  <div className="space-y-4">
                      <div className="relative">
                        <textarea 
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder={questions[currentQIndex].type === 'WRITING' ? "ここに英語で回答を入力してください..." : "空欄に入る言葉を入力..."}
                            className="w-full h-32 p-4 border-2 border-slate-200 rounded-xl focus:border-medace-500 focus:ring-0 outline-none text-lg"
                        />
                        <PenTool className="absolute right-4 bottom-4 text-slate-300 w-5 h-5" />
                      </div>
                      <button 
                        onClick={() => handleAnswer(textInput)}
                        disabled={!textInput.trim()}
                        className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold disabled:opacity-50 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                      >
                        回答する <Check className="w-4 h-4" />
                      </button>
                  </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
