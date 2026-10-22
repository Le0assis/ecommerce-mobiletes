# Design system

O site é sempre escuro: `html` tem a classe `dark`. Token em `apps/storefront/app/globals.css`.

| Token | Valor | Uso |
| --- | --- | --- |
| `--background` | `#0c0c0e` | Fundo |
| `--foreground` / paper | `#f4f4f2` | Texto |
| `--card` | `#16161a` | Cartão |
| `--primary` / signal | `#ff2d2d` | CTA principal, ponto da marca, um detalhe da moto, foco visível |
| `--primary-foreground` | `#1a0505` | Texto sobre o vermelho |
| `--muted-foreground` | `#c8c8c4` | Texto secundário. Contraste pensado para WCAG no grafite |
| pix | `#32bcad` | Só o selo PIX e o texto curto “Pix” no checkout. Fundo do selo com texto `#04221e` |
| `--radius` | `1rem` | Cantos. CTA é `rounded-full` |

Não introduza um segundo acento. Não pinte link institucional de vermelho. O botão padrão do shadcn é pequeno: CTA de compra usa `h-12 rounded-full`.

## Tipo

Inter Tight. Classe `.display`: peso 200, tracking `-0.045em`, line-height `0.86`. Título de página: `text-6xl md:text-8xl`. Números de preço e parcela: classe `.nums` (`tabular-nums`).

## Movimento

Hero e quiz usam `motion/react` com `useReducedMotion`. Se a pessoa pediu menos movimento, não há deslocamento. O 360° deixa de girar sozinho. Não adicione GSAP. Filme pinado, se existir um dia, é a única cena que pode pedi-lo.

Duração curta, por volta de 350 ms, ease padrão do Motion. Nada de loop em texto.

## Componentes

Primitivas em `components/ui`: `button`, `input`, `label`, `dialog`. O resto é específico da loja: `PageShell`, `ProductCard`, `Configurator`, `InstallmentTable`, `CategorySearch`, `LocatorMap`.

Link que parece botão: `className={cn(buttonVariants(...), "h-12 rounded-full")}`. Não use `render={<Link>}` no Button.

Foco visível: contorno vermelho de 2 px, offset 3 px. Há um link “Pular para o conteúdo” apontando para `#conteudo`.

## Layout

Largura `max-w-6xl`, padding `px-5`, topo `pt-28` por causa do menu flutuante. Rodapé com `pb-32` para não esconder texto atrás da barra de test ride. Na PDP, a barra móvel de reservar ocupa a base e a de test ride sai.

Menu desktop: Motos, Comparar, Quiz, Lojas, Carrinho, Reservar. O restante mora no rodapé.
