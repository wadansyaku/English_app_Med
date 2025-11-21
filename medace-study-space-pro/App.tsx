
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import StudyMode from './components/StudyMode';
import QuizMode from './components/QuizMode';
import AdminPanel from './components/AdminPanel';
import InstructorDashboard from './components/InstructorDashboard';
import Onboarding from './components/Onboarding';
import { UserRole, UserProfile } from './types';
import { storage } from './services/storage';
import { Loader2, Lock, Mail, LogIn, UserPlus } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentView, setCurrentView] = useState('login'); 
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Login Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');

  // --- Restore Session (Async) ---
  useEffect(() => {
    const initSession = async () => {
      try {
        const sessionUser = await storage.getSession();
        if (sessionUser) {
          setUser(sessionUser);
          // Route based on role
          if (sessionUser.role === UserRole.ADMIN) setCurrentView('admin');
          else if (sessionUser.role === UserRole.INSTRUCTOR) setCurrentView('instructor');
          else setCurrentView('dashboard');
        }
      } catch (e) {
        console.error("Session restore failed", e);
      } finally {
        setAuthLoading(false);
      }
    };
    initSession();
  }, []);

  const handleDemoLogin = async (role: UserRole) => {
    // Prompt removed for frictionless demo access
    // Only prompt for Admin to prevent accidental access
    if (role === UserRole.ADMIN) {
         const passwordInput = window.prompt("管理用パスワード (admin):");
         if (passwordInput !== 'admin') {
             alert("パスワードが間違っています。");
             return;
         }
    }

    setAuthLoading(true);
    try {
      const loggedInUser = await storage.login(role);
      if (loggedInUser) {
        setUser(loggedInUser);
        if (role === UserRole.ADMIN) setCurrentView('admin');
        else if (role === UserRole.INSTRUCTOR) setCurrentView('instructor');
        else setCurrentView('dashboard');
      } else {
        alert("ログインに失敗しました。");
      }
    } catch (e) {
      console.error("Login failed", e);
      alert("ログインエラーが発生しました。");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!email || !password) return;
      
      setAuthLoading(true);
      try {
          const loggedInUser = await storage.authenticate(email, password, authMode === 'SIGNUP');
          if (loggedInUser) {
              setUser(loggedInUser);
              setCurrentView('dashboard');
          }
      } catch (err: any) {
          alert(err.message || "認証エラーが発生しました。");
      } finally {
          setAuthLoading(false);
      }
  };

  const handleLogout = async () => {
    setUser(null);
    await storage.clearSession();
    setCurrentView('login');
    setSelectedBookId(null);
    setEmail('');
    setPassword('');
  };

  const handleBookSelect = (bookId: string, mode: 'study' | 'quiz') => {
    setSelectedBookId(bookId);
    setCurrentView(mode);
  };

  const handleSessionComplete = (updatedUser: UserProfile) => {
    setUser(updatedUser);
    setCurrentView('dashboard');
  };

  // --- Render Views ---
  const renderContent = () => {
    if (authLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="w-12 h-12 text-medace-500 animate-spin mb-4" />
          <p className="text-slate-500">認証中...</p>
        </div>
      );
    }

    if (!user) {
      return (
        <div className="max-w-md mx-auto mt-10 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="bg-slate-50 p-6 text-center border-b border-slate-100">
            <div className="w-16 h-16 bg-medace-500 rounded-xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-medace-200">
              <span className="text-white text-2xl font-bold">M</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">MedAce Pro</h1>
            <p className="text-slate-500 text-sm mt-1">Secure Learning Environment</p>
          </div>

          <div className="p-8 space-y-8">
            {/* Manual Auth Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                        <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-medace-500 focus:border-medace-500 outline-none transition-all"
                            placeholder="your@email.com"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-medace-500 focus:border-medace-500 outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>
                </div>
                
                {/* Inline Auth Error (if any managed by state in future, currently alert) */}

                <button 
                    type="submit"
                    className="w-full py-3 bg-medace-600 text-white rounded-lg font-bold hover:bg-medace-700 transition-colors shadow-md flex items-center justify-center gap-2"
                >
                    {authMode === 'LOGIN' ? (
                        <><LogIn className="w-4 h-4" /> ログイン</>
                    ) : (
                        <><UserPlus className="w-4 h-4" /> 新規登録</>
                    )}
                </button>

                <div className="text-center text-xs">
                    <span className="text-slate-400">
                        {authMode === 'LOGIN' ? "アカウントをお持ちでないですか？" : "すでにアカウントをお持ちですか？"}
                    </span>
                    <button 
                        type="button"
                        onClick={() => setAuthMode(authMode === 'LOGIN' ? 'SIGNUP' : 'LOGIN')}
                        className="text-medace-600 font-bold ml-2 hover:underline"
                    >
                        {authMode === 'LOGIN' ? "新規登録はこちら" : "ログインはこちら"}
                    </button>
                </div>
            </form>

            <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase">ワンクリックで体験 (Demo)</span>
                <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Demo Buttons */}
            <div className="grid grid-cols-2 gap-3">
                <button 
                onClick={() => handleDemoLogin(UserRole.STUDENT)}
                className="py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors"
                >
                Demo Student
                </button>
                <button 
                onClick={() => handleDemoLogin(UserRole.INSTRUCTOR)}
                className="py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors"
                >
                Demo Teacher
                </button>
            </div>
             <button 
                onClick={() => handleDemoLogin(UserRole.ADMIN)}
                className="w-full py-2 border border-slate-200 text-slate-400 rounded-lg text-xs font-bold hover:text-slate-600 hover:border-slate-300 transition-colors"
            >
                Admin Access
            </button>
          </div>
        </div>
      );
    }

    // --- Onboarding Check ---
    if (user.needsOnboarding) {
      return (
        <Onboarding 
          user={user} 
          onComplete={(updated) => {
            setUser(updated);
            setCurrentView('dashboard');
          }} 
        />
      );
    }

    switch (currentView) {
      case 'dashboard':
        return <Dashboard user={user} onSelectBook={handleBookSelect} />;
      case 'study':
        return selectedBookId ? (
          <StudyMode 
            user={user} 
            bookId={selectedBookId} 
            onBack={() => setCurrentView('dashboard')}
            onSessionComplete={handleSessionComplete}
          />
        ) : null;
      case 'quiz':
        return selectedBookId ? (
          <QuizMode 
            user={user} 
            bookId={selectedBookId} 
            onBack={() => setCurrentView('dashboard')} 
          />
        ) : null;
      case 'admin':
        return user.role === UserRole.ADMIN ? <AdminPanel /> : <div className="p-8 text-center text-red-500">アクセス権限がありません</div>;
      case 'instructor':
        return user.role === UserRole.INSTRUCTOR ? <InstructorDashboard /> : <div className="p-8 text-center text-red-500">アクセス権限がありません</div>;
      default:
        return <Dashboard user={user} onSelectBook={handleBookSelect} />;
    }
  };

  return (
    <Layout 
      user={user} 
      onLogout={handleLogout}
      currentView={currentView}
      onChangeView={setCurrentView}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
