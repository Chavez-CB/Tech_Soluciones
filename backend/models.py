"""
models.py - Modelos Pydantic para validación y serialización de datos.

Define los esquemas de respuesta para los endpoints de la API,
garantizando tipado estricto y documentación automática en Swagger.
"""

from pydantic import BaseModel, Field
from typing import Optional


class Venta(BaseModel):
    """Modelo que representa un registro individual de venta."""

    id: int = Field(..., description="Identificador único de la venta")
    fecha: str = Field(..., description="Fecha de la venta (formato ISO 8601)")
    categoria: Optional[str] = Field(None, description="Categoría del producto vendido")
    producto: Optional[str] = Field(None, description="Nombre del producto vendido")
    cantidad: float = Field(..., description="Cantidad de unidades vendidas")
    precio_unitario_pen: float = Field(
        ..., description="Precio unitario en soles peruanos (PEN)"
    )
    total_venta_pen: float = Field(
        ..., description="Total de la venta en soles peruanos (PEN)"
    )
    moneda: Optional[str] = Field(None, description="Moneda de la transacción")


class VentaMensual(BaseModel):
    """Modelo que representa las ventas agrupadas por mes."""

    mes: str = Field(
        ..., description="Mes en formato YYYY-MM", examples=["2025-01"]
    )
    total_ingresos: float = Field(
        ..., description="Ingresos totales del mes en PEN"
    )
    total_ventas: int = Field(
        ..., description="Número total de transacciones en el mes"
    )
    cantidad_total: float = Field(
        ..., description="Cantidad total de unidades vendidas en el mes"
    )


class Prediccion(BaseModel):
    """Modelo que representa la predicción de ingresos para un mes futuro."""

    mes: str = Field(
        ..., description="Mes predicho en formato YYYY-MM", examples=["2026-06"]
    )
    prediccion_ingresos: float = Field(
        ..., description="Ingresos predichos para el mes en PEN"
    )


class ResumenPrediccion(BaseModel):
    """Modelo completo de respuesta del endpoint de predicción."""

    predicciones: list[Prediccion] = Field(
        ..., description="Lista de predicciones para los próximos 12 meses"
    )
    tendencia: str = Field(
        ...,
        description="Tendencia general: 'crecimiento' o 'caída'",
        examples=["crecimiento"],
    )
    tasa_cambio_mensual: float = Field(
        ...,
        description="Tasa de cambio promedio mensual en PEN",
    )
    r2_score: float = Field(
        ...,
        description="Coeficiente de determinación R² del modelo (0-1)",
    )
