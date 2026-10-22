"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parsePendingReviews, pendingReviewsRaw, submitReview, subscribePendingReviews, type LocalReview } from "@/lib/shop-api";
import { useState, useSyncExternalStore } from "react";

export function usePendingReviews(slug: string): LocalReview[] {
  const raw = useSyncExternalStore(subscribePendingReviews, pendingReviewsRaw, () => "");
  return parsePendingReviews(raw).filter((item) => item.productSlug === slug);
}

export function ReviewForm({ productId }: { productId: string }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError("");
    setMessage("");
    const rating = Number(formData.get("rating"));
    const title = String(formData.get("title")).trim();
    const body = String(formData.get("body")).trim();
    const city = String(formData.get("city")).trim();
    if (title.length < 3 || body.length < 12 || city.length < 2 || rating < 1 || rating > 5) {
      setError("Conte a cidade, um título e um relato com pelo menos uma frase.");
      setPending(false);
      return;
    }
    const result = await submitReview({ productId, city, rating, title, body });
    setMessage(result.message);
    setPending(false);
  }

  return (
    <form action={onSubmit} className="grid gap-3 rounded-[1.5rem] border border-white/10 p-4">
      <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Contar como é andar</p>
      <p className="text-sm text-muted-foreground">Sem nome de pessoa. A cidade basta. O relato só aparece depois da moderação.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="review-city">Cidade</Label>
          <Input id="review-city" name="city" required minLength={2} className="h-12 rounded-full px-4" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="review-rating">Nota</Label>
          <select id="review-rating" name="rating" defaultValue="5" className="h-12 rounded-full border border-white/15 bg-transparent px-4">
            {[5, 4, 3, 2, 1].map((score) => (
              <option key={score} value={score}>
                {score} de 5
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="review-title">Título</Label>
        <Input id="review-title" name="title" required minLength={3} className="h-12 rounded-full px-4" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="review-body">Relato</Label>
        <textarea
          id="review-body"
          name="body"
          required
          minLength={12}
          rows={4}
          className="rounded-3xl border border-white/15 bg-transparent px-4 py-3 text-sm"
        />
      </div>
      {error ? <p className="text-sm text-signal">{error}</p> : null}
      {message ? <p className="text-sm text-paper">{message}</p> : null}
      <Button type="submit" variant="outline" disabled={pending} className="h-12 rounded-full border-white/20">
        {pending ? "Enviando…" : "Enviar relato"}
      </Button>
    </form>
  );
}
