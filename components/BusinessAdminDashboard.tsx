import React, { useEffect, useState } from 'react';
import { OrganizationDashboardSnapshot, OrganizationRole, StudentRiskLevel, SUBSCRIPTION_PLAN_LABELS, UserProfile } from '../types';
import { storage } from '../services/storage';
import { getSubscriptionPolicy } from '../config/subscription';
import { AlertCircle, BellRing, Building2, Loader2, ShieldCheck, Users } from 'lucide-react';
import WorksheetPrintLauncher from './WorksheetPrintLauncher';

interface BusinessAdminDashboardProps {
  user: UserProfile;
}

const riskTone = (riskLevel: StudentRiskLevel): string => {
  if (riskLevel === StudentRiskLevel.DANGER) return 'border-red-200 bg-red-50 text-red-700';
  if (riskLevel === StudentRiskLevel.WARNING) return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
};

const riskLabel = (riskLevel: StudentRiskLevel): string => {
  if (riskLevel === StudentRiskLevel.DANGER) return '要フォロー';
  if (riskLevel === StudentRiskLevel.WARNING) return '見守り';
  return '安定';
};

const formatDays = (timestamp: number): string => {
  if (!timestamp) return '未学習';
  const days = Math.max(0, Math.floor((Date.now() - timestamp) / 86400000));
  if (days === 0) return '今日';
  return `${days}日前`;
};

const MetricCard: React.FC<{ label: string; value: string; detail: string; }> = ({ label, value, detail }) => (
  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
    <div className="text-sm font-bold text-slate-500">{label}</div>
    <div className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</div>
    <div className="mt-2 text-sm text-slate-500">{detail}</div>
  </div>
);

