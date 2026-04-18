// src/scripts/app.js
// ==========================================
// CONFIGURACIÓN Y ESTADO
// ==========================================
const API_URL = `http://${window.location.hostname}:8000`;
let filesData = [];
let currentDataString = '';

// DOM Elements
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const uploadProgress = document.getElementById('uploadProgress');
const uploadStatusText = document.getElementById('uploadStatusText');
const fileListContainer = document.getElementById('fileList');
const filesLoading = document.getElementById('filesLoading');
const filesEmpty = document.getElementById('filesEmpty');
const searchInput = document.getElementById('searchInput');
const toastContainer = document.getElementById('toastContainer');

// Login DOM
const loginModal = document.getElementById('loginModal');
const loginModalContent = document.getElementById('loginModalContent');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');

// Delete Modal DOM
const deleteModal = document.getElementById('deleteModal');
const deleteModalContent = document.getElementById('deleteModalContent');
const deleteFileName = document.getElementById('deleteFileName');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
let fileToDelete = null;

// ==========================================
// AUTENTICACIÓN
// ==========================================
function getAuthHeader() {
  const creds = localStorage.getItem('compartir_creds');
  if (creds) {
    return { 'Authorization': `Basic ${creds}` };
  }
  return {};
}

function showLogin() {
  loginModal.classList.remove('hidden');
  // Pequeño delay para la animación
  setTimeout(() => {
    loginModal.classList.remove('opacity-0');
    loginModalContent.classList.remove('scale-95');
  }, 10);
}

function hideLogin() {
  loginModal.classList.add('opacity-0');
  loginModalContent.classList.add('scale-95');
  setTimeout(() => {
    loginModal.classList.add('hidden');
  }, 300);
}

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const user = document.getElementById('username').value;
  const pass = document.getElementById('password').value;
  const base64 = btoa(`${user}:${pass}`);
  localStorage.setItem('compartir_creds', base64);
  hideLogin();
  logoutBtn.classList.remove('hidden');
  fetchFiles(); // Re-intentar obtener archivos
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('compartir_creds');
  filesData = [];
  renderFiles();
  logoutBtn.classList.add('hidden');
  showLogin();
});

// Check login status on load
if (!localStorage.getItem('compartir_creds')) {
  showLogin();
  filesLoading.classList.add('hidden');
} else {
  logoutBtn.classList.remove('hidden');
  fetchFiles();
  // Refrescar en segundo plano cada 5 segundos
  setInterval(() => fetchFiles(true), 5000);
}

// ==========================================
// UI & TOASTS
// ==========================================
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  const isSuccess = type === 'success';
  
  toast.className = `glass-card border-l-4 px-4 py-3 rounded-xl flex items-center gap-3 transform translate-x-full transition-transform duration-300 ${
    isSuccess ? 'border-l-emerald-500' : 'border-l-rose-500'
  }`;
  
  toast.innerHTML = `
    <i class="fa-solid ${isSuccess ? 'fa-circle-check text-emerald-400' : 'fa-circle-exclamation text-rose-400'} text-lg"></i>
    <p class="text-sm font-medium">${message}</p>
  `;
  
  toastContainer.appendChild(toast);
  
  // Animate in
  requestAnimationFrame(() => {
    toast.classList.remove('translate-x-full');
  });
  
  // Auto remove
  setTimeout(() => {
    toast.classList.add('translate-x-full');
    toast.classList.add('opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ==========================================
// FETCH ARCHIVOS
// ==========================================
async function fetchFiles(silent = false) {
  if (!silent) {
    filesLoading.classList.remove('hidden');
    fileListContainer.classList.add('hidden');
    filesEmpty.classList.add('hidden');
  }

  try {
    const res = await fetch(`${API_URL}/`, {
      headers: getAuthHeader(),
      cache: 'no-store'
    });

    if (res.status === 401) {
      localStorage.removeItem('compartir_creds');
      showLogin();
      return;
    }

    if (!res.ok) throw new Error('Error al cargar archivos');

    const data = await res.json();
    const newDataString = JSON.stringify(data.files || []);
    
    if (newDataString !== currentDataString) {
      currentDataString = newDataString;
      filesData = data.files || [];
      renderFiles(searchInput.value);
    } else if (!silent) {
      // Restaurar UI si era carga manual y no hay cambios
      filesLoading.classList.add('hidden');
      if (filesData.length === 0) {
        filesEmpty.classList.remove('hidden');
      } else {
        fileListContainer.classList.remove('hidden');
      }
    }
  } catch (err) {
    console.error(err);
    showToast('No se pudo conectar con el servidor', 'error');
    filesLoading.classList.add('hidden');
  }
}

// ==========================================
// RENDER ARCHIVOS
// ==========================================
function renderFiles(filterTerm = '') {
  filesLoading.classList.add('hidden');
  
  const filtered = filesData.filter(f => f.name.toLowerCase().includes(filterTerm.toLowerCase()));
  
  if (filtered.length === 0) {
    fileListContainer.classList.add('hidden');
    if (filesData.length === 0) {
      filesEmpty.querySelector('p').textContent = 'No hay archivos en el servidor';
    } else {
      filesEmpty.querySelector('p').textContent = 'No se encontraron resultados';
    }
    filesEmpty.classList.remove('hidden');
    filesEmpty.classList.add('flex');
    return;
  }

  filesEmpty.classList.add('hidden');
  filesEmpty.classList.remove('flex');
  fileListContainer.classList.remove('hidden');
  fileListContainer.innerHTML = '';

  filtered.forEach((file, index) => {
    const fileCard = document.createElement('div');
    fileCard.className = `glass-card p-4 rounded-2xl flex items-center gap-4 hover:-translate-y-1 hover:shadow-cyan-500/10 transition-all duration-300 animate-slide-up group`;
    fileCard.style.animationDelay = `${index * 50}ms`;
    
    const fileUrl = `${API_URL}${file.url}`;

    fileCard.innerHTML = `
      <div class="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 group-hover:bg-cyan-900/40 transition-colors">
        <i class="fa-solid ${file.icon} text-2xl text-cyan-400"></i>
      </div>
      <div class="flex-grow min-w-0">
        <a href="${fileUrl}" target="_blank" class="block text-slate-200 font-medium truncate hover:text-cyan-400 transition-colors" title="${file.name}">
          ${file.name}
        </a>
        <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] sm:text-xs text-slate-500 mt-1">
          <span class="whitespace-nowrap">${file.size}</span>
          <span class="hidden sm:inline">&bull;</span>
          <span class="whitespace-nowrap">${file.date}</span>
        </div>
      </div>
      <div class="flex gap-2 shrink-0">
        <button class="download-btn w-9 h-9 rounded-lg bg-slate-800 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 flex items-center justify-center transition-colors" title="Descargar" data-url="${fileUrl}" data-filename="${file.name}">
          <i class="fa-solid fa-download"></i>
        </button>
        <button class="copy-btn w-9 h-9 rounded-lg bg-slate-800 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-400 flex items-center justify-center transition-colors" title="Copiar enlace" data-url="${fileUrl}">
          <i class="fa-solid fa-link"></i>
        </button>
        <button class="delete-btn w-9 h-9 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors" title="Eliminar" data-filename="${file.name}">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `;
    
    fileListContainer.appendChild(fileCard);
  });

  // Event Listeners for new buttons
  document.querySelectorAll('.download-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const url = e.currentTarget.getAttribute('data-url');
      const filename = e.currentTarget.getAttribute('data-filename');
      await silentDownload(url, filename);
    });
  });

  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const url = e.currentTarget.getAttribute('data-url');
      navigator.clipboard.writeText(url).then(() => {
        showToast('Enlace copiado al portapapeles');
      });
    });
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const filename = e.currentTarget.getAttribute('data-filename');
      fileToDelete = filename;
      deleteFileName.textContent = filename;
      deleteModal.classList.remove('hidden');
      setTimeout(() => {
        deleteModal.classList.remove('opacity-0');
        deleteModalContent.classList.remove('scale-95');
      }, 10);
    });
  });
}

