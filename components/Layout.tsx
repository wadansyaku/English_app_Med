import React from 'react';
import { BookOpen, LogOut, User, Shield, GraduationCap, Activity } from 'lucide-react';
import { UserRole, UserProfile } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: UserProfile | null;
  onLogout: () => void;
  currentView: string;
  onChangeView: (view: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, currentView, onChangeView }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onChangeView('dashboard')}>
            <div className="bg-medace-500 p-2 rounded-lg">
              <BookOpen className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">MedAce<span className="text-medace-500">Pro</span></h1>
              <p className="text-xs text-slate-500 font-medium -mt-1">学習スペース</p>
            </div>
          </div>

          {user && (
            <div className="flex items-center gap-4">
              <nav className="hidden md:flex gap-1">
                <button 
                  onClick={() => onChangeView('dashboard')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'dashboard' ? 'bg-medace-50 text-medace-600' : 'text-slate-600 hover:text-medace-500'}`}
                >
                  ダッシュボード
                </button>
                {user.role === UserRole.ADMIN && (
                  <button 
                    onClick={() => onChangeView('admin')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'admin' ? 'bg-medace-50 text-medace-600' : 'text-slate-600 hover:text-medace-500'}`}
                  >
                    管理画面
                  </button>
                )}
                {user.role === UserRole.INSTRUCTOR && (
                  <button 
                    onClick={() => onChangeView('instructor')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'instructor' ? 'bg-medace-50 text-medace-600' : 'text-slate-600 hover:text-medace-500'}`}
                  >
                    生徒一覧
                  </button>
                )}
              </nav>

              <div className="h-8 w-px bg-slate-200 mx-2"></div>

              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-slate-800">{user.displayName}</p>
                  <p className="text-xs text-slate-500 capitalize">
                    {user.role === UserRole.STUDENT ? '生徒' : user.role === UserRole.INSTRUCTOR ? '講師' : '管理者'}
                  </p>
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
          &copy; {new Date().getFullYear()} MedAce Education. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Layout;