from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_raiz():
    """
    Prueba básica del endpoint raíz.
    Verifica que el servidor levante correctamente y retorne su metadata.
    """
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {
        "mensaje": "API de Predicción de Ventas activa",
        "version": "1.0.0",
        "endpoints": {
            "ventas": "/ventas",
            "ventas_mensuales": "/ventas-mensuales",
            "prediccion": "/prediccion",
            "documentacion": "/docs",
        },
    }
