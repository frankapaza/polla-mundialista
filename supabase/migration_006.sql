-- Migration 006: AUDITORÍA en todas las tablas
-- Agrega created_at / updated_at / created_by / updated_by y triggers.
-- created_at y created_by quedan INMUTABLES (protegidos por trigger del lado
-- servidor: no se pueden cambiar ni con la clave pública). updated_at se
-- autocompleta en cada cambio.
--
-- NOTA de seguridad: esto deja el RASTRO de quién/cuándo, pero NO impide que
-- alguien con la anon key escriba (eso requeriría mover las escrituras al
-- servidor — nivel "candado total", no elegido).

-- 1) Columnas (IF NOT EXISTS: las que ya existen no se tocan)
ALTER TABLE grupos        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE grupos        ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE grupos        ADD COLUMN IF NOT EXISTS updated_by TEXT;

ALTER TABLE participantes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE participantes ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE participantes ADD COLUMN IF NOT EXISTS updated_by TEXT;

ALTER TABLE partidos      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE partidos      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE partidos      ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE partidos      ADD COLUMN IF NOT EXISTS updated_by TEXT;

ALTER TABLE pronosticos   ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE pronosticos   ADD COLUMN IF NOT EXISTS updated_by TEXT;
-- (grupos/participantes/pronosticos ya traen created_at; pronosticos ya trae updated_at)

-- 2) Función de auditoría: protege created_* y autocompleta updated_at
CREATE OR REPLACE FUNCTION audit_row() RETURNS trigger AS $$
BEGIN
  NEW.created_at := OLD.created_at;   -- no se puede modificar
  NEW.created_by := OLD.created_by;   -- no se puede modificar
  NEW.updated_at := NOW();            -- refleja el último cambio
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3) Trigger BEFORE UPDATE en cada tabla
DROP TRIGGER IF EXISTS trg_audit ON grupos;
CREATE TRIGGER trg_audit BEFORE UPDATE ON grupos        FOR EACH ROW EXECUTE FUNCTION audit_row();
DROP TRIGGER IF EXISTS trg_audit ON participantes;
CREATE TRIGGER trg_audit BEFORE UPDATE ON participantes FOR EACH ROW EXECUTE FUNCTION audit_row();
DROP TRIGGER IF EXISTS trg_audit ON partidos;
CREATE TRIGGER trg_audit BEFORE UPDATE ON partidos      FOR EACH ROW EXECUTE FUNCTION audit_row();
DROP TRIGGER IF EXISTS trg_audit ON pronosticos;
CREATE TRIGGER trg_audit BEFORE UPDATE ON pronosticos   FOR EACH ROW EXECUTE FUNCTION audit_row();
