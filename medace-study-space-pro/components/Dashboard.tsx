
import React, { useEffect, useState } from 'react';
import { BookMetadata, BookProgress, UserProfile, UserGrade, EnglishLevel, LearningPlan, LeaderboardEntry, MasteryDistribution, ActivityLog, STATUS_LABELS, GRADE_LABELS } from '../types';
import { storage } from '../services/storage';
import { extractVocabularyFromText, extractVocabularyFromMedia, generateLearningPlan } from '../services/gemini';
import { Play, BookOpen, Star, Loader2, Zap, BrainCircuit, Trophy, Plus, Sparkles, FileText, Image as ImageIcon, UploadCloud, Flame, Trash2, Settings, RefreshCw, User, Book, Calendar, Target, ArrowRight, Library, ChevronDown, ChevronUp, BarChart, Activity, Edit2, X, Check } from 'lucide-react';
import Onboarding from './Onboarding';

interface DashboardProps {
  user: UserProfile;
  onSelectBook: (bookId: string, mode: 'study' | 'quiz') => void;
}

interface BookCardProps {
  book: BookMetadata;
  isMine?: boolean;
  progress: BookProgress;
  onDelete: (e: React.MouseEvent, bookId: string, bookTitle: string) => void;
  onSelect: (bookId: string, mode: 'study' | 'quiz') => void;
}

const BookCard: React.FC<BookCardProps> = ({ book, isMine, progress, onDelete, onSelect }) => {
  return (
      <div className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col relative h-full">
          <div className="p-6 flex-grow relative z-10">
              <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-lg ${book.isPriority ? 'bg-orange-100 text-medace-600' : 'bg-slate-100 text-slate-500'}`}>
                      <Book className="w-6 h-6" />
                  </div>
                  <div className="flex gap-2 items-center">
                      {progress.percentage >= 100 ? (
                              <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1 border border-green-200">
                              <Trophy className="w-3 h-3 fill-current" /> 完了
                              </span>
                      ) : book.isPriority && (
                          <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1 shadow-sm">
                          <Star className="w-3 h-3 fill-current" /> 推奨
                          </span>
                      )}
                      {isMine && (
                           <button 
                              onClick={(e) => onDelete(e, book.id, book.title)}
                              className="bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 p-1.5 rounded-full transition-all z-20 shadow-sm cursor-pointer"
                              title="削除する"
                           >
                               <Trash2 className="w-4 h-4" />
                           </button>
                      )}
                  </div>
              </div>
              
              <h3 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-medace-600 transition-colors truncate" title={book.title}>{book.title}</h3>
              <p className="text-sm text-slate-500 mb-5 line-clamp-2 h-10">
                 {isMine 
                    ? (book.sourceContext ? `AI分析: ${book.sourceContext}` : 'オリジナル単語帳') 
                    : (book.description || "学習セット")}
              </p>

              <div className="space-y-2">
                  <div className="flex justify-between text-sm font-bold text-slate-700">
                      <span>進捗率</span>
                      <span>{progress.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-100 relative">
                      <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${progress.percentage === 100 ? 'bg-green-500' : 'bg-medace-500'}`}
                      style={{ width: `${progress.percentage}%` }}
                      ></div>
                  </div>
                  <p className="text-xs text-slate-400 text-right font-mono">
                      {progress.learnedCount} <span className="text-slate-300">/</span> {progress.totalCount} 単語
                  </p>
              </div>
          </div>

          <div className="bg-slate-50 p-4 flex gap-3 border-t border-slate-100 relative z-10 mt-auto">
              <button 
              onClick={() => onSelect(book.id, 'study')}
              className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-medace-500 hover:text-medace-600 text-slate-700 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm"
              >
              <BookOpen className="w-4 h-4" /> 学習
              </button>
              <button 
              onClick={() => onSelect(book.id, 'quiz')}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-200 hover:bg-medace-600 hover:text-white text-slate-600 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm"
              >
              <Play className="w-4 h-4 fill-current" /> テスト
              </button>
          </div>
      </div>
  );
};

