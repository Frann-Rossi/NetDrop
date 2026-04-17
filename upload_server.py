from flask import Flask, request, render_template_string, send_from_directory, Response, redirect, url_for, flash, jsonify
from werkzeug.utils import secure_filename
from functools import wraps
import os
import math

app = Flask(__name__)
app.secret_key = "clave-secreta-para-compartir-v2"

# ⚙️ CONFIG
UPLOAD_FOLDER = "files"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # Aumentado a 500MB

USERNAME = os.getenv("FILE_SERVER_USER", "dokaidevs")
PASSWORD = os.getenv("FILE_SERVER_PASSWORD", "rollimussi2026")


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

# 🔐 AUTH
def check_auth(username, password):
    return username == USERNAME and password == PASSWORD

def authenticate():
    return Response(
        "Acceso requerido",
        401,
        {"WWW-Authenticate": 'Basic realm="Login Required"'}
    )

def requires_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.authorization
        if not auth or not check_auth(auth.username, auth.password):
            return authenticate()
        return f(*args, **kwargs)
    return decorated


# 🎨 HTML
HTML = """
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Compartír - Dashboard</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --primary: #4361ee;
            --secondary: #4cc9f0;
            --bg: #0f172a;
            --card-bg: rgba(30, 41, 59, 0.7);
            --text: #f8fafc;
            --text-muted: #94a3b8;
            --danger: #ef4444;
            --success: #10b981;
        }

        body {
            font-family: 'Inter', -apple-system, sans-serif;
            background-color: var(--bg);
            background-image: 
                radial-gradient(at 0% 0%, rgba(67, 97, 238, 0.15) 0px, transparent 50%),
                radial-gradient(at 100% 100%, rgba(76, 201, 240, 0.1) 0px, transparent 50%);
            color: var(--text);
            margin: 0;
            padding: 10px;
            min-height: 100vh;
        }

        .container {
            max-width: 800px;
            margin: 40px auto;
        }

        /* HEADER */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding: 0 10px;
        }
        .header h1 {
            font-size: 2rem;
            margin: 0;
            background: linear-gradient(to right, #4cc9f0, #4361ee);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-weight: 800;
        }

        /* DASHBOARD CARDS */
        .box {
            background: var(--card-bg);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 25px;
            margin-bottom: 25px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
        }

        h2 {
            font-size: 1.1rem;
            margin-top: 0;
            margin-bottom: 20px;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 1px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        /* DROPZONE */
        .dropzone {
            border: 2px dashed rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            padding: 40px 20px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            background: rgba(0, 0, 0, 0.1);
        }
        .dropzone:hover, .dropzone.dragover {
            border-color: var(--secondary);
            background: rgba(76, 201, 240, 0.05);
            transform: translateY(-2px);
        }
        .dropzone i {
            font-size: 3rem;
            color: var(--secondary);
            margin-bottom: 15px;
        }
        .dropzone p {
            margin: 5px 0;
        }

        /* FLASH MESSAGES */
        .flash {
            padding: 15px;
            border-radius: 12px;
            margin-bottom: 20px;
            font-size: 0.95rem;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideDown 0.4s ease-out;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .flash-success { background: rgba(16, 185, 129, 0.2); color: #d1fae5; border-left: 4px solid var(--success); }
        .flash-error { background: rgba(239, 68, 68, 0.2); color: #fee2e2; border-left: 4px solid var(--danger); }

        @keyframes slideDown {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* FILE LIST */
        .file-list {
            display: grid;
            gap: 12px;
        }
        .file-item {
            display: flex;
            align-items: center;
            padding: 15px;
            background: rgba(255, 255, 255, 0.03);
            border-radius: 12px;
            transition: all 0.2s;
            border: 1px solid transparent;
        }
        .file-item:hover {
            background: rgba(255, 255, 255, 0.06);
            border-color: rgba(255, 255, 255, 0.1);
            transform: translateX(4px);
        }
        .file-icon {
            font-size: 1.5rem;
            margin-right: 15px;
            color: var(--secondary);
            width: 30px;
            text-align: center;
        }
        .file-info {
            flex-grow: 1;
            min-width: 0;
        }
        .file-name {
            display: block;
            color: var(--text);
            text-decoration: none;
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-size: 0.95rem;
        }
        .file-meta {
            font-size: 0.75rem;
            color: var(--text-muted);
            margin-top: 2px;
        }

        .actions {
            display: flex;
            gap: 8px;
            margin-left: 10px;
        }
        .btn-icon {
            background: rgba(255, 255, 255, 0.05);
            border: none;
            color: var(--text-muted);
            width: 36px;
            height: 36px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-icon:hover { color: var(--text); background: rgba(255, 255, 255, 0.1); }
        .btn-icon.delete:hover { color: var(--danger); background: rgba(239, 68, 68, 0.15); }
        .btn-icon.copy:hover { color: var(--secondary); background: rgba(76, 201, 240, 0.15); }

        .search-box {
            margin-bottom: 20px;
            position: relative;
        }
        .search-box input {
            width: 100%;
            background: rgba(0,0,0,0.2);
            border: 1px solid rgba(255,255,255,0.1);
            padding: 12px 15px 12px 40px;
            border-radius: 10px;
            color: white;
            box-sizing: border-box;
            outline: none;
        }
        .search-box i {
            position: absolute;
            left: 15px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-muted);
        }

        @media (max-width: 480px) {
            .header h1 { font-size: 1.5rem; }
            .container { margin: 20px auto; }
            .box { padding: 15px; }
        }
    </style>
</head>
<body>

<div class="container">
    <div class="header">
        <h1>Compartír.</h1>
    </div>

    {% with messages = get_flashed_messages() %}
      {% if messages %}
        {% for message in messages %}
          <div class="flash flash-success">
            <i class="fa-solid fa-circle-check"></i>
            {{ message }}
          </div>
        {% endfor %}
      {% endif %}
    {% endwith %}

    <div class="box">
        <h2><i class="fa-solid fa-cloud-arrow-up"></i> Subir archivos</h2>
        <form id="uploadForm" method="post" enctype="multipart/form-data">
            <input type="file" name="files" id="fileInput" multiple style="display: none;">
            <div class="dropzone" id="dropzone">
                <i class="fa-solid fa-folder-plus"></i>
                <p><strong>Haz clic para elegir</strong> o arrastra archivos aquí</p>
                <p style="font-size: 0.8rem; color: var(--text-muted);">Soporta múltiples archivos (Máx 500MB)</p>
            </div>
        </form>
    </div>

    <div class="box">
        <h2><i class="fa-solid fa-hard-drive"></i> Mis archivos</h2>
        
        <div class="search-box">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" id="searchInput" placeholder="Buscar por nombre...">
        </div>

        <div class="file-list" id="fileList">
            {% if files_data %}
                {% for file in files_data %}
                    <div class="file-item" data-name="{{ file.name | lower }}">
                        <div class="file-icon">
                            <i class="fa-solid {{ file.icon }}"></i>
                        </div>
                        <div class="file-info">
                            <a href="/{{ file.name }}" class="file-name">{{ file.name }}</a>
                            <div class="file-meta">{{ file.size }} • {{ file.date }}</div>
                        </div>
                        <div class="actions">
                            <button class="btn-icon copy" onclick="copyLink('{{ file.url }}')" title="Copiar enlace">
                                <i class="fa-solid fa-link"></i>
                            </button>
                            <form action="/delete/{{ file.name }}" method="POST" style="margin:0;" onsubmit="return confirm('¿Borrar {{ file.name }}?')">
                                <button type="submit" class="btn-icon delete" title="Eliminar">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            </form>
                        </div>
                    </div>
                {% endfor %}
            {% else %}
                <div style="text-align: center; color: var(--text-muted); padding: 40px 0;">
                    <i class="fa-solid fa-ghost" style="font-size: 3rem; margin-bottom: 15px; display: block; opacity: 0.3;"></i>
                    No hay archivos en el servidor
                </div>
            {% endif %}
        </div>
    </div>
</div>

<script>
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const uploadForm = document.getElementById('uploadForm');
    const searchInput = document.getElementById('searchInput');

    // Drag & Drop
    dropzone.addEventListener('click', () => fileInput.click());
    
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    ['dragleave', 'drop'].forEach(event => {
        dropzone.addEventListener(event, () => dropzone.classList.remove('dragover'));
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        fileInput.files = e.dataTransfer.files;
        if (fileInput.files.length > 0) uploadForm.submit();
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) uploadForm.submit();
    });

    // Búsqueda
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.file-item').forEach(item => {
            const name = item.getAttribute('data-name');
            item.style.display = name.includes(term) ? 'flex' : 'none';
        });
    });

    // Copiar Link
    function copyLink(url) {
        // Obtenemos la URL absoluta
        const fullUrl = window.location.origin + url;
        navigator.clipboard.writeText(fullUrl).then(() => {
            alert('Enlace copiado al portapapeles');
        });
    }
</script>

</body>
</html>
"""