// Búsqueda
searchInput.addEventListener('input', (e) => {
  renderFiles(e.target.value);
});

// ==========================================
// DESCARGA SILENCIOSA
// ==========================================
async function silentDownload(url, filename) {
  try {
    showToast(`Descargando ${filename}...`, 'success');
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al descargar');
    
    const blob = await res.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    window.URL.revokeObjectURL(objectUrl);
    document.body.removeChild(a);
  } catch (err) {
    showToast('Error en la descarga', 'error');
  }
}

// ==========================================
// ELIMINAR ARCHIVOS
// ==========================================
async function deleteFile(filename) {
  try {
    const res = await fetch(`${API_URL}/delete/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    
    if (res.status === 401) {
      showLogin();
      return;
    }

    const data = await res.json();
    if (data.success) {
      showToast(data.message);
      filesData = filesData.filter(f => f.name !== filename);
      renderFiles(searchInput.value);
    } else {
      showToast(data.error || 'Error al eliminar', 'error');
    }
  } catch (err) {
    showToast('Error de conexión', 'error');
  }
}

function hideDeleteModal() {
  deleteModal.classList.add('opacity-0');
  deleteModalContent.classList.add('scale-95');
  setTimeout(() => {
    deleteModal.classList.add('hidden');
    fileToDelete = null;
  }, 300);
}

cancelDeleteBtn.addEventListener('click', hideDeleteModal);

confirmDeleteBtn.addEventListener('click', async () => {
  if (fileToDelete) {
    await deleteFile(fileToDelete);
    hideDeleteModal();
  }
});

// ==========================================
// SUBIDA DE ARCHIVOS (DRAG & DROP)
// ==========================================
dropzone.addEventListener('click', () => fileInput.click());

dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('border-cyan-500', 'bg-slate-800/50');
});

['dragleave', 'drop'].forEach(evt => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove('border-cyan-500', 'bg-slate-800/50');
  });
});

dropzone.addEventListener('drop', (e) => {
  const files = e.dataTransfer.files;
  if (files.length > 0) handleUpload(files);
});

fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) handleUpload(fileInput.files);
});

async function handleUpload(fileList) {
  if (!localStorage.getItem('compartir_creds')) {
    showLogin();
    return;
  }

  const formData = new FormData();
  for (let i = 0; i < fileList.length; i++) {
    formData.append('files', fileList[i]);
  }

  // Mostrar UI de subida
  uploadProgress.classList.remove('hidden');
  // Pequeño delay para la animación
  setTimeout(() => uploadProgress.classList.remove('opacity-0'), 10);
  
  try {
    const res = await fetch(`${API_URL}/`, {
      method: 'POST',
      headers: getAuthHeader(), // NOTA: No setear Content-Type, fetch lo hace automático con FormData
      body: formData
    });

    if (res.status === 401) {
      showLogin();
      hideUploadProgress();
      return;
    }

    const data = await res.json();
    if (res.ok && data.success) {
      showToast(data.message);
      fileInput.value = ''; // Limpiar input
      await fetchFiles(); // Recargar lista
    } else {
      showToast(data.error || 'Error al subir archivos', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Error de conexión al subir', 'error');
  } finally {
    hideUploadProgress();
  }
}

function hideUploadProgress() {
  uploadProgress.classList.add('opacity-0');
  setTimeout(() => {
    uploadProgress.classList.add('hidden');
  }, 300);
}
