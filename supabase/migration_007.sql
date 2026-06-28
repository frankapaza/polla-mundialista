-- Migration 007: FASE ELIMINATORIA — carga de partidos (Round of 32 → Final)
-- Ejecutar en Supabase SQL Editor.
--
-- Mundial 2026 (48 equipos): la primera ronda eliminatoria es DIECISEISAVOS
-- (Round of 32, 16 partidos), NO octavos. Estructura completa = 32 partidos:
--   16avos  73..88  (16)   octavos 89..96  (8)
--   cuartos 97..100 (4)    semis   101..102 (2)
--   tercero 103     (1)    final   104     (1)
--
-- 16avos: los 16 cargados con fechas REALES. 14 con ambos equipos definidos;
--         2 con rival por definir (#83 España vs 2° Grupo J, #86 Suiza vs
--         3° Grupo G/J) hasta que cierren los grupos J/G.
-- Rondas siguientes: PLACEHOLDER ("Por definir") y fecha NULL hasta conocerse.
--
-- SUPUESTOS A CONFIRMAR:
--   * Horas en zona horaria de Perú (UTC-05:00), igual que el resto del repo.
--   * fase '16avos' es nueva: requiere agregarla en src/lib/types.ts y en las
--     pestañas del panel admin (cambio de app, aparte de esta migración).
--
-- IDEMPOTENTE: ON CONFLICT (numero_partido) DO NOTHING. La BD hoy no tiene
-- partidos > 72, así que esta es la carga inicial.

INSERT INTO partidos (numero_partido, fase, grupo_torneo, equipo_local, equipo_visitante, fecha) VALUES

-- ══════════════════════════════════════════════════════════
-- DIECISEISAVOS (Round of 32) — 16 partidos · equipos y fechas reales
-- ══════════════════════════════════════════════════════════
(73, '16avos', NULL, 'Sudáfrica',      'Canadá',                '2026-06-28T14:00:00-05:00'),
(74, '16avos', NULL, 'Brasil',         'Japón',                 '2026-06-29T12:00:00-05:00'),
(75, '16avos', NULL, 'Alemania',       'Paraguay',              '2026-06-29T15:30:00-05:00'),
(76, '16avos', NULL, 'Países Bajos',   'Marruecos',             '2026-06-29T20:00:00-05:00'),
(77, '16avos', NULL, 'Costa de Marfil','Noruega',               '2026-06-30T12:00:00-05:00'),
(78, '16avos', NULL, 'Francia',        'Suecia',                '2026-06-30T16:00:00-05:00'),
(79, '16avos', NULL, 'México',         'Ecuador',               '2026-06-30T20:00:00-05:00'),
(80, '16avos', NULL, 'Inglaterra',     'Congo RD',              '2026-07-01T11:00:00-05:00'),
(81, '16avos', NULL, 'Bélgica',        'Senegal',               '2026-07-01T15:00:00-05:00'),
(82, '16avos', NULL, 'Estados Unidos', 'Bosnia y Herzegovina',  '2026-07-01T19:00:00-05:00'),
(83, '16avos', NULL, 'España',         '2° Grupo J',            '2026-07-02T14:00:00-05:00'),
(84, '16avos', NULL, 'Portugal',       'Croacia',               '2026-07-02T18:00:00-05:00'),
(85, '16avos', NULL, 'Colombia',       'Ghana',                 '2026-07-02T20:30:00-05:00'),
(86, '16avos', NULL, 'Suiza',          '3° Grupo G/J',          '2026-07-02T22:00:00-05:00'),
(87, '16avos', NULL, 'Australia',      'Egipto',                '2026-07-03T14:00:00-05:00'),  -- hora aprox.
(88, '16avos', NULL, 'Argentina',      'Cabo Verde',            '2026-07-03T17:00:00-05:00'),

-- ══════════════════════════════════════════════════════════
-- OCTAVOS DE FINAL (Round of 16) — 8 partidos · por definir
-- ══════════════════════════════════════════════════════════
(89, 'octavos', NULL, 'Por definir', 'Por definir', NULL),
(90, 'octavos', NULL, 'Por definir', 'Por definir', NULL),
(91, 'octavos', NULL, 'Por definir', 'Por definir', NULL),
(92, 'octavos', NULL, 'Por definir', 'Por definir', NULL),
(93, 'octavos', NULL, 'Por definir', 'Por definir', NULL),
(94, 'octavos', NULL, 'Por definir', 'Por definir', NULL),
(95, 'octavos', NULL, 'Por definir', 'Por definir', NULL),
(96, 'octavos', NULL, 'Por definir', 'Por definir', NULL),

-- ══════════════════════════════════════════════════════════
-- CUARTOS DE FINAL — 4 partidos · por definir
-- ══════════════════════════════════════════════════════════
(97,  'cuartos', NULL, 'Por definir', 'Por definir', NULL),
(98,  'cuartos', NULL, 'Por definir', 'Por definir', NULL),
(99,  'cuartos', NULL, 'Por definir', 'Por definir', NULL),
(100, 'cuartos', NULL, 'Por definir', 'Por definir', NULL),

-- ══════════════════════════════════════════════════════════
-- SEMIFINALES — 2 partidos · por definir
-- ══════════════════════════════════════════════════════════
(101, 'semis', NULL, 'Por definir', 'Por definir', NULL),
(102, 'semis', NULL, 'Por definir', 'Por definir', NULL),

-- ══════════════════════════════════════════════════════════
-- TERCER PUESTO — 1 partido
-- ══════════════════════════════════════════════════════════
(103, 'tercero', NULL, 'Perdedor SF1', 'Perdedor SF2', NULL),

-- ══════════════════════════════════════════════════════════
-- FINAL — 1 partido
-- ══════════════════════════════════════════════════════════
(104, 'final', NULL, 'Ganador SF1', 'Ganador SF2', NULL)

ON CONFLICT (numero_partido) DO NOTHING;

-- ─────────────────────────────────────────────────────────
-- VERIFICACIÓN (correr aparte). Esperado: 32 filas eliminatoria.
--   SELECT fase, count(*) AS n, min(numero_partido) AS desde, max(numero_partido) AS hasta
--   FROM partidos WHERE fase <> 'grupos' GROUP BY fase ORDER BY desde;
--   -- 16avos=16, octavos=8, cuartos=4, semis=2, tercero=1, final=1
-- ─────────────────────────────────────────────────────────
