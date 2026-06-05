import os
import sys
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client

# Cargar variables de entorno
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
CSV_PATH = os.path.expanduser("~/Descargas/ventas.csv")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Error: SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están configurados en el .env.")
    sys.exit(1)

if not os.path.exists(CSV_PATH):
    print(f"❌ Error: No se encontró el archivo CSV en: {CSV_PATH}")
    sys.exit(1)

print("🚀 Conectando a Supabase...")
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# 1. Leer el CSV con pandas
print(f"📖 Leyendo el archivo CSV: {CSV_PATH}")
df = pd.read_csv(CSV_PATH)

# Asegurar tipos y limpiar columnas
df["fecha"] = df["fecha"].astype(str)
df["cantidad"] = pd.to_numeric(df["cantidad"], errors="coerce").fillna(0).astype(int)
df["precio_unitario_pen"] = pd.to_numeric(df["precio_unitario_pen"], errors="coerce").fillna(0.0)
df["total_venta_pen"] = pd.to_numeric(df["total_venta_pen"], errors="coerce").fillna(0.0)

total_rows = len(df)
print(f"📊 Se cargaron {total_rows} filas desde el CSV.")

# 2. Vaciar la tabla actual
print("🧹 Vaciando la tabla 'ventas' en Supabase...")
try:
    # Eliminamos todos los registros donde id > 0 (esto borra todo debido a la clave serial)
    delete_res = supabase.table("ventas").delete().gt("id", 0).execute()
    print("✅ Tabla vaciada correctamente.")
except Exception as e:
    print(f"❌ Error al vaciar la tabla: {e}")
    sys.exit(1)

# 3. Insertar los datos en bloques
chunk_size = 500
records = df.to_dict(orient="records")

print(f"Uploading {total_rows} registros en bloques de {chunk_size}...")

inserted_count = 0
for i in range(0, total_rows, chunk_size):
    chunk = records[i:i + chunk_size]
    try:
        supabase.table("ventas").insert(chunk).execute()
        inserted_count += len(chunk)
        print(f"  - Progreso: {inserted_count}/{total_rows} registros subidos.")
    except Exception as e:
        print(f"❌ Error al subir bloque {i} a {i + len(chunk)}: {e}")
        print("🛑 Deteniendo migración.")
        sys.exit(1)

print(f"\n🎉 ¡Éxito! Se subieron los {inserted_count} nuevos registros a Supabase.")