const BusinessAdminDashboard: React.FC<BusinessAdminDashboardProps> = ({ user }) => {
  const [snapshot, setSnapshot] = useState<OrganizationDashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const nextSnapshot = await storage.getOrganizationDashboardSnapshot();
        setSnapshot(nextSnapshot);
      } catch (loadError) {
        console.error(loadError);
        setError((loadError as Error).message || '組織ダッシュボードの取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-slate-500">
        <Loader2 className="h-10 w-10 animate-spin text-medace-500" />
        <p className="mt-3 text-sm font-medium">組織データを集計中...</p>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="rounded-[28px] border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700">
        {error || '組織データがありません。'}
      </div>
    );
  }

  const policy = getSubscriptionPolicy(snapshot.subscriptionPlan);
  const planCoverageRate = snapshot.totalStudents > 0
    ? Math.round((snapshot.learningPlanCount / snapshot.totalStudents) * 100)
    : 0;

  return (
    <div className="space-y-8 pb-12">
      <section className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#2F1609_0%,#66321A_42%,#F66D0B_100%)] p-8 text-white shadow-[0_24px_60px_rgba(228,94,4,0.18)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,191,82,0.34),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(252,215,151,0.24),_transparent_22%)]"></div>
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-white/90">
                {SUBSCRIPTION_PLAN_LABELS[snapshot.subscriptionPlan]}
              </span>
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-white/90">
                グループ管理者
              </span>
            </div>
            <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-white/90">
              {user.displayName}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3 text-medace-100">
            <Building2 className="h-5 w-5" />
            <span className="text-sm font-bold">{snapshot.organizationName}</span>
          </div>
          <h2 className="mt-3 text-3xl font-black tracking-tight">教室運用を一画面で見渡す</h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/75">
            サービス運営画面ではなく、あなたのグループだけを管理する画面です。生徒の稼働、講師のフォロー、学習プラン浸透を組織単位で確認できます。
          </p>

          <div className="mt-7 grid gap-3 md:grid-cols-3">
            {[
              '広告なしで教室配布に耐える画面設計',
              '講師フォローと学習プランの運用率を可視化',
              'サービス全体ではなく、自組織の状態だけに集中',
            ].map((item) => (
              <div key={item} className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/82">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-4">
        <MetricCard label="メンバー" value={`${snapshot.totalMembers}`} detail={`${snapshot.totalStudents}名の生徒 / ${snapshot.totalInstructors}名の講師`} />
        <MetricCard label="7日稼働" value={`${snapshot.activeStudents7d}`} detail="1週間以内に学習履歴がある生徒" />
        <MetricCard label="要フォロー" value={`${snapshot.atRiskStudents}`} detail="学習が止まりかけている生徒" />
        <MetricCard label="プラン浸透" value={`${planCoverageRate}%`} detail="学習プランが設定済みの割合" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.98fr_1.02fr]">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-medace-600" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Plan Fit</p>
              <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950">この組織向けプランで担保すること</h3>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {policy.featureSummary.map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-relaxed text-slate-700">
                {item}
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">広告</div>
              <div className="mt-2 text-lg font-black text-slate-950">なし</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">通知数</div>
              <div className="mt-2 text-lg font-black text-slate-950">{snapshot.notifications7d}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">教材運用</div>
              <div className="mt-2 text-lg font-black text-slate-950">組織共有</div>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-medace-600" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Instructor Ops</p>
              <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950">講師体制</h3>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {snapshot.instructors.map((instructor) => (
              <div key={instructor.uid} className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-slate-950">{instructor.displayName}</div>
                    <div className="mt-1 text-xs text-slate-400">{instructor.email}</div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                    instructor.organizationRole === OrganizationRole.GROUP_ADMIN
                      ? 'border-medace-200 bg-medace-50 text-medace-800'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}>
                    {instructor.organizationRole === OrganizationRole.GROUP_ADMIN ? '管理者' : '講師'}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white bg-white px-4 py-3">
                    <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">接触生徒</div>
                    <div className="mt-2 text-2xl font-black text-slate-950">{instructor.notifiedStudentCount}</div>
                  </div>
                  <div className="rounded-2xl border border-white bg-white px-4 py-3">
                    <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">7日通知</div>
                    <div className="mt-2 text-2xl font-black text-slate-950">{instructor.notifications7d}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Worksheet Ops</p>
            <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950">配布用PDF問題</h3>
            <p className="mt-2 text-sm text-slate-500">学習済み単語を問題形式にして、そのまま印刷またはPDF保存できます。</p>
          </div>
          <WorksheetPrintLauncher
            user={user}
            buttonLabel="生徒別にPDF問題を作る"
            buttonClassName="inline-flex items-center gap-2 rounded-2xl bg-medace-700 px-4 py-3 text-sm font-bold text-white hover:bg-medace-800"
          />
        </div>
      </section>

      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Student Queue</p>
            <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950">今見ておきたい生徒</h3>
          </div>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {snapshot.atRiskStudentList.map((student) => (
            <div key={student.uid} className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-950">{student.name}</div>
                  <div className="mt-1 text-xs text-slate-400">{student.email}</div>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${riskTone(student.riskLevel)}`}>
                  {riskLabel(student.riskLevel)}
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white bg-white px-4 py-3">
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">最終学習</div>
                  <div className="mt-2 text-lg font-black text-slate-950">{formatDays(student.lastActive)}</div>
                </div>
                <div className="rounded-2xl border border-white bg-white px-4 py-3">
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">習得語</div>
                  <div className="mt-2 text-lg font-black text-slate-950">{student.totalLearned}</div>
                </div>
                <div className="rounded-2xl border border-white bg-white px-4 py-3">
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">正答率</div>
                  <div className="mt-2 text-lg font-black text-slate-950">{Math.round((student.accuracy || 0) * 100)}%</div>
                </div>
              </div>
              {student.lastNotificationMessage && (
                <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
                    <BellRing className="h-4 w-4" /> 直近の講師フォロー
                  </div>
                  <div className="mt-2 leading-relaxed">{student.lastNotificationMessage}</div>
                </div>
              )}
            </div>
          ))}
          {snapshot.atRiskStudentList.length === 0 && (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-5 text-sm text-emerald-800">
              今すぐ介入が必要な生徒はいません。運用は安定しています。
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default BusinessAdminDashboard;
