import React, { useEffect, useMemo, useState } from 'react';
import { STATUS_LABELS, StudentSummary, StudentWorksheetSnapshot, UserProfile, WorksheetQuestionMode } from '../types';
import { storage } from '../services/storage';
import { GeneratedWorksheetQuestion, generateWorksheetQuestions, WORKSHEET_MODE_COPY } from '../utils/worksheet';
import { BookOpen, FileDown, Loader2, Printer, ShieldCheck, X } from 'lucide-react';

type WorksheetStatusFilter = 'ALL' | 'REVIEW_PLUS' | 'GRADUATED_ONLY';

interface WorksheetPrintLauncherProps {
  user: UserProfile;
  buttonLabel?: string;
  buttonClassName?: string;
}

const STATUS_FILTER_COPY: Record<WorksheetStatusFilter, { label: string; description: string; }> = {
  ALL: {
    label: '学習済みすべて',
    description: '習得中を含めて、学習履歴がある単語を出題します。',
  },
  REVIEW_PLUS: {
    label: '復習期以上',
    description: '復習期と定着済みを中心に、確認テスト向けに絞ります。',
  },
  GRADUATED_ONLY: {
    label: '定着済みのみ',
    description: '一度定着した語彙だけを再確認したいときに使います。',
  },
};

const formatDate = (timestamp: number): string => new Date(timestamp).toLocaleString('ja-JP', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const shouldIncludeStatus = (filter: WorksheetStatusFilter, status: string): boolean => {
  if (filter === 'GRADUATED_ONLY') return status === 'graduated';
  if (filter === 'REVIEW_PLUS') return status === 'review' || status === 'graduated';
  return true;
};

const buildPrintableWorksheetHtml = (
  user: UserProfile,
  student: StudentSummary | undefined,
  snapshot: StudentWorksheetSnapshot,
  questions: GeneratedWorksheetQuestion[],
): string => {
  const modeLabel = questions[0] ? WORKSHEET_MODE_COPY[questions[0].mode].label : '問題';
  const questionMarkup = questions.map((question, index) => {
    if (question.mode === 'SPELLING_HINT') {
      return `
        <section class="question-card">
          <div class="question-header">Q${index + 1}. ${question.promptText}</div>
          <div class="question-note">ヒント: ${question.maskedAnswer}</div>
          <div class="answer-line"></div>
          <div class="book-tag">${question.bookTitle || '単語帳'}</div>
        </section>
      `;
    }

    const optionsMarkup = (question.options || []).map((option, optionIndex) => `
      <li><span class="option-label">${String.fromCharCode(65 + optionIndex)}.</span> ${option}</li>
    `).join('');

    return `
      <section class="question-card">
        <div class="question-header">Q${index + 1}. ${question.promptText}</div>
        <ul class="option-list">${optionsMarkup}</ul>
        <div class="book-tag">${question.bookTitle || '単語帳'}</div>
      </section>
    `;
  }).join('');

  const answerMarkup = questions.map((question, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${question.promptText}</td>
      <td>${question.answer}</td>
      <td>${question.bookTitle || '単語帳'}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
  <html lang="ja">
    <head>
      <meta charset="UTF-8" />
      <title>${snapshot.studentName} - ${modeLabel} ワークシート</title>
      <style>
        :root {
          color-scheme: light;
          --ink: #1f2937;
          --muted: #6b7280;
          --line: #d1d5db;
          --accent: #f66d0b;
          --soft: #fff7ed;
        }
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 28px;
          font-family: "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif;
          color: var(--ink);
          background: white;
        }
        .sheet-header {
          border: 2px solid var(--accent);
          border-radius: 20px;
          padding: 20px 22px;
          background: linear-gradient(135deg, #fff7ed 0%, #ffffff 100%);
        }
        .eyebrow {
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--muted);
          font-weight: 700;
        }
        .title {
          margin: 10px 0 0;
          font-size: 28px;
          font-weight: 800;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-top: 18px;
        }
        .meta-card {
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 12px 14px;
          background: white;
        }
        .meta-card .label {
          font-size: 11px;
          font-weight: 700;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.14em;
        }
        .meta-card .value {
          margin-top: 8px;
          font-size: 16px;
          font-weight: 800;
        }
        .question-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-top: 24px;
        }
        .question-card {
          min-height: 182px;
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 16px 18px;
          break-inside: avoid;
        }
        .question-header {
          font-size: 18px;
          font-weight: 700;
          line-height: 1.45;
        }
        .question-note {
          margin-top: 12px;
          display: inline-block;
          padding: 8px 12px;
          border-radius: 999px;
          background: var(--soft);
          color: #9a3412;
          font-weight: 700;
          letter-spacing: 0.2em;
        }
        .option-list {
          margin: 16px 0 0;
          padding: 0;
          list-style: none;
        }
        .option-list li {
          margin-top: 10px;
          font-size: 15px;
          line-height: 1.5;
        }
        .option-label {
          display: inline-block;
          width: 24px;
          font-weight: 800;
        }
        .answer-line {
          margin-top: 26px;
          border-bottom: 2px solid #9ca3af;
          height: 36px;
        }
        .book-tag {
          margin-top: 16px;
          font-size: 12px;
          color: var(--muted);
        }
        .answer-sheet {
          margin-top: 40px;
          break-before: page;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 14px;
        }
        th, td {
          border: 1px solid var(--line);
          padding: 10px 12px;
          text-align: left;
          vertical-align: top;
          font-size: 13px;
          line-height: 1.45;
        }
        th {
          background: #f8fafc;
          font-weight: 800;
        }
        .footer {
          margin-top: 18px;
          font-size: 11px;
          color: var(--muted);
        }
        @page {
          size: A4;
          margin: 14mm;
        }
        @media print {
          body {
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <header class="sheet-header">
        <div class="eyebrow">PDF Worksheet</div>
        <h1 class="title">${snapshot.studentName} さん用 ${modeLabel} ワークシート</h1>
        <div class="meta-grid">
          <div class="meta-card">
            <div class="label">作成者</div>
            <div class="value">${user.displayName}</div>
          </div>
          <div class="meta-card">
            <div class="label">生徒</div>
            <div class="value">${student?.name || snapshot.studentName}</div>
          </div>
          <div class="meta-card">
            <div class="label">組織</div>
            <div class="value">${snapshot.organizationName || '-'}</div>
          </div>
          <div class="meta-card">
            <div class="label">作成日時</div>
            <div class="value">${formatDate(Date.now())}</div>
          </div>
        </div>
      </header>

      <main class="question-grid">${questionMarkup}</main>

      <section class="answer-sheet">
        <div class="eyebrow">Answer Key</div>
        <h2 class="title" style="font-size: 22px;">解答一覧</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 60px;">No.</th>
              <th>問題</th>
              <th>正解</th>
              <th style="width: 160px;">単語帳</th>
            </tr>
          </thead>
          <tbody>${answerMarkup}</tbody>
        </table>
      </section>

      <div class="footer">ブラウザの印刷ダイアログで「PDF に保存」を選ぶと、そのまま配布用PDFとして保存できます。</div>
      <script>
        window.addEventListener('load', () => {
          setTimeout(() => window.print(), 300);
        });
      </script>
    </body>
  </html>`;
};

const WorksheetPrintLauncher: React.FC<WorksheetPrintLauncherProps> = ({
  user,
  buttonLabel = 'PDF問題を作る',
  buttonClassName = 'inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:border-medace-300 hover:text-medace-700',
}) => {
  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<StudentWorksheetSnapshot | null>(null);
  const [selectedStudentUid, setSelectedStudentUid] = useState('');
  const [selectedBookId, setSelectedBookId] = useState('ALL');
  const [questionCount, setQuestionCount] = useState(12);
  const [questionMode, setQuestionMode] = useState<WorksheetQuestionMode>('JA_TO_EN');
  const [statusFilter, setStatusFilter] = useState<WorksheetStatusFilter>('REVIEW_PLUS');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const loadStudents = async () => {
      setStudentsLoading(true);
      setError(null);
      try {
        const nextStudents = await storage.getAllStudentsProgress();
        setStudents(nextStudents);
        if (!selectedStudentUid && nextStudents[0]) {
          setSelectedStudentUid(nextStudents[0].uid);
        }
      } catch (loadError) {
        console.error(loadError);
        setError((loadError as Error).message || '生徒一覧の取得に失敗しました。');
      } finally {
        setStudentsLoading(false);
      }
    };

    loadStudents();
  }, [open, selectedStudentUid]);

  useEffect(() => {
    if (!open || !selectedStudentUid) return;

    const loadSnapshot = async () => {
      setSnapshotLoading(true);
      setError(null);
      try {
        const nextSnapshot = await storage.getStudentWorksheetSnapshot(selectedStudentUid);
        setSnapshot(nextSnapshot);
      } catch (loadError) {
        console.error(loadError);
        setError((loadError as Error).message || '印刷対象データの取得に失敗しました。');
      } finally {
        setSnapshotLoading(false);
      }
    };

    loadSnapshot();
  }, [open, selectedStudentUid]);

  const selectedStudent = students.find((student) => student.uid === selectedStudentUid);

  const bookOptions = useMemo(() => {
    const map = new Map<string, string>();
    snapshot?.words.forEach((word) => {
      map.set(word.bookId, word.bookTitle);
    });
    return [...map.entries()].map(([bookId, title]) => ({ bookId, title }));
  }, [snapshot]);

  const filteredWords = useMemo(() => {
    if (!snapshot) return [];

    return snapshot.words.filter((word) => {
      if (selectedBookId !== 'ALL' && word.bookId !== selectedBookId) return false;
      return shouldIncludeStatus(statusFilter, word.status);
    });
  }, [selectedBookId, snapshot, statusFilter]);

  const handlePrint = () => {
    if (!snapshot || filteredWords.length === 0) return;

    const questions = generateWorksheetQuestions(filteredWords, questionMode, questionCount);
    if (questions.length === 0) {
      setError('問題に使える単語が不足しています。条件を緩めてください。');
      return;
    }

    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=900');
    if (!printWindow) {
      setError('印刷ウィンドウを開けませんでした。ポップアップを許可してください。');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildPrintableWorksheetHtml(user, selectedStudent, snapshot, questions));
    printWindow.document.close();
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClassName}>
        <FileDown className="h-4 w-4" />
        {buttonLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-medace-900/35 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">PDF Worksheet</p>
                <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">学習済み単語から配布用問題を作る</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  講師またはグループ管理者が、生徒の学習履歴に合わせた確認問題を印刷または PDF 保存できます。
                </p>
              </div>
              <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                ブラウザ印刷 {'->'} PDF保存対応
              </div>
            </div>

            {error && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-6 grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">対象生徒</label>
                  <select
                    value={selectedStudentUid}
                    onChange={(event) => setSelectedStudentUid(event.target.value)}
                    disabled={studentsLoading}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-medace-500 focus:ring-2 focus:ring-medace-100"
                  >
                    <option value="">生徒を選択</option>
                    {students.map((student) => (
                      <option key={student.uid} value={student.uid}>
                        {student.name} / {student.organizationName || '個人利用'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">出題書籍</label>
                  <select
                    value={selectedBookId}
                    onChange={(event) => setSelectedBookId(event.target.value)}
                    disabled={snapshotLoading || bookOptions.length === 0}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-medace-500 focus:ring-2 focus:ring-medace-100"
                  >
                    <option value="ALL">すべての単語帳</option>
                    {bookOptions.map((book) => (
                      <option key={book.bookId} value={book.bookId}>{book.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">出題モード</label>
                  <div className="grid gap-3">
                    {(Object.keys(WORKSHEET_MODE_COPY) as WorksheetQuestionMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setQuestionMode(mode)}
                        className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                          questionMode === mode
                            ? 'border-medace-500 bg-medace-50'
                            : 'border-slate-200 bg-slate-50 hover:border-medace-200 hover:bg-white'
                        }`}
                      >
                        <div className="text-sm font-bold text-slate-900">{WORKSHEET_MODE_COPY[mode].label}</div>
                        <div className="mt-1 text-sm text-slate-500">{WORKSHEET_MODE_COPY[mode].description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">学習ステータス</label>
                  <div className="grid gap-3">
                    {(Object.keys(STATUS_FILTER_COPY) as WorksheetStatusFilter[]).map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setStatusFilter(filter)}
                        className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                          statusFilter === filter
                            ? 'border-medace-500 bg-medace-50'
                            : 'border-slate-200 bg-slate-50 hover:border-medace-200 hover:bg-white'
                        }`}
                      >
                        <div className="text-sm font-bold text-slate-900">{STATUS_FILTER_COPY[filter].label}</div>
                        <div className="mt-1 text-sm text-slate-500">{STATUS_FILTER_COPY[filter].description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">問題数</label>
                  <input
                    type="number"
                    min={4}
                    max={30}
                    value={questionCount}
                    onChange={(event) => setQuestionCount(Math.max(4, Math.min(30, Number(event.target.value) || 4)))}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-medace-500 focus:ring-2 focus:ring-medace-100"
                  />
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#fff9f2_0%,#ffffff_100%)] p-5">
                {(studentsLoading || snapshotLoading) ? (
                  <div className="flex min-h-[420px] flex-col items-center justify-center text-slate-500">
                    <Loader2 className="h-8 w-8 animate-spin text-medace-500" />
                    <div className="mt-3 text-sm font-medium">印刷データを準備中...</div>
                  </div>
                ) : snapshot ? (
                  <>
                    <div className="flex items-center gap-3 text-medace-700">
                      <ShieldCheck className="h-5 w-5" />
                      <span className="text-sm font-bold">出題プレビュー</span>
                    </div>
                    <h4 className="mt-3 text-xl font-black tracking-tight text-slate-950">
                      {snapshot.studentName} さん向けワークシート
                    </h4>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                      条件に合う学習済み単語から、紙配布しやすい問題形式で出力します。
                    </p>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                        <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">対象語数</div>
                        <div className="mt-2 text-3xl font-black text-slate-950">{filteredWords.length}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                        <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">出力数</div>
                        <div className="mt-2 text-3xl font-black text-slate-950">{Math.min(questionCount, filteredWords.length)}</div>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      {[
                        { label: '習得中', count: filteredWords.filter((word) => word.status === 'learning').length },
                        { label: '復習期', count: filteredWords.filter((word) => word.status === 'review').length },
                        { label: '定着済', count: filteredWords.filter((word) => word.status === 'graduated').length },
                      ].map((item) => (
                        <div key={item.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                          <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{item.label}</div>
                          <div className="mt-2 text-2xl font-black text-slate-950">{item.count}</div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 rounded-3xl border border-slate-200 bg-white px-4 py-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        <BookOpen className="h-4 w-4 text-medace-600" />
                        問題候補
                      </div>
                      <div className="mt-3 space-y-2">
                        {filteredWords.slice(0, 6).map((word) => (
                          <div key={word.wordId} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
                            <div>
                              <div className="text-sm font-bold text-slate-900">{word.word}</div>
                              <div className="mt-1 text-sm text-slate-500">{word.definition}</div>
                            </div>
                            <div className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500">
                              {STATUS_LABELS[word.status]}
                            </div>
                          </div>
                        ))}
                        {filteredWords.length === 0 && (
                          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                            条件に合う学習済み単語がありません。書籍かステータス条件を緩めてください。
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
                      >
                        閉じる
                      </button>
                      <button
                        type="button"
                        onClick={handlePrint}
                        disabled={filteredWords.length === 0}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-medace-700 px-5 py-3 text-sm font-bold text-white hover:bg-medace-800 disabled:opacity-50"
                      >
                        <Printer className="h-4 w-4" />
                        PDF / 印刷を開く
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white text-slate-500">
                    <div className="text-sm">生徒を選ぶと印刷候補を表示します。</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WorksheetPrintLauncher;
