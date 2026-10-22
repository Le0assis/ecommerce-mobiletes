export type Guide = {
  slug: string;
  title: string;
  lede: string;
  body: string[];
};

/** Conteúdo de demonstração. O Payload, quando entrar, substitui este arquivo sem mudar a rota. */
export const guides: Guide[] = [
  {
    slug: "carregar-em-casa",
    title: "Carregar em casa",
    lede: "A tomada da garagem é o posto. A recarga rápida é exceção.",
    body: [
      "Deixe a moto na carga ao chegar. O tempo de 0 a 100% está na ficha de cada modelo.",
      "Uma extensão fina e um adaptador improvisado não entram na recomendação. Use a tomada que o manual indicar.",
      "Sem tomada fixa, o carregador portátil é acessório, não milagre de viagem.",
    ],
  },
  {
    slug: "primeira-semana",
    title: "A primeira semana",
    lede: "O silêncio muda o hábito antes de mudar o caminho.",
    body: [
      "Ande os primeiros dias no modo cidade. O modo esporte gasta autonomia e não ensina o freio.",
      "A calculadora do site é estimativa. Compare com o que o painel mostrar no seu trajeto.",
      "Capacete, luva e a regra da sua categoria vêm antes do acessório bonito.",
    ],
  },
];

export const faq: { question: string; answer: string }[] = [
  {
    question: "O Pix de 5% inclui o frete?",
    answer: "Não. O desconto vale sobre a moto configurada, depois do cupom. O frete entra por fora.",
  },
  {
    question: "21 vezes sem juros é financiamento de banco?",
    answer: "Não. É parcela do cartão na campanha de lançamento. CDC bancário não está nesta versão.",
  },
  {
    question: "Preciso de CNH?",
    answer: "Depende da classe: autopropelido, ciclomotor ou moto. A página de legislação explica a referência e avisa que não é parecer.",
  },
  {
    question: "A troca do usado tem preço na hora?",
    answer: "Não. O formulário pede avaliação. Ninguém vê um número automático.",
  },
];

export function getGuide(slug: string): Guide | undefined {
  return guides.find((item) => item.slug === slug);
}
