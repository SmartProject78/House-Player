// ========================================
// HOUSE PLAYER - TV APPLICATION
// Compatible: Samsung Tizen, LG WebOS, Vidaa
// ========================================

// ===== VARIABLES GLOBALES =====
let macAddress = '';
let pinCode = '';
let playlists = [];
let currentPlaylist = null;
let categories = [];
let channels = [];
let currentScreen = 'activation';
let focusedElement = null;
let focusableElements = [];
let focusIndex = 0;

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', function() {
    init();
});

async function init() {
    // Générer ou récupérer l'adresse MAC
    macAddress = getOrCreateMAC();
    pinCode = getOrCreatePIN();
    
    // Afficher les infos
    document.getElementById('macDisplay').textContent = macAddress;
    document.getElementById('pinDisplay').textContent = pinCode;
    document.getElementById('settingsMac').textContent = macAddress;
    document.getElementById('settingsPin').textContent = pinCode;
    
    // Définir l'URL du site
    const siteUrl = window.location.hostname || 'votre-nom.github.io/house-player';
    document.getElementById('websiteUrl').textContent = siteUrl;
    
    // Enregistrer l'appareil dans Firebase
    await registerDevice();
    
    // Vérifier s'il y a des playlists
    await checkPlaylists();
    
    // Initialiser la navigation par télécommande
    initKeyboardNavigation();
}

// ===== GESTION MAC ADDRESS =====
function getOrCreateMAC() {
    let mac = localStorage.getItem('house_player_mac');
    
    if (!mac) {
        // Générer une adresse MAC aléatoire
        const hexDigits = '0123456789ABCDEF';
        let macParts = [];
        
        for (let i = 0; i < 6; i++) {
            let part = '';
            for (let j = 0; j < 2; j++) {
                part += hexDigits.charAt(Math.floor(Math.random() * 16));
            }
            macParts.push(part);
        }
        
        mac = macParts.join(':');
        localStorage.setItem('house_player_mac', mac);
    }
    
    return mac;
}

// ===== GESTION PIN =====
function getOrCreatePIN() {
    let pin = localStorage.getItem('house_player_pin');
    
    if (!pin) {
        pin = generatePIN();
        localStorage.setItem('house_player_pin', pin);
    }
    
    return pin;
}

function generatePIN() {
    let pin = '';
    for (let i = 0; i < 5; i++) {
        pin += Math.floor(Math.random() * 10);
    }
    return pin;
}

function regeneratePIN() {
    pinCode = generatePIN();
    localStorage.setItem('house_player_pin', pinCode);
    document.getElementById('pinDisplay').textContent = pinCode;
    document.getElementById('settingsPin').textContent = pinCode;
    
    // Mettre à jour dans Firebase
    const macKey = macAddress.replace(/:/g, '_');
    database.ref('devices/' + macKey + '/pin').set(pinCode);
}

// ===== ENREGISTREMENT FIREBASE =====
async function registerDevice() {
    const macKey = macAddress.replace(/:/g, '_');
    
    try {
        await database.ref('devices/' + macKey).update({
            mac: macAddress,
            pin: pinCode,
            lastSeen: Date.now(),
            deviceType: getDeviceType()
        });
        console.log('Appareil enregistré');
    } catch (error) {
        console.error('Erreur enregistrement:', error);
    }
}

function getDeviceType() {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('tizen')) {
        return 'Samsung (Tizen)';
    } else if (userAgent.includes('webos') || userAgent.includes('web0s')) {
        return 'LG (WebOS)';
    } else if (userAgent.includes('vidaa')) {
        return 'Hisense (Vidaa)';
    } else {
        return 'Web Browser';
    }
}

// ===== VÉRIFICATION DES PLAYLISTS =====
async function checkPlaylists() {
    const macKey = macAddress.replace(/:/g, '_');
    
    try {
        const snapshot = await database.ref('devices/' + macKey + '/playlists').once('value');
        playlists = [];
        
        const data = snapshot.val();
        if (data) {
            Object.entries(data).forEach(([id, playlist]) => {
                playlists.push({ id, ...playlist });
            });
        }
        
        if (playlists.length > 0) {
            showHomeScreen();
            displayPlaylists();
        } else {
            showActivationScreen();
        }
        
    } catch (error) {
        console.error('Erreur vérification playlists:', error);
        showActivationScreen();
    }
}

