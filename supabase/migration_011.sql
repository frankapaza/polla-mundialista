-- Migration 011: PREDICCIONES DEL MODELO (marcador probable híbrido Klement+Poisson)
-- Ejecutar en Supabase SQL Editor.
--
-- Crea la tabla `predicciones_modelo`: el marcador probable calculado por el
-- modelo (skill `prediccion-mundial`) para mostrarse como sugerencia en la
-- pantalla de Predicciones, junto al pronóstico que carga cada jugador.
--
-- `goles_local/visitante` guardan el MARCADOR SUGERIDO (alineado con el
-- favorito). Las probabilidades 1/X/2, la fuerza Klement y la confianza
-- acompañan para dar contexto. `datos_completos=false` indica modelo base
-- (sin ajuste por forma/lesiones recientes); se puede regenerar con la skill.

CREATE TABLE IF NOT EXISTS predicciones_modelo (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partido_id        UUID NOT NULL REFERENCES partidos(id) ON DELETE CASCADE,
  goles_local       INT  NOT NULL CHECK (goles_local >= 0),
  goles_visitante   INT  NOT NULL CHECK (goles_visitante >= 0),
  prob_local        NUMERIC(4,3) NOT NULL,
  prob_empate       NUMERIC(4,3) NOT NULL,
  prob_visitante    NUMERIC(4,3) NOT NULL,
  fuerza_local      NUMERIC(4,3),
  fuerza_visitante  NUMERIC(4,3),
  confianza         TEXT NOT NULL CHECK (confianza IN ('alta','media','baja')),
  datos_completos   BOOLEAN NOT NULL DEFAULT false,
  justificacion     TEXT,
  fuentes           JSONB,
  generado_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (partido_id)
);

CREATE INDEX IF NOT EXISTS idx_predicciones_partido ON predicciones_modelo(partido_id);

-- ── RLS: lectura abierta para anon; escritura solo servidor/SQL (service role) ──
ALTER TABLE predicciones_modelo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_predicciones_modelo" ON predicciones_modelo;
CREATE POLICY "read_predicciones_modelo" ON predicciones_modelo FOR SELECT TO anon USING (true);

-- ── Seed: 16avos de final (ronda de 32) — investigación en vivo ──
-- Marcadores del modelo híbrido (FIFA 0.62 + socio-económico) AJUSTADOS con
-- investigación web por partido (ranking FIFA actual, forma reciente, H2H,
-- lesiones) → datos_completos=true. Generado con la skill `prediccion-mundial`.
-- Se vincula por numero_partido para no depender de los UUID generados.
INSERT INTO predicciones_modelo
  (partido_id, goles_local, goles_visitante, prob_local, prob_empate, prob_visitante,
   fuerza_local, fuerza_visitante, confianza, datos_completos, justificacion, fuentes)
SELECT p.id, v.gl, v.gv, v.pl, v.px, v.pv, v.fl, v.fv, v.conf, true, v.just,
       '["investigación web en vivo: ranking FIFA, forma reciente, H2H, lesiones"]'::jsonb
