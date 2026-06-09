-- Polla Mundialista 2026 - Schema
-- Ejecutar en Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grupos (pollas)
CREATE TABLE IF NOT EXISTS grupos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT NOT NULL,
  codigo     TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participantes
CREATE TABLE IF NOT EXISTS participantes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id   UUID NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  nombre     TEXT NOT NULL,
  documento  TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(grupo_id, documento)
);

-- Partidos del Mundial 2026
CREATE TABLE IF NOT EXISTS partidos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_partido   INT  UNIQUE NOT NULL,
  fase             TEXT NOT NULL DEFAULT 'grupos',
  grupo_torneo     TEXT,                    -- 'A'..'L' en fase de grupos
  equipo_local     TEXT NOT NULL,
  equipo_visitante TEXT NOT NULL,
  fecha            TIMESTAMPTZ,
  goles_local      INT,                     -- NULL hasta que se juegue
  goles_visitante  INT
);

-- Pronosticos
CREATE TABLE IF NOT EXISTS pronosticos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participante_id  UUID NOT NULL REFERENCES participantes(id) ON DELETE CASCADE,
  partido_id       UUID NOT NULL REFERENCES partidos(id)     ON DELETE CASCADE,
  goles_local      INT  NOT NULL CHECK (goles_local >= 0),
  goles_visitante  INT  NOT NULL CHECK (goles_visitante >= 0),
  puntos           INT,                     -- NULL hasta que se registre resultado
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participante_id, partido_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_participantes_grupo    ON participantes(grupo_id);
CREATE INDEX IF NOT EXISTS idx_pronosticos_participante ON pronosticos(participante_id);
CREATE INDEX IF NOT EXISTS idx_pronosticos_partido    ON pronosticos(partido_id);
CREATE INDEX IF NOT EXISTS idx_partidos_fase          ON partidos(fase);
CREATE INDEX IF NOT EXISTS idx_partidos_numero        ON partidos(numero_partido);

-- Row Level Security (permisivo - ajustar si se agrega autenticación real)
ALTER TABLE grupos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE partidos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pronosticos   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_grupos"        ON grupos        FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "public_participantes" ON participantes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "read_partidos"        ON partidos      FOR SELECT TO anon USING (true);
CREATE POLICY "update_partidos"      ON partidos      FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "public_pronosticos"   ON pronosticos   FOR ALL TO anon USING (true) WITH CHECK (true);
