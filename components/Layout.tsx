
import React from 'react';
import { BookOpen, LogOut, Zap, Star, Trophy } from 'lucide-react';
import { UserRole, UserProfile } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: UserProfile | null;
  onLogout: () => void;
  currentView: string;
  onChangeView: (view: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, currentView, onChangeView }) => {
  // Calculate progress to next level (Level * 100 XP)
  const stats = user?.stats || { xp: 0, level: 1, currentStreak: 0 };
  const xpToNext = stats.level * 100;
  const progressPercent = Math.min(100, (stats.xp / xpToNext) * 100);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onChangeView('dashboard')}>
            <div className="bg-medace-500 p-2 rounded-lg">
              <BookOpen className="text-white w-6 h-6" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">MedAce<span className="text-medace-500">Pro</span></h1>
              <p className="text-xs text-slate-500 font-medium -mt-1">学習スペース</p>
            </div>
          </div>

          {user && (
            <div className="flex items-center gap-4 flex-1 justify-end">
              
              {/* Gamification HUD */}
              {user.role === UserRole.STUDENT && (
                  <div className="flex items-center gap-3 md:gap-6 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-200 mr-2">
                      {/* Streak */}
                      <div className="flex items-center gap-1.5" title={`${stats.currentStreak}日連続学習中！`}>
                          <Zap className={`w-4 h-4 ${stats.currentStreak > 0 ? 'text-orange-500 fill-orange-500' : 'text-slate-300'}`} />
                          <span className={`text-sm font-bold ${stats.currentStreak > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                              {stats.currentStreak}
                          </span>
                      </div>

                      {/* Divider */}
                      <div className="w-px h-4 bg-slate-200"></div>

                      {/* Level & XP */}
                      <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-6 h-6 bg-medace-100 text-medace-700 rounded-full text-xs font-bold border border-medace-200">
                              {stats.level}
                          </div>
                          <div className="flex flex-col w-20 md:w-32">
                              <div className="flex justify-between text-[10px] text-slate-500 font-bold mb-0.5">
                                  <span>LVL {stats.level}</span>
                                  <span>{stats.xp}/{xpToNext}</span>
                              </div>
                              <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                  <div 
                                      className="h-full bg-gradient-to-r from-medace-400 to-medace-600 rounded-full transition-all duration-1000 ease-out"
                                      style={{ width: `${progressPercent}%` }}
                                  ></div>
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              <nav className="hidden md:flex gap-1">
                <button 
                  onClick={() => onChangeView('dashboard')}
                  className={`px-3 py-2 rounded-md text-sm font-bold transition-colors ${currentView === 'dashboard' ? 'bg-medace-50 text-medace-600' : 'text-slate-600 hover:text-medace-500'}`}
                >
                  ホーム
                </button>
                {user.role === UserRole.ADMIN && (
                  <button 
                    onClick={() => onChangeView('admin')}
                    className={`px-3 py-2 rounded-md text-sm font-bold transition-colors ${currentView === 'admin' ? 'bg-medace-50 text-medace-600' : 'text-slate-600 hover:text-medace-500'}`}
                  >
                    管理画面
                  </button>
                )}
                {user.role === UserRole.INSTRUCTOR && (
                  <button 
                    onClick={() => onChangeView('instructor')}
                    className={`px-3 py-2 rounded-md text-sm font-bold transition-colors ${currentView === 'instructor' ? 'bg-medace-50 text-medace-600' : 'text-slate-600 hover:text-medace-500'}`}
                  >
                    生徒管理
                  </button>
                )}
              </nav>

              <div className="flex items-center gap-2">
                <div className="text-right hidden lg:block">
                  <p className="text-sm font-medium text-slate-800">{user.displayName}</p>
                </div>
                <button 
                  onClick={onLogout}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  title="ログアウト"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-sm">
          &copy; {new Date().getFullYear()} MedAce Education.
        </div>
      </footer>
    </div>
  );
};

export default Layout;
