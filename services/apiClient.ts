class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

const parseError = async (response: Response): Promise<never> => {
  let message = `Request failed with status ${response.status}`;

  try {
    const payload = await response.json() as { error?: string; message?: string };
    message = payload.message || payload.error || message;
  } catch {
    const text = await response.text();
    if (text) message = text;
  }

  throw new ApiError(message, response.status);
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: {
      ...DEFAULT_HEADERS,
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    return parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};

export const apiGet = <T>(path: string): Promise<T> => request<T>(path, { method: 'GET' });

export const apiPost = <T>(path: string, body?: unknown): Promise<T> => request<T>(path, {
  method: 'POST',
  body: body === undefined ? undefined : JSON.stringify(body),
});

export const apiDelete = <T>(path: string): Promise<T> => request<T>(path, { method: 'DELETE' });

export { ApiError };
