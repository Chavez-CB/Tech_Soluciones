"""
database.py - Módulo de conexión y consulta a Supabase.

Gestiona la conexión singleton a Supabase y proporciona funciones
para obtener datos de la tabla 'ventas' con caché en memoria.
"""

import os
import time
import logging
from functools import lru_cache
from dotenv import load_dotenv
from supabase import create_client, Client

# Configurar logging
logger = logging.getLogger(__name__)

# Cargar variables de entorno desde el .env del proyecto padre
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

# Constantes de configuración
SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY: str = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")

# Validar que las credenciales existen
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError(
        "Las variables de entorno SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY "
        "son requeridas. Verifica tu archivo .env"
    )

# ─── Caché en memoria con TTL ───────────────────────────────────────────────
CACHE_TTL_SECONDS = 300  # 5 minutos

_cache: dict = {
    "ventas": None,
    "timestamp": 0.0,
}


def _cache_is_valid() -> bool:
    """Verifica si la caché de ventas sigue vigente."""
    if _cache["ventas"] is None:
        return False
    return (time.time() - _cache["timestamp"]) < CACHE_TTL_SECONDS


def invalidar_cache() -> None:
    """
    Invalida manualmente la caché de ventas.
    Útil para forzar una recarga desde Supabase.
    """
    _cache["ventas"] = None
    _cache["timestamp"] = 0.0
    logger.info("Caché de ventas invalidada manualmente.")


# ─── Cliente Supabase (singleton) ────────────────────────────────────────────


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """
    Crea y retorna una instancia singleton del cliente Supabase.

    Usa lru_cache para garantizar que solo se crea una conexión
    durante el ciclo de vida de la aplicación.

    Returns:
        Client: Instancia del cliente Supabase configurada.
    """
    logger.info("Inicializando cliente Supabase...")
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    logger.info("Cliente Supabase inicializado correctamente.")
    return client


# ─── Consulta de datos ───────────────────────────────────────────────────────


def obtener_ventas(force_refresh: bool = False) -> list[dict]:
    """
    Obtiene todos los registros de la tabla 'ventas' desde Supabase.

    Usa caché en memoria con TTL de 5 minutos para evitar consultas
    repetitivas. Realiza paginación automática para manejar tablas
    con más de 1000 filas.

    Args:
        force_refresh: Si True, ignora la caché y consulta Supabase.

    Returns:
        list[dict]: Lista de diccionarios con los datos de cada venta.

    Raises:
        Exception: Si ocurre un error en la consulta a Supabase.
    """
    # Retornar caché si es válida y no se forzó refresh
    if not force_refresh and _cache_is_valid():
        logger.info(
            f"Retornando {len(_cache['ventas'])} ventas desde caché "
            f"(TTL: {CACHE_TTL_SECONDS - (time.time() - _cache['timestamp']):.0f}s restantes)."
        )
        return _cache["ventas"]

    # Consultar Supabase
    client = get_supabase_client()
    todas_las_ventas: list[dict] = []
    page_size = 1000
    offset = 0

    try:
        while True:
            # Consulta paginada ordenada por fecha descendente
            response = (
                client.table("ventas")
                .select("*")
                .order("fecha", desc=True)
                .range(offset, offset + page_size - 1)
                .execute()
            )

            datos = response.data
            if not datos:
                break

            todas_las_ventas.extend(datos)

            # Si recibimos menos registros que el tamaño de página, terminamos
            if len(datos) < page_size:
                break

            offset += page_size

        # Actualizar caché
        _cache["ventas"] = todas_las_ventas
        _cache["timestamp"] = time.time()

        logger.info(
            f"Se obtuvieron {len(todas_las_ventas)} registros de ventas "
            f"desde Supabase (caché actualizada, TTL: {CACHE_TTL_SECONDS}s)."
        )
        return todas_las_ventas

    except Exception as e:
        logger.error(f"Error al obtener ventas desde Supabase: {e}")
        raise
