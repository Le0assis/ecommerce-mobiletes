const clearMessage: Record<string, string> = {
  produto_desabilitado: "Esse modelo não está habilitado.",
  peso_invalido: "Peso fora da faixa de transporte. O frete aceita um peso maior que zero e até 400 kg.",
  catalogo_indisponivel: "O cadastro precisa do Postgres.",
  produto_inexistente: "Modelo não encontrado.",
};

export const produtoDesabilitadoMessage = clearMessage.produto_desabilitado;
export const pesoInvalidoMessage = clearMessage.peso_invalido;

export function commerceCode(cause: unknown): string | undefined {
  if (typeof cause !== "object" || cause === null || !("code" in cause)) return undefined;
  const code = (cause as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

/** A frase da API entra quando ela nomeia a cor. Os outros códigos usam o texto fixo da vitrine. */
export function commerceMessage(body: { error?: string; message?: string } | undefined, fallback: string): string {
  const code = body?.error;
  if (code === "cor_sem_estoque") return body?.message?.trim() || "Essa cor está sem estoque.";
  if (code && clearMessage[code]) return clearMessage[code];
  return body?.message?.trim() || fallback;
}

export async function commerce<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/commerce${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
  if (!response.ok) {
    const failure = new Error(commerceMessage(body, "A loja não respondeu. Confira se a API está no ar."));
    if (body.error) (failure as Error & { code?: string }).code = body.error;
    throw failure;
  }
  return body as T;
}
