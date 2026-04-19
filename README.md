# 📂 NetDrop

**NetDrop** es un servidor local rápido y seguro para **subir, descargar y gestionar archivos** desde cualquier dispositivo en tu red WiFi.

Pensado para compartir archivos entre tu PC y tu celular (o entre varias computadoras) sin depender de la nube.

---

## ✨ Tech Stack

| Capa | Tecnología |
|---|---|
| **Frontend** | [Astro 6](https://astro.build/) · [Tailwind CSS 4](https://tailwindcss.com/) · Font Awesome |
| **Backend** | [Flask](https://flask.palletsprojects.com/) · [Waitress](https://docs.pylonsproject.org/projects/waitress/) (WSGI) · Flask-CORS |
| **Tipografía** | [Inter](https://fonts.google.com/specimen/Inter) (Google Fonts) |

---

## 🛠️ Estructura del Proyecto

```text
NetDrop/
├── Iniciar_NetDrop.bat          # 🚀 Lanzador con un solo clic (instala todo automáticamente)
├── backend/
│   ├── upload_server.py         # API REST (Flask + Waitress)
│   ├── requirements.txt         # Dependencias Python (flask, flask-cors, waitress, python-dotenv)
│   ├── .env                     # Credenciales (no se sube a Git)
│   └── files/                   # Carpeta donde se guardan los archivos subidos
└── frontend/
    ├── astro.config.mjs         # Configuración de Astro + Tailwind v4
    ├── package.json             # Dependencias Node (astro, tailwindcss, @tailwindcss/vite)
    └── src/
        ├── layouts/
        │   └── Layout.astro     # Layout global (fonts, iconos, efectos de fondo)
        ├── pages/
        │   └── index.astro      # Página principal (composición de componentes)
        ├── components/
        │   ├── Header.astro     # Encabezado
        │   ├── UploadZone.astro # Zona drag & drop para subir archivos
        │   ├── FileList.astro   # Lista de archivos con búsqueda y ordenamiento
        │   ├── LoginModal.astro # Modal de login
        │   ├── DeleteModal.astro# Modal de confirmación de eliminación
        │   ├── Modal.astro      # Componente base reutilizable para modales
        │   └── ToastContainer.astro # Notificaciones toast
        ├── scripts/
        │   └── app.js           # Lógica de la aplicación (apiFetch, auth, polling, etc.)
        └── styles/
            └── global.css       # Estilos globales + Tailwind
```

---

## 🚀 Inicio Rápido (Windows)

La forma más fácil de usar NetDrop:

1. Hacer **doble clic** en `Iniciar_NetDrop.bat`.
2. Listo. El script:
   - Crea el entorno virtual de Python e instala las dependencias (solo la primera vez).
   - Instala las dependencias de Node (solo la primera vez).
   - Levanta el backend y el frontend.
   - Abre el navegador automáticamente en `http://localhost:4321`.
   - Muestra la IP local para conectarte desde otros dispositivos.

> **Nota:** Se abrirán dos ventanas de consola. Minimizalas pero **no las cierres**. Para apagar NetDrop, cerrá esas dos ventanas.

---

## 📦 Instalación Manual

### Requisitos

- **Node.js** ≥ 22.12.0
- **Python** ≥ 3.8

### 1. Backend (Python)

```bash
cd backend
python -m venv venv

# Windows:
venv\Scripts\activate
# Linux / macOS:
source venv/bin/activate

pip install -r requirements.txt
python upload_server.py
```

El servidor API correrá en `http://0.0.0.0:8000` usando Waitress (producción).

### 2. Frontend (Astro)

```bash
cd frontend
npm install
npm run dev
```

La interfaz estará disponible en `http://localhost:4321`.

Para acceder desde **otros dispositivos en tu red WiFi**:

```bash
npm run dev -- --host
```

---

## 🔐 Seguridad y Autenticación

### Niveles de Acceso

| Acción | ¿Requiere contraseña? |
|---|---|
| Descargar un archivo por enlace directo (ej. `http://IP:8000/archivo.pdf`) | ❌ No |
| Ver lista de archivos, buscar, subir o eliminar | ✅ Sí |

### Capas de Seguridad

- **Servidor WSGI (Waitress)** en lugar del servidor de desarrollo de Flask.
- **Autenticación HTTP Básica** para proteger la subida, listado y eliminación de archivos.
- **Prevención XSS:** Los nombres de archivos se sanitizan con `escapeHTML` antes de renderizarse.
- **Nombres seguros:** Los archivos subidos pasan por `secure_filename` de Werkzeug.
- **Duplicados automáticos:** Si ya existe un archivo con el mismo nombre, se renombra automáticamente (`archivo_1.pdf`, `archivo_2.pdf`, etc.).

### Configuración de Credenciales

Crear un archivo `.env` dentro de `backend/` con este formato:

```env
FILE_SERVER_USER="miusuario"
FILE_SERVER_PASSWORD="micontraseña"
```

> **Importante:** El `.env` está en el `.gitignore` y nunca se sube a GitHub. Si no se configura, el servidor usará credenciales por defecto (`admin` / `1234`) y mostrará un **warning** visible en la consola.

---

## 🌟 Funcionalidades

- **Subida Drag & Drop** — Arrastrá uno o varios archivos (hasta **500 MB** por defecto).
- **Sincronización en Tiempo Real** — La lista de archivos se actualiza automáticamente en segundo plano mediante polling.
- **Búsqueda en Vivo** — Filtrá archivos por nombre al instante, sin recargar la página.
- **Ordenamiento Avanzado** — Ordená por Fecha, Tamaño o Nombre con un clic.
- **Descargas Nativas** — Los archivos se descargan directamente sin abrir nuevas pestañas.
- **Banner de Red** — Muestra la IP local para que puedas conectarte fácilmente desde otro dispositivo.
- **Botón Copiar Enlace** — Copiá la URL de red al portapapeles con un solo clic.
- **Notificaciones Toast** — Feedback visual para cada acción (subida, eliminación, errores).
- **Arquitectura por Componentes** — Frontend modular con componentes Astro reutilizables y lógica centralizada en `app.js`.
- **Diseño Glassmorphism** — Interfaz oscura moderna con efectos de cristal, gradientes y animaciones.
- **Soporte CORS** — El backend permite comunicación fluida con el frontend mediante `Flask-CORS`.

---

## 🗺️ API Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/` | ✅ | Listar todos los archivos (JSON) |
| `POST` | `/` | ✅ | Subir archivos (multipart `files`) |
| `DELETE` | `/delete/<filename>` | ✅ | Eliminar un archivo |
| `GET` | `/network-info` | ❌ | Obtener la IP local del servidor |
| `GET` | `/<filename>` | ❌ | Descargar / ver un archivo |

---

## 📄 Licencia

Uso personal y educativo.
