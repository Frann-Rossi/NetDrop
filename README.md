# 📂 File Server (Astro + Flask)

Este proyecto es un servidor para **subir y descargar archivos** de forma local o remota.
Recientemente se ha reestructurado en dos partes:
1. **Frontend**: Creado con Astro y Tailwind CSS (interfaz de usuario moderna).
2. **Backend**: Creado con Flask (API REST para manejo de archivos).

---

## 🚀 Requisitos

- Node.js (para correr el Frontend en Astro)
- Python 3.8 o superior (para correr el Backend en Flask)

---

## 🛠️ Estructura del Proyecto

```text
/
├── backend/
│   ├── upload_server.py    # Servidor Flask (API)
│   ├── files/              # Carpeta donde se guardan los archivos
│   ├── requirements.txt    # Dependencias de Python
│   └── venv/               # Entorno virtual de Python
└── frontend/
    ├── src/                # Código fuente de Astro (UI)
    ├── package.json        # Dependencias de Node
    └── astro.config.mjs    # Configuración de Astro y Tailwind
```

---

## 📦 Instalación y Ejecución

### 1. Backend (Flask)

1. Abrir una terminal en `backend/`:
   ```bash
   cd backend
   ```
2. Crear y activar un entorno virtual:
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # Linux / macOS:
   source venv/bin/activate
   ```
3. Instalar dependencias:
   ```bash
   pip install -r requirements.txt
   ```
4. Ejecutar el servidor (correrá en `http://localhost:8000`):
   ```bash
   python upload_server.py
   ```

### 2. Frontend (Astro)

1. Abrir otra terminal en `frontend/`:
   ```bash
   cd frontend
   ```
2. Instalar las dependencias de Node:
   ```bash
   npm install
   ```
3. Ejecutar el servidor de desarrollo (correrá en `http://localhost:4321`):
   ```bash
   npm run dev
   ```
   **Para acceder desde celulares u otras computadoras en tu red WiFi**, debes ejecutarlo con el flag `--host` para exponer la IP local:
   ```bash
   npm run dev -- --host
   ```

---

## 🔐 Login y Seguridad

El Backend (API) requiere autenticación básica HTTP para proteger la modificación de archivos.
Las credenciales por defecto son:
- **Usuario**: `dokaidevs`
- **Contraseña**: `rollimussi2026`

**Niveles de Acceso:**
- **Público (Sin contraseña):** Descargar o ver un archivo específico si se conoce el enlace exacto (ej. `http://IP:8000/archivo.pdf`).
- **Privado (Requiere contraseña):** Ver la lista completa de archivos, buscar, subir nuevos archivos y eliminarlos.

Se pueden configurar usando variables de entorno antes de levantar el backend:
```bash
export FILE_SERVER_USER="miusuario"
export FILE_SERVER_PASSWORD="mipassword"
```

## 🧠 Notas Adicionales

- Tamaño máximo de subida: **500MB**.
- Los archivos se guardan físicamente en `backend/files/`.
- La interfaz se sincroniza automáticamente: si alguien sube un archivo desde un celular, la pantalla de la computadora se actualizará sola sin recargar la página.
- Funcionalidad de descarga silenciosa: Los botones de descarga guardan el archivo nativamente sin abrir pestañas nuevas.
- La API de Flask utiliza `Flask-Cors` para permitir solicitudes desde el Frontend en Astro sin problemas de puertos.
