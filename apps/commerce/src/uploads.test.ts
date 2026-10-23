import { describe, expect, it } from "vitest";
import { normalizeUploadPathname, safePathname } from "./uploads";

describe("caminho do upload", () => {
  it("obriga o prefixo lume e recusa travessia", () => {
    expect(normalizeUploadPathname("lume/foto.webp")).toBe("lume/foto.webp");
    expect(normalizeUploadPathname("foto.webp")).toBeNull();
    expect(normalizeUploadPathname("lume/../segredo.jpg")).toBeNull();
    expect(normalizeUploadPathname("../lume/foto.jpg")).toBeNull();
    expect(normalizeUploadPathname("lume/%2e%2e/foto.jpg")).toBeNull();
    expect(normalizeUploadPathname("lume\\foto.jpg")).toBeNull();
    expect(normalizeUploadPathname("outro/foto.jpg")).toBeNull();
    expect(safePathname("../../etc/passwd.jpg")).toBe("lume/passwd.jpg");
    expect(safePathname("foto.webp")).toBe("lume/foto.webp");
  });
});
