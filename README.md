# 📊 Tech_Soluciones — Sistema de Predicción de Ventas

Sistema de análisis y predicción de ingresos por ventas construido con **React + FastAPI + Scikit-Learn**. Conecta con Supabase para obtener datos históricos y genera predicciones de ingresos futuros usando regresión lineal.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## 🏗️ Arquitectura

```
┌─────────────────────┐     HTTP/JSON     ┌─────────────────────┐     API REST     ┌───────────┐
│   Frontend (React)  │ ◄──────────────►  │  Backend (FastAPI)  │ ◄─────────────►  │  Supabase │
│   Vite + TailwindCSS│                   │  Python + SK-Learn  │                  │  (Postgres)│
│   Recharts + RQuery │                   │  Pandas + NumPy     │                  │           │
└─────────────────────┘                   └─────────────────────┘                  └───────────┘
```

## ✨ Funcionalidades

- 📈 **Dashboard de ventas** con gráficos interactivos (Recharts)
- 🔮 **Predicción de ingresos** usando regresión lineal (scikit-learn)
- 📅 Agrupación de ventas mensuales con métricas agregadas
- 🔄 **Caché en memoria** con TTL de 5 minutos (evita consultas repetitivas)
- 📄 **Paginación automática** para tablas con más de 1000 registros
- 🔒 CORS configurado y credenciales protegidas via `.env`
- 📖 Documentación interactiva de la API en `/docs` (Swagger UI)

---

## 🚀 Instalación y Ejecución

### Requisitos previos

- **Node.js** >= 18
- **Python** >= 3.12
- Cuenta en [Supabase](https://supabase.com) con una tabla `ventas`

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/tech-soluciones.git
cd tech-soluciones
```

### 2. Configurar variables de entorno

Copia el archivo de ejemplo y agrega tus credenciales:

```bash
cp .env.example .env
```

Edita `.env` con tus valores reales:

```env
SUPABASE_URL="https://tu-proyecto.supabase.co"
SUPABASE_PUBLISHABLE_KEY="tu-api-key-aqui"
VITE_SUPABASE_URL="https://tu-proyecto.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="tu-api-key-aqui"
VITE_SUPABASE_PROJECT_ID="tu-project-id"
VITE_API_BASE_URL="http://localhost:8000"
```

### 3. Instalar y ejecutar el Frontend

```bash
npm install
npm run dev
```

El frontend estará disponible en `http://localhost:5173`.

### 4. Instalar y ejecutar el Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
```

El backend estará disponible en `http://localhost:8000`.  
Documentación interactiva en `http://localhost:8000/docs`.

---

## 📁 Estructura del proyecto

```
tech-soluciones/
├── src/                        # Frontend (React + TypeScript)
│   ├── components/             # Componentes reutilizables
│   ├── routes/                 # Páginas de la aplicación
│   │   └── predicciones.tsx    # Dashboard de predicciones
│   └── lib/
│       └── ventas.ts           # Capa de datos (conexión al backend)
│
├── backend/                    # Backend (Python + FastAPI)
│   ├── main.py                 # Servidor FastAPI y endpoints
│   ├── database.py             # Conexión a Supabase + caché
│   ├── models.py               # Modelos Pydantic (validación)
│   ├── predict.py              # Lógica ML (scikit-learn)
│   └── requirements.txt        # Dependencias Python
│
├── .env                        # Variables de entorno (NO subir a git)
├── .env.example                # Plantilla de variables de entorno
├── package.json                # Dependencias del frontend
└── vite.config.ts              # Configuración de Vite
```

---

## 🔌 Endpoints de la API

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/` | Info general de la API |
| `GET` | `/ventas` | Todas las ventas (paginado automático) |
| `GET` | `/ventas-mensuales` | Ventas agrupadas por mes |
| `GET` | `/prediccion?meses=12` | Predicción de ingresos (1-60 meses) |
| `GET` | `/docs` | Documentación interactiva (Swagger) |
| `GET` | `/redoc` | Documentación alternativa (ReDoc) |

---

## 🛠️ Stack Tecnológico

### Frontend
- **React 19** con TypeScript
- **TanStack Router** para navegación
- **TanStack Query** para caché y fetching
- **Recharts** para gráficos
- **TailwindCSS 4** para estilos
- **Vite 7** como bundler

### Backend
- **FastAPI** como framework web
- **Pandas** para procesamiento de datos
- **Scikit-Learn** para el modelo de predicción
- **Supabase Python** como cliente de base de datos
- **Uvicorn** como servidor ASGI

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

---

<p align="center">
  Hecho con ❤️ por <strong>Tech_Soluciones</strong>
</p>
