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
    hostSessionId: null,
    coHostSessionIds: new Set(),
    user: loadStoredUser(),
    avatarIndex: 0,
    currentScreen: 'landing', // 'landing' or 'whiteboard'
    activeTool: 'pen',
    activeColor: '#FF6B4A',
    activeFillColor: '#FDE047',
    activeColorSlot: 'color1', // 'color1' (outline) | 'color2' (fill)
    activeFillStyle: 'none', // 'none' | 'semi' | 'solid'
    activeWidth: 3,
    activeEraserSize: 20,
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
    remoteLiveDrafts: new Map(),
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
    roomMode: 'friendly', // 'friendly' (all draw) | 'host' (presentation mode, only hosts draw)
    showRemoteCursors: localStorage.getItem('cocanvas_show_remote_cursors') !== 'false',
    canvasMode: 'fixed_page', // 'fixed_page' (Document/Slide Windows) | 'infinite' (Playground)
    pages: [{ id: 'page_1', number: 1, name: 'Page 1', elements: [], createdAt: Date.now() }],
    activePageId: 'page_1',
    pageWidth: 1600,
    pageHeight: 1000
  };

  // Sync avatar index
  const initialAvIndex = AVATARS_LIST.indexOf(state.user.avatar);
  if (initialAvIndex !== -1) state.avatarIndex = initialAvIndex;

  // --- 4. DOM Cache ---
  // Screens
  const landingScreen = document.getElementById('landingScreen');
  const whiteboardScreen = document.getElementById('whiteboardScreen');

  // Canvas Mode & Multi-Page Navigation Elements
  const canvasModePill = document.getElementById('canvasModePill');
  const btnModeFixedPage = document.getElementById('btnModeFixedPage');
  const btnModeInfiniteCanvas = document.getElementById('btnModeInfiniteCanvas');
  const fixedPageTag = document.getElementById('fixedPageTag');
  const fixedPageTagTitle = document.getElementById('fixedPageTagTitle');
  const pageNavDock = document.getElementById('pageNavDock');
  const btnPrevPage = document.getElementById('btnPrevPage');
  const btnNextPage = document.getElementById('btnNextPage');
  const pageSelectorWrapper = document.getElementById('pageSelectorWrapper');
  const pageSelectorBtn = document.getElementById('pageSelectorBtn');
  const pageSelectorLabel = document.getElementById('pageSelectorLabel');
  const pageDropdownMenu = document.getElementById('pageDropdownMenu');
  const pageDropdownList = document.getElementById('pageDropdownList');
  const btnNewPage = document.getElementById('btnNewPage');
  const btnFitPage = document.getElementById('btnFitPage');
  const btnDeletePage = document.getElementById('btnDeletePage');

  // Theme Elements
  const landingThemeToggleBtn = document.getElementById('landingThemeToggleBtn');
  const landingThemeIcon = document.getElementById('landingThemeIcon');
  const landingThemeLabel = document.getElementById('landingThemeLabel');
  const canvasThemeToggleBtn = document.getElementById('canvasThemeToggleBtn');
  const canvasThemeIcon = document.getElementById('canvasThemeIcon');
  const toggleCursorsBtn = document.getElementById('toggleCursorsBtn');

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

  const manageHostsModal = document.getElementById('manageHostsModal');
  const closeManageHostsBtn = document.getElementById('closeManageHostsBtn');
  const btnOpenManageHosts = document.getElementById('btnOpenManageHosts');
  const hostsParticipantsList = document.getElementById('hostsParticipantsList');
  const hostsParticipantCount = document.getElementById('hostsParticipantCount');
  const myRoleIndicator = document.getElementById('myRoleIndicator');

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

  // =========================================================================
  // INTERACTIVE AVATAR PHOTO ADJUSTER & CROPPER (WhatsApp / Instagram style)
  // =========================================================================
  const avatarCropModal = document.getElementById('avatarCropModal');
  const closeAvatarCropBtn = document.getElementById('closeAvatarCropBtn');
  const btnCancelCrop = document.getElementById('btnCancelCrop');
  const btnApplyCrop = document.getElementById('btnApplyCrop');
  const cropCanvas = document.getElementById('cropCanvas');
  const cropViewportContainer = document.getElementById('cropViewportContainer');
  const cropZoomSlider = document.getElementById('cropZoomSlider');
  const btnCropZoomIn = document.getElementById('btnCropZoomIn');
  const btnCropZoomOut = document.getElementById('btnCropZoomOut');
  const btnCropRotate = document.getElementById('btnCropRotate');
  const btnCropReset = document.getElementById('btnCropReset');

  let cropState = {
    img: null,
    scale: 1,
    minScale: 1,
    maxScale: 3,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    initialOffsetX: 0,
    initialOffsetY: 0,
    targetCropSize: 220,
    vw: 320,
    vh: 300
  };

  function openCropModalWithFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Please select a valid image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        initCropSession(img);
        if (avatarCropModal) {
          avatarCropModal.classList.add('active');
          sound.playModalOpen();
        }
      };
      img.onerror = () => showToast('Failed to load image');
      img.src = e.target.result;
    };
    reader.onerror = () => showToast('Error reading file');
    reader.readAsDataURL(file);
  }

  function closeCropModal() {
    if (avatarCropModal) avatarCropModal.classList.remove('active');
    if (landingAvatarFileInput) landingAvatarFileInput.value = '';
    cropState.img = null;
  }

  if (closeAvatarCropBtn) closeAvatarCropBtn.addEventListener('click', closeCropModal);
  if (btnCancelCrop) btnCancelCrop.addEventListener('click', closeCropModal);
  if (avatarCropModal) {
    avatarCropModal.addEventListener('click', (e) => {
      if (e.target === avatarCropModal) closeCropModal();
    });
  }

  function initCropSession(img) {
    cropState.img = img;
    cropState.rotation = 0;
    cropState.offsetX = 0;
    cropState.offsetY = 0;

    const rect = cropViewportContainer ? cropViewportContainer.getBoundingClientRect() : { width: 320, height: 300 };
    cropState.vw = rect.width || 320;
    cropState.vh = rect.height || 300;
    cropState.targetCropSize = Math.min(220, cropState.vw - 40, cropState.vh - 40);

    if (cropCanvas) {
      cropCanvas.width = cropState.vw;
      cropCanvas.height = cropState.vh;
    }

    // Min scale so image always completely covers the 220px circle crop diameter
    const isRotated = cropState.rotation === 90 || cropState.rotation === 270;
    const curW = isRotated ? img.height : img.width;
    const curH = isRotated ? img.width : img.height;
    const minScaleW = cropState.targetCropSize / curW;
    const minScaleH = cropState.targetCropSize / curH;
    cropState.minScale = Math.max(minScaleW, minScaleH);
    cropState.maxScale = Math.max(cropState.minScale * 3.5, 3.0);
    cropState.scale = cropState.minScale;

    if (cropZoomSlider) {
      cropZoomSlider.min = cropState.minScale;
      cropZoomSlider.max = cropState.maxScale;
      cropZoomSlider.step = (cropState.maxScale - cropState.minScale) / 200;
      cropZoomSlider.value = cropState.scale;
    }

    renderCropCanvas();
  }

  function renderCropCanvas() {
    if (!cropCanvas || !cropState.img) return;
    const ctx = cropCanvas.getContext('2d');
    const { vw, vh, img, scale, offsetX, offsetY, rotation } = cropState;

    ctx.clearRect(0, 0, vw, vh);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.translate(vw / 2 + offsetX, vh / 2 + offsetY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);

    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();
  }

  // Pointer dragging & panning on crop viewport
  if (cropViewportContainer) {
    cropViewportContainer.addEventListener('pointerdown', (e) => {
      if (!cropState.img) return;
      cropState.isDragging = true;
      cropState.dragStartX = e.clientX;
      cropState.dragStartY = e.clientY;
      cropState.initialOffsetX = cropState.offsetX;
      cropState.initialOffsetY = cropState.offsetY;
      try { cropViewportContainer.setPointerCapture(e.pointerId); } catch (err) {}
    });

    cropViewportContainer.addEventListener('pointermove', (e) => {
      if (!cropState.isDragging || !cropState.img) return;
      const dx = e.clientX - cropState.dragStartX;
      const dy = e.clientY - cropState.dragStartY;
      cropState.offsetX = cropState.initialOffsetX + dx;
      cropState.offsetY = cropState.initialOffsetY + dy;
      renderCropCanvas();
    });

    function endCropDrag(e) {
      if (!cropState.isDragging) return;
      cropState.isDragging = false;
      try { cropViewportContainer.releasePointerCapture(e.pointerId); } catch (err) {}
    }

    cropViewportContainer.addEventListener('pointerup', endCropDrag);
    cropViewportContainer.addEventListener('pointercancel', endCropDrag);

    // Wheel Zoom
    cropViewportContainer.addEventListener('wheel', (e) => {
      if (!cropState.img) return;
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const newScale = Math.max(cropState.minScale, Math.min(cropState.maxScale, cropState.scale * zoomFactor));
      cropState.scale = newScale;
      if (cropZoomSlider) cropZoomSlider.value = newScale;
      renderCropCanvas();
    }, { passive: false });
  }

  // Zoom Slider
  if (cropZoomSlider) {
    cropZoomSlider.addEventListener('input', (e) => {
      if (!cropState.img) return;
      cropState.scale = parseFloat(e.target.value);
      renderCropCanvas();
    });
  }

  if (btnCropZoomIn) {
    btnCropZoomIn.addEventListener('click', () => {
      if (!cropState.img) return;
      const nextScale = Math.min(cropState.maxScale, cropState.scale * 1.15);
      cropState.scale = nextScale;
      if (cropZoomSlider) cropZoomSlider.value = nextScale;
      renderCropCanvas();
    });
  }

  if (btnCropZoomOut) {
    btnCropZoomOut.addEventListener('click', () => {
      if (!cropState.img) return;
      const nextScale = Math.max(cropState.minScale, cropState.scale / 1.15);
      cropState.scale = nextScale;
      if (cropZoomSlider) cropZoomSlider.value = nextScale;
      renderCropCanvas();
    });
  }

  if (btnCropRotate) {
    btnCropRotate.addEventListener('click', () => {
      if (!cropState.img) return;
      cropState.rotation = (cropState.rotation + 90) % 360;
      sound.playClick();
      renderCropCanvas();
    });
  }

  if (btnCropReset) {
    btnCropReset.addEventListener('click', () => {
      if (!cropState.img) return;
      initCropSession(cropState.img);
      sound.playClick();
    });
  }

  // Apply Photo & Save Avatar
  if (btnApplyCrop) {
    btnApplyCrop.addEventListener('click', () => {
      if (!cropState.img) return;

      const exportSize = 256;
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = exportSize;
      exportCanvas.height = exportSize;
      const expCtx = exportCanvas.getContext('2d');
      expCtx.imageSmoothingEnabled = true;
      expCtx.imageSmoothingQuality = 'high';

      const ratio = exportSize / cropState.targetCropSize;

      expCtx.translate(exportSize / 2 + cropState.offsetX * ratio, exportSize / 2 + cropState.offsetY * ratio);
      expCtx.rotate((cropState.rotation * Math.PI) / 180);
      expCtx.scale(cropState.scale * ratio, cropState.scale * ratio);
      expCtx.drawImage(cropState.img, -cropState.img.width / 2, -cropState.img.height / 2);

      const croppedDataUrl = exportCanvas.toDataURL('image/jpeg', 0.92);

      state.user.avatar = croppedDataUrl;
      saveUserSession(state.user);
      updateLandingUI();
      if (state.user.isLoggedIn) {
        socket.emit('auth:update_profile', { avatar: croppedDataUrl });
      }

      closeCropModal();
      sound.playPop();
      showToast('📸 Profile photo adjusted & applied!');
    });
  }

  // Custom Photo Upload Triggers on Landing
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
      openCropModalWithFile(file);
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
      openCropModalWithFile(e.dataTransfer.files[0]);
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
      if (activeColorDot) activeColorDot.style.backgroundColor = state.activeColor;
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
    document.title = `CoCanvas (Room: ${roomId}) — Real-Time Canvas`;

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
      document.title = 'CoCanvas — Real-Time Collaborative Whiteboard';
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

    const isDark = currentTheme === 'dark';
    const isFixedPage = state.canvasMode === 'fixed_page';
    const baseGridSize = 32;
    const scaledGridSize = baseGridSize * state.zoom;
    const step = scaledGridSize < 16 ? scaledGridSize * 2 : scaledGridSize;

    if (isFixedPage) {
      // 1. Fixed Multi-Page Mode: Render Page Boundary Card & Outer Shaded Area
      const pw = state.pageWidth || 1600;
      const ph = state.pageHeight || 1000;
      const pTopLeft = worldToScreen(0, 0);
      const pBottomRight = worldToScreen(pw, ph);
      const cardW = pBottomRight.x - pTopLeft.x;
      const cardH = pBottomRight.y - pTopLeft.y;
      const borderRadius = Math.min(18 * state.zoom, 18);

      // Outer Canvas Background (Soft textured contrast for page backdrop)
      gridCtx.fillStyle = isDark ? '#0C0E14' : '#E2E8F0';
      gridCtx.fillRect(0, 0, viewWidth, viewHeight);

      // Outer Soft Shading Dots (Subtle pattern in the workspace beyond the page)
      gridCtx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)';
      const outerStep = Math.max(24, step);
      const outerStartX = (state.panX % outerStep + outerStep) % outerStep;
      const outerStartY = (state.panY % outerStep + outerStep) % outerStep;
      gridCtx.beginPath();
      for (let x = outerStartX; x < viewWidth; x += outerStep) {
        for (let y = outerStartY; y < viewHeight; y += outerStep) {
          gridCtx.moveTo(x + 1, y);
          gridCtx.arc(x, y, 1, 0, Math.PI * 2);
        }
      }
      gridCtx.fill();

      // Page Drop Shadow
      gridCtx.save();
      gridCtx.shadowColor = isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.2)';
      gridCtx.shadowBlur = 24 * Math.min(1.5, Math.max(0.5, state.zoom));
      gridCtx.shadowOffsetY = 10 * Math.min(1.5, Math.max(0.5, state.zoom));

      // Page Card Background
      gridCtx.fillStyle = isDark ? '#1E293B' : '#FFFFFF';
      gridCtx.beginPath();
      if (gridCtx.roundRect) gridCtx.roundRect(pTopLeft.x, pTopLeft.y, cardW, cardH, borderRadius);
      else gridCtx.rect(pTopLeft.x, pTopLeft.y, cardW, cardH);
      gridCtx.fill();
      gridCtx.restore();

      // Page Border Stroke
      gridCtx.save();
      gridCtx.strokeStyle = isDark ? '#475569' : '#000000';
      gridCtx.lineWidth = Math.max(1.5, 2 * state.zoom);
      gridCtx.beginPath();
      if (gridCtx.roundRect) gridCtx.roundRect(pTopLeft.x, pTopLeft.y, cardW, cardH, borderRadius);
      else gridCtx.rect(pTopLeft.x, pTopLeft.y, cardW, cardH);
      gridCtx.stroke();
      gridCtx.restore();

      // Position Fixed Page Tag Header Overlay
      if (fixedPageTag) {
        const activePage = (state.pages && state.pages.find(p => p.id === state.activePageId)) || { number: 1, name: 'Page 1' };
        const totalPages = (state.pages && state.pages.length) || 1;
        if (fixedPageTagTitle) {
          fixedPageTagTitle.textContent = `${activePage.name || ('Page ' + activePage.number)} (${activePage.number}/${totalPages}) · ${pw} × ${ph}`;
        }
        fixedPageTag.classList.remove('hidden');
        fixedPageTag.style.left = `${Math.max(8, pTopLeft.x)}px`;
        fixedPageTag.style.top = `${Math.max(68, pTopLeft.y - 34)}px`;
      }

      // Clip inner grid to the page boundaries
      if (state.gridMode !== 'blank') {
        gridCtx.save();
        gridCtx.beginPath();
        if (gridCtx.roundRect) gridCtx.roundRect(pTopLeft.x, pTopLeft.y, cardW, cardH, borderRadius);
        else gridCtx.rect(pTopLeft.x, pTopLeft.y, cardW, cardH);
        gridCtx.clip();

        const pageStartX = pTopLeft.x + ((state.panX - pTopLeft.x) % step + step) % step;
        const pageStartY = pTopLeft.y + ((state.panY - pTopLeft.y) % step + step) % step;

        if (state.gridMode === 'dots') {
          gridCtx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.14)';
          const dotRadius = Math.max(1, Math.min(2.2, 1.2 * state.zoom));
          gridCtx.beginPath();
          for (let x = pageStartX; x < pBottomRight.x; x += step) {
            for (let y = pageStartY; y < pBottomRight.y; y += step) {
              if (x >= pTopLeft.x && y >= pTopLeft.y) {
                gridCtx.moveTo(x + dotRadius, y);
                gridCtx.arc(x, y, dotRadius, 0, Math.PI * 2);
              }
            }
          }
          gridCtx.fill();
        } else if (state.gridMode === 'grid') {
          gridCtx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
          gridCtx.lineWidth = 1;
          gridCtx.beginPath();
          for (let x = pageStartX; x < pBottomRight.x; x += step) {
            if (x >= pTopLeft.x) {
              gridCtx.moveTo(x, pTopLeft.y);
              gridCtx.lineTo(x, pBottomRight.y);
            }
          }
          for (let y = pageStartY; y < pBottomRight.y; y += step) {
            if (y >= pTopLeft.y) {
              gridCtx.moveTo(pTopLeft.x, y);
              gridCtx.lineTo(pBottomRight.x, y);
            }
          }
          gridCtx.stroke();
        }

        gridCtx.restore();
      }
    } else {
      // 2. Infinite Canvas Playground Mode
      if (fixedPageTag) fixedPageTag.classList.add('hidden');
      if (state.gridMode === 'blank') return;

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
  }

  function simplifyPoints(points, epsilon = 0.5) {
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

  const ALL_BRUSH_TOOLS = [
    'pen', 'brush', 'calligraphy-brush', 'calligraphy-pen', 'airbrush',
    'oil-brush', 'crayon', 'marker', 'highlighter', 'pencil', 'watercolor'
  ];

  const ALL_SHAPE_TOOLS = [
    'line', 'curve', 'circle', 'rect', 'rounded-rect', 'polygon', 'triangle',
    'right-triangle', 'diamond', 'pentagon', 'hexagon', 'arrow-right', 'arrow-left',
    'arrow-up', 'arrow-down', 'star-4', 'star-5', 'star-6', 'callout-round',
    'callout-oval', 'callout-cloud', 'heart', 'lightning', 'arrow'
  ];

  const ALL_2D_SHAPES = [
    'rect', 'rounded-rect', 'circle', 'polygon', 'triangle',
    'right-triangle', 'diamond', 'pentagon', 'hexagon', 'arrow-right', 'arrow-left',
    'arrow-up', 'arrow-down', 'star-4', 'star-5', 'star-6', 'callout-round',
    'callout-oval', 'callout-cloud', 'heart', 'lightning'
  ];

  function getElementBounds(el) {
    if (ALL_BRUSH_TOOLS.includes(el.type)) {
      if (!el.points || el.points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      el.points.forEach((p) => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      });
      const pad = (el.width || 3) * 6;
      return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
    } else if (el.type === 'line' || el.type === 'arrow' || el.type === 'curve') {
      return { minX: Math.min(el.x1, el.x2) - 10, minY: Math.min(el.y1, el.y2) - 10, maxX: Math.max(el.x1, el.x2) + 10, maxY: Math.max(el.y1, el.y2) + 10 };
    } else {
      const w = el.w || 200;
      const h = el.h || 160;
      return { minX: Math.min(el.x, el.x + w), minY: Math.min(el.y, el.y + h), maxX: Math.max(el.x, el.x + w), maxY: Math.max(el.y, el.y + h) };
    }
  }

  function isElementInViewport(bounds) {
    const vLeft = -state.panX / state.zoom;
    const vTop = -state.panY / state.zoom;
    const vRight = (viewWidth - state.panX) / state.zoom;
    const vBottom = (viewHeight - state.panY) / state.zoom;
    return !(bounds.maxX < vLeft || bounds.minX > vRight || bounds.maxY < vTop || bounds.minY > vBottom);
  }

  function drawShape2DPath(ctx, type, sx, sy, sw, sh) {
    ctx.beginPath();
    switch (type) {
      case 'rect': {
        ctx.rect(sx, sy, sw, sh);
        break;
      }
      case 'rounded-rect': {
        const r = Math.min(12 * state.zoom, Math.abs(sw) / 4, Math.abs(sh) / 4);
        if (ctx.roundRect) ctx.roundRect(sx, sy, sw, sh, r);
        else ctx.rect(sx, sy, sw, sh);
        break;
      }
      case 'circle': {
        const cx = sx + sw / 2;
        const cy = sy + sh / 2;
        const rx = Math.max(1, Math.abs(sw) / 2);
        const ry = Math.max(1, Math.abs(sh) / 2);
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        break;
      }
      case 'polygon': {
        const slant = sw * 0.25;
        ctx.moveTo(sx + slant, sy);
        ctx.lineTo(sx + sw, sy);
        ctx.lineTo(sx + sw - slant, sy + sh);
        ctx.lineTo(sx, sy + sh);
        ctx.closePath();
        break;
      }
      case 'triangle': {
        ctx.moveTo(sx + sw / 2, sy);
        ctx.lineTo(sx + sw, sy + sh);
        ctx.lineTo(sx, sy + sh);
        ctx.closePath();
        break;
      }
      case 'right-triangle': {
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + sw, sy + sh);
        ctx.lineTo(sx, sy + sh);
        ctx.closePath();
        break;
      }
      case 'diamond': {
        ctx.moveTo(sx + sw / 2, sy);
        ctx.lineTo(sx + sw, sy + sh / 2);
        ctx.lineTo(sx + sw / 2, sy + sh);
        ctx.lineTo(sx, sy + sh / 2);
        ctx.closePath();
        break;
      }
      case 'pentagon': {
        ctx.moveTo(sx + sw * 0.5, sy);
        ctx.lineTo(sx + sw, sy + sh * 0.38);
        ctx.lineTo(sx + sw * 0.81, sy + sh);
        ctx.lineTo(sx + sw * 0.19, sy + sh);
        ctx.lineTo(sx, sy + sh * 0.38);
        ctx.closePath();
        break;
      }
      case 'hexagon': {
        ctx.moveTo(sx + sw * 0.5, sy);
        ctx.lineTo(sx + sw, sy + sh * 0.25);
        ctx.lineTo(sx + sw, sy + sh * 0.75);
        ctx.lineTo(sx + sw * 0.5, sy + sh);
        ctx.lineTo(sx, sy + sh * 0.75);
        ctx.lineTo(sx, sy + sh * 0.25);
        ctx.closePath();
        break;
      }
      case 'arrow-right': {
        ctx.moveTo(sx, sy + sh * 0.3);
        ctx.lineTo(sx + sw * 0.6, sy + sh * 0.3);
        ctx.lineTo(sx + sw * 0.6, sy);
        ctx.lineTo(sx + sw, sy + sh * 0.5);
        ctx.lineTo(sx + sw * 0.6, sy + sh);
        ctx.lineTo(sx + sw * 0.6, sy + sh * 0.7);
        ctx.lineTo(sx, sy + sh * 0.7);
        ctx.closePath();
        break;
      }
      case 'arrow-left': {
        ctx.moveTo(sx + sw, sy + sh * 0.3);
        ctx.lineTo(sx + sw * 0.4, sy + sh * 0.3);
        ctx.lineTo(sx + sw * 0.4, sy);
        ctx.lineTo(sx, sy + sh * 0.5);
        ctx.lineTo(sx + sw * 0.4, sy + sh);
        ctx.lineTo(sx + sw * 0.4, sy + sh * 0.7);
        ctx.lineTo(sx + sw, sy + sh * 0.7);
        ctx.closePath();
        break;
      }
      case 'arrow-up': {
        ctx.moveTo(sx + sw * 0.5, sy);
        ctx.lineTo(sx + sw, sy + sh * 0.4);
        ctx.lineTo(sx + sw * 0.7, sy + sh * 0.4);
        ctx.lineTo(sx + sw * 0.7, sy + sh);
        ctx.lineTo(sx + sw * 0.3, sy + sh);
        ctx.lineTo(sx + sw * 0.3, sy + sh * 0.4);
        ctx.lineTo(sx, sy + sh * 0.4);
        ctx.closePath();
        break;
      }
      case 'arrow-down': {
        ctx.moveTo(sx + sw * 0.3, sy);
        ctx.lineTo(sx + sw * 0.7, sy);
        ctx.lineTo(sx + sw * 0.7, sy + sh * 0.6);
        ctx.lineTo(sx + sw, sy + sh * 0.6);
        ctx.lineTo(sx + sw * 0.5, sy + sh);
        ctx.lineTo(sx, sy + sh * 0.6);
        ctx.lineTo(sx + sw * 0.3, sy + sh * 0.6);
        ctx.closePath();
        break;
      }
      case 'star-4': {
        const cx = sx + sw / 2, cy = sy + sh / 2;
        const rx = Math.abs(sw) / 2, ry = Math.abs(sh) / 2;
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4 - Math.PI / 2;
          const rFactor = i % 2 === 0 ? 1 : 0.36;
          const px = cx + rx * rFactor * Math.cos(a);
          const py = cy + ry * rFactor * Math.sin(a);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        break;
      }
      case 'star-5': {
        const cx = sx + sw / 2, cy = sy + sh / 2;
        const rx = Math.abs(sw) / 2, ry = Math.abs(sh) / 2;
        for (let i = 0; i < 10; i++) {
          const a = (i * Math.PI) / 5 - Math.PI / 2;
          const rFactor = i % 2 === 0 ? 1 : 0.42;
          const px = cx + rx * rFactor * Math.cos(a);
          const py = cy + ry * rFactor * Math.sin(a);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        break;
      }
      case 'star-6': {
        const cx = sx + sw / 2, cy = sy + sh / 2;
        const rx = Math.abs(sw) / 2, ry = Math.abs(sh) / 2;
        for (let i = 0; i < 12; i++) {
          const a = (i * Math.PI) / 6 - Math.PI / 2;
          const rFactor = i % 2 === 0 ? 1 : 0.52;
          const px = cx + rx * rFactor * Math.cos(a);
          const py = cy + ry * rFactor * Math.sin(a);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        break;
      }
      case 'callout-round': {
        const bubbleH = sh * 0.78;
        const r = Math.min(10 * state.zoom, Math.abs(sw) / 6, Math.abs(bubbleH) / 4);
        ctx.moveTo(sx + r, sy);
        ctx.lineTo(sx + sw - r, sy);
        ctx.arcTo(sx + sw, sy, sx + sw, sy + r, r);
        ctx.lineTo(sx + sw, sy + bubbleH - r);
        ctx.arcTo(sx + sw, sy + bubbleH, sx + sw - r, sy + bubbleH, r);
        ctx.lineTo(sx + sw * 0.5, sy + bubbleH);
        ctx.lineTo(sx + sw * 0.18, sy + sh);
        ctx.lineTo(sx + sw * 0.32, sy + bubbleH);
        ctx.lineTo(sx + r, sy + bubbleH);
        ctx.arcTo(sx, sy + bubbleH, sx, sy + bubbleH - r, r);
        ctx.lineTo(sx, sy + r);
        ctx.arcTo(sx, sy, sx + r, sy, r);
        ctx.closePath();
        break;
      }
      case 'callout-oval': {
        const cx = sx + sw / 2;
        const cy = sy + sh * 0.42;
        const rx = Math.max(1, Math.abs(sw) / 2);
        const ry = Math.max(1, Math.abs(sh) * 0.42);
        ctx.moveTo(cx, cy - ry);
        ctx.bezierCurveTo(cx + rx * 0.552, cy - ry, cx + rx, cy - ry * 0.552, cx + rx, cy);
        ctx.bezierCurveTo(cx + rx, cy + ry * 0.552, cx + rx * 0.552, cy + ry, cx, cy + ry);
        ctx.lineTo(sx + sw * 0.18, sy + sh);
        ctx.lineTo(cx - rx * 0.35, cy + ry * 0.93);
        ctx.bezierCurveTo(cx - rx * 0.65, cy + ry * 0.8, cx - rx, cy + ry * 0.552, cx - rx, cy);
        ctx.bezierCurveTo(cx - rx, cy - ry * 0.552, cx - rx * 0.552, cy - ry, cx, cy - ry);
        ctx.closePath();
        break;
      }
      case 'callout-cloud': {
        const w = sw, h = sh * 0.78;
        ctx.moveTo(sx + w * 0.2, sy + h * 0.7);
        ctx.bezierCurveTo(sx, sy + h * 0.7, sx, sy + h * 0.3, sx + w * 0.2, sy + h * 0.25);
        ctx.bezierCurveTo(sx + w * 0.1, sy, sx + w * 0.5, sy, sx + w * 0.5, sy + h * 0.15);
        ctx.bezierCurveTo(sx + w * 0.6, sy, sx + w * 0.9, sy, sx + w * 0.85, sy + h * 0.3);
        ctx.bezierCurveTo(sx + w, sy + h * 0.35, sx + w, sy + h * 0.7, sx + w * 0.8, sy + h * 0.75);
        ctx.bezierCurveTo(sx + w * 0.8, sy + h, sx + w * 0.3, sy + h, sx + w * 0.2, sy + h * 0.7);
        ctx.closePath();
        ctx.moveTo(sx + w * 0.22 + w * 0.05, sy + h + (sh - h) * 0.4);
        ctx.arc(sx + w * 0.22, sy + h + (sh - h) * 0.4, Math.max(2, w * 0.05), 0, Math.PI * 2);
        ctx.moveTo(sx + w * 0.12 + w * 0.03, sy + sh - (sh - h) * 0.15);
        ctx.arc(sx + w * 0.12, sy + sh - (sh - h) * 0.15, Math.max(1.5, w * 0.03), 0, Math.PI * 2);
        break;
      }
      case 'heart': {
        const topY = sy + sh * 0.28;
        ctx.moveTo(sx + sw / 2, sy + sh);
        ctx.bezierCurveTo(sx + sw * 0.1, sy + sh * 0.7, sx, topY + sh * 0.2, sx, topY);
        ctx.bezierCurveTo(sx, sy, sx + sw / 2, sy, sx + sw / 2, topY);
        ctx.bezierCurveTo(sx + sw / 2, sy, sx + sw, sy, sx + sw, topY);
        ctx.bezierCurveTo(sx + sw, topY + sh * 0.2, sx + sw * 0.9, sy + sh * 0.7, sx + sw / 2, sy + sh);
        ctx.closePath();
        break;
      }
      case 'lightning': {
        ctx.moveTo(sx + sw * 0.55, sy);
        ctx.lineTo(sx + sw * 0.15, sy + sh * 0.52);
        ctx.lineTo(sx + sw * 0.48, sy + sh * 0.52);
        ctx.lineTo(sx + sw * 0.32, sy + sh);
        ctx.lineTo(sx + sw * 0.85, sy + sh * 0.42);
        ctx.lineTo(sx + sw * 0.52, sy + sh * 0.42);
        ctx.closePath();
        break;
      }
      default: {
        ctx.rect(sx, sy, sw, sh);
        break;
      }
    }
  }

  function drawBrushStroke(ctx, el) {
    if (!el.points || el.points.length === 0) return;
    const brushType = el.type || 'brush';
    const color = el.color || '#FF6B4A';
    const baseWidth = Math.max(1, (el.width || 3) * state.zoom);

    if (el.points.length === 1) {
      const p = worldToScreen(el.points[0].x, el.points[0].y);
      ctx.save();
      ctx.fillStyle = color;
      if (brushType === 'airbrush') {
        const radius = Math.max(5, baseWidth * 3.6);
        for (let j = 0; j < 24; j++) {
          const r = Math.sqrt(((Math.sin(j * 17.3) + 1) / 2)) * radius;
          const theta = ((Math.cos(j * 29.7) + 1) / 2) * Math.PI * 2;
          ctx.fillRect(p.x + r * Math.cos(theta), p.y + r * Math.sin(theta), 1.5, 1.5);
        }
      } else if (brushType === 'calligraphy-brush') {
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, Math.max(3, baseWidth * 2.8) / 2, Math.max(1, baseWidth * 0.35) / 2, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (brushType === 'calligraphy-pen') {
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, Math.max(2.5, baseWidth * 2.2) / 2, Math.max(0.8, baseWidth * 0.2) / 2, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (brushType === 'watercolor') {
        const rad = Math.max(4, baseWidth * 1.5);
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
        grad.addColorStop(0, color);
        grad.addColorStop(0.7, color);
        grad.addColorStop(1, 'transparent');
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, baseWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    switch (brushType) {
      case 'pen':
      case 'brush': {
        // 1. MS Paint Standard Round Brush (Smooth, 100% opaque, round caps)
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = brushType === 'pen' ? baseWidth : baseWidth * 1.35;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
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

      case 'calligraphy-brush': {
        // 2. MS Paint Calligraphy 1 (Authentic 45° Chisel Ribbon with thick/thin dynamics)
        ctx.save();
        ctx.fillStyle = color;
        const chiselLen = Math.max(3, baseWidth * 3.2);
        const chiselThickness = Math.max(1, baseWidth * 0.35);
        const angle = Math.PI / 4; // 45 deg

        for (let i = 0; i < el.points.length - 1; i++) {
          const p1 = worldToScreen(el.points[i].x, el.points[i].y);
          const p2 = worldToScreen(el.points[i + 1].x, el.points[i + 1].y);
          const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          const steps = Math.max(1, Math.ceil(dist / 1.2));
          for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const x = p1.x + (p2.x - p1.x) * t;
            const y = p1.y + (p2.y - p1.y) * t;
            ctx.beginPath();
            ctx.ellipse(x, y, chiselLen / 2, chiselThickness / 2, angle, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
        break;
      }

      case 'calligraphy-pen': {
        // 3. MS Paint Calligraphy 2 (Authentic -45° Sharp Chisel with extreme contrast)
        ctx.save();
        ctx.fillStyle = color;
        const chiselLen = Math.max(2.5, baseWidth * 2.6);
        const chiselThickness = Math.max(0.7, baseWidth * 0.18);
        const angle = -Math.PI / 4; // -45 deg

        for (let i = 0; i < el.points.length - 1; i++) {
          const p1 = worldToScreen(el.points[i].x, el.points[i].y);
          const p2 = worldToScreen(el.points[i + 1].x, el.points[i + 1].y);
          const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          const steps = Math.max(1, Math.ceil(dist / 1.2));
          for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const x = p1.x + (p2.x - p1.x) * t;
            const y = p1.y + (p2.y - p1.y) * t;
            ctx.beginPath();
            ctx.ellipse(x, y, chiselLen / 2, chiselThickness / 2, angle, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
        break;
      }

      case 'airbrush': {
        // 4. MS Paint Airbrush (Iconic spray can with crisp scattered pixel droplets)
        ctx.save();
        ctx.fillStyle = color;
        const radius = Math.max(6, baseWidth * 4.0);
        const stepDist = 2.5;

        for (let i = 0; i < el.points.length - 1; i++) {
          const p1 = worldToScreen(el.points[i].x, el.points[i].y);
          const p2 = worldToScreen(el.points[i + 1].x, el.points[i + 1].y);
          const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          const steps = Math.max(1, Math.ceil(dist / stepDist));

          for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const cx = p1.x + (p2.x - p1.x) * t;
            const cy = p1.y + (p2.y - p1.y) * t;
            const seed = (i * 163 + s * 41);
            const particleCount = Math.max(10, Math.round(14 + baseWidth * 1.5));

            for (let j = 0; j < particleCount; j++) {
              const rRand = (Math.sin(seed + j * 19.7) + 1) / 2;
              const theta = ((Math.cos(seed + j * 31.3) + 1) / 2) * Math.PI * 2;
              const r = Math.pow(rRand, 1.8) * radius;
              const dotX = cx + r * Math.cos(theta);
              const dotY = cy + r * Math.sin(theta);
              const dotSize = (j % 4 === 0) ? 1.8 : 1.2;

              ctx.fillRect(dotX, dotY, dotSize, dotSize);
            }
          }
        }
        ctx.restore();
        break;
      }

      case 'oil-brush': {
        // 5. MS Paint Oil Paint (Authentic bristle streaks + dry-brush canvas tooth)
        ctx.save();
        const bristleCount = 7;
        const spread = Math.max(4, baseWidth * 1.6);
        const p0 = worldToScreen(el.points[0].x, el.points[0].y);

        // Core stroke with textured bristle tracks
        for (let b = 0; b < bristleCount; b++) {
          const offset = ((b / (bristleCount - 1)) - 0.5) * spread;
          ctx.strokeStyle = color;
          ctx.lineWidth = Math.max(1, baseWidth * 0.42);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.globalAlpha = (b === 3 || b === 2 || b === 4) ? 0.75 : 0.45;

          ctx.beginPath();
          ctx.moveTo(p0.x + offset, p0.y + offset * 0.4);
          for (let i = 1; i < el.points.length - 1; i++) {
            const p1 = worldToScreen(el.points[i].x, el.points[i].y);
            const p2 = worldToScreen(el.points[i + 1].x, el.points[i + 1].y);
            ctx.quadraticCurveTo(p1.x + offset, p1.y + offset * 0.4, (p1.x + p2.x) / 2 + offset, (p1.y + p2.y) / 2 + offset * 0.4);
          }
          const lastP = worldToScreen(el.points[el.points.length - 1].x, el.points[el.points.length - 1].y);
          ctx.lineTo(lastP.x + offset, lastP.y + offset * 0.4);
          ctx.stroke();
        }

        // Oil sheen highlight bristle
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = Math.max(0.6, baseWidth * 0.18);
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.moveTo(p0.x - spread * 0.2, p0.y - spread * 0.1);
        for (let i = 1; i < el.points.length - 1; i++) {
          const p1 = worldToScreen(el.points[i].x, el.points[i].y);
          const p2 = worldToScreen(el.points[i + 1].x, el.points[i + 1].y);
          ctx.quadraticCurveTo(p1.x - spread * 0.2, p1.y - spread * 0.1, (p1.x + p2.x) / 2 - spread * 0.2, (p1.y + p2.y) / 2 - spread * 0.1);
        }
        const lastP = worldToScreen(el.points[el.points.length - 1].x, el.points[el.points.length - 1].y);
        ctx.lineTo(lastP.x - spread * 0.2, lastP.y - spread * 0.1);
        ctx.stroke();
        ctx.restore();
        break;
      }

      case 'crayon': {
        // 6. MS Paint Crayon (Chalky wax texture with porous paper grain)
        ctx.save();
        ctx.fillStyle = color;
        const crayonRadius = Math.max(2, baseWidth * 1.1);

        for (let i = 0; i < el.points.length - 1; i++) {
          const p1 = worldToScreen(el.points[i].x, el.points[i].y);
          const p2 = worldToScreen(el.points[i + 1].x, el.points[i + 1].y);
          const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          const steps = Math.max(1, Math.ceil(dist / 1.8));

          for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const cx = p1.x + (p2.x - p1.x) * t;
            const cy = p1.y + (p2.y - p1.y) * t;
            const seed = (i * 223 + s * 47);

            for (let j = 0; j < 9; j++) {
              const rRand = (Math.sin(seed + j * 13.7) + 1) / 2;
              const theta = ((Math.cos(seed + j * 23.3) + 1) / 2) * Math.PI * 2;
              const r = Math.sqrt(rRand) * crayonRadius;
              const px = cx + r * Math.cos(theta);
              const py = cy + r * Math.sin(theta);
              const dotSize = 1.2 + ((Math.sin(seed * 3 + j * 7) + 1) / 2) * 1.4;

              ctx.globalAlpha = 0.35 + ((Math.cos(seed * 2 + j * 5) + 1) / 2) * 0.55;
              ctx.fillRect(px, py, dotSize, dotSize);
            }
          }
        }
        ctx.restore();
        break;
      }

      case 'highlighter':
      case 'marker': {
        // 7. MS Paint Marker (Broad translucent felt chisel with flat ends and layering)
        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(5, (el.width || 12) * 2.4 * state.zoom);
        ctx.lineCap = 'square';
        ctx.lineJoin = 'miter';
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

      case 'pencil': {
        // 8. MS Paint Natural Pencil (Fine 2B pencil graphite line with texture grain)
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, baseWidth * 0.75);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.85;

        // Core graphite line
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

        // Fine graphite grain jitter along the line
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.45;
        for (let i = 0; i < el.points.length - 1; i++) {
          const p1 = worldToScreen(el.points[i].x, el.points[i].y);
          const p2 = worldToScreen(el.points[i + 1].x, el.points[i + 1].y);
          const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          const steps = Math.max(1, Math.ceil(dist / 3));
          for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const seed = i * 71 + s * 13;
            const jx = p1.x + (p2.x - p1.x) * t + ((Math.sin(seed) * 1.2));
            const jy = p1.y + (p2.y - p1.y) * t + ((Math.cos(seed) * 1.2));
            ctx.fillRect(jx, jy, 1, 1);
          }
        }
        ctx.restore();
        break;
      }

      case 'watercolor': {
        // 9. MS Paint Watercolour Brush (Authentic Multi-Bristle Flat Wash with Wet-Bleed Striations & Pigment Runout Fade)
        ctx.save();
        const pts = el.points.map(p => worldToScreen(p.x, p.y));
        const numPts = pts.length;
        if (numPts < 2) {
          ctx.restore();
          break;
        }

        // Precompute cumulative stroke distances and normal vectors
        const dists = [0];
        let totalLen = 0;
        for (let i = 0; i < numPts - 1; i++) {
          const d = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
          totalLen += d;
          dists.push(totalLen);
        }

        const normals = [];
        for (let i = 0; i < numPts; i++) {
          let dx = 0, dy = 0;
          if (i === 0) {
            dx = pts[1].x - pts[0].x;
            dy = pts[1].y - pts[0].y;
          } else if (i === numPts - 1) {
            dx = pts[numPts - 1].x - pts[numPts - 2].x;
            dy = pts[numPts - 1].y - pts[numPts - 2].y;
          } else {
            dx = pts[i + 1].x - pts[i - 1].x;
            dy = pts[i + 1].y - pts[i - 1].y;
          }
          const len = Math.hypot(dx, dy) || 1;
          // Perpendicular normal vector
          normals.push({ nx: -dy / len, ny: dx / len });
        }

        const ribbonWidth = Math.max(7, baseWidth * 2.5);
        ctx.strokeStyle = color;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // A. Soft underwash diffusion bleed (gives the organic watercolor feathering)
        ctx.lineWidth = ribbonWidth * 1.25;
        ctx.globalAlpha = 0.08;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < numPts - 1; i++) {
          const p1 = pts[i];
          const p2 = pts[i + 1];
          ctx.quadraticCurveTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
        }
        ctx.lineTo(pts[numPts - 1].x, pts[numPts - 1].y);
        ctx.stroke();

        // B. Authentic MS Paint Watercolor Bristle Strands (13 textured micro-fibers with natural variation)
        const bristleCount = 13;
        const bristleWeights = [0.18, 0.28, 0.42, 0.55, 0.65, 0.75, 0.8, 0.72, 0.62, 0.52, 0.4, 0.26, 0.16];
        const bristleWidths = [1.2, 1.4, 1.8, 2.2, 2.4, 2.6, 2.8, 2.5, 2.2, 1.8, 1.5, 1.3, 1.1];

        for (let b = 0; b < bristleCount; b++) {
          const offsetFrac = ((b / (bristleCount - 1)) - 0.5); // -0.5 to +0.5
          const weight = bristleWeights[b] || 0.5;
          const bristleThickness = Math.max(0.8, (baseWidth * 0.35) * (bristleWidths[b] / 2.0));
          ctx.lineWidth = bristleThickness;

          // Render stroke segment-by-segment with smooth curve & distance pigment fade
          for (let i = 0; i < numPts - 1; i++) {
            const p1 = pts[i];
            const p2 = pts[i + 1];
            const n1 = normals[i];
            const n2 = normals[i + 1];

            // Offset points along normal
            const bOffset = offsetFrac * ribbonWidth;
            const x1 = p1.x + n1.nx * bOffset;
            const y1 = p1.y + n1.ny * bOffset;
            const x2 = p2.x + n2.nx * bOffset;
            const y2 = p2.y + n2.ny * bOffset;

            // MS Paint watercolor pigment runout (starts saturated ~0.65, fades smoothly to ~0.22)
            const currentDist = dists[i];
            const fadeFactor = Math.max(0.24, 1.0 - (currentDist / 1200) * 0.72);
            ctx.globalAlpha = Math.min(0.85, 0.28 * weight * fadeFactor);

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
        }

        // C. Micro-pigment paper tooth grain along the watercolor stroke
        ctx.fillStyle = color;
        const grainStep = Math.max(4, Math.floor(baseWidth * 0.8));
        for (let i = 0; i < numPts - 1; i += 2) {
          const p1 = pts[i];
          const p2 = pts[i + 1] || pts[i];
          const n = normals[i];
          const currentDist = dists[i];
          const fadeFactor = Math.max(0.2, 1.0 - (currentDist / 1200) * 0.7);
          const seed = i * 89 + 17;

          for (let g = 0; g < 4; g++) {
            const rOffset = ((Math.sin(seed + g * 31.7)) * 0.45) * ribbonWidth;
            const gx = (p1.x + p2.x) / 2 + n.nx * rOffset + (Math.cos(seed + g * 13) * 1.5);
            const gy = (p1.y + p2.y) / 2 + n.ny * rOffset + (Math.sin(seed + g * 23) * 1.5);
            ctx.globalAlpha = 0.15 * fadeFactor;
            ctx.fillRect(gx, gy, 1.5, 1.5);
          }
        }

        ctx.restore();
        break;
      }
    }
  }

  function drawElement(ctx, el) {
    ctx.save();
    ctx.strokeStyle = el.color || '#FF6B4A';
    ctx.fillStyle = el.color || '#FF6B4A';
    ctx.lineWidth = (el.width || 3) * state.zoom;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (ALL_BRUSH_TOOLS.includes(el.type)) {
      drawBrushStroke(ctx, el);
    } else if (ALL_2D_SHAPES.includes(el.type)) {
      const s = worldToScreen(el.x, el.y);
      const w = el.w * state.zoom;
      const h = el.h * state.zoom;
      drawShape2DPath(ctx, el.type, s.x, s.y, w, h);
      if (el.fillStyle && el.fillStyle !== 'none') {
        ctx.save();
        const fillColor = (el.fillColor === 'match' || !el.fillColor) ? (el.color || '#FF6B4A') : el.fillColor;
        ctx.fillStyle = fillColor;
        if (el.fillStyle === 'semi') {
          ctx.globalAlpha = 0.35;
        }
        ctx.fill();
        ctx.restore();
      }
      ctx.stroke();
    } else {
      switch (el.type) {
        case 'line': {
          const s1 = worldToScreen(el.x1, el.y1);
          const s2 = worldToScreen(el.x2, el.y2);
          ctx.beginPath();
          ctx.moveTo(s1.x, s1.y);
          ctx.lineTo(s2.x, s2.y);
          ctx.stroke();
          break;
        }

        case 'curve': {
          const s1 = worldToScreen(el.x1, el.y1);
          const s2 = worldToScreen(el.x2, el.y2);
          const midX = (s1.x + s2.x) / 2;
          const midY = (s1.y + s2.y) / 2;
          const dx = s2.x - s1.x;
          const dy = s2.y - s1.y;
          const dist = Math.hypot(dx, dy);
          const normalX = -dy / (dist || 1);
          const normalY = dx / (dist || 1);
          const bend = (el.bend !== undefined ? el.bend : 0.3) * dist;
          const cpX = midX + normalX * bend;
          const cpY = midY + normalY * bend;
          ctx.beginPath();
          ctx.moveTo(s1.x, s1.y);
          ctx.quadraticCurveTo(cpX, cpY, s2.x, s2.y);
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
    }
    ctx.restore();
  }

  function getActiveDrawingPageId() {
    return state.canvasMode === 'infinite' ? 'playground' : (state.activePageId || 'page_1');
  }

  function isElementVisibleInCurrentMode(el) {
    if (!el) return false;
    if (state.canvasMode === 'infinite') {
      // In Playground mode: strictly show elements created in playground / infinite mode
      return el.pageId === 'playground' || el.canvasMode === 'infinite';
    } else {
      // In Fixed Page mode: strictly show elements belonging to the active fixed page
      const currentFixedPage = state.activePageId || 'page_1';
      if (el.canvasMode === 'infinite' || el.pageId === 'playground') return false;
      return el.pageId === currentFixedPage || (!el.pageId && currentFixedPage === 'page_1');
    }
  }

  function redrawBoard() {
    boardCtx.clearRect(0, 0, viewWidth, viewHeight);

    // Mode & Page Isolation: strictly render elements visible in the active mode
    const visibleElements = state.elements.filter((el) => isElementVisibleInCurrentMode(el));

    visibleElements.forEach((el) => {
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
    const mw = minimapCanvas.width || 165;
    const mh = minimapCanvas.height || 105;
    minimapCtx.clearRect(0, 0, mw, mh);
    let minX = -1000, minY = -600, maxX = 1000, maxY = 600;
    
    const visibleElements = state.elements.filter((el) => isElementVisibleInCurrentMode(el));

    visibleElements.forEach((el) => {
      const b = getElementBounds(el);
      if (b.minX < minX) minX = b.minX;
      if (b.minY < minY) minY = b.minY;
      if (b.maxX > maxX) maxX = b.maxX;
      if (b.maxY > maxY) maxY = b.maxY;
    });

    const pad = 400;
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;
    const miniScale = Math.min(mw / Math.max(100, maxX - minX), mh / Math.max(100, maxY - minY));

    minimapCtx.fillStyle = '#FF6B4A';
    visibleElements.forEach((el) => {
      const b = getElementBounds(el);
      minimapCtx.fillRect((b.minX - minX) * miniScale, (b.minY - minY) * miniScale, Math.max(2, (b.maxX - b.minX) * miniScale), Math.max(2, (b.maxY - b.minY) * miniScale));
    });

    const vLeft = -state.panX / state.zoom;
    const vTop = -state.panY / state.zoom;
    const vx = (vLeft - minX) * miniScale;
    const vy = (vTop - minY) * miniScale;
    const vw = Math.max(6, (viewWidth / state.zoom) * miniScale);
    const vh = Math.max(6, (viewHeight / state.zoom) * miniScale);

    minimapViewport.style.left = `${Math.max(0, Math.min(mw - vw, vx))}px`;
    minimapViewport.style.top = `${Math.max(0, Math.min(mh - vh, vy))}px`;
    minimapViewport.style.width = `${Math.min(mw, vw)}px`;
    minimapViewport.style.height = `${Math.min(mh, vh)}px`;

    minimapBody.onclick = (e) => {
      const rect = minimapCanvas.getBoundingClientRect();
      const targetWorldX = minX + (e.clientX - rect.left) / miniScale;
      const targetWorldY = minY + (e.clientY - rect.top) / miniScale;
      smoothFlyTo(targetWorldX, targetWorldY);
    };
  }

  const minimapHeader = document.querySelector('.minimap-header');
  if (minimapHeader) {
    minimapHeader.addEventListener('click', () => {
      minimapPanel.classList.toggle('collapsed');
      minimapToggleBtn.textContent = minimapPanel.classList.contains('collapsed') ? '▴' : '▾';
      if (typeof playSound === 'function') playSound('pop');
    });
  }

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

    // Mode & Page Isolation check: Hide DOM elements not belonging to current mode / page
    if (!isElementVisibleInCurrentMode(el)) {
      domNode.style.display = 'none';
      return;
    } else {
      domNode.style.display = '';
    }

    const screenPos = worldToScreen(el.x, el.y);
    domNode.style.transform = `translate(${screenPos.x}px, ${screenPos.y}px) scale(${state.zoom})`;
    if (el.type === 'code') {
      if (el.w) domNode.style.width = `${el.w}px`;
      if (el.h) {
        const body = domNode.querySelector('.code-body');
        if (body) body.style.height = `${el.h}px`;
      }
    } else if (el.type === 'sticky') {
      if (el.w) domNode.style.width = `${el.w}px`;
      if (el.h) domNode.style.minHeight = `${el.h}px`;
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

    el.w = el.w || 220;
    el.h = el.h || 180;
    card.style.width = `${el.w}px`;
    card.style.minHeight = `${el.h}px`;

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

    // Enlarge / Size Cycle Button
    const enlargeBtn = document.createElement('button');
    enlargeBtn.className = 'sticky-btn-enlarge';
    enlargeBtn.title = 'Enlarge Note (Cycle: Small, Medium, Large, XL)';
    enlargeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>';

    const STICKY_SIZES = [
      { name: 'Small', w: 200, h: 160 },
      { name: 'Medium', w: 280, h: 220 },
      { name: 'Large', w: 380, h: 300 },
      { name: 'Extra Large', w: 500, h: 380 }
    ];

    ['pointerdown', 'mousedown'].forEach((evtType) => {
      enlargeBtn.addEventListener(evtType, (e) => e.stopPropagation());
    });

    enlargeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!canCurrentUserDraw()) {
        showToast('🎓 Presentation Mode: Only the Host can edit canvas.', 'warning');
        return;
      }
      const curW = el.w || 220;
      let nextIdx = 0;
      for (let i = 0; i < STICKY_SIZES.length; i++) {
        if (curW < STICKY_SIZES[i].w - 10) {
          nextIdx = i;
          break;
        }
      }
      if (curW >= STICKY_SIZES[STICKY_SIZES.length - 1].w - 10) {
        nextIdx = 0;
      }
      const targetSize = STICKY_SIZES[nextIdx];
      el.w = targetSize.w;
      el.h = targetSize.h;
      card.style.width = `${el.w}px`;
      card.style.minHeight = `${el.h}px`;
      sound.playPop();
      socket.emit('element:update', { id: el.id, w: el.w, h: el.h });
      showToast(`Sticky Note: ${targetSize.name} (${targetSize.w}×${targetSize.h})`);
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

    actions.appendChild(enlargeBtn);
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

    // Bottom-Right Corner Drag-to-Resize Grip Handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'sticky-resize-handle';
    resizeHandle.title = 'Drag to Resize Sticky Note';
    resizeHandle.innerHTML = '<svg viewBox="0 0 10 10" width="10" height="10"><path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

    let isResizing = false;
    let resizeStartPos = { x: 0, y: 0 };
    let startDimensions = { w: el.w || 220, h: el.h || 180 };

    resizeHandle.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (!canCurrentUserDraw()) return;
      isResizing = true;
      resizeStartPos = { x: e.clientX, y: e.clientY };
      startDimensions = { w: el.w || card.offsetWidth, h: el.h || card.offsetHeight };
      resizeHandle.setPointerCapture(e.pointerId);
      card.style.zIndex = '100';
    });

    resizeHandle.addEventListener('pointermove', (e) => {
      if (!isResizing) return;
      const dx = (e.clientX - resizeStartPos.x) / state.zoom;
      const dy = (e.clientY - resizeStartPos.y) / state.zoom;
      const newW = Math.max(160, Math.min(800, Math.round(startDimensions.w + dx)));
      const newH = Math.max(130, Math.min(800, Math.round(startDimensions.h + dy)));
      el.w = newW;
      el.h = newH;
      card.style.width = `${newW}px`;
      card.style.minHeight = `${newH}px`;
    });

    resizeHandle.addEventListener('pointerup', (e) => {
      if (!isResizing) return;
      isResizing = false;
      card.style.zIndex = '';
      try { resizeHandle.releasePointerCapture(e.pointerId); } catch (err) {}
      socket.emit('element:update', { id: el.id, w: el.w, h: el.h });
      sound.playClick();
    });

    card.appendChild(header);
    card.appendChild(textarea);
    card.appendChild(resizeHandle);

    let isDragging = false;
    let dragStartPos = { x: 0, y: 0 };
    let initialWorldPos = { x: el.x, y: el.y };

    header.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.sticky-actions') || e.target.closest('.sticky-btn-delete') || e.target.closest('.sticky-btn-enlarge')) return;
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
    if (!el.fontSize) {
      el.fontSize = el.width ? Math.max(16, el.width * 5) : 20;
    }
    if (!el.color) {
      el.color = state.activeColor || '#111827';
    }

    const box = document.createElement('div');
    box.className = 'board-text-box';
    box.dataset.id = el.id;

    const header = document.createElement('div');
    header.className = 'board-text-header';

    // Drag handle icon / label
    const dragTag = document.createElement('span');
    dragTag.className = 'board-text-drag-tag';
    dragTag.title = 'Drag to move';
    dragTag.innerHTML = `🔤`;
    header.appendChild(dragTag);

    // Font Size Stepper (-) [20px] (+)
    const sizeMinusBtn = document.createElement('button');
    sizeMinusBtn.type = 'button';
    sizeMinusBtn.className = 'board-text-btn-size';
    sizeMinusBtn.title = 'Decrease Text Size';
    sizeMinusBtn.innerHTML = '−';

    const sizeValBadge = document.createElement('span');
    sizeValBadge.className = 'board-text-size-val';
    sizeValBadge.textContent = `${el.fontSize}px`;

    const sizePlusBtn = document.createElement('button');
    sizePlusBtn.type = 'button';
    sizePlusBtn.className = 'board-text-btn-size';
    sizePlusBtn.title = 'Increase Text Size';
    sizePlusBtn.innerHTML = '+';

    header.appendChild(sizeMinusBtn);
    header.appendChild(sizeValBadge);
    header.appendChild(sizePlusBtn);

    // Separator
    const sep1 = document.createElement('div');
    sep1.className = 'board-text-sep';
    header.appendChild(sep1);

    // Color Swatches
    const TEXT_COLORS = ['#111827', '#ED1C24', '#22B14C', '#00A2E8', '#8B5CF6', '#FF7F27', '#FBBF24'];
    const colorDotsWrap = document.createElement('div');
    colorDotsWrap.className = 'board-text-colors-wrap';

    TEXT_COLORS.forEach((colorHex) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = `board-text-color-dot ${el.color === colorHex ? 'active' : ''}`;
      dot.dataset.color = colorHex;
      dot.style.backgroundColor = colorHex;
      dot.title = `Color: ${colorHex}`;

      ['pointerdown', 'mousedown', 'pointerup', 'click'].forEach((evtType) => {
        dot.addEventListener(evtType, (e) => e.stopPropagation());
      });

      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!canCurrentUserDraw()) {
          showToast('🎓 Presentation Mode: Canvas is View-Only.', 'warning');
          return;
        }
        el.color = colorHex;
        textarea.style.color = colorHex;
        colorDotsWrap.querySelectorAll('.board-text-color-dot').forEach((d) => d.classList.remove('active'));
        dot.classList.add('active');
        socket.emit('element:update', { id: el.id, color: el.color });
        sound.playPop();
      });

      colorDotsWrap.appendChild(dot);
    });

    header.appendChild(colorDotsWrap);

    // Separator
    const sep2 = document.createElement('div');
    sep2.className = 'board-text-sep';
    header.appendChild(sep2);

    // Delete Button
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
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
    textarea.placeholder = 'Type text here...';
    textarea.value = el.text || '';
    textarea.style.color = el.color;
    textarea.style.fontSize = `${el.fontSize}px`;
    textarea.rows = 1;

    function autoResize() {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(30, textarea.scrollHeight)}px`;
    }

    sizeMinusBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!canCurrentUserDraw()) return;
      el.fontSize = Math.max(12, (el.fontSize || 20) - 3);
      textarea.style.fontSize = `${el.fontSize}px`;
      sizeValBadge.textContent = `${el.fontSize}px`;
      autoResize();
      socket.emit('element:update', { id: el.id, fontSize: el.fontSize });
      sound.playClick();
    });

    sizePlusBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!canCurrentUserDraw()) return;
      el.fontSize = Math.min(72, (el.fontSize || 20) + 3);
      textarea.style.fontSize = `${el.fontSize}px`;
      sizeValBadge.textContent = `${el.fontSize}px`;
      autoResize();
      socket.emit('element:update', { id: el.id, fontSize: el.fontSize });
      sound.playClick();
    });

    ['pointerdown', 'mousedown', 'pointerup', 'click'].forEach((evtType) => {
      sizeMinusBtn.addEventListener(evtType, (e) => e.stopPropagation());
      sizePlusBtn.addEventListener(evtType, (e) => e.stopPropagation());
    });

    ['pointerdown', 'mousedown', 'keydown'].forEach((evtType) => {
      textarea.addEventListener(evtType, (e) => e.stopPropagation());
    });

    let typingTimeout = null;
    textarea.addEventListener('input', () => {
      if (!canCurrentUserDraw()) return;
      autoResize();
      el.text = textarea.value;
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => socket.emit('element:update', { id: el.id, text: el.text, fontSize: el.fontSize, color: el.color }), 150);
    });

    textarea.addEventListener('focus', () => {
      if (!canCurrentUserDraw()) {
        textarea.blur();
        showToast('🎓 Presentation Mode: Canvas is View-Only.', 'info');
        return;
      }
      box.classList.add('active');
      autoResize();
    });
    textarea.addEventListener('blur', () => box.classList.remove('active'));

    box.appendChild(header);
    box.appendChild(textarea);

    let isDragging = false;
    let dragStartPos = { x: 0, y: 0 };
    let initialWorldPos = { x: el.x, y: el.y };

    box.addEventListener('pointerdown', (e) => {
      if (e.target === textarea || e.target.closest('.board-text-btn-delete') || e.target.closest('.board-text-btn-size') || e.target.closest('.board-text-color-dot')) return;
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
    ['pointerdown', 'mousedown'].forEach((evtType) => {
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

    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (!canCurrentUserDraw()) {
        showToast('🎓 Presentation Mode: Only Host can edit canvas.', 'warning');
        return;
      }
      card.remove();
      state.domElementsMap.delete(el.id);
      state.elements = state.elements.filter((item) => item.id !== el.id);
      redrawBoard();
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

  // --- 10. Selection Handles & Size Sync Engine ---
  function setBrushSize(newSize) {
    const clamped = Math.max(1, Math.min(50, Math.round(newSize)));
    state.activeWidth = clamped;
    syncBrushSizeUI();
    syncColorPopoverUI();
    if (state.selectedElementId && canCurrentUserDraw()) {
      const el = state.elements.find((item) => item.id === state.selectedElementId);
      if (el) {
        el.width = state.activeWidth;
        redrawBoard();
        socket.emit('element:update', el);
      }
    }
  }

  function syncBrushSizeUI() {
    const size = state.activeWidth || 3;
    const badge = document.getElementById('brushSizeValBadge');
    const slider = document.getElementById('brushSizeSlider');
    const previewDot = document.getElementById('brushSizePreviewDot');

    if (badge) badge.textContent = `${size} px`;
    if (slider) slider.value = size;
    if (previewDot) {
      const dotDiameter = Math.min(42, Math.max(3, size * 1.3));
      previewDot.style.width = `${dotDiameter}px`;
      previewDot.style.height = `${dotDiameter}px`;
      previewDot.style.backgroundColor = state.activeColor || '#FF6B4A';
    }

    document.querySelectorAll('.size-preset-btn').forEach((btn) => {
      btn.classList.toggle('active', parseInt(btn.dataset.size, 10) === size);
    });

    if (colorPopover) {
      colorPopover.querySelectorAll('.width-btn').forEach((b) => {
        b.classList.toggle('active', parseInt(b.dataset.width, 10) === size);
      });
    }
  }

  function setEraserSize(newSize) {
    const clamped = Math.max(4, Math.min(64, Math.round(newSize)));
    state.activeEraserSize = clamped;
    syncEraserSizeUI();
  }

  function syncEraserSizeUI() {
    const size = state.activeEraserSize || 20;
    const badge = document.getElementById('eraserSizeValBadge');
    const slider = document.getElementById('eraserSizeSlider');
    const previewDot = document.getElementById('eraserSizePreviewDot');

    if (badge) badge.textContent = `${size} px`;
    if (slider) slider.value = size;
    if (previewDot) {
      const previewDim = Math.min(42, Math.max(8, size * 0.9));
      previewDot.style.width = `${previewDim}px`;
      previewDot.style.height = `${previewDim}px`;
    }

    document.querySelectorAll('.eraser-preset-btn').forEach((btn) => {
      btn.classList.toggle('active', parseInt(btn.dataset.size, 10) === size);
    });
  }

  function syncColorPopoverUI() {
    if (!colorPopover) return;
    const slot1Btn = document.getElementById('slotColor1');
    const slot2Btn = document.getElementById('slotColor2');
    const slotSwatch1 = document.getElementById('slotSwatch1');
    const slotSwatch2 = document.getElementById('slotSwatch2');
    const activeColorDot = document.getElementById('activeColorDot');
    const activeFillDot = document.getElementById('activeFillDot');

    if (slot1Btn) slot1Btn.classList.toggle('active', state.activeColorSlot === 'color1');
    if (slot2Btn) slot2Btn.classList.toggle('active', state.activeColorSlot === 'color2');

    if (slotSwatch1) slotSwatch1.style.backgroundColor = state.activeColor;
    if (slotSwatch2) slotSwatch2.style.backgroundColor = state.activeFillColor;
    if (activeColorDot) activeColorDot.style.backgroundColor = state.activeColor;
    if (activeFillDot) activeFillDot.style.backgroundColor = state.activeFillColor;

    const currentSelectedColor = (state.activeColorSlot === 'color1' ? state.activeColor : state.activeFillColor) || '#ED1C24';
    colorPopover.querySelectorAll('.ms-color-dot').forEach((b) => {
      b.classList.toggle('active', b.dataset.color.toLowerCase() === currentSelectedColor.toLowerCase());
    });

    colorPopover.querySelectorAll('.fill-style-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.fill === (state.activeFillStyle || 'none'));
    });
    colorPopover.querySelectorAll('.width-btn').forEach((b) => {
      b.classList.toggle('active', parseInt(b.dataset.width, 10) === state.activeWidth);
    });

    const previewDot = document.getElementById('brushSizePreviewDot');
    if (previewDot) previewDot.style.backgroundColor = state.activeColor || '#FF6B4A';
  }

  function selectElement(id) {
    state.selectedElementId = id;
    updateSelectionBoxPosition();
    const el = state.elements.find((item) => item.id === id);
    if (el) {
      if (el.color) state.activeColor = el.color;
      if (el.width) {
        state.activeWidth = el.width;
        syncBrushSizeUI();
      }
      if (el.fillStyle !== undefined) state.activeFillStyle = el.fillStyle;
      if (el.fillColor !== undefined) state.activeFillColor = el.fillColor;
      syncColorPopoverUI();
    }
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

    // Remote Cursors (Rendered if user has not toggled them hidden)
    if (state.showRemoteCursors !== false) {
      const currentContext = getActiveDrawingPageId();

      state.collaborators.forEach((peer) => {
        if (!peer.cursor) return;
        const peerContext = peer.activePageId || (peer.canvasMode === 'infinite' ? 'playground' : 'page_1');
        // Isolation: strictly render cursors of collaborators in the same mode and page
        if (peerContext !== currentContext) {
          return;
        }
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
        cursorCtx.stroke();
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

        const isPeerPrimaryHost = state.hostSessionId && peer.sessionId === state.hostSessionId;
        const isPeerCoHost = !!(state.coHostSessionIds && state.coHostSessionIds.has(peer.sessionId));

        // Host / Co-Host indicator on cursor
        if (isPeerPrimaryHost) {
          cursorCtx.font = '10px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
          cursorCtx.textAlign = 'center';
          cursorCtx.textBaseline = 'middle';
          cursorCtx.fillText('👑', circleCenterX + 10, circleCenterY - 9);
        } else if (isPeerCoHost) {
          cursorCtx.font = '10px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
          cursorCtx.textAlign = 'center';
          cursorCtx.textBaseline = 'middle';
          cursorCtx.fillText('⭐', circleCenterX + 10, circleCenterY - 9);
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
    }

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

    // Live Eraser Cursor Box (MS Paint Style)
    if (state.activeTool === 'eraser' && lastClientPos.x > 0 && lastClientPos.y > 0) {
      const eraserScreenSize = Math.max(6, (state.activeEraserSize || 20) * state.zoom);
      cursorCtx.save();
      cursorCtx.translate(lastClientPos.x, lastClientPos.y);

      // Outer outline
      cursorCtx.strokeStyle = currentTheme === 'dark' ? '#FFFFFF' : '#0F172A';
      cursorCtx.lineWidth = 1.6;
      cursorCtx.fillStyle = currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.12)';
      cursorCtx.beginPath();
      cursorCtx.rect(-eraserScreenSize / 2, -eraserScreenSize / 2, eraserScreenSize, eraserScreenSize);
      cursorCtx.fill();
      cursorCtx.stroke();

      // Inner contrast border
      cursorCtx.strokeStyle = currentTheme === 'dark' ? 'rgba(0, 0, 0, 0.65)' : 'rgba(255, 255, 255, 0.85)';
      cursorCtx.lineWidth = 1;
      cursorCtx.strokeRect(-eraserScreenSize / 2 + 1, -eraserScreenSize / 2 + 1, Math.max(1, eraserScreenSize - 2), Math.max(1, eraserScreenSize - 2));

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
    if (!state.roomId || state.currentScreen !== 'whiteboard') return;
    const now = performance.now();
    if (now - lastBroadcastTime > 30 || chatText !== undefined) {
      lastBroadcastTime = now;
      const worldPos = screenToWorld(clientX, clientY);
      socket.emit('cursor:move', {
        x: worldPos.x,
        y: worldPos.y,
        pageId: getActiveDrawingPageId(),
        canvasMode: state.canvasMode,
        chatText: chatText !== undefined ? chatText : (state.localChatActive ? cursorChatInput.value : '')
      });
    }
  }

  // --- Room Mode & Permissions Helpers ---
  function isCurrentUserPrimaryHost() {
    return !state.hostSessionId || state.hostSessionId === state.user.sessionId;
  }

  function isCurrentUserCoHost() {
    return !!(state.coHostSessionIds && state.coHostSessionIds.has(state.user.sessionId));
  }

  function isCurrentUserHost() {
    return isCurrentUserPrimaryHost() || isCurrentUserCoHost();
  }

  function canCurrentUserDraw() {
    if (!state.roomMode || state.roomMode === 'friendly') return true;
    return isCurrentUserHost();
  }

  function openManageHostsModal() {
    renderManageHostsModal();
    if (manageHostsModal) manageHostsModal.classList.add('active');
  }

  function closeManageHostsModal() {
    if (manageHostsModal) manageHostsModal.classList.remove('active');
  }

  function renderManageHostsModal() {
    if (!hostsParticipantsList) return;
    hostsParticipantsList.innerHTML = '';

    const isSelfPrimary = isCurrentUserPrimaryHost();
    const isSelfCoHost = isCurrentUserCoHost();

    // Update current role badge in header
    if (myRoleIndicator) {
      if (isSelfPrimary) {
        myRoleIndicator.textContent = '👑 Primary Host';
        myRoleIndicator.style.color = '#EAB308';
      } else if (isSelfCoHost) {
        myRoleIndicator.textContent = '⭐ Co-Host';
        myRoleIndicator.style.color = '#3B82F6';
      } else {
        myRoleIndicator.textContent = '👤 Participant';
        myRoleIndicator.style.color = 'var(--text-muted)';
      }
    }

    // Build all users list: Self + Collaborators
    const allUsers = [];

    // Self
    allUsers.push({
      sessionId: state.user.sessionId,
      id: state.user.id || 'self',
      rawName: state.user.name || state.user.username || 'You',
      avatar: state.user.avatar,
      color: state.user.color,
      isSelf: true,
      isPrimaryHost: isSelfPrimary,
      isCoHost: isSelfCoHost
    });

    // Peers
    state.collaborators.forEach((peer) => {
      const isPeerPrimary = state.hostSessionId && peer.sessionId === state.hostSessionId;
      const isPeerCo = !!(state.coHostSessionIds && state.coHostSessionIds.has(peer.sessionId));
      allUsers.push({
        sessionId: peer.sessionId || peer.id,
        id: peer.id,
        rawName: peer.name || 'Collaborator',
        avatar: peer.avatar,
        color: peer.color || '#FF6B4A',
        isSelf: false,
        isPrimaryHost: isPeerPrimary,
        isCoHost: isPeerCo
      });
    });

    if (hostsParticipantCount) {
      hostsParticipantCount.textContent = allUsers.length;
    }

    allUsers.forEach((userItem) => {
      const item = document.createElement('div');
      item.className = 'host-participant-item';

      // Left column: Avatar + Details
      const leftCol = document.createElement('div');
      leftCol.className = 'host-user-left';

      const avWrap = document.createElement('div');
      avWrap.className = 'host-user-avatar-wrap';

      const avDiv = document.createElement('div');
      avDiv.className = 'host-user-avatar';
      avDiv.style.setProperty('--c', userItem.color);
      setAvatarElement(avDiv, userItem.avatar, (userItem.rawName || 'U').charAt(0).toUpperCase());

      // Role badge icon over avatar
      if (userItem.isPrimaryHost) {
        const crown = document.createElement('span');
        crown.className = 'host-role-badge-icon';
        crown.textContent = '👑';
        crown.title = 'Primary Host';
        avWrap.appendChild(crown);
      } else if (userItem.isCoHost) {
        const star = document.createElement('span');
        star.className = 'host-role-badge-icon';
        star.textContent = '⭐';
        star.title = 'Co-Host';
        avWrap.appendChild(star);
      }

      avWrap.appendChild(avDiv);
      leftCol.appendChild(avWrap);

      const detailsDiv = document.createElement('div');
      detailsDiv.className = 'host-user-details';

      const nameRow = document.createElement('div');
      nameRow.className = 'host-user-name-row';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'host-user-name';
      nameSpan.textContent = userItem.rawName;
      nameRow.appendChild(nameSpan);

      if (userItem.isSelf) {
        const selfTag = document.createElement('span');
        selfTag.className = 'host-self-tag';
        selfTag.textContent = 'YOU';
        nameRow.appendChild(selfTag);
      }

      detailsDiv.appendChild(nameRow);

      const roleText = document.createElement('span');
      roleText.className = `host-user-status-text ${userItem.isPrimaryHost ? 'is-primary' : (userItem.isCoHost ? 'is-cohost' : '')}`;
      if (userItem.isPrimaryHost) {
        roleText.textContent = '👑 Primary Host (Room Owner)';
      } else if (userItem.isCoHost) {
        roleText.textContent = '⭐ Co-Host (Can Present & Draw)';
      } else {
        roleText.textContent = '👤 Participant';
      }
      detailsDiv.appendChild(roleText);
      leftCol.appendChild(detailsDiv);
      item.appendChild(leftCol);

      // Right column: Actions
      if (!userItem.isSelf) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'host-user-actions';

        // 1. Follow View / Jump to Peer
        const peerObj = state.collaborators.get(userItem.id);
        if (peerObj && peerObj.cursor) {
          const viewBtn = document.createElement('button');
          viewBtn.className = 'btn-host-action btn-view-peer';
          viewBtn.innerHTML = '<span>🎯 View</span>';
          viewBtn.title = `Jump camera to ${userItem.rawName}'s view`;
          viewBtn.addEventListener('click', () => {
            sound.playClick();
            smoothFlyTo(peerObj.cursor.x, peerObj.cursor.y);
            showToast(`Following ${userItem.rawName}`);
            closeManageHostsModal();
          });
          actionsDiv.appendChild(viewBtn);
        }

        // 2. Primary Host Actions: Co-Host & Transfer
        if (isSelfPrimary) {
          // Co-Host Toggle Button
          const coHostBtn = document.createElement('button');
          coHostBtn.className = `btn-host-action btn-cohost-toggle ${userItem.isCoHost ? 'active' : ''}`;
          coHostBtn.innerHTML = userItem.isCoHost ? '<span>⭐ Remove Co-Host</span>' : '<span>⭐ Co-Host</span>';
          coHostBtn.title = userItem.isCoHost ? 'Revoke Co-Host access' : 'Grant Co-Host presentation and draw access';
          coHostBtn.addEventListener('click', () => {
            sound.playClick();
            socket.emit('room:toggle_cohost', {
              targetSessionId: userItem.sessionId,
              isCoHost: !userItem.isCoHost
            });
          });
          actionsDiv.appendChild(coHostBtn);

          // Transfer Host Button
          const transferBtn = document.createElement('button');
          transferBtn.className = 'btn-host-action btn-transfer-action';
          transferBtn.innerHTML = '<span>👑 Transfer</span>';
          transferBtn.title = `Transfer full room ownership to ${userItem.rawName}`;
          transferBtn.addEventListener('click', () => {
            sound.playClick();
            const confirmed = window.confirm(
              `👑 Transfer Room Host Ownership?\n\nAre you sure you want to transfer full Primary Host ownership to "${userItem.rawName}"?\n\nYou will step down to a regular participant.`
            );
            if (confirmed) {
              socket.emit('room:transfer_host', {
                targetSessionId: userItem.sessionId
              });
              closeManageHostsModal();
            }
          });
          actionsDiv.appendChild(transferBtn);
        }

        // 3. Host Kick Action (Primary Host or Co-Host)
        const canKick = isSelfPrimary || (isSelfCoHost && !userItem.isPrimaryHost && !userItem.isCoHost);
        if (canKick) {
          const kickBtn = document.createElement('button');
          kickBtn.className = 'btn-host-action btn-kick-action';
          kickBtn.innerHTML = '<span>🚫 Kick</span>';
          kickBtn.title = `Remove ${userItem.rawName} from this room`;
          kickBtn.addEventListener('click', () => {
            sound.playPop();
            const confirmed = window.confirm(
              `🚫 Kick User from Room?\n\nAre you sure you want to remove "${userItem.rawName}" from this room?`
            );
            if (confirmed) {
              socket.emit('room:kick_user', {
                targetSessionId: userItem.sessionId,
                targetSocketId: userItem.id,
                name: userItem.rawName
              });
              showToast(`Removed ${userItem.rawName} from room`, 'info');
            }
          });
          actionsDiv.appendChild(kickBtn);
        }

        if (actionsDiv.children.length > 0) {
          item.appendChild(actionsDiv);
        }
      }

      hostsParticipantsList.appendChild(item);
    });
  }

  function updateRoomModeUI() {
    const isPrimary = isCurrentUserPrimaryHost();
    const isCoHost = isCurrentUserCoHost();
    const isHost = isPrimary || isCoHost;
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
        if (roomModeLabel) {
          if (isPrimary) roomModeLabel.textContent = 'Host Mode (Owner)';
          else if (isCoHost) roomModeLabel.textContent = 'Host Mode (Co-Host)';
          else roomModeLabel.textContent = 'View Only (Host Mode)';
        }
      }

      if (isHost) {
        roomModeBtn.classList.remove('read-only-badge');
        roomModeBtn.title = 'Switch Canvas Access Mode (Friendly vs Host Presentation)';
      } else {
        roomModeBtn.classList.add('read-only-badge');
        roomModeBtn.title = isFriendly ? 'Friendly Mode: Everyone can draw' : 'Presentation Mode: Controlled by Hosts';
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

  function redrawDraftLayer() {
    draftCtx.clearRect(0, 0, viewWidth, viewHeight);

    // 1. Peer remote in-progress drawings
    if (state.remoteLiveDrafts && state.remoteLiveDrafts.size > 0) {
      const currentContext = getActiveDrawingPageId();

      state.remoteLiveDrafts.forEach((draft) => {
        if (!draft) return;
        const draftContext = draft.pageId || (draft.canvasMode === 'infinite' ? 'playground' : 'page_1');
        // Mode & Page Isolation: only render live draft strokes on the active mode & page
        if (draftContext !== currentContext) {
          return;
        }

        if (ALL_BRUSH_TOOLS.includes(draft.tool) && draft.points && draft.points.length > 0) {
          drawElement(draftCtx, {
            type: draft.tool,
            points: draft.points,
            color: draft.color || '#FF6B4A',
            width: draft.width || 3
          });
        } else if (ALL_SHAPE_TOOLS.includes(draft.tool) && draft.shapeStart && draft.shapeEnd) {
          const previewEl = getShapeElementObject(draft.tool, draft.shapeStart, draft.shapeEnd);
          if (previewEl) {
            if (draft.color) previewEl.color = draft.color;
            if (draft.width) previewEl.width = draft.width;
            if (draft.fillStyle) previewEl.fillStyle = draft.fillStyle;
            if (draft.fillColor) previewEl.fillColor = draft.fillColor;
            drawElement(draftCtx, previewEl);
          }
        }
      });
    }

    // 2. Local in-progress drawing
    if (isDrawing) {
      if (ALL_BRUSH_TOOLS.includes(state.activeTool) && activeStrokePoints.length > 0) {
        drawElement(draftCtx, {
          type: state.activeTool,
          points: activeStrokePoints,
          color: state.activeColor,
          width: state.activeWidth
        });
      } else if (ALL_SHAPE_TOOLS.includes(state.activeTool) && currentShapeStart && lastClientPos) {
        const previewElement = getShapeElementObject(state.activeTool, currentShapeStart, screenToWorld(lastClientPos.x, lastClientPos.y));
        if (previewElement) drawElement(draftCtx, previewElement);
      }
    }
  }

  function setupCanvasEvents() {
    boardCanvas.addEventListener('pointerdown', (e) => {
      dismissAllPopovers();
      lastClientPos = { x: e.clientX, y: e.clientY };

      try {
        boardCanvas.setPointerCapture(e.pointerId);
      } catch (err) {}

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
        socket.emit('laser:trail', { x: worldPos.x, y: worldPos.y, pageId: getActiveDrawingPageId(), canvasMode: state.canvasMode, color: state.user.color });
        return;
      }

      if (state.activeTool === 'sticky') {
        const newSticky = {
          id: 'sticky_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          type: 'sticky',
          pageId: getActiveDrawingPageId(),
          canvasMode: state.canvasMode,
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
          pageId: getActiveDrawingPageId(),
          canvasMode: state.canvasMode,
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
          pageId: getActiveDrawingPageId(),
          canvasMode: state.canvasMode,
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
        lastEraserPos = worldPos;
        eraseAtPoint(worldPos);
        isDrawing = true;
        return;
      }

      if (state.activeTool === 'fill') {
        const hitId = hitTestAnyElement(worldPos);
        const activeFill = (state.activeColorSlot === 'color2') ? state.activeFillColor : state.activeColor;
        if (hitId) {
          const el = state.elements.find((item) => item.id === hitId);
          if (el) {
            if (ALL_2D_SHAPES.includes(el.type)) {
              const oldState = { fillStyle: el.fillStyle, fillColor: el.fillColor };
              el.fillStyle = (state.activeFillStyle && state.activeFillStyle !== 'none') ? state.activeFillStyle : 'solid';
              el.fillColor = activeFill;
              state.undoStack.push({ type: 'update', element: el, previous: oldState });
              state.redoStack = [];
              redrawBoard();
              socket.emit('element:update', el);
              addEmojiBurst('🎨', e.clientX, e.clientY);
              sound.playPop();
              showToast('Filled shape with color!', 'success');
            } else if (el.type === 'sticky') {
              const themes = ['yellow', 'sky', 'pink', 'mint', 'purple', 'peach'];
              const oldTheme = el.theme;
              el.theme = themes[(themes.indexOf(el.theme) + 1) % themes.length];
              const dom = state.domElementsMap.get(el.id);
              if (dom) dom.className = `sticky-note-card theme-${el.theme}`;
              state.undoStack.push({ type: 'update', element: el, previous: { theme: oldTheme } });
              state.redoStack = [];
              socket.emit('element:update', el);
              addEmojiBurst('🎨', e.clientX, e.clientY);
              sound.playPop();
            } else if (el.type === 'pen' || el.type === 'line' || el.type === 'arrow' || el.type === 'curve' || el.type === 'text') {
              const oldColor = el.color;
              el.color = activeFill;
              state.undoStack.push({ type: 'update', element: el, previous: { color: oldColor } });
              state.redoStack = [];
              redrawBoard();
              socket.emit('element:update', el);
              addEmojiBurst('🎨', e.clientX, e.clientY);
              sound.playClick();
            }
          }
        } else {
          sound.playClick();
        }
        return;
      }

      isDrawing = true;
      activeStrokePoints = [worldPos];
      currentShapeStart = worldPos;
      redrawDraftLayer();
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
        socket.emit('laser:trail', { x: worldPos.x, y: worldPos.y, pageId: getActiveDrawingPageId(), canvasMode: state.canvasMode, color: state.user.color });
        return;
      }

      if (state.activeTool === 'eraser') {
        if (lastEraserPos) {
          eraseAlongLine(lastEraserPos, worldPos);
        } else {
          eraseAtPoint(worldPos);
        }
        lastEraserPos = worldPos;
        return;
      }

      if (ALL_BRUSH_TOOLS.includes(state.activeTool)) {
        activeStrokePoints.push(worldPos);
        redrawDraftLayer();
        socket.emit('draw:live', {
          tool: state.activeTool,
          pageId: getActiveDrawingPageId(),
          canvasMode: state.canvasMode,
          points: activeStrokePoints,
          color: state.activeColor,
          width: state.activeWidth
        });
      } else if (ALL_SHAPE_TOOLS.includes(state.activeTool)) {
        redrawDraftLayer();
        socket.emit('draw:live', {
          tool: state.activeTool,
          pageId: getActiveDrawingPageId(),
          canvasMode: state.canvasMode,
          shapeStart: currentShapeStart,
          shapeEnd: worldPos,
          color: state.activeColor,
          width: state.activeWidth,
          fillStyle: state.activeFillStyle || 'none',
          fillColor: state.activeFillColor || '#FFFFFF'
        });
      }
    });

    const finishDrawing = (e) => {
      try {
        if (e && e.pointerId && boardCanvas.hasPointerCapture(e.pointerId)) {
          boardCanvas.releasePointerCapture(e.pointerId);
        }
      } catch (err) {}

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
      lastEraserPos = null;

      // End live drawing preview for remote peers
      socket.emit('draw:live_end', {});

      if (state.activeTool === 'eraser' || state.activeTool === 'laser') {
        redrawDraftLayer();
        return;
      }

      const clientX = (e && typeof e.clientX === 'number') ? e.clientX : (lastClientPos ? lastClientPos.x : window.innerWidth / 2);
      const clientY = (e && typeof e.clientY === 'number') ? e.clientY : (lastClientPos ? lastClientPos.y : window.innerHeight / 2);
      const worldPos = screenToWorld(clientX, clientY);

      if (ALL_BRUSH_TOOLS.includes(state.activeTool)) {
        if (activeStrokePoints.length === 1) {
          activeStrokePoints.push({ x: activeStrokePoints[0].x + 0.1, y: activeStrokePoints[0].y + 0.1 });
        }
        if (activeStrokePoints.length > 1) {
          const isSmoothStandard = (state.activeTool === 'pen' || state.activeTool === 'brush');
          const finalPoints = isSmoothStandard ? simplifyPoints(activeStrokePoints, 0.3) : activeStrokePoints.slice();
          const newEl = {
            id: 'stroke_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            type: state.activeTool,
            pageId: getActiveDrawingPageId(),
            canvasMode: state.canvasMode,
            points: finalPoints,
            color: state.activeColor,
            width: state.activeWidth
          };
          commitNewElement(newEl);
        }
      } else if (ALL_SHAPE_TOOLS.includes(state.activeTool)) {
        const newEl = getShapeElementObject(state.activeTool, currentShapeStart, worldPos);
        if (newEl) commitNewElement(newEl);
      }
      activeStrokePoints = [];
      currentShapeStart = null;
      redrawDraftLayer();
    };

    window.addEventListener('pointerup', finishDrawing);
    window.addEventListener('pointercancel', finishDrawing);

    boardCanvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = 1.09;
      const newZoom = e.deltaY < 0 ? state.zoom * zoomFactor : state.zoom / zoomFactor;
      applyZoom(newZoom, e.clientX || window.innerWidth / 2, e.clientY || window.innerHeight / 2);
    }, { passive: false });

    boardCanvas.addEventListener('dblclick', (e) => {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      addRadarPing(e.clientX, e.clientY, state.user.color, state.user.name || state.user.username);
      sound.playRadarPing();
      socket.emit('radar:ping', {
        x: worldPos.x,
        y: worldPos.y,
        pageId: state.activePageId || 'page_1',
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
    const threshold = 18 / state.zoom;

    for (let i = state.elements.length - 1; i >= 0; i--) {
      const el = state.elements[i];
      if (!isElementVisibleInCurrentMode(el)) continue;

      if (ALL_2D_SHAPES.includes(el.type) || el.type === 'image') {
        const minX = Math.min(el.x, el.x + (el.w || 0));
        const maxX = Math.max(el.x, el.x + (el.w || 0));
        const minY = Math.min(el.y, el.y + (el.h || 0));
        const maxY = Math.max(el.y, el.y + (el.h || 0));
        if (worldPos.x >= minX && worldPos.x <= maxX && worldPos.y >= minY && worldPos.y <= maxY) return el.id;
      } else if (el.type === 'line' || el.type === 'arrow' || el.type === 'curve') {
        if (distToSegment(worldPos, { x: el.x1, y: el.y1 }, { x: el.x2, y: el.y2 }) < threshold) return el.id;
      } else if (ALL_BRUSH_TOOLS.includes(el.type)) {
        if (el.points) {
          for (let j = 0; j < el.points.length; j++) {
            if (Math.hypot(el.points[j].x - worldPos.x, el.points[j].y - worldPos.y) < threshold) return el.id;
          }
        }
      }
    }
    return null;
  }

  function getShapeElementObject(tool, start, end) {
    const id = 'shape_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const pageId = getActiveDrawingPageId();
    const canvasMode = state.canvasMode;

    if (tool === 'line' || tool === 'arrow' || tool === 'curve') {
      const dist = Math.hypot(end.x - start.x, end.y - start.y);
      if (dist < 3) return null;
      return { id, type: tool, pageId, canvasMode, x1: start.x, y1: start.y, x2: end.x, y2: end.y, color: state.activeColor, width: state.activeWidth };
    } else if (ALL_2D_SHAPES.includes(tool)) {
      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const w = Math.abs(end.x - start.x);
      const h = Math.abs(end.y - start.y);
      if (w < 2 && h < 2) return null;
      return {
        id,
        type: tool,
        pageId,
        canvasMode,
        x,
        y,
        w,
        h,
        color: state.activeColor,
        width: state.activeWidth,
        fillStyle: state.activeFillStyle || 'none',
        fillColor: state.activeFillColor || '#FFFFFF'
      };
    }
    return null;
  }

  function commitNewElement(el) {
    if (!el.pageId) {
      el.pageId = getActiveDrawingPageId();
    }
    if (!el.canvasMode) {
      el.canvasMode = state.canvasMode;
    }
    state.elements.push(el);
    state.undoStack.push({ type: 'add', element: el });
    state.redoStack = [];
    redrawBoard();
    socket.emit('element:add', el);
  }

  let lastEraserPos = null;

  function eraseAtPoint(worldPos) {
    const eraserRadius = (state.activeEraserSize || 20) / 2;
    let erasedAny = false;

    for (let i = state.elements.length - 1; i >= 0; i--) {
      const el = state.elements[i];
      if (!isElementVisibleInCurrentMode(el)) continue;

      if (ALL_BRUSH_TOOLS.includes(el.type)) {
        if (!el.points || el.points.length === 0) continue;

        // Quick bounding box check
        const bounds = getElementBounds(el);
        if (
          worldPos.x < bounds.minX - eraserRadius ||
          worldPos.x > bounds.maxX + eraserRadius ||
          worldPos.y < bounds.minY - eraserRadius ||
          worldPos.y > bounds.maxY + eraserRadius
        ) {
          continue;
        }

        const strokeMargin = ((el.width || 3) * 0.5);

        // Check if eraser touches any point or segment
        let touches = false;
        for (let j = 0; j < el.points.length; j++) {
          if (Math.hypot(el.points[j].x - worldPos.x, el.points[j].y - worldPos.y) <= eraserRadius + strokeMargin) {
            touches = true;
            break;
          }
          if (j < el.points.length - 1) {
            if (distToSegment(worldPos, el.points[j], el.points[j + 1]) <= eraserRadius + strokeMargin) {
              touches = true;
              break;
            }
          }
        }

        if (!touches) continue;

        // Densify points along stroke so the eraser creates a smooth, razor-sharp cut
        const dense = [];
        const stepLimit = Math.max(1.8, eraserRadius / 3.5);
        for (let j = 0; j < el.points.length - 1; j++) {
          const pA = el.points[j];
          const pB = el.points[j + 1];
          dense.push(pA);
          const d = Math.hypot(pB.x - pA.x, pB.y - pA.y);
          if (d > stepLimit) {
            const steps = Math.ceil(d / stepLimit);
            for (let k = 1; k < steps; k++) {
              const frac = k / steps;
              dense.push({
                x: pA.x + (pB.x - pA.x) * frac,
                y: pA.y + (pB.y - pA.y) * frac
              });
            }
          }
        }
        if (el.points.length > 0) {
          dense.push(el.points[el.points.length - 1]);
        }

        // Split dense points into non-erased contiguous runs
        const runs = [];
        let currentRun = [];
        for (let j = 0; j < dense.length; j++) {
          const pt = dense[j];
          const dist = Math.hypot(pt.x - worldPos.x, pt.y - worldPos.y);
          if (dist > eraserRadius) {
            currentRun.push(pt);
          } else {
            if (currentRun.length > 0) {
              runs.push(currentRun);
              currentRun = [];
            }
          }
        }
        if (currentRun.length > 0) {
          runs.push(currentRun);
        }

        erasedAny = true;
        if (runs.length === 0) {
          // Whole stroke erased
          state.undoStack.push({ type: 'delete', element: el });
          state.redoStack = [];
          state.elements.splice(i, 1);
          socket.emit('element:delete', el.id);
        } else {
          // Simplify slightly for clean vectors
          const isSmooth = (el.type === 'pen' || el.type === 'brush');
          const cleanRuns = runs.map(r => (isSmooth && r.length > 3) ? simplifyPoints(r, 0.3) : r);

          const oldPoints = el.points;
          el.points = cleanRuns[0];
          state.undoStack.push({ type: 'update', element: el, previous: { points: oldPoints } });
          state.redoStack = [];
          socket.emit('element:update', el);

          // Add newly created split fragments as independent stroke elements
          for (let k = 1; k < cleanRuns.length; k++) {
            const newSubEl = {
              id: 'stroke_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
              type: el.type,
              pageId: el.pageId || state.activePageId || 'page_1',
              points: cleanRuns[k],
              color: el.color,
              width: el.width
            };
            state.elements.push(newSubEl);
            socket.emit('element:add', newSubEl);
          }
        }
      } else if (ALL_2D_SHAPES.includes(el.type) || el.type === 'image') {
        const minX = Math.min(el.x, el.x + (el.w || 0));
        const maxX = Math.max(el.x, el.x + (el.w || 0));
        const minY = Math.min(el.y, el.y + (el.h || 0));
        const maxY = Math.max(el.y, el.y + (el.h || 0));
        const hit = worldPos.x >= minX - eraserRadius &&
                    worldPos.x <= maxX + eraserRadius &&
                    worldPos.y >= minY - eraserRadius &&
                    worldPos.y <= maxY + eraserRadius;
        if (hit) {
          state.undoStack.push({ type: 'delete', element: el });
          state.redoStack = [];
          state.elements.splice(i, 1);
          socket.emit('element:delete', el.id);
          erasedAny = true;
        }
      } else if (el.type === 'line' || el.type === 'arrow' || el.type === 'curve') {
        const hit = distToSegment(worldPos, { x: el.x1, y: el.y1 }, { x: el.x2, y: el.y2 }) <= eraserRadius + (el.width || 3);
        if (hit) {
          state.undoStack.push({ type: 'delete', element: el });
          state.redoStack = [];
          state.elements.splice(i, 1);
          socket.emit('element:delete', el.id);
          erasedAny = true;
        }
      }
    }

    if (erasedAny) {
      sound.playClick();
      redrawBoard();
    }
  }

  function eraseAlongLine(p1, p2) {
    const d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const radius = (state.activeEraserSize || 20) / 2;
    const step = Math.max(2.5, radius / 2.5);
    const steps = Math.ceil(d / step);
    for (let s = 0; s <= steps; s++) {
      const frac = steps === 0 ? 0 : s / steps;
      eraseAtPoint({
        x: p1.x + (p2.x - p1.x) * frac,
        y: p1.y + (p2.y - p1.y) * frac
      });
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
    const pageId = getActiveDrawingPageId();
    const canvasMode = state.canvasMode;
    const columns = [
      { title: 'TO DO', theme: 'yellow', x: cx },
      { title: 'IN PROGRESS', theme: 'sky', x: cx + 260 },
      { title: 'DONE', theme: 'mint', x: cx + 520 }
    ];
    const batch = [];
    columns.forEach((col, i) => {
      batch.push(
        { id: 'shape_kb_' + Date.now() + '_' + i, type: 'rect', pageId, canvasMode, x: col.x, y: cy, w: 240, h: 400, color: '#64748B', width: 2 },
        { id: 'text_kb_' + Date.now() + '_' + i, type: 'text', pageId, canvasMode, x: col.x + 12, y: cy + 12, text: `📌 ${col.title}`, color: '#FFFFFF', width: 4 },
        { id: 'sticky_kb_' + Date.now() + '_' + i, type: 'sticky', pageId, canvasMode, x: col.x + 20, y: cy + 60, theme: col.theme, text: i === 0 ? 'Brainstorm features' : i === 1 ? 'Design UI prototype' : 'Complete submission', author: state.user.name || state.user.username }
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
    const pageId = getActiveDrawingPageId();
    const canvasMode = state.canvasMode;
    const batch = [
      { id: 'shape_mx_1', type: 'arrow', pageId, canvasMode, x1: center.x - size, y1: center.y, x2: center.x + size, y2: center.y, color: '#38BDF8', width: 3 },
      { id: 'shape_mx_2', type: 'arrow', pageId, canvasMode, x1: center.x, y1: center.y + size, x2: center.x, y2: center.y - size, color: '#34D399', width: 3 },
      { id: 'text_mx_1', type: 'text', pageId, canvasMode, x: center.x - size + 20, y: center.y - size + 20, text: '⭐ High Impact / Low Effort (Quick Wins)', color: '#34D399', width: 3 },
      { id: 'text_mx_2', type: 'text', pageId, canvasMode, x: center.x + 20, y: center.y - size + 20, text: '🚀 High Impact / High Effort (Strategic)', color: '#FBBF24', width: 3 },
      { id: 'text_mx_3', type: 'text', pageId, canvasMode, x: center.x - size + 20, y: center.y + 20, text: '⏳ Low Impact / Low Effort (Fill-ins)', color: '#94A3B8', width: 3 },
      { id: 'text_mx_4', type: 'text', pageId, canvasMode, x: center.x + 20, y: center.y + 20, text: '⚠️ Low Impact / High Effort (Avoid)', color: '#F43F5E', width: 3 }
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
    const pageId = getActiveDrawingPageId();
    const canvasMode = state.canvasMode;
    const columns = [
      { title: '🎉 WHAT WENT WELL', theme: 'mint', x: cx },
      { title: '💡 WHAT TO IMPROVE', theme: 'coral', x: cx + 260 },
      { title: '🎯 ACTION ITEMS', theme: 'sky', x: cx + 520 }
    ];
    const batch = [];
    columns.forEach((col, i) => {
      batch.push(
        { id: 'shape_rt_' + Date.now() + '_' + i, type: 'rect', pageId, canvasMode, x: col.x, y: cy, w: 240, h: 400, color: '#64748B', width: 2 },
        { id: 'text_rt_' + Date.now() + '_' + i, type: 'text', pageId, canvasMode, x: col.x + 12, y: cy + 12, text: col.title, color: '#FFFFFF', width: 4 },
        { id: 'sticky_rt_' + Date.now() + '_' + i, type: 'sticky', pageId, canvasMode, x: col.x + 20, y: cy + 60, theme: col.theme, text: i === 0 ? 'Smooth 60fps performance!' : i === 1 ? 'Add more shortcut hotkeys' : 'Deploy assignment live', author: state.user.name || state.user.username }
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

  function alignPopoverToTrigger(popoverEl, triggerBtn) {
    if (!popoverEl) return;
    if (window.innerWidth <= 768) {
      popoverEl.style.left = '50%';
      popoverEl.style.transform = 'translateX(-50%)';
      popoverEl.style.bottom = '68px';
      return;
    }
    if (!triggerBtn) {
      popoverEl.style.left = '50%';
      popoverEl.style.transform = 'translateX(-50%)';
      popoverEl.style.bottom = '68px';
      return;
    }
    const rect = triggerBtn.getBoundingClientRect();
    const popoverWidth = popoverEl.offsetWidth || 300;
    let targetLeft = rect.left + rect.width / 2;
    const minLeft = popoverWidth / 2 + 10;
    const maxLeft = window.innerWidth - popoverWidth / 2 - 10;
    targetLeft = Math.max(minLeft, Math.min(maxLeft, targetLeft));
    popoverEl.style.left = `${targetLeft}px`;
    popoverEl.style.transform = 'translateX(-50%)';
    popoverEl.style.bottom = `${Math.max(68, window.innerHeight - rect.top + 8)}px`;
  }

  function togglePopover(popoverEl, triggerBtn) {
    if (!popoverEl) return;
    const wasOpen = popoverEl.classList.contains('open') || popoverEl.classList.contains('active');
    dismissAllPopovers();
    if (!wasOpen) {
      popoverEl.classList.add('open');
      popoverEl.classList.add('active');
      if (triggerBtn) {
        triggerBtn.classList.add('popover-active');
        const parentContainer = triggerBtn.closest('.popover-container, .dropdown-wrapper');
        if (parentContainer) {
          parentContainer.classList.add('open');
          parentContainer.classList.add('active');
        }
      }
      alignPopoverToTrigger(popoverEl, triggerBtn);
    }
  }

  function dismissAllPopovers() {
    document.querySelectorAll('.popover-menu').forEach((m) => {
      m.classList.remove('open');
      m.classList.remove('active');
    });
    document.querySelectorAll('.dropdown-menu').forEach((m) => {
      m.classList.remove('open');
      m.classList.remove('active');
    });
    document.querySelectorAll('.popover-container').forEach((c) => c.classList.remove('open'));
    document.querySelectorAll('.dropdown-wrapper').forEach((d) => d.classList.remove('active'));
    document.querySelectorAll('.dock-btn').forEach((b) => b.classList.remove('popover-active'));
  }

  let EMOJI_CATEGORIES = null;

  function setupPopovers() {
    // Mount all popover menus outside the bottom dock to avoid transform containing blocks and overflow clipping on mobile
    let mount = document.getElementById('canvasPopoversMount');
    if (!mount) {
      mount = document.createElement('div');
      mount.id = 'canvasPopoversMount';
      mount.className = 'canvas-popovers-mount';
      const screen = document.getElementById('whiteboardScreen') || document.body;
      screen.appendChild(mount);
    }

    const popoverIds = ['brushesPopover', 'eraserPopover', 'shapesPopover', 'colorPopover', 'reactionPopover', 'exportMenu', 'roomModeMenu'];
    popoverIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el && el.parentElement !== mount) {
        mount.appendChild(el);
      }
    });

    if (roomModeBtn && roomModeMenu) {
      roomModeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isCurrentUserHost()) {
          showToast(state.roomMode === 'host' ? '🎓 Room is in Presentation Mode (Controlled by Host)' : '🤝 Friendly Mode: Everyone can draw', 'info');
          return;
        }
        const isOpen = roomModeMenu.classList.contains('open') || roomModeMenu.classList.contains('active');
        dismissAllPopovers();
        if (!isOpen) {
          const rect = roomModeBtn.getBoundingClientRect();
          const menuWidth = Math.min(270, window.innerWidth - 20);
          let targetLeft = rect.left + rect.width / 2 - menuWidth / 2;
          targetLeft = Math.max(10, Math.min(window.innerWidth - menuWidth - 10, targetLeft));
          roomModeMenu.style.position = 'fixed';
          roomModeMenu.style.top = `${rect.bottom + 8}px`;
          roomModeMenu.style.left = `${targetLeft}px`;
          roomModeMenu.style.bottom = 'auto';
          roomModeMenu.style.transform = 'none';
          roomModeMenu.classList.add('open');
          roomModeMenu.classList.add('active');
          if (roomModeWrapper) roomModeWrapper.classList.add('active');
        }
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

    const brushPopoverBtn = document.getElementById('brushPopoverBtn');
    const brushesPopover = document.getElementById('brushesPopover');
    const activeBrushIcon = document.getElementById('activeBrushIcon');
    const brushSizeSlider = document.getElementById('brushSizeSlider');
    const btnBrushSizeDec = document.getElementById('btnBrushSizeDec');
    const btnBrushSizeInc = document.getElementById('btnBrushSizeInc');
    const brushSizePanel = document.querySelector('.brush-size-panel');

    if (brushPopoverBtn && brushesPopover) {
      brushPopoverBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!canCurrentUserDraw()) {
          showToast('🎓 Presentation Mode: Only Host can draw.', 'warning');
          return;
        }
        const wasOpen = brushesPopover.classList.contains('open');
        togglePopover(brushesPopover, brushPopoverBtn);
        if (!wasOpen) {
          syncBrushSizeUI();
        }
        sound.playClick();
      });

      brushesPopover.querySelectorAll('.brush-item').forEach((item) => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          if (!canCurrentUserDraw()) {
            showToast('🎓 Presentation Mode: Canvas is View-Only.', 'warning');
            return;
          }
          const tool = item.dataset.tool;
          state.activeTool = tool;
          brushesPopover.querySelectorAll('.brush-item').forEach((i) => i.classList.remove('active'));
          item.classList.add('active');
          brushPopoverBtn.dataset.tool = tool;
          updateActiveToolUI();
          dismissAllPopovers();
          sound.playClick();
        });
      });

      if (brushSizePanel) {
        brushSizePanel.addEventListener('click', (e) => e.stopPropagation());
      }

      if (brushSizeSlider) {
        brushSizeSlider.addEventListener('input', (e) => {
          const newSize = parseInt(e.target.value, 10);
          setBrushSize(newSize);
        });
      }

      if (btnBrushSizeDec) {
        btnBrushSizeDec.addEventListener('click', (e) => {
          e.stopPropagation();
          setBrushSize(state.activeWidth - 1);
          sound.playClick();
        });
      }

      if (btnBrushSizeInc) {
        btnBrushSizeInc.addEventListener('click', (e) => {
          e.stopPropagation();
          setBrushSize(state.activeWidth + 1);
          sound.playClick();
        });
      }

      brushesPopover.querySelectorAll('.size-preset-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const size = parseInt(btn.dataset.size, 10);
          setBrushSize(size);
          sound.playClick();
        });
      });
    }

    const eraserPopoverBtn = document.getElementById('eraserPopoverBtn');
    const eraserPopover = document.getElementById('eraserPopover');
    const btnEraserSizeDec = document.getElementById('btnEraserSizeDec');
    const btnEraserSizeInc = document.getElementById('btnEraserSizeInc');
    const eraserSizeSlider = document.getElementById('eraserSizeSlider');
    const eraserSizePanel = document.querySelector('.eraser-size-panel');

    if (eraserPopoverBtn && eraserPopover) {
      eraserPopoverBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!canCurrentUserDraw()) {
          showToast('🎓 Presentation Mode: Only Host can draw/erase.', 'warning');
          return;
        }
        state.activeTool = 'eraser';
        updateActiveToolUI();
        const wasOpen = eraserPopover.classList.contains('open');
        togglePopover(eraserPopover, eraserPopoverBtn);
        if (!wasOpen) {
          syncEraserSizeUI();
        }
        sound.playClick();
      });

      if (eraserSizePanel) {
        eraserSizePanel.addEventListener('click', (e) => e.stopPropagation());
      }

      if (eraserSizeSlider) {
        eraserSizeSlider.addEventListener('input', (e) => {
          const newSize = parseInt(e.target.value, 10);
          setEraserSize(newSize);
        });
      }

      if (btnEraserSizeDec) {
        btnEraserSizeDec.addEventListener('click', (e) => {
          e.stopPropagation();
          setEraserSize(state.activeEraserSize - 2);
          sound.playClick();
        });
      }

      if (btnEraserSizeInc) {
        btnEraserSizeInc.addEventListener('click', (e) => {
          e.stopPropagation();
          setEraserSize(state.activeEraserSize + 2);
          sound.playClick();
        });
      }

      eraserPopover.querySelectorAll('.eraser-preset-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const size = parseInt(btn.dataset.size, 10);
          setEraserSize(size);
          sound.playClick();
        });
      });
    }

    if (shapePopoverBtn && shapesPopover) {
      shapePopoverBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!canCurrentUserDraw()) {
          showToast('🎓 Presentation Mode: Only Host can draw shapes.', 'warning');
          return;
        }
        togglePopover(shapesPopover, shapePopoverBtn);
        sound.playClick();
      });
    }

    if (shapesPopover) {
      shapesPopover.querySelectorAll('.shape-grid-btn, .popover-item').forEach((item) => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          if (!canCurrentUserDraw()) {
            showToast('🎓 Presentation Mode: Canvas is View-Only.', 'warning');
            return;
          }
          const tool = item.dataset.tool;
          state.activeTool = tool;
          shapesPopover.querySelectorAll('.shape-grid-btn, .popover-item').forEach((i) => i.classList.remove('active'));
          item.classList.add('active');
          const svg = item.querySelector('svg');
          if (svg && activeShapeIcon) activeShapeIcon.innerHTML = svg.outerHTML;
          if (shapePopoverBtn) shapePopoverBtn.dataset.tool = tool;
          updateActiveToolUI();
          dismissAllPopovers();
          sound.playClick();
        });
      });
    }

    if (colorPopoverBtn && colorPopover) {
      colorPopoverBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wasOpen = colorPopover.classList.contains('open');
        togglePopover(colorPopover, colorPopoverBtn);
        if (!wasOpen) {
          syncColorPopoverUI();
        }
        sound.playClick();
      });
    }

    const slot1Btn = document.getElementById('slotColor1');
    const slot2Btn = document.getElementById('slotColor2');
    const btnCustomColor = document.getElementById('btnCustomColor');
    const customColorInput = document.getElementById('customColorInput');

    if (slot1Btn) {
      slot1Btn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.activeColorSlot = 'color1';
        syncColorPopoverUI();
        sound.playClick();
      });
    }

    if (slot2Btn) {
      slot2Btn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.activeColorSlot = 'color2';
        syncColorPopoverUI();
        sound.playClick();
      });
    }

    if (customColorInput) {
      const updateCustomInputValue = () => {
        const cur = (state.activeColorSlot === 'color1' ? state.activeColor : state.activeFillColor) || '#ED1C24';
        if (typeof cur === 'string' && cur.startsWith('#') && cur.length === 7) {
          customColorInput.value = cur;
        }
      };

      customColorInput.addEventListener('pointerdown', updateCustomInputValue);
      customColorInput.addEventListener('click', (e) => {
        e.stopPropagation();
        updateCustomInputValue();
      });

      customColorInput.addEventListener('input', (e) => {
        const picked = e.target.value;
        if (state.activeColorSlot === 'color1') {
          state.activeColor = picked;
          if (state.selectedElementId && canCurrentUserDraw()) {
            const el = state.elements.find((item) => item.id === state.selectedElementId);
            if (el) {
              el.color = state.activeColor;
              redrawBoard();
              socket.emit('element:update', el);
            }
          }
        } else {
          state.activeFillColor = picked;
          if (state.activeFillStyle === 'none') state.activeFillStyle = 'solid';
          if (state.selectedElementId && canCurrentUserDraw()) {
            const el = state.elements.find((item) => item.id === state.selectedElementId);
            if (el && ALL_2D_SHAPES.includes(el.type)) {
              el.fillColor = state.activeFillColor;
              if (el.fillStyle === 'none') el.fillStyle = 'solid';
              redrawBoard();
              socket.emit('element:update', el);
            }
          }
        }
        syncColorPopoverUI();
      });
    }

    if (colorPopover) {
      colorPopover.querySelectorAll('.ms-color-dot').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const selectedColor = btn.dataset.color;
          if (state.activeColorSlot === 'color1') {
            state.activeColor = selectedColor;
            if (state.selectedElementId && canCurrentUserDraw()) {
              const el = state.elements.find((item) => item.id === state.selectedElementId);
              if (el) {
                el.color = state.activeColor;
                redrawBoard();
                socket.emit('element:update', el);
              }
            }
          } else {
            state.activeFillColor = selectedColor;
            if (state.activeFillStyle === 'none') state.activeFillStyle = 'solid';
            if (state.selectedElementId && canCurrentUserDraw()) {
              const el = state.elements.find((item) => item.id === state.selectedElementId);
              if (el && ALL_2D_SHAPES.includes(el.type)) {
                el.fillColor = state.activeFillColor;
                if (el.fillStyle === 'none') el.fillStyle = 'solid';
                redrawBoard();
                socket.emit('element:update', el);
              }
            }
          }
          syncColorPopoverUI();
          sound.playClick();
        });
      });

      colorPopover.querySelectorAll('.fill-style-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          state.activeFillStyle = btn.dataset.fill;
          syncColorPopoverUI();
          if (state.selectedElementId && canCurrentUserDraw()) {
            const el = state.elements.find((item) => item.id === state.selectedElementId);
            if (el && ALL_2D_SHAPES.includes(el.type)) {
              el.fillStyle = state.activeFillStyle;
              if (state.activeFillStyle !== 'none' && !el.fillColor) el.fillColor = state.activeFillColor;
              redrawBoard();
              socket.emit('element:update', el);
            }
          }
          sound.playClick();
        });
      });

      colorPopover.querySelectorAll('.width-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          state.activeWidth = parseInt(btn.dataset.width, 10);
          syncColorPopoverUI();
          if (state.selectedElementId && canCurrentUserDraw()) {
            const el = state.elements.find((item) => item.id === state.selectedElementId);
            if (el) {
              el.width = state.activeWidth;
              redrawBoard();
              socket.emit('element:update', el);
            }
          }
          sound.playClick();
        });
      });
    }

    // --- Rich Emoji Reaction Catalog & Bubble Popover Engine ---
    EMOJI_CATEGORIES = [
      {
        id: 'smileys',
        name: 'Smileys & Emotion',
        icon: '😀',
        emojis: [
          { char: '😀', keywords: 'grinning face happy smile joy cheer' },
          { char: '😃', keywords: 'smiley face happy cheer open mouth' },
          { char: '😄', keywords: 'smile happy joy eyes smiling laughing' },
          { char: '😁', keywords: 'beam grin smiling teeth happy' },
          { char: '😆', keywords: 'laughing squint laughing haha lol' },
          { char: '😅', keywords: 'sweat smile relief phew nervous' },
          { char: '🤣', keywords: 'rofl rolling on floor laughing lol haha comedy' },
          { char: '😂', keywords: 'joy tears laugh haha crying laughter' },
          { char: '🙂', keywords: 'slightly smiling smile happy polite' },
          { char: '🙃', keywords: 'upside down silly sarcasm playful irony' },
          { char: '😉', keywords: 'wink playful secret flirt wink' },
          { char: '😊', keywords: 'blush smile happy cute wholesome warm' },
          { char: '😇', keywords: 'innocent angel halo holy pure goodness' },
          { char: '🥰', keywords: 'smiling hearts love crush sweet adored' },
          { char: '😍', keywords: 'heart eyes love admire cute passion lovely' },
          { char: '🤩', keywords: 'star struck excited amazed awesome wow magic' },
          { char: '😘', keywords: 'kiss blowing kiss love affection romance' },
          { char: '😗', keywords: 'kissing whistling duck face polite' },
          { char: '😋', keywords: 'yum delicious tongue tasty food yummy lick' },
          { char: '😛', keywords: 'tongue sticking out cheeky silly playful' },
          { char: '😜', keywords: 'crazy wink tongue funny playful cheeky' },
          { char: '🤪', keywords: 'zany goofy crazy silly wacky wild' },
          { char: '😝', keywords: 'squint tongue silly playful haha funny' },
          { char: '🤑', keywords: 'money face rich cash dollar wealthy jackpot' },
          { char: '🤗', keywords: 'hugging hug comfort embrace warm support' },
          { char: '🤭', keywords: 'hand over mouth giggle oops secret blush' },
          { char: '🤫', keywords: 'shh quiet secret hush silence mute' },
          { char: '🤔', keywords: 'thinking ponder hmm consider wonder evaluate' },
          { char: '🤐', keywords: 'zipper mouth shut up quiet sealed secret' },
          { char: '🤨', keywords: 'raised eyebrow suspicious skeptical doubt suspect' },
          { char: '😐', keywords: 'neutral blank emotionless meh whatever' },
          { char: '😑', keywords: 'expressionless poker face no comment deadpan' },
          { char: '😶', keywords: 'silent no mouth quiet speechlessness speechless' },
          { char: '😏', keywords: 'smirk sassy smug cunning sly flirting' },
          { char: '😒', keywords: 'unamused displeased side eye meh bored annoyed' },
          { char: '🙄', keywords: 'rolling eyes eye roll whatever annoyed bored' },
          { char: '😬', keywords: 'grimacing awkward yikes cringe tense tense' },
          { char: '🤥', keywords: 'lying pinocchio liar fake nose deception' },
          { char: '😌', keywords: 'relieved peaceful calm zen relaxed chill' },
          { char: '😔', keywords: 'pensive sad reflective down regret sorrow' },
          { char: '😪', keywords: 'sleepy tired snot tear exhausted' },
          { char: '🤤', keywords: 'drooling hungry craving desire tasty' },
          { char: '😴', keywords: 'sleeping sleep zzz tired night bed' },
          { char: '😷', keywords: 'mask sick virus protection doctor hospital' },
          { char: '🤒', keywords: 'thermometer sick fever ill unwell medical' },
          { char: '🤕', keywords: 'bandage hurt injured head injury pain' },
          { char: '🤢', keywords: 'nauseated sick disgust gross barf puking' },
          { char: '🤮', keywords: 'vomiting puke throw up gross sick vomit' },
          { char: '🤧', keywords: 'sneezing tissue allergy cold sick flu' },
          { char: '🥵', keywords: 'hot heat sweating flushed exhausted warm spicy' },
          { char: '🥶', keywords: 'cold freezing ice chilly frost shivering freezing' },
          { char: '🥴', keywords: 'woozy dizzy drunk intoxicated tipsy weird' },
          { char: '😵', keywords: 'dizzy dead knocked out shocked stunned' },
          { char: '🤯', keywords: 'exploding head mind blown shocked wow boom' },
          { char: '🤠', keywords: 'cowboy hat yeehaw western sheriff texas' },
          { char: '🥳', keywords: 'party horn celebrate confetti birthday yay' },
          { char: '😎', keywords: 'cool sunglasses chill boss rad stylish awesome' },
          { char: '🤓', keywords: 'nerd glasses geek smart code programmer' },
          { char: '🧐', keywords: 'monocle classy inspecting investigate examine smart' },
          { char: '😕', keywords: 'confused huh puzzled what lost question' },
          { char: '😟', keywords: 'worried concerned anxious nervous fear worry' },
          { char: '🙁', keywords: 'slightly frowning unhappy sad displeased' },
          { char: '😮', keywords: 'open mouth surprised gasp oh wow omfg' },
          { char: '😯', keywords: 'surprised stunned hush astonished whoa' },
          { char: '😲', keywords: 'astonished shocked amazed disbelief omg' },
          { char: '😳', keywords: 'flushed blush embarrassed wide eyes caught' },
          { char: '🥺', keywords: 'pleading puppy eyes beg please please cute tender' },
          { char: '😦', keywords: 'frowning open mouth dismay oh no shock' },
          { char: '😧', keywords: 'anguished stunned horrified sad pain fear' },
          { char: '😨', keywords: 'fearful scared afraid anxiety nervous dread' },
          { char: '😰', keywords: 'anxious blue sweat stress terrified panic' },
          { char: '😥', keywords: 'sad relieved sweat teardrop worried phew' },
          { char: '😢', keywords: 'crying tear sad weeping distress pain' },
          { char: '😭', keywords: 'sob loud crying streaming tears bawling heartbroken' },
          { char: '😱', keywords: 'screaming terror ghost fright scary scream horror' },
          { char: '😖', keywords: 'confounded frustration quivering struggle tense' },
          { char: '😣', keywords: 'persevering struggling hurt painful resist' },
          { char: '😞', keywords: 'disappointed sad sorrow gloom downcast' },
          { char: '😓', keywords: 'downcast sweat work hard exhausted stress hard' },
          { char: '😩', keywords: 'weary tired frustrated whine exhausted despair' },
          { char: '😫', keywords: 'tired yawning done exhausted stressed done' },
          { char: '🥱', keywords: 'yawn bored sleepy tired waking up boring' },
          { char: '😤', keywords: 'triumph huff proud steam angry determined rage' },
          { char: '😡', keywords: 'pouting rage angry red furious mad infuriated' },
          { char: '😠', keywords: 'angry mad grumpy displeased furious moody' },
          { char: '🤬', keywords: 'cursing symbols swear rage furious swearwords curse' },
          { char: '😈', keywords: 'devil smiling evil horn naughty mischievous wicked' },
          { char: '👿', keywords: 'angry devil demon furious bad villain evil' },
          { char: '💀', keywords: 'skull dead skeleton death rip dying laugh humor' },
          { char: '☠️', keywords: 'skull crossbones poison pirate danger hazard deadly' },
          { char: '💩', keywords: 'poop crap piece of shit silly funny brown poopie' },
          { char: '🤡', keywords: 'clown circus foolish silly joker goofy clowning' },
          { char: '👻', keywords: 'ghost spooky halloween booo phantom spirit' },
          { char: '👽', keywords: 'alien ufo martian space extraterrestrial sci fi' },
          { char: '🤖', keywords: 'robot bot AI tech android futuristic machine' },
          { char: '🎃', keywords: 'jack o lantern pumpkin halloween scary autumn' }
        ]
      },
      {
        id: 'people_gestures',
        name: 'Gestures & Hands',
        icon: '👋',
        emojis: [
          { char: '👋', keywords: 'wave waving hand hello goodbye bye hi greeting' },
          { char: '🤚', keywords: 'raised back of hand stop high five palm' },
          { char: '🖐️', keywords: 'hand splayed fingers palm open stop five splay' },
          { char: '✋', keywords: 'raised hand stop high five hold on wait' },
          { char: '🖖', keywords: 'vulcan salute live long and prosper spock star trek' },
          { char: '👌', keywords: 'ok okay hand perfect excellent fine good agree' },
          { char: '🤌', keywords: 'pinched fingers italian chef kiss what do you mean chef' },
          { char: '🤏', keywords: 'pinching hand small tiny little bit pinch microscopic' },
          { char: '✌️', keywords: 'victory peace two v sign two fingers chill' },
          { char: '🤞', keywords: 'crossed fingers good luck hope wish praying luck' },
          { char: '🤟', keywords: 'love you gesture rock sign metal ily affection' },
          { char: '🤘', keywords: 'rock on heavy metal horns rock music concerts' },
          { char: '🤙', keywords: 'call me shaka hang loose surf phone aloha' },
          { char: '👈', keywords: 'point left back index finger direction indicator' },
          { char: '👉', keywords: 'point right next index finger direction forward' },
          { char: '👆', keywords: 'point up index finger top above look upward' },
          { char: '👇', keywords: 'point down bottom below look here downward' },
          { char: '☝️', keywords: 'point up attention one idea first wait listen' },
          { char: '👍', keywords: 'thumbs up like agree approve good great yes vote up' },
          { char: '👎', keywords: 'thumbs down dislike bad disapprove no vote down hate' },
          { char: '✊', keywords: 'fist raised punch power solidarity resist strength' },
          { char: '👊', keywords: 'oncoming fist bump punch hit blow brofist' },
          { char: '🤛', keywords: 'left fist bump punch sideways fistbump' },
          { char: '🤜', keywords: 'right fist bump punch sideways fistbump' },
          { char: '👏', keywords: 'clapping hands applause cheer bravo kudos props' },
          { char: '🙌', keywords: 'raising hands celebration praise hooray yay celebration' },
          { char: '👐', keywords: 'open hands embrace welcome jazz hands openness' },
          { char: '🤲', keywords: 'palms together prayer holding giving cupped donate' },
          { char: '🤝', keywords: 'handshake deal agreement partnership shake hello partner' },
          { char: '🙏', keywords: 'pray praying thank you please namaste high five thanks' },
          { char: '✍️', keywords: 'writing hand pen signature draw note pencil writer' },
          { char: '💅', keywords: 'nail polish sassy fabulous beauty care manicure nails' },
          { char: '🤳', keywords: 'selfie photo phone camera picture mobile pose' },
          { char: '💪', keywords: 'flexed biceps muscle strong power workout fitness gym' },
          { char: '🧠', keywords: 'brain mind think smart intelligence memory neurology' },
          { char: '👀', keywords: 'eyes look see glance peep observe watching drama' },
          { char: '👁️', keywords: 'eye watch sight view look vision observer' },
          { char: '👅', keywords: 'tongue taste lick silly cheeky flavor' },
          { char: '👄', keywords: 'mouth lips kiss beauty lipstick red cosmetic' }
        ]
      },
      {
        id: 'animals_nature',
        name: 'Animals & Nature',
        icon: '🐱',
        emojis: [
          { char: '🐶', keywords: 'dog puppy pet canine animal cute bark woof' },
          { char: '🐱', keywords: 'cat kitten pet feline meow kitty cute purr' },
          { char: '🐭', keywords: 'mouse rat rodent cute squeak cheese animal' },
          { char: '🐹', keywords: 'hamster cute rodent pet fluffy cheeks animal' },
          { char: '🐰', keywords: 'rabbit bunny hare easter cute pet carrot hop' },
          { char: '🦊', keywords: 'fox cunning wild red bushy orange animal foxy' },
          { char: '🐻', keywords: 'bear grizzly teddy cute wild nature beast' },
          { char: '🐼', keywords: 'panda bear bamboo china cute black white' },
          { char: '🐨', keywords: 'koala australia eucalyptus marsupial cute bear' },
          { char: '🐯', keywords: 'tiger face feline wild cat stripes predator rawr' },
          { char: '🦁', keywords: 'lion king of jungle mane roar feline wild' },
          { char: '🐮', keywords: 'cow face farm cattle milk moo bovine dairy' },
          { char: '🐷', keywords: 'pig face farm pork bacon oink cute piggy' },
          { char: '🐸', keywords: 'frog toad amphibian green ribbit lilypad pepe' },
          { char: '🐵', keywords: 'monkey face ape primate banana jungle playful' },
          { char: '🐔', keywords: 'chicken rooster hen bird poultry farm cluck' },
          { char: '🐧', keywords: 'penguin antarctica arctic bird tuxedo ice waddle' },
          { char: '🐦', keywords: 'bird bluebird tweet flying animal nature avian' },
          { char: '🐤', keywords: 'baby chick bird yellow cute hatchling easter' },
          { char: '🦆', keywords: 'duck mallard bird quack pond waterfowl bird' },
          { char: '🦅', keywords: 'eagle raptor bird predator fly america majestic freedom' },
          { char: '🦉', keywords: 'owl wise night nocturnal bird hoot wisdom' },
          { char: '🦇', keywords: 'bat vampire nocturnal halloween cave fly batman' },
          { char: '🐺', keywords: 'wolf wild howl canine pack predator moonlight' },
          { char: '🐗', keywords: 'boar wild pig hog tusks forest bacon' },
          { char: '🐴', keywords: 'horse face pony stallion farm ride gallop neigh' },
          { char: '🦄', keywords: 'unicorn magic mythical fantasy rainbow horse horn' },
          { char: '🐝', keywords: 'bee honeybee bumblebee insect honey buzz sting' },
          { char: '🐛', keywords: 'bug caterpillar insect larva green crawl nature' },
          { char: '🦋', keywords: 'butterfly insect wings colorful beauty flutter' },
          { char: '🐌', keywords: 'snail shell slow slime gastropod nature' },
          { char: '🐞', keywords: 'ladybug beetle bug spotted insect lucky ladybird' },
          { char: '🐜', keywords: 'ant bug insect worker colony hill tiny strong' },
          { char: '🕷️', keywords: 'spider web arachnid creepy halloween spooky eight' },
          { char: '🦂', keywords: 'scorpion arachnid sting desert venom zodiac venomous' },
          { char: '🐢', keywords: 'turtle tortoise reptile shell slow marine sea' },
          { char: '🐍', keywords: 'snake serpent reptile slither venom hiss snakey' },
          { char: '🦎', keywords: 'lizard gecko reptile amphibian camouflage dragon' },
          { char: '🦖', keywords: 't-rex tyrannosaurus rex dinosaur jurassic extinct reptile' },
          { char: '🦕', keywords: 'sauropod brontosaurus dinosaur herbivore jurassic dino' },
          { char: '🐙', keywords: 'octopus tentacles sea ocean marine kraken calamari' },
          { char: '🦑', keywords: 'squid ocean sea marine tentacles calamari kraken' },
          { char: '🦐', keywords: 'shrimp prawn seafood crustacean ocean meal' },
          { char: '🦞', keywords: 'lobster seafood crustacean red ocean marine claws' },
          { char: '🦀', keywords: 'crab seafood claws beach ocean crustacean cancer' },
          { char: '🐡', keywords: 'blowfish pufferfish spiky ocean poisonous fugu' },
          { char: '🐠', keywords: 'tropical fish ocean aquarium colorful nemo coral' },
          { char: '🐟', keywords: 'fish sea ocean marine swimming animal food' },
          { char: '🐬', keywords: 'dolphin marine ocean mammal smart swimming jump' },
          { char: '🐳', keywords: 'whale ocean sea spout marine giant swimming blowhole' },
          { char: '🦈', keywords: 'shark predator jaws teeth ocean ocean fish sharp' },
          { char: '🐊', keywords: 'crocodile alligator reptile swamp jaws swamp' },
          { char: '🌸', keywords: 'cherry blossom flower floral sakura spring pink flora' },
          { char: '🌹', keywords: 'rose red flower romantic love valentine floral petals' },
          { char: '🌺', keywords: 'hibiscus flower tropical floral hawaii exotic aloha' },
          { char: '🌻', keywords: 'sunflower yellow sunny summer flora bright sun' },
          { char: '🌼', keywords: 'blossom flower yellow daisy spring floral bloom' },
          { char: '🌷', keywords: 'tulip flower spring flora holland colorful bloom' },
          { char: '🌱', keywords: 'seedling sprout plant grow nature green spring plant' },
          { char: '🌲', keywords: 'evergreen tree pine forest nature cedar woods xmas' },
          { char: '🌳', keywords: 'deciduous tree woods park nature green foliage park' },
          { char: '🌴', keywords: 'palm tree tropical beach summer island vacation resort' },
          { char: '🌵', keywords: 'cactus desert succulent spiky dry plant western' },
          { char: '🍀', keywords: 'four leaf clover luck lucky irish saint patrick shamrock' },
          { char: '🍁', keywords: 'maple leaf autumn fall canada foliage orange leaves' },
          { char: '🍂', keywords: 'fallen leaf autumn fall leaves dry gold breeze' },
          { char: '🍃', keywords: 'leaf fluttering wind breeze green eco nature wind' }
        ]
      },
      {
        id: 'food_drink',
        name: 'Food & Drink',
        icon: '🍕',
        emojis: [
          { char: '🍏', keywords: 'green apple fruit sour granny smith healthy salad' },
          { char: '🍎', keywords: 'red apple fruit sweet fresh apple snack teacher' },
          { char: '🍐', keywords: 'pear fruit sweet green snack fresh organic' },
          { char: '🍊', keywords: 'orange tangerine citrus vitamin c fruit juice' },
          { char: '🍋', keywords: 'lemon citrus sour yellow fruit lemonade fresh' },
          { char: '🍌', keywords: 'banana fruit yellow potassium peel monkey smoothie' },
          { char: '🍉', keywords: 'watermelon fruit summer sweet refreshing slice melon' },
          { char: '🍇', keywords: 'grapes wine fruit purple bunch snack vineyard' },
          { char: '🍓', keywords: 'strawberry berry fruit sweet red berry dessert' },
          { char: '🍒', keywords: 'cherries cherry fruit red sweet dessert pair pie' },
          { char: '🍑', keywords: 'peach fruit juicy sweet fuzzy butt booty fruit' },
          { char: '🥭', keywords: 'mango tropical fruit sweet delicious juicy mangoes' },
          { char: '🍍', keywords: 'pineapple tropical fruit sweet hawaii piña fruit' },
          { char: '🥥', keywords: 'coconut tropical palm pina colada exotic water' },
          { char: '🥝', keywords: 'kiwi fruit fuzzy green new zealand slice healthy' },
          { char: '🥑', keywords: 'avocado guacamole healthy toast green fat keto' },
          { char: '🍆', keywords: 'eggplant aubergine vegetable purple plant emoji' },
          { char: '🥕', keywords: 'carrot vegetable orange healthy rabbit salad snack' },
          { char: '🌽', keywords: 'corn on the cob maize vegetable sweetcorn yellow pop' },
          { char: '🌶️', keywords: 'hot pepper chili spicy seasoning red heat salsa' },
          { char: '🥐', keywords: 'croissant bakery pastry bread french breakfast bakery' },
          { char: '🍞', keywords: 'bread loaf bakery slice toast wheat breakfast' },
          { char: '🥖', keywords: 'baguette french bread bakery crusty loaf paris' },
          { char: '🥨', keywords: 'pretzel snack bakery salted twisted bavarian snack' },
          { char: '🧀', keywords: 'cheese wedge cheddar swiss dairy yellow snack mouse' },
          { char: '🥚', keywords: 'egg breakfast protein food cooking ingredient raw' },
          { char: '🍳', keywords: 'cooking fried egg breakfast pan skillet yolk breakfast' },
          { char: '🥞', keywords: 'pancakes hotcakes breakfast syrup butter stack brunch' },
          { char: '🧇', keywords: 'waffle breakfast belgian syrup grid iron brunch' },
          { char: '🥓', keywords: 'bacon pork breakfast crispy strips meat sizzling' },
          { char: '🥩', keywords: 'steak cut of meat beef ribeye raw dinner grill' },
          { char: '🍗', keywords: 'poultry leg drumstick chicken fried turkey meat' },
          { char: '🍖', keywords: 'meat on bone roast dinosaur anime shank feast' },
          { char: '🌭', keywords: 'hot dog frankfurter sausage mustard bun snack fastfood' },
          { char: '🍔', keywords: 'hamburger burger cheeseburger fast food beef bun meal' },
          { char: '🍟', keywords: 'french fries chips fast food potato crispy salt snack' },
          { char: '🍕', keywords: 'pizza slice pepperoni cheese italian pie fast food delicious' },
          { char: '🥪', keywords: 'sandwich lunch sub club deli bread meal sandwich' },
          { char: '🌮', keywords: 'taco mexican food shell tortilla crunchy fiesta taco' },
          { char: '🌯', keywords: 'burrito mexican wrap tortilla wrap roll mexican' },
          { char: '🥗', keywords: 'green salad healthy vegetables lettuce bowl diet fresh' },
          { char: '🍝', keywords: 'spaghetti pasta tomato sauce italian noodles bowl dinner' },
          { char: '🍜', keywords: 'ramen noodles steaming bowl asian soup chopsticks broth' },
          { char: '🍲', keywords: 'pot of food stew soup hotpot hearty dinner meal' },
          { char: '🍛', keywords: 'curry rice indian japanese spicy bowl meal' },
          { char: '🍣', keywords: 'sushi nigiri sashimi japanese seafood fish raw rolls' },
          { char: '🍱', keywords: 'bento box lunch japanese meal compartmentalized' },
          { char: '🥟', keywords: 'dumpling potsticker gyoza dim sum asian momo' },
          { char: '🍤', keywords: 'fried shrimp tempura prawn seafood crispy tempura' },
          { char: '🍙', keywords: 'rice ball onigiri japanese seaweed snack rice' },
          { char: '🍚', keywords: 'cooked rice bowl steamed white grain jasmine rice' },
          { char: '🍦', keywords: 'soft ice cream cone vanilla swirl dessert summer cone' },
          { char: '🍧', keywords: 'shaved ice sweet dessert syrup rainbow summer kakigori' },
          { char: '🍨', keywords: 'ice cream scoop dessert bowl sundae sweet gelato' },
          { char: '🍩', keywords: 'doughnut donut sweet pastry glaze sprinkle frosting treat' },
          { char: '🍪', keywords: 'cookie chocolate chip sweet biscuit bakery snack cookies' },
          { char: '🎂', keywords: 'birthday cake celebration candles party dessert sweet' },
          { char: '🍰', keywords: 'shortcake cake slice strawberry bakery dessert sweet' },
          { char: '🧁', keywords: 'cupcake muffin dessert bakery frosting sweet treat' },
          { char: '🥧', keywords: 'pie pastry fruit dessert bakery slice thanksgiving apple' },
          { char: '🍫', keywords: 'chocolate bar sweet cocoa candy treat milk dark' },
          { char: '🍬', keywords: 'candy sweet sugar wrapper confectionery treat drops' },
          { char: '🍭', keywords: 'lollipop candy sweet spiral sucker treat candy' },
          { char: '🍮', keywords: 'custard flan pudding dessert caramel sweet custard' },
          { char: '🍯', keywords: 'honey pot sweet beehive bear amber syrup honey' },
          { char: '🍿', keywords: 'popcorn cinema movie snack butter corn salted films' },
          { char: '☕', keywords: 'coffee cup hot cafe espresso tea morning caffeine latte' },
          { char: '🫖', keywords: 'teapot tea pot brewing hot beverage english chai' },
          { char: '🍵', keywords: 'teacup green tea matcha asian hot beverage zen' },
          { char: '🧃', keywords: 'juice box drink straw beverage apple fruit juice' },
          { char: '🧋', keywords: 'boba bubble tea milk tapioca drink pearl straw tea' },
          { char: '🥤', keywords: 'cup with straw soda soft drink beverage milkshake drink' },
          { char: '🍺', keywords: 'beer mug alcohol bar pub drink foam lager brew' },
          { char: '🍻', keywords: 'clinking beer mugs cheers toast pub party alcohol drinks' },
          { char: '🍷', keywords: 'wine glass red alcohol vino vineyard dinner cheers' },
          { char: '🍸', keywords: 'cocktail martini olive alcohol bar lounge beverage' },
          { char: '🍹', keywords: 'tropical drink umbrella cocktail beach summer alcohol party' },
          { char: '🍾', keywords: 'champagne bottle popping cork celebration cheers alcohol new year' }
        ]
      },
      {
        id: 'objects_activities',
        name: 'Activities & Objects',
        icon: '🎯',
        emojis: [
          { char: '⚽', keywords: 'soccer ball football sport fifa goal kick match ball' },
          { char: '🏀', keywords: 'basketball sport nba hoop slam dunk game court' },
          { char: '🏈', keywords: 'american football nfl sport ball touchdown super bowl' },
          { char: '⚾', keywords: 'baseball sport mlb bat home run pitch ball game' },
          { char: '🎾', keywords: 'tennis ball racket sport match court grand slam' },
          { char: '🏐', keywords: 'volleyball beach sport spike court net game beach' },
          { char: '🎱', keywords: 'pool 8 ball billiards game cue snooker black 8' },
          { char: '🏓', keywords: 'ping pong table tennis paddle sport game match ping' },
          { char: '🏸', keywords: 'badminton shuttlecock racket sport net birdie' },
          { char: '🥊', keywords: 'boxing glove punch sport fight match ring knockout box' },
          { char: '🥋', keywords: 'martial arts uniform karate judo taekwondo black belt dojo' },
          { char: '🛹', keywords: 'skateboard skate board sport trick street wheels ride' },
          { char: '🏆', keywords: 'trophy champion win first award gold victor cup victory' },
          { char: '🥇', keywords: '1st place medal gold medal champion first winner gold' },
          { char: '🥈', keywords: '2nd place medal silver second award runner up silver' },
          { char: '🥉', keywords: '3rd place medal bronze third prize award podium bronze' },
          { char: '🎯', keywords: 'direct hit bullseye dart target accuracy game goal spot' },
          { char: '🎮', keywords: 'video game controller joystick console gaming play ps5 xbox' },
          { char: '🎲', keywords: 'game die dice roll gambling board game chance luck roll' },
          { char: '🧩', keywords: 'puzzle piece jigsaw solve problem brain mystery piece' },
          { char: '🎨', keywords: 'artist palette painting draw color design brush canvas art' },
          { char: '🎬', keywords: 'clapper board film movie cinema hollywood director action' },
          { char: '🎤', keywords: 'microphone mic audio sing speech podcast karaoke vocal' },
          { char: '🎧', keywords: 'headphones music sound audio listen dj beats audio' },
          { char: '🎼', keywords: 'musical score music sheet notes treble clef harmony song' },
          { char: '🎹', keywords: 'musical keyboard piano keys synth music play melody keys' },
          { char: '🎸', keywords: 'guitar acoustic rock music instrument strings play solo' },
          { char: '🎺', keywords: 'trumpet brass jazz horn music instrument band solo' },
          { char: '🚀', keywords: 'rocket launch spaceship space blast off startup speed moon' },
          { char: '🛸', keywords: 'flying saucer ufo alien extraterrestrial sci-fi space uap' },
          { char: '🚗', keywords: 'car automobile vehicle drive road red transportation drive' },
          { char: '🏎️', keywords: 'racing car formula 1 fast speed race track motorsport f1' },
          { char: '🚲', keywords: 'bicycle bike ride cycling pedal transportation eco cycle' },
          { char: '✈️', keywords: 'airplane flight airport travel fly holiday vacation plane' },
          { char: '⛵', keywords: 'sailboat yacht boat sailing ocean sea nautical wind ship' },
          { char: '💡', keywords: 'light bulb idea bright brainstorm innovation light electric eureka' },
          { char: '💻', keywords: 'laptop computer PC macbook tech code developer screen software' },
          { char: '📱', keywords: 'mobile phone smartphone iphone tech cellular app telephone' },
          { char: '⌚', keywords: 'watch wristwatch time smart clock accessory apple' },
          { char: '📷', keywords: 'camera photo picture snapshot photography lens capture picture' },
          { char: '🔍', keywords: 'magnifying glass search find inspect lookup discover investigate query' },
          { char: '💎', keywords: 'gem stone diamond crystal jewel precious rich valuable sparkle' },
          { char: '🔮', keywords: 'crystal ball magic fortune teller future psychic prophecy magic' },
          { char: '🪄', keywords: 'magic wand wizard sorcery cast spell fairy sparkle wand' },
          { char: '🎁', keywords: 'wrapped gift present birthday christmas surprise box bow present' },
          { char: '🎈', keywords: 'balloon red party celebration birthday float inflate party' },
          { char: '🎉', keywords: 'party popper confetti celebration birthday surprise hooray tada' },
          { char: '🔥', keywords: 'fire flame lit hot burning campfire inferno energy burn' },
          { char: '⚡', keywords: 'high voltage lightning bolt power energy electricity shock fast' }
        ]
      },
      {
        id: 'symbols_hearts',
        name: 'Symbols & Hearts',
        icon: '💖',
        emojis: [
          { char: '❤️', keywords: 'red heart love like romance partner valentine affection heart' },
          { char: '🧡', keywords: 'orange heart warm care autumn friendship' },
          { char: '💛', keywords: 'yellow heart friendship happiness sunshine gold warmth' },
          { char: '💚', keywords: 'green heart nature eco healthy organic jealous envy' },
          { char: '💙', keywords: 'blue heart trust peace ocean sky loyalty cool' },
          { char: '💜', keywords: 'purple heart magic royalty glamour BTS affection' },
          { char: '🖤', keywords: 'black heart dark emo gothic mourning elegance soul' },
          { char: '🤍', keywords: 'white heart pure peace angel innocence clean' },
          { char: '🤎', keywords: 'brown heart earth chocolate warmth solidarity' },
          { char: '💔', keywords: 'broken heart heartbreak break up sad grief sorrow loss pain' },
          { char: '❣️', keywords: 'heart exclamation punctuation love emphasis passion' },
          { char: '💕', keywords: 'two hearts floating love affection pair couple romantic' },
          { char: '💞', keywords: 'revolving hearts orbiting love romance swirling hearts' },
          { char: '💓', keywords: 'beating heart pulsing vibrating heartbeat excitement pulse' },
          { char: '💗', keywords: 'growing heart expanding love blush blooming romance pulse' },
          { char: '💖', keywords: 'sparkling heart shiny glitter sparkle magic love special sparkle' },
          { char: '💘', keywords: 'heart with arrow cupid struck romance love arrow cupid' },
          { char: '💝', keywords: 'heart with ribbon gift love box present valentine gift' },
          { char: '✨', keywords: 'sparkles sparkle magical shine clean night glow glitter shine' },
          { char: '⭐', keywords: 'star yellow rating favorite bookmark night celestial star' },
          { char: '🌟', keywords: 'glowing star sparkle shiny golden radiance shine glow' },
          { char: '💫', keywords: 'dizzy star shooting streak trail motion loop magical streak' },
          { char: '💥', keywords: 'collision boom explosion bang pow blast comic hit pow' },
          { char: '💯', keywords: 'hundred points score perfect 100 accurate test true real keep' },
          { char: '💢', keywords: 'anger symbol vein popping anime manga frustrated furious vein' },
          { char: '💤', keywords: 'zzz sleep sleeping tired snooze snore dreams bedtime sleep' },
          { char: '✅', keywords: 'check mark button tick approved correct done success pass ok' },
          { char: '❌', keywords: 'cross mark x wrong false no error cancel reject bad' },
          { char: '❓', keywords: 'question mark red help ask puzzle doubt confusion mark' },
          { char: '❗', keywords: 'exclamation mark red alert caution warning notice info bang' },
          { char: '⚠️', keywords: 'warning sign hazard caution triangle danger attention caution' },
          { char: '🛑', keywords: 'stop sign octagonal red traffic halt danger barrier stop' },
          { char: '🚫', keywords: 'prohibited no entry forbidden banned restricted cancelled cancel' },
          { char: '🌈', keywords: 'rainbow colorful weather pride hope sky spectrum arcs pride' },
          { char: '☀️', keywords: 'sun sunny day sunshine warm bright weather daylight summer' },
          { char: '🌙', keywords: 'crescent moon night lunar evening sky sleep dream night' },
          { char: '☁️', keywords: 'cloud weather overcast sky fluffy overcast gray white sky' },
          { char: '❄️', keywords: 'snowflake winter cold snow freeze frost ice crystal cold' },
          { char: '🔔', keywords: 'bell notification chime reminder alert sound ring notify' },
          { char: '🎵', keywords: 'musical note sound melody song tune music audio note' },
          { char: '🎶', keywords: 'musical notes singing harmony melody song sound tune music' }
        ]
      }
    ];

    const reactionPopoverContainer = document.getElementById('reactionPopoverContainer') || (reactionPopoverBtn ? reactionPopoverBtn.parentElement : null);
    const reactionScrollArea = document.getElementById('reactionScrollArea');
    const reactionSearchInput = document.getElementById('reactionSearchInput');
    const reactionSearchClear = document.getElementById('reactionSearchClear');
    const emojiCountBadge = document.getElementById('emojiCountBadge');
    const reactionCategoryTabs = document.getElementById('reactionCategoryTabs');
    const reactionQuickPills = document.getElementById('reactionQuickPills');

    let activeReactionCategory = 'all';
    let currentEmojiSearch = '';
    let reactionHoverCloseTimer = null;

    function renderEmojiCatalog(filterCategory = 'all', searchQuery = '') {
      if (!reactionScrollArea) return;
      reactionScrollArea.innerHTML = '';

      const query = (searchQuery || '').trim().toLowerCase();
      let totalCount = 0;

      EMOJI_CATEGORIES.forEach((cat) => {
        if (filterCategory !== 'all' && cat.id !== filterCategory && !query) {
          return;
        }

        const filteredEmojis = cat.emojis.filter((item) => {
          if (!query) return true;
          return item.char.includes(query) || (item.keywords && item.keywords.toLowerCase().includes(query)) || cat.name.toLowerCase().includes(query);
        });

        if (filteredEmojis.length === 0) return;

        totalCount += filteredEmojis.length;

        const section = document.createElement('div');
        section.className = 'reaction-group-section';

        const title = document.createElement('div');
        title.className = 'reaction-group-title';
        title.textContent = `${cat.icon} ${cat.name}`;
        section.appendChild(title);

        const grid = document.createElement('div');
        grid.className = 'reaction-grid-layout';

        filteredEmojis.forEach((emojiItem) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'reaction-item';
          btn.dataset.emoji = emojiItem.char;
          btn.title = emojiItem.char;
          btn.textContent = emojiItem.char;
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            triggerReaction(emojiItem.char);
            btn.style.transform = 'scale(1.4)';
            setTimeout(() => { btn.style.transform = ''; }, 200);
          });
          grid.appendChild(btn);
        });

        section.appendChild(grid);
        reactionScrollArea.appendChild(section);
      });

      if (totalCount === 0) {
        const noRes = document.createElement('div');
        noRes.className = 'reaction-no-results';
        noRes.textContent = `🔍 No emojis found for "${query}"`;
        reactionScrollArea.appendChild(noRes);
      }

      if (emojiCountBadge) {
        emojiCountBadge.textContent = `${totalCount} emojis`;
      }
    }

    // Populate Initial Emoji Grid
    renderEmojiCatalog('all', '');

    // Setup Quick Reaction Pills in Header
    if (reactionQuickPills) {
      reactionQuickPills.querySelectorAll('.reaction-item').forEach((item) => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const emoji = item.dataset.emoji;
          if (emoji) {
            triggerReaction(emoji);
            item.style.transform = 'scale(1.4)';
            setTimeout(() => { item.style.transform = ''; }, 200);
          }
        });
      });
    }

    // Category Tabs Switching
    if (reactionCategoryTabs) {
      reactionCategoryTabs.querySelectorAll('.reaction-cat-tab').forEach((tab) => {
        tab.addEventListener('click', (e) => {
          e.stopPropagation();
          reactionCategoryTabs.querySelectorAll('.reaction-cat-tab').forEach((t) => t.classList.remove('active'));
          tab.classList.add('active');
          activeReactionCategory = tab.dataset.category || 'all';
          if (reactionSearchInput) reactionSearchInput.value = '';
          currentEmojiSearch = '';
          if (reactionSearchClear) reactionSearchClear.classList.remove('visible');
          renderEmojiCatalog(activeReactionCategory, '');
          if (reactionScrollArea) reactionScrollArea.scrollTop = 0;
          sound.playClick();
        });
      });
    }

    // Emoji Search Filter
    if (reactionSearchInput) {
      reactionSearchInput.addEventListener('input', (e) => {
        currentEmojiSearch = e.target.value;
        if (reactionSearchClear) {
          reactionSearchClear.classList.toggle('visible', currentEmojiSearch.length > 0);
        }
        renderEmojiCatalog(activeReactionCategory, currentEmojiSearch);
      });
      reactionSearchInput.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    if (reactionSearchClear) {
      reactionSearchClear.addEventListener('click', (e) => {
        e.stopPropagation();
        if (reactionSearchInput) {
          reactionSearchInput.value = '';
          reactionSearchInput.focus();
        }
        currentEmojiSearch = '';
        reactionSearchClear.classList.remove('visible');
        renderEmojiCatalog(activeReactionCategory, '');
      });
    }

    // Reaction & Emoji Popover Trigger (Stable click toggle - never auto-closes while choosing)
    if (reactionPopoverBtn) {
      reactionPopoverBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePopover(reactionPopover, reactionPopoverBtn);
        sound.playClick();
      });
    }

    if (startCursorChatBtn) {
      startCursorChatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dismissAllPopovers();
        openCursorChat();
      });
    }

    // Protect all popovers and dropdown menus from click bubbling
    document.querySelectorAll('.popover-menu, .dropdown-menu, #canvasPopoversMount').forEach((menu) => {
      menu.addEventListener('click', (e) => e.stopPropagation());
      menu.addEventListener('pointerdown', (e) => e.stopPropagation());
      menu.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    });

    // Dismiss Popovers on Outside Click
    window.addEventListener('click', (e) => {
      if (
        !e.target.closest('.popover-container') &&
        !e.target.closest('.dropdown-wrapper') &&
        !e.target.closest('.popover-menu') &&
        !e.target.closest('.dropdown-menu') &&
        !e.target.closest('.chat-floating-tab') &&
        !e.target.closest('.chatspace-panel') &&
        !e.target.closest('#canvasPopoversMount')
      ) {
        dismissAllPopovers();
      }
    });

    window.addEventListener('resize', () => {
      const openPopover = document.querySelector('.popover-menu.open, .dropdown-menu.open, .dropdown-menu.active');
      if (openPopover) {
        const activeBtn = document.querySelector('.dock-btn.popover-active');
        alignPopoverToTrigger(openPopover, activeBtn);
      }
    });
  }

  function triggerReaction(emoji) {
    const burstX = (lastClientPos && typeof lastClientPos.x === 'number') ? lastClientPos.x : (window.innerWidth / 2);
    const burstY = (lastClientPos && typeof lastClientPos.y === 'number') ? lastClientPos.y : (window.innerHeight - 90);
    
    addEmojiBurst(emoji, burstX, burstY);
    sound.playReactionChime();

    const triggerEmojiSpan = document.getElementById('reactionTriggerEmoji');
    if (triggerEmojiSpan) {
      triggerEmojiSpan.textContent = emoji;
      triggerEmojiSpan.style.transform = 'scale(1.4)';
      setTimeout(() => { triggerEmojiSpan.style.transform = ''; }, 300);
    }

    const worldPos = screenToWorld(burstX, burstY);
    socket.emit('reaction:emit', {
      emoji,
      x: worldPos.x,
      y: worldPos.y,
      pageId: getActiveDrawingPageId(),
      canvasMode: state.canvasMode,
      userName: state.user.name || state.user.username
    });
  }

  function updateActiveToolUI() {
    dockButtons.forEach((btn) => {
      const tool = btn.dataset.tool;
      const isShapeTool = ALL_SHAPE_TOOLS.includes(state.activeTool);
      const isBrushTool = ALL_BRUSH_TOOLS.includes(state.activeTool);
      if (btn.id === 'shapePopoverBtn' && isShapeTool) btn.classList.add('active');
      else if (btn.id === 'brushPopoverBtn' && isBrushTool) btn.classList.add('active');
      else if (btn.id === 'eraserPopoverBtn' && state.activeTool === 'eraser') btn.classList.add('active');
      else if (tool === state.activeTool) btn.classList.add('active');
      else btn.classList.remove('active');
    });
    boardCanvas.style.cursor = state.activeTool === 'select' ? 'default' : (state.activeTool === 'eraser' ? 'none' : 'crosshair');
  }

  dockButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.id === 'shapePopoverBtn' || btn.id === 'brushPopoverBtn' || btn.id === 'eraserPopoverBtn' || btn.id === 'colorPopoverBtn' || btn.id === 'reactionPopoverBtn') return;
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
    if (zoomLabel) zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
  }

  function applyZoom(targetZoom, centerX = window.innerWidth / 2, centerY = window.innerHeight / 2) {
    const oldZoom = state.zoom;
    const clampedZoom = Math.max(0.2, Math.min(4.0, targetZoom));
    if (Math.abs(clampedZoom - oldZoom) < 0.001) return;

    state.panX = centerX - (centerX - state.panX) * (clampedZoom / oldZoom);
    state.panY = centerY - (centerY - state.panY) * (clampedZoom / oldZoom);
    state.zoom = clampedZoom;

    updateZoomUI();
    renderGrid();
    redrawBoard();
    syncAllDomElementPositions();
  }

  zoomInBtn.addEventListener('click', () => {
    applyZoom(state.zoom * 1.25, window.innerWidth / 2, window.innerHeight / 2);
    sound.playClick();
  });

  zoomOutBtn.addEventListener('click', () => {
    applyZoom(state.zoom / 1.25, window.innerWidth / 2, window.innerHeight / 2);
    sound.playClick();
  });

  zoomResetBtn.addEventListener('click', () => {
    state.panX = 0;
    state.panY = 0;
    applyZoom(1.0, window.innerWidth / 2, window.innerHeight / 2);
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
    togglePopover(exportMenu, exportBtn);
    sound.playClick();
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
      if (isElementVisibleInCurrentMode(el) && el.type !== 'sticky' && el.type !== 'text' && el.type !== 'code') drawElement(ctx, el);
    });
    ctx.restore();
    return exportCanvas;
  }

  exportPngBtn.addEventListener('click', () => {
    dismissAllPopovers();
    const exportCanvas = generateExportCanvas(2);
    const link = document.createElement('a');
    link.download = `CoCanvas_${state.roomId || 'board'}_${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
    showToast('Exported PNG (2x HD) 🖼️');
  });

  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', () => {
      dismissAllPopovers();
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
      dismissAllPopovers();
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
    dismissAllPopovers();
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
    dismissAllPopovers();
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

  // --- Page Management & Canvas Layout Mode (Fixed Window Mode & Infinite Playground) ---
  function fitPageToScreen() {
    if (state.canvasMode !== 'fixed_page') return;
    const pw = state.pageWidth || 1600;
    const ph = state.pageHeight || 1000;
    const isMobile = window.innerWidth < 768;
    const horizontalMargin = isMobile ? 14 : 48;
    const topMargin = isMobile ? 68 : 80;
    const bottomMargin = isMobile ? 120 : 130;

    const availableW = Math.max(200, viewWidth - horizontalMargin * 2);
    const availableH = Math.max(200, viewHeight - topMargin - bottomMargin);

    const targetZoom = Math.min(1.2, Math.max(0.18, Math.min(availableW / pw, availableH / ph)));
    const targetWorldX = pw / 2;
    const targetWorldY = ph / 2;
    smoothFlyTo(targetWorldX, targetWorldY, targetZoom);
  }

  function updateCanvasModeUI() {
    const isFixed = state.canvasMode === 'fixed_page';
    if (btnModeFixedPage) btnModeFixedPage.classList.toggle('active', isFixed);
    if (btnModeInfiniteCanvas) btnModeInfiniteCanvas.classList.toggle('active', !isFixed);
    if (pageNavDock) pageNavDock.classList.toggle('hidden', !isFixed);
    if (fixedPageTag) fixedPageTag.classList.toggle('hidden', !isFixed);
  }

  function updatePageNavUI() {
    if (state.canvasMode !== 'fixed_page') {
      if (pageNavDock) pageNavDock.classList.add('hidden');
      if (pageDropdownMenu) pageDropdownMenu.classList.add('hidden');
      return;
    }
    if (pageNavDock) pageNavDock.classList.remove('hidden');

    const pages = (state.pages && state.pages.length > 0) ? state.pages : [{ id: 'page_1', number: 1, name: 'Page 1' }];
    const activePage = pages.find((p) => p.id === state.activePageId) || pages[0];
    const currentIndex = Math.max(0, pages.findIndex((p) => p.id === activePage.id));

    if (pageSelectorLabel) {
      pageSelectorLabel.textContent = `${activePage.name || ('Page ' + (currentIndex + 1))} (${currentIndex + 1} / ${pages.length})`;
    }

    if (btnPrevPage) btnPrevPage.disabled = (currentIndex <= 0);
    if (btnNextPage) btnNextPage.disabled = (currentIndex >= pages.length - 1);
    if (btnDeletePage) btnDeletePage.disabled = (pages.length <= 1);

    // Update fixed page tag header
    if (fixedPageTagTitle) {
      fixedPageTagTitle.textContent = `${activePage.name || ('Page ' + (currentIndex + 1))} (${currentIndex + 1}/${pages.length}) · ${state.pageWidth || 1600} × ${state.pageHeight || 1000}`;
    }

    // Populate Page Dropdown Menu
    if (pageDropdownList) {
      pageDropdownList.innerHTML = '';
      pages.forEach((p, idx) => {
        const item = document.createElement('button');
        item.type = 'button';
        const isActive = p.id === state.activePageId;
        item.className = `page-dropdown-item ${isActive ? 'active' : ''}`;
        
        // Count elements on this page
        const elCount = state.elements.filter((el) => ((!el.pageId && idx === 0) || el.pageId === p.id) && el.canvasMode !== 'infinite' && el.pageId !== 'playground').length;

        item.innerHTML = `
          <span>📄 ${escapeHtml(p.name || ('Page ' + (idx + 1)))}</span>
          <span class="page-item-badge">${elCount} el</span>
        `;

        item.addEventListener('click', (e) => {
          e.stopPropagation();
          switchPage(p.id);
          if (pageDropdownMenu) pageDropdownMenu.classList.add('hidden');
        });

        pageDropdownList.appendChild(item);
      });
    }
  }

  function switchPage(pageId) {
    if (!pageId || pageId === state.activePageId) return;
    state.activePageId = pageId;
    clearSelection();
    updatePageNavUI();
    renderGrid();
    redrawBoard();
    redrawDraftLayer();
    syncAllDomElementPositions();
    sound.playClick();
    if (lastClientPos) {
      broadcastCursor(lastClientPos.x, lastClientPos.y);
    }
    socket.emit('page:switch', { pageId });
  }

  function createPage() {
    if (!canCurrentUserDraw()) {
      showToast('🎓 Presentation Mode: Only Host can add pages.', 'warning');
      return;
    }
    sound.playPop();
    socket.emit('page:create', {});
  }

  function deletePage(targetPageId) {
    if (!canCurrentUserDraw()) {
      showToast('🎓 Presentation Mode: Only Host can delete pages.', 'warning');
      return;
    }
    const pageId = targetPageId || state.activePageId;
    if (!state.pages || state.pages.length <= 1) {
      showToast('Cannot delete the only page in the room.', 'warning');
      return;
    }
    const targetPage = state.pages.find((p) => p.id === pageId) || { number: 1, name: 'Page' };
    const pageElementCount = state.elements.filter((el) => el.pageId === pageId && el.canvasMode !== 'infinite' && el.pageId !== 'playground').length;

    const confirmMsg = pageElementCount > 0
      ? `Delete "${targetPage.name || ('Page ' + targetPage.number)}" containing ${pageElementCount} elements?`
      : `Delete "${targetPage.name || ('Page ' + targetPage.number)}"?`;

    if (confirm(confirmMsg)) {
      sound.playPop();
      socket.emit('page:delete', { pageId });
    }
  }

  function setCanvasMode(mode) {
    if (mode !== 'fixed_page' && mode !== 'infinite') return;
    if (state.roomMode === 'host' && !isCurrentUserHost()) {
      showToast('🎓 Presentation Mode: Only Host can toggle canvas layout.', 'warning');
      return;
    }
    state.canvasMode = mode;
    clearSelection();
    updateCanvasModeUI();
    updatePageNavUI();
    renderGrid();
    redrawBoard();
    redrawDraftLayer();
    syncAllDomElementPositions();
    sound.playClick();

    if (mode === 'fixed_page') {
      fitPageToScreen();
      showToast('📄 Switched to Fixed Multi-Page Mode');
    } else {
      showToast('🌐 Switched to Infinite Playground Mode');
    }

    if (lastClientPos) {
      broadcastCursor(lastClientPos.x, lastClientPos.y);
    }
    socket.emit('canvas:set_mode', { mode });
    socket.emit('page:switch', { pageId: getActiveDrawingPageId(), canvasMode: mode });
  }

  // Canvas Mode & Page Navigation Event Listeners
  if (btnModeFixedPage) {
    btnModeFixedPage.addEventListener('click', () => setCanvasMode('fixed_page'));
  }
  if (btnModeInfiniteCanvas) {
    btnModeInfiniteCanvas.addEventListener('click', () => setCanvasMode('infinite'));
  }

  if (btnPrevPage) {
    btnPrevPage.addEventListener('click', (e) => {
      e.stopPropagation();
      const pages = state.pages || [];
      const currentIdx = pages.findIndex((p) => p.id === state.activePageId);
      if (currentIdx > 0) {
        switchPage(pages[currentIdx - 1].id);
      }
    });
  }

  if (btnNextPage) {
    btnNextPage.addEventListener('click', (e) => {
      e.stopPropagation();
      const pages = state.pages || [];
      const currentIdx = pages.findIndex((p) => p.id === state.activePageId);
      if (currentIdx !== -1 && currentIdx < pages.length - 1) {
        switchPage(pages[currentIdx + 1].id);
      }
    });
  }

  if (pageSelectorBtn && pageDropdownMenu) {
    pageSelectorBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = pageDropdownMenu.classList.contains('hidden');
      if (isHidden) {
        dismissAllPopovers();
        updatePageNavUI();
        pageDropdownMenu.classList.remove('hidden');
      } else {
        pageDropdownMenu.classList.add('hidden');
      }
      sound.playClick();
    });
  }

  if (btnNewPage) {
    btnNewPage.addEventListener('click', (e) => {
      e.stopPropagation();
      createPage();
    });
  }

  if (btnFitPage) {
    btnFitPage.addEventListener('click', (e) => {
      e.stopPropagation();
      fitPageToScreen();
      sound.playClick();
      showToast('⛶ Page centered & fitted');
    });
  }

  if (btnDeletePage) {
    btnDeletePage.addEventListener('click', (e) => {
      e.stopPropagation();
      deletePage();
    });
  }

  // Dismiss page dropdown menu on outside click
  window.addEventListener('click', (e) => {
    if (pageDropdownMenu && !pageDropdownMenu.classList.contains('hidden') && !e.target.closest('#pageSelectorWrapper')) {
      pageDropdownMenu.classList.add('hidden');
    }
  });

  clearBoardBtn.addEventListener('click', () => {
    if (!canCurrentUserDraw()) {
      showToast('🎓 Presentation Mode: Only the Host can clear the canvas.', 'warning');
      return;
    }
    const isFixed = state.canvasMode === 'fixed_page';
    const activePage = (state.pages && state.pages.find(p => p.id === state.activePageId)) || { number: 1, name: 'Page 1' };
    const promptMsg = isFixed
      ? `Clear all drawings on ${activePage.name || ('Page ' + activePage.number)}?`
      : 'Clear all drawings on the infinite Playground?';

    if (confirm(promptMsg)) {
      if (isFixed) {
        const activePageId = state.activePageId || 'page_1';
        state.elements = state.elements.filter((el) => {
          if (el.canvasMode === 'infinite' || el.pageId === 'playground') return true;
          return el.pageId && el.pageId !== activePageId;
        });
        for (const [elId, domNode] of state.domElementsMap.entries()) {
          const el = state.elements.find((item) => item.id === elId);
          if (!el || (el.pageId === activePageId && el.canvasMode !== 'infinite')) {
            domNode.remove();
            state.domElementsMap.delete(elId);
          }
        }
        clearSelection();
        state.undoStack = [];
        state.redoStack = [];
        redrawBoard();
        socket.emit('elements:clear', { pageId: activePageId });
        sound.playPop();
        showToast('Page cleared');
      } else {
        // Clear Playground elements only
        state.elements = state.elements.filter((el) => el.pageId !== 'playground' && el.canvasMode !== 'infinite');
        for (const [elId, domNode] of state.domElementsMap.entries()) {
          const el = state.elements.find((item) => item.id === elId);
          if (!el || el.pageId === 'playground' || el.canvasMode === 'infinite') {
            domNode.remove();
            state.domElementsMap.delete(elId);
          }
        }
        clearSelection();
        state.undoStack = [];
        state.redoStack = [];
        redrawBoard();
        socket.emit('elements:clear', { pageId: 'playground' });
        sound.playPop();
        showToast('Playground cleared');
      }
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

  // Legal & Contact Modals
  const privacyModal = document.getElementById('privacyModal');
  const btnOpenPrivacyPolicy = document.getElementById('btnOpenPrivacyPolicy');
  const closePrivacyBtn = document.getElementById('closePrivacyBtn');
  const btnAckPrivacy = document.getElementById('btnAckPrivacy');

  const termsModal = document.getElementById('termsModal');
  const btnOpenTermsOfService = document.getElementById('btnOpenTermsOfService');
  const closeTermsBtn = document.getElementById('closeTermsBtn');
  const btnAckTerms = document.getElementById('btnAckTerms');

  const contactModal = document.getElementById('contactModal');
  const btnOpenContactModal = document.getElementById('btnOpenContactModal');
  const closeContactBtn = document.getElementById('closeContactBtn');
  const btnAckContact = document.getElementById('btnAckContact');

  function openLegalModal(modalEl) {
    if (modalEl) {
      dismissAllPopovers();
      modalEl.classList.add('active');
      sound.playPop();
    }
  }

  function closeLegalModal(modalEl) {
    if (modalEl) {
      modalEl.classList.remove('active');
    }
  }

  if (btnOpenPrivacyPolicy) btnOpenPrivacyPolicy.addEventListener('click', () => openLegalModal(privacyModal));
  if (closePrivacyBtn) closePrivacyBtn.addEventListener('click', () => closeLegalModal(privacyModal));
  if (btnAckPrivacy) btnAckPrivacy.addEventListener('click', () => closeLegalModal(privacyModal));
  if (privacyModal) privacyModal.addEventListener('click', (e) => { if (e.target === privacyModal) closeLegalModal(privacyModal); });

  if (btnOpenTermsOfService) btnOpenTermsOfService.addEventListener('click', () => openLegalModal(termsModal));
  if (closeTermsBtn) closeTermsBtn.addEventListener('click', () => closeLegalModal(termsModal));
  if (btnAckTerms) btnAckTerms.addEventListener('click', () => closeLegalModal(termsModal));
  if (termsModal) termsModal.addEventListener('click', (e) => { if (e.target === termsModal) closeLegalModal(termsModal); });

  if (btnOpenContactModal) btnOpenContactModal.addEventListener('click', () => openLegalModal(contactModal));
  if (closeContactBtn) closeContactBtn.addEventListener('click', () => closeLegalModal(contactModal));
  if (btnAckContact) btnAckContact.addEventListener('click', () => closeLegalModal(contactModal));
  if (contactModal) contactModal.addEventListener('click', (e) => { if (e.target === contactModal) closeLegalModal(contactModal); });

  // Feedback & Bug Report Modal
  const feedbackModal = document.getElementById('feedbackModal');
  const btnFooterOpenFeedback = document.getElementById('btnFooterOpenFeedback');
  const btnOpenFeedbackModal = document.getElementById('btnOpenFeedbackModal');
  const closeFeedbackBtn = document.getElementById('closeFeedbackBtn');
  const btnCancelFeedback = document.getElementById('btnCancelFeedback');
  const feedbackForm = document.getElementById('feedbackForm');
  const feedbackNameInput = document.getElementById('feedbackNameInput');
  const feedbackEmailInput = document.getElementById('feedbackEmailInput');
  const feedbackRatingGroup = document.getElementById('feedbackRatingGroup');
  const feedbackRatingInput = document.getElementById('feedbackRatingInput');
  const feedbackStarsContainer = document.getElementById('feedbackStarsContainer');
  const ratingTextBadge = document.getElementById('ratingTextBadge');
  const bugSummaryGroup = document.getElementById('bugSummaryGroup');
  const feedbackSubjectInput = document.getElementById('feedbackSubjectInput');
  const feedbackSubjectLabel = document.getElementById('feedbackSubjectLabel');
  const feedbackDetailsGroup = document.getElementById('feedbackDetailsGroup');
  const feedbackDetailsInput = document.getElementById('feedbackDetailsInput');
  const feedbackDetailsLabel = document.getElementById('feedbackDetailsLabel');
  const bugAttachmentGroup = document.getElementById('bugAttachmentGroup');
  const feedbackFileInput = document.getElementById('feedbackFileInput');
  const btnFeedbackAttach = document.getElementById('btnFeedbackAttach');
  const feedbackPreviewChip = document.getElementById('feedbackPreviewChip');
  const feedbackPreviewImg = document.getElementById('feedbackPreviewImg');
  const feedbackPreviewName = document.getElementById('feedbackPreviewName');
  const btnRemoveAttachment = document.getElementById('btnRemoveAttachment');
  const btnSubmitFeedback = document.getElementById('btnSubmitFeedback');
  const feedbackBtnText = document.getElementById('feedbackBtnText');
  const feedbackTypePills = document.querySelectorAll('.feedback-type-pill');

  let feedbackAttachedBase64 = null;
  let currentRating = 5;

  const RATING_LABELS = {
    1: '1 / 5 • Poor 😞',
    2: '2 / 5 • Needs Work 😕',
    3: '3 / 5 • Okay 😐',
    4: '4 / 5 • Good! 😊',
    5: '5 / 5 • Excellent! 🌟'
  };

  function updateStarRatingUI(rating) {
    currentRating = rating;
    if (feedbackRatingInput) feedbackRatingInput.value = rating;
    if (ratingTextBadge) ratingTextBadge.textContent = RATING_LABELS[rating] || `${rating} / 5 Stars`;

    if (feedbackStarsContainer) {
      const starBtns = feedbackStarsContainer.querySelectorAll('.star-btn');
      starBtns.forEach((btn) => {
        const starVal = parseInt(btn.getAttribute('data-rating'), 10);
        if (starVal <= rating) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }
  }

  if (feedbackStarsContainer) {
    const starBtns = feedbackStarsContainer.querySelectorAll('.star-btn');
    starBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const ratingVal = parseInt(btn.getAttribute('data-rating'), 10) || 5;
        updateStarRatingUI(ratingVal);
        sound.playPop();
      });

      btn.addEventListener('mouseenter', () => {
        const hoverVal = parseInt(btn.getAttribute('data-rating'), 10) || 5;
        starBtns.forEach((b) => {
          const v = parseInt(b.getAttribute('data-rating'), 10);
          if (v <= hoverVal) b.classList.add('hovered');
          else b.classList.remove('hovered');
        });
      });
    });

    feedbackStarsContainer.addEventListener('mouseleave', () => {
      const starBtns = feedbackStarsContainer.querySelectorAll('.star-btn');
      starBtns.forEach((b) => b.classList.remove('hovered'));
      updateStarRatingUI(currentRating);
    });
  }

  function openFeedbackModalView() {
    if (feedbackNameInput && state.user && state.user.name && !feedbackNameInput.value) {
      feedbackNameInput.value = state.user.name;
    }
    openLegalModal(feedbackModal);
  }

  if (btnFooterOpenFeedback) {
    btnFooterOpenFeedback.addEventListener('click', () => {
      openFeedbackModalView();
    });
  }

  if (btnOpenFeedbackModal) {
    btnOpenFeedbackModal.addEventListener('click', () => {
      closeLegalModal(contactModal);
      openFeedbackModalView();
    });
  }

  if (closeFeedbackBtn) closeFeedbackBtn.addEventListener('click', () => closeLegalModal(feedbackModal));
  if (btnCancelFeedback) btnCancelFeedback.addEventListener('click', () => closeLegalModal(feedbackModal));
  if (feedbackModal) feedbackModal.addEventListener('click', (e) => { if (e.target === feedbackModal) closeLegalModal(feedbackModal); });

  // Update Form fields based on Category
  function setFeedbackCategory(type) {
    if (type === 'bug') {
      // Hide Rating, Show Bug fields
      if (feedbackRatingGroup) feedbackRatingGroup.classList.add('hidden');
      if (bugSummaryGroup) bugSummaryGroup.classList.remove('hidden');
      if (bugAttachmentGroup) bugAttachmentGroup.classList.remove('hidden');

      if (feedbackSubjectInput) {
        feedbackSubjectInput.setAttribute('required', 'true');
        feedbackSubjectInput.placeholder = 'e.g. Brush cursor lags on Firefox or Undo button glitch...';
      }
      if (feedbackDetailsLabel) feedbackDetailsLabel.innerHTML = 'Issue Details &amp; Steps to Reproduce';
      if (feedbackDetailsInput) {
        feedbackDetailsInput.setAttribute('required', 'true');
        feedbackDetailsInput.placeholder = 'Describe what happened, error message seen, and steps to reproduce...';
      }
      if (feedbackBtnText) feedbackBtnText.textContent = 'Submit Bug Report 🐛';
    } else {
      // General Feedback mode: Name, Rating, and Description (Optional)
      if (feedbackRatingGroup) feedbackRatingGroup.classList.remove('hidden');
      if (bugSummaryGroup) bugSummaryGroup.classList.add('hidden');
      if (bugAttachmentGroup) bugAttachmentGroup.classList.add('hidden');

      if (feedbackSubjectInput) {
        feedbackSubjectInput.removeAttribute('required');
        feedbackSubjectInput.value = '';
      }
      if (feedbackDetailsLabel) feedbackDetailsLabel.innerHTML = 'Description <span class="label-sub">(Optional)</span>';
      if (feedbackDetailsInput) {
        feedbackDetailsInput.removeAttribute('required');
        feedbackDetailsInput.placeholder = 'Share your thoughts, what you love, or ideas for improving CoCanvas...';
      }
      if (feedbackBtnText) feedbackBtnText.textContent = 'Send Feedback 🚀';
    }
  }

  // Category Pill Selection
  feedbackTypePills.forEach((pill) => {
    pill.addEventListener('click', () => {
      feedbackTypePills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      const radio = pill.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        setFeedbackCategory(radio.value);
      }
    });
  });

  // Attach File Handling
  if (btnFeedbackAttach && feedbackFileInput) {
    btnFeedbackAttach.addEventListener('click', () => feedbackFileInput.click());

    feedbackFileInput.addEventListener('change', () => {
      const file = feedbackFileInput.files && feedbackFileInput.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        showToast('Please attach an image (PNG, JPG, etc.)');
        return;
      }

      if (file.size > 8 * 1024 * 1024) {
        showToast('Image size should be under 8MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        feedbackAttachedBase64 = ev.target.result;
        if (feedbackPreviewImg) feedbackPreviewImg.src = feedbackAttachedBase64;
        if (feedbackPreviewName) feedbackPreviewName.textContent = file.name;
        if (feedbackPreviewChip) feedbackPreviewChip.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    });
  }

  if (btnRemoveAttachment) {
    btnRemoveAttachment.addEventListener('click', (e) => {
      e.stopPropagation();
      feedbackAttachedBase64 = null;
      if (feedbackFileInput) feedbackFileInput.value = '';
      if (feedbackPreviewChip) feedbackPreviewChip.classList.add('hidden');
      if (feedbackPreviewImg) feedbackPreviewImg.src = '';
    });
  }

  // Submit Feedback Handler
  if (feedbackForm) {
    feedbackForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = (feedbackNameInput ? feedbackNameInput.value.trim() : '') || 'Anonymous User';
      const email = feedbackEmailInput ? feedbackEmailInput.value.trim() : '';
      const checkedCategoryEl = feedbackForm.querySelector('input[name="feedbackCategory"]:checked');
      const type = checkedCategoryEl ? checkedCategoryEl.value : 'general';
      const rating = currentRating;
      
      let subject = '';
      let message = (feedbackDetailsInput ? feedbackDetailsInput.value.trim() : '');

      if (type === 'bug') {
        subject = (feedbackSubjectInput ? feedbackSubjectInput.value.trim() : '') || 'Bug Report';
        if (!subject || !message) {
          showToast('Please provide both the bug summary and issue details.');
          return;
        }
      } else {
        // General Feedback
        subject = `General Feedback (${rating}/5 Stars)`;
        if (!message) {
          message = `User gave a ${rating}/5 star rating!`;
        }
      }

      if (btnSubmitFeedback) {
        btnSubmitFeedback.disabled = true;
        btnSubmitFeedback.classList.add('btn-loading');
      }
      if (feedbackBtnText) feedbackBtnText.textContent = 'Sending...';

      const payload = {
        name,
        email,
        type,
        rating: type === 'general' ? rating : undefined,
        subject,
        message,
        attachedImage: type === 'bug' ? feedbackAttachedBase64 : null
      };

      try {
        // Send to CoCanvas backend API which dispatches via Resend API
        const response = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error('Server responded with an error');
        }

        sound.playPop();
        showToast('🎉 Feedback sent successfully! Thank you!');

        // Reset form & close modal
        feedbackForm.reset();
        feedbackAttachedBase64 = null;
        updateStarRatingUI(5);
        if (feedbackFileInput) feedbackFileInput.value = '';
        if (feedbackPreviewChip) feedbackPreviewChip.classList.add('hidden');
        feedbackTypePills.forEach((p, idx) => {
          if (idx === 0) p.classList.add('active');
          else p.classList.remove('active');
        });
        setFeedbackCategory('general');

        closeLegalModal(feedbackModal);
      } catch (err) {
        console.error('Error sending feedback:', err);
        showToast('⚠️ Feedback received. Thank you!');
        closeLegalModal(feedbackModal);
      } finally {
        if (btnSubmitFeedback) {
          btnSubmitFeedback.disabled = false;
          btnSubmitFeedback.classList.remove('btn-loading');
        }
        if (feedbackBtnText) {
          feedbackBtnText.textContent = type === 'bug' ? 'Submit Bug Report 🐛' : 'Send Feedback 🚀';
        }
      }
    });
  }

  if (btnOpenManageHosts) {
    btnOpenManageHosts.addEventListener('click', (e) => {
      e.stopPropagation();
      dismissAllPopovers();
      openManageHostsModal();
    });
  }

  if (closeManageHostsBtn) {
    closeManageHostsBtn.addEventListener('click', closeManageHostsModal);
  }

  if (manageHostsModal) {
    manageHostsModal.addEventListener('click', (e) => {
      if (e.target === manageHostsModal) closeManageHostsModal();
    });
  }

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

  // Toggle Collaborators' Cursors Visibility
  function toggleRemoteCursors() {
    state.showRemoteCursors = !state.showRemoteCursors;
    localStorage.setItem('cocanvas_show_remote_cursors', state.showRemoteCursors ? 'true' : 'false');
    updateToggleCursorsUI();
    sound.playClick();
    showToast(
      state.showRemoteCursors
        ? '👁️ Collaborators\' cursors: <strong>Visible</strong>'
        : '🙈 Collaborators\' cursors: <strong>Hidden</strong>',
      'info'
    );
  }

  function updateToggleCursorsUI() {
    if (!toggleCursorsBtn) return;
    const isVisible = state.showRemoteCursors !== false;
    toggleCursorsBtn.classList.toggle('active', isVisible);
    toggleCursorsBtn.classList.toggle('cursors-hidden', !isVisible);
    toggleCursorsBtn.title = isVisible
      ? 'Hide Collaborators\' Cursors (Alt + C)'
      : 'Show Collaborators\' Cursors (Alt + C)';

    const iconVis = toggleCursorsBtn.querySelector('.icon-cursor-visible');
    const iconHid = toggleCursorsBtn.querySelector('.icon-cursor-hidden');
    if (iconVis) iconVis.classList.toggle('hidden', !isVisible);
    if (iconHid) iconHid.classList.toggle('hidden', isVisible);
  }

  if (toggleCursorsBtn) {
    toggleCursorsBtn.addEventListener('click', () => {
      toggleRemoteCursors();
    });
    updateToggleCursorsUI();
  }

  // Light / Dark Theme Toggle Buttons
  if (landingThemeToggleBtn) {
    landingThemeToggleBtn.addEventListener('click', toggleTheme);
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
    const drawingKeys = ['p', 'h', 'e', 'b', 'f', 'r', 'o', 'a', 'l', 's', 't', 'c', 'i'];
    if (drawingKeys.includes(key) && !canCurrentUserDraw()) {
      showToast('🎓 Presentation Mode: Only the Host can draw.', 'warning');
      return;
    }

    if (e.altKey && (key === 'c' || e.code === 'KeyC')) {
      e.preventDefault();
      toggleRemoteCursors();
      return;
    }

    if (key === 'v') { state.activeTool = 'select'; updateActiveToolUI(); sound.playClick(); }
    else if (key === 'k') { state.activeTool = 'laser'; updateActiveToolUI(); sound.playClick(); }
    else if (key === 'p') { state.activeTool = 'pen'; updateActiveToolUI(); sound.playClick(); }
    else if (key === 'h') { state.activeTool = 'highlighter'; updateActiveToolUI(); sound.playClick(); }
    else if (key === 'e') { state.activeTool = 'eraser'; updateActiveToolUI(); sound.playClick(); }
    else if (key === 'b' || key === 'f') { state.activeTool = 'fill'; updateActiveToolUI(); sound.playClick(); }
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
      state.activeTool = 'arrow-right';
      const arrowBtn = shapesPopover.querySelector('[data-tool="arrow-right"]') || shapesPopover.querySelector('[data-tool="arrow"]');
      if (arrowBtn) activeShapeIcon.innerHTML = arrowBtn.querySelector('svg').outerHTML;
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
      if (privacyModal) privacyModal.classList.remove('active');
      if (termsModal) termsModal.classList.remove('active');
      if (contactModal) contactModal.classList.remove('active');
      if (feedbackModal) feedbackModal.classList.remove('active');
      if (manageHostsModal) manageHostsModal.classList.remove('active');
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
    else if (key === '[') {
      e.preventDefault();
      if (state.activeTool === 'eraser') {
        setEraserSize(state.activeEraserSize - 2);
        sound.playClick();
        showToast(`Eraser Size: ${state.activeEraserSize}px`);
      } else {
        setBrushSize(state.activeWidth - 1);
        sound.playClick();
        showToast(`Brush Size: ${state.activeWidth}px`);
      }
    }
    else if (key === ']') {
      e.preventDefault();
      if (state.activeTool === 'eraser') {
        setEraserSize(state.activeEraserSize + 2);
        sound.playClick();
        showToast(`Eraser Size: ${state.activeEraserSize}px`);
      } else {
        setBrushSize(state.activeWidth + 1);
        sound.playClick();
        showToast(`Brush Size: ${state.activeWidth}px`);
      }
    }
    else if (key === '1') { triggerReaction('🔥'); }
    else if (key === '2') { triggerReaction('❤️'); }
    else if (key === '3') { triggerReaction('🎉'); }
    else if (key === '4') { triggerReaction('🚀'); }
    else if (key === '5') { triggerReaction('👍'); }

    // Browser Zoom Interception: Zoom canvas only, keep all UI bars and boxes fixed
    if ((e.ctrlKey || e.metaKey) && (key === '=' || key === '+' || e.code === 'Equal' || e.code === 'NumpadAdd')) {
      e.preventDefault();
      zoomInBtn.click();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (key === '-' || key === '_' || e.code === 'Minus' || e.code === 'NumpadSubtract')) {
      e.preventDefault();
      zoomOutBtn.click();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (key === '0' || e.code === 'Digit0' || e.code === 'Numpad0')) {
      e.preventDefault();
      zoomResetBtn.click();
      return;
    }

    if (key === '+' || key === '=') {
      zoomInBtn.click();
    } else if (key === '-' || key === '_') {
      zoomOutBtn.click();
    }

    if ((e.ctrlKey || e.metaKey) && key === 'z') {
      e.preventDefault();
      if (e.shiftKey) performRedo();
      else performUndo();
    } else if ((e.ctrlKey || e.metaKey) && key === 'y') {
      e.preventDefault();
      performRedo();
    }
  });

  // Global window wheel zoom interceptor (prevents browser full-page scaling on Ctrl+Wheel and Touchpad Pinch inside canvas room)
  window.addEventListener('wheel', (e) => {
    // If on landing screen, do not intercept wheel events so user can naturally scroll the landing page with mouse wheel
    if (landingScreen && landingScreen.classList.contains('active')) {
      return;
    }

    const isScrollable = e.target.closest('#chatMessageList, #chatEmojiGridScroll, #reactionScrollArea, .reaction-catalog-grid, .modal-card, .shortcuts-card, .host-users-list, textarea');
    if (e.ctrlKey || e.metaKey || !isScrollable) {
      e.preventDefault();
      const zoomFactor = 1.09;
      const newZoom = e.deltaY < 0 ? state.zoom * zoomFactor : state.zoom / zoomFactor;
      applyZoom(newZoom, e.clientX || window.innerWidth / 2, e.clientY || window.innerHeight / 2);
    }
  }, { passive: false });

  // Prevent browser viewport scaling on Safari/iOS trackpad/touch gestures so only canvas zooms inside the room
  document.addEventListener('gesturestart', (e) => {
    if (landingScreen && landingScreen.classList.contains('active')) return;
    e.preventDefault();
  }, { passive: false });
  document.addEventListener('gesturechange', (e) => {
    if (landingScreen && landingScreen.classList.contains('active')) return;
    e.preventDefault();
  }, { passive: false });
  document.addEventListener('gestureend', (e) => {
    if (landingScreen && landingScreen.classList.contains('active')) return;
    e.preventDefault();
  }, { passive: false });

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
    state.coHostSessionIds = new Set(data.coHostSessionIds || []);
    state.roomMode = data.roomMode || 'friendly';
    state.canvasMode = data.canvasMode || 'fixed_page';
    state.pageWidth = data.pageWidth || 1600;
    state.pageHeight = data.pageHeight || 1000;
    state.pages = Array.isArray(data.pages) && data.pages.length > 0 ? data.pages : [{ id: 'page_1', number: 1, name: 'Page 1', elements: [] }];
    state.activePageId = data.activePageId || (state.pages[0] ? state.pages[0].id : 'page_1');

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
    updateCanvasModeUI();
    updatePageNavUI();
    renderManageHostsModal();
    renderGrid();
    redrawBoard();
    syncAllDomElementPositions();

    if (state.canvasMode === 'fixed_page') {
      setTimeout(() => fitPageToScreen(), 60);
    }
  });

  socket.on('canvas:mode_changed', ({ canvasMode, byHost, hostName }) => {
    // Only force-sync canvas mode when broadcasted by the Host during Host Mode presentation
    if (byHost) {
      state.canvasMode = canvasMode || 'fixed_page';
      updateCanvasModeUI();
      updatePageNavUI();
      renderGrid();
      redrawBoard();
      syncAllDomElementPositions();
      sound.playPop();
      if (state.canvasMode === 'fixed_page') {
        fitPageToScreen();
        showToast(`🎓 <strong>Presentation:</strong> ${escapeHtml(hostName || 'Host')} switched layout to <strong>Fixed Multi-Page Mode</strong>`, 'host');
      } else {
        showToast(`🎓 <strong>Presentation:</strong> ${escapeHtml(hostName || 'Host')} switched layout to <strong>Infinite Playground Mode</strong>`, 'host');
      }
    }
  });

  socket.on('page:created', ({ page, activePageId, pages, creatorSocketId, byHost }) => {
    if (pages) state.pages = pages;
    else if (page) state.pages.push(page);

    const isSelfCreator = (creatorSocketId && creatorSocketId === state.user.id) || (socket && creatorSocketId === socket.id);
    const shouldSwitch = isSelfCreator || byHost;

    if (shouldSwitch && activePageId) {
      state.activePageId = activePageId;
      clearSelection();
      if (state.canvasMode === 'fixed_page') fitPageToScreen();
    }

    updatePageNavUI();
    renderGrid();
    redrawBoard();
    syncAllDomElementPositions();
    sound.playPop();

    if (isSelfCreator) {
      showToast(`📄 Created new ${escapeHtml(page ? page.name : 'Page')}`, 'success');
    } else if (byHost) {
      showToast(`🎓 Host created & switched to ${escapeHtml(page ? page.name : 'Page')}`, 'host');
    } else {
      showToast(`📄 New page created: <strong>${escapeHtml(page ? page.name : 'Page')}</strong> (Available in selector)`, 'info');
    }
  });

  socket.on('page:switched', ({ activePageId, byHost, hostName }) => {
    if (!activePageId) return;
    state.activePageId = activePageId;
    clearSelection();
    updatePageNavUI();
    renderGrid();
    redrawBoard();
    syncAllDomElementPositions();
    if (state.canvasMode === 'fixed_page') fitPageToScreen();

    if (byHost) {
      sound.playPop();
      const pageObj = state.pages && state.pages.find((p) => p.id === activePageId);
      const pageTitle = pageObj ? (pageObj.name || ('Page ' + pageObj.number)) : 'Page';
      showToast(`🎓 <strong>Presentation:</strong> ${escapeHtml(hostName || 'Host')} moved view to <strong>${escapeHtml(pageTitle)}</strong>`, 'host');
    }
  });

  socket.on('page:deleted', ({ deletedPageId, activePageId, pages }) => {
    if (pages) state.pages = pages;

    // If current page was deleted, switch to fallback active page
    if (state.activePageId === deletedPageId) {
      state.activePageId = activePageId || (state.pages[0] ? state.pages[0].id : 'page_1');
      clearSelection();
      if (state.canvasMode === 'fixed_page') fitPageToScreen();
    }

    // Remove deleted page elements locally
    state.elements = state.elements.filter((el) => el.pageId !== deletedPageId);
    for (const [elId, domNode] of state.domElementsMap.entries()) {
      const el = state.elements.find((item) => item.id === elId);
      if (!el || el.pageId === deletedPageId) {
        domNode.remove();
        state.domElementsMap.delete(elId);
      }
    }

    updatePageNavUI();
    renderGrid();
    redrawBoard();
    syncAllDomElementPositions();
    sound.playPop();
    showToast('🗑️ Page was deleted', 'info');
  });

  socket.on('room:hosts_updated', ({ hostSessionId, coHostSessionIds, action, previousHostSessionId, newHostSessionId, fromName, toName, targetSessionId, isCoHost, targetName }) => {
    if (hostSessionId) state.hostSessionId = hostSessionId;
    state.coHostSessionIds = new Set(coHostSessionIds || []);

    updateCollaboratorsUI();
    updateRoomModeUI();
    renderManageHostsModal();

    if (action === 'transfer') {
      sound.playPop();
      if (newHostSessionId === state.user.sessionId) {
        showToast(`👑 <strong>You are now the Primary Host!</strong> (${escapeHtml(fromName || 'Previous Host')} transferred room ownership to you)`, 'host');
      } else if (previousHostSessionId === state.user.sessionId) {
        showToast(`👑 <strong>Host transferred</strong>: You transferred Primary Host ownership to <strong>${escapeHtml(toName || 'teammate')}</strong>.`, 'info');
      } else {
        showToast(`👑 <strong>${escapeHtml(fromName || 'Host')}</strong> transferred Room Host ownership to <strong>${escapeHtml(toName || 'teammate')}</strong>.`, 'info');
      }
    } else if (action === 'cohost') {
      sound.playPop();
      if (targetSessionId === state.user.sessionId) {
        if (isCoHost) {
          showToast(`⭐ <strong>You are now a Co-Host!</strong> You can present and toggle room modes.`, 'host');
        } else {
          showToast(`⭐ Your Co-Host access was removed.`, 'info');
        }
      } else {
        if (isCoHost) {
          showToast(`⭐ <strong>${escapeHtml(targetName || 'Teammate')}</strong> is now a Co-Host.`, 'info');
        } else {
          showToast(`⭐ <strong>${escapeHtml(targetName || 'Teammate')}</strong> is no longer a Co-Host.`, 'info');
        }
      }
    } else if (action === 'auto_handover') {
      if (newHostSessionId === state.user.sessionId) {
        showToast(`👑 <strong>You are now the Room Host!</strong> (Previous host disconnected)`, 'host');
      }
    }
  });

  socket.on('room:host_changed', ({ hostSessionId }) => {
    if (hostSessionId) state.hostSessionId = hostSessionId;
    updateCollaboratorsUI();
    updateRoomModeUI();
    renderManageHostsModal();
    if (state.hostSessionId === state.user.sessionId) {
      showToast('👑 <strong>You are the room host!</strong>', 'host');
    }
  });

  socket.on('room:mode_changed', ({ mode, hostSessionId, coHostSessionIds }) => {
    state.roomMode = mode;
    if (hostSessionId) state.hostSessionId = hostSessionId;
    if (coHostSessionIds) state.coHostSessionIds = new Set(coHostSessionIds);
    updateRoomModeUI();
    updateCollaboratorsUI();
    renderManageHostsModal();

    if (mode === 'host') {
      sound.playPop();
      if (isCurrentUserHost()) {
        showToast('🎓 <strong>Host Mode active</strong>: You are presenting. Viewers are in View-Only mode.', 'host');
      } else {
        showToast('🎓 <strong>Presentation Mode</strong>: Hosts are presenting. Canvas is now View-Only.', 'info');
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
    for (const [id, peer] of state.collaborators.entries()) {
      if (id === socketId || peer.id === socketId || peer.socketId === socketId) {
        state.collaborators.delete(id);
      }
    }
    state.remoteLiveDrafts.delete(socketId);
    redrawDraftLayer();
    updateCollaboratorsUI();
    renderManageHostsModal();
  });

  socket.on('room:user_kicked_broadcast', ({ name, byName }) => {
    showToast(`🚫 <strong>${escapeHtml(name)}</strong> was removed from the room by ${escapeHtml(byName)}`, 'info');
    if (typeof playSound === 'function') playSound('pop');
    updateCollaboratorsUI();
    renderManageHostsModal();
  });

  socket.on('room:kicked', ({ reason, by }) => {
    sound.playPop();
    alert(`🚫 ${reason || 'You have been removed from the room by the Host.'}`);
    
    // Reset room state and transition cleanly back to landing screen
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
    if (chatMessagesContainer) chatMessagesContainer.innerHTML = '';

    const cleanUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
    window.history.pushState({ path: cleanUrl }, '', cleanUrl);

    showToast(`🚫 You were removed by ${by || 'the Host'}`, 'warning');
  });

  socket.on('room:banned', ({ roomId, reason }) => {
    sound.playPop();
    alert(`🚫 Access Denied!\n\n${reason || 'You cannot join this room because you were kicked 2 times by the Host.'}`);
    
    // Return to landing screen and clear room URL
    state.roomId = null;
    whiteboardScreen.classList.remove('active');
    landingScreen.classList.add('active');
    state.currentScreen = 'landing';

    const cleanUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
    window.history.pushState({ path: cleanUrl }, '', cleanUrl);

    showToast(`🚫 Banned from room ${roomId || ''}`, 'warning');
  });

  socket.on('toast:error', (msg) => {
    showToast(`⚠️ ${msg}`, 'warning');
  });

  socket.on('cursor:update', (data) => {
    if (!data || !data.socketId) return;
    const peer = state.collaborators.get(data.socketId);
    if (!peer) return;
    peer.cursor = { x: data.x, y: data.y };
    if (data.pageId) peer.activePageId = data.pageId;
    if (data.chatText !== undefined) peer.chatText = data.chatText;
  });

  socket.on('user:page_changed', ({ socketId, activePageId }) => {
    const peer = state.collaborators.get(socketId);
    if (peer) {
      peer.activePageId = activePageId;
      redrawDraftLayer();
    }
  });

  socket.on('laser:trailed', (data) => {
    const currentContext = getActiveDrawingPageId();
    const targetContext = data.pageId || (data.canvasMode === 'infinite' ? 'playground' : 'page_1');
    if (targetContext !== currentContext) {
      return;
    }
    const screenPos = worldToScreen(data.x, data.y);
    addLaserPoint(screenPos.x, screenPos.y, data.color);
  });

  // Real-time live in-progress stroke streaming from collaborators
  socket.on('draw:lived', (data) => {
    if (!data || !data.socketId) return;
    state.remoteLiveDrafts.set(data.socketId, data);
    redrawDraftLayer();
  });

  socket.on('draw:lived_end', (data) => {
    if (data && data.socketId) {
      state.remoteLiveDrafts.delete(data.socketId);
    }
    redrawDraftLayer();
  });

  socket.on('element:added', (el) => {
    if (!state.elements.some((item) => item.id === el.id)) {
      state.elements.push(el);
      if (el.type === 'sticky') {
        const node = createStickyNoteNode(el);
        syncDomElementPosition(el, node);
      } else if (el.type === 'text') {
        const node = createTextBoxNode(el);
        syncDomElementPosition(el, node);
      } else if (el.type === 'code') {
        const node = createCodeSnippetNode(el);
        syncDomElementPosition(el, node);
      }
      redrawBoard();
    }
  });

  socket.on('element:updated', (updated) => {
    const idx = state.elements.findIndex((item) => item.id === updated.id);
    if (idx !== -1) state.elements[idx] = { ...state.elements[idx], ...updated };
    else state.elements.push(updated);

    const el = state.elements[idx] || updated;
    const elType = (el && el.type) || updated.type;

    if (elType === 'sticky') {
      let node = state.domElementsMap.get(updated.id);
      if (!node && el) node = createStickyNoteNode(el);
      if (node) {
        const textarea = node.querySelector('textarea');
        if (textarea && updated.text !== undefined && textarea.value !== updated.text && document.activeElement !== textarea) {
          textarea.value = updated.text || '';
        }
        if (updated.theme) node.className = `sticky-note-card theme-${updated.theme}`;
        syncDomElementPosition(el, node);
      }
    } else if (elType === 'text') {
      let node = state.domElementsMap.get(updated.id);
      if (!node && el) node = createTextBoxNode(el);
      if (node) {
        const textarea = node.querySelector('textarea');
        if (textarea) {
          if (updated.text !== undefined && textarea.value !== updated.text && document.activeElement !== textarea) {
            textarea.value = updated.text || '';
          }
          if (updated.fontSize) {
            textarea.style.fontSize = `${updated.fontSize}px`;
            const sizeBadge = node.querySelector('.board-text-size-val');
            if (sizeBadge) sizeBadge.textContent = `${updated.fontSize}px`;
          }
          if (updated.color) {
            textarea.style.color = updated.color;
            node.querySelectorAll('.board-text-color-dot').forEach((d) => {
              d.classList.toggle('active', d.dataset.color === updated.color);
            });
          }
          // Auto-resize height so all multi-line text is visible
          textarea.style.height = 'auto';
          textarea.style.height = `${Math.max(30, textarea.scrollHeight)}px`;
        }
        syncDomElementPosition(el, node);
      }
    } else if (elType === 'code') {
      let node = state.domElementsMap.get(updated.id);
      if (!node && el) node = createCodeSnippetNode(el);
      if (node) {
        const textarea = node.querySelector('.code-textarea');
        if (textarea && updated.code !== undefined && textarea.value !== updated.code && document.activeElement !== textarea) {
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
        syncDomElementPosition(el, node);
      }
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
      if (updated.type === 'text') {
        const node = state.domElementsMap.get(updated.id);
        if (node) {
          const textarea = node.querySelector('textarea');
          if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.max(30, textarea.scrollHeight)}px`;
          }
        }
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

  socket.on('elements:cleared', (data = {}) => {
    if (data && data.pageId) {
      const targetPageId = data.pageId;
      if (targetPageId === 'playground') {
        state.elements = state.elements.filter((el) => el.pageId !== 'playground' && el.canvasMode !== 'infinite');
        for (const [elId, domNode] of state.domElementsMap.entries()) {
          const el = state.elements.find((item) => item.id === elId);
          if (!el || el.pageId === 'playground' || el.canvasMode === 'infinite') {
            domNode.remove();
            state.domElementsMap.delete(elId);
          }
        }
        if (state.canvasMode === 'infinite') {
          clearSelection();
          state.undoStack = [];
          state.redoStack = [];
          redrawBoard();
          showToast('Playground was cleared by a collaborator');
        }
      } else {
        state.elements = state.elements.filter((el) => {
          if (el.canvasMode === 'infinite' || el.pageId === 'playground') return true;
          return el.pageId && el.pageId !== targetPageId;
        });
        for (const [elId, domNode] of state.domElementsMap.entries()) {
          const el = state.elements.find((item) => item.id === elId);
          if (!el || (el.pageId === targetPageId && el.canvasMode !== 'infinite')) {
            domNode.remove();
            state.domElementsMap.delete(elId);
          }
        }
        if (state.canvasMode === 'fixed_page' && state.activePageId === targetPageId) {
          clearSelection();
          state.undoStack = [];
          state.redoStack = [];
          redrawBoard();
          showToast('Page was cleared by a collaborator');
        }
      }
    } else {
      state.elements = [];
      domLayer.innerHTML = '';
      state.domElementsMap.clear();
      clearSelection();
      state.undoStack = [];
      state.redoStack = [];
      redrawBoard();
      showToast('Board was cleared by a collaborator');
    }
  });

  socket.on('reaction:emitted', (data) => {
    const currentContext = getActiveDrawingPageId();
    const targetContext = data.pageId || (data.canvasMode === 'infinite' ? 'playground' : 'page_1');
    if (targetContext !== currentContext) {
      return;
    }
    const screenPos = worldToScreen(data.x, data.y);
    addEmojiBurst(data.emoji, screenPos.x, screenPos.y);
    sound.playReactionChime();
  });

  socket.on('radar:pinged', (data) => {
    const currentContext = getActiveDrawingPageId();
    const targetContext = data.pageId || (data.canvasMode === 'infinite' ? 'playground' : 'page_1');
    if (targetContext !== currentContext) {
      return;
    }
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

  // --- ChatSpace Full Emoji Picker Popover ---
  const btnChatEmojiPicker = document.getElementById('btnChatEmojiPicker');
  const chatEmojiContainer = document.getElementById('chatEmojiContainer');
  const chatEmojiPopover = document.getElementById('chatEmojiPopover');
  const chatEmojiSearchInput = document.getElementById('chatEmojiSearchInput');
  const chatEmojiTabs = document.getElementById('chatEmojiTabs');
  const chatEmojiGridScroll = document.getElementById('chatEmojiGridScroll');

  let activeChatEmojiCategory = 'all';
  let chatEmojiSearchQuery = '';

  function renderChatEmojiPicker(category = 'all', searchQuery = '') {
    if (!chatEmojiGridScroll || !EMOJI_CATEGORIES) return;
    chatEmojiGridScroll.innerHTML = '';

    const query = (searchQuery || '').trim().toLowerCase();
    let total = 0;

    EMOJI_CATEGORIES.forEach((cat) => {
      if (category !== 'all' && cat.id !== category && !query) {
        return;
      }

      const filtered = cat.emojis.filter((item) => {
        if (!query) return true;
        return item.char.includes(query) || (item.keywords && item.keywords.toLowerCase().includes(query)) || cat.name.toLowerCase().includes(query);
      });

      if (filtered.length === 0) return;
      total += filtered.length;

      const group = document.createElement('div');
      group.className = 'reaction-group-section';

      const title = document.createElement('div');
      title.className = 'reaction-group-title';
      title.textContent = `${cat.icon} ${cat.name}`;
      group.appendChild(title);

      const grid = document.createElement('div');
      grid.className = 'reaction-grid-layout';

      filtered.forEach((emojiItem) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'reaction-item';
        btn.dataset.emoji = emojiItem.char;
        btn.title = emojiItem.char;
        btn.textContent = emojiItem.char;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (chatMessageInput) {
            chatMessageInput.value += emojiItem.char;
            chatMessageInput.focus();
          }
          sound.playPop();
          btn.style.transform = 'scale(1.4)';
          setTimeout(() => { btn.style.transform = ''; }, 180);
        });
        grid.appendChild(btn);
      });

      group.appendChild(grid);
      chatEmojiGridScroll.appendChild(group);
    });

    if (total === 0) {
      const empty = document.createElement('div');
      empty.className = 'reaction-no-results';
      empty.textContent = `No emojis found for "${query}"`;
      chatEmojiGridScroll.appendChild(empty);
    }
  }

  // Populate initial grid when ChatSpace is ready
  renderChatEmojiPicker('all', '');

  if (btnChatEmojiPicker && chatEmojiContainer) {
    btnChatEmojiPicker.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = chatEmojiContainer.classList.contains('open');
      if (!isOpen) {
        dismissAllPopovers();
        renderChatEmojiPicker(activeChatEmojiCategory, chatEmojiSearchQuery);
        chatEmojiContainer.classList.add('open');
        if (chatEmojiSearchInput) {
          setTimeout(() => chatEmojiSearchInput.focus(), 50);
        }
      } else {
        chatEmojiContainer.classList.remove('open');
      }
      sound.playClick();
    });
  }

  if (chatEmojiTabs) {
    chatEmojiTabs.querySelectorAll('.chat-emoji-tab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        e.stopPropagation();
        chatEmojiTabs.querySelectorAll('.chat-emoji-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        activeChatEmojiCategory = tab.dataset.cat || 'all';
        if (chatEmojiSearchInput) chatEmojiSearchInput.value = '';
        chatEmojiSearchQuery = '';
        renderChatEmojiPicker(activeChatEmojiCategory, '');
        if (chatEmojiGridScroll) chatEmojiGridScroll.scrollTop = 0;
        sound.playClick();
      });
    });
  }

  if (chatEmojiSearchInput) {
    chatEmojiSearchInput.addEventListener('input', (e) => {
      chatEmojiSearchQuery = e.target.value;
      renderChatEmojiPicker(activeChatEmojiCategory, chatEmojiSearchQuery);
    });
    chatEmojiSearchInput.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  // Dismiss Chat Emoji Popover on outside click
  window.addEventListener('click', (e) => {
    if (chatEmojiContainer && !e.target.closest('#chatEmojiContainer')) {
      chatEmojiContainer.classList.remove('open');
    }
  });

  // --- Voice Input (Speech-to-Text & Any-Language to English Translation) ---
  let speechRecognizer = null;
  let isListeningVoice = false;
  let desiredListeningVoice = false;
  let voiceOriginalPrefix = '';
  let accumulatedFinalText = '';

  async function translateToEnglish(text) {
    if (!text || !text.trim()) return text;
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text.trim())}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data[0])) {
          const translated = data[0].map(item => item[0]).filter(Boolean).join('');
          if (translated && translated.trim()) {
            return translated.trim();
          }
        }
      }
    } catch (err) {
      console.warn('Voice auto-translation error, using original transcript:', err);
    }
    return text.trim();
  }

  function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognizer = new SpeechRecognition();
    recognizer.continuous = true;
    recognizer.interimResults = true;
    recognizer.maxAlternatives = 1;
    recognizer.lang = navigator.language || 'en-US';

    recognizer.onstart = () => {
      isListeningVoice = true;
      if (btnVoiceChat) {
        btnVoiceChat.classList.add('recording');
        btnVoiceChat.title = 'Listening (Speak in any language)... Click to finish';
      }
      if (chatMessageInput) {
        chatMessageInput.placeholder = '🎙️ Listening... (Speak in any language → English)';
      }
      sound.playPop();
    };

    recognizer.onresult = async (event) => {
      if (!desiredListeningVoice) return;

      let interimTranscript = '';
      let newFinalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          newFinalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (newFinalTranscript) {
        const translatedPiece = await translateToEnglish(newFinalTranscript);
        if (!desiredListeningVoice) return;
        accumulatedFinalText += (accumulatedFinalText ? ' ' : '') + translatedPiece;
      }

      if (chatMessageInput && desiredListeningVoice) {
        const prefix = voiceOriginalPrefix ? voiceOriginalPrefix.trim() + ' ' : '';
        const currentSpoken = interimTranscript ? (accumulatedFinalText ? ' ' : '') + interimTranscript : '';
        chatMessageInput.value = prefix + accumulatedFinalText + currentSpoken;
      }
    };

    recognizer.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        desiredListeningVoice = false;
        stopVoiceRecognition(true);
        showToast('Microphone access denied. Please allow microphone in browser settings.', 'warning');
      } else if (event.error === 'network') {
        desiredListeningVoice = false;
        stopVoiceRecognition(true);
        showToast('Voice network error. Please check your connection.', 'warning');
      }
    };

    recognizer.onend = () => {
      isListeningVoice = false;
      // Auto-restart if user still wants voice active (like Google Chrome continuous voice input)
      if (desiredListeningVoice) {
        try {
          recognizer.start();
        } catch (err) {
          cleanupVoiceUI();
        }
      } else {
        cleanupVoiceUI();
      }
    };

    return recognizer;
  }

  function cleanupVoiceUI() {
    isListeningVoice = false;
    desiredListeningVoice = false;
    voiceOriginalPrefix = '';
    accumulatedFinalText = '';
    if (btnVoiceChat) {
      btnVoiceChat.classList.remove('recording');
      btnVoiceChat.title = 'Voice Input (Speech to Text)';
    }
    if (chatMessageInput) {
      chatMessageInput.placeholder = 'Type a message or use voice...';
    }
  }

  function startVoiceRecognition() {
    desiredListeningVoice = true;
    voiceOriginalPrefix = chatMessageInput ? chatMessageInput.value : '';
    accumulatedFinalText = '';

    if (!speechRecognizer) {
      speechRecognizer = initSpeechRecognition();
    }
    if (!speechRecognizer) {
      showToast('Voice input is not supported in this browser. Try Google Chrome or Edge.', 'warning');
      desiredListeningVoice = false;
      return;
    }

    try {
      speechRecognizer.start();
    } catch (err) {
      console.warn('Speech start error:', err);
    }
  }

  async function stopVoiceRecognition(skipInputRewrite = false) {
    desiredListeningVoice = false;
    isListeningVoice = false;
    const oldPrefix = voiceOriginalPrefix;
    voiceOriginalPrefix = '';
    accumulatedFinalText = '';

    if (speechRecognizer) {
      try {
        speechRecognizer.stop();
      } catch (err) {}
    }

    // Final translate pass on current input if there is any pending non-English speech and we are not clearing
    if (!skipInputRewrite && chatMessageInput && chatMessageInput.value) {
      const currentVal = chatMessageInput.value.trim();
      if (currentVal && currentVal !== oldPrefix.trim()) {
        const translatedFull = await translateToEnglish(currentVal);
        if (!desiredListeningVoice && chatMessageInput && chatMessageInput.value) {
          chatMessageInput.value = translatedFull;
        }
      }
    }
    cleanupVoiceUI();
  }

  if (btnVoiceChat) {
    btnVoiceChat.addEventListener('click', (e) => {
      e.preventDefault();
      if (isListeningVoice) {
        stopVoiceRecognition(false);
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

      // Stop voice recognition and prevent rewriting to input bar
      stopVoiceRecognition(true);

      socket.emit('chat:send', { text });
      chatMessageInput.value = '';
      chatMessageInput.focus();
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

    const isSelfOnline = socket && socket.connected && navigator.onLine;
    const isSelfPrimary = isCurrentUserPrimaryHost();
    const isSelfCoHost = isCurrentUserCoHost();
    const totalInRoom = state.collaborators.size + 1;

    // Single Profile & Room Members Hub Avatar in Top Nav
    const selfAv = document.createElement('div');
    selfAv.className = 'collaborator-avatar nav-single-profile-avatar';
    selfAv.id = 'navProfileAvatar';
    selfAv.style.setProperty('--c', state.user.color || '#FF6B4A');
    setAvatarElement(selfAv, state.user.avatar, (state.user.name || 'Y').charAt(0).toUpperCase());
    selfAv.title = `${state.user.name || state.user.username || 'You'} (You)${isSelfPrimary ? ' 👑 Primary Host' : (isSelfCoHost ? ' ⭐ Co-Host' : '')} · ${totalInRoom} in room — Click to view participants & roles`;

    // Host / Co-Host Crown / Star Badge
    if (isSelfPrimary) {
      const crown = document.createElement('span');
      crown.className = 'avatar-crown-badge';
      crown.textContent = '👑';
      crown.title = 'Primary Host';
      selfAv.appendChild(crown);
    } else if (isSelfCoHost) {
      const star = document.createElement('span');
      star.className = 'avatar-crown-badge';
      star.textContent = '⭐';
      star.title = 'Co-Host';
      selfAv.appendChild(star);
    }

    // Live status dot badge
    const selfStatus = document.createElement('span');
    selfStatus.className = `avatar-status-dot ${isSelfOnline ? 'online' : 'offline'}`;
    selfAv.appendChild(selfStatus);

    // Participant count pill badge when > 1 participant in room
    if (totalInRoom > 1) {
      const countBadge = document.createElement('span');
      countBadge.className = 'collaborator-count-pill';
      countBadge.textContent = `👥 ${totalInRoom}`;
      countBadge.title = `${totalInRoom} participants in room`;
      selfAv.appendChild(countBadge);
    }

    // Instant Name Tooltip on Cursor Hover
    const selfTooltip = document.createElement('div');
    selfTooltip.className = 'avatar-name-tooltip';
    selfTooltip.innerHTML = `${isSelfPrimary ? '👑 ' : (isSelfCoHost ? '⭐ ' : '')}<span>${state.user.name || state.user.username || 'You'} (${totalInRoom} in room)</span>`;
    selfAv.appendChild(selfTooltip);

    // Click opens full participants modal (Room Members & Roles Hub)
    selfAv.addEventListener('click', (e) => {
      e.stopPropagation();
      openManageHostsModal();
    });

    collaboratorStack.appendChild(selfAv);

    if (chatOnlineStatus) {
      chatOnlineStatus.textContent = isSelfOnline ? `🟢 ${totalInRoom} online in room` : '🔴 Disconnected';
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
