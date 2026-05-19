import { Link } from "@tanstack/react-router";
import { LayoutDashboard, BarChart3, Sparkles, History } from "lucide-react";
import logoUrl from "@/assets/logo-tech-soluciones.png";

const items = [
  { to: "/", label: "Panel principal", icon: LayoutDashboard },
  { to: "/graficos", label: "Estadísticas", icon: BarChart3 },
  { to: "/predicciones", label: "Predicción de ventas", icon: Sparkles },
  { to: "/historial", label: "Historial", icon: History },
] as const;

export function SidebarNav() {
  return (
    <aside className="hidden md:flex flex-col w-72 shrink-0 border-r border-border bg-sidebar h-screen sticky top-0">
      <div className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex flex-col items-center gap-2 text-center">
          <img src={logoUrl} alt="Tech Soluciones" className="w-full max-w-[240px] h-auto object-contain drop-shadow-lg" />
          <div className="text-[11px] text-muted-foreground tracking-[0.2em] uppercase font-medium">Inteligencia de Ventas</div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {items.map((it) => (
          <Link
            key={it.to}
            to={it.to}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition"
            activeOptions={{ exact: true }}
            activeProps={{
              className:
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm bg-sidebar-accent text-primary font-medium border border-border",
            }}
          >
            <it.icon className="size-4" />
            {it.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-sidebar-border text-[11px] text-muted-foreground">
        <div className="font-mono">v1.0 · Soles (PEN) · Lima</div>
      </div>
    </aside>
  );
}

export function MobileTopBar() {
  return (
    <div className="md:hidden flex items-center gap-2 px-4 py-3 border-b border-border bg-sidebar overflow-x-auto">
      <img src={logoUrl} alt="Tech Soluciones" className="h-10 w-auto object-contain mr-2 shrink-0" />
      {items.map((it) => (
        <Link
          key={it.to}
          to={it.to}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-sidebar-foreground/80 hover:bg-sidebar-accent whitespace-nowrap"
          activeOptions={{ exact: true }}
          activeProps={{
            className:
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-sidebar-accent text-primary font-medium whitespace-nowrap border border-border",
          }}
        >
          <it.icon className="size-3.5" />
          {it.label}
        </Link>
      ))}
    </div>
  );
}