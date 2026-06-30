---
name: prediccion-mundial
description: >-
  Calcula el marcador probable de un partido del Mundial 2026 con un modelo
  híbrido: el sistema de fuerza de Joachim Klement (ranking FIFA + variables
  socio-económicas) más una capa Poisson para el resultado, ajustada con
  investigación web en vivo (historial entre selecciones, forma reciente,
  lesiones e informes). Devuelve un dato estructurado listo para mostrarse en
  la pantalla de Predicciones. Usa esta skill SIEMPRE que el usuario pida
  predecir, pronosticar o estimar el resultado/marcador probable de un partido
  del Mundial 2026, pregunte "cómo va a quedar" o "quién gana" entre dos
  selecciones, mencione el método de Klement, o quiera un marcador sugerido
  para la polla — aunque no diga la palabra "predicción".
---

# Predicción de marcador — Mundial 2026 (híbrido Klement + Poisson)

Produce un **marcador probable** por partido combinando el modelo de fuerza de
Klement con una capa de goles Poisson y ajustes de investigación reciente. La
matemática completa está en `references/metodo-hibrido.md` y se ejecuta con
`scripts/predict.py` — léelos antes de tu primera predicción de la sesión.

## Principio rector

Klement decide **quién es más fuerte**; Poisson traduce esa brecha en **goles**;
la investigación reciente (H2H, forma, lesiones) **ajusta** esos goles. El
modelo real de Klement no da marcadores y subraya un ~45% de "suerte" — por eso
la salida siempre distingue qué viene de Klement y qué del añadido, y nunca
vende el marcador como certeza.

## Flujo

### 1. Identifica el partido
Necesitas las dos selecciones, la fase y la sede. Si el usuario nombra el
partido ("Argentina vs México"), úsalo. Si pide uno de la BD, búscalo en la
tabla `partidos` (`equipo_local`, `equipo_visitante`, `fase`). Una invocación =
un partido.

### 2. Investiga los datos (web en vivo)
Reúne, para CADA selección, los insumos de la tabla en
`references/metodo-hibrido.md` → sección "Dónde conseguir cada dato":
- **Puntos** del ranking FIFA actual (los puntos, no solo la posición).
- PIB per cápita, población, temperatura media (valores aproximados sirven).
- Forma reciente (últimos 5–10 partidos), historial directo, lesiones/bajas.

Cita cada fuente que uses. Si un dato reciente no aparece, deja su factor en 1.0
y la confianza bajará — es preferible ser honesto a inventar.

### 3. Fija los factores de ajuste
Traduce lo investigado a `forma` y `ajuste` por equipo y un `h2h_factor`, dentro
de los rangos moderados de `references/metodo-hibrido.md` → "Capa 3". Cada factor
movido de 1.0 necesita una razón citada.

### 4. Ejecuta el motor
Arma el JSON de entrada y corre el script (no hagas la aritmética a mano):

```bash
echo '{"local":{...},"visitante":{...},"h2h_factor":1.0}' | python scripts/predict.py
```

El script devuelve fuerza, goles esperados, marcador modal, probabilidades 1/X/2
y confianza. Si el marcador modal es un empate pero hay un favorito claro, sigue
la guía de "marcador modal vs ganador" de la referencia.

### 5. Entrega el resultado
Presenta SIEMPRE dos cosas: el bloque legible y el JSON insertable (abajo).

## Formato de salida

**Bloque legible** (esto es lo que se ve en Predicciones):

```
⚽ Marcador probable — Argentina vs México (Fase de grupos)
   ARG  2 – 1  MEX
   Probabilidad: Argentina 52% · Empate 24% · México 24%
   Confianza: media

   Por qué: Argentina llega como favorita por su mayor fuerza Klement
   (ranking FIFA 1886 vs 1650) y mejor forma reciente; México descuenta
   por la ventaja de local (anfitrión 2026). Historial parejo.

   Klement: ARG 0.78 vs MEX 0.60 (Δ +0.18)
   Ajustes: forma ARG ×1.05 (racha de 4 triunfos); México −lesión de [jugador]
   Fuentes: fifa.com/ranking, [nota de prensa], [estadística H2H]
```

**JSON insertable** (para guardar y mostrar en la app — ver "Integración"):

```json
{
  "partido": "Argentina vs México",
  "fase": "grupos",
  "marcador_probable": { "local": 2, "visitante": 1 },
  "probabilidades": { "local": 0.52, "empate": 0.24, "visitante": 0.24 },
  "confianza": "media",
  "fuerza": { "local": 0.78, "visitante": 0.60, "diferencia": 0.18 },
  "goles_esperados": { "local": 1.67, "visitante": 1.06 },
  "justificacion": "Texto breve, el mismo del bloque legible.",
  "factores": {
    "klement": "ARG 0.78 vs MEX 0.60",
    "h2h": "Historial parejo (factor 1.05 al local)",
    "forma": "ARG racha de 4 triunfos (×1.05)",
    "informes": "México sin [jugador] por lesión (×0.95)"
  },
  "fuentes": ["https://fifa.com/ranking", "..."],
  "generado": "2026-06-29"
}
```

Reglas de honestidad:
- Nunca presentes el marcador como seguro; es el escenario más probable.
- El `marcador_probable` y las `probabilidades` salen del script tal cual.
- `justificacion` y `factores` explican el porqué con las fuentes investigadas.
- Si faltaron datos, dilo y baja la confianza; no rellenes con suposiciones.

## Integración con la pantalla Predicciones

La skill **produce el dato**; guardarlo y dibujarlo en la app es un paso aparte.
El JSON mapea de forma natural a una tabla sugerida `predicciones_modelo`:

| Campo JSON | Columna sugerida |
|---|---|
| (partido) | `partido_id` (FK a `partidos`) |
| marcador_probable.local/visitante | `goles_local`, `goles_visitante` |
| probabilidades.* | `prob_local`, `prob_empate`, `prob_visitante` |
| confianza | `confianza` |
| justificacion | `justificacion` |
| fuentes | `fuentes` (jsonb) |
| generado | `generado_at` |

Cambios de BD = un `supabase/migration_NNN.sql` (convención del proyecto). En la
UI, el bloque va dentro de la tarjeta del partido en
`src/app/liga/[codigo]/predicciones/page.tsx`, como sugerencia visible junto al
stepper donde el participante carga su propio marcador. Si el usuario pide
implementar el guardado o el bloque visual, ofréceselo como tarea de desarrollo
separada; no es parte del cálculo.
