const clearMessage: Record<string, string> = {
  produto_desabilitado: "Esse modelo não está habilitado.",
  peso_invalido: "Peso fora da faixa de transporte. A ficha precisa de um peso maior que zero.",
  catalogo_indisponivel: "O cadastro precisa do Postgres.",
  produto_inexistente: "Modelo não encontrado.",
};

export const produtoDesabilitadoMessage = clearMessage.produto_desabilitado;
export const pesoInvalidoMessage = clearMessage.peso_invalido;

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
    throw new Error(commerceMessage(body, "A loja não respondeu. Confira se a API está no ar."));
  }
  return body as T;
}
