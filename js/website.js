// ========================================
// HOUSE PLAYER - WEBSITE JAVASCRIPT
// ========================================

// Variables globales
let currentDevice = null;

// ========== GESTION DES ONGLETS ==========
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        // Retirer la classe active de tous les onglets
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Ajouter la classe active à l'onglet cliqué
        tab.classList.add('active');
        const tabId = tab.getAttribute('data-tab');
        document.getElementById(tabId + 'Tab').classList.add('active');
    });
});

// ========== FORMATAGE DE L'ADRESSE MAC ==========
document.getElementById('macAddress').addEventListener('input', function(e) {
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

// ========== VALIDATION DU PIN ==========
document.getElementById('pinCode').addEventListener('input', function(e) {
    e.target.value = e.target.value.replace(/[^0-9]/g, '').substring(0, 5);
});

// ========== FORMULAIRE DE CONNEXION ==========
document.getElementById('activationForm').addEventListener('submit', async function(e) {
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
    
    // Afficher le chargement
    showStatus(statusDiv, 'loading', 'Vérification en cours...');
    
    try {
        // Vérifier dans Firebase
        const macKey = mac.replace(/:/g, '_');
        const snapshot = await database.ref('devices/' + macKey).once('value');
        const device = snapshot.val();
        
        if (!device) {
            showStatus(statusDiv, 'error', 'Appareil non trouvé. Lancez d\'abord l\'application sur votre TV.');
            return;
        }
        
        if (device.pin !== pin) {
            showStatus(statusDiv, 'error', 'Code PIN incorrect');
            return;
        }
        
        // Connexion réussie
        currentDevice = { mac, macKey, ...device };
        showStatus(statusDiv, 'success', 'Connexion réussie !');
        
        // Afficher la section playlist
        setTimeout(() => {
            document.getElementById('activate').classList.add('hidden');
            document.getElementById('playlistSection').classList.remove('hidden');
            document.getElementById('connectedMac').textContent = mac;
            loadPlaylists();
        }, 1000);
        
    } catch (error) {
        console.error('Erreur:', error);
        showStatus(statusDiv, 'error', 'Erreur de connexion. Réessayez.');
    }
});

// ========== AFFICHER LE STATUT ==========
function showStatus(element, type, message) {
    element.classList.remove('hidden', 'success', 'error');
    
    let icon = '';
    switch(type) {
        case 'success':
            icon = '<i class="fas fa-check-circle"></i>';
            element.classList.add('success');
            break;
        case 'error':
            icon = '<i class="fas fa-exclamation-circle"></i>';
            element.classList.add('error');
            break;
        case 'loading':
            icon = '<i class="fas fa-spinner fa-spin"></i>';
            break;
    }
    
    element.innerHTML = icon + ' ' + message;
}

// ========== CHARGER LES PLAYLISTS ==========
async function loadPlaylists() {
    if (!currentDevice) return;
    
    const container = document.getElementById('playlistContainer');
    
    try {
        const snapshot = await database.ref('devices/' + currentDevice.macKey + '/playlists').once('value');
        const playlists = snapshot.val();
        
        if (!playlists || Object.keys(playlists).length === 0) {
            container.innerHTML = '<p class="no-playlist">Aucune playlist ajoutée</p>';
            return;
        }
        
        container.innerHTML = '';
        
        Object.entries(playlists).forEach(([id, playlist]) => {
            const item = document.createElement('div');
            item.className = 'playlist-item';
            item.innerHTML = `
                <div class="playlist-info">
                    <h4>${escapeHtml(playlist.name)}</h4>
                    <span class="type">${playlist.type === 'xtream' ? 'Xtream Codes' : 'URL M3U'}</span>
                </div>
                <div class="playlist-actions">
                    <button class="btn-secondary btn-danger" onclick="deletePlaylist('${id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(item);
        });
        
    } catch (error) {
        console.error('Erreur chargement playlists:', error);
        container.innerHTML = '<p class="no-playlist">Erreur de chargement</p>';
    }
}

// ========== AJOUTER UNE PLAYLIST URL ==========
document.getElementById('urlForm').addEventListener('submit', async function(e) {
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
        
        // Réinitialiser le formulaire
        document.getElementById('urlForm').reset();
        
        // Recharger la liste
        loadPlaylists();
        
        alert('Playlist ajoutée avec succès !');
        
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de l\'ajout de la playlist');
    }
});

// ========== AJOUTER UNE PLAYLIST XTREAM ==========
document.getElementById('xtreamForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!currentDevice) return;
    
    const name = document.getElementById('xtreamName').value;
    const server = document.getElementById('serverUrl').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    const playlist = {
        name: name,
        type: 'xtream',
        server: server,
        username: username,
        password: password,
        addedAt: Date.now()
    };
    
    try {
        await database.ref('devices/' + currentDevice.macKey + '/playlists').push(playlist);
        
        // Réinitialiser le formulaire
        document.getElementById('xtreamForm').reset();
        
        // Recharger la liste
        loadPlaylists();
        
        alert('Playlist Xtream ajoutée avec succès !');
        
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de l\'ajout de la playlist');
    }
});

// ========== SUPPRIMER UNE PLAYLIST ==========
async function deletePlaylist(playlistId) {
    if (!currentDevice) return;
    
    if (!confirm('Voulez-vous vraiment supprimer cette playlist ?')) {
        return;
    }
    
    try {
        await database.ref('devices/' + currentDevice.macKey + '/playlists/' + playlistId).remove();
        loadPlaylists();
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la suppression');
    }
}

// ========== DÉCONNEXION ==========
document.getElementById('logoutBtn').addEventListener('click', function() {
    currentDevice = null;
    document.getElementById('playlistSection').classList.add('hidden');
    document.getElementById('activate').classList.remove('hidden');
    document.getElementById('connectionStatus').classList.add('hidden');
    document.getElementById('activationForm').reset();
});

// ========== UTILITAIRES ==========
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Navigation fluide
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});
