// src/scripts/app.js (v13.0 - Fix Total Sync e Info de Red)
// ==========================================
// CONFIGURACIÓN Y ESTADO INICIAL
// ==========================================
const API_URL = `http://${window.location.hostname}:8000`;
let filesData = [];
let selectedFiles = new Set();
let currentDataString = '';

const $ = id => document.getElementById(id);

// Elementos del DOM
const dropzone = $('dropzone');
const fileInput = $('fileInput');
const uploadProgress = $('uploadProgress');
const fileListContainer = $('fileList');
const filesLoading = $('filesLoading');
const filesEmpty = $('filesEmpty');
const searchInput = $('searchInput');
const sortSelect = $('sortSelect');
const toastContainer = $('toastContainer');

// Elementos de archivos Efímeros
const oneTimeCheck = $('oneTimeCheck');
const expireSelect = $('expireSelect');
const customExpireContainer = $('customExpireContainer');
const customExpireInput = $('customExpireInput');

// Elementos del Portapapeles
const clipboardInput = $('clipboardInput');
const sendClipboard = $('sendClipboard');
const clipboardHistory = $('clipboardHistory');

// Interfaz de acciones por Lote
const batchBar = $('batchBar');
const batchCount = $('batchCount');
const batchDownload = $('batchDownload');
const batchDelete = $('batchDelete');
const batchClear = $('batchClear');
const batchLoading = $('batchLoading');

// Modales del sistema
const batchDeleteModal = $('batchDeleteModal');
const batchDeleteModalContent = $('batchDeleteModalContent');
const batchCountText = $('batchCountText');
const confirmBatchDeleteBtn = $('confirmBatchDeleteBtn');
const cancelBatchDeleteBtn = $('cancelBatchDeleteBtn');

const deleteModal = $('deleteModal');
const deleteModalContent = $('deleteModalContent');
const deleteFileName = $('deleteFileName');
const cancelDeleteBtn = $('cancelDeleteBtn');
const confirmDeleteBtn = $('confirmDeleteBtn');
let fileToDelete = null;

const previewModal = $('previewModal');
const previewModalContent = $('previewModalContent');
const previewTitle = $('previewTitle');
const previewBody = $('previewBody');
const previewMeta = $('previewMeta');
const previewFull = $('previewFull');
const previewDownload = $('previewDownload');
const closePreview = $('closePreview');

const loginModal = $('loginModal');
const loginModalContent = $('loginModalContent');
const loginForm = $('loginForm');
const logoutBtn = $('logoutBtn');

// ==========================================
// AYUDAS DE INTERFAZ (UI HELPERS)
// ==========================================
function showElement(el, contentEl = null) {
  if (!el) return;
  el.classList.remove('hidden', 'pointer-events-none');
  setTimeout(() => {
    el.classList.remove('opacity-0', 'translate-y-32');
    if (contentEl) contentEl.classList.remove('scale-95');
  }, 10);
}

function hideElement(el, contentEl = null, callback = null) {
  if (!el) return;
  el.classList.add('opacity-0');
  if (el === batchBar) el.classList.add('translate-y-32');
  if (contentEl) contentEl.classList.add('scale-95');
  setTimeout(() => {
    el.classList.add('hidden', 'pointer-events-none');
    if (callback) callback();
  }, 300);
}

const escapeHTML = str => str.replace(/[&<>'"]/g, 
  tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag])
);

// ==========================================
// API Y AUTENTICACIÓN
// ==========================================
function getAuthHeader() {
  const creds = localStorage.getItem('compartir_creds');
  return creds ? { 'Authorization': `Basic ${creds}` } : {};
}

async function apiFetch(endpoint, options = {}) {
  const headers = { ...getAuthHeader(), ...options.headers };
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem('compartir_creds');
    showLogin();
    throw new Error('Unauthorized');
  }
  return res;
}

const showLogin = () => showElement(loginModal, loginModalContent);
const hideLogin = () => hideElement(loginModal, loginModalContent);

if (loginForm) {
  loginForm.onsubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('compartir_creds', btoa(`${$('username').value}:${$('password').value}`));
    hideLogin();
    if (logoutBtn) logoutBtn.classList.remove('hidden');
    refreshAll();
  };
}

