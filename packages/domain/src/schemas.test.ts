import { describe, expect, it } from "vitest";
import { adminBannerBody, adminImageBody, isSafePublicUrl } from "./schemas";

describe("URL pública", () => {
  it("aceita https e caminho do site", () => {
    expect(isSafePublicUrl("https://cdn.example/foto.webp")).toBe(true);
    expect(isSafePublicUrl("/motos/apex")).toBe(true);
    expect(adminBannerBody.safeParse({ title: "Slide", href: "/me-ajude-a-escolher" }).success).toBe(true);
    expect(adminImageBody.safeParse({ url: "https://cdn.example/capa.jpg" }).success).toBe(true);
  });

  it("recusa javascript, http e protocolo relativo", () => {
    for (const href of ["javascript:alert(1)", "JavaScript:alert(1)", "http://cdn.example/a.jpg", "//cdn.example/a.jpg", "/\\cdn.example"]) {
      expect(isSafePublicUrl(href)).toBe(false);
      expect(adminBannerBody.safeParse({ title: "Slide", href }).success).toBe(false);
      expect(adminBannerBody.safeParse({ title: "Slide", href: "/ok", imageUrl: href }).success).toBe(false);
      expect(adminImageBody.safeParse({ url: href }).success).toBe(false);
    }
  });
});
