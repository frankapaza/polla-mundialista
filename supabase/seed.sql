-- Polla Mundialista 2026 - Fixture Fase de Grupos
-- Fuente: sorteo FIFA diciembre 2025
-- Ejecutar DESPUÉS del schema.sql

INSERT INTO partidos (numero_partido, fase, grupo_torneo, equipo_local, equipo_visitante, fecha) VALUES

-- ══════════════════════════════════════════════════════════
-- GRUPO A: México · Sudáfrica · Corea del Sur · Chequia
-- ══════════════════════════════════════════════════════════
-- Jornada 1
(1,  'grupos', 'A', 'México',       'Sudáfrica',    '2026-06-11T16:00:00-05:00'),
(2,  'grupos', 'A', 'Corea del Sur','Chequia',       '2026-06-11T22:00:00-05:00'),
-- Jornada 2
(3,  'grupos', 'A', 'México',       'Corea del Sur', '2026-06-18T16:00:00-05:00'),
(4,  'grupos', 'A', 'Sudáfrica',    'Chequia',        '2026-06-18T22:00:00-05:00'),
-- Jornada 3 (simultáneas)
(5,  'grupos', 'A', 'México',       'Chequia',        '2026-06-25T20:00:00+00:00'),
(6,  'grupos', 'A', 'Sudáfrica',    'Corea del Sur',  '2026-06-25T20:00:00+00:00'),

-- ══════════════════════════════════════════════════════════
-- GRUPO B: Canadá · Bosnia y Herzegovina · Catar · Suiza
-- ══════════════════════════════════════════════════════════
(7,  'grupos', 'B', 'Canadá',               'Bosnia y Herzegovina', '2026-06-12T15:00:00-04:00'),
(8,  'grupos', 'B', 'Catar',                'Suiza',               '2026-06-13T15:00:00-04:00'),
(9,  'grupos', 'B', 'Canadá',               'Catar',               '2026-06-19T16:00:00-04:00'),
(10, 'grupos', 'B', 'Bosnia y Herzegovina', 'Suiza',               '2026-06-19T19:00:00-04:00'),
(11, 'grupos', 'B', 'Canadá',               'Suiza',               '2026-06-26T20:00:00+00:00'),
(12, 'grupos', 'B', 'Bosnia y Herzegovina', 'Catar',               '2026-06-26T20:00:00+00:00'),

-- ══════════════════════════════════════════════════════════
-- GRUPO C: Brasil · Marruecos · Haití · Escocia
-- ══════════════════════════════════════════════════════════
(13, 'grupos', 'C', 'Brasil',    'Marruecos', '2026-06-13T18:00:00-04:00'),
(14, 'grupos', 'C', 'Haití',     'Escocia',   '2026-06-13T21:00:00-04:00'),
(15, 'grupos', 'C', 'Brasil',    'Haití',     '2026-06-20T16:00:00-04:00'),
(16, 'grupos', 'C', 'Marruecos', 'Escocia',   '2026-06-20T19:00:00-04:00'),
(17, 'grupos', 'C', 'Brasil',    'Escocia',   '2026-06-27T20:00:00+00:00'),
(18, 'grupos', 'C', 'Marruecos', 'Haití',     '2026-06-27T20:00:00+00:00'),

-- ══════════════════════════════════════════════════════════
-- GRUPO D: Estados Unidos · Paraguay · Australia · Turquía
-- ══════════════════════════════════════════════════════════
(19, 'grupos', 'D', 'Estados Unidos', 'Paraguay',  '2026-06-12T21:00:00-04:00'),
(20, 'grupos', 'D', 'Australia',      'Turquía',   '2026-06-13T22:00:00-04:00'),
(21, 'grupos', 'D', 'Estados Unidos', 'Australia', '2026-06-19T21:00:00-04:00'),
(22, 'grupos', 'D', 'Paraguay',       'Turquía',   '2026-06-20T21:00:00-04:00'),
(23, 'grupos', 'D', 'Estados Unidos', 'Turquía',   '2026-06-28T20:00:00+00:00'),
(24, 'grupos', 'D', 'Paraguay',       'Australia', '2026-06-28T20:00:00+00:00'),

-- ══════════════════════════════════════════════════════════
-- GRUPO E: Alemania · Curazao · Costa de Marfil · Ecuador
-- ══════════════════════════════════════════════════════════
(25, 'grupos', 'E', 'Alemania',         'Curazao',         '2026-06-14T13:00:00-05:00'),
(26, 'grupos', 'E', 'Costa de Marfil',  'Ecuador',         '2026-06-14T16:00:00-05:00'),
(27, 'grupos', 'E', 'Alemania',         'Costa de Marfil', '2026-06-21T16:00:00-05:00'),
(28, 'grupos', 'E', 'Curazao',          'Ecuador',         '2026-06-21T19:00:00-05:00'),
(29, 'grupos', 'E', 'Alemania',         'Ecuador',         '2026-06-29T20:00:00+00:00'),
(30, 'grupos', 'E', 'Curazao',          'Costa de Marfil', '2026-06-29T20:00:00+00:00'),

-- ══════════════════════════════════════════════════════════
-- GRUPO F: Países Bajos · Japón · Suecia · Túnez
-- ══════════════════════════════════════════════════════════
(31, 'grupos', 'F', 'Países Bajos', 'Japón',       '2026-06-14T19:00:00-05:00'),
(32, 'grupos', 'F', 'Suecia',       'Túnez',        '2026-06-14T22:00:00-05:00'),
(33, 'grupos', 'F', 'Países Bajos', 'Suecia',       '2026-06-21T22:00:00-05:00'),
(34, 'grupos', 'F', 'Japón',        'Túnez',        '2026-06-22T01:00:00-05:00'),
(35, 'grupos', 'F', 'Países Bajos', 'Túnez',        '2026-06-29T20:00:00+00:00'),
(36, 'grupos', 'F', 'Suecia',       'Japón',        '2026-06-29T20:00:00+00:00'),

