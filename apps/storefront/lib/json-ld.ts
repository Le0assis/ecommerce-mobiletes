/** JSON-LD para o HTML. Escapa `<` para o texto não fechar a tag script. */
export function jsonLdScript(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
