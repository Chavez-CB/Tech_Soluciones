import os
import sys
from dotenv import load_dotenv
from supabase import create_client

# Cargar variables de entorno
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: SUPABASE_URL o SUPABASE_PUBLISHABLE_KEY no están configurados en el .env.")
    sys.exit(1)

print("🔍 Iniciando diagnóstico de la base de datos...")
print(f"🔗 URL del proyecto: {SUPABASE_URL}")

def test_connection_with_key(key_name, key):
    print(f"\n--- Probando conexión con {key_name} ---")
    try:
        client = create_client(SUPABASE_URL, key)
        # Intentar consultar 1 registro de la tabla ventas
        response = client.table("ventas").select("*").limit(1).execute()
        
        # Si no arrojó excepción, la consulta fue exitosa
        data = response.data
        print(f"✅ Conexión exitosa usando {key_name}.")
        
        if not data:
            print("⚠️ Advertencia: La tabla 'ventas' está vacía o no tienes permisos de lectura.")
            return None
        
        record = data[0]
        print("📋 Ejemplo de registro obtenido:")
        for col, val in record.items():
            print(f"  - {col}: {val} ({type(val).__name__})")
            
        return record
    except Exception as e:
        print(f"❌ Error al consultar con {key_name}: {e}")
        return None

# 1. Probar con la Anon Key (la que usa el backend para consultar)
anon_record = test_connection_with_key("SUPABASE_PUBLISHABLE_KEY (Anon Key)", SUPABASE_KEY)

# 2. Probar con la Service Key (si existe)
service_record = None
if SUPABASE_SERVICE_KEY:
    service_record = test_connection_with_key("SUPABASE_SERVICE_ROLE_KEY (Service Key)", SUPABASE_SERVICE_KEY)
else:
    print("\n⚠️ SUPABASE_SERVICE_ROLE_KEY no está configurada en .env.")

# 3. Validaciones de esquema
record_to_validate = anon_record or service_record

if not record_to_validate:
    print("\n❌ Error Crítico: No se pudo recuperar ningún registro de la tabla 'ventas'.")
    print("Asegúrate de que:")
    print(" 1. La tabla se llame exactamente 'ventas'.")
    print(" 2. Hayas ejecutado la consulta SQL para habilitar RLS y la política de lectura pública.")
    sys.exit(1)

print("\n--- Validando campos obligatorios ---")
errors = []

# Campo 'id'
if "id" not in record_to_validate:
    errors.append("Falta la columna 'id' (clave primaria auto-incremental).")
else:
    print("✅ Columna 'id' detectada.")

# Campo 'fecha'
if "fecha" not in record_to_validate:
    errors.append("Falta la columna 'fecha'.")
else:
    print("✅ Columna 'fecha' detectada.")

# Campo 'categoria'
if "categoria" not in record_to_validate:
    print("⚠️ Advertencia: Falta la columna 'categoria' (opcional pero recomendada).")

# Campo 'producto'
if "producto" not in record_to_validate:
    print("⚠️ Advertencia: Falta la columna 'producto' (opcional pero recomendada).")

# Campos numéricos
for num_field in ["cantidad", "precio_unitario_pen", "total_venta_pen"]:
    if num_field not in record_to_validate:
        errors.append(f"Falta la columna numérica '{num_field}'.")
    else:
        val = record_to_validate[num_field]
        if not isinstance(val, (int, float)):
            errors.append(f"La columna '{num_field}' debe ser de tipo numérico (actualmente: {type(val).__name__}).")
        else:
            print(f"✅ Columna '{num_field}' detectada con tipo numérico correcto.")

if errors:
    print("\n❌ El esquema no es completamente compatible con el backend:")
    for err in errors:
        print(f"  - {err}")
    print("\n💡 Sugerencia: Si importaste el CSV puro sin modificar, ejecuta el script SQL en Supabase")
    print("para corregir la estructura e insertar la columna 'id'.")
    sys.exit(1)
else:
    print("\n🎉 ¡Éxito! El esquema de la tabla 'ventas' es 100% compatible con el backend.")
    
    # Mostrar conteo total
    try:
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
        count_response = client.table("ventas").select("id", count="exact").limit(1).execute()
        total_count = count_response.count
        print(f"📊 Registros totales en la tabla: {total_count}")
    except Exception as e:
        print(f"⚠️ No se pudo obtener el conteo exacto de filas: {e}")
