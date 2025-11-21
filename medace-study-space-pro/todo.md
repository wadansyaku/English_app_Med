
# Todo List

## 1. Current Focus: UX Localization & Core Experience Polish
**Priority: High** (ユーザー体験の向上とバグ修正)
- [ ] **UI Localization**: `types.ts` のGrade/Statusを完全日本語化。ダッシュボードの不要な英語（Curriculum等）を削除。
- [ ] **Progress Logic Fix**: `My単語帳`などの進捗率が、学習直後に正しく1%でも進むように判定ロジックを緩和・修正。
- [ ] **Dynamic Learning Plan**: 作成後のプラン（1日の目標数や対象ブック）を編集可能にする機能の実装。
- [ ] **Diagnostic Test UX**: 
    - 待ち時間のストレス軽減（ローディング表示の工夫）。
    - 問題のバリエーション増加（プロンプト修正）。
    - 結果画面への遷移バグ修正。

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
