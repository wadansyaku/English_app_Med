# Development Journal

## Initial Analysis
プロジェクトの全ファイルを精査しました。アーキテクチャは非常に堅牢で、特に以下の点が優れています。
1.  **Dependency Injection**: `storage.ts` における `IStorageService` パターンにより、バックエンドの切り替えが容易。
2.  **GenAI Integration**: Gemini 2.5 Flash と Imagen 4.0 が適切に使い分けられている。特にクイズ生成や画像生成のプロンプトエンジニアリングが良い。
3.  **Gamification**: ユーザーのモチベーション維持のためのHUD（Head Up Display）の実装が完了している。

## Next Actions
まずは `todo.md` に基づき、モバイルレスポンシブの確認と、AI機能のさらなる深化（例文読み上げ等）に着手する準備を整えます。

## Deep Analysis Update
`project.md` と `todo.md` を突き合わせ、以下の優先プランを整理した。

- **ローカライズの完全対応:** `types.ts` の列挙値を参照する画面（`Dashboard.tsx`、`Onboarding.tsx`、`Layout.tsx`）で残存する英語ラベルを洗い出し、翻訳表を作成した上で置換する。
- **進捗ロジックの即時反映:** `services/storage.ts` の進捗計算を初回学習で1%以上反映するよう緩和し、`StudyMode.tsx` → `Dashboard.tsx` への同期タイミングを明示的にトリガーする。
- **学習プランの編集導線:** `saveLearningPlan` を上書き保存可能にし、Dashboard/Onboarding上で「編集/再計算」ボタンを提供。入力UIはシンプルな目標数・ブック選択に絞り、バリデーションをフロント側で実施。
- **診断体験の改善:** `Onboarding.tsx` に統一されたローディング/タイムアウトUIを用意し、`services/gemini.ts` の診断プロンプトに難易度バリエーションと学年連動の調整を追加。診断結果のビュー遷移と `user.englishLevel` 更新をセットでテストする。
