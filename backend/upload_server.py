from flask import Flask, request, send_from_directory, Response, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from functools import wraps
import os
import math
import socket
import datetime
import shutil
import zipfile
import io
import json
import threading
import time
from dotenv import load_dotenv

# Cargar las variables de entorno desde el archivo .env
load_dotenv()

app = Flask(__name__)
# Enable CORS for the frontend (Astro usually runs on localhost:4321, but we can allow all for now)
CORS(app)

app.secret_key = "clave-secreta-para-compartir-v2"

# ⚙️ CONFIG
UPLOAD_FOLDER = "files"
METADATA_FILE = "metadata.json"
CLIPBOARD_FILE = "clipboard_history.json"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # Aumentado a 500MB

# 📦 DATOS PERSISTENTES
def load_json(path, default):
    if os.path.exists(path):
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except: return default
    return default

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4)

metadata = load_json(METADATA_FILE, {})
clipboard_history = load_json(CLIPBOARD_FILE, [])

USERNAME = os.getenv("FILE_SERVER_USER","admin")
PASSWORD = os.getenv("FILE_SERVER_PASSWORD", "1234")

if USERNAME == "admin" and PASSWORD == "1234":
    print("\n" + "="*50)
    print("⚠️  WARNING: Usando credenciales por defecto (admin:1234).")
    print("⚠️  Es muy recomendable configurar FILE_SERVER_USER y FILE_SERVER_PASSWORD en el archivo .env")
    print("="*50 + "\n")


# 🧹 CLEANUP TASK
def cleanup_files():
    while True:
        now = time.time()
        to_delete = []
        for filename, data in list(metadata.items()):
            if data.get('expires_at') and now > data['expires_at']:
                to_delete.append(filename)
        
        for filename in to_delete:
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            if os.path.exists(filepath):
                os.remove(filepath)
                print(f"🧹 Auto-borrado (tiempo): {filename}")
            del metadata[filename]
        
        if to_delete:
            save_json(METADATA_FILE, metadata)
            
        time.sleep(60) # Revisar cada minuto

# Iniciar hilo de limpieza
threading.Thread(target=cleanup_files, daemon=True).start()

def get_unique_filename(filename):
    base, ext = os.path.splitext(filename)
    candidate = filename
    counter = 1
    while os.path.exists(os.path.join(UPLOAD_FOLDER, candidate)):
        candidate = f"{base}_{counter}{ext}"
        counter += 1
    return candidate

def get_readable_size(size_bytes):
    if size_bytes == 0: return "0B"
    size_name = ("B", "KB", "MB", "GB")
    size_bytes = float(size_bytes)
    i = int(math.floor(math.log(size_bytes, 1024)))
    p = math.pow(1024, i)
    s = round(size_bytes / p, 2)
    return f"{s} {size_name[i]}"

# 🗑️ Función de borrado diferido (en español)
def delayed_delete(fname):
    """Espera un tiempo y borra el archivo físicamente."""
    time.sleep(10) # 10 segundos es suficiente para iniciar el stream
    fpath = os.path.join(UPLOAD_FOLDER, fname)
    if os.path.exists(fpath):
        os.remove(fpath)
        if fname in metadata:
            del metadata[fname]
        save_json(METADATA_FILE, metadata)
        print(f"🧹 Archivo eliminado físicamente: {fname}")

def get_file_icon(filename):
    ext = os.path.splitext(filename)[1].lower()
    if ext in ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp']: return 'fa-file-image'
    if ext in ['.mp4', '.mkv', '.mov']: return 'fa-file-video'
    if ext in ['.mp3', '.wav', '.ogg']: return 'fa-file-audio'
    if ext in ['.pdf']: return 'fa-file-pdf'
    if ext in ['.zip', '.rar', '.7z', '.tar', '.gz']: return 'fa-file-zipper'
    if ext in ['.py', '.js', '.html', '.css', '.json', '.txt']: return 'fa-file-code'
    return 'fa-file'

# 🔐 AUTH
def check_auth(username, password):
    return username == USERNAME and password == PASSWORD

