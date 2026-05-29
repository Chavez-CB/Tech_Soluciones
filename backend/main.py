"""
main.py - Servidor FastAPI para predicción de ventas.

API REST que expone endpoints para consultar ventas históricas,
ventas agrupadas por mes y predicciones de ingresos futuros
utilizando regresión lineal sobre datos de Supabase.

Uso:
    uvicorn main:app --reload --port 8000
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from models import Venta, VentaMensual, Prediccion, ResumenPrediccion
from database import obtener_ventas, get_supabase_client
from predict import construir_dataframe, agrupar_ventas_mensuales, predecir_ingresos

# ─── Configuración de Logging ───────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ─── Lifecycle del servidor ──────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gestiona el ciclo de vida de la aplicación.
    Verifica la conexión a Supabase al iniciar.
    """
    logger.info("🚀 Iniciando servidor de predicción de ventas...")

    # Verificar conexión a Supabase al arrancar
    try:
        client = get_supabase_client()
        # Consulta rápida para verificar conectividad
        client.table("ventas").select("id").limit(1).execute()
        logger.info("✅ Conexión a Supabase verificada correctamente.")
    except Exception as e:
        logger.error(f"❌ Error al conectar con Supabase: {e}")
        # No detenemos el servidor, pero logueamos el error

    yield  # La aplicación corre aquí

    logger.info("🛑 Servidor detenido.")


# ─── Inicialización de FastAPI ───────────────────────────────────────────────
app = FastAPI(
    title="API de Predicción de Ventas",
    description=(
        "Sistema de análisis y predicción de ingresos por ventas. "
        "Conecta con Supabase para obtener datos históricos y utiliza "
        "regresión lineal (scikit-learn) para predecir ingresos futuros."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── Middleware CORS ─────────────────────────────────────────────────────────
# Permite conexiones desde el frontend, configurable por entorno
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)


# ─── Endpoints ───────────────────────────────────────────────────────────────


@app.get("/", tags=["General"])
async def raiz():
    """
    Endpoint raíz. Retorna información básica de la API.
    """
    return {
        "mensaje": "API de Predicción de Ventas activa",
        "version": "1.0.0",
        "endpoints": {
            "ventas": "/ventas",
            "ventas_mensuales": "/ventas-mensuales",
            "prediccion": "/prediccion",
            "documentacion": "/docs",
        },
    }


@app.get(
    "/ventas",
    response_model=list[Venta],
    tags=["Ventas"],
    summary="Obtener todas las ventas",
    description="Retorna todos los registros de ventas desde Supabase.",
)
async def get_ventas():
    """
    Devuelve todos los datos de ventas desde la tabla 'ventas' en Supabase.

    Returns:
        list[Venta]: Lista completa de registros de ventas.

    Raises:
        HTTPException 500: Si ocurre un error al consultar la base de datos.
    """
    try:
        datos = obtener_ventas()

        if not datos:
            logger.warning("No se encontraron registros de ventas.")
            return []

        logger.info(f"Retornando {len(datos)} registros de ventas.")
        return datos

    except Exception as e:
        logger.error(f"Error en /ventas: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener ventas: {str(e)}",
        )


@app.get(
    "/ventas-mensuales",
    response_model=list[VentaMensual],
    tags=["Ventas"],
    summary="Obtener ventas agrupadas por mes",
    description=(
        "Agrupa las ventas por mes y calcula ingresos totales, "
        "número de transacciones y cantidad de unidades vendidas."
    ),
)
async def get_ventas_mensuales():
    """
    Devuelve las ventas agrupadas por mes con métricas agregadas.

    Returns:
        list[VentaMensual]: Lista de ventas agrupadas por mes.

    Raises:
        HTTPException 500: Si ocurre un error al procesar los datos.
    """
    try:
        df = construir_dataframe()
        resultado = agrupar_ventas_mensuales(df)

        logger.info(f"Retornando {len(resultado)} meses de datos agrupados.")
        return resultado

    except ValueError as e:
        logger.warning(f"Sin datos para agrupar: {e}")
        raise HTTPException(status_code=404, detail=str(e))

    except Exception as e:
        logger.error(f"Error en /ventas-mensuales: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error al agrupar ventas mensuales: {str(e)}",
        )


@app.get(
    "/prediccion",
    response_model=ResumenPrediccion,
    tags=["Predicción"],
    summary="Predecir ingresos futuros",
    description=(
        "Genera predicciones de ingresos para los próximos N meses "
        "usando regresión lineal sobre datos históricos."
    ),
)
async def get_prediccion(
    meses: int = Query(
        default=12,
        ge=1,
        le=60,
        description="Número de meses a predecir (1-60)",
    ),
):
    """
    Genera predicciones de ingresos mensuales.

    Args:
        meses: Número de meses futuros a predecir (default: 12, máx: 60).

    Returns:
        ResumenPrediccion: Predicciones con tendencia y métricas del modelo.

    Raises:
        HTTPException 404: Si no hay suficientes datos históricos.
        HTTPException 500: Si ocurre un error en el cálculo.
    """
    try:
        resultado = predecir_ingresos(meses_futuros=meses)

        logger.info(
            f"Predicción generada para {meses} meses. "
            f"Tendencia: {resultado.tendencia}"
        )
        return resultado

    except ValueError as e:
        logger.warning(f"Datos insuficientes para predicción: {e}")
        raise HTTPException(status_code=404, detail=str(e))

    except Exception as e:
        logger.error(f"Error en /prediccion: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error al generar predicción: {str(e)}",
        )


# ─── Ejecución directa ──────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