if (logoutBtn) {
  logoutBtn.onclick = () => {
    localStorage.removeItem('compartir_creds');
    filesData = []; renderFiles();
    logoutBtn.classList.add('hidden');
    showLogin();
  };
}

// ==========================================
// NOTIFICACIONES (TOASTS)
// ==========================================
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  const isSuccess = type === 'success';
  toast.className = `solid-card bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 px-5 py-3 rounded-2xl flex items-center gap-3 transform translate-x-full border-l-4 transition-all duration-300 z-[200] ${
    isSuccess ? 'border-l-cyan-500' : 'border-l-rose-500'
  }`;
  toast.innerHTML = `<p class="text-xs font-bold text-slate-900 dark:text-white">${message}</p>`;
  toastContainer.appendChild(toast);
  requestAnimationFrame(() => toast.classList.remove('translate-x-full'));
  setTimeout(() => {
    toast.classList.add('translate-x-full', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==========================================
// LISTADO DE ARCHIVOS (ESTABLE)
// ==========================================
async function refreshAll(silent = false) {
  if (!localStorage.getItem('compartir_creds')) return;
  fetchFiles(silent); fetchStorage(); fetchClipboard();
}

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
    if (err.message !== 'Unauthorized') filesLoading.classList.add('hidden');
  }
}

async function fetchStorage() {
  try {
    const res = await apiFetch('/storage');
    const data = await res.json();
    if ($('storagePercent')) {
      $('storagePercent').textContent = `${data.percent}%`;
      const progress = $('storageProgress');
      if (progress) progress.style.width = `${data.percent}%`;
    }
  } catch (e) {}
}

async function fetchClipboard() {
  try {
    const res = await apiFetch('/clipboard');
    const data = await res.json(); renderClipboard(data.history || []);
  } catch (e) {}
}

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
    filesEmpty.classList.remove('hidden'); return;
  }

  filesEmpty.classList.add('hidden');
  fileListContainer.classList.remove('hidden');
  fileListContainer.innerHTML = '';

  filtered.forEach((file, index) => {
    const fileCard = document.createElement('div');
    const isSelected = selectedFiles.has(file.name);
    fileCard.dataset.filename = file.name;
    
    fileCard.className = `solid-card bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-3 md:p-5 flex flex-row items-center gap-3 md:gap-6 group transition-all duration-300 animate-slide-up w-full ${isSelected ? 'ring-2 ring-app-accent bg-blue-500/5 dark:bg-app-accent/5 shadow-app-accent/10' : 'hover:border-slate-400 dark:hover:border-slate-600'}`;
    fileCard.style.animationDelay = `${index * 15}ms`;
    
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(file.name.split('.').pop().toLowerCase());
    const fileUrl = `${API_URL}${file.url}`;
    
    const mediaHtml = isImage 
      ? `<a href="${fileUrl}" target="_blank" class="block w-full h-full" title="Ver original">
           <img src="${fileUrl}" alt="${escapeHTML(file.name)}" loading="lazy" class="w-full h-full object-cover rounded-xl" />
         </a>`
      : `<i class="fa-solid ${file.icon} text-slate-400 dark:text-app-accent scale-75 md:scale-100 opacity-40 group-hover:opacity-100 transition-opacity"></i>`;

    let ephemeralBadge = '';
    let statusInfo = '';
    if (file.one_time) {
      ephemeralBadge = '<div class="absolute inset-x-0 bottom-0 bg-amber-500 text-[6px] md:text-[8px] font-bold py-0.5 md:py-1 text-center uppercase tracking-tighter text-white z-10">Único</div>';
      statusInfo = '<span class="text-[8px] md:text-[10px] font-bold text-amber-500 uppercase tracking-wider bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 whitespace-nowrap">Descarga Única</span>';
    } else if (file.expires_at) {
      const timeLeft = Math.round((file.expires_at - (Date.now() / 1000)) / 60);
      ephemeralBadge = '<div class="absolute inset-x-0 bottom-0 bg-rose-600 text-[6px] md:text-[8px] font-bold py-0.5 md:py-1 text-center uppercase tracking-tighter text-white z-10">Temporal</div>';
      statusInfo = `<span class="text-[8px] md:text-[10px] font-bold text-rose-500 uppercase tracking-wider bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 whitespace-nowrap">Expira: ${timeLeft > 0 ? timeLeft + ' min' : 'ya'}</span>`;
    }

    fileCard.innerHTML = `
      <div class="flex items-center gap-2 md:gap-5 shrink-0">
        <label class="cursor-pointer">
          <input type="checkbox" class="file-checkbox sr-only" ${isSelected ? 'checked' : ''} />
          <div class="w-5 h-5 md:w-8 md:h-8 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center transition-all ${isSelected ? 'bg-app-accent border-app-accent shadow-lg shadow-app-accent/20' : 'bg-slate-100 dark:bg-white/5 opacity-0 group-hover:opacity-100'}">
            <i class="fa-solid fa-check text-[8px] md:text-[10px] text-white"></i>
          </div>
        </label>
        <div class="file-item-media bg-slate-100 dark:bg-black/40 border-slate-200 dark:border-white/5 shadow-xl">
          ${mediaHtml}
          ${ephemeralBadge}
        </div>
      </div>

      <div class="min-w-0 flex-grow">
        <button class="preview-trigger block w-full text-left font-bold text-xs md:text-base lg:text-lg truncate text-slate-900 dark:text-white hover:text-app-accent transition-colors tracking-tight" title="${escapeHTML(file.name)}">
          ${escapeHTML(file.name)}
        </button>
        <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1">
          <span class="text-[8px] md:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800 w-fit whitespace-nowrap">${file.size}</span>
          <span class="text-[8px] md:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800 w-fit hidden sm:block whitespace-nowrap">${file.date}</span>
          ${statusInfo}
        </div>
      </div>

      <div class="flex items-center gap-1 md:gap-2 ml-auto shrink-0">
        <button class="download-btn w-8 h-8 md:w-11 md:h-11 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-500 text-slate-400 dark:text-slate-500 flex items-center justify-center transition-all active:scale-90 shadow-sm" title="Bajar">
          <i class="fa-solid fa-download text-xs md:text-base"></i>
        </button>
        <button class="share-btn w-8 h-8 md:w-11 md:h-11 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-cyan-500/10 hover:text-cyan-500 text-slate-400 dark:text-slate-500 flex items-center justify-center transition-all active:scale-90 shadow-sm" title="Link">
          <i class="fa-solid fa-share-nodes text-xs md:text-base"></i>
        </button>
        <button class="delete-btn w-8 h-8 md:w-11 md:h-11 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-rose-500/10 hover:text-rose-500 text-slate-400 dark:text-slate-500 flex items-center justify-center transition-all active:scale-90 shadow-sm" title="Borrar">
          <i class="fa-solid fa-trash-can text-xs md:text-base"></i>
        </button>
      </div>
    `;
    
    fileCard.querySelector('.file-checkbox').onchange = (e) => toggleSelection(file.name, e.target.checked);
    fileCard.querySelector('.preview-trigger').onclick = () => showPreview(file);
    fileCard.querySelector('.download-btn').onclick = () => silentDownload(fileUrl, file.name, true);
    fileCard.querySelector('.share-btn').onclick = () => {
      navigator.clipboard.writeText(fileUrl).then(() => showToast('Enlace copiado'));
    };
    fileCard.querySelector('.delete-btn').onclick = () => {
      fileToDelete = file.name; deleteFileName.textContent = file.name;
      showElement(deleteModal, deleteModalContent);
    };

    fileListContainer.appendChild(fileCard);
  });
}

