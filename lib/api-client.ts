async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
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
    });

    throw new Error(errorMessage);
  }

  if (res.status === 204 || text.length === 0) {
    return undefined as T;
  }

  return parsed as T;
}

export { apiFetch };
