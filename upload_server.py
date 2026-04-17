from flask import Flask, request, render_template_string, send_from_directory, Response
from werkzeug.utils import secure_filename
from functools import wraps
import os

app = Flask(__name__)

# ⚙️ CONFIG
UPLOAD_FOLDER = "files"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB

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
<html>
<head>
    <title>Compartir archivos</title>
    <style>
        body {
            font-family: 'Segoe UI', Arial;
            background: linear-gradient(135deg, #0f2027, #203a43, #2c5364);
            color: white;
            text-align: center;
        }
        .container {
            max-width: 400px;
            margin: 40px auto;
        }
        .box {
            background: rgba(0,0,0,0.6);
            border-radius: 15px;
            padding: 25px;
            margin-bottom: 20px;
        }
        button {
            background: #4CAF50;
            border: none;
            padding: 8px 12px;
            border-radius: 6px;
            color: white;
            cursor: pointer;
        }
        a {
            color: #00ffcc;
            text-decoration: none;
        }
        .file-item {
            margin: 8px 0;
            padding: 8px;
            background: rgba(255,255,255,0.05);
            border-radius: 6px;
        }
    </style>
</head>
<body>

<div class="container">

    <div class="box">
        <h2>📂 Subir archivo</h2>
        {% if message %}
            <p style="color:#b3ffb3;">{{ message }}</p>
        {% endif %}
        <form method="post" enctype="multipart/form-data">
            <input type="file" name="file" required>
            <br><br>
            <button type="submit">Subir</button>
        </form>
    </div>

    <div class="box">
        <h2>📁 Archivos</h2>
        {% for file in files %}
            <div class="file-item">
                <a href="/{{file}}">{{file}}</a>
            </div>
        {% endfor %}
    </div>

</div>

</body>
</html>
"""

# 📂 HOME
@app.route("/", methods=["GET", "POST"])
@requires_auth
def index():
    message = None

    if request.method == "POST":
        file = request.files.get("file")

        if file and file.filename:
            filename = secure_filename(file.filename)
            filename = get_unique_filename(filename)
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            file.save(filepath)
            message = f"Archivo '{filename}' subido correctamente."

    files = [f for f in os.listdir(UPLOAD_FOLDER) if os.path.isfile(os.path.join(UPLOAD_FOLDER, f))]
    return render_template_string(HTML, files=files, message=message)


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