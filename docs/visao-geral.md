# Visão geral

A LUME é uma loja de motos e mobiletes elétricas para o Brasil. A interface é pt-BR, o preço é BRL em centavos, e a compra se decide com três números visíveis: o preço configurado, a parcela em 21 vezes sem juros e o Pix com 5%.

O dono do produto é o Gustavo. A marca ainda não tem CNPJ publicado neste repositório. Endereço de loja, relato e número de produto são referência de demonstração.

## O que esta versão entrega

A vitrine está completa como experiência, com dado e pagamento simulados:

- Home com filme (canvas, e mp4 se o arquivo existir), busca por categoria e marca, faixa de confiança, capítulo com os números da Apex, linha, comparação curta e quiz.
- Catálogo com marca, categoria, texto e ordem. Sem filtro de cidade.
- Página do modelo com galeria, cor, bateria, preço ao vivo, 360° sob demanda, economia contra gasolina, parcelas, ficha ao lado do preço, relatos com foto e modelos próximos. Sem simulador de autonomia e sem acessórios no configurador.
- Comparador de até três modelos.
- Quiz “me ajude a escolher”.
- WhatsApp no lugar do test ride por loja. A aba Lojas saiu. Pedido de troca sem preço continua.
- Carrinho, checkout (Pix, boleto, cartão, cupom, CEP) e página do pedido com sandbox.
- Conta de sandbox, lista de desejos e lista de pedidos deste navegador.
- Guias, legislação, FAQ, garantia e agendamento de serviço.
- Páginas institucionais: sobre, energia, garantia, trocas, financiamento, contato, privacidade.
- Admin com senha única e cookie httpOnly. Fora de produção o token de desenvolvimento ainda entra. Pedidos e o cadastro novo ficam na memória da API. A vitrine lê `GET /v1/products`.

## O que esta versão não entrega

Pagamento real, webhook, ViaCEP, Melhor Envio, NF-e, CMS, busca Meilisearch, glTF, conta com link mágico, e estoque do admin refletido na vitrine. A lista fechada está no [roadmap](roadmap.md).

## Como a loja deve parecer

Grafite, tipo fino, um único vermelho no botão principal. O verde-água só no selo Pix. Preço e parcela acima da dobra. Faixa de WhatsApp grudada na base, exceto no checkout, na página de conversa, no admin e na página do modelo (ali a barra móvel é a de reservar).
