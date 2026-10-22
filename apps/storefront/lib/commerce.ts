export async function commerce<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/commerce${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await response.json().catch(() => ({}))) as { message?: string };
  if (!response.ok) {
    throw new Error(body.message ?? "A loja não respondeu. Confira se a API está no ar.");
  }
  return body as T;
}
