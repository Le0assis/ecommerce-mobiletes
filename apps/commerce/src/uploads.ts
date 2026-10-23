import { generateClientTokenFromReadWriteToken, handleUpload, type HandleUploadBody } from "@vercel/blob/client";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const extensions: Record<(typeof IMAGE_TYPES)[number], string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

export type UploadRequest = {
  filename: string;
  contentType: string;
};

export function parseUploadRequest(body: unknown): UploadRequest | HandleUploadBody | null {
  if (!body || typeof body !== "object") return null;
  const record = body as { type?: unknown; filename?: unknown; contentType?: unknown };
  if (record.type === "blob.generate-client-token" || record.type === "blob.upload-completed") {
    return body as HandleUploadBody;
  }
  if (typeof record.filename !== "string" || typeof record.contentType !== "string") return null;
  return { filename: record.filename, contentType: record.contentType };
}

export function uploadRejection(input: UploadRequest): string | null {
  const contentType = input.contentType.toLowerCase();
  const allowed = extensions[contentType as (typeof IMAGE_TYPES)[number]];
  if (!allowed) return "Envie JPG, PNG ou WebP.";
  const filename = input.filename.trim().toLowerCase();
  if (!filename || filename.includes("/") || filename.includes("\\") || !allowed.some((ext) => filename.endsWith(ext))) {
    return "O nome do arquivo precisa terminar em .jpg, .png ou .webp.";
  }
  return null;
}

export function safePathname(filename: string) {
  const base = filename.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+/, "");
  return `lume/${base || "imagem"}`;
}

export async function clientTokenFor(input: UploadRequest) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  const pathname = safePathname(input.filename);
  const clientToken = await generateClientTokenFromReadWriteToken({
    token,
    pathname,
    allowedContentTypes: [...IMAGE_TYPES],
    maximumSizeInBytes: MAX_IMAGE_BYTES,
    addRandomSuffix: true,
    validUntil: Date.now() + 10 * 60_000,
  });
  return { clientToken, pathname };
}

export async function handleBlobUpload(body: HandleUploadBody, request: Request) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  return handleUpload({
    body,
    request,
    token,
    onBeforeGenerateToken: async (pathname) => {
      const lower = pathname.toLowerCase();
      const known = Object.values(extensions).some((items) => items.some((ext) => lower.endsWith(ext)));
      if (!known) throw new Error("tipo_recusado");
      return {
        allowedContentTypes: [...IMAGE_TYPES],
        maximumSizeInBytes: MAX_IMAGE_BYTES,
        addRandomSuffix: true,
        tokenPayload: null,
      };
    },
    onUploadCompleted: async () => {
      // A URL volta para o admin, que grava a foto no produto. O token de escrita não sai do servidor.
    },
  });
}