function toggleSelection(name, checked) {
  if (checked) selectedFiles.add(name); else selectedFiles.delete(name);
  renderFiles(searchInput.value); updateBatchBar();
}

function updateBatchBar() {
  if (selectedFiles.size > 0) {
    batchCount.textContent = selectedFiles.size; showElement(batchBar);
  } else hideElement(batchBar);
}

if (batchClear) batchClear.onclick = () => { selectedFiles.clear(); renderFiles(searchInput.value); updateBatchBar(); };

if (batchDownload) {
  batchDownload.onclick = async () => {
    showElement(batchLoading);
    try {
      const res = await apiFetch('/download-zip', { method: 'POST', body: JSON.stringify({ filenames: Array.from(selectedFiles) }) });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'netdrop_batch.zip';
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) { showToast('Error al descargar ZIP', 'error'); } 
    finally { hideElement(batchLoading); }
  };
}

if (batchDelete) {
  batchDelete.onclick = () => {
    batchCountText.textContent = selectedFiles.size;
    showElement(batchDeleteModal, batchDeleteModalContent);
  };
}

if (confirmBatchDeleteBtn) {
  confirmBatchDeleteBtn.onclick = async () => {
    hideElement(batchDeleteModal, batchDeleteModalContent);
    showElement(batchLoading);
    try {
      await apiFetch('/batch-delete', { method: 'POST', body: JSON.stringify({ filenames: Array.from(selectedFiles) }) });
      showToast('Eliminados correctamente'); selectedFiles.clear(); updateBatchBar(); refreshAll();
    } catch (e) { showToast('Error al procesar', 'error'); } 
    finally { hideElement(batchLoading); }
  };
}

