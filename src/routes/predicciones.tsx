import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  fetchVentas,
  fetchVentasMensuales,
  fetchPrediccion,
  formatPEN,
  type Venta,
  type VentaMensual,
  type ResumenPrediccion,
} from "@/lib/ventas";
import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ReferenceLine, ReferenceArea,
} from "recharts";
import { Sparkles, TrendingUp, Target, Calendar, Server } from "lucide-react";

export const Route = createFileRoute("/predicciones")({ component: Page });

const tooltipStyle = {
  background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--popover-foreground)",
};

function Page() {
  const { data: ventas = [], isLoading: loadingVentas } = useQuery({ queryKey: ["ventas"], queryFn: fetchVentas });
  const { data: ventasMensuales = [], isLoading: loadingMensuales } = useQuery({
    queryKey: ["ventas-mensuales"],
    queryFn: fetchVentasMensuales,
  });

  const categorias = useMemo(() => {
    const s = new Set<string>(); ventas.forEach((v) => s.add(v.categoria));
    return [...s].sort();
  }, [ventas]);

  const [cat, setCat] = useState<string>("all");
  const [horizonte, setHorizonte] = useState<number>(12);
  const [mesObjetivo, setMesObjetivo] = useState<number>(6);

  // Predicción desde el backend Python (scikit-learn)
  const { data: prediccionBackend, isLoading: loadingPrediccion } = useQuery({
    queryKey: ["prediccion", horizonte],
    queryFn: () => fetchPrediccion(horizonte),
  });

  const filtered = useMemo(
    () => (cat === "all" ? ventas : ventas.filter((v) => v.categoria === cat)),
    [ventas, cat],
  );

  // Construir datos para el gráfico combinando histórico + predicción de Python
  const chartData = useMemo(() => {
    return buildChartData(filtered, ventasMensuales, prediccionBackend, horizonte);
  }, [filtered, ventasMensuales, prediccionBackend, horizonte]);

  const objetivo = useMemo(() => {
    const idx = chartData.historicLength + mesObjetivo - 1;
    const row = chartData.series[idx];
    if (!row) return null;
    return { mes: row.mes, valor: row.prediccion ?? 0 };
  }, [chartData, mesObjetivo]);

  const isLoading = loadingVentas || loadingMensuales || loadingPrediccion;

  if (isLoading) {
    return <div className="p-10 text-muted-foreground">Cargando datos desde el backend Python…</div>;
  }

  return (
    <div className="p-6 md:p-10 space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Sparkles className="size-3.5 text-accent" /> Predicción de ventas
            <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] border border-primary/20">
              <Server className="size-3" /> Python · scikit-learn
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold mt-2">Proyección de ganancias</h1>
          <p className="text-muted-foreground text-sm mt-1.5 max-w-2xl">
            Las predicciones son generadas por el backend Python usando regresión lineal
            (scikit-learn) sobre los datos históricos de Supabase. Horizonte: {horizonte} meses.
          </p>
        </div>
      </header>

      <div className="bg-card border border-border rounded-lg p-4 flex flex-wrap gap-4 items-center">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground text-xs">Categoría</span>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="bg-input border border-border rounded-md px-3 py-1.5 text-sm">
            <option value="all">Todas</option>
            {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground text-xs">Horizonte</span>
          <select value={horizonte} onChange={(e) => setHorizonte(Number(e.target.value))} className="bg-input border border-border rounded-md px-3 py-1.5 text-sm">
            <option value={6}>6 meses</option>
            <option value={12}>12 meses</option>
            <option value={18}>18 meses</option>
            <option value={24}>24 meses</option>
            <option value={36}>36 meses</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm ml-auto">
          <span className="text-muted-foreground text-xs">Predecir mes #</span>
          <input
            type="number" min={1} max={horizonte} value={mesObjetivo}
            onChange={(e) => setMesObjetivo(Math.max(1, Math.min(horizonte, Number(e.target.value) || 1)))}
            className="bg-input border border-border rounded-md px-3 py-1.5 text-sm w-20"
          />
        </label>
      </div>

      <section className="grid md:grid-cols-4 gap-4">
        <PredCard
          icon={Target}
          label={`Proyección total`}
          value={formatPEN(prediccionBackend?.predicciones.reduce((a, p) => a + p.prediccion_ingresos, 0) ?? 0)}
          hint={`Suma próximos ${horizonte} meses`}
          highlight
        />
        <PredCard
          icon={Calendar}
          label={objetivo ? `Mes ${mesObjetivo} · ${objetivo.mes}` : `Mes ${mesObjetivo}`}
          value={objetivo ? formatPEN(objetivo.valor) : "—"}
          hint="Predicción puntual"
        />
        <PredCard
          icon={TrendingUp}
          label="Tendencia"
          value={prediccionBackend ? (prediccionBackend.tendencia === "crecimiento" ? "📈 Crecimiento" : "📉 Caída") : "—"}
          hint={prediccionBackend ? `${prediccionBackend.tasa_cambio_mensual >= 0 ? "+" : ""}${formatPEN(prediccionBackend.tasa_cambio_mensual)}/mes` : ""}
        />
        <PredCard
          icon={Sparkles}
          label="Precisión del modelo"
          value={prediccionBackend ? `${(prediccionBackend.r2_score * 100).toFixed(1)}%` : "—"}
          hint="R² · scikit-learn LinearRegression"
        />
      </section>

      <div className="bg-card border border-border rounded-lg p-5" style={{ boxShadow: "var(--shadow-glow)" }}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="font-display font-semibold text-lg">Histórico vs proyección</h3>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono uppercase tracking-wider">
              Serie mensual · PEN · predicción Python
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <LegendDot color="var(--chart-1)" label="Histórico" />
            <LegendDot color="var(--accent)" label="Predicción (Python)" />
          </div>
        </div>
        <ResponsiveContainer width="100%" height={460}>
          <ComposedChart data={chartData.series}>
            <defs>
              <linearGradient id="gradForecast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.7} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradHist" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={11} interval="preserveStartEnd" />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `S/${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatPEN(v)} />
            {chartData.forecastStart && chartData.forecastEnd && (
              <ReferenceArea x1={chartData.forecastStart} x2={chartData.forecastEnd} fill="var(--accent)" fillOpacity={0.04} />
            )}
            <ReferenceLine x={chartData.splitLabel} stroke="var(--accent)" strokeDasharray="4 4" strokeWidth={1.5}
              label={{ value: "hoy", fill: "var(--accent)", fontSize: 11, position: "insideTop" }} />
            {objetivo && (
              <ReferenceLine x={objetivo.mes} stroke="var(--primary)" strokeWidth={1.5}
                label={{ value: `mes ${mesObjetivo}`, fill: "var(--primary)", fontSize: 11, position: "insideTop" }} />
            )}
            <Area type="monotone" dataKey="historico" name="Histórico" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#gradHist)" />
            <Line type="monotone" dataKey="tendencia" name="Tendencia" stroke="var(--chart-2)" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
            <Area type="monotone" dataKey="prediccion" name="Predicción (Python)" stroke="var(--accent)" strokeWidth={3} fill="url(#gradForecast)" />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla detalle de predicción */}
      <div className="bg-card border border-border rounded-lg p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <h3 className="font-display font-semibold mb-1">Detalle mes a mes proyectado</h3>
        <p className="text-xs text-muted-foreground mb-4 font-mono uppercase tracking-wider">
          Próximos {horizonte} meses · Generado por Python (scikit-learn)
        </p>
        <div className="overflow-x-auto max-h-[420px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="py-2 font-medium">#</th>
                <th className="py-2 font-medium">Mes</th>
                <th className="py-2 font-medium text-right">Predicción (PEN)</th>
              </tr>
            </thead>
            <tbody>
              {(prediccionBackend?.predicciones ?? []).map((r, i) => (
                <tr key={r.mes} className={`border-b border-border/50 last:border-0 ${i + 1 === mesObjetivo ? "bg-accent/10" : ""}`}>
                  <td className="py-2 tabular text-muted-foreground">{i + 1}</td>
                  <td className="py-2">{r.mes}</td>
                  <td className="py-2 text-right tabular font-medium text-accent">{formatPEN(r.prediccion_ingresos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label, faded }: { color: string; label: string; faded?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block size-2.5 rounded-sm" style={{ background: color, opacity: faded ? 0.25 : 1 }} />
      {label}
    </span>
  );
}

function PredCard({
  icon: Icon, label, value, hint, highlight,
}: {
  icon: typeof Sparkles; label: string; value: string; hint: string; highlight?: boolean;
}) {
  return (
    <div
      className="border border-border rounded-lg p-5 relative overflow-hidden"
      style={{
        background: highlight ? "var(--gradient-primary)" : "var(--card)",
        boxShadow: highlight ? "var(--shadow-glow)" : "var(--shadow-card)",
      }}
    >
      <div className="flex items-center justify-between">
        <span className={`text-xs uppercase tracking-wider font-mono ${highlight ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{label}</span>
        <Icon className={`size-4 ${highlight ? "text-primary-foreground" : "text-accent"}`} />
      </div>
      <div className={`text-2xl font-display font-semibold mt-3 tabular ${highlight ? "text-primary-foreground" : ""}`}>{value}</div>
      <div className={`text-xs mt-1.5 ${highlight ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{hint}</div>
    </div>
  );
}

/**
 * Construye los datos del gráfico combinando el histórico real
 * con las predicciones generadas por el backend Python.
 */
function buildChartData(
  ventas: Venta[],
  ventasMensuales: VentaMensual[],
  prediccion: ResumenPrediccion | undefined,
  horizonte: number,
) {
  // Construir serie histórica desde las ventas (filtradas por categoría)
  const m = new Map<string, number>();
  ventas.forEach((v) => {
    const d = new Date(v.fecha);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    m.set(k, (m.get(k) ?? 0) + v.total_venta_pen);
  });
  const keys = [...m.keys()].sort();

  if (keys.length === 0) {
    return {
      series: [], splitLabel: "", historicLength: 0,
      forecastStart: "", forecastEnd: "",
    };
  }

  // Llenar meses faltantes
  const parseMonth = (k: string) => {
    const [y, mo] = k.split("-").map(Number);
    return new Date(y, mo - 1, 1);
  };
  const first = parseMonth(keys[0]);
  const last = parseMonth(keys[keys.length - 1]);
  const filled: { key: string; value: number; idx: number }[] = [];
  let cursor = new Date(first);
  let i = 0;
  while (cursor <= last) {
    const k = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    filled.push({ key: k, value: m.get(k) ?? 0, idx: i++ });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  // Calcular tendencia lineal simple para el gráfico
  const n = filled.length;
  const sumX = filled.reduce((a, p) => a + p.idx, 0);
  const sumY = filled.reduce((a, p) => a + p.value, 0);
  const sumXY = filled.reduce((a, p) => a + p.idx * p.value, 0);
  const sumX2 = filled.reduce((a, p) => a + p.idx * p.idx, 0);
  const denom = n * sumX2 - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  type Row = {
    mes: string; historico?: number; tendencia: number;
    prediccion?: number;
  };

  const series: Row[] = filled.map((p) => ({
    mes: p.key,
    historico: p.value,
    tendencia: Math.max(0, slope * p.idx + intercept),
  }));

  // Punto conector
  const lastIdx = filled.length - 1;
  const splitLabel = filled[lastIdx].key;
  series[lastIdx].prediccion = series[lastIdx].historico;

  // Agregar predicciones del backend Python
  const forecastRows: Row[] = [];
  if (prediccion) {
    prediccion.predicciones.forEach((p, j) => {
      const idx = lastIdx + j + 1;
      forecastRows.push({
        mes: p.mes,
        tendencia: Math.max(0, slope * idx + intercept),
        prediccion: p.prediccion_ingresos,
      });
    });
  }

  const fullSeries = [...series, ...forecastRows];

  return {
    series: fullSeries,
    splitLabel,
    historicLength: filled.length,
    forecastStart: forecastRows[0]?.mes ?? "",
    forecastEnd: forecastRows[forecastRows.length - 1]?.mes ?? "",
  };
}