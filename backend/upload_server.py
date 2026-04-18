from flask import Flask, request, send_from_directory, Response, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from functools import wraps
import os
import math
import datetime
from dotenv import load_dotenv

# Cargar las variables de entorno desde el archivo .env
load_dotenv()

app = Flask(__name__)
# Enable CORS for the frontend (Astro usually runs on localhost:4321, but we can allow all for now)
CORS(app)

app.secret_key = "clave-secreta-para-compartir-v2"

# ⚙️ CONFIG
UPLOAD_FOLDER = "files"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # Aumentado a 500MB

USERNAME = os.getenv("FILE_SERVER_USER","admin")
PASSWORD = os.getenv("FILE_SERVER_PASSWORD", "1234")


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
    i = int(math.floor(math.log(size_bytes, 1024)))
    p = math.pow(1024, i)
    s = round(size_bytes / p, 2)
    return f"{s} {size_name[i]}"

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
        count = 0
        for file in uploaded_files:
            if file and file.filename:
                filename = secure_filename(file.filename)
                filename = get_unique_filename(filename)
                filepath = os.path.join(UPLOAD_FOLDER, filename)
                file.save(filepath)
                count += 1
        
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
        
        files_data.append({
            'name': f,
            'size': get_readable_size(stats.st_size),
            'timestamp': timestamp,
            'date': dt.strftime('%d/%m/%Y %H:%M'),
            'icon': get_file_icon(f),
            'url': f"/{f}"
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


# 📥 DESCARGA / VER
@app.route("/<filename>", methods=["GET", "OPTIONS"])
def download_file(filename):
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"})
        
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.isfile(filepath):
        return jsonify({"error": "Archivo no encontrado"}), 404
    return send_from_directory(UPLOAD_FOLDER, filename, as_attachment=False)


# 🚀 RUN
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)