def authenticate():
    return jsonify({"error": "Acceso requerido"}), 401, {"WWW-Authenticate": 'Basic realm="Login Required"'}

def requires_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # Allow preflight OPTIONS requests to bypass auth
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
        auth = request.authorization
        if not auth or not check_auth(auth.username, auth.password):
            return authenticate()
        return f(*args, **kwargs)
    return decorated


# 📂 HOME (API)
@app.route("/", methods=["GET", "POST", "OPTIONS"])
@requires_auth
def index():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"})
        
    if request.method == "POST":
        if 'files' not in request.files:
            return jsonify({"error": "No file part"}), 400
            
        uploaded_files = request.files.getlist("files")
        # Metadata options for all files in this upload
        one_time = request.form.get('one_time') == 'true'
        expire_minutes = request.form.get('expire_minutes')
        
        count = 0
        for file in uploaded_files:
            if file and file.filename:
                filename = secure_filename(file.filename)
                filename = get_unique_filename(filename)
                filepath = os.path.join(UPLOAD_FOLDER, filename)
                file.save(filepath)
                
                # Guardar metadatos si es necesario
                file_metadata = {}
                if one_time: file_metadata['one_time'] = True
                if expire_minutes and expire_minutes.isdigit():
                    file_metadata['expires_at'] = time.time() + (int(expire_minutes) * 60)
                
                if file_metadata:
                    metadata[filename] = file_metadata
                
                count += 1
        
        if count > 0: save_json(METADATA_FILE, metadata)
        
        return jsonify({"success": True, "message": f"✅ Se subieron {count} archivos correctamente.", "count": count})

    # Listar archivos (GET)
    files = [f for f in os.listdir(UPLOAD_FOLDER) if os.path.isfile(os.path.join(UPLOAD_FOLDER, f))]
    files.sort(key=lambda x: os.path.getmtime(os.path.join(UPLOAD_FOLDER, x)), reverse=True)

    files_data = []
    for f in files:
        path = os.path.join(UPLOAD_FOLDER, f)
        stats = os.stat(path)
        timestamp = os.path.getmtime(path)
        dt = datetime.datetime.fromtimestamp(timestamp)
        
        # Check if file has special metadata
        file_meta = metadata.get(f, {})
        
        # Skip files that are already "used" (single download already triggered)
        if file_meta.get('used'):
            continue
            
        files_data.append({
            'name': f,
            'size': get_readable_size(stats.st_size),
            'size_bytes': stats.st_size,
            'timestamp': timestamp,
            'date': dt.strftime('%d/%m/%Y %H:%M'),
            'icon': get_file_icon(f),
            'url': f"/{f}",
            'ephemeral': bool(file_meta),
            'one_time': file_meta.get('one_time', False),
            'expires_at': file_meta.get('expires_at')
        })

    return jsonify({"files": files_data})


# 🗑️ ELIMINAR (API)
@app.route("/delete/<filename>", methods=["DELETE", "POST", "OPTIONS"])
@requires_auth
def delete_file(filename):
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"})
        
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    if os.path.isfile(filepath):
        os.remove(filepath)
        return jsonify({"success": True, "message": f"🗑️ Archivo '{filename}' eliminado."})
    else:
        return jsonify({"success": False, "error": "❌ No se encontró el archivo."}), 404


# 📋 PORTAPAPELES (API)
@app.route("/clipboard", methods=["GET", "POST", "OPTIONS"])
@requires_auth
def clipboard():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"})
    
    global clipboard_history
    if request.method == "POST":
        text = request.json.get("text", "").strip()
        if text:
            # Añadir al inicio y limitar a 5
            clipboard_history.insert(0, {
                "text": text,
                "timestamp": time.time(),
                "date": datetime.datetime.now().strftime('%H:%M')
            })
            clipboard_history = clipboard_history[:5]
            save_json(CLIPBOARD_FILE, clipboard_history)
            return jsonify({"success": True, "history": clipboard_history})
        return jsonify({"error": "Texto vacío"}), 400
    
    return jsonify({"history": clipboard_history})


