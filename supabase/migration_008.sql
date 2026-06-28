-- Migration 008: LIGA + POZOS POR FASE + SURVIVOR
-- Ejecutar en Supabase SQL Editor.
--
-- Introduce el concepto de "liga" (paréntesis con un código único) que agrupa
-- varios "pozos". Cada pozo reusa la tabla `grupos` extendida con:
--   liga_id, modo ('clasico'|'survivor'), fases (qué fases del torneo cubre).
-- La identidad del jugador persiste por `documento` dentro de la liga; el pago
-- sigue siendo por pozo (campo `pago` de participantes). NO se toca `pronosticos`.
--
-- IDEMPOTENTE: usa IF NOT EXISTS / ON CONFLICT para poder re-ejecutarse.

-- ─────────────────────────────────────────────────────────
-- 1) Tabla ligas
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ligas (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre         TEXT NOT NULL,
  codigo         TEXT UNIQUE NOT NULL,
  admin_password TEXT,
  campeon        TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  created_by     TEXT,
  updated_by     TEXT
);

-- ─────────────────────────────────────────────────────────
-- 2) grupos -> pozos (columnas nuevas, aditivas)
-- ─────────────────────────────────────────────────────────
ALTER TABLE grupos ADD COLUMN IF NOT EXISTS liga_id UUID REFERENCES ligas(id) ON DELETE CASCADE;
ALTER TABLE grupos ADD COLUMN IF NOT EXISTS modo    TEXT     NOT NULL DEFAULT 'clasico';   -- 'clasico' | 'survivor'
ALTER TABLE grupos ADD COLUMN IF NOT EXISTS fases   TEXT[]   NOT NULL DEFAULT '{grupos}';  -- fases del torneo que cubre el pozo
CREATE INDEX IF NOT EXISTS idx_grupos_liga ON grupos(liga_id);

-- ─────────────────────────────────────────────────────────
-- 3) survivor_picks (un pick por jugador y fase en pozos modo='survivor')
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS survivor_picks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participante_id UUID NOT NULL REFERENCES participantes(id) ON DELETE CASCADE,
  fase            TEXT NOT NULL,
  equipo          TEXT NOT NULL,
  partido_id      UUID REFERENCES partidos(id) ON DELETE SET NULL,
  estado          TEXT NOT NULL DEFAULT 'pendiente',  -- 'pendiente' | 'sobrevive' | 'eliminado'
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      TEXT,
  updated_by      TEXT,
  UNIQUE(participante_id, fase)
);
CREATE INDEX IF NOT EXISTS idx_survivor_part ON survivor_picks(participante_id);

-- ─────────────────────────────────────────────────────────
-- 4) RLS permisiva (igual que el resto de tablas; ver schema.sql / migration_006)
-- ─────────────────────────────────────────────────────────
ALTER TABLE ligas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE survivor_picks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_ligas"          ON ligas;
DROP POLICY IF EXISTS "public_survivor_picks" ON survivor_picks;
CREATE POLICY "public_ligas"          ON ligas          FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "public_survivor_picks" ON survivor_picks FOR ALL TO anon USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────
-- 5) Triggers de auditoría (función audit_row de migration_006)
-- ─────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_audit ON ligas;
CREATE TRIGGER trg_audit BEFORE UPDATE ON ligas          FOR EACH ROW EXECUTE FUNCTION audit_row();
DROP TRIGGER IF EXISTS trg_audit ON survivor_picks;
CREATE TRIGGER trg_audit BEFORE UPDATE ON survivor_picks FOR EACH ROW EXECUTE FUNCTION audit_row();

-- ─────────────────────────────────────────────────────────
-- 6) Datos: liga + colgar grupo actual + crear pozos nuevos
-- ─────────────────────────────────────────────────────────
-- Liga con el código que la gente ya conoce (mismo que el grupo actual).
INSERT INTO ligas (nombre, codigo)
VALUES ('Apostadores Responsables', 'NZK74Y')
ON CONFLICT (codigo) DO NOTHING;

-- El grupo actual pasa a ser el pozo "Fase de grupos" (congelado).
UPDATE grupos
   SET liga_id = (SELECT id FROM ligas WHERE codigo = 'NZK74Y'),
       modo    = 'clasico',
       fases   = '{grupos}'
 WHERE codigo = 'NZK74Y';

-- Pozos nuevos de eliminatoria (costo 0 por defecto; se ajusta desde el admin).
INSERT INTO grupos (nombre, codigo, costo_inscripcion, liga_id, modo, fases)
VALUES ('16avos de final', 'NZK74Y-16A', 0,
        (SELECT id FROM ligas WHERE codigo='NZK74Y'), 'clasico', '{16avos}')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO grupos (nombre, codigo, costo_inscripcion, liga_id, modo, fases)
VALUES ('Octavos de final', 'NZK74Y-8VO', 0,
        (SELECT id FROM ligas WHERE codigo='NZK74Y'), 'clasico', '{octavos}')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO grupos (nombre, codigo, costo_inscripcion, liga_id, modo, fases)
VALUES ('Survivor — Recta Final', 'NZK74Y-SUR', 0,
        (SELECT id FROM ligas WHERE codigo='NZK74Y'), 'survivor', '{cuartos,semis,final}')
ON CONFLICT (codigo) DO NOTHING;

-- ─────────────────────────────────────────────────────────
-- VERIFICACIÓN (correr aparte). Esperado:
--   1 liga 'Apostadores Responsables', y 4 pozos colgados de ella:
--   Fase de grupos {grupos} clasico, 16avos {16avos} clasico,
--   Octavos {octavos} clasico, Survivor {cuartos,semis,final} survivor.
--
--   SELECT g.nombre, g.codigo, g.modo, g.fases
--   FROM grupos g JOIN ligas l ON l.id = g.liga_id
--   WHERE l.codigo = 'NZK74Y' ORDER BY g.created_at;
-- ─────────────────────────────────────────────────────────
