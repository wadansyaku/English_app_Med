
# Todo List

## 1. Current Focus: UX Localization & Core Experience Polish
**Priority: High** (ユーザー体験の向上とバグ修正)
- [ ] **UI Localization**
  - [ ] `types.ts` の列挙型を日本語ラベルへ統一し、`GRADE_LABELS/STATUS_LABELS` を参照しない部分を `Dashboard.tsx`・`Onboarding.tsx` で置き換える。
  - [ ] ダッシュボードのカードラベル（Curriculum/Progressなど）を日本語に整理し、`Layout.tsx` のナビゲーションも含めて英語表記を排除する。
- [ ] **Progress Logic Fix**
  - [ ] `services/storage.ts` の `getBookProgress` で初回学習時に最小1%が反映されるよう計算式を調整し、`LearningHistory` の保存タイミングを `StudyMode.tsx` と同期させる。
  - [ ] 進捗が変化した瞬間にUIへ反映されるよう、`Dashboard.tsx` の `progressMap` 更新処理を非同期完了後に必ずトリガーする。
- [ ] **Dynamic Learning Plan**
  - [ ] 既存プラン表示（`Dashboard.tsx` または `Onboarding.tsx` のカード）に「編集/再計算」ボタンを追加し、`services/storage.ts` の `saveLearningPlan` を上書き保存に対応させる。
  - [ ] 1日目標数・対象ブックの入力UIを簡素化し、バリデーションを`components`側で行った上で保存リクエストを出す。
- [ ] **Diagnostic Test UX**
  - [ ] ローディング状態を `Onboarding.tsx` に統一（スケルトン/進捗バー）し、タイムアウト時は `services/gemini.ts` からのエラーを日本語で再試行案内にする。
  - [ ] プロンプト（`services/gemini.ts`）にバリエーション要求を追加し、問題形式のシャッフルと難易度レンジを学年（`UserGrade`）に基づいて制御する。
  - [ ] 診断結果からダッシュボードへの遷移バグを再現テストし、`currentView` 遷移と `user.englishLevel` 更新をセットで行う。

## 2. Next Up: Visuals & Social
- [ ] **Graph Improvement**: Learning ActivityをGitHub風から洗練された棒グラフへ変更し、「週間学習記録」と命名。
- [ ] **Leaderboard**: 塾内ランキングの本格実装。

## 3. Completed Features (Done)
### UX / UI Polish
- [x] **Mobile Responsiveness**: Study Modeのカードサイズ調整。
- [x] **Streak Visuals**: ダッシュボードでのストリーク演出強化。

### Core Stability & Logic
- [x] **Fix Learning Algorithm**: 学習コース進捗ロジック修正。
- [x] **AI Content Persistence**: 例文・訳のDB保存とキャッシュ。
- [x] **Error Handling**: Gemini API 429エラー対策。

### Personalization & Content
- [x] **Personal Content OS UI**: My Phrasebook作成フローの改善。
- [x] **Multi-modal Input**: PDF/画像からの単語抽出。
- [x] **Adaptive Personalization**: 学年・英語レベル管理。
- [x] **Diagnostic Test**: 初回レベル診断機能（Basic実装）。

### AI Experience
- [x] **AI Auto-Prefetching**: Zero-Waitでの例文表示。
- [x] **AI Quality & TTS**: 例文読み上げ、翻訳表示。

## 4. Future Roadmap
- [ ] **Native App Wrapper**: PWA化またはCapacitor等でのアプリ化検討。
- [ ] **Advanced Ghost Teacher**: 生徒への自動メール/LINE通知連携。
