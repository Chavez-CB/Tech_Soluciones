import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchVentas, formatPEN, formatInt, type Venta } from "@/lib/ventas";
import { ArrowUpRight, ArrowDownRight, TrendingUp, Package, ShoppingCart, Layers } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Cell,
} from "recharts";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { data, isLoading } = useQuery({ queryKey: ["ventas"], queryFn: fetchVentas });
  return <Dashboard ventas={data ?? []} loading={isLoading} />;
}

function Dashboard({ ventas, loading }: { ventas: Venta[]; loading: boolean }) {
  // KPIs
  const total = ventas.reduce((a, v) => a + v.total_venta_pen, 0);
  const units = ventas.reduce((a, v) => a + v.cantidad, 0);
  const orders = ventas.length;
  const avgTicket = orders ? total / orders : 0;

  // Compare current year vs previous
  const byYear = new Map<number, number>();
  ventas.forEach((v) => {
    const y = new Date(v.fecha).getFullYear();
    byYear.set(y, (byYear.get(y) ?? 0) + v.total_venta_pen);
  });
  const years = [...byYear.keys()].sort();
  const lastY = years[years.length - 1];
  const prevY = years[years.length - 2];
  const lastTotal = byYear.get(lastY) ?? 0;
  const prevTotal = byYear.get(prevY) ?? 0;
  const yoy = prevTotal ? ((lastTotal - prevTotal) / prevTotal) * 100 : 0;

  // Monthly series (last 24 months)
  const monthly = new Map<string, number>();
  ventas.forEach((v) => {
    const d = new Date(v.fecha);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthly.set(k, (monthly.get(k) ?? 0) + v.total_venta_pen);
  });
  const monthlySeries = [...monthly.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-24)
    .map(([k, v]) => ({ mes: k.slice(2), total: v }));

  // By category
  const byCat = new Map<string, number>();
  ventas.forEach((v) => byCat.set(v.categoria, (byCat.get(v.categoria) ?? 0) + v.total_venta_pen));
  const catData = [...byCat.entries()].map(([categoria, total]) => ({ categoria, total }));
  const catColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

  // Top products
  const byProd = new Map<string, number>();
  ventas.forEach((v) => byProd.set(v.producto, (byProd.get(v.producto) ?? 0) + v.total_venta_pen));
  const topProds = [...byProd.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([producto, total]) => ({ producto, total }));

  return (
    <div className="p-6 md:p-10 space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Panel principal</div>
          <h1 className="text-3xl md:text-4xl font-semibold mt-2">Resumen de ventas</h1>
          <p className="text-muted-foreground text-sm mt-1.5 max-w-xl">
            Laptops, impresoras, repuestos y accesorios. {orders.toLocaleString("es-PE")} ventas registradas entre {years[0]} y {lastY}.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-mono">Año {lastY}</div>
          <div className="text-2xl font-display font-semibold tabular mt-1">{formatPEN(lastTotal)}</div>
        </div>
      </header>

      {loading ? (
        <div className="text-muted-foreground">Cargando datos…</div>
      ) : (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi icon={TrendingUp} label="Ingresos totales" value={formatPEN(total)} sub={`${years.length} años de historia`} />
            <Kpi icon={ShoppingCart} label="Ventas realizadas" value={formatInt(orders)} sub={`Ticket promedio ${formatPEN(avgTicket)}`} />
            <Kpi icon={Package} label="Unidades vendidas" value={formatInt(units)} sub="Total acumulado" />
            <Kpi
              icon={Layers}
              label={`Variación vs ${prevY}`}
              value={`${yoy >= 0 ? "+" : ""}${yoy.toFixed(1)}%`}
              positive={yoy >= 0}
              sub={formatPEN(lastTotal - prevTotal)}
            />
          </section>

          <Card title="Tendencia mensual de ingresos" subtitle="Últimos 24 meses · PEN">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlySeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `S/${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatPEN(v)} />
                <Area type="monotone" dataKey="total" stroke="var(--chart-1)" strokeWidth={2} fill="url(#gradTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card title="Ingresos por categoría" subtitle="Distribución acumulada">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={catData} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} />
                  <YAxis dataKey="categoria" type="category" stroke="var(--muted-foreground)" fontSize={11} width={130} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatPEN(v)} />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {catData.map((_, i) => (
                      <Cell key={i} fill={catColors[i % catColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Top 6 productos" subtitle="Mayor ingreso histórico">
              <ul className="space-y-3 mt-1">
                {topProds.map((p, i) => {
                  const max = topProds[0].total;
                  return (
                    <li key={p.producto}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground w-5">{String(i + 1).padStart(2, "0")}</span>
                          {p.producto}
                        </span>
                        <span className="tabular font-medium">{formatPEN(p.total)}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(p.total / max) * 100}%`, background: "var(--gradient-primary)" }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--popover-foreground)",
};

function Kpi({
  icon: Icon, label, value, sub, positive,
}: {
  icon: typeof TrendingUp; label: string; value: string; sub?: string; positive?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-mono">{label}</span>
        <Icon className="size-4 text-primary" />
      </div>
      <div className="text-2xl font-display font-semibold mt-3 tabular">{value}</div>
      {sub != null && (
        <div className={`text-xs mt-1.5 flex items-center gap-1 ${positive === undefined ? "text-muted-foreground" : positive ? "text-primary" : "text-destructive"}`}>
          {positive !== undefined && (positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />)}
          {sub}
        </div>
      )}
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-lg p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="mb-4">
        <h3 className="font-display font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5 font-mono uppercase tracking-wider">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
