import React, { useEffect, useState } from 'react';
import { BookMetadata, BookProgress, UserProfile } from '../types';
import { storage } from '../services/storage';
import { Play, BookOpen, Star, Book, Loader2, TrendingUp } from 'lucide-react';

interface DashboardProps {
  user: UserProfile;
  onSelectBook: (bookId: string, mode: 'study' | 'quiz') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onSelectBook }) => {
  const [books, setBooks] = useState<BookMetadata[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, BookProgress>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Guard clause: Ensure we have a user before fetching (Prevent Permission Errors)
    if (!user || !user.uid) return;

    const fetchData = async () => {
      try {
        setError(null);
        // Parallel fetching for better performance
        const fetchedBooks = await storage.getBooks();
        
        // Sort: Priority first
        fetchedBooks.sort((a, b) => {
          if (a.isPriority && !b.isPriority) return -1;
          if (!a.isPriority && b.isPriority) return 1;
          return a.title.localeCompare(b.title);
        });
        setBooks(fetchedBooks);

        // Fetch progress for each book
        const progressPromises = fetchedBooks.map(book => 
          storage.getBookProgress(user.uid, book.id)
        );
        const progressResults = await Promise.all(progressPromises);
        
        const pMap: Record<string, BookProgress> = {};
        progressResults.forEach(p => {
          pMap[p.bookId] = p;
        });
        setProgressMap(pMap);

      } catch (error) {
        console.error("Failed to load dashboard data", error);
        setError("コース情報の読み込みに失敗しました。通信環境を確認してください。");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 text-medace-500">
        <Loader2 className="h-10 w-10 animate-spin mb-2" />
        <p className="text-sm font-medium">学習スペースを準備中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center text-red-600">
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="mt-2 underline">再読み込み</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-medace-500 to-medace-700 rounded-2xl p-8 text-white shadow-lg">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2">おかえりなさい、{user.displayName.split(' ')[0]}さん</h2>
          <div className="flex items-center gap-2 text-medace-100">
            <TrendingUp className="w-5 h-5" />
            <p className="text-lg">学習の進捗は順調に記録されています。</p>
          </div>
        </div>
        {/* Decorative Circle */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white opacity-10 rounded-full blur-xl"></div>
      </div>

      {/* Course Grid */}
      <h3 className="text-xl font-bold text-slate-800 border-l-4 border-medace-500 pl-3">受講中のコース</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {books.map((book) => {
          const progress = progressMap[book.id] || { percentage: 0, learnedCount: 0, totalCount: book.wordCount };
          
          return (
            <div key={book.id} className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
              <div className="p-6 flex-grow">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-lg ${book.isPriority ? 'bg-orange-100 text-medace-600' : 'bg-slate-100 text-slate-500'}`}>
                    <Book className="w-6 h-6" />
                  </div>
                  {book.isPriority && (
                    <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1 shadow-sm">
                      <Star className="w-3 h-3 fill-current" /> 推奨コース
                    </span>
                  )}
                </div>
                
                <h3 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-medace-600 transition-colors">{book.title}</h3>
                <p className="text-sm text-slate-500 mb-5 line-clamp-2 h-10">
                  {book.description || "MedAce生のための包括的な単語学習リスト"}
                </p>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-bold text-slate-700">
                    <span>習熟度</span>
                    <span>{progress.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-100">
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

              <div className="bg-slate-50 p-4 flex gap-3 border-t border-slate-100">
                <button 
                  onClick={() => onSelectBook(book.id, 'study')}
                  className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-medace-500 hover:text-medace-600 text-slate-700 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm"
                >
                  <BookOpen className="w-4 h-4" /> 学習する
                </button>
                <button 
                  onClick={() => onSelectBook(book.id, 'quiz')}
                  className="flex-1 flex items-center justify-center gap-2 bg-medace-600 hover:bg-medace-700 text-white py-2.5 rounded-lg text-sm font-bold transition-all shadow-md hover:shadow-lg"
                >
                  <Play className="w-4 h-4 fill-current" /> テスト
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;