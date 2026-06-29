-- Migration 010: ENFORCEMENT — RLS condicional (cierra escrituras de la liga)
-- Ejecutar en Supabase SQL Editor.
--
-- Objetivo: que la clave pública (anon) ya NO pueda ESCRIBIR los datos de los
-- pozos de una LIGA (modelo v2). Esas escrituras pasan ahora por endpoints del
-- servidor (service role, que bypassa RLS) y validan la sesión del jugador/admin.
--
-- Los grupos VIEJOS (sin liga, `liga_id IS NULL`) siguen funcionando igual:
-- conservan escritura anon (para no romper a otros usuarios).
--
-- Las LECTURAS (SELECT) quedan abiertas como hasta ahora (no cambia la app).

-- ── pronosticos ──
DROP POLICY IF EXISTS "public_pronosticos" ON pronosticos;
CREATE POLICY "read_pronosticos" ON pronosticos FOR SELECT TO anon USING (true);
-- INSERT/UPDATE/DELETE solo si el participante pertenece a un grupo SIN liga (legacy)
CREATE POLICY "ins_pronosticos_legacy" ON pronosticos FOR INSERT TO anon
  WITH CHECK (EXISTS (SELECT 1 FROM participantes pa JOIN grupos g ON g.id = pa.grupo_id
                      WHERE pa.id = participante_id AND g.liga_id IS NULL));
CREATE POLICY "upd_pronosticos_legacy" ON pronosticos FOR UPDATE TO anon
  USING (EXISTS (SELECT 1 FROM participantes pa JOIN grupos g ON g.id = pa.grupo_id
                 WHERE pa.id = pronosticos.participante_id AND g.liga_id IS NULL));
CREATE POLICY "del_pronosticos_legacy" ON pronosticos FOR DELETE TO anon
  USING (EXISTS (SELECT 1 FROM participantes pa JOIN grupos g ON g.id = pa.grupo_id
                 WHERE pa.id = pronosticos.participante_id AND g.liga_id IS NULL));

-- ── participantes ──
DROP POLICY IF EXISTS "public_participantes" ON participantes;
CREATE POLICY "read_participantes" ON participantes FOR SELECT TO anon USING (true);
CREATE POLICY "ins_participantes_legacy" ON participantes FOR INSERT TO anon
  WITH CHECK (EXISTS (SELECT 1 FROM grupos g WHERE g.id = grupo_id AND g.liga_id IS NULL));
CREATE POLICY "upd_participantes_legacy" ON participantes FOR UPDATE TO anon
  USING (EXISTS (SELECT 1 FROM grupos g WHERE g.id = participantes.grupo_id AND g.liga_id IS NULL));
CREATE POLICY "del_participantes_legacy" ON participantes FOR DELETE TO anon
  USING (EXISTS (SELECT 1 FROM grupos g WHERE g.id = participantes.grupo_id AND g.liga_id IS NULL));

-- ── survivor_picks (solo existe en ligas) → anon NO escribe, solo lee ──
DROP POLICY IF EXISTS "public_survivor_picks" ON survivor_picks;
CREATE POLICY "read_survivor_picks" ON survivor_picks FOR SELECT TO anon USING (true);

-- ── ligas → solo lectura para anon ──
DROP POLICY IF EXISTS "public_ligas" ON ligas;
CREATE POLICY "read_ligas" ON ligas FOR SELECT TO anon USING (true);

-- NOTA: `partidos` y `grupos` se dejan como están (resultados y pozos no son
-- datos privados del jugador; los grupos viejos necesitan esas políticas).
-- Las escrituras de la liga sobre partidos/pronosticos las hace el servidor.

-- ─────────────────────────────────────────────────────────
-- VERIFICACIÓN: con la clave pública (anon), un INSERT/UPDATE de pronosticos
-- de un participante de la liga debe FALLAR; el de un grupo viejo debe pasar.
-- ─────────────────────────────────────────────────────────
