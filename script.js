const themeToggleBtn = document.getElementById('theme-toggle');
const currentTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', currentTheme);
themeToggleBtn.textContent = currentTheme === 'light' ? '切换暗色' : '切换亮色';

themeToggleBtn.addEventListener('click', () => {
    let theme = document.documentElement.getAttribute('data-theme');
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
        themeToggleBtn.textContent = '切换暗色';
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        themeToggleBtn.textContent = '切换亮色';
    }
});

const DEFAULT_USER = 'sherlpyq';
const DEFAULT_REPO = 'jiaoxue';
const DEFAULT_BRANCH = 'main';
const DEFAULT_PATH = 'files';

let allFiles = [];
let currentFilter = 'all';
let searchQuery = '';

const storageUsageText = document.getElementById('storage-usage-text');
const storageUsageBar = document.getElementById('storage-usage-bar');

const searchInput = document.getElementById('search-input');
const filterAll = document.getElementById('filter-all');
const filterImage = document.getElementById('filter-image');
const filterDoc = document.getElementById('filter-doc');
const filterOther = document.getElementById('filter-other');

const loadingSpinner = document.getElementById('loading-spinner');
const emptyState = document.getElementById('empty-state');
const filesGrid = document.getElementById('files-grid');
const toastContainer = document.getElementById('toast-container');

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.classList.add('active'), 10);
    setTimeout(() => {
        toast.classList.remove('active');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function getFileType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) {
        return 'image';
    }
    if (['pdf', 'txt', 'md', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
        return 'doc';
    }
    return 'other';
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

async function fetchFileList() {
    loadingSpinner.style.display = 'flex';
    emptyState.style.display = 'none';
    filesGrid.style.display = 'none';

    const url = `https://api.github.com/repos/${DEFAULT_USER}/${DEFAULT_REPO}/contents/${DEFAULT_PATH}?ref=${DEFAULT_BRANCH}`;

    try {
        const response = await fetch(url);
        if (response.status === 404) {
            allFiles = [];
            renderFiles();
            return;
        }
        if (!response.ok) {
            throw new Error(`HTTP 错误: ${response.status}`);
        }
        const data = await response.json();
        if (Array.isArray(data)) {
            allFiles = data.filter(item => item.type === 'file');
        } else if (data.type === 'file') {
            allFiles = [data];
        } else {
            allFiles = [];
        }
        renderFiles();
    } catch (error) {
        console.error(error);
        showToast('获取共享资源列表失败，请检查网络', 'error');
        loadingSpinner.style.display = 'none';
        emptyState.style.display = 'flex';
    }
}

function renderFiles() {
    loadingSpinner.style.display = 'none';
    filesGrid.innerHTML = '';

    const filtered = allFiles.filter(file => {
        const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
        const type = getFileType(file.name);
        const matchesFilter = currentFilter === 'all' || type === currentFilter;
        return matchesSearch && matchesFilter;
    });

    storageUsageText.textContent = `已加载 ${allFiles.length} 个文件`;
    const percent = Math.min((allFiles.length / 100) * 100, 100);
    storageUsageBar.style.width = `${percent}%`;

    if (filtered.length === 0) {
        emptyState.style.display = 'flex';
        filesGrid.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    filesGrid.style.display = 'grid';

    filtered.forEach(file => {
        const card = document.createElement('div');
        card.className = 'file-card';

        const preview = document.createElement('div');
        preview.className = 'file-preview';

        const fileType = getFileType(file.name);
        if (fileType === 'image') {
            const img = document.createElement('img');
            img.src = file.download_url;
            img.loading = 'lazy';
            preview.appendChild(img);
        } else {
            const icon = document.createElement('div');
            icon.className = `file-icon-placeholder ${fileType}`;
            preview.appendChild(icon);
        }

        const info = document.createElement('div');
        info.className = 'file-info';

        const name = document.createElement('div');
        name.className = 'file-name';
        name.textContent = file.name;
        name.title = file.name;

        const meta = document.createElement('div');
        meta.className = 'file-meta';

        const size = document.createElement('span');
        size.textContent = formatBytes(file.size);

        meta.appendChild(size);

        const actions = document.createElement('div');
        actions.className = 'file-actions';

        const downloadBtn = document.createElement('a');
        downloadBtn.className = 'btn btn-secondary btn-card';
        downloadBtn.href = file.download_url;
        downloadBtn.target = '_blank';
        downloadBtn.textContent = '下载';

        actions.appendChild(downloadBtn);

        info.appendChild(name);
        info.appendChild(meta);
        info.appendChild(actions);

        card.appendChild(preview);
        card.appendChild(info);
        filesGrid.appendChild(card);
    });
}

searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderFiles();
});

function handleFilterClick(filterValue, activeBtn) {
    currentFilter = filterValue;
    [filterAll, filterImage, filterDoc, filterOther].forEach(btn => {
        btn.classList.remove('active');
    });
    activeBtn.classList.add('active');
    renderFiles();
}

filterAll.addEventListener('click', () => handleFilterClick('all', filterAll));
filterImage.addEventListener('click', () => handleFilterClick('image', filterImage));
filterDoc.addEventListener('click', () => handleFilterClick('doc', filterDoc));
filterOther.addEventListener('click', () => handleFilterClick('other', filterOther));

fetchFileList();
