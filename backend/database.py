"""
database.py - Módulo de conexión y consulta a Supabase.

Gestiona la conexión singleton a Supabase y proporciona funciones
para obtener datos de la tabla 'ventas' de forma eficiente.
"""

import os
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


def obtener_ventas() -> list[dict]:
    """
    Obtiene todos los registros de la tabla 'ventas' desde Supabase.

    Realiza una consulta paginada para manejar grandes volúmenes de datos,
    ya que Supabase tiene un límite por defecto de 1000 filas por consulta.

    Returns:
        list[dict]: Lista de diccionarios con los datos de cada venta.

    Raises:
        Exception: Si ocurre un error en la consulta a Supabase.
    """
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

        logger.info(f"Se obtuvieron {len(todas_las_ventas)} registros de ventas.")
        return todas_las_ventas

    except Exception as e:
        logger.error(f"Error al obtener ventas desde Supabase: {e}")
        raise
