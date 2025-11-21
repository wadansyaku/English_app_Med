
import React, { useState } from 'react';
import { storage } from '../services/storage';
import { extractVocabularyFromText } from '../services/gemini';
import { Upload, FileText, AlertTriangle, Trash2, Sparkles, BookOpen } from 'lucide-react';

const AdminPanel: React.FC = () => {
  const [mode, setMode] = useState<'csv' | 'ai'>('ai'); // Default to AI (Content OS)
  
  // CSV State
  const [file, setFile] = useState<File | null>(null);
  
  // AI Content OS State
  const [rawText, setRawText] = useState('');
  const [contentTitle, setContentTitle] = useState('');
  
  // Shared State
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);

  // --- CSV HANDLERS ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setLog([]);
      setProgress(0);
    }
  };

  /**
   * RFC 4180準拠の堅牢なCSVパーサー
   * Excelのエスケープ処理（ダブルクォート内の改行やカンマ）に完全対応
   */
  const parseCSV = (text: string) => {
    // 1. BOM除去 (Excel出力のCSV対策)
    let content = text;
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
    }

    const rows: any[] = [];
    const lines: string[][] = [];
    let currentRow: string[] = [];
    let currentVal = '';
    let inQuote = false;
    
    // 文字単位でステートマシン解析を行い、行と列を正確に分解する
    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const nextChar = content[i + 1];

        if (inQuote) {
            if (char === '"' && nextChar === '"') {
                // エスケープされたクォート
                currentVal += '"';
                i++; // 次の文字をスキップ
            } else if (char === '"') {
                // クォート終了
                inQuote = false;
            } else {
                currentVal += char;
            }
        } else {
            if (char === '"') {
                inQuote = true;
            } else if (char === ',') {
                currentRow.push(currentVal);
                currentVal = '';
            } else if (char === '\r' || char === '\n') {
                // 改行処理（\r\n も \n も \r も対応）
                if (char === '\r' && nextChar === '\n') {
                    i++;
                }
                currentRow.push(currentVal);
                if (currentRow.length > 0 && (currentRow.length > 1 || currentRow[0] !== '')) {
                     lines.push(currentRow);
                }
                currentRow = [];
                currentVal = '';
            } else {
                currentVal += char;
            }
        }
    }
    // 最後の行を追加
    if (currentVal || currentRow.length > 0) {
        currentRow.push(currentVal);
        lines.push(currentRow);
    }

    if (lines.length < 2) return []; 

    // ヘッダーの処理
    const headers = lines[0].map(h => h.trim());
    
    // データ行のオブジェクト化
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i];
        if (values.length > 0) {
            const row: any = {};
            headers.forEach((h, index) => {
                // 列数が足りない場合は空文字を入れる
                row[h] = values[index] || '';
            });
            // インデックスアクセス用にも元データを保持しておく (Supabase側での位置指定フォールバックのため)
            // キーが重複しないように隠しプロパティ的に保持
            row['_col0'] = values[0] || '';
            row['_col1'] = values[1] || '';
            row['_col2'] = values[2] || '';
            row['_col3'] = values[3] || '';
            
            rows.push(row);
        }
    }
    
    return rows;
  };

  const handleCsvUpload = async () => {
    if (!file) return;

    setUploading(true);
    setLog(prev => [...prev, "ファイル読み込み中..."]);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      try {
        const rows = parseCSV(text);
        if (rows.length === 0) throw new Error("有効なデータが見つかりませんでした。");

        setLog(prev => [...prev, `${rows.length} 件のデータを解析しました。データベースへ転送中...`]);
        const defaultBookName = file.name.replace('.csv', '');

        await storage.batchImportWords(defaultBookName, rows, (prog) => {
          setProgress(prog);
        });

        setLog(prev => [...prev, "インポート完了！"]);
      } catch (err) {
        console.error(err);
        setLog(prev => [...prev, `エラー: ${(err as Error).message}`]);
      } finally {
        setUploading(false);
      }
    };
    reader.readAsText(file);
  };

  // --- AI CONTENT OS HANDLERS ---
  const handleAiImport = async () => {
    if (!rawText.trim() || !contentTitle.trim()) return;

    setUploading(true);
    setLog(["Content OS: AI解析を開始します...", "テキストから重要単語を抽出中..."]);
    
    try {
        // 1. Extract Words using Gemini
        const extracted = await extractVocabularyFromText(rawText);
        
        if (extracted.words.length === 0) throw new Error("単語を抽出できませんでした。");
        
        setLog(prev => [...prev, `抽出成功: ${extracted.words.length}語を検出しました。`]);
        
        // 2. Format for Storage
        const rows = extracted.words.map((item, index) => ({
            BookName: contentTitle,
            Number: index + 1,
            Word: item.word,
            Meaning: item.definition
        }));

        // 3. Save to Storage
        setLog(prev => [...prev, "データベースへ保存中..."]);
        await storage.batchImportWords(contentTitle, rows, (prog) => {
            setProgress(prog);
        });

        setLog(prev => [...prev, "完了: 独自教材が作成されました！"]);
        setRawText('');
        setContentTitle('');

    } catch (error) {
        console.error(error);
        setLog(prev => [...prev, `エラー: ${(error as Error).message}`]);
    } finally {
        setUploading(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm("本当にすべてのデータを初期化しますか？この操作は取り消せません。")) {
        await storage.resetAllData();
        alert("データをリセットしました。");
        window.location.reload();
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h2 className="text-3xl font-bold text-slate-800">Content OS</h2>
                <p className="text-slate-500">教材資産管理センター</p>
            </div>
            <div className="bg-white p-1 rounded-lg border border-slate-200 inline-flex">
                <button 
                    onClick={() => setMode('ai')}
                    className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-colors ${mode === 'ai' ? 'bg-medace-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    <Sparkles className="w-4 h-4" /> AI生成
                </button>
                <button 
                    onClick={() => setMode('csv')}
                    className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-colors ${mode === 'csv' ? 'bg-medace-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    <FileText className="w-4 h-4" /> CSV一括
                </button>
            </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            
            {mode === 'ai' ? (
                // --- AI MODE ---
                <div className="space-y-6 animate-in fade-in">
                    <div className="bg-medace-50 border border-medace-100 p-4 rounded-xl flex items-start gap-3">
                        <div className="bg-white p-2 rounded-full shadow-sm">
                            <Sparkles className="w-5 h-5 text-medace-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-medace-900">AI教材生成 (Magic Material Creation)</h3>
                            <p className="text-sm text-medace-700 mt-1">
                                塾で使用しているプリント、長文問題、またはWeb記事のテキストを貼り付けてください。<br/>
                                AIが自動的に学習すべき重要単語を抽出し、アプリ用教材に変換します。
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">教材タイトル</label>
                            <div className="relative">
                                <BookOpen className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                <input 
                                    type="text"
                                    value={contentTitle}
                                    onChange={(e) => setContentTitle(e.target.value)}
                                    placeholder="例: 中3定期テスト対策 Lesson 4"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:border-medace-500 focus:ring-2 focus:ring-medace-200 outline-none transition-all font-bold text-slate-700"
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">ソーステキスト (英語)</label>
                            <textarea 
                                value={rawText}
                                onChange={(e) => setRawText(e.target.value)}
                                placeholder="ここに英文を貼り付けてください..."
                                className="w-full h-48 p-4 rounded-xl border border-slate-300 focus:border-medace-500 focus:ring-2 focus:ring-medace-200 outline-none transition-all text-slate-600 font-mono text-sm"
                            />
                        </div>

                        <button
                            onClick={handleAiImport}
                            disabled={uploading || !rawText || !contentTitle}
                            className={`w-full py-4 rounded-xl font-bold text-white text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${uploading || !rawText ? 'bg-slate-300 cursor-not-allowed' : 'bg-gradient-to-r from-medace-500 to-medace-600 hover:scale-[1.01]'}`}
                        >
                            {uploading ? (
                                <>生成中...</>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5" /> 教材を生成する
                                </>
                            )}
                        </button>
                    </div>
                </div>
            ) : (
                // --- CSV MODE ---
                <div className="space-y-6 animate-in fade-in">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-slate-100 rounded-lg">
                        <Upload className="w-6 h-6 text-slate-600" />
                        </div>
                        <div>
                        <h3 className="text-lg font-bold text-slate-800">レガシーインポート</h3>
                        <p className="text-slate-500 text-sm">既存の単語リスト(CSV)がある場合はこちらを使用します。</p>
                        <p className="text-xs text-slate-400 mt-1">推奨フォーマット: 1列目=単語帳名, 2列目=番号, 3列目=単語, 4列目=日本語訳</p>
                        </div>
                    </div>

                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:border-medace-400 transition-colors bg-slate-50">
                        <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-600 mb-4">
                        {file ? `選択中: ${file.name}` : "ここにCSVをドラッグ＆ドロップ、またはクリックして選択"}
                        </p>
                        <input 
                        type="file" 
                        accept=".csv" 
                        onChange={handleFileChange} 
                        className="hidden" 
                        id="csv-upload"
                        />
                        <label 
                        htmlFor="csv-upload" 
                        className="inline-block px-6 py-3 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium cursor-pointer hover:bg-slate-50 hover:border-medace-500 hover:text-medace-600 transition-all shadow-sm"
                        >
                        ファイルを選択
                        </label>
                    </div>

                    {file && (
                        <button
                            onClick={handleCsvUpload}
                            disabled={uploading}
                            className={`w-full py-3 rounded-xl font-bold text-white transition-colors ${uploading ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-800'}`}
                        >
                            {uploading ? '処理中...' : 'CSVを取り込む'}
                        </button>
                    )}
                </div>
            )}

            {/* Progress Bar */}
            {(uploading || progress > 0) && (
                <div className="mt-8">
                    <div className="flex justify-between text-sm font-medium mb-2">
                        <span className="text-slate-600">ステータス</span>
                        <span className="text-medace-600">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div 
                        className="bg-medace-500 h-3 rounded-full transition-all duration-200" 
                        style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>
            )}

            {/* Console Log */}
            {log.length > 0 && (
                <div className="mt-8 bg-slate-900 rounded-xl p-6 font-mono text-xs text-green-400 max-h-48 overflow-y-auto shadow-inner border border-slate-800">
                    {log.map((l, i) => <div key={i} className="mb-1">> {l}</div>)}
                </div>
            )}
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50 rounded-2xl shadow-sm border border-red-100 p-8 opacity-80 hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500" />
                <h3 className="text-lg font-bold text-red-700">システムリセット</h3>
            </div>
            <p className="text-red-600 text-sm mb-4">
                デモ用のデータを全て消去し、初期状態に戻します。
            </p>
            <button 
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-colors text-sm font-bold"
            >
                <Trash2 className="w-4 h-4" /> データをリセット
            </button>
        </div>
    </div>
  );
};

export default AdminPanel;
