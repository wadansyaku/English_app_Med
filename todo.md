
# Todo List

## 1. Current Focus: Social Features & Stability
**Priority: High** (社会的機能と安定性)
- [ ] **Leaderboard Logic**: 現在はモックまたは単純な全期間XP。週間ランキングのロジック（DBスキーマ変更含む）を検討する。
- [ ] **Data Sync**: オフラインモード(IndexedDB)とクラウド(Supabase)の同期ロジック強化。

## 2. Next Up: Mobile App Experience
- [ ] **PWA Manifest**: `manifest.json` の作成とアイコン設定 (HTML metaタグは設定済み)。
- [ ] **Touch Gestures**: Study Modeでのスワイプ操作（Tinder風UI）の導入検討。

## 3. Completed Features (Done)
### Visual Polish & Social Features
- [x] **Graph Improvement**: 週間学習記録に「目標ライン」と「目標達成カラー」を追加。
- [x] **Leaderboard Enhancement**: ユーザーレベルに応じた「リーグ（Bronze/Silver/Gold）」バッジの実装。
- [x] **Mobile App Basics**: PWA用メタタグ（theme-color, apple-touch-icon）の設定。

### UX / UI Polish
- [x] **UI Localization**: Dashboard, StudyModeの日本語化完了。
- [x] **Mobile Responsiveness**: Study Modeのカードサイズ調整。
- [x] **Streak Visuals**: ダッシュボードでのストリーク演出強化。

### Core Stability & Logic
- [x] **Progress Logic Fix**: 学習開始直後から1%の進捗を表示するよう修正。
- [x] **Fix Learning Algorithm**: 学習コース進捗ロジック修正。
- [x] **AI Content Persistence**: 例文・訳のDB保存とキャッシュ。
- [x] **Error Handling**: Gemini API 429エラー対策。

### Personalization & Content
- [x] **Dynamic Learning Plan**: プラン作成後の編集機能実装済み。
- [x] **Personal Content OS UI**: My Phrasebook作成フローの改善。
- [x] **Multi-modal Input**: PDF/画像からの単語抽出。
- [x] **Adaptive Personalization**: 学年・英語レベル管理。
- [x] **Diagnostic Test**: 初回レベル診断機能（Basic + Advanced）。

## 4. Future Roadmap
- [ ] **Native App Wrapper**: PWA化またはCapacitor等でのアプリ化検討。
- [ ] **Advanced Ghost Teacher**: 生徒への自動メール/LINE通知連携。
