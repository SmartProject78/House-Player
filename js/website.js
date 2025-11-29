// ========================================
// HOUSE PLAYER - WEBSITE JAVASCRIPT
// Style ibo player pro
// ========================================

// Variables globales
let currentDevice = null;

// ========== INITIALISATION ==========
document.addEventListener('DOMContentLoaded', function() {
    initNavigation();
    initTabs();
    initForms();
    initFAQ();
});

// ========== NAVIGATION ==========
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            showSection(section);
        });
    });
}

function showSection(sectionId) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-section') === sectionId) {
            item.classList.add('active');
        }
    });
    
    // Update sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.getElementById(sectionId).classList.add('active');
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========== TABS ==========
function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            
            // Update buttons
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Update panels
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            document.getElementById(tab + 'Tab').classList.add('active');
        });
    });
}

// ========== FAQ ==========
function initFAQ() {
    document.querySelectorAll('.faq-question').forEach(q => {
        q.addEventListener('click', function() {
            const item = this.parentElement;
            item.classList.toggle('active');
        });
    });
}

// ========== FORMS ==========
function initForms() {
    // Format MAC address
    const macInput = document.getElementById('macAddress');
    if (macInput) {
        macInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/[^A-Fa-f0-9]/g, '').toUpperCase();
            let formatted = '';
            
            for (let i = 0; i < value.length && i < 12; i++) {
                if (i > 0 && i % 2 === 0) {
                    formatted += ':';
                }
                formatted += value[i];
            }
            
            e.target.value = formatted;
        });
    }
    
    // PIN validation
    const pinInput = document.getElementById('pinCode');
    if (pinInput) {
        pinInput.addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/[^0-9]/g, '').substring(0, 5);
        });
    }
    
    // Activation form
    const activationForm = document.getElementById('activationForm');
    if (activationForm) {
        activationForm.addEventListener('submit', handleActivation);
    }
    
    // URL form
    const urlForm = document.getElementById('urlForm');
    if (urlForm) {
        urlForm.addEventListener('submit', handleURLPlaylist);
    }
    
    // Xtream form
    const xtreamForm = document.getElementById('xtreamForm');
    if (xtreamForm) {
        xtreamForm.addEventListener('submit', handleXtreamPlaylist);
    }
    
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

// ========== ACTIVATION ==========
async function handleActivation(e) {
    e.preventDefault();
    
    const mac = document.getElementById('macAddress').value.toUpperCase();
    const pin = document.getElementById('pinCode').value;
    const statusDiv = document.getElementById('connectionStatus');
    
    // Validation
    if (!/^([A-F0-9]{2}:){5}[A-F0-9]{2}$/.test(mac)) {
        showStatus(statusDiv, 'error', 'Format MAC invalide. Utilisez XX:XX:XX:XX:XX:XX');
        return;
    }
    
    if (!/^\d{5}$/.test(pin)) {
        showStatus(statusDiv, 'error', 'Le PIN doit contenir exactement 5 chiffres');
        return;
    }
    
    showStatus(statusDiv, 'loading', 'Vérification en cours...');
    
    try {
        const macKey = mac.replace(/:/g, '_');
        const snapshot = await database.ref('devices/' + macKey).once('value');
        const device = snapshot.val();
        
        if (!device) {
            showStatus(statusDiv, 'error', 'Appareil non trouvé. Lancez d\'abord l\'app sur votre TV.');
            return;
        }
        
        if (device.pin !== pin) {
            showStatus(statusDiv, 'error', 'Code PIN incorrect');
            return;
        }
        
        // Connexion réussie
        currentDevice = { mac, macKey, ...device };
        showStatus(statusDiv, 'success', 'Connexion réussie !');
        
        // Afficher gestionnaire de playlists
        setTimeout(() => {
            document.getElementById('notConnectedMsg').classList.add('hidden');
            document.getElementById('playlistManager').classList.remove('hidden');
            document.getElementById('connectedMac').textContent = mac;
            showSection('playlists');
            loadPlaylists();
        }, 1000);
        
    } catch (error) {
        console.error('Erreur:', error);
        showStatus(statusDiv, 'error', 'Erreur de connexion. Réessayez.');
    }
}

