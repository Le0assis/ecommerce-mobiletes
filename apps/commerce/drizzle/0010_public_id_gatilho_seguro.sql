-- Copia payload->>'publicId' para public_id só quando o texto não é vazio,
-- nenhum outro pedido tem esse valor em public_id e nenhum outro pedido tem
-- esse valor em payload->>'publicId'. Caso contrário public_id continua NULL:
-- o índice único não estoura e o token de um par nulo não abre outro pedido.
-- A tabela não tem coluna id; a linha corrente sai pela chave code.
-- Só age quando public_id ainda é NULL. Não reescreve valor já gravado.
-- Não cria DEFAULT e não torna a coluna NOT NULL. Pode rodar de novo.
CREATE OR REPLACE FUNCTION orders_public_id_from_payload()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  token text;
BEGIN
  IF NEW.public_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  token := NEW.payload->>'publicId';
  IF nullif(btrim(token), '') IS NULL THEN
    RETURN NEW;
  END IF;

  -- INSERT não tem OLD. No UPDATE a linha ainda está gravada com o code anterior.
  IF TG_OP = 'INSERT' THEN
    IF EXISTS (
      SELECT 1
      FROM "orders" AS other
      WHERE other."code" IS DISTINCT FROM NEW."code"
        AND (
          other."public_id" = token
          OR other.payload->>'publicId' = token
        )
    ) THEN
      RETURN NEW;
    END IF;
  ELSIF EXISTS (
    SELECT 1
    FROM "orders" AS other
    WHERE other."code" IS DISTINCT FROM NEW."code"
      AND other."code" IS DISTINCT FROM OLD."code"
      AND (
        other."public_id" = token
        OR other.payload->>'publicId' = token
      )
  ) THEN
    RETURN NEW;
  END IF;

  NEW.public_id := token;
  RETURN NEW;
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS orders_public_id_from_payload ON "orders";--> statement-breakpoint
CREATE TRIGGER orders_public_id_from_payload
BEFORE INSERT OR UPDATE OF payload, public_id ON "orders"
FOR EACH ROW
WHEN (NEW.public_id IS NULL)
EXECUTE FUNCTION orders_public_id_from_payload();
