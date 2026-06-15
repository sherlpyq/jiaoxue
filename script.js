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

let adminToken = localStorage.getItem('admin_token') || '';
let allFiles = [];
let currentFilter = 'all';
let searchQuery = '';

const configModal = document.getElementById('config-modal');
const adminLoginBtn = document.getElementById('admin-login-btn');
const adminLogoutBtn = document.getElementById('admin-logout-btn');
const closeConfigBtn = document.getElementById('close-config-btn');
const cancelConfigBtn = document.getElementById('cancel-config-btn');
const saveConfigBtn = document.getElementById('save-config-btn');
const configTokenInput = document.getElementById('config-token');

const currentModeBadge = document.getElementById('current-mode-badge');
const storageUsageText = document.getElementById('storage-usage-text');
const storageUsageBar = document.getElementById('storage-usage-bar');

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const selectFilesTrigger = document.getElementById('select-files-trigger');
const uploadProgressContainer = document.getElementById('upload-progress-container');
const uploadStatusText = document.getElementById('upload-status-text');
const uploadPercentageText = document.getElementById('upload-percentage-text');
const uploadProgressBar = document.getElementById('upload-progress-bar');

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

function updateAdminUI() {
    if (adminToken) {
        document.body.classList.add('admin-mode');
        dropZone.style.display = 'block';
        adminLoginBtn.style.display = 'none';
        adminLogoutBtn.style.display = 'block';
        currentModeBadge.textContent = '管理员维护模式';
        currentModeBadge.style.color = 'var(--accent-primary)';
    } else {
        document.body.classList.remove('admin-mode');
        dropZone.style.display = 'none';
        adminLoginBtn.style.display = 'block';
        adminLogoutBtn.style.display = 'none';
        currentModeBadge.textContent = '访客只读模式';
        currentModeBadge.style.color = 'var(--text-secondary)';
    }
}

adminLoginBtn.addEventListener('click', () => {
    configTokenInput.value = adminToken;
    configModal.classList.add('active');
});

closeConfigBtn.addEventListener('click', () => configModal.classList.remove('active'));
cancelConfigBtn.addEventListener('click', () => configModal.classList.remove('active'));

adminLogoutBtn.addEventListener('click', () => {
    adminToken = '';
    localStorage.removeItem('admin_token');
    updateAdminUI();
    showToast('已退出管理员模式');
    fetchFileList();
});

saveConfigBtn.addEventListener('click', async () => {
    const tokenInputVal = configTokenInput.value.trim();
    if (!tokenInputVal) {
        showToast('请输入访问令牌', 'error');
        return;
    }

    saveConfigBtn.disabled = true;
    saveConfigBtn.textContent = '正在验证...';

    try {
        const response = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `token ${tokenInputVal}`
            }
        });

        if (!response.ok) {
            throw new Error('令牌验证失败');
        }

        const userData = await response.json();
        adminToken = tokenInputVal;
        localStorage.setItem('admin_token', adminToken);
        
        configModal.classList.remove('active');
        updateAdminUI();
        showToast(`验证成功，欢迎管理员: ${userData.login || 'Admin'}`);
        fetchFileList();
    } catch (error) {
        console.error(error);
        showToast('令牌无效或网络错误，请重新输入', 'error');
    } finally {
        saveConfigBtn.disabled = false;
        saveConfigBtn.textContent = '登录并验证';
    }
});

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
    const headers = {};
    if (adminToken) {
        headers['Authorization'] = `token ${adminToken}`;
    }

    try {
        const response = await fetch(url, { headers });
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
        showToast('获取共享资源列表失败，请检查网络或配置', 'error');
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

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-outline btn-card btn-delete';
        deleteBtn.textContent = '删除';
        deleteBtn.addEventListener('click', () => deleteFile(file.path, file.sha));

        actions.appendChild(downloadBtn);
        actions.appendChild(deleteBtn);

        info.appendChild(name);
        info.appendChild(meta);
        info.appendChild(actions);

        card.appendChild(preview);
        card.appendChild(info);
        filesGrid.appendChild(card);
    });
}

async function deleteFile(filePath, sha) {
    if (!adminToken) {
        showToast('未检测到管理员身份，无法删除', 'error');
        return;
    }

    if (!confirm('确定要从云端删除这个文件吗？')) {
        return;
    }

    const url = `https://api.github.com/repos/${DEFAULT_USER}/${DEFAULT_REPO}/contents/${filePath}`;
    const body = {
        message: 'Delete file via Aura Drive',
        sha: sha,
        branch: DEFAULT_BRANCH
    };

    try {
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `token ${adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`HTTP 错误: ${response.status}`);
        }

        showToast('文件已成功删除');
        fetchFileList();
    } catch (error) {
        console.error(error);
        showToast('删除失败，请检查令牌权限', 'error');
    }
}

async function uploadFiles(files) {
    if (!adminToken) {
        showToast('需要管理员身份才能上传文件', 'error');
        return;
    }

    uploadProgressContainer.style.display = 'block';
    const total = files.length;
    let completed = 0;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        uploadStatusText.textContent = `正在上传 (${i + 1}/${total}): ${file.name}`;
        
        const percent = Math.round((i / total) * 100);
        uploadPercentageText.textContent = `${percent}%`;
        uploadProgressBar.style.width = `${percent}%`;

        try {
            const base64Content = await fileToBase64(file);
            await uploadSingleFile(file.name, base64Content);
            completed++;
        } catch (error) {
            console.error(error);
            showToast(`文件 ${file.name} 上传失败`, 'error');
        }
    }

    uploadPercentageText.textContent = '100%';
    uploadProgressBar.style.width = '100%';
    uploadStatusText.textContent = '上传完成';
    
    setTimeout(() => {
        uploadProgressContainer.style.display = 'none';
        uploadProgressBar.style.width = '0%';
    }, 2000);

    if (completed > 0) {
        showToast(`成功上传 ${completed} 个文件`);
        fetchFileList();
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
}

async function uploadSingleFile(filename, base64Content) {
    const url = `https://api.github.com/repos/${DEFAULT_USER}/${DEFAULT_REPO}/contents/${DEFAULT_PATH}/${filename}`;
    const body = {
        message: 'Upload file via Aura Drive',
        content: base64Content,
        branch: DEFAULT_BRANCH
    };

    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${adminToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || '上传接口错误');
    }
}

selectFilesTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
});

fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
        uploadFiles(fileInput.files);
    }
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        uploadFiles(e.dataTransfer.files);
    }
});

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

updateAdminUI();
fetchFileList();
