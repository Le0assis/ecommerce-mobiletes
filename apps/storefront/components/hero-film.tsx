"use client";

import { useEffect, useRef, useState } from "react";

export function HeroFilm() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [video, setVideo] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let frame = 0;
    let raf = 0;

    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.floor(width * ratio));
      canvas.height = Math.max(1, Math.floor(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#070708");
      gradient.addColorStop(0.55, "#121216");
      gradient.addColorStop(1, "#0a0a0c");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
      const drift = 0.08 * Math.sin(frame / 90);
      const glow = context.createRadialGradient(width * (0.72 + drift), height * 0.42, 20, width * 0.7, height * 0.45, width * 0.45);
      glow.addColorStop(0, "rgba(255,45,45,0.28)");
      glow.addColorStop(1, "rgba(255,45,45,0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);
      if (!reduce) {
        frame += 1;
        raf = requestAnimationFrame(draw);
      }
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/hero.mp4", { method: "HEAD" })
      .then((response) => {
        if (!cancelled && response.ok) setVideo(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="absolute inset-0" aria-hidden="true">
      <canvas ref={canvasRef} className="h-full w-full" />
      {video ? (
        <video className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline src="/hero.mp4" />
      ) : null}
      <div className="grain absolute inset-0 opacity-70" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0e] via-transparent to-[#0c0c0e]/70" />
    </div>
  );
}