// VISTA PREVIA Y SUBIDA
function showPreview(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const url = `${API_URL}${file.url}`;
  previewTitle.textContent = file.name; previewMeta.textContent = `${file.size} • ${file.date}`;
  previewBody.innerHTML = '';
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    previewBody.innerHTML = `
      <div class="relative group">
        <img src="${url}" class="max-w-full max-h-[70vh] rounded-3xl mx-auto shadow-2xl transition-all" />
        <a href="${url}" target="_blank" class="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl">
          <span class="bg-white text-black px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest shadow-2xl">Ver Original</span>
        </a>
      </div>
    `;
  } else {
    previewBody.innerHTML = `<div class="py-24 text-center opacity-20"><i class="fa-solid ${file.icon} text-9xl block mb-6 text-slate-500"></i><p class="text-xs font-bold uppercase tracking-widest text-slate-500">Vista previa no disponible</p></div>`;
  }
  
  previewFull.onclick = () => window.open(url, '_blank');
  previewDownload.onclick = () => silentDownload(url, file.name, true);
  showElement(previewModal, previewModalContent);
}

if (closePreview) closePreview.onclick = () => hideElement(previewModal, previewModalContent);

async function handleUpload(fileList) {
  if (!localStorage.getItem('compartir_creds')) { showLogin(); return; }
  const formData = new FormData();
  for (let i = 0; i < fileList.length; i++) formData.append('files', fileList[i]);
  formData.append('one_time', !!oneTimeCheck.checked);
  let expireMins = expireSelect.value;
  if (expireMins === 'custom') expireMins = customExpireInput.value;
  if (expireMins) formData.append('expire_minutes', expireMins);
  showElement(uploadProgress);
  try {
    const res = await apiFetch('/', { method: 'POST', body: formData });
    if (res.ok) {
      showToast('Subida exitosa'); refreshAll();
      fileInput.value = ''; oneTimeCheck.checked = false; expireSelect.value = '';
    }
  } catch (err) { showToast('Error de red', 'error'); } 
  finally { hideElement(uploadProgress); }
}

async function silentDownload(url, filename, confirmUse = false) {
  try {
    showToast(`Iniciando descarga...`);
    const finalUrl = confirmUse ? `${url}?confirm_use=true` : url;
    const res = await fetch(finalUrl);
    const blob = await res.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = objectUrl; a.download = filename;
    document.body.appendChild(a); a.click();
    if (confirmUse) setTimeout(() => fetchFiles(true), 2500);
  } catch (err) { showToast('Fallo descarga', 'error'); }
}

