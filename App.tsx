import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import StudyMode from './components/StudyMode';
import QuizMode from './components/QuizMode';
import AdminPanel from './components/AdminPanel';
import InstructorDashboard from './components/InstructorDashboard';
import { UserRole, UserProfile } from './types';
import { Loader2 } from 'lucide-react';

// --- Auth Simulation ---
const MOCK_USERS: UserProfile[] = [
  { uid: 'student1', displayName: '鈴木 健太', role: UserRole.STUDENT, email: 'kenta@medace.com' },
  { uid: 'instructor1', displayName: 'Oak 先生', role: UserRole.INSTRUCTOR, email: 'oak@medace.com' },
  { uid: 'admin1', displayName: 'システム管理者', role: UserRole.ADMIN, email: 'admin@medace.com' }
];

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentView, setCurrentView] = useState('login'); 
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  
  // Critical for preventing "Missing Permissions" errors: 
  // We must know the auth state before rendering data components.
  const [authLoading, setAuthLoading] = useState(false); 

  const handleLogin = async (role: UserRole) => {
    setAuthLoading(true);
    // Simulate Firebase Auth Network Delay
    setTimeout(() => {
      const mockUser = MOCK_USERS.find(u => u.role === role);
      if (mockUser) {
        setUser(mockUser);
        // Redirect based on role
        if (role === UserRole.ADMIN) setCurrentView('admin');
        else if (role === UserRole.INSTRUCTOR) setCurrentView('instructor');
        else setCurrentView('dashboard');
      }
      setAuthLoading(false);
    }, 800);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('login');
    setSelectedBookId(null);
  };

  const handleBookSelect = (bookId: string, mode: 'study' | 'quiz') => {
    setSelectedBookId(bookId);
    setCurrentView(mode);
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
        <div className="max-w-md mx-auto mt-20 bg-white p-8 rounded-2xl shadow-xl border border-slate-100 text-center">
          <div className="mb-8">
            <div className="w-16 h-16 bg-medace-500 rounded-xl mx-auto flex items-center justify-center mb-4">
              <span className="text-white text-2xl font-bold">M</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">MedAce Pro</h1>
            <p className="text-slate-500 mt-2">ロールを選択して学習環境へアクセスしてください</p>
          </div>
          <div className="space-y-3">
            <button 
              onClick={() => handleLogin(UserRole.STUDENT)}
              className="w-full py-3 bg-medace-600 text-white rounded-lg font-medium hover:bg-medace-700 transition-colors shadow-md shadow-medace-200"
            >
              生徒としてログイン
            </button>
            <button 
              onClick={() => handleLogin(UserRole.INSTRUCTOR)}
              className="w-full py-3 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-900 transition-colors"
            >
              講師としてログイン
            </button>
            <button 
              onClick={() => handleLogin(UserRole.ADMIN)}
              className="w-full py-3 bg-white border border-slate-300 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition-colors"
            >
              管理者としてログイン
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-6">セキュア・デモ環境</p>
        </div>
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