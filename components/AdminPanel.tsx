import React, { useState } from 'react';
import { storage } from '../services/storage';
import { Upload, FileText, Check, AlertTriangle } from 'lucide-react';

const AdminPanel: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setLog([]);
      setProgress(0);
    }
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const currentLine = lines[i].split(',');
      if (currentLine.length === headers.length) {
        const row: any = {};
        headers.forEach((h, idx) => {
          row[h] = currentLine[idx].trim();
        });
        rows.push(row);
      }
    }
    return rows;
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setLog(prev => [...prev, "ファイル読み込み中..."]);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      try {
        const rows = parseCSV(text);
        if (rows.length === 0) throw new Error("有効なデータが見つかりませんでした。");

        setLog(prev => [...prev, `${rows.length} 件のデータを解析しました。一括登録を開始します...`]);

        // Extract book name from first row or filename
        const bookName = rows[0]['BookName'] || rows[0]['単語帳名'] || file.name.replace('.csv', '');

        await storage.batchImportWords(bookName, rows, (prog) => {
          setProgress(prog);
        });

        setLog(prev => [...prev, "アップロード完了！"]);
      } catch (err) {
        console.error(err);
        setLog(prev => [...prev, `エラー: ${(err as Error).message}`]);
      } finally {
        setUploading(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-medace-100 rounded-lg">
          <Upload className="w-6 h-6 text-medace-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">データインポート</h2>
          <p className="text-slate-500">CSVファイルをアップロードしてコースを追加します。</p>
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
        <div className="mt-6">
          <button
            onClick={handleUpload}
            disabled={uploading}
            className={`w-full py-3 rounded-xl font-bold text-white transition-colors ${uploading ? 'bg-slate-400 cursor-not-allowed' : 'bg-medace-600 hover:bg-medace-700'}`}
          >
            {uploading ? '処理中...' : '一括登録を開始'}
          </button>
        </div>
      )}

      {uploading || progress > 0 ? (
        <div className="mt-8">
          <div className="flex justify-between text-sm font-medium mb-2">
            <span className="text-slate-600">進捗状況</span>
            <span className="text-medace-600">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-medace-500 h-3 rounded-full transition-all duration-200" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      ) : null}

      {log.length > 0 && (
        <div className="mt-8 bg-slate-900 rounded-lg p-4 font-mono text-xs text-green-400 max-h-48 overflow-y-auto">
          {log.map((l, i) => <div key={i}>> {l}</div>)}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;