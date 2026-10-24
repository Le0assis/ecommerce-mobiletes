import { cn } from "cn";
import Image from "next/image";

function canOptimize(src: string) {
  if (src.startsWith("/") && !src.startsWith("//")) return true;
  try {
    const url = new URL(src);
    return url.protocol === "https:" && url.hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/** Foto do catálogo. Blob e caminho local passam pelo otimizador. Outro host usa `unoptimized`, sem alargar `remotePatterns`. */
export function CatalogPhoto({
  src,
  alt,
  className,
  sizes,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={cn("absolute inset-0 h-full w-full", className)}
      unoptimized={!canOptimize(src)}
    />
  );
}