@app.route("/clipboard/delete/<int:index>", methods=["DELETE", "OPTIONS"])
@requires_auth
def delete_clipboard_item(index):
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"})
    
    global clipboard_history
    if 0 <= index < len(clipboard_history):
        item = clipboard_history.pop(index)
        save_json(CLIPBOARD_FILE, clipboard_history)
        return jsonify({"success": True, "message": "Mensaje eliminado", "history": clipboard_history})
    
    return jsonify({"error": "Ítem no encontrado"}), 404


# 📊 ALMACENAMIENTO (API)
@app.route("/storage", methods=["GET", "OPTIONS"])
@requires_auth
def storage_info():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"})
    
    total, used, free = shutil.disk_usage("/")
    return jsonify({
        "total": get_readable_size(total),
        "used": get_readable_size(used),
        "free": get_readable_size(free),
        "percent": round((used / total) * 100, 1)
    })


# 📦 ACCIONES POR LOTE (API)
@app.route("/batch-delete", methods=["POST", "OPTIONS"])
@requires_auth
def batch_delete():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"})
    
    filenames = request.json.get("filenames", [])
    count = 0
    for name in filenames:
        filepath = os.path.join(UPLOAD_FOLDER, secure_filename(name))
        if os.path.isfile(filepath):
            os.remove(filepath)
            if name in metadata:
                del metadata[name]
            count += 1
    
    if count > 0:
        save_json(METADATA_FILE, metadata)
        
    return jsonify({"success": True, "message": f"🗑️ Se eliminaron {count} archivos."})


@app.route("/download-zip", methods=["POST", "OPTIONS"])
@requires_auth
def download_zip():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"})
    
    filenames = request.json.get("filenames", [])
    memory_file = io.BytesIO()
    
    with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
        for name in filenames:
            filepath = os.path.join(UPLOAD_FOLDER, secure_filename(name))
            if os.path.isfile(filepath):
                # Revisar si es de un solo uso
                meta = metadata.get(name, {})
                if meta.get('used'):
                    continue
                
                zf.write(filepath, name)
                
                # Si es descarga única, marcar para borrar
                if meta.get('one_time'):
                    meta['used'] = True
                    threading.Thread(target=delayed_delete, args=(name,)).start()
    
    # Guardar cambios en metadatos si hubo archivos de un solo uso
    save_json(METADATA_FILE, metadata)
    
    memory_file.seek(0)
    return Response(
        memory_file.getvalue(),
        mimetype='application/zip',
        headers={"Content-Disposition": "attachment;filename=netdrop_batch.zip"}
    )


# 🌐 INFO DE RED
@app.route("/network-info", methods=["GET", "OPTIONS"])
def network_info():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"})
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        local_ip = "No detectada"
    return jsonify({"ip": local_ip})


# 📥 DESCARGA / VER
@app.route("/<filename>", methods=["GET", "OPTIONS"])
def download_file(filename):
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"})
        
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.isfile(filepath):
        return jsonify({"error": "Archivo no encontrado"}), 404
    
    # Manejar auto-destrucción por descarga única
    if filename in metadata:
        meta = metadata[filename]
        
        # Si ya fue usado (está en el limbo de los 10 segundos), bloquear
        if meta.get('used'):
            return jsonify({"error": "Este archivo efímero ya fue descargado y no está disponible."}), 410

        if meta.get('one_time'):
            # Solo marcar como usado si se confirma la descarga (evita que previsualizaciones lo borren)
            confirm = request.args.get('confirm_use') == 'true'
            
            if confirm:
                meta['used'] = True
                save_json(METADATA_FILE, metadata)
                threading.Thread(target=delayed_delete, args=(filename,)).start()
            
            return send_from_directory(UPLOAD_FOLDER, filename, as_attachment=False)

    return send_from_directory(UPLOAD_FOLDER, filename, as_attachment=False)


# 🚀 RUN
if __name__ == "__main__":
    print(f"🚀 Servidor corriendo en http://0.0.0.0:8000")
    try:
        from waitress import serve
        serve(app, host="0.0.0.0", port=8000)
    except ImportError:
        print("⚠️ Waitress no está instalado. Instalalo usando 'pip install waitress' para producción.")
        app.run(host="0.0.0.0", port=8000)