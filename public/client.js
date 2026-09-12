/**
 * CoCanvas — Professional Real-Time Collaborative Whiteboard
 * Skribbl-inspired Entry Flow, Multi-layer Canvas & VFX Engine.
 */

(function () {
  'use strict';

  // --- Socket.io Connection ---
  const socket = (typeof io !== 'undefined') ? io() : { emit: () => {}, on: () => {} };

  // --- 1. Sound Synthesizer (Web Audio API) ---
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.muted = false;
      this.initOnFirstInteraction = this.initOnFirstInteraction.bind(this);
      window.addEventListener('pointerdown', this.initOnFirstInteraction, { once: true });
      window.addEventListener('keydown', this.initOnFirstInteraction, { once: true });
    }

    initOnFirstInteraction() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) this.ctx = new AudioContext();
      }
    }

    ensureContext() {
      if (this.muted) return;
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) this.ctx = new AudioContext();
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    playClick() {
      if (this.muted) return;
      try {
        this.ensureContext();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.04);
        gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.04);
      } catch (e) {}
    }

    playPop() {
      if (this.muted) return;
      try {
        this.ensureContext();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(240, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(680, this.ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
      } catch (e) {}
    }

    playRadarPing() {
      if (this.muted) return;
      try {
        this.ensureContext();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1046.5, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(523.25, this.ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.35);
      } catch (e) {}
    }

    playReactionChime() {
      if (this.muted) return;
      try {
        this.ensureContext();
        if (!this.ctx) return;
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          const startTime = this.ctx.currentTime + idx * 0.04;
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.08, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.22);
        });
      } catch (e) {}
    }
  }

  const sound = new SoundEngine();

  // --- 2. Avatars & Helpers ---
  const AVATARS_CATALOG = [
    { emoji: '🦊', name: 'Swift Fox', category: 'animals' },
    { emoji: '🐯', name: 'Cyber Tiger', category: 'animals' },
    { emoji: '🐼', name: 'Zen Panda', category: 'animals' },
    { emoji: '🦁', name: 'Solar Lion', category: 'animals' },
    { emoji: '🐺', name: 'Frost Wolf', category: 'animals' },
    { emoji: '🦉', name: 'Wisdom Owl', category: 'animals' },
    { emoji: '🦄', name: 'Mythic Horn', category: 'animals' },
    { emoji: '🐉', name: 'Jade Dragon', category: 'animals' },
    { emoji: '🐱', name: 'Neon Kitty', category: 'animals' },
    { emoji: '🐶', name: 'Turbo Doge', category: 'animals' },
    { emoji: '🐙', name: 'Abyss Kraken', category: 'animals' },
    { emoji: '🧸', name: 'Iron Teddy', category: 'animals' },

    { emoji: '🧙', name: 'Arcane Mage', category: 'personas' },
    { emoji: '🥷', name: 'Shadow Ninja', category: 'personas' },
    { emoji: '🚀', name: 'Star Pioneer', category: 'personas' },
    { emoji: '🎨', name: 'Neo Painter', category: 'personas' },
    { emoji: '👑', name: 'Sovereign', category: 'personas' },
    { emoji: '👾', name: 'Pixel Invader', category: 'personas' },
    { emoji: '🤖', name: 'Cyber Droid', category: 'personas' },
    { emoji: '🛸', name: 'UFO Scout', category: 'personas' },

    { emoji: '⚡', name: 'Volt Spark', category: 'cyber' },
    { emoji: '🔥', name: 'Flame Knight', category: 'cyber' },
    { emoji: '💎', name: 'Gem Crystal', category: 'cyber' },
    { emoji: '🪐', name: 'Saturn Core', category: 'cyber' }
  ];
  const AVATARS_LIST = AVATARS_CATALOG.map(a => a.emoji);
  
  function isImageAvatar(avatar) {
    return typeof avatar === 'string' && (
      avatar.startsWith('data:image/') ||
      avatar.startsWith('http://') ||
      avatar.startsWith('https://') ||
      avatar.startsWith('blob:')
    );
  }

  function setAvatarElement(el, avatar, fallbackChar) {
    if (!el) return;
    if (isImageAvatar(avatar)) {
      el.innerHTML = `<img src="${avatar}" alt="Avatar" class="avatar-custom-img" />`;
    } else {
      const emoji = avatar || fallbackChar || '🦊';
      if (el.id === 'landingAvatarInner' || el.id === 'landingAvatarPreview' || el.id === 'hubAvatar' || el.classList.contains('profile-avatar-large')) {
        el.innerHTML = `<span class="avatar-emoji-main">${emoji}</span>`;
      } else {
        el.textContent = emoji;
      }
    }
  }

  function processImageFileToAvatarData(file, callback) {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Please select a valid image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 128;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Aspect ratio cover crop
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        callback(dataUrl);
      };
      img.onerror = () => showToast('Failed to load image');
      img.src = e.target.result;
    };
    reader.onerror = () => showToast('Error reading file');
    reader.readAsDataURL(file);
  }

  const remoteAvatarImageCache = new Map();
  const ADJECTIVES = ['Swift', 'Cosmic', 'Neon', 'Lunar', 'Electric', 'Solar', 'Hyper', 'Velvet', 'Turbo', 'Shadow', 'Frost', 'Zenith'];
  const NOUNS = ['Fox', 'Otter', 'Falcon', 'Phoenix', 'Panda', 'Tiger', 'Comet', 'Vortex', 'Hawk', 'Wolf', 'Dragon', 'Badger'];
  
  function generateRandomName() {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    return `${adj} ${noun}`;
  }

  function generateRandomRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  function generateGuestFriendTag(name) {
    const sanitized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const randNum = Math.floor(1000 + Math.random() * 9000);
    return `@${sanitized}#${randNum}`;
  }

  // --- 3. App State & Local Storage Persistence ---
  function getOrCreateSessionId() {
    let sid = localStorage.getItem('cocanvas_session_id');
    if (!sid) {
      sid = 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('cocanvas_session_id', sid);
    }
    return sid;
  }

  function loadStoredUser() {
    const sessionId = getOrCreateSessionId();
    try {
      const saved = localStorage.getItem('cocanvas_user_session') || localStorage.getItem('flamspace_user_session');
      if (saved) {
        const u = JSON.parse(saved);
        if (u) {
          u.sessionId = sessionId;
          // If user previously logged in with account, retain, else start fresh with empty name prompt
          if (!u.isLoggedIn) {
            u.name = '';
            u.username = '';
          }
          return u;
        }
      }
    } catch (e) {}
    return {
      sessionId,
      isLoggedIn: false,
      username: '',
      name: '',
      avatar: '🦊',
      color: '#FF6B4A',
      friendTag: '',
      joinedDate: 'Joined ' + new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      friends: []
    };
  }

  function saveUserSession(user) {
    try {
      localStorage.setItem('cocanvas_user_session', JSON.stringify(user));
    } catch (e) {}
  }

  const state = {
    roomId: null,
    hostId: null,
    user: loadStoredUser(),
    avatarIndex: 0,
    currentScreen: 'landing', // 'landing' or 'whiteboard'
    activeTool: 'pen',
    activeColor: '#FF6B4A',
    activeWidth: 3,
    gridMode: 'dots',
    panX: 0,
    panY: 0,
    zoom: 1.0,
    isPanning: false,
    panStart: { x: 0, y: 0 },
    spacePressed: false,
    elements: [],
    undoStack: [],
    redoStack: [],
    collaborators: new Map(),
    particles: [],
    radarPings: [],
    laserTrails: [],
    domElementsMap: new Map(),
    imageElementsMap: new Map(),
    selectedElementId: null,
    isTransforming: false,
    transformHandle: null,
    transformStart: null,
    isDraggingElement: false,
    dragElementStart: null,
    localChatActive: false,
    cameraAnimation: null,
    isChatOpen: false,
    unreadChatCount: 0,
    roomMode: 'friendly' // 'friendly' (all draw) | 'host' (presentation mode, only host draws)
  };

  // Sync avatar index
  const initialAvIndex = AVATARS_LIST.indexOf(state.user.avatar);
  if (initialAvIndex !== -1) state.avatarIndex = initialAvIndex;

  // --- 4. DOM Cache ---
  // Screens
  const landingScreen = document.getElementById('landingScreen');
  const whiteboardScreen = document.getElementById('whiteboardScreen');

  // Theme Elements
  const landingThemeToggleBtn = document.getElementById('landingThemeToggleBtn');
  const landingThemeIcon = document.getElementById('landingThemeIcon');
  const landingThemeLabel = document.getElementById('landingThemeLabel');
  const canvasThemeToggleBtn = document.getElementById('canvasThemeToggleBtn');
  const canvasThemeIcon = document.getElementById('canvasThemeIcon');

  // Landing Elements
  const landingNameInput = document.getElementById('landingNameInput');
  const btnRandomizeLandingName = document.getElementById('btnRandomizeLandingName');
  const btnPrevAvatar = document.getElementById('btnPrevAvatar');
  const btnNextAvatar = document.getElementById('btnNextAvatar');
  const landingAvatarPreview = document.getElementById('landingAvatarPreview');
  const landingAvatarInner = document.getElementById('landingAvatarInner');
  const landingAvatarEmoji = document.getElementById('landingAvatarEmoji');
  const landingAvatarFileInput = document.getElementById('landingAvatarFileInput');
  const btnUploadCustomPhoto = document.getElementById('btnUploadCustomPhoto');
  const btnResetCustomAvatar = document.getElementById('btnResetCustomAvatar');
  const btnBrowseAvatars = document.getElementById('btnBrowseAvatars');
  const landingColorDots = document.querySelectorAll('.landing-color-dot');
  const btnStartInstantCanvas = document.getElementById('btnStartInstantCanvas');
  const btnStartCanvasText = document.getElementById('btnStartCanvasText');
  const btnCreatePrivateRoom = document.getElementById('btnCreatePrivateRoom');
  const btnOpenJoinCodeInput = document.getElementById('btnOpenJoinCodeInput');
  const joinCodeInlineBox = document.getElementById('joinCodeInlineBox');
  const landingJoinCodeInput = document.getElementById('landingJoinCodeInput');
  const btnSubmitJoinCode = document.getElementById('btnSubmitJoinCode');

  // Canvas & Top Nav Elements
  const btnExitRoom = document.getElementById('btnExitRoom');
  const currentRoomCodeEl = document.getElementById('currentRoomCode');
  const roomPillBtn = document.getElementById('roomPillBtn');
  const roomModeWrapper = document.getElementById('roomModeWrapper');
  const roomModeBtn = document.getElementById('roomModeBtn');
  const roomModeIcon = document.getElementById('roomModeIcon');
  const roomModeLabel = document.getElementById('roomModeLabel');
  const roomModeMenu = document.getElementById('roomModeMenu');
  const btnModeFriendly = document.getElementById('btnModeFriendly');
  const btnModeHost = document.getElementById('btnModeHost');
  const presentationBanner = document.getElementById('presentationBanner');
  const collaboratorStack = document.getElementById('collaboratorStack');
  const shareRoomBtn = document.getElementById('shareRoomBtn');
  const topNavProfileBtn = document.getElementById('topNavProfileBtn');
  const canvasUserAvatar = document.getElementById('canvasUserAvatar');
  const canvasUserName = document.getElementById('canvasUserName');
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundIconOn = document.getElementById('soundIconOn');
  const soundIconOff = document.getElementById('soundIconOff');
  const gridStyleToggleBtn = document.getElementById('gridStyleToggleBtn');
  const templatesBtn = document.getElementById('templatesBtn');
  const templatesMenu = document.getElementById('templatesMenu');
  const tmplKanbanBtn = document.getElementById('tmplKanbanBtn');
  const tmplMatrixBtn = document.getElementById('tmplMatrixBtn');
  const tmplRetroBtn = document.getElementById('tmplRetroBtn');
  const exportBtn = document.getElementById('exportBtn');
  const exportMenu = document.getElementById('exportMenu');
  const exportPngBtn = document.getElementById('exportPngBtn');
  const exportPdfBtn = document.getElementById('exportPdfBtn');
  const exportDocxBtn = document.getElementById('exportDocxBtn');
  const exportJsonBtn = document.getElementById('exportJsonBtn');
  const importJsonInput = document.getElementById('importJsonInput');
  const clearBoardBtn = document.getElementById('clearBoardBtn');
  const shortcutsNavBtn = document.getElementById('shortcutsNavBtn');
  const toastContainer = document.getElementById('toastContainer');

  // ChatSpace Elements
  const chatSpacePanel = document.getElementById('chatSpacePanel');
  const btnCollapseChat = document.getElementById('btnCollapseChat');
  const btnClearChatHistory = document.getElementById('btnClearChatHistory');
  const chatOnlineStatus = document.getElementById('chatOnlineStatus');
  const chatFloatingTab = document.getElementById('chatFloatingTab');
  const chatUnreadBadge = document.getElementById('chatUnreadBadge');
  const chatMessagesContainer = document.getElementById('chatMessagesContainer');
  const chatInputForm = document.getElementById('chatInputForm');
  const chatMessageInput = document.getElementById('chatMessageInput');
  const btnVoiceChat = document.getElementById('btnVoiceChat');
  const chatEmojiButtons = document.querySelectorAll('.chat-emoji-btn');

  // Canvases
  const gridCanvas = document.getElementById('gridCanvas');
  const boardCanvas = document.getElementById('board');
  const draftCanvas = document.getElementById('draftLayer');
  const domLayer = document.getElementById('domLayer');
  const cursorCanvas = document.getElementById('cursorLayer');
  const minimapCanvas = document.getElementById('minimapCanvas');
  const minimapViewport = document.getElementById('minimapViewport');
  const minimapPanel = document.getElementById('minimapPanel');
  const minimapToggleBtn = document.getElementById('minimapToggleBtn');
  const minimapBody = document.getElementById('minimapBody');

  const gridCtx = gridCanvas.getContext('2d');
  const boardCtx = boardCanvas.getContext('2d');
  const draftCtx = draftCanvas.getContext('2d');
  const cursorCtx = cursorCanvas.getContext('2d');
  const minimapCtx = minimapCanvas.getContext('2d');

  const selectionBox = document.getElementById('selectionBox');
  const selectionDeleteBtn = document.getElementById('selectionDeleteBtn');
  const imageUploadInput = document.getElementById('imageUploadInput');
  const toolImageBtn = document.getElementById('toolImage');

  // Dock
  const dockButtons = document.querySelectorAll('.dock-btn[data-tool]');
  const activeShapeIcon = document.getElementById('activeShapeIcon');
  const shapePopoverBtn = document.getElementById('shapePopoverBtn');
  const shapesPopover = document.getElementById('shapesPopover');
  const colorPopoverBtn = document.getElementById('colorPopoverBtn');
  const colorPopover = document.getElementById('colorPopover');
  const activeColorDot = document.getElementById('activeColorDot');
  const reactionPopoverBtn = document.getElementById('reactionPopoverBtn');
  const reactionPopover = document.getElementById('reactionPopover');
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const zoomResetBtn = document.getElementById('zoomResetBtn');
  const zoomLabel = document.getElementById('zoomLabel');
  const startCursorChatBtn = document.getElementById('startCursorChatBtn');
  const localCursorChat = document.getElementById('localCursorChat');
  const cursorChatInput = document.getElementById('cursorChatInput');

  // Modals
  const avatarGalleryModal = document.getElementById('avatarGalleryModal');
  const btnCloseAvatarGallery = document.getElementById('btnCloseAvatarGallery');
  const galleryAvatarsGrid = document.getElementById('galleryAvatarsGrid');
  const btnGalleryUploadPhoto = document.getElementById('btnGalleryUploadPhoto');
  const galleryTabs = document.querySelectorAll('.gallery-tab');

  const shortcutsModal = document.getElementById('shortcutsModal');
  const closeShortcutsBtn = document.getElementById('closeShortcutsBtn');

  // --- 5. Coordinate Transforms ---
  function screenToWorld(clientX, clientY) {
    return {
      x: (clientX - state.panX) / state.zoom,
      y: (clientY - state.panY) / state.zoom
    };
  }

  function worldToScreen(worldX, worldY) {
    return {
      x: worldX * state.zoom + state.panX,
      y: worldY * state.zoom + state.panY
    };
  }

  let dpr = window.devicePixelRatio || 1;
  let viewWidth = window.innerWidth;
  let viewHeight = window.innerHeight;

  function resizeCanvases() {
    dpr = window.devicePixelRatio || 1;
    viewWidth = window.innerWidth;
    viewHeight = window.innerHeight;

    const canvases = [gridCanvas, boardCanvas, draftCanvas, cursorCanvas];
    canvases.forEach((canvas) => {
      canvas.width = viewWidth * dpr;
      canvas.height = viewHeight * dpr;
      canvas.style.width = `${viewWidth}px`;
      canvas.style.height = `${viewHeight}px`;
      const ctx = canvas.getContext('2d');
      ctx.resetTransform();
      ctx.scale(dpr, dpr);
    });

    renderGrid();
    redrawBoard();
    syncAllDomElementPositions();
    updateSelectionBoxPosition();
    renderMinimap();
  }

  window.addEventListener('resize', resizeCanvases);

  // --- 6. Landing Screen & Avatar Carousel Management ---
  function updateLandingUI() {
    landingNameInput.value = state.user.name || '';
    
    // Check if user has a custom image avatar
    if (isImageAvatar(state.user.avatar)) {
      setAvatarElement(landingAvatarInner, state.user.avatar);
      if (btnResetCustomAvatar) btnResetCustomAvatar.classList.remove('hidden');
    } else {
      const presetEmoji = AVATARS_LIST[state.avatarIndex] || '🦊';
      state.user.avatar = presetEmoji;
      setAvatarElement(landingAvatarInner, presetEmoji);
      if (btnResetCustomAvatar) btnResetCustomAvatar.classList.add('hidden');
    }

    landingAvatarPreview.style.setProperty('--c', state.user.color);

    landingColorDots.forEach((dot) => {
      if (dot.dataset.color === state.user.color) dot.classList.add('active');
      else dot.classList.remove('active');
    });

    // Top nav avatar & name in canvas
    if (canvasUserAvatar) setAvatarElement(canvasUserAvatar, state.user.avatar);
    if (canvasUserName) canvasUserName.textContent = state.user.name;
  }

  btnPrevAvatar.addEventListener('click', (e) => {
    e.stopPropagation();
    state.avatarIndex = (state.avatarIndex - 1 + AVATARS_LIST.length) % AVATARS_LIST.length;
    state.user.avatar = AVATARS_LIST[state.avatarIndex];
    saveUserSession(state.user);
    if (state.user.isLoggedIn) socket.emit('auth:update_profile', { avatar: state.user.avatar });
    sound.playClick();
    updateLandingUI();
  });

  btnNextAvatar.addEventListener('click', (e) => {
    e.stopPropagation();
    state.avatarIndex = (state.avatarIndex + 1) % AVATARS_LIST.length;
    state.user.avatar = AVATARS_LIST[state.avatarIndex];
    saveUserSession(state.user);
    if (state.user.isLoggedIn) socket.emit('auth:update_profile', { avatar: state.user.avatar });
    sound.playClick();
    updateLandingUI();
  });

  // Custom Photo Upload on Landing
  if (btnUploadCustomPhoto) {
    btnUploadCustomPhoto.addEventListener('click', () => {
      landingAvatarFileInput.click();
    });
  }

  landingAvatarPreview.addEventListener('click', () => {
    landingAvatarFileInput.click();
  });

  landingAvatarFileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      processImageFileToAvatarData(file, (dataUrl) => {
        state.user.avatar = dataUrl;
        saveUserSession(state.user);
        updateLandingUI();
        if (state.user.isLoggedIn) {
          socket.emit('auth:update_profile', { avatar: dataUrl });
        }
        sound.playPop();
        showToast('📸 Custom avatar photo applied!');
      });
    }
  });

  // Drag & Drop photo onto landing avatar preview
  landingAvatarPreview.addEventListener('dragover', (e) => {
    e.preventDefault();
    landingAvatarPreview.style.transform = 'scale(1.08)';
  });
  landingAvatarPreview.addEventListener('dragleave', (e) => {
    e.preventDefault();
    landingAvatarPreview.style.transform = '';
  });
  landingAvatarPreview.addEventListener('drop', (e) => {
    e.preventDefault();
    landingAvatarPreview.style.transform = '';
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImageFileToAvatarData(e.dataTransfer.files[0], (dataUrl) => {
        state.user.avatar = dataUrl;
        saveUserSession(state.user);
        updateLandingUI();
        if (state.user.isLoggedIn) {
          socket.emit('auth:update_profile', { avatar: dataUrl });
        }
        sound.playPop();
        showToast('📸 Custom avatar photo applied!');
      });
    }
  });

  // Reset Custom Avatar back to preset
  if (btnResetCustomAvatar) {
    btnResetCustomAvatar.addEventListener('click', (e) => {
      e.stopPropagation();
      state.user.avatar = AVATARS_LIST[state.avatarIndex];
      saveUserSession(state.user);
      updateLandingUI();
      if (state.user.isLoggedIn) {
        socket.emit('auth:update_profile', { avatar: state.user.avatar });
      }
      sound.playClick();
      showToast('Reset to preset avatar');
    });
  }

  // Avatar Gallery Modal
  let activeGalleryCategory = 'all';
  function renderAvatarGallery(category = 'all') {
    activeGalleryCategory = category;
    galleryAvatarsGrid.innerHTML = '';
    const filtered = (category === 'all')
      ? AVATARS_CATALOG
      : AVATARS_CATALOG.filter(a => a.category === category);

    filtered.forEach((item) => {
      const card = document.createElement('div');
      const isSelected = state.user.avatar === item.emoji;
      card.className = `gallery-avatar-card ${isSelected ? 'active' : ''}`;
      card.innerHTML = `
        <span class="gallery-avatar-badge">${item.emoji}</span>
        <span class="gallery-avatar-name">${item.name}</span>
      `;
      card.addEventListener('click', () => {
        const foundIdx = AVATARS_LIST.indexOf(item.emoji);
        if (foundIdx !== -1) state.avatarIndex = foundIdx;
        state.user.avatar = item.emoji;
        saveUserSession(state.user);
        updateLandingUI();
        if (state.user.isLoggedIn) {
          socket.emit('auth:update_profile', { avatar: item.emoji });
        }
        sound.playPop();
        avatarGalleryModal.classList.remove('active');
        showToast(`Avatar selected: ${item.name}`);
      });
      galleryAvatarsGrid.appendChild(card);
    });
  }

  if (btnBrowseAvatars) {
    btnBrowseAvatars.addEventListener('click', () => {
      avatarGalleryModal.classList.add('active');
      renderAvatarGallery('all');
    });
  }
  if (btnCloseAvatarGallery) {
    btnCloseAvatarGallery.addEventListener('click', () => {
      avatarGalleryModal.classList.remove('active');
    });
  }
  if (btnGalleryUploadPhoto) {
    btnGalleryUploadPhoto.addEventListener('click', () => {
      avatarGalleryModal.classList.remove('active');
      landingAvatarFileInput.click();
    });
  }

  galleryTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      galleryTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderAvatarGallery(tab.dataset.filter);
      sound.playClick();
    });
  });

  btnRandomizeLandingName.addEventListener('click', () => {
    const newName = generateRandomName();
    state.user.name = newName;
    state.user.username = newName;
    landingNameInput.value = newName;
    sound.playClick();
  });

  landingNameInput.addEventListener('input', () => {
    state.user.name = landingNameInput.value.trim();
    state.user.username = state.user.name;
  });

  landingColorDots.forEach((dot) => {
    dot.addEventListener('click', () => {
      state.user.color = dot.dataset.color;
      state.activeColor = dot.dataset.color;
      activeColorDot.style.backgroundColor = state.activeColor;
      sound.playClick();
      updateLandingUI();
    });
  });

  // Action Buttons
  btnStartInstantCanvas.addEventListener('click', () => {
    const customName = landingNameInput.value.trim() || generateRandomName();
    state.user.name = customName;
    state.user.username = customName;
    if (!state.user.friendTag) state.user.friendTag = generateGuestFriendTag(customName);
    saveUserSession(state.user);
    const roomId = generateRandomRoomCode();
    enterWhiteboardScreen(roomId);
  });

  btnCreatePrivateRoom.addEventListener('click', () => {
    const customName = landingNameInput.value.trim() || generateRandomName();
    state.user.name = customName;
    state.user.username = customName;
    if (!state.user.friendTag) state.user.friendTag = generateGuestFriendTag(customName);
    saveUserSession(state.user);
    const privateRoomId = generateRandomRoomCode();
    enterWhiteboardScreen(privateRoomId);
  });

  btnOpenJoinCodeInput.addEventListener('click', () => {
    joinCodeInlineBox.classList.toggle('hidden');
    if (!joinCodeInlineBox.classList.contains('hidden')) {
      landingJoinCodeInput.focus();
    }
  });

  btnSubmitJoinCode.addEventListener('click', () => {
    let raw = landingJoinCodeInput.value.trim();
    if (raw.includes('?room=')) {
      raw = new URL(raw).searchParams.get('room') || raw;
    }
    const code = raw.toUpperCase();
    if (!code) {
      showToast('Please enter a room code');
      return;
    }
    const customName = landingNameInput.value.trim() || generateRandomName();
    state.user.name = customName;
    state.user.username = customName;
    if (!state.user.friendTag) state.user.friendTag = generateGuestFriendTag(customName);
    saveUserSession(state.user);
    enterWhiteboardScreen(code);
  });

  function enterWhiteboardScreen(roomId) {
    state.roomId = roomId;
    state.currentScreen = 'whiteboard';

    landingScreen.classList.remove('active');
    whiteboardScreen.classList.add('active');
    currentRoomCodeEl.textContent = roomId;

    const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?room=${roomId}`;
    window.history.pushState({ path: newUrl }, '', newUrl);

    resizeCanvases();
    socket.emit('room:join', {
      roomId,
      user: state.user
    });

    sound.playPop();
    showToast(`Joined Canvas: ${roomId}`);
  }

  if (btnExitRoom) {
    btnExitRoom.addEventListener('click', () => {
      if (state.roomId) {
        socket.emit('room:leave');
      }
      state.roomId = null;
      state.collaborators.clear();
      state.elements = [];
      state.domElementsMap.clear();
      domLayer.innerHTML = '';
      redrawBoard();

      whiteboardScreen.classList.remove('active');
      landingScreen.classList.add('active');
      state.currentScreen = 'landing';
      state.unreadChatCount = 0;
      if (chatUnreadBadge) {
        chatUnreadBadge.textContent = '0';
        chatUnreadBadge.classList.add('hidden');
      }
      if (chatMessagesContainer) {
        const welcome = chatMessagesContainer.querySelector('.chat-welcome-notice');
        chatMessagesContainer.innerHTML = '';
        if (welcome) chatMessagesContainer.appendChild(welcome);
      }
      window.history.pushState({}, '', window.location.pathname);
      updateLandingUI();
      sound.playClick();
      showToast('👋 You left the room', 'leave');
    });
  }

  // Top Navigation Profile Button opens Avatar Gallery
  if (topNavProfileBtn) {
    topNavProfileBtn.addEventListener('click', () => {
      if (avatarGalleryModal) avatarGalleryModal.classList.add('active');
    });
  }

  // --- 7.5 Dark Mode Theme Management ---
  let currentTheme = localStorage.getItem('cocanvas_theme') || localStorage.getItem('flamspace_theme') || 'light';

  function applyTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cocanvas_theme', theme);

    if (landingThemeIcon) {
      landingThemeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
    if (landingThemeLabel) {
      landingThemeLabel.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
    }
    if (canvasThemeIcon) {
      canvasThemeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }

    renderGrid();
  }

  function toggleTheme() {
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    sound.playClick();
    showToast(nextTheme === 'dark' ? '💡 Lights off — Dark Mode' : '💡 Lights on — Light Mode');
  }

  // --- 8. Canvas Rendering Engine & Viewport Culling ---
  function renderGrid() {
    gridCtx.clearRect(0, 0, viewWidth, viewHeight);
    if (state.gridMode === 'blank') return;

    const isDark = currentTheme === 'dark';
    const baseGridSize = 32;
    const scaledGridSize = baseGridSize * state.zoom;
    const step = scaledGridSize < 16 ? scaledGridSize * 2 : scaledGridSize;
    const startX = (state.panX % step + step) % step;
    const startY = (state.panY % step + step) % step;

    if (state.gridMode === 'dots') {
      gridCtx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.12)';
      const dotRadius = Math.max(1, Math.min(2.2, 1.2 * state.zoom));
      gridCtx.beginPath();
      for (let x = startX; x < viewWidth; x += step) {
        for (let y = startY; y < viewHeight; y += step) {
          gridCtx.moveTo(x + dotRadius, y);
          gridCtx.arc(x, y, dotRadius, 0, Math.PI * 2);
        }
      }
      gridCtx.fill();
    } else if (state.gridMode === 'grid') {
      gridCtx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.09)' : 'rgba(0, 0, 0, 0.07)';
      gridCtx.lineWidth = 1;
      gridCtx.beginPath();
      for (let x = startX; x < viewWidth; x += step) {
        gridCtx.moveTo(x, 0);
        gridCtx.lineTo(x, viewHeight);
      }
      for (let y = startY; y < viewHeight; y += step) {
        gridCtx.moveTo(0, y);
        gridCtx.lineTo(viewWidth, y);
      }
      gridCtx.stroke();
    }
  }

  function simplifyPoints(points, epsilon = 1.5) {
    if (points.length <= 2) return points;
    let maxDist = 0;
    let index = 0;
    const first = points[0];
    const last = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
      const dist = distToSegment(points[i], first, last);
      if (dist > maxDist) {
        maxDist = dist;
        index = i;
      }
    }

    if (maxDist > epsilon) {
      const left = simplifyPoints(points.slice(0, index + 1), epsilon);
      const right = simplifyPoints(points.slice(index), epsilon);
      return left.slice(0, left.length - 1).concat(right);
    }
    return [first, last];
  }

  function getElementBounds(el) {
    if (el.type === 'pen' || el.type === 'highlighter') {
      if (!el.points || el.points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      el.points.forEach((p) => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      });
      const pad = (el.width || 3) * 2;
      return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
    } else if (el.type === 'rect' || el.type === 'circle' || el.type === 'image' || el.type === 'sticky' || el.type === 'text') {
      const w = el.w || 200;
      const h = el.h || 160;
      return { minX: Math.min(el.x, el.x + w), minY: Math.min(el.y, el.y + h), maxX: Math.max(el.x, el.x + w), maxY: Math.max(el.y, el.y + h) };
    } else if (el.type === 'line' || el.type === 'arrow') {
      return { minX: Math.min(el.x1, el.x2) - 10, minY: Math.min(el.y1, el.y2) - 10, maxX: Math.max(el.x1, el.x2) + 10, maxY: Math.max(el.y1, el.y2) + 10 };
    }
    return { minX: -Infinity, minY: -Infinity, maxX: Infinity, maxY: Infinity };
  }

  function isElementInViewport(bounds) {
    const vLeft = -state.panX / state.zoom;
    const vTop = -state.panY / state.zoom;
    const vRight = (viewWidth - state.panX) / state.zoom;
    const vBottom = (viewHeight - state.panY) / state.zoom;
    return !(bounds.maxX < vLeft || bounds.minX > vRight || bounds.maxY < vTop || bounds.minY > vBottom);
  }

  function drawElement(ctx, el) {
    ctx.save();
    ctx.strokeStyle = el.color || '#FF6B4A';
    ctx.fillStyle = el.color || '#FF6B4A';
    ctx.lineWidth = (el.width || 3) * state.zoom;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (el.type) {
      case 'pen': {
        if (!el.points || el.points.length < 2) break;
        ctx.beginPath();
        const p0 = worldToScreen(el.points[0].x, el.points[0].y);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < el.points.length - 1; i++) {
          const p1 = worldToScreen(el.points[i].x, el.points[i].y);
          const p2 = worldToScreen(el.points[i + 1].x, el.points[i + 1].y);
          ctx.quadraticCurveTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
        }
        const lastP = worldToScreen(el.points[el.points.length - 1].x, el.points[el.points.length - 1].y);
        ctx.lineTo(lastP.x, lastP.y);
        ctx.stroke();
        break;
      }

      case 'highlighter': {
        if (!el.points || el.points.length < 2) break;
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = (el.width || 12) * 2.5 * state.zoom;
        ctx.beginPath();
        const p0 = worldToScreen(el.points[0].x, el.points[0].y);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < el.points.length - 1; i++) {
          const p1 = worldToScreen(el.points[i].x, el.points[i].y);
          const p2 = worldToScreen(el.points[i + 1].x, el.points[i + 1].y);
          ctx.quadraticCurveTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
        }
        const lastP = worldToScreen(el.points[el.points.length - 1].x, el.points[el.points.length - 1].y);
        ctx.lineTo(lastP.x, lastP.y);
        ctx.stroke();
        ctx.restore();
        break;
      }

      case 'rect': {
        const s = worldToScreen(el.x, el.y);
        const w = el.w * state.zoom;
        const h = el.h * state.zoom;
        ctx.beginPath();
        const r = Math.min(8 * state.zoom, Math.abs(w) / 4, Math.abs(h) / 4);
        if (ctx.roundRect) ctx.roundRect(s.x, s.y, w, h, r);
        else ctx.rect(s.x, s.y, w, h);
        ctx.stroke();
        break;
      }

      case 'circle': {
        const s = worldToScreen(el.x, el.y);
        const rx = Math.abs(el.w * state.zoom) / 2;
        const ry = Math.abs(el.h * state.zoom) / 2;
        const cx = s.x + (el.w * state.zoom) / 2;
        const cy = s.y + (el.h * state.zoom) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }

      case 'line': {
        const s1 = worldToScreen(el.x1, el.y1);
        const s2 = worldToScreen(el.x2, el.y2);
        ctx.beginPath();
        ctx.moveTo(s1.x, s1.y);
        ctx.lineTo(s2.x, s2.y);
        ctx.stroke();
        break;
      }

      case 'arrow': {
        const s1 = worldToScreen(el.x1, el.y1);
        const s2 = worldToScreen(el.x2, el.y2);
        ctx.beginPath();
        ctx.moveTo(s1.x, s1.y);
        ctx.lineTo(s2.x, s2.y);
        ctx.stroke();

        const angle = Math.atan2(s2.y - s1.y, s2.x - s1.x);
        const headLen = Math.max(12, (el.width || 3) * 3.5 * state.zoom);
        ctx.beginPath();
        ctx.moveTo(s2.x, s2.y);
        ctx.lineTo(s2.x - headLen * Math.cos(angle - Math.PI / 6), s2.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(s2.x - headLen * Math.cos(angle + Math.PI / 6), s2.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
        break;
      }

      case 'image': {
        let img = state.imageElementsMap.get(el.id);
        if (!img) {
          img = new Image();
          img.src = el.src;
          state.imageElementsMap.set(el.id, img);
          img.onload = () => redrawBoard();
        }
        if (img.complete && img.naturalWidth > 0) {
          const s = worldToScreen(el.x, el.y);
          ctx.drawImage(img, s.x, s.y, el.w * state.zoom, el.h * state.zoom);
        }
        break;
      }
    }
    ctx.restore();
  }

  function redrawBoard() {
    boardCtx.clearRect(0, 0, viewWidth, viewHeight);
    state.elements.forEach((el) => {
      if (el.type !== 'sticky' && el.type !== 'text') {
        const bounds = getElementBounds(el);
        if (isElementInViewport(bounds)) {
          drawElement(boardCtx, el);
        }
      }
    });
    updateSelectionBoxPosition();
    renderMinimap();
  }

  // Minimap
  function renderMinimap() {
    minimapCtx.clearRect(0, 0, 180, 110);
    let minX = -1000, minY = -600, maxX = 1000, maxY = 600;
    state.elements.forEach((el) => {
      const b = getElementBounds(el);
      if (b.minX < minX) minX = b.minX;
      if (b.minY < minY) minY = b.minY;
      if (b.maxX > maxX) maxX = b.maxX;
      if (b.maxY > maxY) maxY = b.maxY;
    });

    const pad = 400;
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;
    const miniScale = Math.min(180 / Math.max(100, maxX - minX), 110 / Math.max(100, maxY - minY));

    minimapCtx.fillStyle = '#FF6B4A';
    state.elements.forEach((el) => {
      const b = getElementBounds(el);
      minimapCtx.fillRect((b.minX - minX) * miniScale, (b.minY - minY) * miniScale, Math.max(2, (b.maxX - b.minX) * miniScale), Math.max(2, (b.maxY - b.minY) * miniScale));
    });

    const vLeft = -state.panX / state.zoom;
    const vTop = -state.panY / state.zoom;
    const vx = (vLeft - minX) * miniScale;
    const vy = (vTop - minY) * miniScale;
    const vw = Math.max(6, (viewWidth / state.zoom) * miniScale);
    const vh = Math.max(6, (viewHeight / state.zoom) * miniScale);

    minimapViewport.style.left = `${Math.max(0, Math.min(180 - vw, vx))}px`;
    minimapViewport.style.top = `${Math.max(0, Math.min(110 - vh, vy))}px`;
    minimapViewport.style.width = `${Math.min(180, vw)}px`;
    minimapViewport.style.height = `${Math.min(110, vh)}px`;

    minimapBody.onclick = (e) => {
      const rect = minimapCanvas.getBoundingClientRect();
      const targetWorldX = minX + (e.clientX - rect.left) / miniScale;
      const targetWorldY = minY + (e.clientY - rect.top) / miniScale;
      smoothFlyTo(targetWorldX, targetWorldY);
    };
  }

  minimapToggleBtn.addEventListener('click', () => {
    minimapPanel.classList.toggle('collapsed');
    minimapToggleBtn.textContent = minimapPanel.classList.contains('collapsed') ? '▴' : '▾';
  });

  function smoothFlyTo(targetWorldX, targetWorldY, targetZoom = state.zoom) {
    const startPanX = state.panX;
    const startPanY = state.panY;
    const startZoom = state.zoom;
    const endPanX = viewWidth / 2 - targetWorldX * targetZoom;
    const endPanY = viewHeight / 2 - targetWorldY * targetZoom;
    const startTime = performance.now();
    const duration = 400;

    if (state.cameraAnimation) cancelAnimationFrame(state.cameraAnimation);

    function step(now) {
      const progress = Math.min(1, (now - startTime) / duration);
      const ease = 0.5 - Math.cos(progress * Math.PI) / 2;
      state.panX = startPanX + (endPanX - startPanX) * ease;
      state.panY = startPanY + (endPanY - startPanY) * ease;
      state.zoom = startZoom + (targetZoom - startZoom) * ease;
      updateZoomUI();
      renderGrid();
      redrawBoard();
      syncAllDomElementPositions();
      if (progress < 1) state.cameraAnimation = requestAnimationFrame(step);
      else state.cameraAnimation = null;
    }
    state.cameraAnimation = requestAnimationFrame(step);
  }

  // --- 9. DOM Overlays (Sticky Notes, Text Boxes & Code Panels) ---
  function syncDomElementPosition(el, domNode) {
    if (!domNode) return;
    const screenPos = worldToScreen(el.x, el.y);
    domNode.style.transform = `translate(${screenPos.x}px, ${screenPos.y}px) scale(${state.zoom})`;
    if (el.type === 'code') {
      if (el.w) domNode.style.width = `${el.w}px`;
      if (el.h) {
        const body = domNode.querySelector('.code-body');
        if (body) body.style.height = `${el.h}px`;
      }
    }
  }

  function syncAllDomElementPositions() {
    state.elements.forEach((el) => {
      if (el.type === 'sticky' || el.type === 'text' || el.type === 'code') {
        const node = state.domElementsMap.get(el.id);
        if (node) syncDomElementPosition(el, node);
      }
    });
  }

  function createStickyNoteNode(el) {
    const card = document.createElement('div');
    card.className = `sticky-note-card theme-${el.theme || 'yellow'}`;
    card.dataset.id = el.id;

    const header = document.createElement('div');
    header.className = 'sticky-header';

    const authorTag = document.createElement('span');
    authorTag.className = 'sticky-author-tag';
    authorTag.textContent = el.author || 'Collaborator';

    const actions = document.createElement('div');
    actions.className = 'sticky-actions';

    const themes = ['yellow', 'coral', 'mint', 'sky', 'lavender'];
    themes.forEach((th) => {
      const dot = document.createElement('span');
      dot.className = 'sticky-color-dot';
      const colors = { yellow: '#FEF08A', coral: '#FECDD3', mint: '#A7F3D0', sky: '#BAE6FD', lavender: '#DDD6FE' };
      dot.style.backgroundColor = colors[th];
      dot.title = `Theme: ${th}`;
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!canCurrentUserDraw()) {
          showToast('🎓 Presentation Mode: Canvas is View-Only.', 'warning');
          return;
        }
        card.className = `sticky-note-card theme-${th}`;
        el.theme = th;
        sound.playClick();
        socket.emit('element:update', { id: el.id, theme: th });
      });
      actions.appendChild(dot);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'sticky-btn-delete';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.title = 'Delete Note';

    ['pointerdown', 'mousedown', 'pointerup', 'click'].forEach((evtType) => {
      deleteBtn.addEventListener(evtType, (e) => e.stopPropagation());
    });

    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!canCurrentUserDraw()) {
        showToast('🎓 Presentation Mode: Only the Host can edit canvas.', 'warning');
        return;
      }
      card.remove();
      state.domElementsMap.delete(el.id);
      state.elements = state.elements.filter((item) => item.id !== el.id);
      sound.playPop();
      socket.emit('element:delete', el.id);
      showToast('Sticky note deleted');
    });

    actions.appendChild(deleteBtn);
    header.appendChild(authorTag);
    header.appendChild(actions);

    const textarea = document.createElement('textarea');
    textarea.className = 'sticky-textarea';
    textarea.placeholder = 'Write note here...';
    textarea.value = el.text || '';

    ['pointerdown', 'mousedown', 'keydown'].forEach((evtType) => {
      textarea.addEventListener(evtType, (e) => e.stopPropagation());
    });

    textarea.addEventListener('focus', () => {
      if (!canCurrentUserDraw()) {
        textarea.blur();
        showToast('🎓 Presentation Mode: Canvas is View-Only.', 'info');
      }
    });

    let typingTimeout = null;
    textarea.addEventListener('input', () => {
      if (!canCurrentUserDraw()) return;
      el.text = textarea.value;
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => socket.emit('element:update', { id: el.id, text: el.text }), 150);
    });

    card.appendChild(header);
    card.appendChild(textarea);

    let isDragging = false;
    let dragStartPos = { x: 0, y: 0 };
    let initialWorldPos = { x: el.x, y: el.y };

    header.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.sticky-actions') || e.target.closest('.sticky-btn-delete')) return;
      if (!canCurrentUserDraw()) return;
      isDragging = true;
      dragStartPos = { x: e.clientX, y: e.clientY };
      initialWorldPos = { x: el.x, y: el.y };
      header.setPointerCapture(e.pointerId);
      card.style.zIndex = '100';
    });

    header.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      el.x = initialWorldPos.x + (e.clientX - dragStartPos.x) / state.zoom;
      el.y = initialWorldPos.y + (e.clientY - dragStartPos.y) / state.zoom;
      syncDomElementPosition(el, card);
    });

    header.addEventListener('pointerup', (e) => {
      if (!isDragging) return;
      isDragging = false;
      card.style.zIndex = '';
      try { header.releasePointerCapture(e.pointerId); } catch (err) {}
      socket.emit('element:update', { id: el.id, x: el.x, y: el.y });
    });

    domLayer.appendChild(card);
    state.domElementsMap.set(el.id, card);
    syncDomElementPosition(el, card);
    return card;
  }

  function createTextBoxNode(el) {
    const box = document.createElement('div');
    box.className = 'board-text-box';
    box.dataset.id = el.id;

    const header = document.createElement('div');
    header.className = 'board-text-header';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'board-text-btn-delete';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.title = 'Delete Text';

    ['pointerdown', 'mousedown', 'pointerup', 'click'].forEach((evtType) => {
      deleteBtn.addEventListener(evtType, (e) => e.stopPropagation());
    });

    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!canCurrentUserDraw()) {
        showToast('🎓 Presentation Mode: Only Host can edit canvas.', 'warning');
        return;
      }
      box.remove();
      state.domElementsMap.delete(el.id);
      state.elements = state.elements.filter((item) => item.id !== el.id);
      sound.playPop();
      socket.emit('element:delete', el.id);
    });

    header.appendChild(deleteBtn);

    const textarea = document.createElement('textarea');
    textarea.className = 'board-text-input';
    textarea.placeholder = 'Type text...';
    textarea.value = el.text || '';
    textarea.style.color = el.color || state.activeColor;
    textarea.style.fontSize = `${Math.max(16, (el.width || 3) * 5)}px`;
    textarea.rows = 1;

    function autoResize() {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }

    ['pointerdown', 'mousedown', 'keydown'].forEach((evtType) => {
      textarea.addEventListener(evtType, (e) => e.stopPropagation());
    });

    let typingTimeout = null;
    textarea.addEventListener('input', () => {
      if (!canCurrentUserDraw()) return;
      autoResize();
      el.text = textarea.value;
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => socket.emit('element:update', { id: el.id, text: el.text }), 150);
    });

    textarea.addEventListener('focus', () => {
      if (!canCurrentUserDraw()) {
        textarea.blur();
        showToast('🎓 Presentation Mode: Canvas is View-Only.', 'info');
        return;
      }
      box.classList.add('active');
    });
    textarea.addEventListener('blur', () => box.classList.remove('active'));

    box.appendChild(header);
    box.appendChild(textarea);

    let isDragging = false;
    let dragStartPos = { x: 0, y: 0 };
    let initialWorldPos = { x: el.x, y: el.y };

    box.addEventListener('pointerdown', (e) => {
      if (e.target === textarea || e.target.closest('.board-text-btn-delete')) return;
      if (!canCurrentUserDraw()) return;
      isDragging = true;
      dragStartPos = { x: e.clientX, y: e.clientY };
      initialWorldPos = { x: el.x, y: el.y };
      box.setPointerCapture(e.pointerId);
    });

    box.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      el.x = initialWorldPos.x + (e.clientX - dragStartPos.x) / state.zoom;
      el.y = initialWorldPos.y + (e.clientY - dragStartPos.y) / state.zoom;
      syncDomElementPosition(el, box);
    });

    box.addEventListener('pointerup', (e) => {
      if (!isDragging) return;
      isDragging = false;
      try { box.releasePointerCapture(e.pointerId); } catch (err) {}
      socket.emit('element:update', { id: el.id, x: el.x, y: el.y });
    });

    domLayer.appendChild(box);
    state.domElementsMap.set(el.id, box);
    syncDomElementPosition(el, box);
    setTimeout(autoResize, 10);
    return box;
  }

  // Code Languages Catalog for Code Representation
  const CODE_LANGUAGES = [
    { id: 'javascript', label: '⚡ JavaScript', ext: 'js', defaultCode: '// JavaScript Code Representation\nfunction calculateStats(items) {\n  return items.reduce((a, b) => a + b, 0);\n}\nconsole.log(calculateStats([10, 20, 30]));' },
    { id: 'python', label: '🐍 Python', ext: 'py', defaultCode: '# Python Code Representation\ndef fibonacci(n):\n    a, b = 0, 1\n    for _ in range(n):\n        yield a\n        a, b = b, a + b\n\nprint(list(fibonacci(6)))' },
    { id: 'typescript', label: '🔷 TypeScript', ext: 'ts', defaultCode: 'interface WhiteboardUser {\n  id: string;\n  name: string;\n  role: string;\n}\nconst user: WhiteboardUser = { id: "01", name: "Alex", role: "Dev" };' },
    { id: 'html', label: '🌐 HTML', ext: 'html', defaultCode: '<div class="hero-card">\n  <h1>Real-Time Canvas</h1>\n  <p>Vector drawing & code display</p>\n</div>' },
    { id: 'css', label: '🎨 CSS', ext: 'css', defaultCode: '.code-card {\n  background: #181825;\n  border: 2px solid #000000;\n  border-radius: 12px;\n  box-shadow: 4px 4px 0px #000;\n}' },
    { id: 'java', label: '☕ Java', ext: 'java', defaultCode: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from CoCanvas!");\n    }\n}' },
    { id: 'cpp', label: '⚙️ C / C++', ext: 'cpp', defaultCode: '#include <iostream>\n#include <vector>\n\nint main() {\n    std::cout << "Fast & concurrent!" << std::endl;\n    return 0;\n}' },
    { id: 'csharp', label: '💜 C#', ext: 'cs', defaultCode: 'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("C# Code Block");\n    }\n}' },
    { id: 'rust', label: '🦀 Rust', ext: 'rs', defaultCode: 'fn main() {\n    let topic = "CoCanvas";\n    println!("Safe concurrency on {}!", topic);\n}' },
    { id: 'go', label: '🐹 Go', ext: 'go', defaultCode: 'package main\nimport "fmt"\n\nfunc main() {\n    fmt.Println("🚀 Real-Time Goroutines")\n}' },
    { id: 'sql', label: '🐬 SQL', ext: 'sql', defaultCode: 'SELECT id, username, room_id, created_at\nFROM active_sessions\nWHERE is_online = true\nORDER BY created_at DESC;' },
    { id: 'json', label: '📦 JSON', ext: 'json', defaultCode: '{\n  "name": "CoCanvas",\n  "version": "2.0",\n  "type": "whiteboard",\n  "realtime": true\n}' },
    { id: 'bash', label: '💻 Bash', ext: 'sh', defaultCode: '#!/bin/bash\necho "Initializing real-time drawing server..."\nnpm start' }
  ];

  function createCodeSnippetNode(el) {
    const card = document.createElement('div');
    card.className = 'code-snippet-card';
    card.dataset.id = el.id;

    el.w = el.w || 560;
    el.h = el.h || 280;
    card.style.width = `${el.w}px`;

    const currentLang = el.language || 'javascript';
    const currentLangObj = CODE_LANGUAGES.find(l => l.id === currentLang) || CODE_LANGUAGES[0];

    // Header
    const header = document.createElement('div');
    header.className = 'code-snippet-header';

    const headerLeft = document.createElement('div');
    headerLeft.className = 'code-header-left';

    const tabBadge = document.createElement('div');
    tabBadge.className = 'code-tab-badge';
    tabBadge.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg> <span>CODE</span>';

    const filenameWrap = document.createElement('div');
    filenameWrap.className = 'code-filename-wrapper';
    filenameWrap.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>';

    const filenameInput = document.createElement('input');
    filenameInput.className = 'code-filename-input';
    filenameInput.value = el.filename || `script.${currentLangObj.ext}`;
    filenameInput.title = 'Rename File';
    filenameWrap.appendChild(filenameInput);

    const langSelect = document.createElement('select');
    langSelect.className = 'code-lang-select';
    CODE_LANGUAGES.forEach((lang) => {
      const opt = document.createElement('option');
      opt.value = lang.id;
      opt.textContent = lang.label;
      if (lang.id === currentLang) opt.selected = true;
      langSelect.appendChild(opt);
    });

    headerLeft.appendChild(tabBadge);
    headerLeft.appendChild(filenameWrap);
    headerLeft.appendChild(langSelect);

    // Header Actions
    const headerActions = document.createElement('div');
    headerActions.className = 'code-header-actions';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'code-btn-copy';
    copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> <span>Copy</span>';
    copyBtn.title = 'Copy Code to Clipboard';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'code-btn-delete';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.title = 'Delete Code Block';

    headerActions.appendChild(copyBtn);
    headerActions.appendChild(deleteBtn);

    header.appendChild(headerLeft);
    header.appendChild(headerActions);

    // Body
    const body = document.createElement('div');
    body.className = 'code-body';
    body.style.height = `${el.h}px`;

    const lineNums = document.createElement('div');
    lineNums.className = 'code-line-numbers';

    const textarea = document.createElement('textarea');
    textarea.className = 'code-textarea';
    textarea.spellcheck = false;
    textarea.autocomplete = 'off';
    textarea.value = el.code !== undefined ? el.code : currentLangObj.defaultCode;

    // Footer
    const footer = document.createElement('div');
    footer.className = 'code-footer';

    const footerAuthor = document.createElement('span');
    footerAuthor.textContent = `Shared by ${el.author || 'Collaborator'}`;

    const footerRight = document.createElement('div');
    footerRight.style.display = 'flex';
    footerRight.style.alignItems = 'center';
    footerRight.style.gap = '8px';

    const footerLines = document.createElement('span');

    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'code-resize-handle';
    resizeHandle.title = 'Drag to Resize Code Window';
    resizeHandle.innerHTML = '<svg viewBox="0 0 10 10" width="10" height="10"><path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="#6C7086" stroke-width="1.8" stroke-linecap="round"/></svg>';

    footerRight.appendChild(footerLines);
    footerRight.appendChild(resizeHandle);

    footer.appendChild(footerAuthor);
    footer.appendChild(footerRight);

    function updateLineNumbers() {
      const lines = (textarea.value || '').split('\n').length;
      lineNums.innerHTML = Array.from({ length: Math.max(1, lines) }, (_, i) => i + 1).join('<br>');
      footerLines.textContent = `${lines} ${lines === 1 ? 'line' : 'lines'}`;
    }

    body.appendChild(lineNums);
    body.appendChild(textarea);

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);

    updateLineNumbers();

    // Event Listeners for Stop Propagation
    ['pointerdown', 'mousedown', 'keydown'].forEach((evtType) => {
      textarea.addEventListener(evtType, (e) => e.stopPropagation());
      filenameInput.addEventListener(evtType, (e) => e.stopPropagation());
      langSelect.addEventListener(evtType, (e) => e.stopPropagation());
    });
    ['pointerdown', 'mousedown', 'click'].forEach((evtType) => {
      copyBtn.addEventListener(evtType, (e) => e.stopPropagation());
      deleteBtn.addEventListener(evtType, (e) => e.stopPropagation());
    });

    // --- Smart IDE Code Editor Engine (Auto-close brackets, Auto-indent on Enter, Tab/Shift+Tab) ---
    const CODE_PAIRS = { '{': '}', '(': ')', '[': ']', '"': '"', "'": "'", '`': '`' };
    const CODE_CLOSING_CHARS = new Set(['}', ')', ']', '"', "'", '`']);

    function triggerCodeSync() {
      updateLineNumbers();
      el.code = textarea.value;
      socket.emit('element:update', { id: el.id, code: el.code });
    }

    textarea.addEventListener('keydown', (e) => {
      if (!canCurrentUserDraw()) return;

      const val = textarea.value;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const isSelection = start !== end;
      const beforeCursor = val.substring(0, start);
      const afterCursor = val.substring(end);

      // 1. Tab & Shift+Tab (Indentation & Outdent)
      if (e.key === 'Tab') {
        e.preventDefault();
        if (isSelection) {
          const firstLineStart = val.lastIndexOf('\n', start - 1) + 1;
          let lastLineEnd = val.indexOf('\n', end);
          if (lastLineEnd === -1) lastLineEnd = val.length;

          const lines = val.substring(firstLineStart, lastLineEnd).split('\n');
          let modifiedLines;
          if (e.shiftKey) {
            modifiedLines = lines.map((l) => l.startsWith('  ') ? l.substring(2) : (l.startsWith(' ') ? l.substring(1) : l));
          } else {
            modifiedLines = lines.map((l) => '  ' + l);
          }
          const replaced = modifiedLines.join('\n');
          textarea.value = val.substring(0, firstLineStart) + replaced + val.substring(lastLineEnd);
          textarea.selectionStart = firstLineStart;
          textarea.selectionEnd = firstLineStart + replaced.length;
        } else {
          if (e.shiftKey) {
            const lineStart = val.lastIndexOf('\n', start - 1) + 1;
            const currentLine = val.substring(lineStart, start);
            if (currentLine.startsWith('  ')) {
              textarea.value = val.substring(0, lineStart) + val.substring(lineStart + 2);
              textarea.selectionStart = textarea.selectionEnd = Math.max(lineStart, start - 2);
            } else if (currentLine.startsWith(' ')) {
              textarea.value = val.substring(0, lineStart) + val.substring(lineStart + 1);
              textarea.selectionStart = textarea.selectionEnd = Math.max(lineStart, start - 1);
            }
          } else {
            textarea.value = beforeCursor + '  ' + afterCursor;
            textarea.selectionStart = textarea.selectionEnd = start + 2;
          }
        }
        triggerCodeSync();
        return;
      }

      // 2. Auto-Closing Pairs: { } ( ) [ ] " " ' ' ` `
      if (CODE_PAIRS[e.key]) {
        const openChar = e.key;
        const closeChar = CODE_PAIRS[openChar];

        if (isSelection) {
          e.preventDefault();
          const selectedText = val.substring(start, end);
          textarea.value = beforeCursor + openChar + selectedText + closeChar + afterCursor;
          textarea.selectionStart = start + 1;
          textarea.selectionEnd = end + 1;
          triggerCodeSync();
          return;
        } else {
          // If typing quote when next char is identical quote, step over
          if ((openChar === '"' || openChar === "'" || openChar === '`') && afterCursor.startsWith(openChar)) {
            e.preventDefault();
            textarea.selectionStart = textarea.selectionEnd = start + 1;
            return;
          }

          e.preventDefault();
          textarea.value = beforeCursor + openChar + closeChar + afterCursor;
          textarea.selectionStart = textarea.selectionEnd = start + 1;
          triggerCodeSync();
          return;
        }
      }

      // 3. Skip Over Closing Characters (Overtype)
      if (CODE_CLOSING_CHARS.has(e.key) && !isSelection) {
        if (afterCursor.startsWith(e.key)) {
          e.preventDefault();
          textarea.selectionStart = textarea.selectionEnd = start + 1;
          return;
        }
      }

      // 4. Smart Backspace: Delete matching empty pair e.g. {|} or (|)
      if (e.key === 'Backspace' && !isSelection && start > 0) {
        const prevChar = beforeCursor.slice(-1);
        const nextChar = afterCursor.charAt(0);
        if (CODE_PAIRS[prevChar] === nextChar) {
          e.preventDefault();
          textarea.value = val.substring(0, start - 1) + val.substring(start + 1);
          textarea.selectionStart = textarea.selectionEnd = start - 1;
          triggerCodeSync();
          return;
        }
      }

      // 5. Intelligent Enter & Auto-Indentation (Java, Python, JS, C++, Rust, Go, HTML, CSS, etc.)
      if (e.key === 'Enter') {
        e.preventDefault();
        const lastNewLine = beforeCursor.lastIndexOf('\n');
        const currentLine = beforeCursor.substring(lastNewLine + 1);
        const indentMatch = currentLine.match(/^[ \t]*/);
        const baseIndent = indentMatch ? indentMatch[0] : '';
        const tabStep = '  '; // 2-space standard indent

        const trimmedLine = currentLine.trim();
        const isBetweenBrackets =
          (beforeCursor.endsWith('{') && afterCursor.startsWith('}')) ||
          (beforeCursor.endsWith('(') && afterCursor.startsWith(')')) ||
          (beforeCursor.endsWith('[') && afterCursor.startsWith(']'));

        if (isBetweenBrackets) {
          // Expand bracket block:
          // {
          //   |
          // }
          const newText = '\n' + baseIndent + tabStep + '\n' + baseIndent;
          textarea.value = beforeCursor + newText + afterCursor;
          const cursorPos = start + 1 + baseIndent.length + tabStep.length;
          textarea.selectionStart = textarea.selectionEnd = cursorPos;
        } else if (
          trimmedLine.endsWith('{') ||
          trimmedLine.endsWith(':') ||
          trimmedLine.endsWith('(') ||
          trimmedLine.endsWith('[') ||
          trimmedLine.endsWith('=>') ||
          trimmedLine.endsWith('->')
        ) {
          // Increase indent level for block openers (Java/JS '{', Python ':', etc.)
          const newText = '\n' + baseIndent + tabStep;
          textarea.value = beforeCursor + newText + afterCursor;
          textarea.selectionStart = textarea.selectionEnd = start + newText.length;
        } else {
          // Maintain current indentation
          const newText = '\n' + baseIndent;
          textarea.value = beforeCursor + newText + afterCursor;
          textarea.selectionStart = textarea.selectionEnd = start + newText.length;
        }

        triggerCodeSync();
        return;
      }
    });

    let codeTimeout = null;
    textarea.addEventListener('input', () => {
      if (!canCurrentUserDraw()) return;
      updateLineNumbers();
      el.code = textarea.value;
      clearTimeout(codeTimeout);
      codeTimeout = setTimeout(() => {
        socket.emit('element:update', { id: el.id, code: el.code });
      }, 150);
    });

    textarea.addEventListener('focus', () => {
      if (!canCurrentUserDraw()) {
        textarea.blur();
        showToast('🎓 Presentation Mode: Canvas is View-Only.', 'info');
      }
    });

    filenameInput.addEventListener('input', () => {
      if (!canCurrentUserDraw()) return;
      el.filename = filenameInput.value;
      socket.emit('element:update', { id: el.id, filename: el.filename });
    });

    filenameInput.addEventListener('focus', () => {
      if (!canCurrentUserDraw()) filenameInput.blur();
    });

    langSelect.addEventListener('change', () => {
      if (!canCurrentUserDraw()) {
        langSelect.value = el.language || 'javascript';
        showToast('🎓 Presentation Mode: Canvas is View-Only.', 'warning');
        return;
      }
      const selectedId = langSelect.value;
      const langObj = CODE_LANGUAGES.find(l => l.id === selectedId) || CODE_LANGUAGES[0];
      el.language = selectedId;
      if (!el.filename || el.filename.startsWith('script.')) {
        el.filename = `script.${langObj.ext}`;
        filenameInput.value = el.filename;
      }
      if (!textarea.value.trim() || CODE_LANGUAGES.some(l => l.defaultCode === textarea.value)) {
        textarea.value = langObj.defaultCode;
        el.code = langObj.defaultCode;
        updateLineNumbers();
      }
      sound.playClick();
      socket.emit('element:update', { id: el.id, language: el.language, filename: el.filename, code: el.code });
    });

    copyBtn.addEventListener('click', () => {
      copyTextToClipboard(textarea.value, 'Code copied to clipboard! 📋');
      copyBtn.innerHTML = '<span>✅ Copied!</span>';
      setTimeout(() => {
        copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> <span>Copy</span>';
      }, 1500);
    });

    deleteBtn.addEventListener('click', () => {
      e.stopPropagation();
      if (!canCurrentUserDraw()) {
        showToast('🎓 Presentation Mode: Only Host can edit canvas.', 'warning');
        return;
      }
      card.remove();
      state.domElementsMap.delete(el.id);
      state.elements = state.elements.filter((item) => item.id !== el.id);
      sound.playPop();
      socket.emit('element:delete', el.id);
      showToast('Deleted code block');
    });

    // Drag header to move
    let isDragging = false;
    let dragStartPos = { x: 0, y: 0 };
    let initialWorldPos = { x: el.x, y: el.y };

    header.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.code-header-actions') || e.target === langSelect || e.target === filenameInput) return;
      if (!canCurrentUserDraw()) return;
      isDragging = true;
      dragStartPos = { x: e.clientX, y: e.clientY };
      initialWorldPos = { x: el.x, y: el.y };
      header.setPointerCapture(e.pointerId);
      card.style.zIndex = '100';
    });

    header.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      el.x = initialWorldPos.x + (e.clientX - dragStartPos.x) / state.zoom;
      el.y = initialWorldPos.y + (e.clientY - dragStartPos.y) / state.zoom;
      syncDomElementPosition(el, card);
    });

    header.addEventListener('pointerup', (e) => {
      if (!isDragging) return;
      isDragging = false;
      card.style.zIndex = '';
      try { header.releasePointerCapture(e.pointerId); } catch (err) {}
      socket.emit('element:update', { id: el.id, x: el.x, y: el.y });
    });

    // Corner Resize Handle Logic
    let isResizing = false;
    let resizeStartPos = { x: 0, y: 0 };
    let startDimensions = { w: el.w, h: el.h };

    resizeHandle.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      isResizing = true;
      resizeStartPos = { x: e.clientX, y: e.clientY };
      startDimensions = { w: el.w || card.offsetWidth, h: el.h || body.offsetHeight };
      resizeHandle.setPointerCapture(e.pointerId);
      card.style.zIndex = '100';
    });

    resizeHandle.addEventListener('pointermove', (e) => {
      if (!isResizing) return;
      const dx = (e.clientX - resizeStartPos.x) / state.zoom;
      const dy = (e.clientY - resizeStartPos.y) / state.zoom;

      const newW = Math.max(340, Math.round(startDimensions.w + dx));
      const newH = Math.max(140, Math.round(startDimensions.h + dy));

      el.w = newW;
      el.h = newH;
      card.style.width = `${newW}px`;
      body.style.height = `${newH}px`;
    });

    resizeHandle.addEventListener('pointerup', (e) => {
      if (!isResizing) return;
      isResizing = false;
      card.style.zIndex = '';
      try { resizeHandle.releasePointerCapture(e.pointerId); } catch (err) {}
      socket.emit('element:update', { id: el.id, w: el.w, h: el.h });
      sound.playClick();
    });

    domLayer.appendChild(card);
    state.domElementsMap.set(el.id, card);
    syncDomElementPosition(el, card);
    return card;
  }

  // --- 10. Selection Handles ---
  function selectElement(id) {
    state.selectedElementId = id;
    updateSelectionBoxPosition();
  }

  function clearSelection() {
    state.selectedElementId = null;
    selectionBox.classList.add('hidden');
  }

  function updateSelectionBoxPosition() {
    if (!state.selectedElementId) {
      selectionBox.classList.add('hidden');
      return;
    }
    const el = state.elements.find((item) => item.id === state.selectedElementId);
    if (!el || el.type === 'sticky' || el.type === 'text' || el.type === 'code') {
      selectionBox.classList.add('hidden');
      return;
    }

    const bounds = getElementBounds(el);
    const sTopLeft = worldToScreen(bounds.minX, bounds.minY);
    const sBottomRight = worldToScreen(bounds.maxX, bounds.maxY);

    selectionBox.style.left = `${sTopLeft.x}px`;
    selectionBox.style.top = `${sTopLeft.y}px`;
    selectionBox.style.width = `${sBottomRight.x - sTopLeft.x}px`;
    selectionBox.style.height = `${sBottomRight.y - sTopLeft.y}px`;
    selectionBox.classList.remove('hidden');
  }

  selectionDeleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!state.selectedElementId) return;
    if (!canCurrentUserDraw()) {
      showToast('🎓 Presentation Mode: Only Host can edit canvas.', 'warning');
      return;
    }
    const id = state.selectedElementId;
    state.elements = state.elements.filter((item) => item.id !== id);
    clearSelection();
    redrawBoard();
    sound.playPop();
    socket.emit('element:delete', id);
    showToast('Deleted element');
  });

  // Selection Box Direct Drag-to-Move
  selectionBox.addEventListener('pointerdown', (e) => {
    // If clicking a resize handle or delete button, let their specific listeners handle it
    if (e.target.closest('.selection-handle') || e.target.closest('.selection-delete-btn')) return;
    if (!canCurrentUserDraw()) return;
    e.stopPropagation();

    const el = state.elements.find((item) => item.id === state.selectedElementId);
    if (!el) return;

    state.isDraggingElement = true;
    state.dragElementStart = {
      clientX: e.clientX,
      clientY: e.clientY,
      elX: el.x || 0,
      elY: el.y || 0
    };
    selectionBox.setPointerCapture(e.pointerId);
  });

  selectionBox.addEventListener('pointermove', (e) => {
    if (!state.isDraggingElement || !state.dragElementStart) return;
    const el = state.elements.find((item) => item.id === state.selectedElementId);
    if (!el) return;

    const dx = (e.clientX - state.dragElementStart.clientX) / state.zoom;
    const dy = (e.clientY - state.dragElementStart.clientY) / state.zoom;

    el.x = state.dragElementStart.elX + dx;
    el.y = state.dragElementStart.elY + dy;

    updateSelectionBoxPosition();
    redrawBoard();
  });

  function endSelectionDrag(e) {
    if (!state.isDraggingElement) return;
    state.isDraggingElement = false;
    try { selectionBox.releasePointerCapture(e.pointerId); } catch (err) {}
    const el = state.elements.find((item) => item.id === state.selectedElementId);
    if (el) {
      socket.emit('element:update', el);
      sound.playClick();
    }
  }

  selectionBox.addEventListener('pointerup', endSelectionDrag);
  selectionBox.addEventListener('pointercancel', endSelectionDrag);

  selectionBox.querySelectorAll('.selection-handle').forEach((handle) => {
    handle.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (!canCurrentUserDraw()) return;
      const el = state.elements.find((item) => item.id === state.selectedElementId);
      if (!el) return;

      state.isTransforming = true;
      state.transformHandle = handle.dataset.handle;
      state.transformStart = {
        clientX: e.clientX,
        clientY: e.clientY,
        elX: el.x || 0,
        elY: el.y || 0,
        elW: el.w || 100,
        elH: el.h || 100
      };
      handle.setPointerCapture(e.pointerId);
    });

    handle.addEventListener('pointermove', (e) => {
      if (!state.isTransforming) return;
      const el = state.elements.find((item) => item.id === state.selectedElementId);
      if (!el) return;

      const dx = (e.clientX - state.transformStart.clientX) / state.zoom;
      const dy = (e.clientY - state.transformStart.clientY) / state.zoom;
      const hType = state.transformHandle;

      if (hType.includes('e')) el.w = Math.max(20, state.transformStart.elW + dx);
      if (hType.includes('s')) el.h = Math.max(20, state.transformStart.elH + dy);
      if (hType.includes('w')) {
        const newW = Math.max(20, state.transformStart.elW - dx);
        el.x = state.transformStart.elX + (state.transformStart.elW - newW);
        el.w = newW;
      }
      if (hType.includes('n')) {
        const newH = Math.max(20, state.transformStart.elH - dy);
        el.y = state.transformStart.elY + (state.transformStart.elH - newH);
        el.h = newH;
      }
      redrawBoard();
    });

    handle.addEventListener('pointerup', (e) => {
      if (!state.isTransforming) return;
      state.isTransforming = false;
      try { handle.releasePointerCapture(e.pointerId); } catch (err) {}
      const el = state.elements.find((item) => item.id === state.selectedElementId);
      if (el) socket.emit('element:update', el);
    });
  });

  // --- 11. 60fps VFX Engine (Laser, Cursors, Chat, Radar, Particles) ---
  function addEmojiBurst(emoji, screenX, screenY) {
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 2.5 + Math.random() * 4.5;
      state.particles.push({
        emoji,
        x: screenX,
        y: screenY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5,
        gravity: 0.14,
        size: 20 + Math.random() * 14,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.15,
        opacity: 1.0,
        decay: 0.015 + Math.random() * 0.01
      });
    }
  }

  function addRadarPing(screenX, screenY, color, label) {
    state.radarPings.push({
      x: screenX,
      y: screenY,
      radius: 4,
      maxRadius: 100,
      opacity: 0.9,
      color: color || '#FF6B4A',
      label: label || 'Attention!'
    });
  }

  function addLaserPoint(screenX, screenY, color) {
    state.laserTrails.push({
      x: screenX,
      y: screenY,
      color: color || '#FF6B4A',
      radius: 6,
      opacity: 1.0,
      decay: 0.03
    });
  }

  function renderVFXLoop() {
    cursorCtx.clearRect(0, 0, viewWidth, viewHeight);

    // Laser
    for (let i = state.laserTrails.length - 1; i >= 0; i--) {
      const lp = state.laserTrails[i];
      lp.opacity -= lp.decay;
      lp.radius *= 0.96;
      if (lp.opacity <= 0) {
        state.laserTrails.splice(i, 1);
        continue;
      }
      cursorCtx.save();
      cursorCtx.globalAlpha = lp.opacity;
      cursorCtx.shadowColor = lp.color;
      cursorCtx.shadowBlur = 12;
      cursorCtx.fillStyle = lp.color;
      cursorCtx.beginPath();
      cursorCtx.arc(lp.x, lp.y, Math.max(1, lp.radius), 0, Math.PI * 2);
      cursorCtx.fill();
      cursorCtx.restore();
    }

    // Radar
    for (let i = state.radarPings.length - 1; i >= 0; i--) {
      const ping = state.radarPings[i];
      ping.radius += 2.2;
      ping.opacity -= 0.018;
      if (ping.opacity <= 0 || ping.radius >= ping.maxRadius) {
        state.radarPings.splice(i, 1);
        continue;
      }
      cursorCtx.save();
      cursorCtx.strokeStyle = ping.color;
      cursorCtx.lineWidth = 2.5;
      cursorCtx.globalAlpha = ping.opacity;
      cursorCtx.beginPath();
      cursorCtx.arc(ping.x, ping.y, ping.radius, 0, Math.PI * 2);
      cursorCtx.stroke();
      if (ping.radius > 20) {
        cursorCtx.beginPath();
        cursorCtx.arc(ping.x, ping.y, ping.radius * 0.65, 0, Math.PI * 2);
        cursorCtx.stroke();
      }
      cursorCtx.fillStyle = ping.color;
      cursorCtx.beginPath();
      cursorCtx.arc(ping.x, ping.y, 5, 0, Math.PI * 2);
      cursorCtx.fill();
      if (ping.label) {
        cursorCtx.font = '600 12px "Plus Jakarta Sans", sans-serif';
        cursorCtx.fillStyle = '#FFFFFF';
        cursorCtx.textAlign = 'center';
        cursorCtx.fillText(ping.label, ping.x, ping.y - ping.radius - 8);
      }
      cursorCtx.restore();
    }

    // Remote Cursors
    state.collaborators.forEach((peer) => {
      if (!peer.cursor) return;
      const screenPos = worldToScreen(peer.cursor.x, peer.cursor.y);
      const color = peer.color || '#FF6B4A';

      cursorCtx.save();
      cursorCtx.translate(screenPos.x, screenPos.y);
      cursorCtx.fillStyle = color;
      cursorCtx.strokeStyle = '#0C0E14';
      cursorCtx.lineWidth = 1.5;

      cursorCtx.beginPath();
      cursorCtx.moveTo(0, 0);
      cursorCtx.lineTo(0, 16);
      cursorCtx.lineTo(4.5, 12);
      cursorCtx.lineTo(8.5, 19);
      cursorCtx.lineTo(11, 18);
      cursorCtx.lineTo(7, 11);
      cursorCtx.lineTo(12, 11);
      cursorCtx.closePath();
      cursorCtx.fill();
      const isImg = isImageAvatar(peer.avatar);
      let imgObj = null;
      if (isImg) {
        if (!remoteAvatarImageCache.has(peer.avatar)) {
          const img = new Image();
          img.src = peer.avatar;
          remoteAvatarImageCache.set(peer.avatar, img);
        }
        imgObj = remoteAvatarImageCache.get(peer.avatar);
      }

      const displayName = peer.name || 'Collaborator';
      const isPeerHost = state.hostSessionId && peer.sessionId === state.hostSessionId;

      // 2. Avatar Circle (positioned under the cursor arrow)
      const circleCenterX = 14;
      const circleCenterY = 28;
      const circleRadius = 13;

      // Circle drop shadow
      cursorCtx.save();
      cursorCtx.shadowColor = 'rgba(0, 0, 0, 0.25)';
      cursorCtx.shadowBlur = 4;
      cursorCtx.shadowOffsetY = 2;

      // Circle background fill
      cursorCtx.fillStyle = '#FFFFFF';
      cursorCtx.beginPath();
      cursorCtx.arc(circleCenterX, circleCenterY, circleRadius, 0, Math.PI * 2);
      cursorCtx.fill();
      cursorCtx.restore();

      // Circle colored border
      cursorCtx.strokeStyle = color;
      cursorCtx.lineWidth = 2.5;
      cursorCtx.beginPath();
      cursorCtx.arc(circleCenterX, circleCenterY, circleRadius, 0, Math.PI * 2);
      cursorCtx.stroke();

      // Circle subtle dark outer rim
      cursorCtx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
      cursorCtx.lineWidth = 1;
      cursorCtx.beginPath();
      cursorCtx.arc(circleCenterX, circleCenterY, circleRadius + 1, 0, Math.PI * 2);
      cursorCtx.stroke();

      // Render Avatar inside Circle
      if (isImg && imgObj && imgObj.complete && imgObj.naturalWidth > 0) {
        cursorCtx.save();
        cursorCtx.beginPath();
        cursorCtx.arc(circleCenterX, circleCenterY, circleRadius - 1.5, 0, Math.PI * 2);
        cursorCtx.clip();
        cursorCtx.drawImage(
          imgObj,
          circleCenterX - circleRadius + 1.5,
          circleCenterY - circleRadius + 1.5,
          (circleRadius - 1.5) * 2,
          (circleRadius - 1.5) * 2
        );
        cursorCtx.restore();
      } else {
        // Emoji avatar
        cursorCtx.font = '14px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
        cursorCtx.textAlign = 'center';
        cursorCtx.textBaseline = 'middle';
        cursorCtx.fillText(peer.avatar || '👤', circleCenterX, circleCenterY + 1);
      }

      // Host crown indicator
      if (isPeerHost) {
        cursorCtx.font = '10px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
        cursorCtx.textAlign = 'center';
        cursorCtx.textBaseline = 'middle';
        cursorCtx.fillText('👑', circleCenterX + 10, circleCenterY - 9);
      }

      // 3. Name Label (Centered directly UNDER the Avatar Circle)
      cursorCtx.font = '700 10.5px "Plus Jakarta Sans", sans-serif';
      const textWidth = cursorCtx.measureText(displayName).width;
      const nameBadgeH = 19;
      const nameBadgeW = Math.max(34, textWidth + 14);
      const nameBadgeX = circleCenterX - nameBadgeW / 2;
      const nameBadgeY = circleCenterY + circleRadius + 4;

      // Badge pill background
      cursorCtx.save();
      cursorCtx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      cursorCtx.shadowBlur = 3;
      cursorCtx.shadowOffsetY = 1.5;
      cursorCtx.fillStyle = color;
      cursorCtx.beginPath();
      if (cursorCtx.roundRect) cursorCtx.roundRect(nameBadgeX, nameBadgeY, nameBadgeW, nameBadgeH, 6);
      else cursorCtx.rect(nameBadgeX, nameBadgeY, nameBadgeW, nameBadgeH);
      cursorCtx.fill();
      cursorCtx.restore();

      // Badge stroke
      cursorCtx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      cursorCtx.lineWidth = 1;
      cursorCtx.beginPath();
      if (cursorCtx.roundRect) cursorCtx.roundRect(nameBadgeX, nameBadgeY, nameBadgeW, nameBadgeH, 6);
      else cursorCtx.rect(nameBadgeX, nameBadgeY, nameBadgeW, nameBadgeH);
      cursorCtx.stroke();

      // Badge text
      cursorCtx.fillStyle = '#FFFFFF';
      cursorCtx.textAlign = 'center';
      cursorCtx.textBaseline = 'middle';
      cursorCtx.fillText(displayName, circleCenterX, nameBadgeY + nameBadgeH / 2 + 0.5);

      if (peer.chatText && peer.chatText.trim().length > 0) {
        cursorCtx.font = '600 13px "Plus Jakarta Sans", sans-serif';
        const chatW = Math.max(80, cursorCtx.measureText(peer.chatText).width + 20);
        const chatH = 28;

        cursorCtx.fillStyle = '#181B24';
        cursorCtx.strokeStyle = color;
        cursorCtx.lineWidth = 1.5;

        cursorCtx.beginPath();
        if (cursorCtx.roundRect) cursorCtx.roundRect(14, -36, chatW, chatH, 8);
        else cursorCtx.rect(14, -36, chatW, chatH);
        cursorCtx.fill();
        cursorCtx.stroke();

        cursorCtx.fillStyle = '#FFFFFF';
        cursorCtx.textAlign = 'left';
        cursorCtx.textBaseline = 'middle';
        cursorCtx.fillText(peer.chatText, 24, -36 + chatH / 2);
      }
      cursorCtx.restore();
    });

    // Particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rotation += p.vRot;
      p.opacity -= p.decay;

      if (p.opacity <= 0) {
        state.particles.splice(i, 1);
        continue;
      }

      cursorCtx.save();
      cursorCtx.globalAlpha = p.opacity;
      cursorCtx.translate(p.x, p.y);
      cursorCtx.rotate(p.rotation);
      cursorCtx.font = `${p.size}px sans-serif`;
      cursorCtx.textAlign = 'center';
      cursorCtx.textBaseline = 'middle';
      cursorCtx.fillText(p.emoji, 0, 0);
      cursorCtx.restore();
    }

    requestAnimationFrame(renderVFXLoop);
  }

  requestAnimationFrame(renderVFXLoop);

  // --- 12. Mouse & Drawing Pipeline ---
  let isDrawing = false;
  let activeStrokePoints = [];
  let currentShapeStart = null;
  let lastClientPos = { x: 0, y: 0 };
  let lastBroadcastTime = 0;

  function broadcastCursor(clientX, clientY, chatText) {
    const now = performance.now();
    if (now - lastBroadcastTime > 30 || chatText !== undefined) {
      lastBroadcastTime = now;
      const worldPos = screenToWorld(clientX, clientY);
      socket.emit('cursor:move', {
        x: worldPos.x,
        y: worldPos.y,
        chatText: chatText !== undefined ? chatText : (state.localChatActive ? cursorChatInput.value : '')
      });
    }
  }

  // --- Room Mode & Permissions Helpers ---
  function isCurrentUserHost() {
    return !state.hostSessionId || state.hostSessionId === state.user.sessionId;
  }

  function canCurrentUserDraw() {
    if (!state.roomMode || state.roomMode === 'friendly') return true;
    return isCurrentUserHost();
  }

  function updateRoomModeUI() {
    const isHost = isCurrentUserHost();
    const isFriendly = !state.roomMode || state.roomMode === 'friendly';

    if (btnModeFriendly) btnModeFriendly.classList.toggle('active', isFriendly);
    if (btnModeHost) btnModeHost.classList.toggle('active', !isFriendly);

    if (roomModeBtn) {
      if (isFriendly) {
        roomModeBtn.classList.remove('is-host-mode');
        if (roomModeIcon) roomModeIcon.textContent = '🤝';
        if (roomModeLabel) roomModeLabel.textContent = isHost ? 'Friendly Mode' : 'Friendly (All Draw)';
      } else {
        roomModeBtn.classList.add('is-host-mode');
        if (roomModeIcon) roomModeIcon.textContent = '🎓';
        if (roomModeLabel) roomModeLabel.textContent = isHost ? 'Host Mode' : 'View Only (Host Mode)';
      }

      if (isHost) {
        roomModeBtn.classList.remove('read-only-badge');
        roomModeBtn.title = 'Switch Canvas Access Mode (Friendly vs Host Presentation)';
      } else {
        roomModeBtn.classList.add('read-only-badge');
        roomModeBtn.title = isFriendly ? 'Friendly Mode: Everyone can draw' : 'Presentation Mode: Controlled by Host';
      }
    }

    if (presentationBanner) {
      if (!isFriendly && !isHost) {
        presentationBanner.classList.remove('hidden');
      } else {
        presentationBanner.classList.add('hidden');
      }
    }

    const isDrawForbidden = !isFriendly && !isHost;
    if (dockButtons) {
      dockButtons.forEach((btn) => {
        const tool = btn.getAttribute('data-tool');
        if (tool && tool !== 'select' && tool !== 'laser') {
          btn.classList.toggle('mode-disabled', isDrawForbidden);
        }
      });
    }

    if (isDrawForbidden && state.activeTool !== 'select' && state.activeTool !== 'laser') {
      state.activeTool = 'select';
      updateActiveToolUI();
    }
  }

  function setupCanvasEvents() {
    boardCanvas.addEventListener('pointerdown', (e) => {
      dismissAllPopovers();
      lastClientPos = { x: e.clientX, y: e.clientY };

      if (state.spacePressed || e.button === 1 || (state.activeTool === 'select' && e.button === 0 && !e.altKey && !hitTestAnyElement(screenToWorld(e.clientX, e.clientY)))) {
        state.isPanning = true;
        state.panStart = { x: e.clientX - state.panX, y: e.clientY - state.panY };
        boardCanvas.style.cursor = 'grabbing';
        clearSelection();
        return;
      }

      if (e.button !== 0) return;
      const worldPos = screenToWorld(e.clientX, e.clientY);

      if (!canCurrentUserDraw() && state.activeTool !== 'select' && state.activeTool !== 'laser') {
        showToast('🎓 Presentation Mode: Canvas is View-Only for participants.', 'warning');
        return;
      }

      if (state.activeTool === 'select') {
        const hitId = hitTestAnyElement(worldPos);
        if (hitId) {
          selectElement(hitId);
          sound.playClick();
          const el = state.elements.find((item) => item.id === hitId);
          if (el && canCurrentUserDraw()) {
            state.isDraggingElement = true;
            state.dragElementStart = {
              clientX: e.clientX,
              clientY: e.clientY,
              elX: el.x || 0,
              elY: el.y || 0
            };
          }
        } else {
          clearSelection();
        }
        return;
      }

      if (state.activeTool === 'laser') {
        isDrawing = true;
        addLaserPoint(e.clientX, e.clientY, state.user.color);
        socket.emit('laser:trail', { x: worldPos.x, y: worldPos.y, color: state.user.color });
        return;
      }

      if (state.activeTool === 'sticky') {
        const newSticky = {
          id: 'sticky_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          type: 'sticky',
          x: worldPos.x - 100,
          y: worldPos.y - 80,
          theme: 'yellow',
          text: '',
          author: state.user.name || state.user.username
        };
        state.elements.push(newSticky);
        createStickyNoteNode(newSticky);
        sound.playPop();
        socket.emit('element:add', newSticky);
        state.activeTool = 'select';
        updateActiveToolUI();
        return;
      }

      if (state.activeTool === 'text') {
        const newText = {
          id: 'text_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          type: 'text',
          x: worldPos.x,
          y: worldPos.y,
          text: '',
          color: state.activeColor,
          width: state.activeWidth
        };
        state.elements.push(newText);
        const node = createTextBoxNode(newText);
        sound.playClick();
        socket.emit('element:add', newText);
        state.activeTool = 'select';
        updateActiveToolUI();
        const textarea = node.querySelector('textarea');
        if (textarea) setTimeout(() => textarea.focus(), 50);
        return;
      }

      if (state.activeTool === 'code') {
        const newCode = {
          id: 'code_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          type: 'code',
          x: worldPos.x - 280,
          y: worldPos.y - 150,
          w: 560,
          h: 280,
          language: 'javascript',
          filename: 'script.js',
          code: '// JavaScript Code Representation\nfunction calculateStats(items) {\n  return items.reduce((a, b) => a + b, 0);\n}\nconsole.log(calculateStats([10, 20, 30]));',
          author: state.user.name || state.user.username || 'Collaborator'
        };
        state.elements.push(newCode);
        const node = createCodeSnippetNode(newCode);
        sound.playPop();
        socket.emit('element:add', newCode);
        state.activeTool = 'select';
        updateActiveToolUI();
        const textarea = node.querySelector('textarea');
        if (textarea) setTimeout(() => textarea.focus(), 50);
        showToast('💻 Code snippet placed');
        return;
      }

      if (state.activeTool === 'eraser') {
        eraseAtPoint(worldPos);
        isDrawing = true;
        return;
      }

      isDrawing = true;
      activeStrokePoints = [worldPos];
      currentShapeStart = worldPos;
      sound.playClick();
    });

    window.addEventListener('pointermove', (e) => {
      lastClientPos = { x: e.clientX, y: e.clientY };
      broadcastCursor(e.clientX, e.clientY);

      if (state.localChatActive) positionLocalChatBubble(e.clientX, e.clientY);

      if (state.isPanning) {
        state.panX = e.clientX - state.panStart.x;
        state.panY = e.clientY - state.panStart.y;
        renderGrid();
        redrawBoard();
        syncAllDomElementPositions();
        return;
      }

      if (state.isDraggingElement && state.dragElementStart && state.selectedElementId) {
        const el = state.elements.find((item) => item.id === state.selectedElementId);
        if (el) {
          const dx = (e.clientX - state.dragElementStart.clientX) / state.zoom;
          const dy = (e.clientY - state.dragElementStart.clientY) / state.zoom;
          el.x = state.dragElementStart.elX + dx;
          el.y = state.dragElementStart.elY + dy;
          updateSelectionBoxPosition();
          redrawBoard();
          return;
        }
      }

      if (!isDrawing) return;
      const worldPos = screenToWorld(e.clientX, e.clientY);

      if (state.activeTool === 'laser') {
        addLaserPoint(e.clientX, e.clientY, state.user.color);
        socket.emit('laser:trail', { x: worldPos.x, y: worldPos.y, color: state.user.color });
        return;
      }

      if (state.activeTool === 'eraser') {
        eraseAtPoint(worldPos);
        return;
      }

      if (state.activeTool === 'pen' || state.activeTool === 'highlighter') {
        activeStrokePoints.push(worldPos);
        draftCtx.clearRect(0, 0, viewWidth, viewHeight);
        drawElement(draftCtx, {
          type: state.activeTool,
          points: activeStrokePoints,
          color: state.activeColor,
          width: state.activeWidth
        });
      } else if (['rect', 'circle', 'line', 'arrow'].includes(state.activeTool)) {
        draftCtx.clearRect(0, 0, viewWidth, viewHeight);
        const previewElement = getShapeElementObject(state.activeTool, currentShapeStart, worldPos);
        if (previewElement) drawElement(draftCtx, previewElement);
      }
    });

    window.addEventListener('pointerup', (e) => {
      if (state.isPanning) {
        state.isPanning = false;
        boardCanvas.style.cursor = state.activeTool === 'select' ? 'default' : 'crosshair';
      }

      if (state.isDraggingElement) {
        state.isDraggingElement = false;
        state.dragElementStart = null;
        const el = state.elements.find((item) => item.id === state.selectedElementId);
        if (el) {
          socket.emit('element:update', el);
          sound.playClick();
        }
      }

      if (!isDrawing) return;
      isDrawing = false;
      draftCtx.clearRect(0, 0, viewWidth, viewHeight);

      if (state.activeTool === 'eraser' || state.activeTool === 'laser') return;

      const worldPos = screenToWorld(e.clientX, e.clientY);

      if (state.activeTool === 'pen' || state.activeTool === 'highlighter') {
        if (activeStrokePoints.length === 1) {
          activeStrokePoints.push({ x: activeStrokePoints[0].x + 0.1, y: activeStrokePoints[0].y + 0.1 });
        }
        if (activeStrokePoints.length > 1) {
          const simplified = simplifyPoints(activeStrokePoints, 1.5);
          const newEl = {
            id: 'stroke_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            type: state.activeTool,
            points: simplified,
            color: state.activeColor,
            width: state.activeWidth
          };
          commitNewElement(newEl);
        }
      } else if (['rect', 'circle', 'line', 'arrow'].includes(state.activeTool)) {
        const newEl = getShapeElementObject(state.activeTool, currentShapeStart, worldPos);
        if (newEl) commitNewElement(newEl);
      }
      activeStrokePoints = [];
      currentShapeStart = null;
    });

    boardCanvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = 1.08;
      const oldZoom = state.zoom;
      let newZoom = e.deltaY < 0 ? oldZoom * zoomFactor : oldZoom / zoomFactor;
      newZoom = Math.max(0.2, Math.min(4.0, newZoom));

      if (newZoom === oldZoom) return;
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      state.panX = mouseX - (mouseX - state.panX) * (newZoom / oldZoom);
      state.panY = mouseY - (mouseY - state.panY) * (newZoom / oldZoom);
      state.zoom = newZoom;

      updateZoomUI();
      renderGrid();
      redrawBoard();
      syncAllDomElementPositions();
    }, { passive: false });

    boardCanvas.addEventListener('dblclick', (e) => {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      addRadarPing(e.clientX, e.clientY, state.user.color, state.user.name || state.user.username);
      sound.playRadarPing();
      socket.emit('radar:ping', {
        x: worldPos.x,
        y: worldPos.y,
        color: state.user.color,
        userName: state.user.name || state.user.username
      });
      showToast('Attention Ping Sent!');
    });

    // Touch Gestures: Multi-touch Pinch to Zoom & 2-Finger Pan
    let initialPinchDist = null;
    let initialPinchZoom = 1.0;
    let initialTouchCenter = { x: 0, y: 0 };
    let initialPanPos = { x: 0, y: 0 };

    boardCanvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        initialPinchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        initialPinchZoom = state.zoom;
        initialTouchCenter = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2
        };
        initialPanPos = { x: state.panX, y: state.panY };
        isDrawing = false;
        draftCtx.clearRect(0, 0, viewWidth, viewHeight);
      }
    }, { passive: false });

    boardCanvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && initialPinchDist) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const currentCenter = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2
        };

        const zoomRatio = currentDist / initialPinchDist;
        let newZoom = initialPinchZoom * zoomRatio;
        newZoom = Math.max(0.2, Math.min(4.0, newZoom));

        state.panX = initialPanPos.x + (currentCenter.x - initialTouchCenter.x);
        state.panY = initialPanPos.y + (currentCenter.y - initialTouchCenter.y);
        state.zoom = newZoom;

        updateZoomUI();
        renderGrid();
        redrawBoard();
        syncAllDomElementPositions();
      }
    }, { passive: false });

    boardCanvas.addEventListener('touchend', (e) => {
      if (e.touches.length < 2) {
        initialPinchDist = null;
      }
    });
  }

  function hitTestAnyElement(worldPos) {
    for (let i = state.elements.length - 1; i >= 0; i--) {
      const el = state.elements[i];
      if (el.type === 'rect' || el.type === 'image') {
        if (worldPos.x >= el.x && worldPos.x <= el.x + el.w && worldPos.y >= el.y && worldPos.y <= el.y + el.h) return el.id;
      } else if (el.type === 'circle') {
        const cx = el.x + el.w / 2;
        const cy = el.y + el.h / 2;
        const rx = el.w / 2;
        const ry = el.h / 2;
        if (Math.pow((worldPos.x - cx) / Math.max(1, rx), 2) + Math.pow((worldPos.y - cy) / Math.max(1, ry), 2) <= 1.0) return el.id;
      }
    }
    return null;
  }

  function getShapeElementObject(tool, start, end) {
    const id = 'shape_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    if (tool === 'rect' || tool === 'circle') {
      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const w = Math.abs(end.x - start.x);
      const h = Math.abs(end.y - start.y);
      if (w < 2 && h < 2) return null;
      return { id, type: tool, x, y, w, h, color: state.activeColor, width: state.activeWidth };
    } else if (tool === 'line' || tool === 'arrow') {
      const dist = Math.hypot(end.x - start.x, end.y - start.y);
      if (dist < 3) return null;
      return { id, type: tool, x1: start.x, y1: start.y, x2: end.x, y2: end.y, color: state.activeColor, width: state.activeWidth };
    }
    return null;
  }

  function commitNewElement(el) {
    state.elements.push(el);
    state.undoStack.push({ type: 'add', element: el });
    state.redoStack = [];
    redrawBoard();
    socket.emit('element:add', el);
  }

  function eraseAtPoint(worldPos) {
    const threshold = 18 / state.zoom;
    let erasedAny = false;

    for (let i = state.elements.length - 1; i >= 0; i--) {
      const el = state.elements[i];
      let hit = false;

      if (el.type === 'pen' || el.type === 'highlighter') {
        for (let j = 0; j < el.points.length; j++) {
          if (Math.hypot(el.points[j].x - worldPos.x, el.points[j].y - worldPos.y) < threshold) {
            hit = true;
            break;
          }
        }
      } else if (el.type === 'rect' || el.type === 'image') {
        hit = worldPos.x >= el.x && worldPos.x <= el.x + el.w && worldPos.y >= el.y && worldPos.y <= el.y + el.h;
      } else if (el.type === 'circle') {
        const cx = el.x + el.w / 2;
        const cy = el.y + el.h / 2;
        const rx = el.w / 2;
        const ry = el.h / 2;
        hit = Math.pow((worldPos.x - cx) / Math.max(1, rx), 2) + Math.pow((worldPos.y - cy) / Math.max(1, ry), 2) <= 1.2;
      } else if (el.type === 'line' || el.type === 'arrow') {
        hit = distToSegment(worldPos, { x: el.x1, y: el.y1 }, { x: el.x2, y: el.y2 }) < threshold;
      }

      if (hit) {
        state.undoStack.push({ type: 'delete', element: el });
        state.redoStack = [];
        state.elements.splice(i, 1);
        socket.emit('element:delete', el.id);
        erasedAny = true;
      }
    }

    if (erasedAny) {
      sound.playClick();
      redrawBoard();
    }
  }

  function distToSegment(p, v, w) {
    const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  }

  // Images
  function insertImageIntoWorld(src, worldX, worldY) {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      const maxDim = 320;
      let w = img.naturalWidth || 300;
      let h = img.naturalHeight || 200;
      if (w > maxDim || h > maxDim) {
        const ratio = Math.min(maxDim / w, maxDim / h);
        w *= ratio;
        h *= ratio;
      }
      const imgElement = {
        id: 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        type: 'image',
        src,
        x: worldX - w / 2,
        y: worldY - h / 2,
        w,
        h
      };
      state.imageElementsMap.set(imgElement.id, img);
      commitNewElement(imgElement);
      selectElement(imgElement.id);
      sound.playPop();
      showToast('Image inserted');
    };
  }

  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!canCurrentUserDraw()) {
      showToast('🎓 Presentation Mode: Only the Host can upload images.', 'warning');
      return;
    }
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const worldPos = screenToWorld(e.clientX, e.clientY);
          insertImageIntoWorld(evt.target.result, worldPos.x, worldPos.y);
        };
        reader.readAsDataURL(file);
      }
    }
  });

  toolImageBtn.addEventListener('click', () => {
    if (!canCurrentUserDraw()) {
      showToast('🎓 Presentation Mode: Only the Host can upload images.', 'warning');
      return;
    }
    imageUploadInput.click();
  });

  imageUploadInput.addEventListener('change', (e) => {
    if (!canCurrentUserDraw()) {
      showToast('🎓 Presentation Mode: Only the Host can upload images.', 'warning');
      return;
    }
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const worldPos = screenToWorld(viewWidth / 2, viewHeight / 2);
      insertImageIntoWorld(evt.target.result, worldPos.x, worldPos.y);
    };
    reader.readAsDataURL(file);
  });

  // Templates
  function insertKanbanTemplate() {
    if (!canCurrentUserDraw()) return;
    const cx = screenToWorld(viewWidth / 2, viewHeight / 2).x - 360;
    const cy = screenToWorld(viewWidth / 2, viewHeight / 2).y - 200;
    const columns = [
      { title: 'TO DO', theme: 'yellow', x: cx },
      { title: 'IN PROGRESS', theme: 'sky', x: cx + 260 },
      { title: 'DONE', theme: 'mint', x: cx + 520 }
    ];
    const batch = [];
    columns.forEach((col, i) => {
      batch.push(
        { id: 'shape_kb_' + Date.now() + '_' + i, type: 'rect', x: col.x, y: cy, w: 240, h: 400, color: '#64748B', width: 2 },
        { id: 'text_kb_' + Date.now() + '_' + i, type: 'text', x: col.x + 12, y: cy + 12, text: `📌 ${col.title}`, color: '#FFFFFF', width: 4 },
        { id: 'sticky_kb_' + Date.now() + '_' + i, type: 'sticky', x: col.x + 20, y: cy + 60, theme: col.theme, text: i === 0 ? 'Brainstorm features' : i === 1 ? 'Design UI prototype' : 'Complete submission', author: state.user.name || state.user.username }
      );
    });
    batch.forEach((el) => {
      state.elements.push(el);
      if (el.type === 'sticky') createStickyNoteNode(el);
      else if (el.type === 'text') createTextBoxNode(el);
    });
    redrawBoard();
    socket.emit('elements:batch_update', batch);
    sound.playPop();
    showToast('Inserted Kanban Board Template');
  }

  function insertMatrixTemplate() {
    if (!canCurrentUserDraw()) return;
    const center = screenToWorld(viewWidth / 2, viewHeight / 2);
    const size = 300;
    const batch = [
      { id: 'shape_mx_1', type: 'arrow', x1: center.x - size, y1: center.y, x2: center.x + size, y2: center.y, color: '#38BDF8', width: 3 },
      { id: 'shape_mx_2', type: 'arrow', x1: center.x, y1: center.y + size, x2: center.x, y2: center.y - size, color: '#34D399', width: 3 },
      { id: 'text_mx_1', type: 'text', x: center.x - size + 20, y: center.y - size + 20, text: '⭐ High Impact / Low Effort (Quick Wins)', color: '#34D399', width: 3 },
      { id: 'text_mx_2', type: 'text', x: center.x + 20, y: center.y - size + 20, text: '🚀 High Impact / High Effort (Strategic)', color: '#FBBF24', width: 3 },
      { id: 'text_mx_3', type: 'text', x: center.x - size + 20, y: center.y + 20, text: '⏳ Low Impact / Low Effort (Fill-ins)', color: '#94A3B8', width: 3 },
      { id: 'text_mx_4', type: 'text', x: center.x + 20, y: center.y + 20, text: '⚠️ Low Impact / High Effort (Avoid)', color: '#F43F5E', width: 3 }
    ];
    batch.forEach((el) => {
      state.elements.push(el);
      if (el.type === 'text') createTextBoxNode(el);
    });
    redrawBoard();
    socket.emit('elements:batch_update', batch);
    sound.playPop();
    showToast('Inserted 2x2 Priority Matrix');
  }

  function insertRetroTemplate() {
    if (!canCurrentUserDraw()) return;
    const cx = screenToWorld(viewWidth / 2, viewHeight / 2).x - 360;
    const cy = screenToWorld(viewWidth / 2, viewHeight / 2).y - 200;
    const columns = [
      { title: '🎉 WHAT WENT WELL', theme: 'mint', x: cx },
      { title: '💡 WHAT TO IMPROVE', theme: 'coral', x: cx + 260 },
      { title: '🎯 ACTION ITEMS', theme: 'sky', x: cx + 520 }
    ];
    const batch = [];
    columns.forEach((col, i) => {
      batch.push(
        { id: 'shape_rt_' + Date.now() + '_' + i, type: 'rect', x: col.x, y: cy, w: 240, h: 400, color: '#64748B', width: 2 },
        { id: 'text_rt_' + Date.now() + '_' + i, type: 'text', x: col.x + 12, y: cy + 12, text: col.title, color: '#FFFFFF', width: 4 },
        { id: 'sticky_rt_' + Date.now() + '_' + i, type: 'sticky', x: col.x + 20, y: cy + 60, theme: col.theme, text: i === 0 ? 'Smooth 60fps performance!' : i === 1 ? 'Add more shortcut hotkeys' : 'Deploy assignment live', author: state.user.name || state.user.username }
      );
    });
    batch.forEach((el) => {
      state.elements.push(el);
      if (el.type === 'sticky') createStickyNoteNode(el);
      else if (el.type === 'text') createTextBoxNode(el);
    });
    redrawBoard();
    socket.emit('elements:batch_update', batch);
    sound.playPop();
    showToast('Inserted Agile Retrospective');
  }

  if (templatesBtn && templatesMenu) {
    templatesBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!canCurrentUserDraw()) {
        showToast('🎓 Presentation Mode: Only the Host can insert templates.', 'warning');
        return;
      }
      templatesMenu.parentElement.classList.toggle('active');
    });
    if (tmplKanbanBtn) tmplKanbanBtn.addEventListener('click', () => { dismissAllPopovers(); insertKanbanTemplate(); });
    if (tmplMatrixBtn) tmplMatrixBtn.addEventListener('click', () => { dismissAllPopovers(); insertMatrixTemplate(); });
    if (tmplRetroBtn) tmplRetroBtn.addEventListener('click', () => { dismissAllPopovers(); insertRetroTemplate(); });
  }

  gridStyleToggleBtn.addEventListener('click', () => {
    if (state.gridMode === 'dots') state.gridMode = 'grid';
    else if (state.gridMode === 'grid') state.gridMode = 'blank';
    else state.gridMode = 'dots';
    renderGrid();
    sound.playClick();
    showToast(`Grid: ${state.gridMode.toUpperCase()}`);
  });


  // Cursor Chat
  function positionLocalChatBubble(clientX, clientY) {
    localCursorChat.style.left = `${clientX}px`;
    localCursorChat.style.top = `${clientY}px`;
  }
  function openCursorChat() {
    state.localChatActive = true;
    localCursorChat.classList.remove('hidden');
    positionLocalChatBubble(lastClientPos.x, lastClientPos.y);
    cursorChatInput.value = '';
    setTimeout(() => cursorChatInput.focus(), 20);
  }
  function closeCursorChat() {
    state.localChatActive = false;
    localCursorChat.classList.add('hidden');
    cursorChatInput.blur();
    broadcastCursor(lastClientPos.x, lastClientPos.y, '');
  }

  cursorChatInput.addEventListener('input', () => broadcastCursor(lastClientPos.x, lastClientPos.y, cursorChatInput.value));
  cursorChatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (cursorChatInput.value.trim()) sound.playClick();
      closeCursorChat();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeCursorChat();
    }
  });

  function dismissAllPopovers() {
    document.querySelectorAll('.popover-container').forEach((c) => c.classList.remove('open'));
    document.querySelectorAll('.dropdown-wrapper').forEach((d) => d.classList.remove('active'));
  }

  function setupPopovers() {
    if (roomModeBtn) {
      roomModeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isCurrentUserHost()) {
          showToast(state.roomMode === 'host' ? '🎓 Room is in Presentation Mode (Controlled by Host)' : '🤝 Friendly Mode: Everyone can draw', 'info');
          return;
        }
        const isOpen = roomModeWrapper && roomModeWrapper.classList.contains('active');
        dismissAllPopovers();
        if (!isOpen && roomModeWrapper) roomModeWrapper.classList.add('active');
        sound.playClick();
      });
    }

    if (btnModeFriendly) {
      btnModeFriendly.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isCurrentUserHost()) return;
        dismissAllPopovers();
        if (state.roomMode !== 'friendly') {
          socket.emit('room:set_mode', { mode: 'friendly' });
          sound.playClick();
        }
      });
    }

    if (btnModeHost) {
      btnModeHost.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isCurrentUserHost()) return;
        dismissAllPopovers();
        if (state.roomMode !== 'host') {
          socket.emit('room:set_mode', { mode: 'host' });
          sound.playClick();
        }
      });
    }

    shapePopoverBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!canCurrentUserDraw()) {
        showToast('🎓 Presentation Mode: Only Host can draw shapes.', 'warning');
        return;
      }
      const parent = shapePopoverBtn.parentElement;
      const isOpen = parent.classList.contains('open');
      dismissAllPopovers();
      if (!isOpen) parent.classList.add('open');
      sound.playClick();
    });

    shapesPopover.querySelectorAll('.popover-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!canCurrentUserDraw()) {
          showToast('🎓 Presentation Mode: Canvas is View-Only.', 'warning');
          return;
        }
        const tool = item.dataset.tool;
        state.activeTool = tool;
        shapesPopover.querySelectorAll('.popover-item').forEach((i) => i.classList.remove('active'));
        item.classList.add('active');
        activeShapeIcon.innerHTML = item.querySelector('svg').outerHTML;
        shapePopoverBtn.dataset.tool = tool;
        updateActiveToolUI();
        dismissAllPopovers();
        sound.playClick();
      });
    });

    colorPopoverBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const parent = colorPopoverBtn.parentElement;
      const isOpen = parent.classList.contains('open');
      dismissAllPopovers();
      if (!isOpen) parent.classList.add('open');
      sound.playClick();
    });

    colorPopover.querySelectorAll('.color-choice').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.activeColor = btn.dataset.color;
        activeColorDot.style.backgroundColor = state.activeColor;
        colorPopover.querySelectorAll('.color-choice').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        sound.playClick();
      });
    });

    colorPopover.querySelectorAll('.width-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.activeWidth = parseInt(btn.dataset.width, 10);
        colorPopover.querySelectorAll('.width-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        sound.playClick();
      });
    });

    reactionPopoverBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const parent = reactionPopoverBtn.parentElement;
      const isOpen = parent.classList.contains('open');
      dismissAllPopovers();
      if (!isOpen) parent.classList.add('open');
      sound.playClick();
    });

    reactionPopover.querySelectorAll('.reaction-item').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerReaction(btn.dataset.emoji);
        dismissAllPopovers();
      });
    });

    startCursorChatBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dismissAllPopovers();
      openCursorChat();
    });
  }

  function triggerReaction(emoji) {
    addEmojiBurst(emoji, lastClientPos.x, lastClientPos.y);
    sound.playReactionChime();
    const worldPos = screenToWorld(lastClientPos.x, lastClientPos.y);
    socket.emit('reaction:emit', {
      emoji,
      x: worldPos.x,
      y: worldPos.y,
      userName: state.user.name || state.user.username
    });
  }

  function updateActiveToolUI() {
    dockButtons.forEach((btn) => {
      const tool = btn.dataset.tool;
      const isShapeTool = ['rect', 'circle', 'arrow', 'line'].includes(state.activeTool);
      if (btn.id === 'shapePopoverBtn' && isShapeTool) btn.classList.add('active');
      else if (tool === state.activeTool) btn.classList.add('active');
      else btn.classList.remove('active');
    });
    boardCanvas.style.cursor = state.activeTool === 'select' ? 'default' : 'crosshair';
  }

  dockButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.id === 'shapePopoverBtn') return;
      const tool = btn.dataset.tool;
      if (tool && tool !== 'select' && tool !== 'laser' && !canCurrentUserDraw()) {
        showToast('🎓 Presentation Mode: Only Host can draw on the canvas.', 'warning');
        return;
      }
      state.activeTool = tool;
      updateActiveToolUI();
      sound.playClick();
    });
  });

  function updateZoomUI() {
    zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
  }

  zoomInBtn.addEventListener('click', () => {
    state.zoom = Math.min(4.0, state.zoom * 1.2);
    updateZoomUI();
    renderGrid();
    redrawBoard();
    syncAllDomElementPositions();
    sound.playClick();
  });

  zoomOutBtn.addEventListener('click', () => {
    state.zoom = Math.max(0.2, state.zoom / 1.2);
    updateZoomUI();
    renderGrid();
    redrawBoard();
    syncAllDomElementPositions();
    sound.playClick();
  });

  zoomResetBtn.addEventListener('click', () => {
    state.zoom = 1.0;
    state.panX = 0;
    state.panY = 0;
    updateZoomUI();
    renderGrid();
    redrawBoard();
    syncAllDomElementPositions();
    sound.playClick();
  });

  // Undo / Redo
  function performUndo() {
    if (!canCurrentUserDraw()) {
      showToast('🎓 Presentation Mode: Canvas is View-Only for participants.', 'warning');
      return;
    }
    if (state.undoStack.length === 0) return;
    const action = state.undoStack.pop();
    state.redoStack.push(action);

    if (action.type === 'add') {
      state.elements = state.elements.filter((el) => el.id !== action.element.id);
      if (action.element.type === 'sticky' || action.element.type === 'text' || action.element.type === 'code') {
        const dom = state.domElementsMap.get(action.element.id);
        if (dom) dom.remove();
        state.domElementsMap.delete(action.element.id);
      }
      socket.emit('element:delete', action.element.id);
    } else if (action.type === 'delete') {
      state.elements.push(action.element);
      if (action.element.type === 'sticky') createStickyNoteNode(action.element);
      else if (action.element.type === 'text') createTextBoxNode(action.element);
      else if (action.element.type === 'code') createCodeSnippetNode(action.element);
      socket.emit('element:add', action.element);
    }
    redrawBoard();
    sound.playClick();
    showToast('Undo');
  }

  function performRedo() {
    if (!canCurrentUserDraw()) {
      showToast('🎓 Presentation Mode: Canvas is View-Only for participants.', 'warning');
      return;
    }
    if (state.redoStack.length === 0) return;
    const action = state.redoStack.pop();
    state.undoStack.push(action);

    if (action.type === 'add') {
      state.elements.push(action.element);
      if (action.element.type === 'sticky') createStickyNoteNode(action.element);
      else if (action.element.type === 'text') createTextBoxNode(action.element);
      else if (action.element.type === 'code') createCodeSnippetNode(action.element);
      socket.emit('element:add', action.element);
    } else if (action.type === 'delete') {
      state.elements = state.elements.filter((el) => el.id !== action.element.id);
      if (action.element.type === 'sticky' || action.element.type === 'text' || action.element.type === 'code') {
        const dom = state.domElementsMap.get(action.element.id);
        if (dom) dom.remove();
        state.domElementsMap.delete(action.element.id);
      }
      socket.emit('element:delete', action.element.id);
    }
    redrawBoard();
    sound.playClick();
    showToast('Redo');
  }

  undoBtn.addEventListener('click', performUndo);
  redoBtn.addEventListener('click', performRedo);

  // High-Res Export (2x HD) & JSON
  exportBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    exportMenu.parentElement.classList.toggle('active');
  });

  function generateExportCanvas(scale = 2) {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = viewWidth * scale;
    exportCanvas.height = viewHeight * scale;
    const ctx = exportCanvas.getContext('2d');

    // Canvas background
    ctx.fillStyle = currentTheme === 'dark' ? '#0C0E14' : '#F9F8F5';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    ctx.save();
    ctx.scale(scale, scale);
    state.elements.forEach((el) => {
      if (el.type !== 'sticky' && el.type !== 'text' && el.type !== 'code') drawElement(ctx, el);
    });
    ctx.restore();
    return exportCanvas;
  }

  exportPngBtn.addEventListener('click', () => {
    exportMenu.parentElement.classList.remove('active');
    const exportCanvas = generateExportCanvas(2);
    const link = document.createElement('a');
    link.download = `CoCanvas_${state.roomId || 'board'}_${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
    showToast('Exported PNG (2x HD) 🖼️');
  });

  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', () => {
      exportMenu.parentElement.classList.remove('active');
      const exportCanvas = generateExportCanvas(2);
      const imgData = exportCanvas.toDataURL('image/png');
      const roomCode = state.roomId || 'Session';
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>CoCanvas Whiteboard - ${roomCode}</title>
            <style>
              @page { size: landscape; margin: 12mm; }
              * { box-sizing: border-box; }
              body {
                font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
                margin: 0;
                padding: 16px;
                background: #FFFFFF;
                color: #111827;
              }
              .pdf-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 2px solid #E2E8F0;
                padding-bottom: 12px;
                margin-bottom: 14px;
              }
              .brand-badge {
                display: flex;
                align-items: center;
                gap: 10px;
              }
              .brand-badge img {
                width: 36px;
                height: 36px;
                border-radius: 8px;
                border: 1.5px solid #000;
                object-fit: cover;
              }
              .brand-badge .title {
                font-size: 20px;
                font-weight: 900;
                color: #111827;
                letter-spacing: -0.5px;
              }
              .brand-badge .title span {
                color: #2563EB;
              }
              .meta-badge {
                text-align: right;
                font-size: 11px;
                color: #64748B;
                line-height: 1.5;
              }
              .meta-badge strong {
                color: #0F172A;
              }
              .canvas-wrap {
                width: 100%;
                border: 2px solid #000000;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 4px 4px 0px #000000;
                background: ${currentTheme === 'dark' ? '#0C0E14' : '#F9F8F5'};
              }
              .canvas-wrap img {
                width: 100%;
                height: auto;
                display: block;
              }
              .pdf-footer {
                margin-top: 10px;
                display: flex;
                justify-content: space-between;
                font-size: 10px;
                color: #94A3B8;
              }
            </style>
          </head>
          <body>
            <div class="pdf-header">
              <div class="brand-badge">
                <img src="${window.location.origin}/logo.png" alt="CoCanvas Logo" />
                <div class="title"><span>Co</span>Canvas</div>
              </div>
              <div class="meta-badge">
                <div>Room Code: <strong>${roomCode}</strong></div>
                <div>Date & Time: <strong>${dateStr} at ${timeStr}</strong></div>
              </div>
            </div>

            <div class="canvas-wrap">
              <img src="${imgData}" alt="Whiteboard Capture" />
            </div>

            <div class="pdf-footer">
              <span>CoCanvas — Real-Time Collaborative Whiteboard</span>
              <span>© 2026 CoCanvas</span>
            </div>

            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 300);
              };
            <\/script>
          </body>
          </html>
        `);
        win.document.close();
        showToast('Generated PDF with Logo & Timestamp 📄');
      } else {
        showToast('Please allow popups to export PDF');
      }
    });
  }

  if (exportDocxBtn) {
    exportDocxBtn.addEventListener('click', () => {
      exportMenu.parentElement.classList.remove('active');
      const exportCanvas = generateExportCanvas(2);
      const imgData = exportCanvas.toDataURL('image/png');
      const roomCode = state.roomId || 'Session';
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      const docHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>CoCanvas Whiteboard Export</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 24px; color: #111827; }
            .doc-header { border-bottom: 2pt solid #2563EB; padding-bottom: 8px; margin-bottom: 16px; }
            h1 { color: #2563EB; font-size: 22pt; margin: 0 0 4px 0; font-weight: 900; }
            p.meta { color: #64748B; font-size: 11pt; margin: 0 0 16px 0; }
            .board-frame { border: 2pt solid #000000; border-radius: 8px; padding: 4px; margin-bottom: 16px; }
            img { max-width: 100%; height: auto; display: block; }
            .footer-note { font-size: 9pt; color: #94A3B8; margin-top: 12px; }
          </style>
        </head>
        <body>
          <div class="doc-header">
            <h1>🎨 CoCanvas — Collaborative Whiteboard</h1>
            <p class="meta">
              <strong>Site:</strong> CoCanvas (Real-Time Whiteboard)<br/>
              <strong>Room Code:</strong> ${roomCode}<br/>
              <strong>Export Date:</strong> ${dateStr}<br/>
              <strong>Export Time:</strong> ${timeStr}
            </p>
          </div>
          <div class="board-frame">
            <img src="${imgData}" width="100%" />
          </div>
          <p class="footer-note">Built by Jaya Chandra Vennam &copy; 2026 CoCanvas | All Rights Reserved</p>
        </body>
        </html>
      `;

      const blob = new Blob(['\ufeff' + docHtml], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `CoCanvas_${roomCode}_${Date.now()}.doc`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      showToast('Exported DOCS with Header & Timestamp 📝');
    });
  }

  exportJsonBtn.addEventListener('click', () => {
    exportMenu.parentElement.classList.remove('active');
    const data = JSON.stringify({ version: '1.0', roomId: state.roomId, exportedAt: new Date().toISOString(), elements: state.elements }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `CoCanvas_${state.roomId || 'board'}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Exported Board JSON');
  });

  importJsonInput.addEventListener('change', (e) => {
    if (!canCurrentUserDraw()) {
      showToast('🎓 Presentation Mode: Only the Host can import data.', 'warning');
      return;
    }
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        if (parsed && Array.isArray(parsed.elements)) {
          state.elements = [];
          domLayer.innerHTML = '';
          state.domElementsMap.clear();
          parsed.elements.forEach((el) => {
            state.elements.push(el);
            if (el.type === 'sticky') createStickyNoteNode(el);
            else if (el.type === 'text') createTextBoxNode(el);
            else if (el.type === 'code') createCodeSnippetNode(el);
          });
          redrawBoard();
          socket.emit('elements:batch_update', state.elements);
          showToast(`Imported ${parsed.elements.length} elements`);
        }
      } catch (err) {
        showToast('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  });

  clearBoardBtn.addEventListener('click', () => {
    if (!canCurrentUserDraw()) {
      showToast('🎓 Presentation Mode: Only the Host can clear the canvas.', 'warning');
      return;
    }
    if (confirm('Clear the entire collaborative whiteboard?')) {
      state.elements = [];
      domLayer.innerHTML = '';
      state.domElementsMap.clear();
      clearSelection();
      state.undoStack = [];
      state.redoStack = [];
      redrawBoard();
      socket.emit('elements:clear');
      sound.playPop();
      showToast('Board cleared');
    }
  });

  function copyTextToClipboard(text, successMessage) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(successMessage);
      }).catch(() => {
        fallbackCopyText(text, successMessage);
      });
    } else {
      fallbackCopyText(text, successMessage);
    }
  }

  function fallbackCopyText(text, successMessage) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      showToast(successMessage);
    } catch (err) {
      showToast(`Code: ${text}`);
    }
    textArea.remove();
  }

  function copyRoomCode() {
    const roomCode = state.roomId || (currentRoomCodeEl ? currentRoomCodeEl.textContent.trim() : '');
    copyTextToClipboard(roomCode, `Room Code "${roomCode}" copied! 📋`);
  }

  roomPillBtn.addEventListener('click', copyRoomCode);
  if (shareRoomBtn) shareRoomBtn.addEventListener('click', copyRoomCode);

  shortcutsNavBtn.addEventListener('click', () => shortcutsModal.classList.add('active'));
  closeShortcutsBtn.addEventListener('click', () => shortcutsModal.classList.remove('active'));

  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      sound.muted = !sound.muted;
      if (soundIconOn) soundIconOn.style.display = sound.muted ? 'none' : 'block';
      if (soundIconOff) soundIconOff.style.display = sound.muted ? 'block' : 'none';
      showToast(sound.muted ? 'Audio Muted' : 'Audio Unmuted');
    });
  }

  if (gridStyleToggleBtn) {
    gridStyleToggleBtn.addEventListener('click', () => {
      const modes = ['dots', 'grid', 'blank'];
      const nextIdx = (modes.indexOf(state.gridMode) + 1) % modes.length;
      state.gridMode = modes[nextIdx];
      renderGrid();
      sound.playClick();
      showToast(`Grid: ${state.gridMode.toUpperCase()}`);
    });
  }

  // Interactive Hanging Lightbulb Pull Switch Controller
  if (landingThemeToggleBtn) {
    let isDraggingLamp = false;
    let lampStartY = 0;
    let didPullTrigger = false;

    function triggerLampSwitch() {
      landingThemeToggleBtn.classList.remove('rebounding');
      landingThemeToggleBtn.classList.add('pulled');
      
      toggleTheme();

      setTimeout(() => {
        landingThemeToggleBtn.classList.remove('pulled');
        landingThemeToggleBtn.classList.add('rebounding');
        setTimeout(() => {
          landingThemeToggleBtn.classList.remove('rebounding');
        }, 700);
      }, 140);
    }

    landingThemeToggleBtn.addEventListener('click', (e) => {
      if (!didPullTrigger) {
        triggerLampSwitch();
      }
      didPullTrigger = false;
    });

    landingThemeToggleBtn.addEventListener('pointerdown', (e) => {
      isDraggingLamp = true;
      lampStartY = e.clientY;
      didPullTrigger = false;
      landingThemeToggleBtn.setPointerCapture(e.pointerId);
    });

    landingThemeToggleBtn.addEventListener('pointermove', (e) => {
      if (!isDraggingLamp) return;
      const deltaY = Math.max(0, Math.min(32, e.clientY - lampStartY));
      landingThemeToggleBtn.style.transform = `translateY(${deltaY}px)`;
      if (deltaY >= 18 && !didPullTrigger) {
        didPullTrigger = true;
      }
    });

    function endLampDrag(e) {
      if (!isDraggingLamp) return;
      isDraggingLamp = false;
      landingThemeToggleBtn.style.transform = '';
      if (didPullTrigger) {
        triggerLampSwitch();
      }
      try { landingThemeToggleBtn.releasePointerCapture(e.pointerId); } catch (err) {}
    }

    landingThemeToggleBtn.addEventListener('pointerup', endLampDrag);
    landingThemeToggleBtn.addEventListener('pointercancel', endLampDrag);
  }

  if (canvasThemeToggleBtn) {
    canvasThemeToggleBtn.addEventListener('click', toggleTheme);
  }

  // Shortcuts
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
      if (e.key === 'Escape') {
        e.target.blur();
        closeCursorChat();
        dismissAllPopovers();
      }
      return;
    }

    if (e.key === ' ') {
      state.spacePressed = true;
      boardCanvas.style.cursor = 'grab';
    }

    const key = e.key.toLowerCase();
    const drawingKeys = ['p', 'h', 'e', 'r', 'o', 'a', 'l', 's', 't', 'c', 'i'];
    if (drawingKeys.includes(key) && !canCurrentUserDraw()) {
      showToast('🎓 Presentation Mode: Only the Host can draw.', 'warning');
      return;
    }

    if (key === 'v') { state.activeTool = 'select'; updateActiveToolUI(); sound.playClick(); }
    else if (key === 'k') { state.activeTool = 'laser'; updateActiveToolUI(); sound.playClick(); }
    else if (key === 'p') { state.activeTool = 'pen'; updateActiveToolUI(); sound.playClick(); }
    else if (key === 'h') { state.activeTool = 'highlighter'; updateActiveToolUI(); sound.playClick(); }
    else if (key === 'e') { state.activeTool = 'eraser'; updateActiveToolUI(); sound.playClick(); }
    else if (key === 'r') {
      state.activeTool = 'rect';
      activeShapeIcon.innerHTML = shapesPopover.querySelector('[data-tool="rect"] svg').outerHTML;
      updateActiveToolUI();
      sound.playClick();
    }
    else if (key === 'o') {
      state.activeTool = 'circle';
      activeShapeIcon.innerHTML = shapesPopover.querySelector('[data-tool="circle"] svg').outerHTML;
      updateActiveToolUI();
      sound.playClick();
    }
    else if (key === 'a') {
      state.activeTool = 'arrow';
      activeShapeIcon.innerHTML = shapesPopover.querySelector('[data-tool="arrow"] svg').outerHTML;
      updateActiveToolUI();
      sound.playClick();
    }
    else if (key === 'l') {
      state.activeTool = 'line';
      activeShapeIcon.innerHTML = shapesPopover.querySelector('[data-tool="line"] svg').outerHTML;
      updateActiveToolUI();
      sound.playClick();
    }
    else if (key === 's') { state.activeTool = 'sticky'; updateActiveToolUI(); sound.playClick(); }
    else if (key === 't') { state.activeTool = 'text'; updateActiveToolUI(); sound.playClick(); }
    else if (key === 'c') { state.activeTool = 'code'; updateActiveToolUI(); sound.playClick(); }
    else if (key === 'i') { imageUploadInput.click(); }
    else if (key === '/') { e.preventDefault(); openCursorChat(); }
    else if (key === '?') { shortcutsModal.classList.toggle('active'); }
    else if (key === 'escape') {
      shortcutsModal.classList.remove('active');
      registerModal.classList.remove('active');
      loginModal.classList.remove('active');
      profileHubModal.classList.remove('active');
      dismissAllPopovers();
      closeCursorChat();
      clearSelection();
    }
    else if (key === 'delete' || key === 'backspace') {
      if (state.selectedElementId) selectionDeleteBtn.click();
    }
    else if (key === '1') { triggerReaction('🔥'); }
    else if (key === '2') { triggerReaction('❤️'); }
    else if (key === '3') { triggerReaction('🎉'); }
    else if (key === '4') { triggerReaction('🚀'); }
    else if (key === '5') { triggerReaction('👍'); }

    if ((e.ctrlKey || e.metaKey) && key === 'z') {
      e.preventDefault();
      if (e.shiftKey) performRedo();
      else performUndo();
    } else if ((e.ctrlKey || e.metaKey) && key === 'y') {
      e.preventDefault();
      performRedo();
    } else if ((e.ctrlKey || e.metaKey) && key === '0') {
      e.preventDefault();
      zoomResetBtn.click();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === ' ') {
      state.spacePressed = false;
      boardCanvas.style.cursor = state.activeTool === 'select' ? 'default' : 'crosshair';
    }
  });

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[m]);
  }

  function showToast(message, type = 'info', avatar = null) {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} animate-toast-in`;

    if (avatar) {
      if (avatar.startsWith('data:image/') || avatar.startsWith('http') || avatar.startsWith('/')) {
        const img = document.createElement('img');
        img.src = avatar;
        img.className = 'toast-avatar-img';
        toast.appendChild(img);
      } else {
        const span = document.createElement('span');
        span.className = 'toast-avatar-emoji';
        span.textContent = avatar;
        toast.appendChild(span);
      }
    }

    const textSpan = document.createElement('span');
    textSpan.className = 'toast-text';
    textSpan.innerHTML = message;
    toast.appendChild(textSpan);

    toastContainer.appendChild(toast);

    // Limit to max 3 toasts at a time
    while (toastContainer.children.length > 3) {
      toastContainer.removeChild(toastContainer.firstChild);
    }

    setTimeout(() => {
      toast.classList.add('toast-fade-out');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 250);
    }, 3200);
  }

  // --- 13. Socket.io Real-Time Synchronization ---
  socket.on('room:init', (data) => {
    state.roomId = data.roomId;
    state.user.id = data.selfId;
    state.hostSessionId = data.hostSessionId || state.user.sessionId;
    state.roomMode = data.roomMode || 'friendly';

    state.elements = [];
    domLayer.innerHTML = '';
    state.domElementsMap.clear();

    if (Array.isArray(data.elements)) {
      data.elements.forEach((el) => {
        state.elements.push(el);
        if (el.type === 'sticky') createStickyNoteNode(el);
        else if (el.type === 'text') createTextBoxNode(el);
        else if (el.type === 'code') createCodeSnippetNode(el);
      });
    }

    state.collaborators.clear();
    if (Array.isArray(data.users)) {
      data.users.forEach((u) => {
        if (u.id !== data.selfId) state.collaborators.set(u.id, u);
      });
    }

    // Populate chat history
    if (chatMessagesContainer) {
      const welcome = chatMessagesContainer.querySelector('.chat-welcome-notice');
      chatMessagesContainer.innerHTML = '';
      if (welcome) chatMessagesContainer.appendChild(welcome);
      if (Array.isArray(data.messages)) {
        data.messages.forEach((msg) => {
          appendChatMessage(msg, (msg.sessionId && msg.sessionId === state.user.sessionId) || msg.id === state.user.id);
        });
      }
    }

    updateCollaboratorsUI();
    updateRoomModeUI();
    redrawBoard();
  });

  socket.on('room:host_changed', ({ hostSessionId }) => {
    state.hostSessionId = hostSessionId;
    updateCollaboratorsUI();
    updateRoomModeUI();
    if (state.hostSessionId === state.user.sessionId) {
      showToast('👑 <strong>You are the room host!</strong>', 'host');
    }
  });

  socket.on('room:mode_changed', ({ mode, hostSessionId }) => {
    state.roomMode = mode;
    if (hostSessionId) state.hostSessionId = hostSessionId;
    updateRoomModeUI();
    updateCollaboratorsUI();

    if (mode === 'host') {
      sound.playPop();
      if (isCurrentUserHost()) {
        showToast('🎓 <strong>Host Mode active</strong>: You are presenting. Viewers are in View-Only mode.', 'host');
      } else {
        showToast('🎓 <strong>Presentation Mode</strong>: Host is presenting. Canvas is now View-Only.', 'info');
      }
    } else {
      sound.playPop();
      showToast('🤝 <strong>Friendly Mode active</strong>: Everyone can draw and collaborate!', 'success');
    }
  });

  socket.on('user:joined', (newUser) => {
    if (newUser.id !== state.user.id) {
      state.collaborators.set(newUser.id, newUser);
      updateCollaboratorsUI();
      sound.playPop();
      showToast(`<strong>${escapeHtml(newUser.name || 'A teammate')}</strong> joined the room`, 'join', newUser.avatar || '👤');
    }
  });

  socket.on('user:left', ({ socketId, name, avatar }) => {
    const existing = state.collaborators.get(socketId);
    const userName = (existing && existing.name) || name || 'A teammate';
    const userAvatar = (existing && existing.avatar) || avatar || '👋';
    showToast(`<strong>${escapeHtml(userName)}</strong> left the room`, 'leave', userAvatar);
    state.collaborators.delete(socketId);
    updateCollaboratorsUI();
  });

  socket.on('cursor:update', (data) => {
    let peer = state.collaborators.get(data.socketId);
    if (!peer) {
      peer = { id: data.socketId, name: 'Collaborator', color: '#FF6B4A' };
      state.collaborators.set(data.socketId, peer);
    }
    peer.cursor = { x: data.x, y: data.y };
    if (data.chatText !== undefined) peer.chatText = data.chatText;
  });

  socket.on('laser:trailed', (data) => {
    const screenPos = worldToScreen(data.x, data.y);
    addLaserPoint(screenPos.x, screenPos.y, data.color);
  });

  socket.on('element:added', (el) => {
    if (!state.elements.some((item) => item.id === el.id)) {
      state.elements.push(el);
      if (el.type === 'sticky') createStickyNoteNode(el);
      else if (el.type === 'text') createTextBoxNode(el);
      else if (el.type === 'code') createCodeSnippetNode(el);
      redrawBoard();
    }
  });

  socket.on('element:updated', (updated) => {
    const idx = state.elements.findIndex((item) => item.id === updated.id);
    if (idx !== -1) state.elements[idx] = { ...state.elements[idx], ...updated };
    else state.elements.push(updated);

    if (updated.type === 'sticky') {
      let node = state.domElementsMap.get(updated.id);
      if (!node) node = createStickyNoteNode(updated);
      const textarea = node.querySelector('textarea');
      if (textarea && textarea.value !== updated.text && document.activeElement !== textarea) {
        textarea.value = updated.text || '';
      }
      if (updated.theme) node.className = `sticky-note-card theme-${updated.theme}`;
      syncDomElementPosition(updated, node);
    } else if (updated.type === 'text') {
      let node = state.domElementsMap.get(updated.id);
      if (!node) node = createTextBoxNode(updated);
      const textarea = node.querySelector('textarea');
      if (textarea && textarea.value !== updated.text && document.activeElement !== textarea) {
        textarea.value = updated.text || '';
      }
      syncDomElementPosition(updated, node);
    } else if (updated.type === 'code') {
      let node = state.domElementsMap.get(updated.id);
      if (!node) node = createCodeSnippetNode(updated);
      const textarea = node.querySelector('.code-textarea');
      if (textarea && textarea.value !== updated.code && document.activeElement !== textarea) {
        textarea.value = updated.code || '';
        const lineNums = node.querySelector('.code-line-numbers');
        const footerLines = node.querySelector('.code-footer span:last-child');
        if (lineNums) {
          const count = (updated.code || '').split('\n').length;
          lineNums.innerHTML = Array.from({ length: Math.max(1, count) }, (_, i) => i + 1).join('<br>');
          if (footerLines) footerLines.textContent = `${count} ${count === 1 ? 'line' : 'lines'}`;
        }
      }
      const langSelect = node.querySelector('.code-lang-select');
      if (langSelect && updated.language && langSelect.value !== updated.language) {
        langSelect.value = updated.language;
      }
      const filenameInput = node.querySelector('.code-filename-input');
      if (filenameInput && updated.filename && filenameInput.value !== updated.filename && document.activeElement !== filenameInput) {
        filenameInput.value = updated.filename;
      }
      syncDomElementPosition(updated, node);
    } else {
      redrawBoard();
    }
  });

  socket.on('elements:batch_updated', (elementsList) => {
    elementsList.forEach((updated) => {
      const idx = state.elements.findIndex((item) => item.id === updated.id);
      if (idx !== -1) state.elements[idx] = { ...state.elements[idx], ...updated };
      else {
        state.elements.push(updated);
        if (updated.type === 'sticky') createStickyNoteNode(updated);
        else if (updated.type === 'text') createTextBoxNode(updated);
        else if (updated.type === 'code') createCodeSnippetNode(updated);
      }
    });
    redrawBoard();
    syncAllDomElementPositions();
  });

  socket.on('element:deleted', (elementId) => {
    state.elements = state.elements.filter((el) => el.id !== elementId);
    const dom = state.domElementsMap.get(elementId);
    if (dom) {
      dom.remove();
      state.domElementsMap.delete(elementId);
    }
    if (state.selectedElementId === elementId) clearSelection();
    redrawBoard();
  });

  socket.on('elements:cleared', () => {
    state.elements = [];
    domLayer.innerHTML = '';
    state.domElementsMap.clear();
    clearSelection();
    state.undoStack = [];
    state.redoStack = [];
    redrawBoard();
    showToast('Board was cleared by a collaborator');
  });

  socket.on('reaction:emitted', (data) => {
    const screenPos = worldToScreen(data.x, data.y);
    addEmojiBurst(data.emoji, screenPos.x, screenPos.y);
    sound.playReactionChime();
  });

  socket.on('radar:pinged', (data) => {
    const screenPos = worldToScreen(data.x, data.y);
    addRadarPing(screenPos.x, screenPos.y, data.color, data.userName);
    sound.playRadarPing();
  });

  // --- ChatSpace Real-Time Multiplayer Communication ---
  function openChatSpace() {
    state.isChatOpen = true;
    if (chatSpacePanel) chatSpacePanel.classList.remove('collapsed');
    if (chatFloatingTab) {
      chatFloatingTab.classList.add('hidden');
      chatFloatingTab.classList.remove('has-unread', 'tab-anim-pop');
    }
    state.unreadChatCount = 0;
    if (chatUnreadBadge) {
      chatUnreadBadge.textContent = '0';
      chatUnreadBadge.classList.add('hidden');
    }
    if (chatMessagesContainer) {
      setTimeout(() => {
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
      }, 50);
    }
    if (chatMessageInput) {
      setTimeout(() => {
        chatMessageInput.focus();
      }, 120);
    }
  }

  function closeChatSpace() {
    state.isChatOpen = false;
    stopVoiceRecognition();
    if (chatSpacePanel) chatSpacePanel.classList.add('collapsed');
    if (chatFloatingTab) chatFloatingTab.classList.remove('hidden');
  }

  function appendChatMessage(msg, isSelf) {
    if (!chatMessagesContainer) return;

    const item = document.createElement('div');
    item.className = `chat-msg-item ${isSelf ? 'self' : 'peer'}`;

    // Sender Avatar
    const av = document.createElement('div');
    av.className = 'chat-msg-avatar';
    av.style.setProperty('--c', msg.color || '#FF6B4A');
    setAvatarElement(av, msg.avatar, (msg.name || 'C').charAt(0).toUpperCase());

    // Message Body
    const body = document.createElement('div');
    body.className = 'chat-msg-body';

    // Header (Author, You Badge, Time)
    const header = document.createElement('div');
    header.className = 'chat-msg-header';

    const author = document.createElement('span');
    author.className = 'chat-msg-author';
    author.textContent = msg.name || 'Collaborator';
    header.appendChild(author);

    if (isSelf) {
      const youBadge = document.createElement('span');
      youBadge.className = 'chat-msg-you-pill';
      youBadge.textContent = 'YOU';
      header.appendChild(youBadge);
    }

    const time = document.createElement('span');
    time.className = 'chat-msg-time';
    const msgDate = new Date(msg.timestamp || Date.now());
    time.textContent = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    header.appendChild(time);

    body.appendChild(header);

    // Text Bubble
    if (msg.text && msg.text.trim().length > 0) {
      const bubble = document.createElement('div');
      bubble.className = 'chat-msg-bubble';
      bubble.textContent = msg.text;
      body.appendChild(bubble);
    }

    item.appendChild(av);
    item.appendChild(body);

    chatMessagesContainer.appendChild(item);
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
  }

  // Floating tab & collapse events
  if (chatFloatingTab) {
    chatFloatingTab.addEventListener('click', () => {
      openChatSpace();
      sound.playClick();
    });
  }

  if (btnCollapseChat) {
    btnCollapseChat.addEventListener('click', () => {
      closeChatSpace();
      sound.playClick();
    });
  }

  if (btnClearChatHistory) {
    btnClearChatHistory.addEventListener('click', () => {
      if (confirm('Clear all chat messages in this room?')) {
        socket.emit('chat:clear');
        sound.playClick();
      }
    });
  }

  // Quick reaction emojis
  if (chatEmojiButtons && chatEmojiButtons.length > 0) {
    chatEmojiButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const emoji = btn.getAttribute('data-emoji');
        if (emoji && chatMessageInput) {
          chatMessageInput.value += emoji;
          chatMessageInput.focus();
        }
      });
    });
  }

  // --- Voice Input (Speech-to-Text) ---
  let speechRecognizer = null;
  let isListeningVoice = false;

  function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognizer = new SpeechRecognition();
    recognizer.continuous = false;
    recognizer.interimResults = true;
    recognizer.lang = navigator.language || 'en-US';

    let originalTextBeforeVoice = '';

    recognizer.onstart = () => {
      isListeningVoice = true;
      if (btnVoiceChat) {
        btnVoiceChat.classList.add('recording');
        btnVoiceChat.title = 'Listening... Click to stop';
      }
      originalTextBeforeVoice = chatMessageInput ? chatMessageInput.value : '';
      if (chatMessageInput) {
        chatMessageInput.placeholder = '🎙️ Listening... speak now';
      }
      sound.playPop();
    };

    recognizer.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
      }
      if (chatMessageInput && transcript) {
        const prefix = originalTextBeforeVoice ? originalTextBeforeVoice.trim() + ' ' : '';
        chatMessageInput.value = prefix + transcript;
      }
    };

    recognizer.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      stopVoiceRecognition();
      if (event.error === 'not-allowed') {
        showToast('Microphone access denied. Please allow microphone in browser settings.', 'warning');
      } else if (event.error !== 'no-speech') {
        showToast(`Voice error: ${event.error}`, 'warning');
      }
    };

    recognizer.onend = () => {
      stopVoiceRecognition();
      if (chatMessageInput) {
        chatMessageInput.placeholder = 'Type a message or use voice...';
        chatMessageInput.focus();
      }
    };

    return recognizer;
  }

  function startVoiceRecognition() {
    if (!speechRecognizer) {
      speechRecognizer = initSpeechRecognition();
    }
    if (!speechRecognizer) {
      showToast('Voice input is not supported in this browser. Try Google Chrome or Edge.', 'warning');
      return;
    }

    try {
      speechRecognizer.start();
    } catch (err) {
      console.warn('Speech start error:', err);
    }
  }

  function stopVoiceRecognition() {
    isListeningVoice = false;
    if (btnVoiceChat) {
      btnVoiceChat.classList.remove('recording');
      btnVoiceChat.title = 'Voice Input (Speech to Text)';
    }
    if (speechRecognizer) {
      try {
        speechRecognizer.stop();
      } catch (err) {}
    }
  }

  if (btnVoiceChat) {
    btnVoiceChat.addEventListener('click', (e) => {
      e.preventDefault();
      if (isListeningVoice) {
        stopVoiceRecognition();
        sound.playClick();
      } else {
        startVoiceRecognition();
      }
    });
  }

  // Form Submission
  if (chatInputForm) {
    chatInputForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!chatMessageInput) return;
      const text = chatMessageInput.value.trim();
      if (!text) return;

      if (!state.roomId) {
        showToast('Please join a room to send messages', 'warning');
        return;
      }

      if (isListeningVoice) {
        stopVoiceRecognition();
      }

      socket.emit('chat:send', { text });
      chatMessageInput.value = '';
      sound.playClick();
    });
  }

  // Socket: Chat Received
  socket.on('chat:received', (msg) => {
    const isSelf = (msg.sessionId && msg.sessionId === state.user.sessionId) || msg.id === state.user.id;
    appendChatMessage(msg, isSelf);

    if (!isSelf) {
      sound.playPop();
      if (!state.isChatOpen) {
        state.unreadChatCount = (state.unreadChatCount || 0) + 1;
        if (chatUnreadBadge) {
          chatUnreadBadge.textContent = state.unreadChatCount > 99 ? '99+' : String(state.unreadChatCount);
          chatUnreadBadge.classList.remove('hidden');
        }
        if (chatFloatingTab) {
          chatFloatingTab.classList.add('has-unread');
          chatFloatingTab.classList.remove('tab-anim-pop');
          void chatFloatingTab.offsetWidth; // Force DOM reflow to re-trigger pop animation
          chatFloatingTab.classList.add('tab-anim-pop');
        }
        let snippet = msg.text || 'Message';
        if (snippet.length > 35) snippet = snippet.slice(0, 35) + '...';
        showToast(`💬 <strong>${escapeHtml(msg.name || 'Teammate')}</strong>: ${escapeHtml(snippet)}`, 'chat', msg.avatar || '💬');
      }
    }
  });

  // Socket: Chat Cleared
  socket.on('chat:cleared', () => {
    if (chatMessagesContainer) {
      const welcome = chatMessagesContainer.querySelector('.chat-welcome-notice');
      chatMessagesContainer.innerHTML = '';
      if (welcome) chatMessagesContainer.appendChild(welcome);
    }
    showToast('Chat history was cleared');
  });

  function updateCollaboratorsUI() {
    collaboratorStack.innerHTML = '';
    const maxVisible = 4;
    let count = 0;

    const isSelfOnline = socket && socket.connected && navigator.onLine;
    const isSelfHost = !state.hostSessionId || state.hostSessionId === state.user.sessionId;

    // Self Avatar
    const selfAv = document.createElement('div');
    selfAv.className = 'collaborator-avatar';
    selfAv.style.setProperty('--c', state.user.color);
    setAvatarElement(selfAv, state.user.avatar, (state.user.name || 'Y').charAt(0).toUpperCase());
    selfAv.title = `${state.user.name || state.user.username} (You)${isSelfHost ? ' 👑 Room Host' : ''} — ${isSelfOnline ? 'Connected' : 'Offline'}`;

    // Host Crown Badge
    if (isSelfHost) {
      const crown = document.createElement('span');
      crown.className = 'avatar-crown-badge';
      crown.textContent = '👑';
      crown.title = 'Room Host';
      selfAv.appendChild(crown);
    }

    // Live status dot badge
    const selfStatus = document.createElement('span');
    selfStatus.className = `avatar-status-dot ${isSelfOnline ? 'online' : 'offline'}`;
    selfAv.appendChild(selfStatus);

    // Instant Name Tooltip on Cursor Hover
    const selfTooltip = document.createElement('div');
    selfTooltip.className = 'avatar-name-tooltip';
    selfTooltip.innerHTML = `${isSelfHost ? '👑 ' : ''}<span>${state.user.name || state.user.username} (You)</span>`;
    selfAv.appendChild(selfTooltip);

    collaboratorStack.appendChild(selfAv);
    count++;

    state.collaborators.forEach((peer) => {
      if (count < maxVisible) {
        const isPeerOnline = peer.isOffline !== true;
        const isPeerHost = state.hostSessionId && peer.sessionId === state.hostSessionId;

        const av = document.createElement('div');
        av.className = 'collaborator-avatar';
        av.style.setProperty('--c', peer.color || '#FF6B4A');
        setAvatarElement(av, peer.avatar, (peer.name || 'C').charAt(0).toUpperCase());
        av.title = `${peer.name}${isPeerHost ? ' 👑 Room Host' : ''} — ${isPeerOnline ? 'Connected' : 'Offline'}`;

        // Host Crown Badge
        if (isPeerHost) {
          const crown = document.createElement('span');
          crown.className = 'avatar-crown-badge';
          crown.textContent = '👑';
          crown.title = 'Room Host';
          av.appendChild(crown);
        }

        // Status dot badge
        const peerStatus = document.createElement('span');
        peerStatus.className = `avatar-status-dot ${isPeerOnline ? 'online' : 'offline'}`;
        av.appendChild(peerStatus);

        // Instant Name Tooltip on Cursor Hover
        const peerTooltip = document.createElement('div');
        peerTooltip.className = 'avatar-name-tooltip';
        peerTooltip.innerHTML = `${isPeerHost ? '👑 ' : ''}<span>${peer.name || 'Collaborator'}</span>`;
        av.appendChild(peerTooltip);

        av.addEventListener('click', (e) => {
          e.stopPropagation();
          if (peer.cursor) {
            smoothFlyTo(peer.cursor.x, peer.cursor.y);
            showToast(`Following ${peer.name}`);
            sound.playClick();
          }
        });
        collaboratorStack.appendChild(av);
      }
      count++;
    });

    if (count > maxVisible) {
      const extra = document.createElement('div');
      extra.className = 'collaborator-avatar avatar-count';
      extra.textContent = `+${count - maxVisible}`;
      collaboratorStack.appendChild(extra);
    }

    if (chatOnlineStatus) {
      chatOnlineStatus.textContent = isSelfOnline ? `🟢 ${count} online in room` : '🔴 Disconnected';
    }
  }

  // Window online / offline listeners & Socket connection tracking
  window.addEventListener('online', () => {
    updateCollaboratorsUI();
    showToast('Internet connected 🟢');
  });

  window.addEventListener('offline', () => {
    updateCollaboratorsUI();
    showToast('No internet connection 🔴');
  });

  socket.on('connect', () => {
    updateCollaboratorsUI();
  });

  socket.on('disconnect', () => {
    updateCollaboratorsUI();
  });

  // Initialize App
  function init() {
    applyTheme(currentTheme);
    setupCanvasEvents();
    setupPopovers();
    updateActiveToolUI();

    // Check if user refreshed while inside a room (e.g. ?room=GUTTSZ)
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');

    if (roomParam && roomParam.trim().length > 0) {
      const targetRoom = roomParam.trim().toUpperCase();
      if (!state.user.name) {
        state.user.name = generateRandomName();
        state.user.username = state.user.name;
        if (!state.user.friendTag) state.user.friendTag = generateGuestFriendTag(state.user.name);
        saveUserSession(state.user);
      }
      enterWhiteboardScreen(targetRoom);
    } else {
      updateLandingUI();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
