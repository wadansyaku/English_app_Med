import React, { useState, useEffect } from 'react';
import { WordData, UserProfile } from '../types';
import { storage } from '../services/storage';
import { generateGeminiSentence } from '../services/gemini';
import { ArrowLeft, ArrowRight, RotateCw, Sparkles, Volume2, Check } from 'lucide-react';

interface StudyModeProps {
  user: UserProfile;
  bookId: string;
  onBack: () => void;
}

const StudyMode: React.FC<StudyModeProps> = ({ user, bookId, onBack }) => {
  const [words, setWords] = useState<WordData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiSentence, setAiSentence] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [isLearned, setIsLearned] = useState(false);

  useEffect(() => {
    const loadWords = async () => {
      try {
        const data = await storage.getWordsByBook(bookId);
        setWords(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadWords();
  }, [bookId]);

  const currentWord = words[currentIndex];

  const handleNext = () => {
    if (currentIndex < words.length - 1) {
      resetCard();
      setTimeout(() => setCurrentIndex(prev => prev + 1), 300);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      resetCard();
      setTimeout(() => setCurrentIndex(prev => prev - 1), 300);
    }
  };

  const resetCard = () => {
    setIsFlipped(false);
    setAiSentence(null);
    setIsLearned(false);
  }

  const generateSentence = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (aiSentence || aiLoading) return;
    
    setAiLoading(true);
    const sentence = await generateGeminiSentence(currentWord.word, currentWord.definition);
    setAiSentence(sentence);
    setAiLoading(false);
  };

  const speakWord = (e: React.MouseEvent) => {
    e.stopPropagation();
    const utterance = new SpeechSynthesisUtterance(currentWord.word);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  const markAsLearned = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLearned(true);
    await storage.saveHistory(user.uid, {
        wordId: currentWord.id,
        bookId: bookId,
        status: 'learned',
        lastStudiedAt: Date.now(),
        correctCount: 1,
        attemptCount: 1
    });
  };

  if (loading) return <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-10 w-10 border-medace-500 border-t-2"></div></div>;

  if (words.length === 0) return (
    <div className="text-center p-10">
      <p>この単語帳にはまだ単語が登録されていません。</p>
      <button onClick={onBack} className="text-medace-600 mt-4 underline">ダッシュボードに戻る</button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium">
          <ArrowLeft className="w-4 h-4" /> ダッシュボードへ戻る
        </button>
        <span className="text-slate-400 text-sm font-mono bg-slate-100 px-3 py-1 rounded-full">
          {currentIndex + 1} / {words.length}
        </span>
      </div>

      {/* Card Container */}
      <div 
        className="relative w-full h-96 cursor-pointer group perspective-1000"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className={`card-inner w-full h-full transition-transform duration-500 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`} 
             style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)', transformStyle: 'preserve-3d' }}>
          
          {/* Front */}
          <div className="card-front absolute w-full h-full bg-white rounded-3xl shadow-xl border border-slate-200 flex flex-col items-center justify-center backface-hidden p-8 hover:shadow-2xl transition-shadow">
            <div className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-6">単語</div>
            <h2 className="text-5xl font-bold text-slate-800 mb-6 tracking-tight">{currentWord.word}</h2>
            
            <div className="flex gap-3">
                <button 
                onClick={speakWord}
                className="p-3 rounded-full bg-orange-50 text-medace-500 hover:bg-medace-100 transition-colors"
                title="発音を聞く"
                >
                <Volume2 className="w-6 h-6" />
                </button>
            </div>
            
            <p className="absolute bottom-6 text-slate-300 text-xs font-medium">タップして意味を確認</p>
          </div>

          {/* Back */}
          <div className="card-back absolute w-full h-full bg-slate-900 rounded-3xl shadow-xl flex flex-col items-center justify-center backface-hidden p-8"
               style={{ transform: 'rotateY(180deg)' }}>
            <div className="flex justify-between w-full absolute top-6 px-6">
                 <div className="text-medace-400 text-sm font-bold uppercase tracking-widest">意味</div>
                 <button 
                    onClick={markAsLearned}
                    className={`flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full transition-all ${isLearned ? 'bg-green-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                 >
                    {isLearned ? <Check className="w-3 h-3" /> : null}
                    {isLearned ? '学習済み' : '覚えた！'}
                 </button>
            </div>

            <p className="text-3xl text-white font-bold mb-8 text-center">{currentWord.definition}</p>

            {/* AI Section */}
            <div 
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-5 min-h-[120px] flex flex-col items-center justify-center relative hover:bg-slate-800 transition-colors" 
                onClick={(e) => e.stopPropagation()}
            >
              {aiLoading ? (
                <div className="flex items-center gap-2 text-medace-400 animate-pulse">
                  <Sparkles className="w-5 h-5" /> <span className="text-sm">AIが例文を作成中...</span>
                </div>
              ) : aiSentence ? (
                <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2 text-medace-400 text-xs uppercase font-bold tracking-wider">
                        <Sparkles className="w-3 h-3" /> AI例文
                    </div>
                  <p className="text-slate-200 italic text-lg leading-relaxed">"{aiSentence}"</p>
                </div>
              ) : (
                <button 
                  onClick={generateSentence}
                  className="flex flex-col items-center gap-2 text-medace-400 hover:text-medace-300 transition-colors group"
                >
                  <Sparkles className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium">AIで例文を生成</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center mt-8 px-8">
        <button 
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className={`p-4 rounded-full border ${currentIndex === 0 ? 'border-slate-200 text-slate-300' : 'border-slate-300 text-slate-600 hover:border-medace-500 hover:text-medace-600 bg-white hover:shadow-md'} transition-all`}
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <button 
          onClick={() => setIsFlipped(!isFlipped)}
          className="flex flex-col items-center text-slate-400 hover:text-medace-500 transition-colors"
        >
          <RotateCw className="w-6 h-6 mb-1" />
          <span className="text-xs font-medium">カードをめくる</span>
        </button>

        <button 
          onClick={handleNext}
          disabled={currentIndex === words.length - 1}
          className={`p-4 rounded-full border ${currentIndex === words.length - 1 ? 'border-slate-200 text-slate-300' : 'border-slate-300 text-slate-600 hover:border-medace-500 hover:text-medace-600 bg-white hover:shadow-md'} transition-all`}
        >
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default StudyMode;