// ===== AFFICHAGE DES ÉCRANS =====
function showActivationScreen() {
    currentScreen = 'activation';
    document.getElementById('activationScreen').classList.add('active');
    document.getElementById('homeScreen').classList.remove('active');
    document.getElementById('playerScreen').classList.remove('active');
}

function showHomeScreen() {
    currentScreen = 'home';
    document.getElementById('activationScreen').classList.remove('active');
    document.getElementById('homeScreen').classList.add('active');
    document.getElementById('playerScreen').classList.remove('active');
    updateFocusableElements();
}

function showPlayerScreen() {
    currentScreen = 'player';
    document.getElementById('activationScreen').classList.remove('active');
    document.getElementById('homeScreen').classList.remove('active');
    document.getElementById('playerScreen').classList.add('active');
}

// ===== AFFICHAGE DES PLAYLISTS =====
function displayPlaylists() {
    const grid = document.getElementById('playlistsGrid');
    grid.innerHTML = '';
    
    if (playlists.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📋</span>
                <p>Aucune playlist</p>
                <p class="small">Ajoutez une playlist depuis le site web</p>
            </div>
        `;
        return;
    }
    
    playlists.forEach((playlist, index) => {
        const card = document.createElement('div');
        card.className = 'card focusable';
        card.setAttribute('data-playlist-index', index);
        card.innerHTML = `
            <div class="card-icon">${playlist.type === 'xtream' ? '📡' : '📋'}</div>
            <div class="card-title">${escapeHtml(playlist.name)}</div>
            <div class="card-subtitle">${playlist.type === 'xtream' ? 'Xtream Codes' : 'M3U URL'}</div>
        `;
        card.addEventListener('click', () => loadPlaylist(index));
        grid.appendChild(card);
    });
    
    updateFocusableElements();
}

// ===== CHARGEMENT D'UNE PLAYLIST =====
async function loadPlaylist(index) {
    currentPlaylist = playlists[index];
    showLoadingOverlay('Chargement de la playlist...');
    
    try {
        if (currentPlaylist.type === 'xtream') {
            await loadXtreamPlaylist(currentPlaylist);
        } else {
            await loadM3UPlaylist(currentPlaylist.url);
        }
        
        hideLoadingOverlay();
        displayCategories();
        switchSection('live');
        
    } catch (error) {
        console.error('Erreur chargement playlist:', error);
        hideLoadingOverlay();
        alert('Erreur lors du chargement de la playlist');
    }
}

// ===== CHARGEMENT M3U =====
async function loadM3UPlaylist(url) {
    const response = await fetch(url);
    const text = await response.text();
    
    parseM3U(text);
}

function parseM3U(content) {
    categories = [];
    channels = [];
    
    const lines = content.split('\n');
    let currentChannel = null;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('#EXTINF:')) {
            // Parse channel info
            currentChannel = {
                name: '',
                logo: '',
                group: 'Sans catégorie',
                url: ''
            };
            
            // Extract name
            const nameMatch = line.match(/,(.+)$/);
            if (nameMatch) {
                currentChannel.name = nameMatch[1].trim();
            }
            
            // Extract logo
            const logoMatch = line.match(/tvg-logo="([^"]+)"/);
            if (logoMatch) {
                currentChannel.logo = logoMatch[1];
            }
            
            // Extract group
            const groupMatch = line.match(/group-title="([^"]+)"/);
            if (groupMatch) {
                currentChannel.group = groupMatch[1];
            }
            
        } else if (line && !line.startsWith('#') && currentChannel) {
            // This is the URL
            currentChannel.url = line;
            channels.push(currentChannel);
            
            // Add to category
            if (!categories.includes(currentChannel.group)) {
                categories.push(currentChannel.group);
            }
            
            currentChannel = null;
        }
    }
    
    console.log(`Loaded ${channels.length} channels in ${categories.length} categories`);
}

// ===== CHARGEMENT XTREAM =====
async function loadXtreamPlaylist(playlist) {
    const baseUrl = playlist.server;
    const username = playlist.username;
    const password = playlist.password;
    
    // Get live categories
    const catUrl = `${baseUrl}/player_api.php?username=${username}&password=${password}&action=get_live_categories`;
    const catResponse = await fetch(catUrl);
    const catData = await catResponse.json();
    
    categories = catData.map(cat => cat.category_name);
    
    // Get live streams
    const streamsUrl = `${baseUrl}/player_api.php?username=${username}&password=${password}&action=get_live_streams`;
    const streamsResponse = await fetch(streamsUrl);
    const streamsData = await streamsResponse.json();
    
    channels = streamsData.map(stream => ({
        name: stream.name,
        logo: stream.stream_icon,
        group: catData.find(c => c.category_id === stream.category_id)?.category_name || 'Sans catégorie',
        url: `${baseUrl}/live/${username}/${password}/${stream.stream_id}.m3u8`
    }));
    
    console.log(`Loaded ${channels.length} channels in ${categories.length} categories`);
}

// ===== AFFICHAGE DES CATÉGORIES =====
function displayCategories() {
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = '';
    
    categories.forEach((category, index) => {
        const count = channels.filter(c => c.group === category).length;
        
        const card = document.createElement('div');
        card.className = 'card focusable';
        card.setAttribute('data-category', category);
        card.innerHTML = `
            <div class="card-icon">📁</div>
            <div class="card-title">${escapeHtml(category)}</div>
            <div class="card-subtitle">${count} chaînes</div>
        `;
        card.addEventListener('click', () => showCategoryChannels(category));
        grid.appendChild(card);
    });
    
    updateFocusableElements();
}

// ===== AFFICHAGE DES CHAÎNES D'UNE CATÉGORIE =====
function showCategoryChannels(category) {
    const categoryChannels = channels.filter(c => c.group === category);
    
    document.getElementById('categoryTitle').textContent = category;
    
    const list = document.getElementById('channelsList');
    list.innerHTML = '';
    
    categoryChannels.forEach((channel, index) => {
        const item = document.createElement('div');
        item.className = 'channel-item focusable';
        item.innerHTML = `
            <img src="${channel.logo || 'data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\"/>'}" 
                 class="channel-logo" 
                 onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\'/>'">
            <span class="channel-name">${escapeHtml(channel.name)}</span>
        `;
        item.addEventListener('click', () => playChannel(channel));
        list.appendChild(item);
    });
    
    document.getElementById('channelsOverlay').classList.add('active');
    updateFocusableElements();
}

// ===== LECTURE D'UNE CHAÎNE =====
function playChannel(channel) {
    showPlayerScreen();
    document.getElementById('channelName').textContent = channel.name;
    
    const video = document.getElementById('videoPlayer');
    const url = channel.url;
    
    // Fermer l'overlay
    document.getElementById('channelsOverlay').classList.remove('active');
    
    // Check if HLS
    if (url.includes('.m3u8')) {
        if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, function() {
                video.play();
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = url;
            video.play();
        }
    } else {
        video.src = url;
        video.play();
    }
    
    // Show controls briefly
    showPlayerControls();
}

// ===== CONTRÔLES DU LECTEUR =====
function showPlayerControls() {
    const controls = document.getElementById('playerControls');
    controls.classList.add('visible');
    
    clearTimeout(window.controlsTimeout);
    window.controlsTimeout = setTimeout(() => {
        controls.classList.remove('visible');
    }, 5000);
}

// ===== NAVIGATION PAR TÉLÉCOMMANDE =====
function initKeyboardNavigation() {
    document.addEventListener('keydown', handleKeyPress);
}

function handleKeyPress(e) {
    const key = e.keyCode;
    
    // Codes des touches télécommande
    const KEY_LEFT = 37;
    const KEY_UP = 38;
    const KEY_RIGHT = 39;
    const KEY_DOWN = 40;
    const KEY_ENTER = 13;
    const KEY_BACK = 10009; // Samsung
    const KEY_BACK_LG = 461; // LG
    const KEY_ESCAPE = 27;
    
    switch (key) {
        case KEY_LEFT:
            moveFocus('left');
            break;
        case KEY_RIGHT:
            moveFocus('right');
            break;
        case KEY_UP:
            moveFocus('up');
            break;
        case KEY_DOWN:
            moveFocus('down');
            break;
        case KEY_ENTER:
            selectFocused();
            break;
        case KEY_BACK:
        case KEY_BACK_LG:
        case KEY_ESCAPE:
            handleBack();
            break;
    }
    
    // Show controls if in player
    if (currentScreen === 'player') {
        showPlayerControls();
    }
}

function updateFocusableElements() {
    const activeSection = document.querySelector('.content-section.active');
    if (activeSection) {
        focusableElements = Array.from(activeSection.querySelectorAll('.focusable'));
    } else {
        focusableElements = Array.from(document.querySelectorAll('.nav-item, .focusable'));
    }
    
    // Add sidebar items
    const sidebarItems = Array.from(document.querySelectorAll('.nav-item'));
    focusableElements = [...sidebarItems, ...focusableElements];
    
    if (focusableElements.length > 0 && focusIndex >= focusableElements.length) {
        focusIndex = 0;
    }
    
    updateFocusVisual();
}

function moveFocus(direction) {
    if (focusableElements.length === 0) return;
    
    // Remove current focus
    focusableElements.forEach(el => el.classList.remove('focused'));
    
    switch(direction) {
        case 'left':
        case 'up':
            focusIndex = (focusIndex - 1 + focusableElements.length) % focusableElements.length;
            break;
        case 'right':
        case 'down':
            focusIndex = (focusIndex + 1) % focusableElements.length;
            break;
    }
    
    updateFocusVisual();
}

function updateFocusVisual() {
    focusableElements.forEach(el => el.classList.remove('focused'));
    
    if (focusableElements[focusIndex]) {
        focusableElements[focusIndex].classList.add('focused');
        focusableElements[focusIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function selectFocused() {
    const focused = focusableElements[focusIndex];
    if (focused) {
        focused.click();
    }
    
    // Si sur l'écran d'activation, rafraîchir
    if (currentScreen === 'activation') {
        checkPlaylists();
    }
}

function handleBack() {
    if (currentScreen === 'player') {
        // Stop video and go back
        const video = document.getElementById('videoPlayer');
        video.pause();
        video.src = '';
        showHomeScreen();
    } else if (document.getElementById('channelsOverlay').classList.contains('active')) {
        document.getElementById('channelsOverlay').classList.remove('active');
        updateFocusableElements();
    } else {
        switchSection('playlists');
    }
}

// ===== CHANGEMENT DE SECTION =====
function switchSection(sectionName) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-section') === sectionName) {
            item.classList.add('active');
        }
    });
    
    // Update sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.getElementById(sectionName + 'Section').classList.add('active');
    updateFocusableElements();
}

// Navigation sidebar clicks
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.getAttribute('data-section');
        switchSection(section);
    });
});

// Settings buttons
document.getElementById('refreshBtn')?.addEventListener('click', () => {
    checkPlaylists();
});

document.getElementById('newPinBtn')?.addEventListener('click', () => {
    regeneratePIN();
    alert('Nouveau PIN généré: ' + pinCode);
});

// ===== UTILITAIRES =====
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoadingOverlay(message) {
    // Create loading overlay if not exists
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.className = 'overlay active';
        overlay.innerHTML = `
            <div class="overlay-content" style="text-align: center;">
                <div style="font-size: 60px; margin-bottom: 20px;">⏳</div>
                <p id="loadingMessage" style="font-size: 24px;">${message}</p>
            </div>
        `;
        document.getElementById('app').appendChild(overlay);
    } else {
        document.getElementById('loadingMessage').textContent = message;
        overlay.classList.add('active');
    }
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

// ===== ÉCOUTE DES CHANGEMENTS FIREBASE EN TEMPS RÉEL =====
function listenForPlaylistChanges() {
    const macKey = macAddress.replace(/:/g, '_');
    
    database.ref('devices/' + macKey + '/playlists').on('value', (snapshot) => {
        playlists = [];
        const data = snapshot.val();
        
        if (data) {
            Object.entries(data).forEach(([id, playlist]) => {
                playlists.push({ id, ...playlist });
            });
        }
        
        if (currentScreen === 'activation' && playlists.length > 0) {
            showHomeScreen();
        }
        
        displayPlaylists();
    });
}

// Démarrer l'écoute après l'init
setTimeout(listenForPlaylistChanges, 2000);
