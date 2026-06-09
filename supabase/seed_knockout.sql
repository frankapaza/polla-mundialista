-- FIFA World Cup 2026 - Fase Eliminatoria (32 equipos)
-- Equipos se actualizan desde el panel admin cuando se conozcan

INSERT INTO partidos (numero_partido, fase, grupo_torneo, equipo_local, equipo_visitante, fecha) VALUES

-- ══════════════════════════════════════════════════════════
-- OCTAVOS DE FINAL (Round of 32) — 16 partidos
-- ══════════════════════════════════════════════════════════
(73,  'octavos', NULL, '1° Grupo A', '2° Grupo B', '2026-07-04T21:00:00-05:00'),
(74,  'octavos', NULL, '1° Grupo C', '2° Grupo D', '2026-07-05T00:00:00-05:00'),
(75,  'octavos', NULL, '1° Grupo E', '2° Grupo F', '2026-07-05T15:00:00-05:00'),
(76,  'octavos', NULL, '1° Grupo G', '2° Grupo H', '2026-07-05T19:00:00-05:00'),
(77,  'octavos', NULL, '1° Grupo I', '2° Grupo J', '2026-07-06T15:00:00-05:00'),
(78,  'octavos', NULL, '1° Grupo K', '2° Grupo L', '2026-07-06T19:00:00-05:00'),
(79,  'octavos', NULL, '1° Grupo B', '2° Grupo A', '2026-07-07T15:00:00-05:00'),
(80,  'octavos', NULL, '1° Grupo D', '2° Grupo C', '2026-07-07T19:00:00-05:00'),
(81,  'octavos', NULL, '1° Grupo F', '2° Grupo E', '2026-07-08T15:00:00-05:00'),
(82,  'octavos', NULL, '1° Grupo H', '2° Grupo G', '2026-07-08T19:00:00-05:00'),
(83,  'octavos', NULL, '1° Grupo J', '2° Grupo I', '2026-07-09T15:00:00-05:00'),
(84,  'octavos', NULL, '1° Grupo L', '2° Grupo K', '2026-07-09T19:00:00-05:00'),
(85,  'octavos', NULL, 'Mejor 3° (A/B/C/D)', 'Mejor 3° (E/F/G/H)', '2026-07-10T15:00:00-05:00'),
(86,  'octavos', NULL, 'Mejor 3° (I/J/K/L)', 'Mejor 3° (A/C/E)',   '2026-07-10T19:00:00-05:00'),
(87,  'octavos', NULL, 'Mejor 3° (B/D/F)',   'Mejor 3° (G/H/I)',   '2026-07-11T15:00:00-05:00'),
(88,  'octavos', NULL, 'Mejor 3° (J/K/L)',   'Mejor 3° (A/B/D)',   '2026-07-11T19:00:00-05:00'),

-- ══════════════════════════════════════════════════════════
-- CUARTOS DE FINAL — 8 partidos
-- ══════════════════════════════════════════════════════════
(89,  'cuartos', NULL, 'Ganador P73', 'Ganador P74', '2026-07-14T15:00:00-05:00'),
(90,  'cuartos', NULL, 'Ganador P75', 'Ganador P76', '2026-07-14T19:00:00-05:00'),
(91,  'cuartos', NULL, 'Ganador P77', 'Ganador P78', '2026-07-15T15:00:00-05:00'),
(92,  'cuartos', NULL, 'Ganador P79', 'Ganador P80', '2026-07-15T19:00:00-05:00'),
(93,  'cuartos', NULL, 'Ganador P81', 'Ganador P82', '2026-07-16T15:00:00-05:00'),
(94,  'cuartos', NULL, 'Ganador P83', 'Ganador P84', '2026-07-16T19:00:00-05:00'),
(95,  'cuartos', NULL, 'Ganador P85', 'Ganador P86', '2026-07-17T15:00:00-05:00'),
(96,  'cuartos', NULL, 'Ganador P87', 'Ganador P88', '2026-07-17T19:00:00-05:00'),

-- ══════════════════════════════════════════════════════════
-- SEMIFINALES — 4 partidos
-- ══════════════════════════════════════════════════════════
(97,  'semis', NULL, 'Ganador P89', 'Ganador P90', '2026-07-21T19:00:00-05:00'),
(98,  'semis', NULL, 'Ganador P91', 'Ganador P92', '2026-07-22T19:00:00-05:00'),
(99,  'semis', NULL, 'Ganador P93', 'Ganador P94', '2026-07-23T15:00:00-05:00'),
(100, 'semis', NULL, 'Ganador P95', 'Ganador P96', '2026-07-23T19:00:00-05:00'),

-- ══════════════════════════════════════════════════════════
-- TERCER PUESTO — 1 partido
-- ══════════════════════════════════════════════════════════
(101, 'tercero', NULL, 'Perdedor SF1', 'Perdedor SF2', '2026-07-25T15:00:00-05:00'),

-- ══════════════════════════════════════════════════════════
-- FINAL — 1 partido
-- ══════════════════════════════════════════════════════════
(102, 'final', NULL, 'Ganador SF1', 'Ganador SF2', '2026-07-26T15:00:00-05:00');
