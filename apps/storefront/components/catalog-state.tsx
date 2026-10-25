export function CatalogDown({ message, compact = false }: { message: string; compact?: boolean }) {
  if (compact) {
    return <p className="text-sm text-signal">{message}</p>;
  }
  return (
    <div className="mx-auto max-w-3xl px-5 pt-32 pb-20">
      <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Catálogo</p>
      <h1 className="display mt-3 text-5xl md:text-7xl">O catálogo não respondeu.</h1>
      <p className="mt-4 max-w-xl text-muted-foreground">{message}</p>
    </div>
  );
}
