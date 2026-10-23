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

/** Foto do catálogo. Blob e caminho local passam pelo otimizador. Host solto fica em img: o Next não busca URL arbitrária. */
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
  if (canOptimize(src)) {
    return <Image src={src} alt={alt} fill className={className} sizes={sizes} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- host fora do Blob; remotePatterns não cobre URL arbitrária
    <img src={src} alt={alt} className={cn("absolute inset-0 h-full w-full", className)} />
  );
}
