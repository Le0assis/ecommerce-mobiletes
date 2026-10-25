-- Preenche orders.public_id ainda nulo com payload->>'publicId'.
-- Só entra valor não vazio. Valor já usado por outro pedido, ou repetido entre
-- os candidatos nulos, fica de fora. Não apaga linha e não altera outra coluna.
-- Rodar de novo não muda quem já foi preenchido.
UPDATE "orders" AS o
SET "public_id" = candidate.public_id
FROM (
  SELECT
    "code",
    payload->>'publicId' AS public_id,
    count(*) OVER (PARTITION BY payload->>'publicId') AS copies
  FROM "orders"
  WHERE "public_id" IS NULL
    AND nullif(btrim(payload->>'publicId'), '') IS NOT NULL
) AS candidate
WHERE o."code" = candidate."code"
  AND candidate.copies = 1
  AND NOT EXISTS (
    SELECT 1
    FROM "orders" AS other
    WHERE other."public_id" = candidate.public_id
      AND other."code" <> candidate."code"
  );