def get_file_icon(filename):
    ext = os.path.splitext(filename)[1].lower()
    if ext in ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp']: return 'fa-file-image'
    if ext in ['.mp4', '.mkv', '.mov']: return 'fa-file-video'
    if ext in ['.mp3', '.wav', '.ogg']: return 'fa-file-audio'
    if ext in ['.pdf']: return 'fa-file-pdf'
    if ext in ['.zip', '.rar', '.7z', '.tar', '.gz']: return 'fa-file-zipper'
    if ext in ['.py', '.js', '.html', '.css', '.json', '.txt']: return 'fa-file-code'
    return 'fa-file'

# 📂 HOME
@app.route("/", methods=["GET", "POST"])
@requires_auth
def index():
    if request.method == "POST":
        uploaded_files = request.files.getlist("files")
        count = 0
        for file in uploaded_files:
            if file and file.filename:
                filename = secure_filename(file.filename)
                filename = get_unique_filename(filename)
                filepath = os.path.join(UPLOAD_FOLDER, filename)
                file.save(filepath)
                count += 1
        
        if count > 0:
            flash(f"✅ Se subieron {count} archivos correctamente.")
        return redirect(url_for('index'))

    # Listar archivos
    files = [f for f in os.listdir(UPLOAD_FOLDER) if os.path.isfile(os.path.join(UPLOAD_FOLDER, f))]
    files.sort(key=lambda x: os.path.getmtime(os.path.join(UPLOAD_FOLDER, x)), reverse=True)

    files_data = []
    for f in files:
        path = os.path.join(UPLOAD_FOLDER, f)
        stats = os.stat(path)
        files_data.append({
            'name': f,
            'size': get_readable_size(stats.st_size),
            'date': os.path.getmtime(path), # se puede formatear luego
            'icon': get_file_icon(f),
            'url': f"/{f}"
        })
    
    # Formatear fecha opcionalmente
    import datetime
    for f in files_data:
        dt = datetime.datetime.fromtimestamp(f['date'])
        f['date'] = dt.strftime('%d/%m/%Y %H:%M')

    return render_template_string(HTML, files_data=files_data)


# 🗑️ ELIMINAR
@app.route("/delete/<filename>", methods=["POST"])
@requires_auth
def delete_file(filename):
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    if os.path.isfile(filepath):
        os.remove(filepath)
        flash(f"🗑️ Archivo '{filename}' eliminado.")
    else:
        flash(f"❌ No se encontró el archivo.")
    return redirect(url_for('index'))


# 📥 DESCARGA
@app.route("/<filename>")
@requires_auth
def download_file(filename):
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.isfile(filepath):
        return "Archivo no encontrado", 404
    return send_from_directory(UPLOAD_FOLDER, filename, as_attachment=True)


# 🚀 RUN
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
