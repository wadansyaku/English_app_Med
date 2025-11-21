
import React, { useState, useEffect, useRef } from 'react';
import { WordData, UserProfile, EnglishLevel } from '../types';
import { storage } from '../services/storage';
import { generateGeminiSentence, generateWordImage, GeneratedContext } from '../services/gemini';
import { ArrowLeft, RotateCw, Sparkles, Volume2, Clock, Zap, AlertCircle, Image as ImageIcon, Loader2, Award, Lock, Languages, Edit2, Save, X, Flame, Flag } from 'lucide-react';

interface StudyModeProps {
  user: UserProfile;
  bookId: string;
  onBack: () => void;
  onSessionComplete: (user: UserProfile) => void;
}

const StudyMode: React.FC<StudyModeProps> = ({ user, bookId, onBack, onSessionComplete }) => {
  const [queue, setQueue] = useState<WordData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isBookOwner, setIsBookOwner] = useState(false);
  const [bookContext, setBookContext] = useState<string | undefined>(undefined);
  
  // AI States (Current Card)
  const [aiContext, setAiContext] = useState<GeneratedContext | null>(null);
  const [aiContextLoading, setAiContextLoading] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [aiImage, setAiImage] = useState<string | null>(null);
  const [aiImageLoading, setAiImageLoading] = useState(false);
  
  // AI Cache (Prefetching)
  const contextCache = useRef<Map<string, GeneratedContext>>(new Map());
  
  // Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [editWord, setEditWord] = useState('');
  const [editDef, setEditDef] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  
  // Completion & Gamification States
  const [isFinished, setIsFinished] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);
  const [streakBonusXP, setStreakBonusXP] = useState(0);
  const [leveledUp, setLeveledUp] = useState(false);
  const [updatedUser, setUpdatedUser] = useState<UserProfile | null>(null);

  // Voice Setup
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  // Voice Initialization
  useEffect(() => {
    const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) return;
        let bestVoice = voices.find(v => v.name === 'Google US English');
        if (!bestVoice) bestVoice = voices.find(v => v.name === 'Samantha');
        if (!bestVoice) bestVoice = voices.find(v => v.lang === 'en-US');
        setSelectedVoice(bestVoice || null);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  // Load Queue & Ownership Check
  useEffect(() => {
    const loadWords = async () => {
      try {
        let data: WordData[] = [];
        if (bookId === 'smart-session') {
            data = await storage.getDailySessionWords(user.uid, 20);
            setIsBookOwner(false); 
        } else {
            data = await storage.getBookSession(user.uid, bookId, 10);
            
            // Check ownership & context
            const books = await storage.getBooks();
            const currentBook = books.find(b => b.id === bookId);
            if (currentBook) {
                setBookContext(currentBook.sourceContext); // Load context
                try {
                    const isMine = (currentBook.description?.includes(user.uid)) || 
                                   (JSON.parse(currentBook.description || '{}').createdBy === user.uid);
                    setIsBookOwner(!!isMine);
                } catch (e) {
                    setIsBookOwner(false);
                }
            }
        }
        setQueue(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadWords();
  }, [bookId, user.uid]);

  // Prefetch Logic (Context-Aware)
  useEffect(() => {
    if (queue.length === 0) return;

    const prefetchNext = async () => {
        const current = queue[currentIndex];
        
        if (current.exampleSentence && current.exampleMeaning) {
            if (!contextCache.current.has(current.id)) {
                contextCache.current.set(current.id, {
                    english: current.exampleSentence,
                    japanese: current.exampleMeaning
                });
            }
        }

        const userLevel = user.englishLevel || EnglishLevel.B1;

        if (!contextCache.current.has(current.id)) {
            setAiContextLoading(true);
            try {
                // Pass bookContext here!
                const ctx = await generateGeminiSentence(current.word, current.definition, userLevel, bookContext);
                contextCache.current.set(current.id, ctx);
                setAiContext(ctx);
                storage.updateWordCache(current.id, ctx.english, ctx.japanese);
            } finally {
                setAiContextLoading(false);
            }
        } else {
            setAiContext(contextCache.current.get(current.id) || null);
        }

        // Prefetch Next
        const nextIndex = currentIndex + 1;
        if (nextIndex < queue.length) {
            const nextWord = queue[nextIndex];
            let hasCache = false;
            if (nextWord.exampleSentence && nextWord.exampleMeaning) {
                contextCache.current.set(nextWord.id, {
                    english: nextWord.exampleSentence,
                    japanese: nextWord.exampleMeaning
                });
                hasCache = true;
            }
            if (!hasCache && !contextCache.current.has(nextWord.id)) {
                generateGeminiSentence(nextWord.word, nextWord.definition, userLevel, bookContext).then(ctx => {
                    contextCache.current.set(nextWord.id, ctx);
                    storage.updateWordCache(nextWord.id, ctx.english, ctx.japanese);
                });
            }
        }
    };

    prefetchNext();
  }, [queue, currentIndex, user.englishLevel, bookContext]);


  const currentWord = queue[currentIndex];

  // Edit Handlers
  const startEditing = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isBookOwner) {
          // If official, open Report Modal instead
          setReportReason('');
          setShowReportModal(true);
          return;
      }
      setEditWord(currentWord.word);
      setEditDef(currentWord.definition);
      setIsEditing(true);
  };

  const submitReport = async () => {
      if (!reportReason.trim()) return;
      await storage.reportWord(currentWord.id, reportReason);
      alert("報告ありがとうございます。\n講師・管理者が確認し、必要に応じて修正します。");
      setShowReportModal(false);
  };

  const cancelEditing = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsEditing(false);
  };

  const saveEditing = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!editWord.trim() || !editDef.trim()) return;

      const updated: WordData = { ...currentWord, word: editWord, definition: editDef };
      await storage.updateWord(updated);

      const newQueue = [...queue];
      newQueue[currentIndex] = updated;
      setQueue(newQueue);
      setIsEditing(false);
  };

  const handleRating = async (rating: number) => {
    if (!currentWord) return;
    await storage.saveSRSHistory(user.uid, currentWord, rating);
    if (currentIndex < queue.length - 1) {
        resetCard();
        setTimeout(() => setCurrentIndex(prev => prev + 1), 200);
    } else {
        finishSession();
    }
  };
  
  const finishSession = async () => {
      const baseXP = queue.length * 10;
      const currentStreak = user.stats?.currentStreak || 0;
      const bonusMultiplier = Math.min(currentStreak, 10) * 0.1; 
      const bonusXP = Math.round(baseXP * bonusMultiplier);
      const totalXP = baseXP + bonusXP;

      const result = await storage.addXP(user, totalXP);
      setEarnedXP(baseXP);
      setStreakBonusXP(bonusXP);
      setLeveledUp(result.leveledUp);
      setUpdatedUser(result.user); 
      setIsFinished(true);
  };

  const handleExit = () => {
      onSessionComplete(updatedUser || user);
  };

  const resetCard = () => {
    setIsFlipped(false);
    setAiContext(null); 
    setAiImage(null);
    setShowTranslation(false);
    setIsEditing(false);
  }

  const generateImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (aiImage || aiImageLoading) return;
    setAiImageLoading(true);
    const imageBase64 = await generateWordImage(currentWord.word, currentWord.definition);
    setAiImage(imageBase64);
    setAiImageLoading(false);
  };

  const speakText = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.rate = 0.9; 
    window.speechSynthesis.speak(utterance);
  };

  if (loading) return <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-10 w-10 border-medace-500 border-t-2"></div></div>;

  if (queue.length === 0) return (
    <div className="text-center p-10">
      <p className="text-lg font-bold text-slate-700 mb-2">学習対象の単語はありません</p>
      <button onClick={onBack} className="px-6 py-2 bg-medace-600 text-white rounded-lg font-bold">ダッシュボードに戻る</button>
    </div>
  );

  if (isFinished) return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl p-10 text-center animate-in zoom-in duration-500 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-yellow-50 to-white z-0"></div>
        <div className="relative z-10">
            {leveledUp && <div className="mb-6 animate-bounce"><span className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black text-xl rounded-full shadow-lg transform rotate-2 inline-block">LEVEL UP!</span></div>}
            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner relative"><Award className={`w-12 h-12 ${leveledUp ? 'text-yellow-500' : 'text-green-600'}`} /></div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">クエスト完了！</h2>
            <div className="bg-slate-50 rounded-xl p-6 mb-8 border border-slate-200 space-y-2">
                <div className="border-t border-slate-200 my-2 pt-2 flex justify-between text-medace-600 text-xl font-black"><span>合計スコア</span><span>+{earnedXP + streakBonusXP} XP</span></div>
            </div>
            <button onClick={handleExit} className="w-full px-6 py-3 bg-medace-600 text-white rounded-xl font-bold shadow-lg hover:bg-medace-700 transition-all">報酬を受け取る</button>
        </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      
      {/* Report Modal */}
      {showReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowReportModal(false)}>
              <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Flag className="w-5 h-5 text-red-500" /> 問題を報告
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                      不適切な例文や間違いを報告してください。講師が確認後、修正を行います。
                  </p>
                  <textarea 
                    value={reportReason}
                    onChange={e => setReportReason(e.target.value)}
                    className="w-full h-24 border p-3 rounded-lg mb-4 text-sm"
                    placeholder="例: 例文が古文として不自然です / 意味が間違っています"
                  />
                  <div className="flex gap-3">
                      <button onClick={() => setShowReportModal(false)} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold">キャンセル</button>
                      <button onClick={submitReport} disabled={!reportReason.trim()} className="flex-1 py-2 bg-red-500 text-white rounded-lg font-bold disabled:opacity-50">報告する</button>
                  </div>
              </div>
          </div>
      )}

      <div className="flex items-center justify-between mb-4 md:mb-6">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium">
          <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">中断</span>
        </button>
        <div className="flex items-center gap-2">
            {bookId === 'smart-session' && <span className="bg-medace-100 text-medace-700 text-xs font-bold px-2 py-1 rounded flex items-center gap-1"><Zap className="w-3 h-3" /> デイリークエスト</span>}
            <span className="text-slate-400 text-sm font-mono bg-slate-100 px-3 py-1 rounded-full">
            {currentIndex + 1} / {queue.length}
            </span>
        </div>
      </div>

      <div 
        className="relative w-full min-h-[50vh] md:h-[550px] cursor-pointer group perspective-1000 mb-6 md:mb-8"
        onClick={() => { if(!isEditing) setIsFlipped(!isFlipped); }}
      >
        <div className={`card-inner w-full h-full transition-transform duration-500 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`} 
             style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)', transformStyle: 'preserve-3d' }}>
          
          {/* Front */}
          <div className="card-front absolute w-full h-full bg-white rounded-3xl shadow-xl border border-slate-200 flex flex-col items-center justify-center backface-hidden p-4 md:p-8 hover:shadow-2xl transition-shadow">
            <div className="text-slate-400 text-xs md:text-sm font-bold uppercase tracking-widest mb-4 md:mb-6">単語</div>
            <h2 className="text-3xl md:text-5xl font-bold text-slate-800 mb-4 md:mb-6 tracking-tight text-center break-words max-w-full">{currentWord.word}</h2>
            <div className="flex gap-3">
                <button onClick={(e) => speakText(e, currentWord.word)} className="p-3 rounded-full bg-orange-50 text-medace-500 hover:bg-medace-100 transition-colors">
                <Volume2 className="w-6 h-6" />
                </button>
            </div>
            <p className="absolute bottom-6 text-slate-300 text-xs font-medium">タップして裏返す</p>
          </div>

          {/* Back */}
          <div className="card-back absolute w-full h-full bg-slate-900 rounded-3xl shadow-xl flex flex-col backface-hidden overflow-hidden" style={{ transform: 'rotateY(180deg)' }}>
            <div className="p-4 md:p-8 flex flex-col h-full overflow-y-auto scrollbar-hide relative">
                
                <div className="flex justify-between w-full mb-2 md:mb-4 relative z-10">
                    <div className="text-medace-400 text-xs md:text-sm font-bold uppercase tracking-widest">意味</div>
                    {!isEditing ? (
                        <button 
                            onClick={startEditing}
                            className={`p-1 transition-colors ${isBookOwner ? 'text-slate-500 hover:text-medace-400' : 'text-slate-500 hover:text-red-400'}`}
                            title={isBookOwner ? "定義を編集" : "問題を報告する"}
                        >
                            {isBookOwner ? <Edit2 className="w-4 h-4" /> : <Flag className="w-4 h-4" />}
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button onClick={saveEditing} className="text-green-400 hover:text-green-300"><Save className="w-5 h-5" /></button>
                            <button onClick={cancelEditing} className="text-red-400 hover:text-red-300"><X className="w-5 h-5" /></button>
                        </div>
                    )}
                </div>

                {isEditing ? (
                    <div className="flex flex-col gap-4 mb-6" onClick={(e) => e.stopPropagation()}>
                        <div>
                            <input type="text" value={editWord} onChange={(e) => setEditWord(e.target.value)} className="w-full bg-slate-800 text-white p-2 rounded border border-slate-600" />
                        </div>
                        <div>
                            <textarea value={editDef} onChange={(e) => setEditDef(e.target.value)} className="w-full bg-slate-800 text-white p-2 rounded border border-slate-600 resize-none h-24" />
                        </div>
                    </div>
                ) : (
                    <p className="text-2xl md:text-3xl text-white font-bold mb-4 md:mb-6 text-center">{currentWord.definition}</p>
                )}

                <div className="grid grid-cols-1 gap-3 flex-grow content-start">
                    {/* AI Sentence Section */}
                    <div className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 md:p-4 flex flex-col relative hover:bg-slate-800 transition-colors" onClick={(e) => e.stopPropagation()}>
                        {aiContextLoading ? (
                            <div className="flex flex-col items-center gap-2 text-medace-400 animate-pulse py-4">
                                <Loader2 className="w-5 h-5 animate-spin" /> <span className="text-xs">AI例文を生成中...</span>
                            </div>
                        ) : aiContext ? (
                            <div className="text-center">
                                <div className="flex items-center justify-between mb-2 text-medace-400 text-[10px] uppercase font-bold tracking-wider">
                                    <span className="flex items-center gap-1">
                                        <Sparkles className="w-3 h-3" /> 
                                        AI解説 {bookContext && `(${bookContext.slice(0,15)}...)`}
                                    </span>
                                    <button onClick={(e) => speakText(e, aiContext.english)} className="hover:text-white transition-colors"><Volume2 className="w-4 h-4" /></button>
                                </div>
                                <p className="text-slate-200 text-base md:text-lg leading-relaxed font-medium mb-3">"{aiContext.english}"</p>
                                
                                {showTranslation ? (
                                    <p className="text-slate-400 text-xs md:text-sm animate-in fade-in border-t border-slate-700 pt-2">{aiContext.japanese}</p>
                                ) : (
                                    <button onClick={() => setShowTranslation(true)} className="text-xs text-slate-500 flex items-center justify-center gap-1 hover:text-slate-300 transition-colors mx-auto">
                                        <Languages className="w-3 h-3" /> 訳を表示
                                    </button>
                                )}
                            </div>
                        ) : (
                            <p className="text-slate-500 text-xs text-center">コンテキスト情報なし</p>
                        )}
                    </div>

                    <div className="w-full bg-slate-800/50 border border-slate-700 rounded-xl flex flex-col items-center justify-center relative hover:bg-slate-800 transition-colors overflow-hidden min-h-[100px] md:min-h-[120px]" onClick={(e) => e.stopPropagation()}>
                    {aiImageLoading ? (
                        <div className="flex flex-col items-center gap-2 text-blue-400 animate-pulse">
                            <Loader2 className="w-5 h-5 animate-spin" /> <span className="text-xs text-center">AIイメージ生成中...</span>
                        </div>
                    ) : aiImage ? (
                        <div className="w-full h-32 md:h-40 relative group">
                             <img src={aiImage} alt="視覚的記憶補助" className="w-full h-full object-contain opacity-90 group-hover:opacity-100 transition-opacity" />
                        </div>
                    ) : (
                        <button onClick={generateImage} className="flex flex-col items-center gap-2 text-slate-500 hover:text-blue-400 transition-colors group p-4 w-full h-full justify-center">
                        <div className="p-2 bg-slate-700 rounded-full group-hover:bg-blue-900/50 transition-colors">
                             <Lock className="w-4 h-4 group-hover:hidden" />
                             <ImageIcon className="w-4 h-4 hidden group-hover:block" />
                        </div>
                        <span className="text-xs font-bold text-center">画像ヒントを表示</span>
                        </button>
                    )}
                    </div>
                </div>
            </div>
          </div>
        </div>
      </div>

      {isFlipped && !isEditing ? (
        <div className="grid grid-cols-4 gap-2 md:gap-3 animate-in slide-in-from-bottom-4 fade-in duration-300">
            <button onClick={() => handleRating(0)} className="flex flex-col items-center gap-1 p-2 md:p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 hover:bg-red-100 active:scale-95 transition-transform"><span className="text-[10px] md:text-xs font-bold">もう一度</span><AlertCircle className="w-5 h-5 mt-1" /></button>
            <button onClick={() => handleRating(1)} className="flex flex-col items-center gap-1 p-2 md:p-3 bg-slate-100 text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-200 active:scale-95 transition-transform"><span className="text-[10px] md:text-xs font-bold">難しい</span><HelpCircleIcon /></button>
            <button onClick={() => handleRating(2)} className="flex flex-col items-center gap-1 p-2 md:p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 hover:bg-blue-100 active:scale-95 transition-transform"><span className="text-[10px] md:text-xs font-bold">普通</span><Clock className="w-5 h-5 mt-1" /></button>
            <button onClick={() => handleRating(3)} className="flex flex-col items-center gap-1 p-2 md:p-3 bg-green-50 text-green-600 rounded-xl border border-green-100 hover:bg-green-100 active:scale-95 transition-transform"><span className="text-[10px] md:text-xs font-bold">簡単</span><Zap className="w-5 h-5 mt-1" /></button>
        </div>
      ) : (
        <div className="flex justify-center pb-6 md:pb-0">
             <button onClick={() => { if(!isEditing) setIsFlipped(true); }} disabled={isEditing} className={`flex items-center gap-2 px-8 py-4 rounded-full font-bold shadow-lg hover:scale-105 transition-transform ${isEditing ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-800 text-white'}`}>
                <RotateCw className="w-5 h-5" /> 答えを確認
            </button>
        </div>
      )}
    </div>
  );
};

const HelpCircleIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-1"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><path d="M12 17h.01"></path></svg>);

export default StudyMode;
