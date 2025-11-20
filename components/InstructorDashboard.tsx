import React, { useEffect, useState } from 'react';
import { storage } from '../services/storage';
import { Users, Award, TrendingUp, Search } from 'lucide-react';

const InstructorDashboard: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const data = await storage.getAllStudentsProgress();
      setStudents(data);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="p-10 text-center text-slate-500">生徒データを読み込み中...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">クラスの進捗状況</h2>
          <p className="text-slate-500">生徒の学習パフォーマンスをリアルタイム分析</p>
        </div>
        <div className="bg-white p-2 rounded-lg border border-slate-200 flex items-center gap-2 shadow-sm">
            <Search className="w-4 h-4 text-slate-400" />
            <input type="text" placeholder="生徒を検索..." className="text-sm outline-none text-slate-600" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Users className="w-5 h-5" /></div>
                <span className="text-slate-500 font-medium">総生徒数</span>
            </div>
            <p className="text-3xl font-bold text-slate-800">{students.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-50 rounded-lg text-green-600"><Award className="w-5 h-5" /></div>
                <span className="text-slate-500 font-medium">総習得単語数</span>
            </div>
            <p className="text-3xl font-bold text-slate-800">
                {students.reduce((acc, s) => acc + s.totalLearned, 0)}
            </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-medace-50 rounded-lg text-medace-600"><TrendingUp className="w-5 h-5" /></div>
                <span className="text-slate-500 font-medium">アクティブな生徒</span>
            </div>
            <p className="text-3xl font-bold text-slate-800">
                {students.filter(s => s.totalAttempts > 0).length}
            </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                    <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">生徒名</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">習得単語数</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">クイズ挑戦数</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">最終ログイン</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">ステータス</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {students.length === 0 ? (
                    <tr><td colSpan={5} className="p-6 text-center text-slate-500">生徒データがありません</td></tr>
                ) : (
                    students.map((s) => (
                        <tr key={s.uid} className="hover:bg-slate-50 transition-colors">
                            <td className="py-4 px-6 font-medium text-slate-800">{s.name}</td>
                            <td className="py-4 px-6">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-medace-600">{s.totalLearned}</span>
                                    <span className="text-xs text-slate-400">語</span>
                                </div>
                            </td>
                            <td className="py-4 px-6 text-slate-600">{s.totalAttempts} 回</td>
                            <td className="py-4 px-6 text-slate-500 text-sm">
                                {new Date(s.lastActive).toLocaleDateString('ja-JP')}
                            </td>
                            <td className="py-4 px-6">
                                {s.totalLearned > 10 ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">順調</span>
                                ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">要確認</span>
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