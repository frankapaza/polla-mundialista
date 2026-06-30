#!/usr/bin/env python3
"""
Motor de marcador probable — modelo híbrido Klement + Poisson.

Lee un JSON por stdin con los datos de ambas selecciones (recopilados por
investigación web) y devuelve por stdout un JSON con: score de fuerza Klement,
goles esperados, marcador modal, probabilidades 1/X/2 y nivel de confianza.

La aritmética vive acá a propósito: así el resultado es reproducible y no
depende de que el modelo haga bien las cuentas a mano. La parte "inteligente"
(buscar datos, decidir los factores de forma/lesiones) la hace quien invoca
la skill; este script solo aplica la fórmula.

Uso:
    echo '{...}' | python predict.py

Esquema de entrada (todos los campos numéricos; ver references/metodo-hibrido.md):
{
  "local":     { "nombre","fifa_points","gdp_pc","poblacion","temp_media",
                 "latam"(bool),"host"(bool),"forma"(~0.85..1.15),"ajuste"(~0.8..1.1) },
  "visitante": { ...igual... },
  "h2h_factor": 1.0   // >1 favorece al local, <1 al visitante (dominio histórico)
}
"""
import sys, json, math

# --- Pesos del score de fuerza (reconstrucción del modelo Klement) ---
# Aproximación de terceros, NO coeficientes publicados por Klement.
# Klement original usa FIFA=0.45 (el resto socio-económico) para predecir
# CAMPEONES del torneo a largo plazo. Para marcadores PARTIDO-A-PARTIDO el
# ranking FIFA manda (0.62): la calidad/forma actual pesa más que el PIB o el
# clima, que si no producen favoritos contraintuitivos (p.ej. Japón sobre
# Brasil). Lo socio-económico solo inclina la balanza en cruces muy parejos.
W_FIFA, W_GDP, W_POP, W_TEMP, W_HOST = 0.62, 0.14, 0.10, 0.10, 0.04

# --- Capa de marcador (Poisson) ---
MU = 1.30   # goles base por equipo (~2.6 totales, media de un partido de Mundial)
K  = 0.85   # sensibilidad de los goles esperados a la diferencia de fuerza
GRID = 9    # rango 0..8 goles para la distribución conjunta


def clip(x, lo, hi):
    return max(lo, min(hi, x))


def f_fifa(points):
    # Mapeo lineal de puntos FIFA: 1400 -> 0, 2000 -> 1
    return clip((points - 1400) / 600.0, 0.0, 1.0)


def f_gdp(gdp_pc):
    # U invertida: máximo ~35k USD, cae a ambos lados (riqueza ayuda hasta un punto)
    return math.exp(-((gdp_pc - 35000.0) / 30000.0) ** 2)


def f_pop(poblacion, latam):
    # Escala logarítmica del talento disponible + empuje cultura latina
    base = clip(math.log10(max(poblacion, 1)) / 9.5, 0.0, 1.0)
    return clip(base * (1.30 if latam else 1.0), 0.0, 1.0)


def f_temp(temp_media):
    # Óptimo en 14 °C; penaliza la desviación (clima como proxy de Klement/Hoffmann)
    return math.exp(-((temp_media - 14.0) / 12.0) ** 2)


def fuerza(t):
    host = 1.0 if t.get("host") else 0.0
    return (W_FIFA * f_fifa(t["fifa_points"])
            + W_GDP * f_gdp(t["gdp_pc"])
            + W_POP * f_pop(t["poblacion"], t.get("latam", False))
            + W_TEMP * f_temp(t["temp_media"])
            + W_HOST * host)


def poisson_pmf(k, lam):
    return math.exp(-lam) * lam ** k / math.factorial(k)


def resultado_1x2(la, lb):
    p_local = p_empate = p_visit = 0.0
    for a in range(GRID):
        for b in range(GRID):
            p = poisson_pmf(a, la) * poisson_pmf(b, lb)
            if a > b:   p_local += p
            elif a == b: p_empate += p
            else:        p_visit += p
    s = p_local + p_empate + p_visit
    return p_local / s, p_empate / s, p_visit / s


def modal_score(la, lb):
    # Marcador conjunto más probable dentro del grid
    best, bp = (0, 0), -1.0
    for a in range(GRID):
        for b in range(GRID):
            p = poisson_pmf(a, la) * poisson_pmf(b, lb)
            if p > bp:
                bp, best = p, (a, b)
    return best


def suggested_score(la, lb, p_local, p_visit):
    """Marcador alineado con el favorito: el (a,b) más probable que respeta el
    signo del ganador. Útil para la polla, donde acertar el resultado da puntos.
    Si el partido es muy parejo (sin favorito claro), cae al marcador modal."""
    if abs(p_local - p_visit) < 0.06:
        return modal_score(la, lb)
    local_favorito = p_local > p_visit
    best, bp = None, -1.0
    for a in range(GRID):
        for b in range(GRID):
            if (local_favorito and a <= b) or (not local_favorito and a >= b):
                continue
            p = poisson_pmf(a, la) * poisson_pmf(b, lb)
            if p > bp:
                bp, best = p, (a, b)
    return best if best else modal_score(la, lb)


def nivel_confianza(p_local, p_empate, p_visit):
    # Basada en cuán marcado es el resultado más probable (no en la frescura de
    # los datos: eso lo informa `datos_completos` por separado).
    pmax = max(p_local, p_empate, p_visit)
    if pmax >= 0.55:
        return "alta"
    if pmax >= 0.42:
        return "media"
    return "baja"


def main():
    data = json.load(sys.stdin)
    L, V = data["local"], data["visitante"]

    s_local, s_visit = fuerza(L), fuerza(V)
    d = s_local - s_visit

    forma_l = L.get("forma", 1.0)
    forma_v = V.get("forma", 1.0)
    ajuste_l = L.get("ajuste", 1.0)
    ajuste_v = V.get("ajuste", 1.0)
    h2h = data.get("h2h_factor", 1.0)

    lam_l = MU * math.exp(K * d) * forma_l * ajuste_l * h2h
    lam_v = MU * math.exp(-K * d) * forma_v * ajuste_v
    lam_l = clip(lam_l, 0.05, 6.0)
    lam_v = clip(lam_v, 0.05, 6.0)

    p_local, p_empate, p_visit = resultado_1x2(lam_l, lam_v)
    gl, gv = modal_score(lam_l, lam_v)
    sl, sv = suggested_score(lam_l, lam_v, p_local, p_visit)

    # ¿Tenemos forma + ajustes reales o se quedaron en valores neutros por defecto?
    datos_completos = not (forma_l == 1.0 and forma_v == 1.0
                           and ajuste_l == 1.0 and ajuste_v == 1.0)

    out = {
        "partido": f"{L['nombre']} vs {V['nombre']}",
        "fuerza": {"local": round(s_local, 3), "visitante": round(s_visit, 3),
                   "diferencia": round(d, 3)},
        "goles_esperados": {"local": round(lam_l, 2), "visitante": round(lam_v, 2)},
        "marcador_probable": {"local": gl, "visitante": gv},
        "marcador_sugerido": {"local": sl, "visitante": sv},
        "probabilidades": {"local": round(p_local, 3),
                           "empate": round(p_empate, 3),
                           "visitante": round(p_visit, 3)},
        "confianza": nivel_confianza(p_local, p_empate, p_visit),
        "datos_completos": datos_completos,
    }
    json.dump(out, sys.stdout, ensure_ascii=False, indent=2)
    print()


if __name__ == "__main__":
    main()
