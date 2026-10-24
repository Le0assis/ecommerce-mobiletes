"use client";

import { BikeSvg } from "@/components/bike-svg";
import { CatalogPhoto } from "@/components/catalog-photo";
import type { Category, StoreImage } from "@/lib/catalog";
import { useState } from "react";

const frames = [
  { id: "lateral", label: "Lateral" },
  { id: "detalhe", label: "Detalhe" },
  { id: "frente", label: "Frente" },
] as const;

type Frame = (typeof frames)[number]["id"];

export function ProductGallery({
  name,
  variant,
  color,
  images = [],
}: {
  name: string;
  variant: Category;
  color: string;
  images?: StoreImage[];
}) {
  const photos = [...images].sort((a, b) => Number(b.isCover) - Number(a.isCover) || a.position - b.position);
  const [frame, setFrame] = useState<Frame>("lateral");
  const [photo, setPhoto] = useState(0);
  const current = photos[photo] ?? photos[0];

  if (current) {
    const index = photos.indexOf(current);
    return (
      <div>
        <div className="relative grid h-[28rem] place-items-center overflow-hidden">
          <CatalogPhoto
            src={current.url}
            alt={galleryAlt(current, name, index < 0 ? 0 : index, photos.length)}
            className="object-contain"
            sizes="(min-width: 1024px) 50vw, 100vw"
          />
          {photos.length > 1 ? (
            <div className="absolute bottom-4 left-4 flex gap-2" role="tablist" aria-label="Fotos">
              {photos.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={index === photo}
                  onClick={() => setPhoto(index)}
                  className="rounded-full border border-white/20 bg-[#0c0c0e]/80 px-3 py-1 text-xs aria-selected:border-signal"
                >
                  {item.isCover ? "Capa" : index + 1}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="relative grid h-[28rem] place-items-center overflow-hidden">
        {frame === "frente" ? (
          <FrontView color={color} title={`${name}, vista frontal`} />
        ) : (
          <BikeSvg
            variant={variant}
            color={color}
            title={`${name}, vista ${frame}`}
            className={frame === "detalhe" ? "h-[140%] w-[140%]" : "h-full w-full"}
          />
        )}
        <div className="absolute bottom-4 left-4 flex gap-2" role="tablist" aria-label="Galeria">
          {frames.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={frame === item.id}
              onClick={() => setFrame(item.id)}
              className="rounded-full border border-white/20 bg-[#0c0c0e]/80 px-3 py-1 text-xs aria-selected:border-signal"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function galleryAlt(image: StoreImage, name: string, index: number, total: number) {
  const written = image.alt.trim();
  if (written) return written;
  const place = image.isCover ? "foto de capa" : `foto ${index + 1} de ${total}`;
  return `${name}, ${place}`;
}

function FrontView({ color, title }: { color: string; title: string }) {
  return (
    <svg viewBox="0 0 360 460" className="h-full w-full" role="img" aria-label={title}>
      <ellipse cx="180" cy="400" rx="90" ry="12" fill="#000" opacity="0.45" />
      <rect x="150" y="250" width="60" height="120" rx="16" fill={color} />
      <circle cx="180" cy="150" r="54" fill={color} stroke="#3c3c42" strokeWidth="6" />
      <circle cx="180" cy="150" r="16" fill="#f4f4f2" />
      <circle cx="156" cy="210" r="6" fill="#ff2d2d" />
      <rect x="118" y="300" width="124" height="14" rx="7" fill="#2a2a2e" />
      <circle cx="110" cy="360" r="36" fill="#070708" stroke="#3c3c42" strokeWidth="8" />
      <circle cx="250" cy="360" r="36" fill="#070708" stroke="#3c3c42" strokeWidth="8" />
    </svg>
  );
}