// ==========================================
// INFORMACIÓN DE RED (QR Y IP)
// ==========================================
async function initNetworkInfo() {
  try {
    const res = await fetch(`${API_URL}/network-info`);
    const data = await res.json();
    const url = `http://${data.ip}:4321`; // Puerto de Astro
    
    const banner = $('networkBanner');
    const urlEl = $('networkUrl');
    const qrEl = $('networkQr');
    const shareBtn = $('shareNetworkUrl');
    
    if (urlEl) urlEl.textContent = url;
    if (qrEl) qrEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;
    if (banner) showElement(banner);
    
    if (shareBtn) {
      shareBtn.onclick = () => {
        navigator.clipboard.writeText(url).then(() => showToast('Enlace de red copiado'));
      };
    }
  } catch (e) {}
}

// INICIALIZACIÓN
if (!localStorage.getItem('compartir_creds')) { 
  showLogin(); if (filesLoading) filesLoading.classList.add('hidden'); 
} else { 
  if (logoutBtn) logoutBtn.classList.remove('hidden'); 
  refreshAll(); 
  initNetworkInfo(); // Restaurado
  setInterval(() => refreshAll(true), 15000); 
}

if (dropzone) {
  dropzone.onclick = () => fileInput.click();
  dropzone.ondragover = (e) => { e.preventDefault(); dropzone.classList.add('border-app-accent'); };
  dropzone.ondragleave = () => dropzone.classList.remove('border-app-accent');
  dropzone.ondrop = (e) => { e.preventDefault(); dropzone.classList.remove('border-app-accent'); handleUpload(e.dataTransfer.files); };
}
if (fileInput) fileInput.onchange = () => handleUpload(fileInput.files);
if (searchInput) searchInput.oninput = (e) => renderFiles(e.target.value);
if (sortSelect) sortSelect.onchange = () => renderFiles(searchInput.value);
if (cancelDeleteBtn) cancelDeleteBtn.onclick = () => hideElement(deleteModal, deleteModalContent);
if (confirmDeleteBtn) confirmDeleteBtn.onclick = async () => {
  if (!fileToDelete) return;
  try {
    const res = await apiFetch(`/delete/${encodeURIComponent(fileToDelete)}`, { method: 'DELETE' });
    if (res.ok) { showToast('Borrado'); fetchFiles(); }
  } catch (e) {}
  hideElement(deleteModal, deleteModalContent);
};
if (sendClipboard) {
  sendClipboard.onclick = async () => {
    const text = clipboardInput.value.trim();
    if (!text) return;
    try {
      const res = await apiFetch('/clipboard', { method: 'POST', body: JSON.stringify({ text }) });
      renderClipboard((await res.json()).history); clipboardInput.value = ''; showToast('Clip guardado');
    } catch (e) {}
  };
}

function renderClipboard(history) {
  if (!clipboardHistory) return;
  if (history.length === 0) {
    clipboardHistory.innerHTML = '<p class="text-center py-10 opacity-20 text-[9px] font-black uppercase tracking-widest text-slate-500">Historial vacío</p>';
    return;
  }
  clipboardHistory.innerHTML = history.map((item, i) => `
    <div class="p-6 solid-card bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 mb-4 relative group">
      <div class="flex justify-between items-center mb-3">
        <span class="text-[9px] text-app-accent font-bold uppercase tracking-widest">${item.date}</span>
        <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button class="copy-clip text-slate-400 hover:text-app-accent p-2" data-text="${escapeHTML(item.text)}"><i class="fa-solid fa-copy text-xs"></i></button>
          <button class="delete-clip text-slate-400 hover:text-rose-500 p-2" data-index="${i}"><i class="fa-solid fa-trash-can text-xs"></i></button>
        </div>
      </div>
      <p class="text-xs text-slate-600 dark:text-slate-400 group-hover:text-slate-950 dark:group-hover:text-white transition-colors break-words font-medium leading-relaxed">${escapeHTML(item.text)}</p>
    </div>
  `).join('');
  clipboardHistory.querySelectorAll('.copy-clip').forEach(btn => btn.onclick = () => { navigator.clipboard.writeText(btn.dataset.text); showToast('Copiado'); });
  clipboardHistory.querySelectorAll('.delete-clip').forEach(btn => btn.onclick = async () => {
    try {
      const res = await apiFetch(`/clipboard/delete/${btn.dataset.index}`, { method: 'DELETE' });
      renderClipboard((await res.json()).history); showToast('Borrado');
    } catch (e) {}
  });
}
