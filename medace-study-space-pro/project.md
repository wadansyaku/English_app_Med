
# Project: MedAce Study Space Pro

## 1. Project Overview
**MedAce Study Space Pro** は、AI（Google Gemini）と分散学習（SRS）を融合させた、次世代の英単語学習プラットフォームです。
「忘却曲線の克服」と「文脈学習」をテーマに、単なる暗記ではなく、AIによる例文生成・画像生成を通じて「生きた英語」を習得させることを目的としています。

## 2. Core Philosophy
1.  **Context over Rote:** 単語と訳の対ではなく、AIが生成する「文脈（例文）」と「視覚（画像）」で記憶する。
2.  **Data-Driven Learning:** SRS（Spaced Repetition System）アルゴリズムに基づき、最適な復習タイミングを自動スケジューリングする。
3.  **Role-Based Ecosystem:** 生徒（学習）、講師（進捗管理・介入）、管理者（教材生成）の3つの役割が有機的に連携する。
4.  **Personalized Experience:** ユーザーの学年・英語レベルに合わせたコンテンツ生成と、独自の興味に基づく教材作成（Personal Content OS）。

## 3. Product Strategy (CPO Update)
### Jobs to be Done (JTBD)
*   **Main Job:** 「学校のプリントや参考書の写真を撮るだけで、自分専用のテスト対策単語帳を即座に作り、通学時間などのスキマ時間で確実に覚えたい。」
*   **Emotional Job:** 「単調な暗記作業から解放され、ゲーム感覚で成長を実感したい。」

### The Magic Number
*   **"3 Context 'Aha!' Moments"**
    *   ユーザーがAI生成の例文や画像を見て「なるほど！」という納得感を**3回以上**経験すること。これを早期に達成させることがリテンションの鍵。

### Key Performance Indicators (KPIs)
1.  **Phrasebook Activation Rate:** 新規ユーザーが初日にMy Phrasebook作成（またはコース登録）を行い、学習を開始する割合。
2.  **D7 Retention:** 1週間後の継続利用率。習慣化のバロメーター。
3.  **Review Completion Rate:** 日次で提示されるSRS復習タスクの完遂率。

## 4. Tech Stack
### Frontend
-   **Framework:** React 19 (ES Modules / No Bundler setup in current env)
-   **Styling:** Tailwind CSS (Utility-first)
-   **Icons:** Lucide React

### AI / GenAI
-   **SDK:** `@google/genai`
-   **Text Model:** `gemini-2.5-flash` (Context generation, Quiz creation, Vocabulary extraction, Diagnostic Test)
-   **Image Model:** `imagen-4.0-generate-001` (Visual Mnemonic generation)

### Backend / Persistence
-   **Interface:** `IStorageService` (Dependency Injection Pattern)
-   **Primary (Cloud):** Supabase (Auth, Database, RLS)
-   **Fallback (Offline):** IndexedDB (Browser Local Storage)

## 5. Key Features & Architecture

### A. Learning Engine (Study Mode)
-   **Flashcard UI:** 3D Flip animation. Mobile-optimized.
-   **AI Context:** ボタン一つでGeminiがその単語の「学習者に適した短い例文」を生成・日本語訳・読み上げ。
-   **AI Visual Hook:** Imagen 4.0 が単語の概念をミニマルなベクターアイコン風画像として生成。
-   **SRS Logic:** SM-2アルゴリズム派生のロジック（Again/Hard/Good/Easy）で `nextReviewDate` を計算。
-   **Zero-Wait Prefetching:** 次の単語のAIコンテンツをバックグラウンドで生成し、待ち時間を排除。

### B. Gamification & Motivation
-   **XP & Leveling:** 学習量に応じた経験値とレベルアップ演出。
-   **Streak System:** 連続学習日数のトラッキングと視覚的報酬。
-   **Smart Session:** 「今日やるべき復習」と「新規単語」を自動ブレンドした日次クエスト。

### C. Content OS (Personal & Admin)
-   **Magic Material Creation:**
    -   **Text Input:** 任意のテキストから重要単語を抽出。
    -   **Multi-modal Input:** 写真やPDFファイルから単語を抽出・定義付け。
-   **Legacy Import:** CSVによる既存単語帳の一括インポート。

### D. Onboarding & Analytics
-   **Diagnostic Test:** 初回利用時にAIが学年レベルに合わせたクイズを出題し、CEFRレベルを判定。
-   **Ghost Teacher (Instructor):** 生徒の「離脱リスク」を自動分析し、介入を促すダッシュボード。
-   **Dynamic Learning Plan:** 生徒の目標に合わせて日々のノルマや対象教材を調整可能。

## 6. Database Schema (Conceptual)
-   `profiles`: ユーザー情報、Stats、学年、英語レベル。
-   `books`: 単語帳メタデータ。
-   `words`: 単語データ、AI生成キャッシュ（例文・意味）。
-   `study_history`: 学習履歴、SRSパラメータ。
-   `learning_plans`: 学習計画設定。

## 7. Design System
-   **Primary Color:** Orange/MedAce Brand (`#f97316` - `medace-500`)
-   **UI Style:** Clean, Card-based, Micro-interactions, Mobile-first responsive.
-   **Localization:** 
    -   徹底した日本語UI（英語ラベルの廃止）。
    -   専門用語（Grade/Status等）の直感的な日本語表記。
    -   グラフやヒートマップの日本的な表現への最適化。

## 8. Supabase SQL Migration
SupabaseのSQL Editorで以下のSQLを実行して、不足しているテーブルとカラムを追加してください。

```sql
-- 1. Learning Plans Table
create table if not exists public.learning_plans (
  user_id uuid references auth.users not null primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  target_date date not null,
  goal_description text not null,
  daily_word_goal integer not null,
  selected_book_ids text[] not null,
  status text check (status in ('ACTIVE', 'COMPLETED', 'ABANDONED')) not null
);
alter table public.learning_plans enable row level security;
create policy "Users can view their own learning plan." on public.learning_plans for select using (auth.uid() = user_id);
create policy "Users can update their own learning plan." on public.learning_plans for update using (auth.uid() = user_id);
create policy "Users can insert their own learning plan." on public.learning_plans for insert with check (auth.uid() = user_id);

-- 2. Add Source Context to Books
alter table public.books add column if not exists source_context text;

-- 3. Add Reported Flag to Words
alter table public.words add column if not exists is_reported boolean default false;
```
