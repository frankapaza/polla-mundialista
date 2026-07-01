-- Migration 012: COBRO CON YAPE (semi-automático) + nombre del admin por grupo
-- Ejecutar en Supabase SQL Editor.
--
-- Modelo:
--  · Cada LIGA tiene un Yape (número + nombre + QR) que configura su admin.
--  · El jugador paga desde su Yape y REPORTA el código de operación.
--  · El admin CONFIRMA (o rechaza) el pago reportado.
--  · `participantes.pago` (boolean) sigue siendo la fuente de verdad para los
--    gates existentes: pago = (pago_estado = 'confirmado').

-- ── Quién administra cada grupo (lo fija el superadmin, junto a la contraseña) ──
ALTER TABLE grupos ADD COLUMN IF NOT EXISTS admin_nombre TEXT;

-- ── Config de cobro por liga ──
ALTER TABLE ligas ADD COLUMN IF NOT EXISTS yape_numero   TEXT;  -- celular Yape del organizador
ALTER TABLE ligas ADD COLUMN IF NOT EXISTS yape_nombre   TEXT;  -- titular de la cuenta Yape
ALTER TABLE ligas ADD COLUMN IF NOT EXISTS yape_qr_url   TEXT;  -- URL de la imagen del QR (opcional)

-- ── Flujo de pago semi-automático en participantes ──
ALTER TABLE participantes ADD COLUMN IF NOT EXISTS pago_estado TEXT NOT NULL DEFAULT 'pendiente'
  CHECK (pago_estado IN ('pendiente','reportado','confirmado'));
ALTER TABLE participantes ADD COLUMN IF NOT EXISTS pago_operacion    TEXT;         -- código de operación Yape reportado
ALTER TABLE participantes ADD COLUMN IF NOT EXISTS pago_reportado_at TIMESTAMPTZ;  -- cuándo lo reportó el jugador

-- Backfill: quien ya figuraba como pagado queda 'confirmado'.
UPDATE participantes SET pago_estado = 'confirmado' WHERE pago = true AND pago_estado = 'pendiente';

-- VERIFICACIÓN:
--   SELECT nombre, pago, pago_estado, pago_operacion FROM participantes ORDER BY pago_estado;
--   SELECT codigo, admin_nombre, yape_numero, yape_nombre FROM ligas;
