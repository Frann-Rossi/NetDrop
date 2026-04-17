# 📂 Mini File Server (Flask)

Servidor simple para **subir y descargar archivos desde cualquier dispositivo** (PC, celular, tablet) dentro de tu red local o desde internet con un túnel como ngrok.

---

## 🚀 Requisitos

- Python 3.8 o superior instalado
- Pip instalado
- (Opcional) ngrok si querés exponer el servidor a internet

---

## 📦 Instalación

1. Abrir una terminal en la carpeta del proyecto
2. Crear un entorno virtual (recomendado):

```bash
python -m venv venv
source venv/bin/activate  # Linux / macOS
venv\Scripts\activate     # Windows
```

3. Instalar dependencias:

```bash
python -m pip install -r requirements.txt
```

---

## ▶️ Ejecutar el servidor

```bash
python upload_server.py
```

Deberías ver algo como:

```
Running on http://127.0.0.1:8000
Running on http://192.168.X.X:8000
```

---

## 🌐 Acceder desde otros dispositivos

Desde otra PC o celular en la misma red WiFi:

```
http://TU_IP:8000
```

Ejemplo:

```
http://192.168.0.22:8000
```

---

## 🔐 Login

El servidor usa autenticación básica en HTTP.

- Usuario: `dokaidevs` (por defecto)
- Contraseña: `rollimussi2026` (por defecto)

Podés personalizar estas credenciales con variables de entorno antes de ejecutar el servidor.

Linux / macOS:

```bash
export FILE_SERVER_USER=miusuario
export FILE_SERVER_PASSWORD=mipassword
```

Windows PowerShell:

```powershell
$Env:FILE_SERVER_USER = 'miusuario'
$Env:FILE_SERVER_PASSWORD = 'mipassword'
```

Windows CMD:

```cmd
set FILE_SERVER_USER=miusuario
set FILE_SERVER_PASSWORD=mipassword
```

---

## 📁 Funcionalidades

- Subir archivos desde el navegador
- Ver lista de archivos disponibles
- Descargar archivos
- Interfaz simple y usable en celular

---

## 🌍 Acceso desde internet (opcional)

Si querés exponerlo a internet, usá ngrok:

```bash
ngrok http 8000
```

Ngrok te dará una URL pública como:

```
https://xxxxx.ngrok-free.dev
```

---

## ⚠️ Seguridad

- El servidor funciona **solo mientras la terminal esté abierta**.
- Si apagás la PC, deja de funcionar.
- La autenticación básica no cifra las credenciales cuando no se usa HTTPS.
- Cualquiera con la contraseña puede subir archivos.
- Si subís un archivo con el mismo nombre, el servidor guardará la nueva versión con un sufijo numérico para no sobrescribir el original.

---

## 📂 Estructura

```
/proyecto
│── upload_server.py
│── /files   ← (se crea automáticamente)
```

---

## 🧠 Notas

- Los archivos se guardan en la carpeta `files/`
- Tamaño máximo permitido: 50MB
- No se permite eliminar archivos desde la interfaz

---

## 🔧 Posibles mejoras

- Drag & drop
- Barra de progreso
- Usuarios múltiples
- Vista previa de imágenes
- HTTPS / certificados propios

---

## ✅ Uso típico

1. Ejecutás el servidor en tu PC
2. Desde el celular entrás a la IP local
3. Subís o descargás archivos sin cables ni apps

---

## 🧾 Licencia

Uso personal / educativo.
