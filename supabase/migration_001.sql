-- Migration 001: costo inscripción, cierre inscripciones, pago
-- Ejecutar en Supabase SQL Editor

ALTER TABLE grupos ADD COLUMN IF NOT EXISTS costo_inscripcion NUMERIC(10,2) DEFAULT 0;
ALTER TABLE grupos ADD COLUMN IF NOT EXISTS cierre_inscripciones TIMESTAMPTZ;

ALTER TABLE participantes ADD COLUMN IF NOT EXISTS pago BOOLEAN DEFAULT false;