const ActivityBarChart: React.FC<{ logs: ActivityLog[] }> = ({ logs }) => {
    const today = new Date();
    const DAYS_TO_SHOW = 7; 
    
    const chartData = [];
    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

    let maxCount = 0;

    for (let i = DAYS_TO_SHOW - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const log = logs.find(l => l.date === dateStr);
        const count = log ? log.count : 0;
        if (count > maxCount) maxCount = count;
        
        chartData.push({
            date: dateStr,
            dayLabel: weekDays[d.getDay()],
            count: count,
            isToday: i === 0
        });
    }

    if (maxCount < 10) maxCount = 10;

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <BarChart className="w-5 h-5 text-medace-500" /> 週間学習記録
                </h3>
                <div className="text-xs font-bold text-slate-400">
                    直近7日間の合計: {logs.reduce((acc, l) => acc + l.count, 0)} 語
                </div>
            </div>
            
            <div className="w-full h-40 flex items-end justify-between gap-2 md:gap-4">
                {chartData.map((data, idx) => {
                    const heightPercent = Math.round((data.count / maxCount) * 100);
                    return (
                        <div key={data.date} className="flex flex-col items-center flex-1 group cursor-pointer relative">
                            {/* Tooltip */}
                            <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-slate-800 text-white text-xs font-bold px-2 py-1 rounded transition-opacity whitespace-nowrap z-10">
                                {data.count} words
                            </div>
                            
                            {/* Bar */}
                            <div className="w-full bg-slate-100 rounded-t-md relative h-full flex items-end overflow-hidden">
                                <div 
                                    className={`w-full rounded-t-md transition-all duration-1000 ease-out ${data.isToday ? 'bg-medace-500' : 'bg-slate-300 group-hover:bg-medace-400'}`}
                                    style={{ height: `${heightPercent}%` }}
                                ></div>
                            </div>
                            
                            {/* Label */}
                            <div className={`mt-2 text-xs font-bold ${data.isToday ? 'text-medace-600' : 'text-slate-400'}`}>
                                {data.dayLabel}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


const Dashboard: React.FC<DashboardProps> = ({ user, onSelectBook }) => {
  const [books, setBooks] = useState<BookMetadata[]>([]);
  const [myBooks, setMyBooks] = useState<BookMetadata[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, BookProgress>>({});
  const [loading, setLoading] = useState(true);
  const [dueCount, setDueCount] = useState(0);
  const [learningPlan, setLearningPlan] = useState<LearningPlan | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  
  // Analytics & Leaderboard
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [masteryDist, setMasteryDist] = useState<MasteryDistribution | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // Toggle State for Library
  const [showLibrary, setShowLibrary] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Plan Edit Modal
  const [showPlanEditModal, setShowPlanEditModal] = useState(false);
  const [editDailyGoal, setEditDailyGoal] = useState(0);
  const [selectedPlanBooks, setSelectedPlanBooks] = useState<string[]>([]);

  // Create Modal State
  const [createMode, setCreateMode] = useState<'TEXT' | 'FILE'>('TEXT');
  const [rawText, setRawText] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Profile Edit State
  const [editName, setEditName] = useState(user.displayName);
  const [editGrade, setEditGrade] = useState(user.grade || UserGrade.ADULT);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (!user || !user.uid) return;
    loadDashboardData();
  }, [user]);

  // Initialize edit state when modal opens or plan loads
  useEffect(() => {
    if (learningPlan) {
      setEditDailyGoal(learningPlan.dailyWordGoal);
      setSelectedPlanBooks(learningPlan.selectedBookIds);
    }
  }, [learningPlan, showPlanEditModal]);

  if (showOnboarding) {
      return <Onboarding 
                user={user} 
                isRetake={true}
                historySummary={`Current Level: ${user.englishLevel}, XP: ${user.stats?.xp}, Grade: ${GRADE_LABELS[user.grade || UserGrade.ADULT]}`}
                onComplete={(updated) => {
                    storage.updateSessionUser(updated); 
                    setShowOnboarding(false);
                    window.location.reload(); 
                }} 
             />;
  }

  const loadDashboardData = async () => {
      try {
        setLoading(true);
        const count = await storage.getDueCount(user.uid);
        setDueCount(count);

        // Load Books
        const allBooks = await storage.getBooks();
        const official: BookMetadata[] = [];
        const mine: BookMetadata[] = [];

        allBooks.forEach(b => {
            let isMine = false;
            try {
                if (b.description && b.description.includes(user.uid)) isMine = true;
                const desc = JSON.parse(b.description || '{}');
                if (desc.createdBy === user.uid) isMine = true;
            } catch { }

            if (isMine) mine.push(b);
            else official.push(b);
        });

        official.sort((a, b) => (a.isPriority === b.isPriority ? a.title.localeCompare(b.title) : a.isPriority ? -1 : 1));
        mine.sort((a, b) => b.id.localeCompare(a.id));

        setBooks(official);
        setMyBooks(mine);

        // Progress
        const progressPromises = [...official, ...mine].map(book => storage.getBookProgress(user.uid, book.id));
        const progressResults = await Promise.all(progressPromises);
        const pMap: Record<string, BookProgress> = {};
        progressResults.forEach(p => { pMap[p.bookId] = p; });
        setProgressMap(pMap);

        // Load Learning Plan
        const plan = await storage.getLearningPlan(user.uid);
        setLearningPlan(plan);

        // Load Analytics
        const lb = await storage.getLeaderboard(user.uid);
        setLeaderboard(lb);
        const dist = await storage.getMasteryDistribution(user.uid);
        setMasteryDist(dist);
        const logs = await storage.getActivityLogs(user.uid);
        setActivityLogs(logs);

      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
  };

  const handleGeneratePlan = async () => {
      setGeneratingPlan(true);
      try {
          const plan = await generateLearningPlan(user.grade || UserGrade.ADULT, user.englishLevel || EnglishLevel.B1, books);
          if (plan) {
              plan.uid = user.uid;
              await storage.saveLearningPlan(plan);
              setLearningPlan(plan);
          }
      } catch (e) {
          alert("プラン作成に失敗しました");
      } finally {
          setGeneratingPlan(false);
      }
  };

  const handleUpdatePlan = async () => {
      if (!learningPlan) return;
      const updated = { ...learningPlan, dailyWordGoal: editDailyGoal, selectedBookIds: selectedPlanBooks };
      await storage.saveLearningPlan(updated);
      setLearningPlan(updated);
      setShowPlanEditModal(false);
      alert("プランを更新しました");
  };

  const togglePlanBook = (bookId: string) => {
      if (selectedPlanBooks.includes(bookId)) {
          setSelectedPlanBooks(prev => prev.filter(id => id !== bookId));
      } else {
          setSelectedPlanBooks(prev => [...prev, bookId]);
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setUploadFile(e.target.files[0]);
      }
  };

  const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
              const result = reader.result as string;
              const base64 = result.split(',')[1];
              resolve(base64);
          };
          reader.onerror = error => reject(error);
      });
  };

  const handleCreatePhrasebook = async () => {
    if (!newBookTitle) return;
    if (createMode === 'TEXT' && !rawText) return;
    if (createMode === 'FILE' && !uploadFile) return;

    setCreating(true);
    setErrorMsg(null);

    try {
        let result = { words: [], contextSummary: '' };

        if (createMode === 'TEXT') {
            // @ts-ignore
            result = await extractVocabularyFromText(rawText);
        } else if (createMode === 'FILE' && uploadFile) {
            const mimeType = uploadFile.type;
            if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
                throw new Error("対応していないファイル形式です。");
            }
            const base64 = await fileToBase64(uploadFile);
            // @ts-ignore
            result = await extractVocabularyFromMedia(base64, mimeType);
        }

        if (!result || result.words.length === 0) {
            throw new Error("単語を抽出できませんでした。");
        }

        const rows = result.words.map((item: any, index: number) => ({
            BookName: newBookTitle,
            Number: index + 1,
            Word: item.word,
            Meaning: item.definition
        }));

        await storage.batchImportWords(newBookTitle, rows, () => {}, user.uid, result.contextSummary);
        
        setRawText('');
        setNewBookTitle('');
        setUploadFile(null);
        setShowCreateModal(false);
        alert(`単語帳を作成しました！\nAI分析コンテキスト: "${result.contextSummary}"`);
        await loadDashboardData(); 

    } catch (e: any) {
        console.error(e);
        const msg = e.message || "作成に失敗しました。";
        setErrorMsg(msg.includes('429') ? "AIの利用上限(RPM)に達しました。時間をおいてください。" : msg);
    } finally {
        setCreating(false);
    }
  };

  const handleDeleteBook = async (e: React.MouseEvent, bookId: string, bookTitle: string) => {
      e.stopPropagation();
      e.preventDefault();
      
      if (window.confirm(`【確認】\n単語帳「${bookTitle}」を削除しますか？`)) {
          try {
              setMyBooks(prev => prev.filter(b => b.id !== bookId));
              await storage.deleteBook(bookId);
              await loadDashboardData();
          } catch (err) {
              alert("削除に失敗しました。");
              await loadDashboardData();
          }
      }
  };

  const handleSaveProfile = async () => {
      setIsSavingProfile(true);
      try {
          const updatedUser = { ...user, displayName: editName, grade: editGrade };
          await storage.updateSessionUser(updatedUser);
          alert("プロフィールを更新しました。");
          setShowSettingsModal(false);
          window.location.reload();
      } catch (e) {
          alert("更新に失敗しました");
      } finally {
          setIsSavingProfile(false);
      }
  };

  if (loading && books.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] text-medace-500">
        <Loader2 className="h-10 w-10 animate-spin mb-2" />
        <p className="text-sm font-medium">学習データを解析中...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500 relative pb-20">
        
        {/* Header Actions */}
        <div className="flex justify-end mb-4 relative z-20">
             <button 
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center gap-2 text-slate-500 hover:text-medace-600 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm transition-colors text-sm font-medium hover:bg-slate-50"
             >
                 <Settings className="w-4 h-4" /> 設定・プロフィール
             </button>
        </div>

        {/* MODALS */}
        
        {/* Plan Edit Modal */}
        {showPlanEditModal && learningPlan && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
                    <button onClick={() => setShowPlanEditModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">✕</button>
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Edit2 className="w-5 h-5" /> 学習プランの編集
                    </h3>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">1日の目標単語数</label>
                            <input 
                                type="number" 
                                value={editDailyGoal} 
                                onChange={e => setEditDailyGoal(Number(e.target.value))} 
                                className="w-full border border-slate-300 p-3 rounded-lg bg-white text-slate-800 font-bold text-xl focus:ring-2 focus:ring-medace-500 outline-none" 
                                min="5" max="100"
                            />
                            <p className="text-xs text-slate-400 mt-1">無理のない範囲で設定しましょう (推奨: 10-30単語)</p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">学習対象のコースを選択</label>
                            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                                {books.map(b => (
                                    <div key={b.id} onClick={() => togglePlanBook(b.id)} className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50 ${selectedPlanBooks.includes(b.id) ? 'bg-medace-50' : ''}`}>
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedPlanBooks.includes(b.id) ? 'bg-medace-500 border-medace-500 text-white' : 'border-slate-300 bg-white'}`}>
                                            {selectedPlanBooks.includes(b.id) && <Check className="w-3 h-3" />}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-800">{b.title}</div>
                                            {b.isPriority && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">推奨</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">選択したコースから日々の問題が出題されます</p>
                        </div>

                        <button onClick={handleUpdatePlan} className="w-full py-3 bg-medace-600 text-white rounded-xl font-bold shadow-lg hover:bg-medace-700 transition-all">
                            設定を更新する
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Settings Modal */}
        {showSettingsModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
                    <button onClick={() => setShowSettingsModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">✕</button>
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                        <div className="bg-slate-100 p-2 rounded-full"><User className="w-6 h-6 text-slate-600" /></div>
                        <h3 className="text-xl font-bold text-slate-800">ユーザー設定</h3>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">表示名</label>
                            <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full border p-2 rounded-lg bg-white text-slate-800" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">学年・属性</label>
                            <select value={editGrade} onChange={e => setEditGrade(e.target.value as UserGrade)} className="w-full border p-2 rounded-lg bg-white text-slate-800">
                                {Object.values(UserGrade).map(g => <option key={g} value={g}>{GRADE_LABELS[g]}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">現在のレベル</label>
                            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <span className="font-bold text-medace-600 text-lg">{user.englishLevel || '未診断'}</span>
                                <button onClick={() => setShowOnboarding(true)} className="text-xs bg-white border border-medace-200 text-medace-600 px-3 py-1.5 rounded-md font-bold hover:bg-medace-50 flex items-center gap-1">
                                    <RefreshCw className="w-3 h-3" /> レベル診断を再受講
                                </button>
                            </div>
                        </div>
                        <button onClick={handleSaveProfile} disabled={isSavingProfile} className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-all mt-4 shadow-lg">
                            {isSavingProfile ? '保存中...' : '変更を保存'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
                    <button onClick={() => setShowCreateModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold">✕</button>
                    <div className="text-center mb-6">
                        <div className="w-12 h-12 bg-medace-100 text-medace-600 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">My単語帳 作成</h3>
                        <p className="text-sm text-slate-500">AIが文脈を解析し、あなただけの教材を生成します</p>
                    </div>
                    {errorMsg && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2"><span className="mt-0.5">⚠️</span> {errorMsg}</div>
                    )}
                    <div className="space-y-4">
                         <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">タイトル</label>
                            <input type="text" className="w-full border border-slate-300 rounded-lg p-2 font-bold text-slate-700 focus:ring-2 focus:ring-medace-500 outline-none" placeholder="例: 好きな洋楽の歌詞" value={newBookTitle} onChange={(e) => setNewBookTitle(e.target.value)} />
                         </div>
                         <div className="flex p-1 bg-slate-100 rounded-lg">
                             <button onClick={() => setCreateMode('TEXT')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${createMode === 'TEXT' ? 'bg-white text-medace-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                 <div className="flex items-center justify-center gap-2"><FileText className="w-4 h-4" /> テキスト入力</div>
                             </button>
                             <button onClick={() => setCreateMode('FILE')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${createMode === 'FILE' ? 'bg-white text-medace-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                 <div className="flex items-center justify-center gap-2"><ImageIcon className="w-4 h-4" /> 画像/PDF</div>
                             </button>
                         </div>
                         {createMode === 'TEXT' ? (
                             <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">ソーステキスト</label>
                                <textarea className="w-full h-32 border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-medace-500 outline-none resize-none text-slate-700" placeholder="ここに英文を貼り付けてください..." value={rawText} onChange={(e) => setRawText(e.target.value)} />
                             </div>
                         ) : (
                             <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">ファイルをアップロード</label>
                                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-medace-500 transition-colors bg-slate-50">
                                    <input type="file" id="file-upload" accept=".pdf,image/*" className="hidden" onChange={handleFileChange} />
                                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                        <UploadCloud className="w-8 h-8 text-slate-400" />
                                        <span className="text-sm font-bold text-slate-600">{uploadFile ? uploadFile.name : "クリックしてPDFまたは写真を選択"}</span>
                                    </label>
                                </div>
                             </div>
                         )}
                         <button onClick={handleCreatePhrasebook} disabled={creating || !newBookTitle} className="w-full py-3 bg-medace-600 text-white rounded-xl font-bold hover:bg-medace-700 transition-colors flex items-center justify-center gap-2 shadow-lg disabled:bg-slate-300 disabled:cursor-not-allowed">
                            {creating ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                            {creating ? "AIが文脈を分析中..." : "作成する"}
                         </button>
                    </div>
                </div>
            </div>
        )}

      {/* SECTION: Learning Plan Widget (Top) */}
      {learningPlan ? (
          <div className="bg-white rounded-2xl border-l-4 border-medace-500 shadow-sm p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10"><Target size={100} /></div>
              <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                     <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-medace-500" /> 現在の学習プラン
                     </h2>
                     <button onClick={() => setShowPlanEditModal(true)} className="text-xs text-slate-400 hover:text-medace-600 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-full">
                         <Edit2 className="w-3 h-3" /> プラン調整
                     </button>
                  </div>
                  <p className="text-2xl font-bold text-medace-600 mb-4">"{learningPlan.goalDescription}"</p>
                  
                  <div className="flex flex-wrap gap-4 mb-4">
                      <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                          <span className="block text-xs text-slate-500 font-bold uppercase">1日の目標</span>
                          <span className="text-lg font-bold text-slate-800">{learningPlan.dailyWordGoal} 単語</span>
                      </div>
                      <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                          <span className="block text-xs text-slate-500 font-bold uppercase">目標期日</span>
                          <span className="text-lg font-bold text-slate-800">{learningPlan.targetDate}</span>
                      </div>
                  </div>

                  <button 
                    onClick={() => onSelectBook('smart-session', 'study')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-medace-600 text-white rounded-xl font-bold hover:bg-medace-700 transition-colors shadow-lg"
                  >
                      <Play className="w-4 h-4 fill-current" /> 今日のクエストを開始
                  </button>
                  <button 
                    onClick={handleGeneratePlan}
                    className="ml-3 text-sm text-slate-400 hover:text-slate-600 underline"
                  >
                    AIプラン再生成
                  </button>
              </div>
          </div>
      ) : (
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                  <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                      <Target className="w-6 h-6 text-medace-400" /> 学習プランを作成
                  </h2>
                  <p className="text-slate-300 text-sm">
                      目標とレベルに合わせて、AIが最適なカリキュラムを提案します。
                      <br/>迷わず最短距離でゴールを目指しましょう。
                  </p>
              </div>
              <button 
                onClick={handleGeneratePlan}
                disabled={generatingPlan}
                className="px-6 py-3 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-100 transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                  {generatingPlan ? <Loader2 className="animate-spin w-4 h-4" /> : <Sparkles className="w-4 h-4 text-medace-600" />}
                  プランを生成
              </button>
          </div>
      )}

      {/* SECTION: Analytics & Ranking & Status */}
      <div className="space-y-6">
          <ActivityBarChart logs={activityLogs} />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Mastery Distribution */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm col-span-1 md:col-span-2">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                      <Activity className="w-5 h-5 text-medace-500" /> 学習ステータス
                  </h3>
                  {masteryDist ? (
                      <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
                          <div className="relative w-40 h-40 flex-shrink-0">
                              {/* Conic Gradient Pie Chart */}
                              <div 
                                  className="w-full h-full rounded-full"
                                  style={{
                                      background: `conic-gradient(
                                          #22c55e 0% ${Math.round((masteryDist.graduated / (masteryDist.total || 1)) * 100)}%,
                                          #3b82f6 0% ${Math.round(((masteryDist.graduated + masteryDist.review) / (masteryDist.total || 1)) * 100)}%,
                                          #f97316 0% ${Math.round(((masteryDist.graduated + masteryDist.review + masteryDist.learning) / (masteryDist.total || 1)) * 100)}%,
                                          #f1f5f9 0% 100%
                                      )`
                                  }}
                              ></div>
                              <div className="absolute inset-4 bg-white rounded-full flex flex-col items-center justify-center">
                                   <span className="text-3xl font-bold text-slate-800">{masteryDist.total}</span>
                                   <span className="text-xs text-slate-400 font-bold uppercase">合計単語</span>
                              </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 w-full">
                              <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                                  <div className="text-xs text-green-600 font-bold uppercase">{STATUS_LABELS['graduated']}</div>
                                  <div className="text-xl font-bold text-slate-800">{masteryDist.graduated}</div>
                              </div>
                              <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                                  <div className="text-xs text-blue-600 font-bold uppercase">{STATUS_LABELS['review']}</div>
                                  <div className="text-xl font-bold text-slate-800">{masteryDist.review}</div>
                              </div>
                              <div className="p-3 rounded-lg bg-orange-50 border border-orange-100">
                                  <div className="text-xs text-orange-600 font-bold uppercase">{STATUS_LABELS['learning']}</div>
                                  <div className="text-xl font-bold text-slate-800">{masteryDist.learning}</div>
                              </div>
                              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                                  <div className="text-xs text-slate-500 font-bold uppercase">{STATUS_LABELS['new']}</div>
                                  <div className="text-xl font-bold text-slate-800">{masteryDist.total - (masteryDist.graduated + masteryDist.review + masteryDist.learning)}</div>
                              </div>
                          </div>
                      </div>
                  ) : (
                      <div className="h-40 flex items-center justify-center text-slate-400">データなし</div>
                  )}
              </div>

              {/* Leaderboard */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                      <BarChart className="w-5 h-5 text-medace-500" /> XPランキング
                  </h3>
                  <div className="space-y-3">
                      {leaderboard.map((entry, idx) => (
                          <div 
                            key={entry.uid} 
                            className={`flex items-center justify-between p-3 rounded-lg border ${entry.isCurrentUser ? 'bg-medace-50 border-medace-200' : 'bg-white border-slate-100'}`}
                          >
                              <div className="flex items-center gap-3">
                                  <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-slate-100 text-slate-700' : idx === 2 ? 'bg-orange-50 text-orange-700' : 'text-slate-400'}`}>
                                      {entry.rank}
                                  </div>
                                  <div>
                                      <div className={`text-sm font-bold ${entry.isCurrentUser ? 'text-medace-700' : 'text-slate-700'}`}>
                                          {entry.displayName} {entry.isCurrentUser && '(あなた)'}
                                      </div>
                                      <div className="text-[10px] text-slate-400">Lv.{entry.level}</div>
                                  </div>
                              </div>
                              <div className="text-sm font-bold text-slate-600">
                                  {entry.xp} XP
                              </div>
                          </div>
                      ))}
                      {leaderboard.length === 0 && <p className="text-center text-slate-400 text-xs">ランキングデータなし</p>}
                  </div>
              </div>
          </div>
      </div>

      {/* SECTION: My Phrasebooks */}
      <div className="min-h-[200px]">
        <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-800 border-l-4 border-purple-500 pl-3">My単語帳</h3>
            <button 
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1 text-sm font-bold text-medace-600 hover:bg-medace-50 px-3 py-1.5 rounded-lg transition-colors"
            >
                <Plus className="w-4 h-4" /> 新規作成
            </button>
        </div>
        {myBooks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myBooks.map((book) => (
                  <BookCard 
                    key={book.id} 
                    book={book} 
                    isMine={true} 
                    progress={progressMap[book.id] || { bookId: book.id, percentage: 0, learnedCount: 0, totalCount: book.wordCount }}
                    onDelete={handleDeleteBook}
                    onSelect={onSelectBook}
                  />
                ))}
            </div>
        ) : (
            <div className="bg-slate-100 rounded-xl p-8 text-center border-2 border-dashed border-slate-200">
                <p className="text-slate-500 font-bold mb-2">まだMy単語帳がありません</p>
                <p className="text-slate-400 text-sm mb-4">教科書の写真やPDFから、あなただけの教材を作成しましょう！</p>
                <button onClick={() => setShowCreateModal(true)} className="text-medace-600 font-bold underline hover:text-medace-700">
                    今すぐ作成する
                </button>
            </div>
        )}
      </div>

      {/* SECTION: Current Curriculum (Official) */}
      <div>
        <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-800 border-l-4 border-medace-500 pl-3">推奨コース</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {learningPlan && learningPlan.selectedBookIds.length > 0 ? (
                // Filter by plan
                books.filter(b => learningPlan.selectedBookIds.includes(b.id)).map(book => (
                    <BookCard 
                        key={book.id} 
                        book={book} 
                        progress={progressMap[book.id] || { bookId: book.id, percentage: 0, learnedCount: 0, totalCount: book.wordCount }}
                        onDelete={handleDeleteBook}
                        onSelect={onSelectBook}
                    />
                ))
            ) : (
                // Default Fallback (Priority Only)
                books.filter(b => b.isPriority).slice(0, 3).map(book => (
                    <BookCard 
                        key={book.id} 
                        book={book} 
                        progress={progressMap[book.id] || { bookId: book.id, percentage: 0, learnedCount: 0, totalCount: book.wordCount }}
                        onDelete={handleDeleteBook}
                        onSelect={onSelectBook}
                    />
                ))
            )}
            {(!learningPlan && books.filter(b => b.isPriority).length === 0) && <p className="text-slate-400 text-sm">推奨コースはありません</p>}
        </div>

        {/* SECTION: Library (Collapsed) */}
        <div className="border-t border-slate-200 pt-6">
            <button 
                onClick={() => setShowLibrary(!showLibrary)}
                className="flex items-center justify-between w-full p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors group"
            >
                <div className="flex items-center gap-3">
                    <Library className="w-5 h-5 text-slate-400 group-hover:text-medace-500" />
                    <span className="font-bold text-slate-600 group-hover:text-slate-800">すべての公式コースを見る</span>
                </div>
                {showLibrary ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>

            {showLibrary && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 animate-in slide-in-from-top-4">
                    {books.map((book) => (
                    <BookCard 
                        key={book.id} 
                        book={book} 
                        progress={progressMap[book.id] || { bookId: book.id, percentage: 0, learnedCount: 0, totalCount: book.wordCount }}
                        onDelete={handleDeleteBook}
                        onSelect={onSelectBook}
                    />
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
