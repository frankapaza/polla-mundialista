-- Migration 009: AUTENTICACIÓN CON PIN — tabla jugadores
-- Ejecutar en Supabase SQL Editor.
--
-- Identidad real del jugador: 1 fila por (liga, documento), con PIN hasheado.
-- A diferencia del resto de tablas, `jugadores` NO es accesible con la clave
-- pública (anon): solo el servidor (service role) la lee/escribe. Por eso se
-- habilita RLS SIN políticas para anon => queda denegado por defecto, y el
-- pin_hash nunca viaja al navegador.
--
-- IDEMPOTENTE.

CREATE TABLE IF NOT EXISTS jugadores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liga_id           UUID NOT NULL REFERENCES ligas(id) ON DELETE CASCADE,
  documento         TEXT NOT NULL,
  nombre            TEXT NOT NULL,
  pin_hash          TEXT,                          -- NULL = aún no definió su PIN
  intentos_fallidos INT  NOT NULL DEFAULT 0,
  bloqueado_hasta   TIMESTAMPTZ,                    -- anti-fuerza-bruta
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  created_by        TEXT,
  updated_by        TEXT,
  UNIQUE(liga_id, documento)
);
CREATE INDEX IF NOT EXISTS idx_jugadores_liga ON jugadores(liga_id);

-- RLS habilitada y SIN políticas para anon => acceso denegado a la clave pública.
-- El service role (usado por los endpoints del servidor) bypassa RLS.
ALTER TABLE jugadores ENABLE ROW LEVEL SECURITY;

-- Auditoría (función audit_row de migration_006).
DROP TRIGGER IF EXISTS trg_audit ON jugadores;
CREATE TRIGGER trg_audit BEFORE UPDATE ON jugadores FOR EACH ROW EXECUTE FUNCTION audit_row();

-- Backfill: un jugador por (liga, documento) tomando el nombre más reciente.
INSERT INTO jugadores (liga_id, documento, nombre)
SELECT g.liga_id, p.documento, (array_agg(p.nombre ORDER BY p.created_at DESC))[1]
FROM participantes p
JOIN grupos g ON g.id = p.grupo_id
WHERE g.liga_id IS NOT NULL
GROUP BY g.liga_id, p.documento
ON CONFLICT (liga_id, documento) DO NOTHING;

-- ─────────────────────────────────────────────────────────
-- VERIFICACIÓN (correr aparte). Esperado: N jugadores (los DNIs únicos de la
-- liga), todos con pin_hash NULL (lo definen en el primer ingreso).
--   SELECT count(*) AS jugadores, count(pin_hash) AS con_pin FROM jugadores;
--   SELECT documento, nombre FROM jugadores ORDER BY nombre;
-- ─────────────────────────────────────────────────────────
