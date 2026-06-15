-- Migration 004: marca de infracción en pronósticos
-- Un pronóstico se marca como infracción cuando se editó al resultado exacto
-- DESPUÉS de iniciado el partido. Siempre vale 0 puntos y se muestra en rojo.
ALTER TABLE pronosticos ADD COLUMN IF NOT EXISTS infraccion BOOLEAN NOT NULL DEFAULT false;

-- Infracciones detectadas en el partido #31 (Países Bajos 2-2 Japón):
-- Luis Encarnacion y Paola Villacorta editaron su marcador a 2-2 después de
-- que el resultado ya estaba cargado (partido terminado). Ver fixture-horas-y-puntos.
UPDATE pronosticos
SET infraccion = true, puntos = 0, updated_at = NOW()
WHERE id IN (
  'c3affd7d-b677-46ac-b0e1-3270f36956b1',  -- Luis Encarnacion
  '8eb4923e-8a57-4e24-805a-e110317ad9fd'   -- Paola Villacorta Alegría
);
