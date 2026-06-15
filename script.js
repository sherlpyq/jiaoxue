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

let config = {
    username: localStorage.getItem('drive_username') || '',
    repo: localStorage.getItem('drive_repo') || '',
    branch: localStorage.getItem('drive_branch') || 'main',
    path: localStorage.getItem('drive_path') || 'files',
    token: localStorage.getItem('drive_token') || ''
};

let allFiles = [];
let currentFilter = 'all';
let searchQuery = '';

const configModal = document.getElementById('config-modal');
const openConfigBtn = document.getElementById('open-config-btn');
const closeConfigBtn = document.getElementById('close-config-btn');
const cancelConfigBtn = document.getElementById('cancel-config-btn');
const saveConfigBtn = document.getElementById('save-config-btn');

const configUsernameInput = document.getElementById('config-username');
const configRepoInput = document.getElementById('config-repo');
const configBranchInput = document.getElementById('config-branch');
const configPathInput = document.getElementById('config-path');
const configTokenInput = document.getElementById('config-token');

const currentRepoDisplay = document.getElementById('current-repo-display');
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

function updateUIStatus() {
    if (config.username && config.repo) {
        currentRepoDisplay.textContent = `当前关联仓库: ${config.username}/${config.repo} (分支: ${config.branch}, 目录: ${config.path})`;
        if (config.token) {
            openConfigBtn.textContent = '修改配置';
        } else {
            openConfigBtn.textContent = '配置 Token';
        }
    } else {
        currentRepoDisplay.textContent = '当前关联仓库: 未配置';
        openConfigBtn.textContent = '配置仓库';
    }
}

function openModal() {
    configUsernameInput.value = config.username;
    configRepoInput.value = config.repo;
    configBranchInput.value = config.branch;
    configPathInput.value = config.path;
    configTokenInput.value = config.token;
    configModal.classList.add('active');
}

function closeModal() {
    configModal.classList.remove('active');
}

openConfigBtn.addEventListener('click', openModal);
closeConfigBtn.addEventListener('click', closeModal);
cancelConfigBtn.addEventListener('click', closeModal);

saveConfigBtn.addEventListener('click', () => {
    config.username = configUsernameInput.value.trim();
    config.repo = configRepoInput.value.trim();
    config.branch = configBranchInput.value.trim() || 'main';
    config.path = configPathInput.value.trim() || 'files';
    config.token = configTokenInput.value.trim();

    localStorage.setItem('drive_username', config.username);
    localStorage.setItem('drive_repo', config.repo);
    localStorage.setItem('drive_branch', config.branch);
    localStorage.setItem('drive_path', config.path);
    localStorage.setItem('drive_token', config.token);

    closeModal();
    updateUIStatus();
    showToast('配置已保存');
    fetchFileList();
});

function getFileType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) {
        return 'image';
    }
    if (['pdf', 'txt', 'md', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf', 'txt'].includes(ext)) {
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
    if (!config.username || !config.repo) {
        emptyState.style.display = 'flex';
        filesGrid.style.display = 'none';
        loadingSpinner.style.display = 'none';
        return;
    }

    loadingSpinner.style.display = 'flex';
    emptyState.style.display = 'none';
    filesGrid.style.display = 'none';

    const url = `https://api.github.com/repos/${config.username}/${config.repo}/contents/${config.path}?ref=${config.branch}`;
    const headers = {};
    if (config.token) {
        headers['Authorization'] = `token ${config.token}`;
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
        showToast('拉取文件列表失败，请检查配置或 Token 是否正确', 'error');
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
    storageUsageBar.style.style = `width: ${percent}%;`;

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
        deleteBtn.className = 'btn btn-outline btn-card';
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
    if (!config.token) {
        showToast('需要配置 GitHub Token 才能删除文件', 'error');
        openModal();
        return;
    }

    if (!confirm('确定要删除这个文件吗？')) {
        return;
    }

    const url = `https://api.github.com/repos/${config.username}/${config.repo}/contents/${filePath}`;
    const body = {
        message: 'Delete file via Aura Drive',
        sha: sha,
        branch: config.branch
    };

    try {
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `token ${config.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`HTTP 错误: ${response.status}`);
        }

        showToast('文件已删除');
        fetchFileList();
    } catch (error) {
        console.error(error);
        showToast('删除文件失败，请重试', 'error');
    }
}

async function uploadFiles(files) {
    if (!config.username || !config.repo) {
        showToast('请先配置仓库信息', 'error');
        openModal();
        return;
    }
    if (!config.token) {
        showToast('请配置 GitHub Token 以支持文件上传', 'error');
        openModal();
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
    const url = `https://api.github.com/repos/${config.username}/${config.repo}/contents/${config.path}/${filename}`;
    const body = {
        message: 'Upload file via Aura Drive',
        content: base64Content,
        branch: config.branch
    };

    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${config.token}`,
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

updateUIStatus();
fetchFileList();