FROM (VALUES
  (73, 0, 1, 0.269, 0.261, 0.470, 0.282, 0.410, 'media',
      'Canadá favorito: mejor ranking FIFA (1551 vs 1451), ventaja anfitrión y forma goleadora (6-0 a Qatar); Sudáfrica con sequía de goles.'),
  (74, 1, 1, 0.403, 0.254, 0.343, 0.611, 0.607, 'baja',
      'Brasil favorito por FIFA (1785 vs 1674) y forma, pero Japón (sub 3-2 en oct-25, PIB alto) empareja: cruce parejo, marcador modal 1-1.'),
  (75, 1, 0, 0.574, 0.232, 0.194, 0.606, 0.307, 'alta',
      'Alemania favorita: ventaja FIFA (1726 vs 1505) y mejor forma goleadora en grupos; Paraguay pasó como 3ro y descuenta. H2H parejo.'),
  (76, 1, 1, 0.394, 0.249, 0.357, 0.610, 0.605, 'baja',
      'Cruce parejo: FIFA casi igual (NED 7mo, MAR 6to 1776 pts), ambos en gran forma y sin bajas. Klement no separa favorito; cancha neutral.'),
  (77, 1, 1, 0.359, 0.247, 0.393, 0.309, 0.300, 'baja',
      'Cruce parejo: FIFA casi igualada, Noruega leve favorita con Haaland y titulares descansados; Costa de Marfil en gran forma. Sin historial previo.'),
  (78, 2, 0, 0.681, 0.190, 0.129, 0.791, 0.340, 'alta',
      'Francia muy superior (FIFA 1870 vs 1509), ganó su grupo 9/9 y domina el H2H; Suecia llegó 3ª tras goleada ante Países Bajos.'),
  (79, 1, 0, 0.522, 0.237, 0.241, 0.590, 0.432, 'media',
      'México anfitrión, FIFA 1687 vs 1598 y 3-0-0 sin recibir goles; Ecuador defensivo. H2H reciente cerradísimo (1-1, 0-0, 0-0).'),
  (80, 2, 0, 0.660, 0.195, 0.145, 0.747, 0.240, 'alta',
      'Inglaterra (FIFA 1847, 4 victorias en 5) domina por fuerza; Congo RD (FIFA 1472) llega con impulso por Wissa pero es inferior.'),
  (81, 1, 0, 0.512, 0.241, 0.247, 0.600, 0.404, 'media',
      'Bélgica favorita por mayor fuerza FIFA (1735 vs 1653), ganó su grupo con la mejor defensa y domina el H2H; Senegal llegó 3ro y concedió 6 goles.'),
  (82, 1, 0, 0.572, 0.233, 0.195, 0.559, 0.220, 'alta',
      'USA favorito: FIFA 1709 vs 1387, anfitrión y 8 goles en grupo. Bosnia (3º de grupo) cede atrás; duda por molestia de Pulisic.'),
  (83, 1, 0, 0.574, 0.231, 0.196, 0.815, 0.436, 'alta',
      'España favorita por fuerza FIFA (1880 vs 1599) y mejor forma; Austria avanzó con defensa frágil. Bajas de Nico Williams y Pino limitan a España.'),
  (84, 1, 0, 0.436, 0.248, 0.315, 0.680, 0.608, 'media',
      'Portugal favorita: más fuerza FIFA y dominio H2H (invicta competitiva); Croacia llega con impulso (2 triunfos) pero pierde el cruce histórico.'),
  (85, 2, 0, 0.666, 0.195, 0.140, 0.549, 0.152, 'alta',
      'Colombia muy superior: FIFA 1729 vs 1398, grupo K invicta (3-1, 1-0, 0-0 vs Portugal), domina H2H 4-1; Ghana cayó 2-1 con Croacia y sin Salisu.'),
  (86, 2, 1, 0.498, 0.239, 0.263, 0.416, 0.300, 'media',
      'Suiza (FIFA #19) llega como favorita por mayor fuerza y forma (3V-2E, ganó su grupo); Argelia ataca pero concede mucho. Historial favorece a Suiza.'),
  (87, 1, 1, 0.379, 0.275, 0.346, 0.386, 0.363, 'baja',
      'Cruce parejo: FIFA casi igual (1579 vs 1562). Egipto invicto en grupo pero Salah lesionado (duda); Australia con poco gol. H2H 1-1.'),
  (88, 2, 0, 0.740, 0.167, 0.093, 0.774, 0.162, 'alta',
      'Argentina #1 FIFA (1877 pts) vs Cabo Verde #64 (1402); brecha enorme. Cabo Verde defendió bien (3 empates) pero casi no anota. Argentina gana cómodo.')
) AS v(num, gl, gv, pl, px, pv, fl, fv, conf, just)
JOIN partidos p ON p.numero_partido = v.num
ON CONFLICT (partido_id) DO UPDATE SET
  goles_local = EXCLUDED.goles_local,
  goles_visitante = EXCLUDED.goles_visitante,
  prob_local = EXCLUDED.prob_local,
  prob_empate = EXCLUDED.prob_empate,
  prob_visitante = EXCLUDED.prob_visitante,
  fuerza_local = EXCLUDED.fuerza_local,
  fuerza_visitante = EXCLUDED.fuerza_visitante,
  confianza = EXCLUDED.confianza,
  datos_completos = EXCLUDED.datos_completos,
  justificacion = EXCLUDED.justificacion,
  fuentes = EXCLUDED.fuentes,
  generado_at = NOW();

-- VERIFICACIÓN:
--   SELECT pm.goles_local, pm.goles_visitante, pm.confianza, pa.equipo_local, pa.equipo_visitante
--   FROM predicciones_modelo pm JOIN partidos pa ON pa.id = pm.partido_id
--   ORDER BY pa.numero_partido;
