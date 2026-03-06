export interface AppEnv {
  DB: any;
  GEMINI_API_KEY?: string;
  ADMIN_DEMO_PASSWORD?: string;
}

export interface DbUserRow {
  id: string;
  email: string;
  password_hash: string | null;
  display_name: string;
  role: string;
  grade: string | null;
  english_level: string | null;
  subscription_plan: string | null;
  organization_name: string | null;
  organization_role: string | null;
  stats_xp: number | null;
  stats_level: number | null;
  stats_current_streak: number | null;
  stats_last_login_date: string | null;
}
