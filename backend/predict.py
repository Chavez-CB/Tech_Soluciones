"""
predict.py - Motor de predicción de ingresos con Machine Learning.

Utiliza regresión lineal (scikit-learn) para predecir ingresos
futuros basándose en datos históricos de ventas agrupados por mes.
"""

import logging
from datetime import datetime
from dateutil.relativedelta import relativedelta

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score

from database import obtener_ventas
from models import VentaMensual, Prediccion, ResumenPrediccion

# Configurar logging
logger = logging.getLogger(__name__)


def construir_dataframe() -> pd.DataFrame:
    """
    Obtiene los datos de ventas desde Supabase y los convierte a DataFrame.

    Realiza limpieza y tipado de columnas para garantizar
    consistencia en los cálculos posteriores.

    Returns:
        pd.DataFrame: DataFrame limpio con columnas tipadas correctamente.

    Raises:
        ValueError: Si no se encuentran datos de ventas.
    """
    datos = obtener_ventas()

    if not datos:
        raise ValueError("No se encontraron datos de ventas en Supabase.")

    df = pd.DataFrame(datos)

    # Asegurar tipos de datos correctos
    df["fecha"] = pd.to_datetime(df["fecha"], errors="coerce")
    df["cantidad"] = pd.to_numeric(df["cantidad"], errors="coerce").fillna(0)
    df["precio_unitario_pen"] = pd.to_numeric(
        df["precio_unitario_pen"], errors="coerce"
    ).fillna(0)
    df["total_venta_pen"] = pd.to_numeric(
        df["total_venta_pen"], errors="coerce"
    ).fillna(0)

    # Eliminar filas con fechas inválidas
    filas_antes = len(df)
    df = df.dropna(subset=["fecha"])
    filas_eliminadas = filas_antes - len(df)

    if filas_eliminadas > 0:
        logger.warning(
            f"Se eliminaron {filas_eliminadas} filas con fechas inválidas."
        )

    logger.info(f"DataFrame construido con {len(df)} registros válidos.")
    return df


def agrupar_ventas_mensuales(df: pd.DataFrame) -> list[VentaMensual]:
    """
    Agrupa las ventas por mes y calcula métricas agregadas.

    Args:
        df: DataFrame con los datos de ventas.

    Returns:
        list[VentaMensual]: Lista de ventas agrupadas por mes,
                            ordenadas cronológicamente.
    """
    # Crear columna de mes (formato YYYY-MM)
    df = df.copy()
    df["mes"] = df["fecha"].dt.to_period("M").astype(str)

    # Agrupar por mes con métricas agregadas
    agrupado = (
        df.groupby("mes")
        .agg(
            total_ingresos=("total_venta_pen", "sum"),
            total_ventas=("id", "count"),
            cantidad_total=("cantidad", "sum"),
        )
        .reset_index()
        .sort_values("mes")
    )

    # Redondear ingresos a 2 decimales
    agrupado["total_ingresos"] = agrupado["total_ingresos"].round(2)
    agrupado["cantidad_total"] = agrupado["cantidad_total"].round(2)

    resultado = [
        VentaMensual(
            mes=row["mes"],
            total_ingresos=row["total_ingresos"],
            total_ventas=int(row["total_ventas"]),
            cantidad_total=row["cantidad_total"],
        )
        for _, row in agrupado.iterrows()
    ]

    logger.info(f"Ventas agrupadas en {len(resultado)} meses.")
    return resultado


def predecir_ingresos(meses_futuros: int = 12) -> ResumenPrediccion:
    """
    Genera predicciones de ingresos para los próximos N meses
    usando regresión lineal.

    El modelo utiliza el índice numérico del mes como variable
    independiente (X) y los ingresos totales como variable
    dependiente (y).

    Args:
        meses_futuros: Número de meses a predecir (default: 12).

    Returns:
        ResumenPrediccion: Objeto con predicciones, tendencia,
                          tasa de cambio y score R².

    Raises:
        ValueError: Si no hay suficientes datos para entrenar el modelo.
    """
    df = construir_dataframe()
    ventas_mensuales = agrupar_ventas_mensuales(df)

    if len(ventas_mensuales) < 2:
        raise ValueError(
            "Se necesitan al menos 2 meses de datos históricos "
            "para generar predicciones."
        )

    # Preparar datos para el modelo
    ingresos = np.array(
        [v.total_ingresos for v in ventas_mensuales]
    ).reshape(-1, 1)
    indices = np.arange(len(ventas_mensuales)).reshape(-1, 1)

    # Entrenar modelo de regresión lineal
    modelo = LinearRegression()
    modelo.fit(indices, ingresos)

    # Calcular R² score para evaluar calidad del modelo
    predicciones_historicas = modelo.predict(indices)
    score = r2_score(ingresos, predicciones_historicas)
    score = max(0.0, round(float(score), 4))  # Clamp a mínimo 0

    # Obtener el último mes de datos históricos
    ultimo_mes_str = ventas_mensuales[-1].mes
    ultimo_mes_date = datetime.strptime(ultimo_mes_str, "%Y-%m")

    # Generar predicciones para meses futuros
    predicciones: list[Prediccion] = []
    inicio_prediccion = len(ventas_mensuales)

    for i in range(meses_futuros):
        indice_futuro = np.array([[inicio_prediccion + i]])
        ingreso_predicho = modelo.predict(indice_futuro)[0][0]

        # No permitir ingresos negativos (piso en 0)
        ingreso_predicho = max(0.0, round(ingreso_predicho, 2))

        # Calcular la fecha del mes futuro
        mes_futuro = ultimo_mes_date + relativedelta(months=i + 1)
        mes_str = mes_futuro.strftime("%Y-%m")

        predicciones.append(
            Prediccion(
                mes=mes_str,
                prediccion_ingresos=ingreso_predicho,
            )
        )

    # Determinar tendencia basada en el coeficiente de la regresión
    coeficiente = float(modelo.coef_[0][0])
    tendencia = "crecimiento" if coeficiente >= 0 else "caída"
    tasa_cambio = round(coeficiente, 2)

    logger.info(
        f"Predicción generada: tendencia={tendencia}, "
        f"tasa_cambio={tasa_cambio}, R²={score}"
    )

    return ResumenPrediccion(
        predicciones=predicciones,
        tendencia=tendencia,
        tasa_cambio_mensual=tasa_cambio,
        r2_score=score,
    )
