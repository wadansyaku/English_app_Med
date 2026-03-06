import { OrganizationRole, UserRole } from '../../types';
import { clearSession, createSession, createUser, ensureDemoUser, findUserByEmail, mapUserRowToProfile, requireUser, verifyPassword, hashPassword } from '../_shared/auth';
import { handleAiAction } from '../_shared/ai-actions';
import { handleError, HttpError, json, noContent, readJson } from '../_shared/http';
import { handleStorageAction } from '../_shared/storage-actions';
import { AppEnv } from '../_shared/types';

interface AuthBody {
  action: 'demo-login' | 'email-auth';
  role?: UserRole;
  organizationRole?: OrganizationRole;
  email?: string;
  password?: string;
  isSignUp?: boolean;
  demoPassword?: string;
  displayName?: string;
}

interface ProfileBody {
  user?: {
    displayName?: string;
    grade?: string;
    englishLevel?: string;
    subscriptionPlan?: string;
    organizationName?: string;
    organizationRole?: string;
    stats?: {
      xp?: number;
      level?: number;
      currentStreak?: number;
      lastLoginDate?: string;
    };
  };
}

const createJsonResponse = (data: unknown, init: ResponseInit = {}): Response => {
  if (data === null || data === undefined) {
    return noContent(init);
  }
  return json(data, init);
};

const handleDemoLogin = async (env: AppEnv, request: Request, body: AuthBody): Promise<Response> => {
  const role = body.role || UserRole.STUDENT;
  if (role === UserRole.ADMIN) {
    const hostname = new URL(request.url).hostname;
    const expectedPassword = env.ADMIN_DEMO_PASSWORD || (hostname === 'localhost' || hostname === '127.0.0.1' ? 'admin' : undefined);
    if (!expectedPassword) {
      throw new HttpError(403, 'ADMIN_DEMO_PASSWORD を設定してください。');
    }
    if (body.demoPassword !== expectedPassword) {
      throw new HttpError(403, '管理用パスワードが正しくありません。');
    }
  }

  const user = await ensureDemoUser(env, role, body.organizationRole);
  const sessionCookie = await createSession(env, request, user.id);
  return createJsonResponse(mapUserRowToProfile(user), {
    headers: { 'Set-Cookie': sessionCookie },
  });
};

const handleEmailAuth = async (env: AppEnv, request: Request, body: AuthBody): Promise<Response> => {
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const role = body.role || UserRole.STUDENT;

  if (!email || !password) {
    throw new HttpError(400, 'メールアドレスとパスワードを入力してください。');
  }

  if (body.isSignUp) {
    if (password.length < 6) {
      throw new HttpError(400, 'パスワードは6文字以上にしてください。');
    }

    const existing = await findUserByEmail(env, email);
    if (existing) {
      throw new HttpError(409, 'このメールアドレスは既に登録されています。');
    }

    const passwordHash = await hashPassword(password);
    const displayName = String(body.displayName || email.split('@')[0]).trim();
    if (!displayName) {
      throw new HttpError(400, '表示名を入力してください。');
    }

    const user = await createUser(env, {
      email,
      passwordHash,
      displayName,
      role,
    });

    const sessionCookie = await createSession(env, request, user.id);
    return createJsonResponse(mapUserRowToProfile(user), {
      headers: { 'Set-Cookie': sessionCookie },
    });
  }

  const existing = await findUserByEmail(env, email);
  if (!existing || !(await verifyPassword(password, existing.password_hash))) {
    throw new HttpError(401, 'メールアドレスまたはパスワードが間違っています。');
  }

  const sessionCookie = await createSession(env, request, existing.id);
  return createJsonResponse(mapUserRowToProfile(existing), {
    headers: { 'Set-Cookie': sessionCookie },
  });
};

const handleProfileUpdate = async (env: AppEnv, request: Request): Promise<Response> => {
  const currentUser = await requireUser(env, request);
  const body = await readJson<ProfileBody>(request);
  const nextUser = body.user || {};
  const stats = nextUser.stats || {};
  const currentStats = mapUserRowToProfile(currentUser).stats;

  await env.DB.prepare(`
    UPDATE users
    SET display_name = ?, grade = ?, english_level = ?, subscription_plan = ?, organization_name = ?, organization_role = ?,
        stats_xp = ?, stats_level = ?, stats_current_streak = ?, stats_last_login_date = ?,
        updated_at = ?
    WHERE id = ?
  `).bind(
    (nextUser.displayName || currentUser.display_name).trim(),
    nextUser.grade || currentUser.grade || null,
    nextUser.englishLevel || currentUser.english_level || null,
    nextUser.subscriptionPlan || currentUser.subscription_plan || null,
    nextUser.organizationName || currentUser.organization_name || null,
    nextUser.organizationRole || currentUser.organization_role || null,
    stats.xp ?? currentStats?.xp ?? currentUser.stats_xp ?? 0,
    stats.level ?? currentStats?.level ?? currentUser.stats_level ?? 1,
    stats.currentStreak ?? currentStats?.currentStreak ?? currentUser.stats_current_streak ?? 0,
    stats.lastLoginDate ?? currentStats?.lastLoginDate ?? currentUser.stats_last_login_date ?? '',
    Date.now(),
    currentUser.id
  ).run();

  const updated = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(currentUser.id).first();
  return createJsonResponse(mapUserRowToProfile(updated));
};

export const onRequest = async (context: { request: Request; env: AppEnv; }): Promise<Response> => {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/^\/api\/?/, '');

    if (pathname === 'auth' && request.method === 'POST') {
      const body = await readJson<AuthBody>(request);
      if (body.action === 'demo-login') return handleDemoLogin(env, request, body);
      if (body.action === 'email-auth') return handleEmailAuth(env, request, body);
      throw new HttpError(404, '未知の認証操作です。');
    }

    if (pathname === 'session' && request.method === 'GET') {
      const user = await requireUser(env, request).catch(() => null);
      return createJsonResponse(user ? mapUserRowToProfile(user) : null);
    }

    if (pathname === 'session' && request.method === 'DELETE') {
      const cookie = await clearSession(env, request);
      return noContent({ headers: { 'Set-Cookie': cookie } });
    }

    if (pathname === 'profile' && request.method === 'POST') {
      return handleProfileUpdate(env, request);
    }

    if (pathname === 'storage' && request.method === 'POST') {
      const user = await requireUser(env, request);
      const body = await readJson<{ action: string; payload?: any }>(request);
      const result = await handleStorageAction(env, user, body);
      return createJsonResponse(result);
    }

    if (pathname === 'ai' && request.method === 'POST') {
      const user = await requireUser(env, request);
      const body = await readJson<{ action: string; payload?: any }>(request);
      const result = await handleAiAction(env, user, body);
      return createJsonResponse(result);
    }

    throw new HttpError(404, 'APIエンドポイントが見つかりません。');
  } catch (error) {
    return handleError(error);
  }
};
