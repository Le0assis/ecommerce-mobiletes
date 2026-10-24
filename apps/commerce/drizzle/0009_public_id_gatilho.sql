-- Gatilho de public_id. Não cria DEFAULT e não torna a coluna NOT NULL.
-- Esta migration já pode ter rodado com a cópia cega. Reaplicar o arquivo não
-- pode desfazer a 0010: a função e o gatilho só nascem se ainda não existem.
-- O corpo inicial não copia token. A 0010 substitui a função e o gatilho.
-- Pode rodar de novo.
DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc AS proc
    JOIN pg_namespace AS ns ON ns.oid = proc.pronamespace
    WHERE proc.proname = 'orders_public_id_from_payload'
      AND ns.nspname = 'public'
  ) THEN
    EXECUTE $fn$
      CREATE FUNCTION orders_public_id_from_payload()
      RETURNS trigger
      LANGUAGE plpgsql
      SET search_path = public
      AS $body$
      BEGIN
        RETURN NEW;
      END;
      $body$;
    $fn$;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'orders_public_id_from_payload'
      AND tgrelid = '"orders"'::regclass
      AND NOT tgisinternal
  ) THEN
    EXECUTE $tg$
      CREATE TRIGGER orders_public_id_from_payload
      BEFORE INSERT ON "orders"
      FOR EACH ROW
      EXECUTE FUNCTION orders_public_id_from_payload();
    $tg$;
  END IF;
END
$migration$;
