/** Medição local. Sem script de terceiro. Só escreve no console se a vitrine pedir e o aviso de cookie permitir. */
export function track(event: string, props?: Record<string, string | number>) {
  if (typeof window === "undefined") return;
  if (process.env.NEXT_PUBLIC_ANALYTICS !== "console") return;
  const choice = localStorage.getItem("lume-cookies");
  if (choice !== "analytics") return;
  console.info("[lume]", event, props ?? {});
}
