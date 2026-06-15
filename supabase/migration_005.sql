-- Migration 005: regularizar orden local/visitante de partidos invertidos
-- vs el calendario oficial. SOLO partidos que faltan jugar (goles_local IS NULL).
--
-- Por cada partido invertido se invierte:
--   1) los pronósticos de ese partido (goles_local <-> goles_visitante)
--   2) los equipos del partido (equipo_local <-> equipo_visitante)
--
-- IDEMPOTENTE: solo actúa donde el local actual NO coincide con el oficial,
-- así que correrlo dos veces no revierte nada. Los pronósticos se invierten
-- ANTES que los equipos (a propósito), para que la condición siga siendo válida.

BEGIN;

-- Mapa: numero_partido -> equipo que DEBE ser local (en nombres tal como están en BD)
-- (los 25 partidos detectados como invertidos)
WITH oficial(n, local_correcto) AS (
  VALUES
    (4,'Chequia'),(5,'Chequia'),
    (10,'Suiza'),(11,'Suiza'),
    (16,'Escocia'),(17,'Escocia'),
    (22,'Turquía'),(23,'Turquía'),
    (28,'Ecuador'),(29,'Ecuador'),
    (34,'Túnez'),(35,'Túnez'),(36,'Japón'),
    (40,'Nueva Zelanda'),(41,'Nueva Zelanda'),
    (46,'Uruguay'),(47,'Uruguay'),
    (52,'Noruega'),(53,'Noruega'),
    (58,'Jordania'),(59,'Jordania'),
    (64,'Colombia'),(65,'Colombia'),
    (70,'Panamá'),(71,'Panamá')
)
-- 1) Invertir el marcador de los pronósticos (mientras el partido sigue invertido)
UPDATE pronosticos pr
SET goles_local     = pr.goles_visitante,
    goles_visitante = pr.goles_local,
    updated_at      = NOW()
FROM partidos p
JOIN oficial o ON o.n = p.numero_partido
WHERE pr.partido_id = p.id
  AND p.goles_local IS NULL              -- solo partidos que faltan jugar
  AND p.equipo_local <> o.local_correcto; -- solo si está invertido

-- 2) Invertir los equipos del partido
WITH oficial(n, local_correcto) AS (
  VALUES
    (4,'Chequia'),(5,'Chequia'),
    (10,'Suiza'),(11,'Suiza'),
    (16,'Escocia'),(17,'Escocia'),
    (22,'Turquía'),(23,'Turquía'),
    (28,'Ecuador'),(29,'Ecuador'),
    (34,'Túnez'),(35,'Túnez'),(36,'Japón'),
    (40,'Nueva Zelanda'),(41,'Nueva Zelanda'),
    (46,'Uruguay'),(47,'Uruguay'),
    (52,'Noruega'),(53,'Noruega'),
    (58,'Jordania'),(59,'Jordania'),
    (64,'Colombia'),(65,'Colombia'),
    (70,'Panamá'),(71,'Panamá')
)
UPDATE partidos p
SET equipo_local     = p.equipo_visitante,
    equipo_visitante = p.equipo_local
FROM oficial o
WHERE o.n = p.numero_partido
  AND p.goles_local IS NULL
  AND p.equipo_local <> o.local_correcto;

COMMIT;

-- Verificación (opcional): debería devolver 0 filas si quedó todo regularizado
-- SELECT numero_partido, equipo_local, equipo_visitante
-- FROM partidos
-- WHERE numero_partido IN (4,5,10,11,16,17,22,23,28,29,34,35,36,40,41,46,47,52,53,58,59,64,65,70,71)
--   AND goles_local IS NULL
--   AND equipo_local NOT IN ('Chequia','Suiza','Escocia','Turquía','Ecuador','Túnez','Japón','Nueva Zelanda','Uruguay','Noruega','Jordania','Colombia','Panamá');
