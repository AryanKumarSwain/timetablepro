function buildApiUrl(path: string) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
  if (!apiBaseUrl) {
    return path.startsWith('/') ? path : `/${path}`;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${apiBaseUrl}${normalizedPath}`;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = buildApiUrl(path);
  
  // Fetch current session to get school context (skip when calling auth endpoints)
  let schoolId: string | null = null;
  if (path !== '/api/auth/me' && !path.startsWith('/api/auth/')) {
    try {
      const sessionRes = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        schoolId = sessionData.user?.schoolId || null;
      }
    } catch (error) {
      console.warn('[apiFetch] Failed to fetch session for school context:', error);
    }
  }

  const headers = new Headers();
  if (init?.body) {
    headers.set('Content-Type', 'application/json');
  }
  
  // Copy any existing headers
  if (init?.headers) {
    const existingHeaders = init.headers as Record<string, string>;
    Object.entries(existingHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });
  }

  // Inject school context header if available
  if (schoolId) {
    headers.set('x-school-id', schoolId);
  }

  const res = await fetch(url, {
    ...init,
    headers,
    credentials: 'include',
  });

  const text = await res.text().catch(() => '');

  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    const errorMessage =
      typeof parsed === 'object' && parsed !== null && 'error' in parsed
        ? String((parsed as { error?: unknown }).error)
        : typeof parsed === 'string'
          ? parsed
          : `Request failed (${res.status})`;

    console.error('[apiFetch]', {
      path,
      status: res.status,
      errorMessage,
      parsed,
      schoolId,
    });

    throw new Error(errorMessage);
  }

  if (res.status === 204 || text.length === 0) {
    return undefined as T;
  }

  return parsed as T;
}

export { apiFetch };
