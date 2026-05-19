import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { fetchVentas, formatPEN, type Venta } from "@/lib/ventas";
import { Search, ChevronLeft, ChevronRight, Download } from "lucide-react";

export const Route = createFileRoute("/historial")({ component: Page });

function Page() {
  const { data: ventas = [], isLoading } = useQuery({ queryKey: ["ventas"], queryFn: fetchVentas });

  const categorias = useMemo(() => {
    const s = new Set<string>(); ventas.forEach((v) => s.add(v.categoria));
    return [...s].sort();
  }, [ventas]);
  const years = useMemo(() => {
    const s = new Set<number>(); ventas.forEach((v) => s.add(new Date(v.fecha).getFullYear()));
    return [...s].sort((a, b) => b - a);
  }, [ventas]);

  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [year, setYear] = useState<string>("all");
  const [sort, setSort] = useState<"fecha-desc" | "fecha-asc" | "total-desc" | "total-asc">("fecha-desc");
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const filtered = useMemo(() => {
    const lower = q.trim().toLowerCase();
    let out = ventas.filter((v) => {
      if (cat !== "all" && v.categoria !== cat) return false;
      if (year !== "all" && String(new Date(v.fecha).getFullYear()) !== year) return false;
      if (lower && !v.producto.toLowerCase().includes(lower) && !v.categoria.toLowerCase().includes(lower)) return false;
      return true;
    });
    out = [...out].sort((a, b) => {
      switch (sort) {
        case "fecha-asc": return a.fecha.localeCompare(b.fecha);
        case "fecha-desc": return b.fecha.localeCompare(a.fecha);
        case "total-asc": return a.total_venta_pen - b.total_venta_pen;
        case "total-desc": return b.total_venta_pen - a.total_venta_pen;
      }
    });
    return out;
  }, [ventas, q, cat, year, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = filtered.slice(page * pageSize, page * pageSize + pageSize);
  const totalSum = filtered.reduce((a, v) => a + v.total_venta_pen, 0);

  function exportCsv() {
    const header = "fecha,categoria,producto,cantidad,precio_unitario_pen,total_venta_pen\n";
    const rows = filtered.map((v) =>
      [v.fecha, v.categoria, `"${v.producto.replace(/"/g, '""')}"`, v.cantidad, v.precio_unitario_pen, v.total_venta_pen].join(","),
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "historial-ventas.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function resetPageAnd<T extends (v: string) => void>(fn: T) {
    return (v: string) => { setPage(0); fn(v); };
  }

  return (
    <div className="p-6 md:p-10 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Operaciones</div>
          <h1 className="text-3xl md:text-4xl font-semibold mt-2">Historial de ventas</h1>
          <p className="text-muted-foreground text-sm mt-1.5">
            {filtered.length.toLocaleString("es-PE")} de {ventas.length.toLocaleString("es-PE")} registros · {formatPEN(totalSum)}
          </p>
        </div>
        <button onClick={exportCsv} className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm border border-border bg-card hover:bg-secondary transition">
          <Download className="size-4" /> Exportar CSV
        </button>
      </header>

      <div className="bg-card border border-border rounded-lg p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => { setPage(0); setQ(e.target.value); }}
            placeholder="Buscar producto o categoría…"
            className="w-full bg-input border border-border rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select value={cat} onChange={(e) => resetPageAnd(setCat)(e.target.value)} className="bg-input border border-border rounded-md px-3 py-2 text-sm">
          <option value="all">Todas las categorías</option>
          {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={year} onChange={(e) => resetPageAnd(setYear)(e.target.value)} className="bg-input border border-border rounded-md px-3 py-2 text-sm">
          <option value="all">Todos los años</option>
          {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="bg-input border border-border rounded-md px-3 py-2 text-sm">
          <option value="fecha-desc">Más recientes</option>
          <option value="fecha-asc">Más antiguas</option>
          <option value="total-desc">Mayor monto</option>
          <option value="total-asc">Menor monto</option>
        </select>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-sidebar">
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium text-right">Cant.</th>
                <th className="px-4 py-3 font-medium text-right">P. unitario</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Cargando…</td></tr>
              ) : pageData.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Sin resultados</td></tr>
              ) : pageData.map((v) => <Row key={v.id} v={v} />)}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm">
          <span className="text-muted-foreground text-xs font-mono">
            Página {page + 1} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="p-1.5 rounded-md border border-border hover:bg-secondary disabled:opacity-40">
              <ChevronLeft className="size-4" />
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1.5 rounded-md border border-border hover:bg-secondary disabled:opacity-40">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ v }: { v: Venta }) {
  return (
    <tr className="border-b border-border/40 last:border-0 hover:bg-secondary/40 transition">
      <td className="px-4 py-3 tabular text-muted-foreground">{v.fecha}</td>
      <td className="px-4 py-3">
        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{v.categoria}</span>
      </td>
      <td className="px-4 py-3">{v.producto}</td>
      <td className="px-4 py-3 tabular text-right">{v.cantidad}</td>
      <td className="px-4 py-3 tabular text-right text-muted-foreground">{formatPEN(v.precio_unitario_pen)}</td>
      <td className="px-4 py-3 tabular text-right font-medium">{formatPEN(v.total_venta_pen)}</td>
    </tr>
  );
}