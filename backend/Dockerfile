# ==========================================
# Dockerfile para Tech_Soluciones Backend
# ==========================================

FROM python:3.12-slim

WORKDIR /app

# Instalar dependencias esenciales si es necesario
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements.txt e instalar dependencias de Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el resto del código fuente del backend
COPY . .

# Exponer el puerto por el que correrá FastAPI
EXPOSE 8000

# Comando para ejecutar FastAPI usando uvicorn en producción
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