// ========== STATUS DISPLAY ==========
function showStatus(element, type, message) {
    element.classList.remove('hidden', 'success', 'error', 'loading');
    element.classList.add(type);
    
    let icon = '';
    switch(type) {
        case 'success': icon = '<i class="fas fa-check-circle"></i>'; break;
        case 'error': icon = '<i class="fas fa-exclamation-circle"></i>'; break;
        case 'loading': icon = '<i class="fas fa-spinner fa-spin"></i>'; break;
    }
    
    element.innerHTML = icon + ' ' + message;
}

// ========== PLAYLISTS ==========
async function loadPlaylists() {
    if (!currentDevice) return;
    
    const container = document.getElementById('playlistContainer');
    
    try {
        const snapshot = await database.ref('devices/' + currentDevice.macKey + '/playlists').once('value');
        const playlists = snapshot.val();
        
        if (!playlists || Object.keys(playlists).length === 0) {
            container.innerHTML = `
                <div class="empty-playlist">
                    <i class="fas fa-inbox"></i>
                    <p>Aucune playlist</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        Object.entries(playlists).forEach(([id, playlist]) => {
            const item = document.createElement('div');
            item.className = 'playlist-item';
            item.innerHTML = `
                <div class="playlist-info">
                    <h4>${escapeHtml(playlist.name)}</h4>
                    <span class="type">
                        <i class="fas fa-${playlist.type === 'xtream' ? 'server' : 'link'}"></i>
                        ${playlist.type === 'xtream' ? 'Xtream Codes' : 'URL M3U'}
                    </span>
                </div>
                <div class="playlist-actions">
                    <button class="btn-icon btn-delete" onclick="deletePlaylist('${id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(item);
        });
        
    } catch (error) {
        console.error('Erreur chargement playlists:', error);
        container.innerHTML = '<p class="empty-playlist">Erreur de chargement</p>';
    }
}

// ========== ADD URL PLAYLIST ==========
async function handleURLPlaylist(e) {
    e.preventDefault();
    
    if (!currentDevice) return;
    
    const name = document.getElementById('playlistName').value;
    const url = document.getElementById('playlistUrl').value;
    
    const playlist = {
        name: name,
        type: 'url',
        url: url,
        addedAt: Date.now()
    };
    
    try {
        await database.ref('devices/' + currentDevice.macKey + '/playlists').push(playlist);
        document.getElementById('urlForm').reset();
        loadPlaylists();
        showNotification('Playlist ajoutée !', 'success');
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de l\'ajout', 'error');
    }
}

// ========== ADD XTREAM PLAYLIST ==========
async function handleXtreamPlaylist(e) {
    e.preventDefault();
    
    if (!currentDevice) return;
    
    const playlist = {
        name: document.getElementById('xtreamName').value,
        type: 'xtream',
        server: document.getElementById('serverUrl').value,
        username: document.getElementById('username').value,
        password: document.getElementById('password').value,
        addedAt: Date.now()
    };
    
    try {
        await database.ref('devices/' + currentDevice.macKey + '/playlists').push(playlist);
        document.getElementById('xtreamForm').reset();
        loadPlaylists();
        showNotification('Playlist Xtream ajoutée !', 'success');
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de l\'ajout', 'error');
    }
}

// ========== DELETE PLAYLIST ==========
async function deletePlaylist(playlistId) {
    if (!currentDevice) return;
    
    if (!confirm('Supprimer cette playlist ?')) return;
    
    try {
        await database.ref('devices/' + currentDevice.macKey + '/playlists/' + playlistId).remove();
        loadPlaylists();
        showNotification('Playlist supprimée', 'success');
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de la suppression', 'error');
    }
}

// ========== LOGOUT ==========
function handleLogout() {
    currentDevice = null;
    document.getElementById('playlistManager').classList.add('hidden');
    document.getElementById('notConnectedMsg').classList.remove('hidden');
    document.getElementById('activationForm').reset();
    document.getElementById('connectionStatus').classList.add('hidden');
    showSection('activate');
}

// ========== NOTIFICATION ==========
function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#4CAF50' : '#f44336'};
        color: white;
        border-radius: 10px;
        font-weight: 500;
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    notification.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}-circle"></i> ${message}`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// ========== UTILITIES ==========
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
