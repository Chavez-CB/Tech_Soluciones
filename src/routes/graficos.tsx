import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { fetchVentas, formatPEN, type Venta } from "@/lib/ventas";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { Filter } from "lucide-react";

export const Route = createFileRoute("/graficos")({ component: Page });

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--popover-foreground)",
};

function Page() {
  const { data: ventas = [], isLoading } = useQuery({ queryKey: ["ventas"], queryFn: fetchVentas });

  const years = useMemo(() => {
    const s = new Set<number>();
    ventas.forEach((v) => s.add(new Date(v.fecha).getFullYear()));
    return [...s].sort();
  }, [ventas]);

  const categorias = useMemo(() => {
    const s = new Set<string>();
    ventas.forEach((v) => s.add(v.categoria));
    return [...s].sort();
  }, [ventas]);

  const [year, setYear] = useState<number | "all">("all");
  const [cat, setCat] = useState<string>("all");

  const filtered = useMemo(() => {
    return ventas.filter((v) => {
      const y = new Date(v.fecha).getFullYear();
      if (year !== "all" && y !== year) return false;
      if (cat !== "all" && v.categoria !== cat) return false;
      return true;
    });
  }, [ventas, year, cat]);

  return (
    <div className="p-6 md:p-10 space-y-8">
      <header>
        <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Análisis</div>
        <h1 className="text-3xl md:text-4xl font-semibold mt-2">Estadísticas de ventas</h1>
        <p className="text-muted-foreground text-sm mt-1.5">Filtra por año y categoría para explorar el comportamiento de las ventas.</p>
      </header>

      <div className="flex flex-wrap gap-3 items-center bg-card border border-border rounded-lg p-4">
        <Filter className="size-4 text-primary" />
        <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Filtros</span>
        <Select label="Año" value={String(year)} onChange={(v) => setYear(v === "all" ? "all" : Number(v))} options={[{ v: "all", l: "Todos" }, ...years.map((y) => ({ v: String(y), l: String(y) }))]} />
        <Select label="Categoría" value={cat} onChange={setCat} options={[{ v: "all", l: "Todas" }, ...categorias.map((c) => ({ v: c, l: c }))]} />
        <div className="ml-auto text-xs font-mono text-muted-foreground">
          {filtered.length.toLocaleString("es-PE")} registros · {formatPEN(filtered.reduce((a, v) => a + v.total_venta_pen, 0))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Cargando…</div>
      ) : (
        <>
          <MonthlyChart ventas={filtered} />
          <div className="grid lg:grid-cols-2 gap-6">
            <CategoryPie ventas={filtered} />
            <DayOfWeekChart ventas={filtered} />
          </div>
          <YearlyChart ventas={filtered} />
        </>
      )}
    </div>
  );
}

function Select({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[];
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground text-xs">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-input border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>{o.l}</option>
        ))}
      </select>
    </label>
  );
}

function CardBox({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-lg p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <h3 className="font-display font-semibold">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5 mb-4 font-mono uppercase tracking-wider">{subtitle}</p>}
      {children}
    </div>
  );
}

function MonthlyChart({ ventas }: { ventas: Venta[] }) {
  const data = useMemo(() => {
    const m = new Map<string, { total: number; unidades: number }>();
    ventas.forEach((v) => {
      const d = new Date(v.fecha);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const cur = m.get(k) ?? { total: 0, unidades: 0 };
      cur.total += v.total_venta_pen;
      cur.unidades += v.cantidad;
      m.set(k, cur);
    });
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([mes, v]) => ({ mes, ...v }));
  }, [ventas]);
  return (
    <CardBox title="Ingresos y unidades por mes" subtitle="Serie temporal">
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={11} />
          <YAxis yAxisId="l" stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `S/${(v / 1000).toFixed(0)}k`} />
          <YAxis yAxisId="r" orientation="right" stroke="var(--muted-foreground)" fontSize={11} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n) => (n === "total" ? formatPEN(v) : v)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line yAxisId="l" type="monotone" dataKey="total" name="Ingresos" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
          <Line yAxisId="r" type="monotone" dataKey="unidades" name="Unidades" stroke="var(--chart-3)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </CardBox>
  );
}

function CategoryPie({ ventas }: { ventas: Venta[] }) {
  const data = useMemo(() => {
    const m = new Map<string, number>();
    ventas.forEach((v) => m.set(v.categoria, (m.get(v.categoria) ?? 0) + v.total_venta_pen));
    return [...m.entries()].map(([name, value]) => ({ name, value }));
  }, [ventas]);
  const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
  return (
    <CardBox title="Distribución por categoría" subtitle="Participación en ingresos">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} stroke="var(--card)" strokeWidth={2} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatPEN(v)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </CardBox>
  );
}

function DayOfWeekChart({ ventas }: { ventas: Venta[] }) {
  const data = useMemo(() => {
    const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const m = new Array(7).fill(0);
    ventas.forEach((v) => { m[new Date(v.fecha).getDay()] += v.total_venta_pen; });
    return days.map((d, i) => ({ dia: d, total: m[i] }));
  }, [ventas]);
  return (
    <CardBox title="Ingresos por día de la semana" subtitle="Patrón semanal">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="dia" stroke="var(--muted-foreground)" fontSize={11} />
          <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `S/${(v / 1000).toFixed(0)}k`} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatPEN(v)} />
          <Bar dataKey="total" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </CardBox>
  );
}

function YearlyChart({ ventas }: { ventas: Venta[] }) {
  const data = useMemo(() => {
    const m = new Map<number, number>();
    ventas.forEach((v) => {
      const y = new Date(v.fecha).getFullYear();
      m.set(y, (m.get(y) ?? 0) + v.total_venta_pen);
    });
    return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([año, total]) => ({ año, total }));
  }, [ventas]);
  return (
    <CardBox title="Comparativa anual" subtitle="Ingresos por año">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="año" stroke="var(--muted-foreground)" fontSize={11} />
          <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `S/${(v / 1000).toFixed(0)}k`} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatPEN(v)} />
          <Bar dataKey="total" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </CardBox>
  );
}