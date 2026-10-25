import { commerceMessage } from "@/lib/commerce";

export type AdminResult<T> = { ok: boolean; status: number; body: T & { message?: string; error?: string } };

/** Chamada autenticada. A sessão vai no cookie; o token antigo só entra se a senha ainda não existe na API. */
export async function adminFetch<T>(path: string, init: RequestInit = {}, token?: string): Promise<AdminResult<T>> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  if (token) headers.set("x-admin-token", token);
  const response = await fetch(`/api/commerce${path}`, { ...init, headers, credentials: "include" });
  const body = (await response.json().catch(() => ({}))) as AdminResult<T>["body"];
  return { ok: response.ok, status: response.status, body };
}

export function adminError(result: AdminResult<unknown>, fallback: string) {
  if (result.body.error === "catalogo_indisponivel") return commerceMessage(result.body, fallback);
  if (result.status === 404) return "Essa rota ainda não está na API.";
  const issues = (result.body as { issues?: { message?: string }[] }).issues;
  const detail = Array.isArray(issues)
    ? [...new Set(issues.map((issue) => issue.message).filter((message): message is string => Boolean(message)))].join(" ")
    : "";
  if (detail) return detail;
  return commerceMessage(result.body, fallback);
}

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function blobPathname(filename: string) {
  const base = filename.split(/[/\\]/).pop()?.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^\.+/, "") || "foto.jpg";
  return `lume/${base}`;
}

function filenameFor(file: File) {
  const current = file.name.trim();
  if (/\.(jpe?g|png|webp)$/i.test(current)) return current;
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const base = current.replace(/\.[^.]+$/, "") || "foto";
  return `${base}.${ext}`;
}

/** O navegador fala com o Blob pelo token de cliente. O token de escrita fica no servidor. */
export async function uploadAdminImage(file: File, token?: string): Promise<string> {
  if (!imageTypes.has(file.type)) throw new Error("Use JPG, PNG ou WebP.");
  if (file.size > 5 * 1024 * 1024) throw new Error("A foto passa de 5 MB.");
  const filename = filenameFor(file);
  const pathname = blobPathname(filename);
  const headers: Record<string, string> = {};
  if (token) headers["x-admin-token"] = token;
  const ready = await adminFetch("/v1/admin/uploads", {
    method: "POST",
    body: JSON.stringify({ filename, contentType: file.type }),
  }, token);
  if (!ready.ok) throw new Error(adminError(ready, "Não foi possível preparar o envio."));
  const { upload } = await import("@vercel/blob/client");
  const blob = await upload(pathname, file, {
    access: "public",
    handleUploadUrl: "/api/commerce/v1/admin/uploads",
    headers,
    contentType: file.type,
  });
  return blob.url;
}