-- ══════════════════════════════════════════════════════════
-- GRUPO G: Bélgica · Egipto · Irán · Nueva Zelanda
-- ══════════════════════════════════════════════════════════
(37, 'grupos', 'G', 'Bélgica',      'Egipto',       '2026-06-15T16:00:00-04:00'),
(38, 'grupos', 'G', 'Irán',         'Nueva Zelanda','2026-06-15T19:00:00-04:00'),
(39, 'grupos', 'G', 'Bélgica',      'Irán',         '2026-06-22T16:00:00-04:00'),
(40, 'grupos', 'G', 'Egipto',       'Nueva Zelanda','2026-06-22T19:00:00-04:00'),
(41, 'grupos', 'G', 'Bélgica',      'Nueva Zelanda','2026-07-01T20:00:00+00:00'),
(42, 'grupos', 'G', 'Egipto',       'Irán',         '2026-07-01T20:00:00+00:00'),

-- ══════════════════════════════════════════════════════════
-- GRUPO H: España · Cabo Verde · Arabia Saudita · Uruguay
-- ══════════════════════════════════════════════════════════
(43, 'grupos', 'H', 'España',        'Cabo Verde',    '2026-06-15T22:00:00-04:00'),
(44, 'grupos', 'H', 'Arabia Saudita','Uruguay',       '2026-06-16T01:00:00-04:00'),
(45, 'grupos', 'H', 'España',        'Arabia Saudita','2026-06-22T22:00:00-04:00'),
(46, 'grupos', 'H', 'Cabo Verde',    'Uruguay',       '2026-06-23T01:00:00-04:00'),
(47, 'grupos', 'H', 'España',        'Uruguay',       '2026-07-01T20:00:00+00:00'),
(48, 'grupos', 'H', 'Cabo Verde',    'Arabia Saudita','2026-07-01T20:00:00+00:00'),

-- ══════════════════════════════════════════════════════════
-- GRUPO I: Francia · Senegal · Iraq · Noruega
-- ══════════════════════════════════════════════════════════
(49, 'grupos', 'I', 'Francia', 'Senegal', '2026-06-16T16:00:00-04:00'),
(50, 'grupos', 'I', 'Iraq',    'Noruega', '2026-06-16T19:00:00-04:00'),
(51, 'grupos', 'I', 'Francia', 'Iraq',    '2026-06-23T16:00:00-04:00'),
(52, 'grupos', 'I', 'Senegal', 'Noruega', '2026-06-23T19:00:00-04:00'),
(53, 'grupos', 'I', 'Francia', 'Noruega', '2026-07-02T20:00:00+00:00'),
(54, 'grupos', 'I', 'Senegal', 'Iraq',    '2026-07-02T20:00:00+00:00'),

-- ══════════════════════════════════════════════════════════
-- GRUPO J: Argentina · Argelia · Austria · Jordania
-- ══════════════════════════════════════════════════════════
(55, 'grupos', 'J', 'Argentina', 'Argelia',  '2026-06-16T22:00:00-04:00'),
(56, 'grupos', 'J', 'Austria',   'Jordania', '2026-06-17T01:00:00-04:00'),
(57, 'grupos', 'J', 'Argentina', 'Austria',  '2026-06-23T22:00:00-04:00'),
(58, 'grupos', 'J', 'Argelia',   'Jordania', '2026-06-24T01:00:00-04:00'),
(59, 'grupos', 'J', 'Argentina', 'Jordania', '2026-07-02T20:00:00+00:00'),
(60, 'grupos', 'J', 'Argelia',   'Austria',  '2026-07-02T20:00:00+00:00'),

-- ══════════════════════════════════════════════════════════
-- GRUPO K: Portugal · Congo RD · Uzbekistán · Colombia
-- ══════════════════════════════════════════════════════════
(61, 'grupos', 'K', 'Portugal',   'Congo RD',    '2026-06-17T13:00:00-05:00'),
(62, 'grupos', 'K', 'Uzbekistán', 'Colombia',    '2026-06-17T16:00:00-05:00'),
(63, 'grupos', 'K', 'Portugal',   'Uzbekistán',  '2026-06-24T16:00:00-05:00'),
(64, 'grupos', 'K', 'Congo RD',   'Colombia',    '2026-06-24T19:00:00-05:00'),
(65, 'grupos', 'K', 'Portugal',   'Colombia',    '2026-07-03T20:00:00+00:00'),
(66, 'grupos', 'K', 'Congo RD',   'Uzbekistán',  '2026-07-03T20:00:00+00:00'),

-- ══════════════════════════════════════════════════════════
-- GRUPO L: Inglaterra · Croacia · Ghana · Panamá
-- ══════════════════════════════════════════════════════════
(67, 'grupos', 'L', 'Inglaterra', 'Croacia', '2026-06-17T19:00:00-05:00'),
(68, 'grupos', 'L', 'Ghana',      'Panamá',  '2026-06-17T22:00:00-05:00'),
(69, 'grupos', 'L', 'Inglaterra', 'Ghana',   '2026-06-24T22:00:00-05:00'),
(70, 'grupos', 'L', 'Croacia',    'Panamá',  '2026-06-25T01:00:00-05:00'),
(71, 'grupos', 'L', 'Inglaterra', 'Panamá',  '2026-07-03T20:00:00+00:00'),
(72, 'grupos', 'L', 'Croacia',    'Ghana',   '2026-07-03T20:00:00+00:00');
