/**
 * ventas.ts - Módulo de datos que consume el backend Python (FastAPI).
 *
 * Todas las consultas de ventas y predicciones ahora pasan por el
 * backend Python en lugar de conectarse directamente a Supabase.
 */

// URL base del backend Python (configurable por entorno)
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface Venta {
  id: number;
  fecha: string;
  categoria: string;
  producto: string;
  cantidad: number;
  precio_unitario_pen: number;
  total_venta_pen: number;
  moneda: string;
}

export interface VentaMensual {
  mes: string;
  total_ingresos: number;
  total_ventas: number;
  cantidad_total: number;
}

export interface Prediccion {
  mes: string;
  prediccion_ingresos: number;
}

export interface ResumenPrediccion {
  predicciones: Prediccion[];
  tendencia: string;
  tasa_cambio_mensual: number;
  r2_score: number;
}

// ─── Fetch de datos desde el backend Python ─────────────────────────────────

/**
 * Obtiene todas las ventas desde el backend Python.
 * Endpoint: GET /ventas
 */
export async function fetchVentas(): Promise<Venta[]> {
  const res = await fetch(`${API_BASE}/ventas`);
  if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
  return res.json();
}

/**
 * Obtiene ventas agrupadas por mes desde el backend Python.
 * Endpoint: GET /ventas-mensuales
 */
export async function fetchVentasMensuales(): Promise<VentaMensual[]> {
  const res = await fetch(`${API_BASE}/ventas-mensuales`);
  if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
  return res.json();
}

/**
 * Obtiene predicciones de ingresos desde el backend Python (scikit-learn).
 * Endpoint: GET /prediccion?meses=N
 */
export async function fetchPrediccion(meses: number = 12): Promise<ResumenPrediccion> {
  const res = await fetch(`${API_BASE}/prediccion?meses=${meses}`);
  if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
  return res.json();
}

// ─── Utilidades de formato ──────────────────────────────────────────────────

export const formatPEN = (n: number) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 0,
  }).format(n);

export const formatInt = (n: number) =>
  new Intl.NumberFormat("es-PE").format(Math.round(n));

/**
 * Regresión lineal simple (mantenida para uso local en gráficos).
 * La predicción principal ahora viene del backend Python con scikit-learn.
 */
export function linearRegression(points: { x: number; y: number }[]) {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  const sumX = points.reduce((a, p) => a + p.x, 0);
  const sumY = points.reduce((a, p) => a + p.y, 0);
  const sumXY = points.reduce((a, p) => a + p.x * p.y, 0);
  const sumX2 = points.reduce((a, p) => a + p.x * p.x, 0);
  const denom = n * sumX2 - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}