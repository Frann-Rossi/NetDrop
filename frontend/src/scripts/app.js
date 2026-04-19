// src/scripts/app.js
// ==========================================
// CONFIGURACIÓN Y ESTADO
// ==========================================
const API_URL = `http://${window.location.hostname}:8000`;
let filesData = [];
let currentDataString = '';

// Obtener y mostrar la IP de red para acceso desde otros dispositivos
(async () => {
  try {
    const res = await fetch(`${API_URL}/network-info`);
    const data = await res.json();
    if (data.ip && data.ip !== 'No detectada') {
      const networkUrl = `http://${data.ip}:4321`;
      const networkBanner = document.getElementById('networkBanner');
      const networkUrlEl = document.getElementById('networkUrl');
      const copyBtn = document.getElementById('copyNetworkUrl');
      if (networkBanner && networkUrlEl) {
        networkUrlEl.textContent = networkUrl;
        networkBanner.classList.remove('hidden');
        if (copyBtn) {
          copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(networkUrl).then(() => {
              copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Copiado!</span>';
              setTimeout(() => {
                copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i> <span>Copiar</span>';
              }, 2000);
            });
          });
        }
      }
    }
  } catch (e) {
    // Si falla, simplemente no mostramos el banner
  }
})();

// Utilidad de Selectores
const $ = id => document.getElementById(id);

// Prevención XSS
const escapeHTML = str => str.replace(/[&<>'"]/g, 
  tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag])
);

// DOM Elements
const dropzone = $('dropzone');
const fileInput = $('fileInput');
const uploadProgress = $('uploadProgress');
const uploadStatusText = $('uploadStatusText');
const fileListContainer = $('fileList');
const filesLoading = $('filesLoading');
const filesEmpty = $('filesEmpty');
const searchInput = $('searchInput');
const sortSelect = $('sortSelect');
const toastContainer = $('toastContainer');

// Login DOM
const loginModal = $('loginModal');
const loginModalContent = $('loginModalContent');
const loginForm = $('loginForm');
const logoutBtn = $('logoutBtn');

// Delete Modal DOM
const deleteModal = $('deleteModal');
const deleteModalContent = $('deleteModalContent');
const deleteFileName = $('deleteFileName');
const cancelDeleteBtn = $('cancelDeleteBtn');
const confirmDeleteBtn = $('confirmDeleteBtn');
let fileToDelete = null;

// ==========================================
// FUNCIONES UI GLOBALES
// ==========================================
function showElement(el, contentEl = null) {
  el.classList.remove('hidden');
  setTimeout(() => {
    el.classList.remove('opacity-0');
    if (contentEl) contentEl.classList.remove('scale-95');
  }, 10);
}

function hideElement(el, contentEl = null, callback = null) {
  el.classList.add('opacity-0');
  if (contentEl) contentEl.classList.add('scale-95');
  setTimeout(() => {
    el.classList.add('hidden');
    if (callback) callback();
  }, 300);
}

// ==========================================
// AUTENTICACIÓN Y API
// ==========================================
function getAuthHeader() {
  const creds = localStorage.getItem('compartir_creds');
  return creds ? { 'Authorization': `Basic ${creds}` } : {};
}

async function apiFetch(endpoint, options = {}) {
  const headers = { ...getAuthHeader(), ...options.headers };
  // No setear headers si está vacío para evitar overrides indeseados como en FormData
  if (Object.keys(headers).length === 0) delete options.headers;
  else options.headers = headers;

  const res = await fetch(`${API_URL}${endpoint}`, options);
  if (res.status === 401) {
    localStorage.removeItem('compartir_creds');
    showLogin();
    throw new Error('Unauthorized');
  }
  return res;
}

const showLogin = () => showElement(loginModal, loginModalContent);
const hideLogin = () => hideElement(loginModal, loginModalContent);

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const user = $('username').value;
  const pass = $('password').value;
  localStorage.setItem('compartir_creds', btoa(`${user}:${pass}`));
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
  
  requestAnimationFrame(() => toast.classList.remove('translate-x-full'));
  
  setTimeout(() => {
    toast.classList.add('translate-x-full', 'opacity-0');
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
    const res = await apiFetch('/', { cache: 'no-store' });
    const data = await res.json();
    const newDataString = JSON.stringify(data.files || []);
    
    if (newDataString !== currentDataString) {
      currentDataString = newDataString;
      filesData = data.files || [];
      renderFiles(searchInput.value);
    } else if (!silent) {
      filesLoading.classList.add('hidden');
      if (filesData.length === 0) filesEmpty.classList.remove('hidden');
      else fileListContainer.classList.remove('hidden');
    }
  } catch (err) {
    if (err.message !== 'Unauthorized') {
      console.error(err);
      showToast('No se pudo conectar con el servidor', 'error');
      filesLoading.classList.add('hidden');
    }
  }
}

