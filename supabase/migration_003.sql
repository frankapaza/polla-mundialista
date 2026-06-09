-- Migration 003: prediccion_campeon en participantes + campeon en grupos
ALTER TABLE participantes ADD COLUMN IF NOT EXISTS prediccion_campeon VARCHAR(100);
ALTER TABLE grupos ADD COLUMN IF NOT EXISTS campeon VARCHAR(100);
