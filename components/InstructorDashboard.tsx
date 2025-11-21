
import React, { useEffect, useState } from 'react';
import { storage } from '../services/storage';
import { StudentSummary, StudentRiskLevel } from '../types';
import { Users, Award, TrendingUp, Search, AlertCircle, Bell, CheckCircle2 } from 'lucide-react';

const InstructorDashboard: React.FC = () => {
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'DANGER'>('ALL');

  useEffect(() => {
    const fetchData = async () => {
      const data = await storage.getAllStudentsProgress();
      setStudents(data);
      setLoading(false);
    };
    fetchData();
  }, []);

  const getRiskStyle = (risk: StudentRiskLevel) => {
    switch(risk) {
        case StudentRiskLevel.DANGER: return "bg-red-50 text-red-700 border-red-200";
        case StudentRiskLevel.WARNING: return "bg-orange-50 text-orange-700 border-orange-200";
        default: return "bg-green-50 text-green-700 border-green-200";
    }
  };

  const handleNudge = (studentName: string) => {
      alert(`[Ghost Teacher]\n${studentName} さんへ学習催促のプッシュ通知を送信しました。\n「3日間ログインしていませんが、大丈夫ですか？」`);
  };

  if (loading) {
    return <div className="p-10 text-center text-slate-500">生徒データを分析中...</div>;
  }

  const atRiskCount = students.filter(s => s.riskLevel === StudentRiskLevel.DANGER).length;
  const filteredStudents = filter === 'DANGER' 
    ? students.filter(s => s.riskLevel === StudentRiskLevel.DANGER)
    : students;

  return (
    <div className="space-y-8 animate-in fade-in pb-12">
      
      {/* PROPOSAL B: Ghost Teacher Alert System */}
      {atRiskCount > 0 && (
          <div className="bg-red-600 rounded-2xl shadow-lg p-6 text-white flex items-center justify-between animate-pulse relative overflow-hidden">
              <div className="relative z-10">
                  <div className="flex items-center gap-2 font-bold text-red-100 mb-1 text-sm uppercase tracking-wider">
                      <AlertCircle className="w-4 h-4" /> 要注意
                  </div>
                  <h2 className="text-2xl font-bold">学習停止中の生徒が {atRiskCount} 名います</h2>
                  <p className="text-red-100">3日以上ログインがない生徒は、離脱リスクが高まっています。</p>
              </div>
              <button 
                onClick={() => setFilter('DANGER')}
                className="relative z-10 bg-white text-red-600 px-6 py-3 rounded-xl font-bold hover:bg-red-50 transition-colors shadow-md"
              >
                対象者を確認する
              </button>
              {/* BG Effect */}
              <div className="absolute right-0 top-0 opacity-10 transform translate-x-10 -translate-y-10">
                  <AlertCircle size={150} />
              </div>
          </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Ghost Teacher Dashboard</h2>
          <p className="text-slate-500">生徒の学習進捗とリスク管理</p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={() => setFilter('ALL')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${filter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
            >
                全生徒を表示
            </button>
            <div className="bg-white p-2 rounded-lg border border-slate-200 flex items-center gap-2 shadow-sm w-64">
                <Search className="w-4 h-4 text-slate-400" />
                <input type="text" placeholder="生徒を検索..." className="text-sm outline-none text-slate-600 w-full" />
            </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Users className="w-5 h-5" /></div>
                <span className="text-slate-500 font-medium">登録生徒</span>
            </div>
            <p className="text-3xl font-bold text-slate-800">{students.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-50 rounded-lg text-green-600"><Award className="w-5 h-5" /></div>
                <span className="text-slate-500 font-medium">総習得単語</span>
            </div>
            <p className="text-3xl font-bold text-slate-800">
                {students.reduce((acc, s) => acc + s.totalLearned, 0)}
            </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-50 rounded-lg text-red-600"><AlertCircle className="w-5 h-5" /></div>
                <span className="text-slate-500 font-medium">離脱リスク (High)</span>
            </div>
            <p className="text-3xl font-bold text-red-600">
                {atRiskCount}
            </p>
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                    <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">リスクレベル</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">生徒名</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">習得単語数</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">最終アクセス</th>
                    <th className="text-right py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">アクション</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                    <tr><td colSpan={5} className="p-10 text-center text-slate-500">該当する生徒はいません</td></tr>
                ) : (
                    filteredStudents.map((s) => (
                        <tr key={s.uid} className="hover:bg-slate-50 transition-colors">
                            <td className="py-4 px-6">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getRiskStyle(s.riskLevel)}`}>
                                    {s.riskLevel}
                                </span>
                            </td>
                            <td className="py-4 px-6">
                                <div className="font-bold text-slate-800">{s.name}</div>
                                <div className="text-xs text-slate-400">{s.email}</div>
                            </td>
                            <td className="py-4 px-6">
                                <div className="flex items-center gap-1">
                                    <span className="font-bold text-medace-600">{s.totalLearned}</span>
                                    <span className="text-xs text-slate-400">語</span>
                                </div>
                            </td>
                            <td className="py-4 px-6 text-slate-500 text-sm">
                                {s.lastActive > 0 ? (
                                    <>
                                        {new Date(s.lastActive).toLocaleDateString('ja-JP')}
                                        <span className="text-xs text-slate-400 ml-2">
                                            ({Math.floor((Date.now() - s.lastActive) / (1000 * 60 * 60 * 24))}日前)
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-slate-400">未アクセス</span>
                                )}
                            </td>
                            <td className="py-4 px-6 text-right">
                                {s.riskLevel !== StudentRiskLevel.SAFE ? (
                                    <button 
                                        onClick={() => handleNudge(s.name)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 transition-colors"
                                    >
                                        <Bell className="w-3 h-3" /> 通知を送る
                                    </button>
                                ) : (
                                    <span className="text-green-500 inline-flex items-center gap-1 text-xs font-medium">
                                        <CheckCircle2 className="w-4 h-4" /> OK
                                    </span>
                                )}
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default InstructorDashboard;
