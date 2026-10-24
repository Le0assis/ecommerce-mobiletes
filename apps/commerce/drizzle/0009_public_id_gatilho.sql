-- BEFORE INSERT: se public_id vem nulo, copia payload->>'publicId' quando o texto não é vazio.
-- Não cria DEFAULT e não torna a coluna NOT NULL. Não reescreve linha já gravada.
-- Pode rodar de novo.
CREATE OR REPLACE FUNCTION orders_public_id_from_payload()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.public_id IS NULL AND nullif(btrim(NEW.payload->>'publicId'), '') IS NOT NULL THEN
    NEW.public_id := NEW.payload->>'publicId';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS orders_public_id_from_payload ON "orders";--> statement-breakpoint
CREATE TRIGGER orders_public_id_from_payload
BEFORE INSERT ON "orders"
FOR EACH ROW
EXECUTE FUNCTION orders_public_id_from_payload();
