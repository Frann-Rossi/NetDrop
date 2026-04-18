# 📂 NetDrop

**NetDrop** es un servidor rápido y seguro para **subir y descargar archivos** de forma local o remota.
Está estructurado en dos partes modernas:
1. **Frontend**: Creado con Astro y Tailwind CSS (interfaz de usuario moderna y súper rápida).
2. **Backend**: Creado con Python usando Flask (API REST) y Waitress (Servidor WSGI de producción).

---

## 🚀 Requisitos

- Node.js (para correr el Frontend en Astro)
- Python 3.8 o superior (para correr el Backend)

---

## 🛠️ Estructura del Proyecto

```text
/
├── backend/
│   ├── upload_server.py    # Servidor y API (Flask + Waitress)
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

### 1. Backend (Python)

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
4. Ejecutar el servidor (correrá en `http://localhost:8000` de forma segura mediante Waitress):
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
   *Nota: Opcionalmente puedes compilar el proyecto para producción ejecutando `npm run build` y sirviendo la carpeta `dist/`.*

---

## 🔐 Login y Seguridad

El proyecto incluye múltiples capas de seguridad tanto en el Frontend como en el Backend:

- **Servidor WSGI:** El backend utiliza `waitress` en lugar del servidor de desarrollo nativo de Flask para un entorno de producción robusto y seguro.
- **Prevención XSS:** El frontend sanitiza automáticamente (mediante `escapeHTML`) el nombre de los archivos renderizados en la web para prevenir ataques de Cross-Site Scripting.
- **Autenticación HTTP Básica:** Protege la subida y modificación de archivos.

**Niveles de Acceso:**
- **Público (Sin contraseña):** Descargar o ver un archivo específico si se conoce el enlace exacto (ej. `http://IP:8000/archivo.pdf`).
- **Privado (Requiere contraseña):** Ver la lista completa de archivos, buscar, subir nuevos archivos y eliminarlos.

### Configuración de Credenciales (`.env`)

Para configurar tu usuario y contraseña de forma segura, debes crear un archivo llamado `.env` dentro de la carpeta `backend/` con este formato:

```env
FILE_SERVER_USER="miusuario"
FILE_SERVER_PASSWORD="micontraseña"
```

> **Nota:** Este archivo `.env` está incluido en el `.gitignore`, por lo que **nunca se subirá a GitHub**. Si no se configura este archivo, el servidor utilizará credenciales por defecto (`admin` / `1234`) y mostrará una advertencia visible (Warning) en la consola para evitar dejar el servidor desprotegido sin darse cuenta.

---

## 🌟 Funcionalidades Destacadas

- **Subida Drag & Drop:** Arrastra archivos múltiples (hasta **500MB** por defecto) para subirlos.
- **Sincronización en Tiempo Real:** La interfaz se actualiza automáticamente en segundo plano.
- **Búsqueda y Ordenamiento Avanzado:** Filtra en vivo por nombre y ordena por Fecha, Tamaño o Nombre al instante sin recargar la página.
- **Arquitectura DRY:** El código del frontend está refactorizado usando el principio *Don't Repeat Yourself*, centralizando llamadas API, animaciones y creando componentes reutilizables (ej. Modales en Astro).
- **Descargas Nativas Silenciosas:** Los botones guardan el archivo nativamente sin abrir nuevas pestañas.
- **Soporte CORS:** La API de Flask se comunica fluidamente con el Frontend en Astro utilizando `Flask-Cors`.
