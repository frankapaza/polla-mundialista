# Método híbrido: Klement (fuerza) + Poisson (marcador)

Este documento detalla la matemática que ejecuta `scripts/predict.py`. Léelo si
necesitas justificar un resultado, ajustar un factor a mano o explicarle al
usuario por qué salió un marcador. La filosofía: **Klement decide quién es más
fuerte; Poisson traduce esa diferencia en goles; la investigación reciente
(H2H, forma, lesiones) ajusta los goles.**

## Por qué híbrido

El modelo real de Joachim Klement (2014, adaptado de Hoffmann–Lee–Ramasamy 2002)
es una regresión socio-económica que estima la **fuerza** de cada selección y
rankea favoritos del torneo. **No produce marcadores** y no usa ni Elo ni
Poisson. Explica ~55% de la varianza del éxito mundialista; el ~45% restante
Klement lo llama explícitamente "suerte". Por eso, para dar un marcador por
partido hay que añadir una capa encima — eso hacemos aquí, siendo transparentes
sobre qué parte es genuinamente de Klement y qué parte es el añadido.

Fuente primaria: https://klementoninvesting.substack.com/p/fifa-world-cup-predictions-2026
Base académica: Hoffmann, Lee & Ramasamy (2002), *Journal of Applied Economics* 5(2).

> Los pesos exactos (0.45 FIFA, 0.20 PIB, etc.) y σ provienen de
> reimplementaciones de terceros (ej. github.com/x-cookie/klement-model-k5), no
> de coeficientes publicados por Klement. Trátalos como aproximación razonable.

## Capa 1 — Score de fuerza (Klement)

Cada selección recibe un score `S ∈ [0,1]`:

```
S = 0.62·fF + 0.14·fG + 0.10·fP + 0.10·fT + 0.04·host
```

> Klement original usa `fF = 0.45` para predecir **campeones del torneo** a largo
> plazo. Para marcadores **partido-a-partido** el ranking FIFA manda (**0.62**):
> la calidad/forma actual pesa más que el PIB o el clima, que si no producen
> favoritos contraintuitivos (p.ej. Japón sobre Brasil). Lo socio-económico solo
> inclina la balanza en cruces muy parejos. Ajustable en `scripts/predict.py`
> (constantes `W_*`).

| Componente | Variable | Función | Intuición |
|---|---|---|---|
| `fF` | Puntos ranking FIFA | lineal: (pts−1400)/600, recortado a [0,1] | calidad/forma del plantel — el peso mayor |
| `fG` | PIB per cápita (USD) | U invertida: exp(−((g−35000)/30000)²) | infraestructura futbolística, rinde hasta ~35k |
| `fP` | Población (×cultura latina) | log10(pop)/9.5 × (1.30 si latam) | cantera de talento donde el fútbol manda |
| `fT` | Temperatura media (°C) | exp(−((t−14)/12)²) | óptimo de Klement/Hoffmann en 14 °C |
| `host` | Anfitrión 2026 | 1 si USA/Canadá/México, si no 0 | ventaja local (diluida: 3 co-anfitriones) |

## Capa 2 — Goles esperados (Poisson)

Diferencia de fuerza `d = S_local − S_visitante`. Goles esperados:

```
λ_local     = 1.30 · e^(0.85·d) · forma_local · ajuste_local · h2h_factor
λ_visitante = 1.30 · e^(−0.85·d) · forma_visitante · ajuste_visitante
```

- `1.30` = goles base por equipo (≈2.6 totales, media de un partido de Mundial).
- `0.85` = sensibilidad de los goles a la brecha de fuerza.
- Ambos λ se recortan a [0.05, 6.0].

## Capa 3 — Ajustes de la investigación reciente

Estos factores los fijas TÚ tras investigar; por defecto son 1.0 (neutro).
Mantenlos en rangos moderados — son matices, no deben dominar a Klement.

| Factor | Rango sugerido | Súbelo cuando… | Bájalo cuando… |
|---|---|---|---|
| `forma` (por equipo) | 0.85–1.15 | racha goleadora, alta confianza | sequía de goles, crisis |
| `ajuste` (por equipo) | 0.80–1.10 | plantel completo, motivación alta | lesión/sanción de figuras, rotación |
| `h2h_factor` (al local) | 0.90–1.10 | el local domina el historial directo | el visitante tiene la ventaja histórica |

Cada factor que muevas de 1.0 **debe** tener una fuente o razón citada en la
salida. Si no encontraste datos recientes, déjalo en 1.0 y la confianza bajará.

## Salida del motor

`predict.py` devuelve `fuerza`, `goles_esperados`, `marcador_probable`
(modal de la distribución conjunta), `probabilidades` 1/X/2, y `confianza`.

### Cuidado con el marcador modal vs el ganador

El **marcador exacto más probable** (modal) puede no coincidir con el **ganador
más probable**. Ejemplo real: Argentina 52% de ganar, pero el marcador modal es
1-1. No es un bug — en Poisson, con goles esperados bajos, un resultado ajustado
o empate suele ser el escenario exacto individual más frecuente aunque el
favorito gane "en agregado". Cuando esto pase:
- Reporta el marcador modal como "marcador probable".
- Si quieres un marcador alineado con el ganador (útil para la polla, donde
  acertar el signo da puntos), menciónalo aparte: toma el marcador modal
  **condicionado** a que gane el favorito (el (a,b) más probable con a>b).
- Explícalo en la justificación para que el usuario decida.

### Confianza
- **alta**: prob. del resultado más probable ≥ 0.55 y con datos recientes.
- **media**: ≥ 0.42.
- **baja**: partido muy parejo, o faltaron datos de forma/lesiones (factores en 1.0).

## Dónde conseguir cada dato (investigación web)

| Dato | Fuente típica |
|---|---|
| Puntos ranking FIFA | fifa.com/ranking (usar los **puntos**, no solo la posición) |
| PIB per cápita | Banco Mundial / FMI (cifra reciente en USD) |
| Población | Banco Mundial / ONU |
| Temperatura media anual | climatología del país (valor aproximado sirve) |
| Forma reciente | últimos 5–10 partidos oficiales/amistosos |
| Historial directo (H2H) | enfrentamientos previos entre ambas selecciones |
| Lesiones / informes | notas de prensa deportiva recientes (convocatoria, bajas) |

Para selecciones de cantera latina marca `latam: true`. Para los anfitriones
2026 (USA, Canadá, México) marca `host: true`.
