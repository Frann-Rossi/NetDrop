# 📂 NetDrop

**NetDrop** es un servidor rápido y seguro para **subir y descargar archivos** de forma local o remota.
Está estructurado en dos partes modernas:
1. **Frontend**: Creado con Astro y Tailwind CSS (interfaz de usuario moderna y súper rápida).
2. **Backend**: Creado con Flask (API REST para el manejo seguro de archivos).

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

El Backend (API) requiere autenticación básica HTTP para proteger la subida y modificación de archivos.

**Niveles de Acceso:**
- **Público (Sin contraseña):** Descargar o ver un archivo específico si se conoce el enlace exacto (ej. `http://IP:8000/archivo.pdf`).
- **Privado (Requiere contraseña):** Ver la lista completa de archivos, buscar, subir nuevos archivos y eliminarlos.

### Configuración de Credenciales (`.env`)

Para configurar tu usuario y contraseña de forma segura, debes crear un archivo llamado `.env` dentro de la carpeta `backend/` con este formato:

```env
FILE_SERVER_USER="miusuario"
FILE_SERVER_PASSWORD="micontraseña"
```

> **Nota:** Este archivo `.env` está incluido en el `.gitignore`, por lo que **nunca se subirá a GitHub** ni a ningún repositorio, manteniendo tus claves a salvo. Si por algún motivo se borra este archivo, el sistema tiene credenciales por defecto (`admin` / `1234`) para evitar que deje de funcionar.

## 🧠 Notas Adicionales

- Tamaño máximo de subida: **500MB**.
- Los archivos se guardan físicamente en `backend/files/`.
- La interfaz se sincroniza automáticamente: si alguien sube un archivo desde un celular, la pantalla de la computadora se actualizará sola sin recargar la página.
- Funcionalidad de descarga silenciosa: Los botones de descarga guardan el archivo nativamente sin abrir pestañas nuevas.
- La API de Flask utiliza `Flask-Cors` para permitir solicitudes desde el Frontend en Astro sin problemas de puertos.