// ==========================================
// RENDER ARCHIVOS
// ==========================================
function renderFiles(filterTerm = '') {
  filesLoading.classList.add('hidden');
  
  let filtered = filesData.filter(f => f.name.toLowerCase().includes(filterTerm.toLowerCase()));
  
  if (sortSelect) {
    const sortVal = sortSelect.value;
    if (sortVal === 'date-desc') filtered.sort((a, b) => b.timestamp - a.timestamp);
    if (sortVal === 'date-asc') filtered.sort((a, b) => a.timestamp - b.timestamp);
    if (sortVal === 'name-asc') filtered.sort((a, b) => a.name.localeCompare(b.name));
    if (sortVal === 'size-desc') filtered.sort((a, b) => b.size_bytes - a.size_bytes);
  }
  
  if (filtered.length === 0) {
    fileListContainer.classList.add('hidden');
    filesEmpty.querySelector('p').textContent = filesData.length === 0 ? 'No hay archivos en el servidor' : 'No se encontraron resultados';
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
    const safeName = escapeHTML(file.name);
    const safeUrl = escapeHTML(fileUrl);
    const safeSize = escapeHTML(file.size);
    const safeDate = escapeHTML(file.date);
    const safeIcon = escapeHTML(file.icon);

    fileCard.innerHTML = `
      <div class="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 group-hover:bg-cyan-900/40 transition-colors">
        <i class="fa-solid ${safeIcon} text-2xl text-cyan-400"></i>
      </div>
      <div class="flex-grow min-w-0">
        <a href="${safeUrl}" target="_blank" class="block text-slate-200 font-medium truncate hover:text-cyan-400 transition-colors" title="${safeName}">
          ${safeName}
        </a>
        <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] sm:text-xs text-slate-500 mt-1">
          <span class="whitespace-nowrap">${safeSize}</span>
          <span class="hidden sm:inline">&bull;</span>
          <span class="whitespace-nowrap">${safeDate}</span>
        </div>
      </div>
      <div class="flex gap-2 shrink-0">
        <button class="download-btn w-9 h-9 rounded-lg bg-slate-800 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 flex items-center justify-center transition-colors" title="Descargar" data-url="${safeUrl}" data-filename="${safeName}">
          <i class="fa-solid fa-download"></i>
        </button>
        <button class="copy-btn w-9 h-9 rounded-lg bg-slate-800 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-400 flex items-center justify-center transition-colors" title="Copiar enlace" data-url="${safeUrl}">
          <i class="fa-solid fa-link"></i>
        </button>
        <button class="delete-btn w-9 h-9 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors" title="Eliminar" data-filename="${safeName}">
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
      navigator.clipboard.writeText(e.currentTarget.getAttribute('data-url')).then(() => showToast('Enlace copiado al portapapeles'));
    });
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      fileToDelete = e.currentTarget.getAttribute('data-filename');
      deleteFileName.textContent = fileToDelete;
      showElement(deleteModal, deleteModalContent);
    });
  });
}

// Búsqueda y Ordenamiento
searchInput.addEventListener('input', (e) => renderFiles(e.target.value));
if (sortSelect) sortSelect.addEventListener('change', () => renderFiles(searchInput.value));

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
    const res = await apiFetch(`/delete/${encodeURIComponent(filename)}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast(data.message);
      filesData = filesData.filter(f => f.name !== filename);
      renderFiles(searchInput.value);
    } else {
      showToast(data.error || 'Error al eliminar', 'error');
    }
  } catch (err) {
    if (err.message !== 'Unauthorized') showToast('Error de conexión', 'error');
  }
}

const hideDeleteModal = () => hideElement(deleteModal, deleteModalContent, () => { fileToDelete = null; });
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
  if (e.dataTransfer.files.length > 0) handleUpload(e.dataTransfer.files);
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
  for (let i = 0; i < fileList.length; i++) formData.append('files', fileList[i]);

  showElement(uploadProgress);
  
  try {
    const res = await apiFetch('/', { method: 'POST', body: formData });
    const data = await res.json();
    
    if (res.ok && data.success) {
      showToast(data.message);
      fileInput.value = '';
      await fetchFiles();
    } else {
      showToast(data.error || 'Error al subir archivos', 'error');
    }
  } catch (err) {
    if (err.message !== 'Unauthorized') showToast('Error de conexión al subir', 'error');
  } finally {
    hideElement(uploadProgress);
  }
}
