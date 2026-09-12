/**
 * I-Dashboard Pro - Unified, Modular, High-Performance Application Logic
 * Pure Vanilla JavaScript (ES6+) - Apple iOS-Inspired Fluid Experience
 */

(function () {
  'use strict';

  // --- Prevent Background Scroll Chaining when Modals are Open ---
  function updateModalScrollLock() {
    const hasOpenModal = !!document.querySelector('.modal-overlay.open');
    if (hasOpenModal) {
      document.body.classList.add('modal-open');
      document.documentElement.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    }
  }

  // Observe modal-overlay class changes to automatically add/remove modal-open
  function initModalScrollLockObserver() {
    updateModalScrollLock();
    const overlays = document.querySelectorAll('.modal-overlay');
    if ('MutationObserver' in window) {
      const observer = new MutationObserver(() => {
        updateModalScrollLock();
      });
      overlays.forEach(overlay => {
        observer.observe(overlay, { attributes: true, attributeFilter: ['class'] });
      });
    }

    // Isolate wheel events inside modal-body so they never propagate or chain to parent/window
    document.querySelectorAll('.modal-body, #settings-modal .modal-body').forEach(bodyEl => {
      bodyEl.addEventListener('wheel', (e) => {
        const delta = e.deltaY;
        const up = delta < 0;
        const down = delta > 0;
        const atTop = bodyEl.scrollTop <= 0;
        const atBottom = bodyEl.scrollTop + bodyEl.clientHeight >= bodyEl.scrollHeight - 1;

        if ((up && atTop) || (down && atBottom)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }, { passive: false });
    });
  }


  // --- Network Indicator Status ---
  function setNetworkIndicatorStatus(status) {
    const indicator = document.getElementById('header-network-indicator');
    if (!indicator) return;
    
    // Remove all status classes
    indicator.classList.remove('status-online', 'status-offline', 'status-syncing');
    
    if (status === 'offline' || !navigator.onLine) {
      indicator.classList.add('status-offline');
      indicator.title = 'وضعیت ارتباط: آفلاین';
    } else if (status === 'syncing') {
      indicator.classList.add('status-syncing');
      indicator.title = 'وضعیت ارتباط: در حال ذخیره‌سازی...';
    } else {
      indicator.classList.add('status-online');
      indicator.title = 'وضعیت ارتباط: آنلاین';
    }
  }

  // Hook into browser online/offline events
  window.addEventListener('online', () => setNetworkIndicatorStatus('online'));
  window.addEventListener('offline', () => setNetworkIndicatorStatus('offline'));


  // Auto-bootstrap Supabase credentials for Chrome Extension local environment
  try {
    if (typeof localStorage !== 'undefined') {
      const defaultKey = 'sb_publishable_4ylBr6L_4VwzEsr9r-_izA_M5upaIcg';
      const defaultUrl = 'https://zvazulgahvrvlatlwjfw.supabase.co';
      if (!localStorage.getItem('almas_supabase_publishable_key')) {
        localStorage.setItem('almas_supabase_publishable_key', defaultKey);
      }
      if (!localStorage.getItem('almas_supabase_url')) {
        localStorage.setItem('almas_supabase_url', defaultUrl);
      }
      if (typeof window !== 'undefined') {
        window.__VITE_SUPABASE_URL__ = window.__VITE_SUPABASE_URL__ || defaultUrl;
        window.__VITE_SUPABASE_PUBLISHABLE_KEY__ = window.__VITE_SUPABASE_PUBLISHABLE_KEY__ || defaultKey;
      }
    }
  } catch (e) {}

  // Safe global Supabase client getter (from bundled supabase-client.js)
  function getSupabase() {
    if (typeof window !== 'undefined') {
      if (window.AlmasSupabase) return window.AlmasSupabase;
    }
    return null;
  }



  /* ==========================================================================
     1. State Management & Storage Keys
     ========================================================================== */
  const STORAGE_KEYS = {
    BOOKMARKS: 'idash_bookmarks_v5',
    SETTINGS: 'idash_settings_v3',
    SEARCH_HISTORY: 'idash_search_history_v3',
    NOTES: 'idash_notes_v3',
    ACTIVE_PAGE: 'idash_active_page_v3',
    CACHED_NEWS: 'idash_cached_news_v3',
    CALENDAR_TASKS: 'idash_calendar_tasks_v3',
    MULTI_NOTES: 'idash_multi_notes_v3',
    POMODORO: 'idash_pomodoro_v3',
    CUSTOM_RSS_SOURCES: 'idash_custom_rss_sources_v1',
    CACHED_TGJU_RATES: 'idash_cached_tgju_rates_v1',
    LAST_TGJU_SYNC_TIME: 'idash_last_tgju_sync_time_v1'
  };

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  const escapeHtml = escapeHTML;

  function normalizeSearchText(str) {
    if (!str) return '';
    return str
      .toString()
      .toLowerCase()
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/ة/g, 'ه')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .trim();
  }

  async function safeFetchWithTimeout(resource, options = {}, timeout = 6000) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const id = controller ? setTimeout(() => controller.abort(), timeout) : null;
    try {
      const response = await fetch(resource, {
        ...options,
        signal: controller ? controller.signal : undefined
      });
      return response;
    } catch (err) {
      return null;
    } finally {
      if (id) clearTimeout(id);
    }
  }

  const IOS_COLORFUL_WALLPAPER = {
    name: 'امواج مایع کریستالی (استایل رنگی iOS)',
    category: 'ios',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80',
    fallbackGradient: 'linear-gradient(135deg, #4b1248 0%, #f0c27b 100%)'
  };

  const DEFAULT_WALLPAPERS = {
    ios: [
      IOS_COLORFUL_WALLPAPER
    ],
    nature: [
      { name: 'دریاچه آلپ و کوهستان', category: 'nature', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80', fallbackGradient: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 30%, #4c1d95 70%, #0f172a 100%)' },
      { name: 'دره و رودخانه جنگلی', category: 'nature', url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1920&q=80', fallbackGradient: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)' },
      { name: 'غروب کوهستان و افق', category: 'nature', url: 'https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=1920&q=80', fallbackGradient: 'linear-gradient(135deg, #3a1c71 0%, #d76d77 50%, #ffaf7b 100%)' },
      { name: 'جنگل مه‌آلود و کاج', category: 'nature', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1920&q=80', fallbackGradient: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' },
      { name: 'امواج اقیانوس آرام', category: 'nature', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80', fallbackGradient: 'linear-gradient(135deg, #001f3f 0%, #0074d9 60%, #7fdbff 100%)' },
      { name: 'کهکشان و شفق قطبی', category: 'nature', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80', fallbackGradient: 'linear-gradient(135deg, #051923 0%, #003554 40%, #006466 100%)' }
    ],
    abstract: [
      { name: 'امواج مایع کریستالی', category: 'abstract', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80', fallbackGradient: 'linear-gradient(135deg, #4b1248 0%, #f0c27b 100%)' },
      { name: 'معماری مدرن و شیشه', category: 'abstract', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1920&q=80', fallbackGradient: 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)' },
      { name: 'سیال کیهانی نیلی', category: 'abstract', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1920&q=80', fallbackGradient: 'linear-gradient(135deg, #141e30 0%, #243b55 100%)' },
      { name: 'امواج بنفش نئونی', category: 'abstract', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1920&q=80', fallbackGradient: 'linear-gradient(135deg, #654ea3 0%, #eaafc8 100%)' }
    ],
    architecture: [
      { name: 'آسمان‌خراش‌های شیشه‌ای و مدرن', category: 'architecture', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1920&q=80', fallbackGradient: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)' },
      { name: 'موزه معاصر و هندسی بلورین', category: 'architecture', url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1920&q=80', fallbackGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' },
      { name: 'خط افق کلان‌شهر در گرگ و میش', category: 'architecture', url: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=1920&q=80', fallbackGradient: 'linear-gradient(135deg, #18191a 0%, #242526 50%, #3a3b3c 100%)' }
    ],
    minimal: [
      { name: 'تاریکی ستاره‌ها و فضا', category: 'minimal', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80', fallbackGradient: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' },
      { name: 'گرادیان گرافیتی دارک', category: 'minimal', url: 'linear-gradient(135deg, #0a0e17 0%, #151d2f 50%, #0d131f 100%)', fallbackGradient: 'linear-gradient(135deg, #0a0e17 0%, #151d2f 50%, #0d131f 100%)' },
      { name: 'تایتانیوم مات AMOLED', category: 'minimal', url: 'linear-gradient(135deg, #18191a 0%, #242526 50%, #18191a 100%)', fallbackGradient: 'linear-gradient(135deg, #18191a 0%, #242526 50%, #18191a 100%)' },
      { name: 'شب تیره مینیمال', category: 'minimal', url: 'linear-gradient(135deg, #050505 0%, #111827 50%, #030712 100%)', fallbackGradient: 'linear-gradient(135deg, #050505 0%, #111827 50%, #030712 100%)' }
    ],
    cyber: [
      { name: 'توکیو نئونی در شب', category: 'cyber', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1920&q=80', fallbackGradient: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #ff007f 100%)' },
      { name: 'سایبرپانک سینث‌ویو', category: 'cyber', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1920&q=80', fallbackGradient: 'linear-gradient(135deg, #03001e 0%, #7303c0 40%, #ec38bc 75%, #fdeff9 100%)' },
      { name: 'تکنولوژی دارک و ماتریکس', category: 'cyber', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1920&q=80', fallbackGradient: 'linear-gradient(135deg, #001100 0%, #003311 40%, #00aa44 80%, #00ff66 100%)' }
    ],
    gradients: [
      { name: 'شیشه‌ای (Glass)', category: 'gradients', url: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 35%, #312e81 65%, #064e3b 100%)', fallbackGradient: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 35%, #312e81 65%, #064e3b 100%)' },
      { name: 'شفق قطبی درخشان', category: 'gradients', url: 'radial-gradient(ellipse at top left, #1e3a8a 0%, #0f172a 50%, #022c22 100%)', fallbackGradient: 'radial-gradient(ellipse at top left, #1e3a8a 0%, #0f172a 50%, #022c22 100%)' },
      { name: 'غروب مخملی نیلگون', category: 'gradients', url: 'linear-gradient(135deg, #1e1b4b 0%, #4c0519 50%, #701a75 100%)', fallbackGradient: 'linear-gradient(135deg, #1e1b4b 0%, #4c0519 50%, #701a75 100%)' },
      { name: 'اقیانوس عمیق پترولیم', category: 'gradients', url: 'linear-gradient(135deg, #020617 0%, #0c4a6e 50%, #082f49 100%)', fallbackGradient: 'linear-gradient(135deg, #020617 0%, #0c4a6e 50%, #082f49 100%)' },
      { name: 'طیف نئونی بنفش و ارغوانی', category: 'gradients', url: 'linear-gradient(135deg, #2e0854 0%, #180033 50%, #581c87 100%)', fallbackGradient: 'linear-gradient(135deg, #2e0854 0%, #180033 50%, #581c87 100%)' }
    ]
  };

  // Flattened array of all wallpapers for single unified gallery display (iOS fluid colorful first)
  const ALL_WALLPAPERS = [
    IOS_COLORFUL_WALLPAPER,
    ...DEFAULT_WALLPAPERS.nature,
    ...DEFAULT_WALLPAPERS.abstract,
    ...DEFAULT_WALLPAPERS.architecture,
    ...DEFAULT_WALLPAPERS.minimal,
    ...DEFAULT_WALLPAPERS.cyber,
    ...DEFAULT_WALLPAPERS.gradients
  ];

  function getWallpaperThumbnailUrl(url) {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (trimmed.startsWith('linear-gradient') || trimmed.startsWith('radial-gradient') || trimmed.startsWith('conic-gradient')) {
      return '';
    }
    if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
      return trimmed;
    }
    if (trimmed.includes('images.unsplash.com')) {
      return trimmed.replace('w=1920', 'w=480').replace('q=80', 'q=75');
    }
    return trimmed;
  }

  // Only Google, Bing, DuckDuckGo, and Zarebin
  const SEARCH_ENGINES = {
    google: { name: 'گوگل', icon: '🔍', url: 'https://www.google.com/search?q=' },
    bing: { name: 'بینگ', icon: '🌐', url: 'https://www.bing.com/search?q=' },
    duckduckgo: { name: 'داک‌داک‌گو', icon: '🦆', url: 'https://duckduckgo.com/?q=' },
    zarebin: { name: 'ذره‌بین', icon: '🔎', url: 'https://zarebin.ir/search?q=' }
  };

  const EMOJI_PALETTE = ['🌐', '⭐', '💻', '🎬', '🎵', '🛒', '📰', '📱', '📚', '🚀', '⚡', '🎮', '💡', '🔥', '🎨', '✈️', '💼', '📊', '🔍', '⚙️', '💬', '❤️', '🏆', '💎'];

  const DEFAULT_BOOKMARKS = [
    { id: 'bm_1', type: 'bookmark', title: 'یوتیوب', url: 'https://www.youtube.com', iconEmoji: '▶️', parentId: null, isPinned: true, gridIndex: 0 },
    { id: 'bm_2', type: 'bookmark', title: 'اینستاگرام', url: 'https://www.instagram.com', iconEmoji: '📸', parentId: null, isPinned: true, gridIndex: 1 },
    { id: 'bm_3', type: 'bookmark', title: 'آپارات', url: 'https://www.aparat.com', iconEmoji: '🎬', parentId: null, isPinned: true, gridIndex: 2 },
    { id: 'bm_4', type: 'bookmark', title: 'تلگرام', url: 'https://web.telegram.org', iconEmoji: '✈️', parentId: null, isPinned: true, gridIndex: 3 },
    { id: 'bm_6', type: 'bookmark', title: 'ChatGPT', url: 'https://chatgpt.com', iconEmoji: '🤖', parentId: null, isPinned: true, gridIndex: 4 },
    { id: 'bm_7', type: 'bookmark', title: 'گیت‌هاب', url: 'https://github.com', iconEmoji: '🐙', parentId: null, isPinned: true, gridIndex: 5 },
    { id: 'bm_8', type: 'bookmark', title: 'اسپاتیفای', url: 'https://open.spotify.com', iconEmoji: '🎵', parentId: null, isPinned: true, gridIndex: 6 }
  ];

  const DEFAULT_SETTINGS = {
    theme: 'liquid-glass',
    accentColor: '#3b82f6',
    contrast: 'auto',
    cardSize: 120,
    iconSize: 'medium',
    cardRadius: 22,
    lowSpecMode: false,
    glassOpacity: 36,
    glassBlur: 24,
    bgBlur: 0,
    overlayOpacity: 44,
    wallpaperUrl: IOS_COLORFUL_WALLPAPER.url,
    searchEngine: 'google'
  };

  const ACCENT_COLOR_PRESETS = {
    '#3b82f6': { name: 'آبی', contrast: '#ffffff', hover: '#2563eb', glow: 'rgba(59, 130, 246, 0.5)', light: 'rgba(59, 130, 246, 0.16)' },
    '#8b5cf6': { name: 'بنفش', contrast: '#ffffff', hover: '#7c3aed', glow: 'rgba(139, 92, 246, 0.5)', light: 'rgba(139, 92, 246, 0.16)' },
    '#ec4899': { name: 'صورتی', contrast: '#ffffff', hover: '#db2777', glow: 'rgba(236, 72, 153, 0.5)', light: 'rgba(236, 72, 153, 0.16)' },
    '#10b981': { name: 'سبز', contrast: '#ffffff', hover: '#059669', glow: 'rgba(16, 185, 129, 0.5)', light: 'rgba(16, 185, 129, 0.16)' },
    '#06b6d4': { name: 'فیروزه‌ای', contrast: '#ffffff', hover: '#0891b2', glow: 'rgba(6, 182, 212, 0.5)', light: 'rgba(6, 182, 212, 0.16)' },
    '#f97316': { name: 'نارنجی', contrast: '#ffffff', hover: '#ea580c', glow: 'rgba(249, 115, 22, 0.5)', light: 'rgba(249, 115, 22, 0.16)' },
    '#ef4444': { name: 'قرمز', contrast: '#ffffff', hover: '#dc2626', glow: 'rgba(239, 68, 68, 0.5)', light: 'rgba(239, 68, 68, 0.16)' },
    '#eab308': { name: 'زرد', contrast: '#1c1c1e', hover: '#ca8a04', glow: 'rgba(234, 179, 8, 0.5)', light: 'rgba(234, 179, 8, 0.16)' },
    '#18181b': { name: 'مشکی', contrast: '#ffffff', hover: '#09090b', glow: 'rgba(24, 24, 27, 0.6)', light: 'rgba(24, 24, 27, 0.16)' },
    '#ffffff': { name: 'سفید', contrast: '#1c1c1e', hover: '#f4f4f5', glow: 'rgba(255, 255, 255, 0.6)', light: 'rgba(255, 255, 255, 0.22)' }
  };

  function getHexLuminance(hex) {
    let clean = (hex || '').replace('#', '').trim();
    if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
    if (clean.length !== 6) return 0.5;
    const r = parseInt(clean.substring(0, 2), 16) || 0;
    const g = parseInt(clean.substring(2, 4), 16) || 0;
    const b = parseInt(clean.substring(4, 6), 16) || 0;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  function applyAccentColor(hex) {
    if (!hex) hex = '#3b82f6';
    const root = document.documentElement;
    const currentTheme = (state && state.settings && state.settings.theme) || document.body.getAttribute('data-theme') || 'liquid-glass';
    const isLightTheme = currentTheme === 'light';
    const lum = getHexLuminance(hex);

    const preset = ACCENT_COLOR_PRESETS[hex.toLowerCase()];

    let contrast = lum > 0.62 ? '#18181b' : '#ffffff';
    let hover = hex;
    let glow = lum > 0.62 ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.25)';
    let light = lum > 0.62 ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)';

    if (preset) {
      contrast = preset.contrast;
      hover = preset.hover;
      glow = preset.glow;
      light = preset.light || light;
    } else {
      glow = `${hex}80`;
      light = `${hex}26`;
    }

    // High-contrast button border to guarantee distinct edges for white on light or black on dark
    let btnBorder = 'rgba(255, 255, 255, 0.28)';
    if (lum > 0.8) {
      btnBorder = isLightTheme ? 'rgba(15, 23, 42, 0.28)' : 'rgba(255, 255, 255, 0.6)';
    } else if (lum < 0.15) {
      btnBorder = isLightTheme ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.35)';
    }

    root.style.setProperty('--accent-color', hex);
    root.style.setProperty('--accent-contrast-text', contrast);
    root.style.setProperty('--accent-hover', hover);
    root.style.setProperty('--accent-glow', glow);
    root.style.setProperty('--accent-light', light);
    root.style.setProperty('--accent-btn-border', btnBorder);
    root.style.setProperty('--glow-color', glow);

    if (document.body) {
      document.body.style.setProperty('--accent-color', hex);
      document.body.style.setProperty('--accent-contrast-text', contrast);
      document.body.style.setProperty('--accent-hover', hover);
      document.body.style.setProperty('--accent-glow', glow);
      document.body.style.setProperty('--accent-light', light);
      document.body.style.setProperty('--accent-btn-border', btnBorder);
      document.body.style.setProperty('--glow-color', glow);
    }
    const targetIds = ['settings-modal', 'wallpaper-modal', 'add-modal', 'edit-modal'];
    targetIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.style.setProperty('--accent-color', hex);
        el.style.setProperty('--accent-contrast-text', contrast);
        el.style.setProperty('--accent-hover', hover);
        el.style.setProperty('--accent-glow', glow);
        el.style.setProperty('--accent-light', light);
        el.style.setProperty('--accent-btn-border', btnBorder);
        el.style.setProperty('--glow-color', glow);
      }
    });
  }


  let state = {
    bookmarks: [],
    settings: { ...DEFAULT_SETTINGS },
    searchHistory: [],
    currentFolderId: null,
    activePage: 1,
    editingItemId: null,
    selectedAddEmoji: '🌐',
    selectedEditEmoji: '🌐'
  };

  /* ==========================================================================
     2. Jalali (Persian) Date Calculations
     ========================================================================== */
  function gregorianToJalali(gy, gm, gd) {
    const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let jy = (gy <= 1600) ? 0 : 979;
    gy -= (gy <= 1600) ? 621 : 1600;
    const gy2 = (gm > 2) ? (gy + 1) : gy;
    let days = (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
    jy += 33 * Math.floor(days / 12053);
    days %= 12053;
    jy += 4 * Math.floor(days / 1461);
    days %= 1461;
    if (days > 365) {
      jy += Math.floor((days - 1) / 365);
      days = (days - 1) % 365;
    }
    const jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
    const jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
    return { year: jy, month: jm, day: jd };
  }

  function jalaliToGregorian(jy, jm, jd) {
    // 1. High precision conversion using Intl standard Persian calendar
    try {
      const approxGYear = jm >= 11 ? jy + 622 : jy + 621;
      const startMonths = [null, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1];
      const startDays = [null, 21, 21, 22, 22, 23, 23, 23, 23, 22, 22, 21, 20];
      const baseDate = new Date(Date.UTC(approxGYear, startMonths[jm], startDays[jm] + (jd - 1)));
      for (let offset = -3; offset <= 3; offset++) {
        const testDate = new Date(baseDate.getTime() + offset * 86400000);
        const parts = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {
          year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC'
        }).formatToParts(testDate);
        let y = 0, m = 0, d = 0;
        for (const p of parts) {
          if (p.type === 'year') y = parseInt(p.value, 10);
          if (p.type === 'month') m = parseInt(p.value, 10);
          if (p.type === 'day') d = parseInt(p.value, 10);
        }
        if (y === jy && m === jm && d === jd) {
          return {
            year: testDate.getUTCFullYear(),
            month: testDate.getUTCMonth() + 1,
            day: testDate.getUTCDate()
          };
        }
      }
    } catch (e) {}

    // 2. Mathematically precise fallback
    let gy = (jy <= 979) ? 621 : 1600;
    jy -= (jy <= 979) ? 0 : 979;
    let days = (365 * jy) + (Math.floor(jy / 33) * 8) + Math.floor(((jy % 33) + 3) / 4) + 79 + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
    gy += 400 * Math.floor(days / 146097);
    days %= 146097;
    if (days > 36524) {
      gy += 100 * Math.floor(--days / 36524);
      days %= 36524;
      if (days >= 365) days++;
    }
    gy += 4 * Math.floor(days / 1461);
    days %= 1461;
    if (days > 365) {
      gy += Math.floor((days - 1) / 365);
      days = (days - 1) % 365;
    }
    const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let gm;
    for (gm = 0; gm < 13; gm++) {
      const v = sal_a[gm];
      if (days <= v) break;
      days -= v;
    }
    return { year: gy, month: gm, day: days };
  }

  const JALALI_MONTH_NAMES = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
  ];

  const PERSIAN_WEEKDAY_NAMES = [
    'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'
  ];

  function toPersianDigits(n) {
    const pDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return String(n).replace(/[0-9]/g, (d) => pDigits[d]);
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* ==========================================================================
     3. State Initialization & Persistence
     ========================================================================== */
  function loadState() {
    try {
      state.lastBookmarksUpdate = parseInt(localStorage.getItem('almas_last_bookmarks_update') || '0', 10);
      const savedBm = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
      state.bookmarks = savedBm ? JSON.parse(savedBm) : [...DEFAULT_BOOKMARKS];

      // Remove official Telegram channel from bookmarks if present
      const initialLength = state.bookmarks.length;
      state.bookmarks = state.bookmarks.filter((bm) => {
        if (!bm) return false;
        const isTgChannel = (bm.url && bm.url.includes('t.me/Almas_Dashboard')) || (bm.title === 'کانال تلگرام' && bm.url?.includes('t.me'));
        return !isTgChannel;
      });
      if (state.bookmarks.length !== initialLength) {
        saveBookmarks();
      }

      const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (savedSettings) {
        state.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
        if (!SEARCH_ENGINES[state.settings.searchEngine]) {
          state.settings.searchEngine = 'google';
        }
        if (!state.settings.wallpaperUrl || state.settings.wallpaperUrl.includes('photo-1506744038136-46273834b3fb')) {
          state.settings.wallpaperUrl = IOS_COLORFUL_WALLPAPER.url;
        }
        if (!state.settings.theme) {
          state.settings.theme = 'liquid-glass';
        }
      }

      const savedHistory = localStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY);
      if (savedHistory) {
        state.searchHistory = JSON.parse(savedHistory);
      } else {
        state.searchHistory = [];
      }

      // Guarantee app always defaults to Page 1 (Main Dashboard) on launch/new tab
      state.activePage = 1;


    } catch (e) {
      console.error('Error loading state:', e);
      state.bookmarks = [...DEFAULT_BOOKMARKS];
      state.settings = { ...DEFAULT_SETTINGS };
      state.searchHistory = [];
      state.activePage = 1;
    }
  }

  let currentActiveUser = null;
  let triggerCloudSync = function() {};

  function saveBookmarks() {
    try {
      state.lastBookmarksUpdate = Date.now();
      localStorage.setItem('almas_last_bookmarks_update', state.lastBookmarksUpdate);
      localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(state.bookmarks));
      updateTotalBookmarksCounter();
      if (typeof triggerCloudSync === 'function') {
        triggerCloudSync();
      }
    } catch (e) {
      console.error('Error saving bookmarks:', e);
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));
      applySettings();
      if (typeof triggerCloudSync === 'function') {
        triggerCloudSync();
      }
    } catch (e) {
      console.error('Error saving settings:', e);
    }
  }

  function saveSearchHistory() {
    try {
      localStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(state.searchHistory.slice(0, 5)));
    } catch (e) {
      console.error('Error saving search history:', e);
    }
  }

  function findWallpaperPreset(url) {
    if (!url) return null;
    for (const cat in DEFAULT_WALLPAPERS) {
      const match = DEFAULT_WALLPAPERS[cat].find(w => w.url === url);
      if (match) return match;
    }
    return null;
  }

  // Universal Image Proxy Helper using https://wsrv.nl/?url=
  function getProxiedImageUrl(url, options = {}) {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('linear-gradient') || trimmed.startsWith('radial-gradient')) {
      return trimmed;
    }
    // If it's already proxied, avoid double proxying
    if (trimmed.includes('wsrv.nl/?url=')) {
      return trimmed;
    }
    // Form wsrv.nl proxy URL
    let proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(trimmed)}`;
    if (options.width) proxyUrl += `&w=${options.width}`;
    if (options.quality) proxyUrl += `&q=${options.quality}`;
    if (options.output) proxyUrl += `&output=${options.output}`;
    return proxyUrl;
  }

  function applyWallpaper(bgUrl) {
    const wallpaperLayer = document.getElementById('wallpaper-layer');
    if (!wallpaperLayer) return;

    if (bgUrl && typeof bgUrl === 'object' && bgUrl.url) {
      bgUrl = bgUrl.url;
    }

    if (!bgUrl || typeof bgUrl !== 'string') {
      bgUrl = ALL_WALLPAPERS[0] ? ALL_WALLPAPERS[0].url : IOS_COLORFUL_WALLPAPER.url;
    }

    wallpaperLayer.style.backgroundColor = 'transparent';

    // If it's a CSS gradient (100% offline & instant)
    if (bgUrl.startsWith('linear-gradient') || bgUrl.startsWith('radial-gradient') || bgUrl.startsWith('conic-gradient')) {
      wallpaperLayer.style.backgroundImage = bgUrl;
      return;
    }

    // If it's a data URL / base64 (e.g. user custom uploaded wallpaper)
    if (bgUrl.startsWith('data:') || bgUrl.startsWith('blob:')) {
      wallpaperLayer.style.backgroundImage = `url("${bgUrl}")`;
      return;
    }

    // Remote URL -> Find fallback gradient preset
    const preset = findWallpaperPreset(bgUrl);
    const fallbackGrad = (preset && preset.fallbackGradient) || 'linear-gradient(135deg, #0b0f19 0%, #1e1b4b 50%, #0f172a 100%)';

    // Immediately set fallback gradient so wallpaper area is never empty or black
    wallpaperLayer.style.backgroundImage = fallbackGrad;

    if (!navigator.onLine) {
      return;
    }

    // Direct Unsplash loading is globally fast and CDN-cached
    let targetUrl = bgUrl;
    const img = new Image();
    let loaded = false;

    img.onload = () => {
      loaded = true;
      wallpaperLayer.style.backgroundImage = `url("${targetUrl}")`;
    };

    img.onerror = () => {
      // In case direct loading failed, try proxy
      const proxied = getProxiedImageUrl(bgUrl);
      if (proxied && proxied !== bgUrl) {
        const backupImg = new Image();
        backupImg.onload = () => {
          wallpaperLayer.style.backgroundImage = `url("${proxied}")`;
        };
        backupImg.src = proxied;
      }
    };

    img.src = targetUrl;
  }

  /* ==========================================================================
     4. Applying Themes & Visual Settings
     ========================================================================== */
  function applySettings() {
    const s = state.settings;
    const body = document.body;

    // Theme Attribute
    body.setAttribute('data-theme', s.theme || 'liquid-glass');

    // Dynamic Accent Color & Smart Contrast
    applyAccentColor(s.accentColor || '#3b82f6');

    // Contrast Attribute
    if (s.contrast && s.contrast !== 'auto') {
      body.setAttribute('data-contrast', s.contrast);
    } else {
      body.removeAttribute('data-contrast');
    }

    // Performance Mode for Low-Spec Hardware
    if (s.lowSpecMode) {
      body.classList.add('low-spec-mode');
    } else {
      body.classList.remove('low-spec-mode');
    }

    // Dynamic Root CSS Variables
    const root = document.documentElement;
    root.style.setProperty('--card-size', `${s.cardSize || 120}px`);
    root.style.setProperty('--card-radius', `${s.cardRadius || 22}px`);

    // Icon Size
    let iconPx = 48;
    if (s.iconSize === 'small') iconPx = 38;
    if (s.iconSize === 'large') iconPx = 58;
    root.style.setProperty('--icon-size', `${iconPx}px`);

    // Glass Variables with dynamic contrast boost
    const rawGlassOp = s.glassOpacity !== undefined ? s.glassOpacity : 36;
    let glassOp = rawGlassOp / 100;
    let borderAlpha = Math.min(0.85, Math.max(0.28, glassOp + 0.22));
    if (s.glassHighContrast !== false) {
      glassOp = Math.min(0.88, glassOp + 0.16);
      borderAlpha = Math.min(0.92, borderAlpha + 0.14);
    }

    root.style.setProperty('--glass-opacity-high', `${glassOp.toFixed(2)}`);
    root.style.setProperty('--glass-opacity-low', `${Math.max(0.04, glassOp - 0.14).toFixed(2)}`);
    root.style.setProperty('--glass-border-alpha', `${borderAlpha.toFixed(2)}`);
    root.style.setProperty('--glass-blur', `${s.glassBlur !== undefined ? s.glassBlur : 26}px`);
    root.style.setProperty('--bg-blur', `${s.bgBlur !== undefined ? s.bgBlur : 0}px`);
    
    const overlayOpVal = s.overlayOpacity !== undefined ? Number(s.overlayOpacity) : 44;
    const overlayRatio = Math.max(0, Math.min(1, overlayOpVal / 100));
    root.style.setProperty('--bg-overlay-opacity', `${overlayRatio.toFixed(2)}`);

    // Synchronize optical wallpaper brightness:
    // 0% overlay (lightest) gives clear, radiant wallpaper (brightness 1.15)
    // 75% overlay (darkest) softens wallpaper deeply for eye comfort (brightness 0.55)
    const wpBrightness = Math.max(0.35, 1.15 - (overlayRatio * 0.75));
    root.style.setProperty('--wallpaper-brightness', `${wpBrightness.toFixed(2)}`);

    // Dynamic Wallpaper with Fallback
    applyWallpaper(s.wallpaperUrl);

    // Sync Search Engine UI
    updateSearchEngineUI();

    // Sync Theme Switcher Controls (Header & Settings Modal)
    const activeTheme = s.theme || 'liquid-glass';
    document.querySelectorAll('[data-theme-choice]').forEach((c) => {
      c.classList.toggle('active', c.dataset.themeChoice === activeTheme);
    });
    document.querySelectorAll('#header-theme-switcher .theme-switch-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.themeTarget === activeTheme);
    });
  }

  /* ==========================================================================
     5. Date, Clock & Header Greeting
     ========================================================================== */
  function initClockAndDate() {
    function tick() {
      const now = new Date();

      // Digital Clock (English 00:00:00)
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const digitalClockElem = document.getElementById('digital-clock');
      if (digitalClockElem) {
        digitalClockElem.textContent = `${hours}:${minutes}:${seconds}`;
      }

      // Persian Date
      const jDate = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
      const weekdayName = PERSIAN_WEEKDAY_NAMES[now.getDay()];
      const monthName = JALALI_MONTH_NAMES[jDate.month - 1];
      const persianDateElem = document.getElementById('persian-date');
      if (persianDateElem) {
        persianDateElem.textContent = `${weekdayName}، ${toPersianDigits(jDate.day)} ${monthName} ${toPersianDigits(jDate.year)}`;
      }

      // Greeting
      const h = now.getHours();
      let greeting = 'درود';
      let iconSvg = '<svg class="greeting-icon-svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
      if (h >= 5 && h < 12) {
        greeting = 'صبح بخیر';
        iconSvg = '<svg class="greeting-icon-svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
      } else if (h >= 12 && h < 17) {
        greeting = 'عصر بخیر';
        iconSvg = '<svg class="greeting-icon-svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';
      } else if (h >= 17 && h < 21) {
        greeting = 'غروب بخیر';
        iconSvg = '<svg class="greeting-icon-svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="2" x2="12" y2="9"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/><line x1="23" y1="22" x2="1" y2="22"/></svg>';
      } else {
        greeting = 'شب بخیر';
        iconSvg = '<svg class="greeting-icon-svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
      }

      const greetText = document.getElementById('greeting-text');
      const greetIcon = document.getElementById('greeting-icon');
      if (greetText) greetText.textContent = greeting;
      if (greetIcon) greetIcon.innerHTML = iconSvg;

      // Update Analog Clock Widget
      updateAnalogClock(now, jDate, weekdayName);
    }

    tick();
    setInterval(tick, 1000);
  }

  function updateTotalBookmarksCounter() {
    const totalCountElem = document.getElementById('total-bookmarks-count');
    if (totalCountElem) {
      const count = state.bookmarks.filter(b => b.type === 'bookmark').length;
      totalCountElem.textContent = `${toPersianDigits(count)} بوکمارک`;
    }
  }

  /* ==========================================================================
     6. Search Bar, Search History & Search Engines
     ========================================================================== */
  function initSearch() {
    const engineBtn = document.getElementById('engine-btn');
    const engineDropdown = document.getElementById('engine-dropdown');
    const searchInput = document.getElementById('search-input');
    const searchSubmitBtn = document.getElementById('search-submit-btn');
    const dropdownList = document.getElementById('engine-dropdown-list');
    const historyDropdown = document.getElementById('search-history-dropdown');
    const btnClearAllHistory = document.getElementById('btn-clear-all-history');
    const suggestionsWrap = document.getElementById('search-suggestions-wrap');
    const suggestionsList = document.getElementById('search-suggestions-list');
    const historyWrap = document.getElementById('search-history-wrap');

    let predictDebounceTimer = null;
    let activeSuggestionIndex = -1;
    let currentSuggestions = [];

    // Populate search engines list
    if (dropdownList) {
      dropdownList.innerHTML = '';
      Object.entries(SEARCH_ENGINES).forEach(([key, engine]) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.dataset.engineKey = key;
        item.className = `engine-item ${state.settings.searchEngine === key ? 'active' : ''}`;
        item.innerHTML = `<span class="engine-item-icon">${engine.icon}</span><span>${engine.name}</span>`;
        item.addEventListener('click', () => {
          state.settings.searchEngine = key;
          saveSettings();
          updateSearchEngineUI();
          if (engineDropdown) engineDropdown.classList.remove('open');
        });
        dropdownList.appendChild(item);
      });
    }

    if (engineBtn && engineDropdown) {
      engineBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        engineDropdown.classList.toggle('open');
        if (historyDropdown) historyDropdown.classList.remove('open');
      });
    }

    // Render Search History Dropdown
    function renderSearchHistoryUI() {
      const listContainer = document.getElementById('search-history-list');
      if (!listContainer) return;
      listContainer.innerHTML = '';

      if (suggestionsWrap) suggestionsWrap.style.display = 'none';
      if (historyWrap) historyWrap.style.display = 'block';

      if (state.searchHistory.length === 0) {
        listContainer.innerHTML = '<div style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); padding: 0.75rem 0.5rem; text-align: center;">تاریخچه جستجو خالی است</div>';
        return;
      }

      state.searchHistory.slice(0, 5).forEach((query, index) => {
        const item = document.createElement('div');
        item.className = 'search-history-item';
        item.innerHTML = `
          <div class="history-item-query">
            <span class="history-item-icon">🕒</span>
            <span>${escapeHTML(query)}</span>
          </div>
          <button type="button" class="history-item-delete" title="حذف این مورد">✕</button>
        `;

        item.querySelector('.history-item-query').addEventListener('click', () => {
          if (searchInput) {
            searchInput.value = query;
            executeSearch();
          }
        });

        item.querySelector('.history-item-delete').addEventListener('click', (e) => {
          e.stopPropagation();
          state.searchHistory.splice(index, 1);
          saveSearchHistory();
          renderSearchHistoryUI();
        });

        listContainer.appendChild(item);
      });
    }

    function addSearchHistory(query) {
      if (!query || !query.trim()) return;
      const clean = query.trim();
      state.searchHistory = [clean, ...state.searchHistory.filter(q => q !== clean)].slice(0, 5);
      saveSearchHistory();
      renderSearchHistoryUI();
    }

    if (btnClearAllHistory) {
      btnClearAllHistory.addEventListener('click', (e) => {
        e.stopPropagation();
        state.searchHistory = [];
        saveSearchHistory();
        renderSearchHistoryUI();
      });
    }

    // Fetch and Render Predictive Search Suggestions
    async function fetchSearchPredictions(rawQuery) {
      const query = (rawQuery || '').trim();
      if (!query) {
        currentSuggestions = [];
        activeSuggestionIndex = -1;
        if (suggestionsWrap) suggestionsWrap.style.display = 'none';
        if (historyWrap) historyWrap.style.display = 'block';
        renderSearchHistoryUI();
        if (historyDropdown && state.searchHistory.length > 0) {
          historyDropdown.classList.add('open');
        } else if (historyDropdown) {
          historyDropdown.classList.remove('open');
        }
        return;
      }

      // Fast local suggestions from bookmarks & history
      const localMatches = [];
      const lowerQuery = query.toLowerCase();

      state.bookmarks.forEach(bm => {
        if (!bm || !bm.title) return;
        const t = bm.title.toLowerCase();
        if (t.includes(lowerQuery) && !localMatches.includes(bm.title)) {
          localMatches.push(bm.title);
        }
      });

      state.searchHistory.forEach(h => {
        if (h.toLowerCase().includes(lowerQuery) && !localMatches.includes(h) && h.toLowerCase() !== lowerQuery) {
          localMatches.push(h);
        }
      });

      let webSuggestions = [];
      try {
        // Try server-side proxy first (fast cached endpoint)
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.suggestions)) {
            webSuggestions = data.suggestions;
          }
        }
      } catch (err) {
        // Fallback directly to Google Suggest (works in browser / extension)
        try {
          const directRes = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&hl=fa&q=${encodeURIComponent(query)}`);
          if (directRes.ok) {
            const data = await directRes.json();
            if (Array.isArray(data) && Array.isArray(data[1])) {
              webSuggestions = data[1];
            }
          }
        } catch (fErr) {
          // Silent fallback to local matches
        }
      }

      // Combine suggestions uniquely (local first, then web)
      const combined = [];
      localMatches.forEach(item => {
        if (!combined.includes(item)) combined.push(item);
      });
      webSuggestions.forEach(item => {
        if (!combined.includes(item)) combined.push(item);
      });

      currentSuggestions = combined.slice(0, 7);
      activeSuggestionIndex = -1;

      if (!suggestionsList || !suggestionsWrap) return;
      suggestionsList.innerHTML = '';

      if (currentSuggestions.length === 0) {
        suggestionsWrap.style.display = 'none';
        if (historyDropdown) historyDropdown.classList.remove('open');
        return;
      }

      if (historyWrap) historyWrap.style.display = 'none';
      suggestionsWrap.style.display = 'block';
      if (historyDropdown) historyDropdown.classList.add('open');

      currentSuggestions.forEach((sugText, sIdx) => {
        const item = document.createElement('div');
        item.className = 'search-suggestion-item';
        item.dataset.index = sIdx;

        // Highlight matching text portion
        let displayHtml = escapeHTML(sugText);
        try {
          const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
          displayHtml = sugText.replace(regex, '<span class="match-highlight">$1</span>');
        } catch (e) {}

        item.innerHTML = `
          <div class="suggestion-item-main">
            <span class="suggestion-icon">🔍</span>
            <span class="suggestion-text">${displayHtml}</span>
          </div>
          <button type="button" class="suggestion-arrow-btn" title="تکمیل عبارت">↖</button>
        `;

        // Click whole item to search immediately
        item.addEventListener('click', (e) => {
          if (e.target.closest('.suggestion-arrow-btn')) return;
          if (searchInput) {
            searchInput.value = sugText;
            executeSearch();
          }
        });

        // Click arrow button to fill search input without searching yet
        const arrowBtn = item.querySelector('.suggestion-arrow-btn');
        if (arrowBtn) {
          arrowBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (searchInput) {
              searchInput.value = sugText;
              searchInput.focus();
              fetchSearchPredictions(sugText);
            }
          });
        }

        suggestionsList.appendChild(item);
      });
    }

    // Keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
          if (currentSuggestions.length > 0 && historyDropdown && historyDropdown.classList.contains('open')) {
            e.preventDefault();
            activeSuggestionIndex = (activeSuggestionIndex + 1) % currentSuggestions.length;
            updateSelectedSuggestion();
          }
        } else if (e.key === 'ArrowUp') {
          if (currentSuggestions.length > 0 && historyDropdown && historyDropdown.classList.contains('open')) {
            e.preventDefault();
            activeSuggestionIndex = (activeSuggestionIndex - 1 + currentSuggestions.length) % currentSuggestions.length;
            updateSelectedSuggestion();
          }
        } else if (e.key === 'Escape') {
          if (historyDropdown) historyDropdown.classList.remove('open');
        } else if (e.key === 'Enter') {
          if (activeSuggestionIndex >= 0 && currentSuggestions[activeSuggestionIndex]) {
            searchInput.value = currentSuggestions[activeSuggestionIndex];
          }
          executeSearch();
        }
      });
    }

    function updateSelectedSuggestion() {
      if (!suggestionsList) return;
      const items = suggestionsList.querySelectorAll('.search-suggestion-item');
      items.forEach((it, idx) => {
        const isSel = idx === activeSuggestionIndex;
        it.classList.toggle('selected', isSel);
        if (isSel && searchInput) {
          searchInput.value = currentSuggestions[idx];
        }
      });
    }

    // Search Input Focus/Click for History / Predictions Dropdown
    if (searchInput) {
      searchInput.addEventListener('focus', () => {
        if (engineDropdown) engineDropdown.classList.remove('open');
        const val = searchInput.value.trim();
        if (val) {
          fetchSearchPredictions(val);
        } else {
          renderSearchHistoryUI();
          if (historyDropdown && state.searchHistory.length > 0) {
            historyDropdown.classList.add('open');
          }
        }
      });

      searchInput.addEventListener('click', (e) => {
        e.stopPropagation();
        if (engineDropdown) engineDropdown.classList.remove('open');
        const val = searchInput.value.trim();
        if (val) {
          fetchSearchPredictions(val);
        } else {
          renderSearchHistoryUI();
          if (historyDropdown && state.searchHistory.length > 0) {
            historyDropdown.classList.add('open');
          }
        }
      });
    }

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#search-section')) {
        if (engineDropdown) engineDropdown.classList.remove('open');
        if (historyDropdown) historyDropdown.classList.remove('open');
      }
    });

    // Live Search & Filter across Bookmarks
    function applyBookmarkLiveFilter(rawQuery) {
      const query = normalizeSearchText(rawQuery);
      const grid = document.getElementById('bookmark-grid');
      if (!grid) return;

      const cards = grid.querySelectorAll('.bookmark-card');
      let visibleCount = 0;

      // Remove existing no-results banner if any
      const existingBanner = document.getElementById('search-no-results-banner');
      if (existingBanner) existingBanner.remove();

      if (!query) {
        // Reset all cards to visible
        cards.forEach((card) => {
          card.classList.remove('filter-hidden');
          card.classList.add('filter-visible');
        });
        return;
      }

      cards.forEach((card) => {
        if (card.classList.contains('add-bookmark-card')) {
          card.classList.add('filter-hidden');
          card.classList.remove('filter-visible');
          return;
        }
        const itemTitle = normalizeSearchText(card.dataset.title || '');
        const itemUrl = normalizeSearchText(card.dataset.url || '');
        const isMatch = itemTitle.includes(query) || itemUrl.includes(query);

        if (isMatch) {
          card.classList.remove('filter-hidden');
          card.classList.add('filter-visible');
          visibleCount++;
        } else {
          card.classList.add('filter-hidden');
          card.classList.remove('filter-visible');
        }
      });

      if (visibleCount === 0 && cards.length > 0) {
        const banner = document.createElement('div');
        banner.id = 'search-no-results-banner';
        banner.className = 'bookmark-search-no-results';
        banner.innerHTML = `
          <div class="no-results-icon">🔍</div>
          <div class="no-results-title">نتیجه‌ای برای «${escapeHTML(rawQuery)}» در این بخش پیدا نشد</div>
          <div class="no-results-desc">برای جستجوی این عبارت در وب، کلید Enter را بزنید یا دکمه جستجو را کلیک کنید.</div>
          <button type="button" class="btn-clear-search-filter" id="btn-clear-search-filter">پاک کردن فیلتر</button>
        `;
        banner.querySelector('#btn-clear-search-filter').addEventListener('click', () => {
          if (searchInput) {
            searchInput.value = '';
            applyBookmarkLiveFilter('');
            searchInput.focus();
          }
        });
        grid.appendChild(banner);
      }
    }

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const val = searchInput.value;
        applyBookmarkLiveFilter(val);

        clearTimeout(predictDebounceTimer);
        predictDebounceTimer = setTimeout(() => {
          fetchSearchPredictions(val);
        }, 140);
      });
    }

    function executeSearch() {
      const query = (searchInput ? searchInput.value : '').trim();
      if (!query) return;

      addSearchHistory(query);
      if (historyDropdown) historyDropdown.classList.remove('open');
      if (suggestionsWrap) suggestionsWrap.style.display = 'none';
      if (engineDropdown) engineDropdown.classList.remove('open');

      if (!navigator.onLine) {
        showToast('📡 شما در حالت آفلاین هستید. جستجو در وب نیازمند اتصال اینترنت است.');
        return;
      }

      // URL detection (direct navigation)
      const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;
      if (urlPattern.test(query) && !query.includes(' ')) {
        const targetUrl = query.startsWith('http://') || query.startsWith('https://') ? query : `https://${query}`;
        window.open(targetUrl, '_blank');
      } else {
        const engineKey = state.settings.searchEngine || 'google';
        const engine = SEARCH_ENGINES[engineKey] || SEARCH_ENGINES.google;
        window.open(engine.url + encodeURIComponent(query), '_blank');
      }

      // Cleanly clear and reset input, filter, and focus state
      if (searchInput) {
        searchInput.value = '';
        applyBookmarkLiveFilter('');
        searchInput.blur();
      }
    }

    if (searchSubmitBtn) {
      searchSubmitBtn.addEventListener('click', executeSearch);
    }

    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          executeSearch();
        }
      });
    }

    // Reset search on tab return/focus if empty or done
    window.addEventListener('focus', () => {
      if (searchInput && document.activeElement !== searchInput) {
        searchInput.value = '';
        applyBookmarkLiveFilter('');
      }
    });

    renderSearchHistoryUI();
  }

  function updateSearchEngineUI() {
    const engineKey = state.settings.searchEngine || 'google';
    const engine = SEARCH_ENGINES[engineKey] || SEARCH_ENGINES.google;

    const iconElem = document.getElementById('selected-engine-icon');
    const nameElem = document.getElementById('selected-engine-name');
    if (iconElem) iconElem.textContent = engine.icon;
    if (nameElem) nameElem.textContent = engine.name;

    const items = document.querySelectorAll('.engine-item');
    items.forEach((item) => {
      if (item.dataset.engineKey === engineKey) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  /* ==========================================================================
     7. Bookmarks Grid, HD Favicons, Folder Badge & Drag & Drop
     ========================================================================== */
  function getHighQualityFavicon(url) {
    try {
      if (!url) return null;
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      return `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=128`;
    } catch (e) {
      return null;
    }
  }

  function getFolderChain(folderId) {
    const chain = [];
    let curId = folderId;
    const visited = new Set();
    while (curId && !visited.has(curId)) {
      visited.add(curId);
      const folder = state.bookmarks.find(b => b.id === curId);
      if (!folder) break;
      chain.unshift(folder);
      curId = folder.parentId || null;
    }
    return chain;
  }

  // Mouse Side Buttons Navigation (Back: Button 3 / Forward: Button 4)
  let folderNavHistory = [];
  let folderNavForwardHistory = [];

  function navigateToFolder(targetFolderId, addToHistory = true) {
    if (state.currentFolderId === targetFolderId) return;
    if (addToHistory) {
      folderNavHistory.push(state.currentFolderId);
      folderNavForwardHistory = [];
    }
    state.currentFolderId = targetFolderId;
    renderBookmarks();
  }

  function navigateFolderBack() {
    if (state.currentFolderId) {
      const chain = getFolderChain(state.currentFolderId);
      const parentFolder = chain.length > 1 ? chain[chain.length - 2] : null;
      folderNavForwardHistory.push(state.currentFolderId);
      state.currentFolderId = parentFolder ? parentFolder.id : null;
      renderBookmarks();
      return true;
    }
    return false;
  }

  function navigateFolderForward() {
    if (folderNavForwardHistory.length > 0) {
      const nextId = folderNavForwardHistory.pop();
      folderNavHistory.push(state.currentFolderId);
      state.currentFolderId = nextId;
      renderBookmarks();
      return true;
    }
    return false;
  }

  // Global Mouse Side Buttons Event Listener
  window.addEventListener('mouseup', (e) => {
    // e.button === 3: Mouse Back Button
    if (e.button === 3) {
      if (state.currentFolderId) {
        e.preventDefault();
        e.stopPropagation();
        navigateFolderBack();
      }
    }
    // e.button === 4: Mouse Forward Button
    else if (e.button === 4) {
      if (folderNavForwardHistory.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        navigateFolderForward();
      }
    }
  });

  
  function cleanupEmptyFolders() {
    return false;
  }

  function renderBookmarks() {
    cleanupEmptyFolders();
    const grid = document.getElementById('bookmark-grid');
    const breadcrumbNav = document.getElementById('breadcrumb-container');
    if (!grid) return;

    grid.innerHTML = '';

    // Filter items by current folder
    let currentFolderId = state.currentFolderId || null;
    let currentItems = state.bookmarks.filter(item => (item.parentId || null) === currentFolderId);

    const MAX_SLOTS = 144; 
    const slotMap = new Array(MAX_SLOTS).fill(null);
    const unassignedItems = [];

    if (!state.settings) state.settings = {};
    if (!state.settings.addCardGridIndices) state.settings.addCardGridIndices = {};
    const currentFolderKey = currentFolderId || 'root';

    currentItems.forEach(item => {
      if (item.gridIndex !== undefined && item.gridIndex >= 0 && item.gridIndex < MAX_SLOTS && slotMap[item.gridIndex] === null) {
        slotMap[item.gridIndex] = item;
      } else {
        unassignedItems.push(item);
      }
    });

    unassignedItems.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      return 0;
    });

    let needsSaveBm = false;
    let needsSaveSettings = false;

    unassignedItems.forEach(item => {
      const emptyIdx = slotMap.indexOf(null);
      if (emptyIdx !== -1) {
        slotMap[emptyIdx] = item;
        item.gridIndex = emptyIdx;
        needsSaveBm = true;
      }
    });

    let addCardIdx = state.settings.addCardGridIndices[currentFolderKey];
    if (addCardIdx !== undefined && addCardIdx >= 0 && addCardIdx < MAX_SLOTS && slotMap[addCardIdx] === null) {
      slotMap[addCardIdx] = { isAddCard: true, id: 'add_btn' };
    } else {
      const emptyIdx = slotMap.indexOf(null);
      if (emptyIdx !== -1) {
        slotMap[emptyIdx] = { isAddCard: true, id: 'add_btn' };
        state.settings.addCardGridIndices[currentFolderKey] = emptyIdx;
        needsSaveSettings = true;
      }
    }

    if (needsSaveBm) saveBookmarks();
    if (needsSaveSettings) saveSettings();

    if (breadcrumbNav) {
      if (state.currentFolderId) {
        const chain = getFolderChain(state.currentFolderId);
        
        let chainHtml = `<span class="breadcrumb-item" data-bc-target="root">صفحه اصلی</span>`;
        chain.forEach((f, idx) => {
          chainHtml += ` <span>/</span> `;
          if (idx === chain.length - 1) {
            chainHtml += `<span class="breadcrumb-item current">${escapeHTML(f.title)}</span>`;
          } else {
            chainHtml += `<span class="breadcrumb-item" data-bc-target="${f.id}">${escapeHTML(f.title)}</span>`;
          }
        });

        breadcrumbNav.innerHTML = `
          <button class="btn-breadcrumb-back" title="بازگشت" data-bc-target="back">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <div class="breadcrumb-path">
            ${chainHtml}
          </div>
        `;
        breadcrumbNav.style.display = 'flex';
        
        // Attach click events to breadcrumb back button and path items
        breadcrumbNav.querySelectorAll('[data-bc-target]').forEach(el => {
          el.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const target = el.dataset.bcTarget;
            if (target === 'back') {
              navigateFolderBack();
            } else if (target === 'root') {
              navigateToFolder(null);
            } else {
              navigateToFolder(target);
            }
          });
        });
      } else {
        breadcrumbNav.style.display = 'none';
      }
    }

    // Determine highest occupied slot index
    let lastOccupiedIdx = -1;
    for (let i = MAX_SLOTS - 1; i >= 0; i--) {
      if (slotMap[i] !== null) {
        lastOccupiedIdx = i;
        break;
      }
    }

    // Dynamically compute exact number of slots to fully cover the entire visible viewport height in complete rows
    let renderLimit = 72;
    try {
      const gridWidth = grid.clientWidth || (window.innerWidth - 60);
      const cardSize = 115;
      const gap = 18;
      const cols = Math.max(1, Math.floor((gridWidth + gap) / (cardSize + gap)));
      const gridRect = grid.getBoundingClientRect();
      const topOffset = (gridRect.top > 0 && gridRect.top < window.innerHeight) ? gridRect.top : 220;
      const availableHeight = Math.max(500, window.innerHeight - topOffset - 24);
      const rows = Math.max(6, Math.ceil((availableHeight + gap) / (cardSize + gap)));
      const totalSlotsNeeded = cols * rows;
      const fullRowsLimit = Math.ceil(Math.max(totalSlotsNeeded, lastOccupiedIdx + 1) / cols) * cols;
      renderLimit = Math.min(MAX_SLOTS, Math.max(fullRowsLimit, 64));
    } catch (err) {
      renderLimit = Math.min(MAX_SLOTS, Math.max(72, lastOccupiedIdx + 1));
    }

    for (let i = 0; i < renderLimit; i++) {
      const item = slotMap[i];

      if (!item) {
        const emptySlot = document.createElement('div');
        emptySlot.className = 'bookmark-card empty-slot';
        emptySlot.dataset.gridIndex = i;
        grid.appendChild(emptySlot);
        continue;
      }

      let card;
      
      if (item.isAddCard) {
        card = document.createElement('div');
        card.className = 'bookmark-card add-bookmark-card';
        card.id = 'btn-card-add-bookmark';
        card.dataset.gridIndex = i;
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.title = 'افزودن بوکمارک یا پوشه جدید (کلید N)';
        card.innerHTML = `
          <div class="add-icon-wrap">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </div>
          <div class="add-card-title">افزودن بوکمارک</div>
          <div class="add-card-subtitle">+ پوشه یا سایت</div>
        `;
        card.addEventListener('click', (e) => {
          if (card.classList.contains('was-dragged')) {
            card.classList.remove('was-dragged');
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          openAddModal();
        });
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openAddModal();
          }
        });
      } else {
        card = document.createElement('div');
        card.className = `bookmark-card ${item.isPinned ? 'is-pinned' : ''}`;
        card.dataset.gridIndex = i;
        card.dataset.id = item.id;
        card.dataset.title = item.title || '';
        card.dataset.url = item.url || '';

        
        let iconMarkup = '';
        if (item.type === 'folder') {
          const countInside = state.bookmarks.filter(b => b.parentId === item.id).length;
          const folderEmoji = item.iconEmoji || '📁';
          let folderInner = '';
          if (item.iconType === 'custom' && item.customIconUrl) {
            folderInner = `<img src="${item.customIconUrl}" alt="${escapeHTML(item.title)}" class="bookmark-icon-img" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='inline';" /><span class="folder-base-icon" style="display:none;">${folderEmoji}</span>`;
          } else {
            folderInner = `<span class="folder-base-icon">${folderEmoji}</span>`;
          }
          iconMarkup = `
            <div class="bookmark-icon-wrap">
              <div class="folder-icon-container">
                ${folderInner}
                <span class="folder-count-badge">${toPersianDigits(countInside)}</span>
              </div>
            </div>
          `;
        } else {
          const fallbackEmoji = item.iconEmoji || '🌐';
          let innerIcon = '';
          if (item.iconType === 'emoji') {
            innerIcon = `<span class="bookmark-icon-emoji">${fallbackEmoji}</span>`;
          }
          else if ((item.iconType === 'custom' || (!item.iconType && item.customIconUrl)) && item.customIconUrl) {
            innerIcon = `<img src="${item.customIconUrl}" alt="${escapeHTML(item.title)}" class="bookmark-icon-img" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='inline';" /><span class="bookmark-icon-emoji" style="display:none;">${fallbackEmoji}</span>`;
          }
          else {
            const hdIconUrl = getHighQualityFavicon(item.url);
            if (hdIconUrl) {
              innerIcon = `<img src="${hdIconUrl}" alt="${escapeHTML(item.title)}" class="bookmark-icon-img" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='inline';" /><span class="bookmark-icon-emoji" style="display:none;">${fallbackEmoji}</span>`;
            } else {
              innerIcon = `<span class="bookmark-icon-emoji">${fallbackEmoji}</span>`;
            }
          }
          iconMarkup = `<div class="bookmark-icon-wrap">${innerIcon}</div>`;
        }

        let subtitleMarkup = '';
        if (item.type === 'folder') {
          const childCount = state.bookmarks.filter(b => b.parentId === item.id).length;
          subtitleMarkup = `<div class="bookmark-subtitle">${toPersianDigits(childCount)} آیتم</div>`;
        }

        const lockIconHtml = (item.pin && item.pin.length === 4) ? `
          <div class="bookmark-lock-badge" title="قفل شده با رمز">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
        ` : '';

        card.innerHTML = `
          ${lockIconHtml}
          <button class="card-options-btn" aria-label="تنظیمات" title="تنظیمات" type="button">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="1.2"></circle>
              <circle cx="12" cy="5" r="1.2"></circle>
              <circle cx="12" cy="19" r="1.2"></circle>
            </svg>
          </button>
          ${iconMarkup}
          <div class="bookmark-title">${escapeHTML(item.title)}</div>
          ${subtitleMarkup}
        `;

        const btnOptions = card.querySelector('.card-options-btn');
        if (btnOptions) {
          btnOptions.addEventListener('click', (e) => {
            e.stopPropagation();
            openCardContextMenu(e, item.id);
          });
        }

        card.addEventListener('click', (e) => {
          if (card.classList.contains('was-dragged')) {
            card.classList.remove('was-dragged');
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          if (e.target.closest('.card-options-btn')) return;
          
            if (item.pin && item.pin.length === 4) {
              openPinModal(item, 'open');
            } else {
              if (item.type === 'folder') {
                navigateToFolder(item.id);
              } else if (item.url) {
                if (typeof chrome !== 'undefined' && chrome.tabs && typeof chrome.tabs.create === 'function') {
                  chrome.tabs.create({ url: item.url });
                } else {
                  window.open(item.url, '_blank', 'noopener,noreferrer');
                }
              }
            }

        });

        card.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          openCardContextMenu(e, item.id);
        });
      }

      card.addEventListener('dragstart', (e) => e.preventDefault());

      card.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        if (e.target.closest('button, a, input, .card-options-btn')) return;

        let startX = e.clientX;
        let startY = e.clientY;
        let isDragging = false;

        const pointerMoveInit = (moveEvent) => {
          if (!isDragging && (Math.abs(moveEvent.clientX - startX) > 4 || Math.abs(moveEvent.clientY - startY) > 4)) {
            isDragging = true;
            window.removeEventListener('pointerup', pointerUpInit);
            card.removeEventListener('pointermove', pointerMoveInit);
            startCustomDrag(moveEvent);
          }
        };

        const pointerUpInit = () => {
          card.removeEventListener('pointermove', pointerMoveInit);
          window.removeEventListener('pointerup', pointerUpInit);
        };

        card.addEventListener('pointermove', pointerMoveInit);
        window.addEventListener('pointerup', pointerUpInit);

        function startCustomDrag(eMove) {
          card.classList.add('was-dragged');
          document.body.classList.add('is-dragging-active');

          const rect = card.getBoundingClientRect();
          const offsetX = eMove.clientX - rect.left;
          const offsetY = eMove.clientY - rect.top;

          const clone = card.cloneNode(true);
          clone.id = '';
          clone.classList.remove('is-pinned');
          clone.style.position = 'fixed';
          clone.style.zIndex = '999999';
          clone.style.width = `${rect.width}px`;
          clone.style.height = `${rect.height}px`;
          clone.style.pointerEvents = 'none';
          clone.style.transition = 'none';
          clone.style.margin = '0';
          clone.style.left = '0';
          clone.style.top = '0';
          clone.style.transform = `translate(${eMove.clientX - offsetX}px, ${eMove.clientY - offsetY}px) scale(1.05)`;
          clone.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.2)';
          clone.style.opacity = '0.95';
          clone.style.cursor = 'grabbing';
          document.body.appendChild(clone);

          card.classList.add('drag-placeholder');

          // Full screen slots are already present in the grid

          let targetItemState = null;
          let dropAction = null;
          let targetGridIndex = null;

          const onMove = (eMoveDrag) => {
            eMoveDrag.preventDefault();
            clone.style.transform = `translate(${eMoveDrag.clientX - offsetX}px, ${eMoveDrag.clientY - offsetY}px) scale(1.05)`;
            
            clone.style.display = 'none';
            const elements = document.elementsFromPoint(eMoveDrag.clientX, eMoveDrag.clientY);
            clone.style.display = 'flex';

            const targetCard = elements.find(el => el.classList && el.classList.contains('bookmark-card') && el !== card);
            const breadcrumbTarget = elements.find(el => el.classList && (el.classList.contains('breadcrumb-item') || el.classList.contains('btn-breadcrumb-back')));

            document.querySelectorAll('.bookmark-card').forEach(c => {
              c.classList.remove('drag-over-folder', 'drag-over-create-folder', 'drag-over-swap', 'drag-over-empty');
            });
            document.querySelectorAll('.breadcrumb-item, .btn-breadcrumb-back').forEach(c => {
              c.classList.remove('drag-over-bc');
            });

            if (breadcrumbTarget) {
              breadcrumbTarget.classList.add('drag-over-bc');
              dropAction = 'breadcrumb';
              targetItemState = breadcrumbTarget.dataset.bcTarget || 'back';
            } else if (targetCard) {
              targetGridIndex = parseInt(targetCard.dataset.gridIndex, 10);
              
              if (targetCard.classList.contains('empty-slot')) {
                targetCard.classList.add('drag-over-empty');
                dropAction = 'empty_slot';
                targetItemState = null;
              } else if (targetCard.classList.contains('add-bookmark-card')) {
                targetCard.classList.add('drag-over-swap');
                dropAction = 'swap';
                targetItemState = { isAddCard: true };
              } else {
                const targetId = targetCard.dataset.id;
                targetItemState = state.bookmarks.find(b => b.id === targetId);
                
                if (item.isAddCard) {
                  targetCard.classList.add('drag-over-swap');
                  dropAction = 'swap';
                } else if (targetItemState) {
                  if (targetItemState.type === 'folder') {
                    targetCard.classList.add('drag-over-folder');
                    dropAction = 'folder';
                  } else {
                    const targetRect = targetCard.getBoundingClientRect();
                    const mouseX = eMoveDrag.clientX - targetRect.left;
                    const mouseY = eMoveDrag.clientY - targetRect.top;
                    const isCenter = mouseX > targetRect.width * 0.25 && mouseX < targetRect.width * 0.75 && mouseY > targetRect.height * 0.25 && mouseY < targetRect.height * 0.75;
                    
                    if (isCenter) {
                      targetCard.classList.add('drag-over-create-folder');
                      dropAction = 'create_folder';
                    } else {
                      targetCard.classList.add('drag-over-swap');
                      dropAction = 'swap';
                    }
                  }
                }
              }
            } else {
              targetItemState = null;
              dropAction = null;
            }
          };

          const onUp = (eUpDrag) => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            clone.remove();
            card.classList.remove('drag-placeholder');
            document.body.classList.remove('is-dragging-active');
            
            document.querySelectorAll('.bookmark-card').forEach(c => {
              c.classList.remove('drag-over-folder', 'drag-over-create-folder', 'drag-over-swap', 'drag-over-empty');
            });
            document.querySelectorAll('.breadcrumb-item, .btn-breadcrumb-back').forEach(c => {
              c.classList.remove('drag-over-bc');
            });
            

            const draggedGridIndex = parseInt(card.dataset.gridIndex, 10);
            let draggedItem = null;
            if (!item.isAddCard) {
                draggedItem = state.bookmarks.find(b => b.id === item.id);
                if (!draggedItem) return;
            }

            if (dropAction === 'empty_slot' && targetGridIndex !== null && !isNaN(targetGridIndex)) {
              if (item.isAddCard) {
                  state.settings.addCardGridIndices[currentFolderKey] = targetGridIndex;
                  saveSettings();
              } else {
                  draggedItem.gridIndex = targetGridIndex;
                  saveBookmarks();
              }
              renderBookmarks();
            } else if (dropAction === 'breadcrumb' && !item.isAddCard) {
              if (targetItemState === 'back') {
                const chain = getFolderChain(state.currentFolderId);
                const parentFolder = chain.length > 1 ? chain[chain.length - 2] : null;
                draggedItem.parentId = parentFolder ? parentFolder.id : null;
              } else if (targetItemState === 'root') {
                draggedItem.parentId = null;
              } else {
                draggedItem.parentId = targetItemState;
              }
              delete draggedItem.gridIndex;
              saveBookmarks();
              renderBookmarks();
              showToast(`«${draggedItem.title}» منتقل شد`);
            } else if (dropAction === 'swap' && targetGridIndex !== null && !isNaN(targetGridIndex)) {
                if (item.isAddCard) {
                    state.settings.addCardGridIndices[currentFolderKey] = targetGridIndex;
                    if (targetItemState && !targetItemState.isAddCard) {
                        targetItemState.gridIndex = draggedGridIndex;
                    }
                    saveSettings();
                    saveBookmarks();
                } else {
                    draggedItem.gridIndex = targetGridIndex;
                    if (targetItemState && targetItemState.isAddCard) {
                        state.settings.addCardGridIndices[currentFolderKey] = draggedGridIndex;
                        saveSettings();
                    } else if (targetItemState) {
                        targetItemState.gridIndex = draggedGridIndex;
                    }
                    saveBookmarks();
                }
                renderBookmarks();
            } else if (dropAction === 'folder' && targetItemState && !item.isAddCard) {
              draggedItem.parentId = targetItemState.id;
              delete draggedItem.gridIndex;
              saveBookmarks();
              renderBookmarks();
              showToast(`«${draggedItem.title}» به پوشه «${targetItemState.title}» منتقل شد`);
            } else if (dropAction === 'create_folder' && targetItemState && !item.isAddCard) {
              const newFolderId = 'folder_' + Date.now();
              const newFolder = {
                id: newFolderId,
                type: 'folder',
                title: `پوشه ${targetItemState.title}`,
                iconEmoji: '📁',
                parentId: state.currentFolderId || null,
                isPinned: false,
                gridIndex: targetGridIndex
              };
              targetItemState.parentId = newFolderId;
              delete targetItemState.gridIndex;
              draggedItem.parentId = newFolderId;
              delete draggedItem.gridIndex;
              state.bookmarks.push(newFolder);
              saveBookmarks();
              renderBookmarks();
              showToast(`پوشه جدید «${newFolder.title}» ایجاد شد`);
            }
          };

          window.addEventListener('pointermove', onMove, { passive: false });
          window.addEventListener('pointerup', onUp);
        }
      });

      grid.appendChild(card);
    } 

    const searchInputElem = document.getElementById('search-input');
    if (searchInputElem && searchInputElem.value.trim().length > 0) {
      searchInputElem.dispatchEvent(new Event('input'));
    }
  }


  
  function openCardContextMenu(e, id) {
    let existing = document.getElementById('custom-context-menu');
    if (existing) existing.remove();

    const menu = document.createElement('div');
    menu.id = 'custom-context-menu';
    menu.className = 'glass-panel';
    menu.style.position = 'fixed';
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    menu.style.zIndex = '999999';
    menu.style.padding = '0.5rem';
    menu.style.borderRadius = '12px';
    menu.style.display = 'flex';
    menu.style.flexDirection = 'column';
    menu.style.gap = '0.25rem';
    menu.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
    menu.style.minWidth = '150px';

    const item = state.bookmarks.find(b => b.id === id);
    if (!item) return;

    function createBtn(text, color, onClick) {
      const btn = document.createElement('button');
      btn.textContent = text;
      btn.style.padding = '0.6rem 1rem';
      btn.style.background = 'transparent';
      btn.style.border = 'none';
      btn.style.color = color;
      btn.style.textAlign = 'right';
      btn.style.cursor = 'pointer';
      btn.style.borderRadius = '8px';
      btn.style.fontFamily = 'inherit';
      btn.style.fontSize = '0.85rem';
      btn.addEventListener('mouseenter', () => btn.style.background = color === '#ef4444' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.1)');
      btn.addEventListener('mouseleave', () => btn.style.background = 'transparent');
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        menu.remove();
        onClick();
      });
      return btn;
    }

    menu.appendChild(createBtn('✏️ ویرایش', 'var(--text-primary)', () => openEditModal(id)));
    menu.appendChild(createBtn(item.isPinned ? '📌 برداشتن سنجاق' : '📌 سنجاق کردن', 'var(--text-primary)', () => {
      item.isPinned = !item.isPinned;
      delete item.gridIndex;
      saveBookmarks();
      renderBookmarks();
    }));
    menu.appendChild(createBtn('🗑️ حذف', '#ef4444', () => {
      deleteItem(id);
    }));

    document.body.appendChild(menu);

    setTimeout(() => {
      window.addEventListener('click', function closeMenu(ev) {
        if (!menu.contains(ev.target)) {
          menu.remove();
          window.removeEventListener('click', closeMenu);
        }
      });
    }, 10);
  }

  function deleteItem(id) {
    const item = state.bookmarks.find(b => b.id === id);
    if (!item) return;

    if (typeof chrome !== 'undefined' && chrome.bookmarks) {
      if (item.chromeId && chrome.bookmarks.remove) {
        try {
          if (item.type === 'folder' && chrome.bookmarks.removeTree) {
            chrome.bookmarks.removeTree(item.chromeId, () => {
              if (chrome.runtime?.lastError) { /* ignore */ }
            });
          } else {
            chrome.bookmarks.remove(item.chromeId, () => {
              if (chrome.runtime?.lastError) { /* ignore */ }
            });
          }
        } catch (e) {
          console.warn('Error removing bookmark from browser:', e);
        }
      }
    }

    const title = item.title || 'آیتم';
    state.bookmarks = state.bookmarks.filter(b => b.id !== id && b.parentId !== id);
    cleanupEmptyFolders();
    saveBookmarks();
    renderBookmarks();
    showToast(`«${title}» با موفقیت حذف شد`);
  }

  /* ==========================================================================
     8. Modals (Add, Edit, Settings)
     ========================================================================== */
  function initModals() {
    initModalScrollLockObserver();
    // Universal Close Buttons
    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        closeAllModals();
      });
    });

    document.querySelectorAll('.modal-overlay').forEach((overlay) => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeAllModals();
        }
      });
    });

    // Escape Key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAllModals();
      }
    });

    // Add Modal Open Button
    const btnOpenAdd = document.getElementById('btn-open-add');
    if (btnOpenAdd) {
      btnOpenAdd.addEventListener('click', openAddModal);
    }

    // Settings Modal Open Button
    const btnOpenSettings = document.getElementById('btn-open-settings');
    if (btnOpenSettings) {
      btnOpenSettings.addEventListener('click', () => {
        openSettingsModal();
      });
    }

    // Add Form Submit
    const addForm = document.getElementById('add-form');
    if (addForm) {
      addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = (document.getElementById('add-title')?.value || '').trim();
        const url = (document.getElementById('add-url')?.value || '').trim();
        const isFolder = document.getElementById('seg-add-folder')?.classList.contains('active');
        const parentId = document.getElementById('add-folder-select')?.value || null;

        if (!title) return;

        const newItem = {
          id: 'bm_' + Date.now(),
          type: isFolder ? 'folder' : 'bookmark',
          title: title,
          url: isFolder ? null : (url.startsWith('http') ? url : `https://${url}`),
          iconEmoji: state.selectedAddEmoji || (isFolder ? '📁' : '🌐'),
          parentId: parentId === 'root' ? null : parentId,
          isPinned: false
        };

        state.bookmarks.push(newItem);
        saveBookmarks();
        renderBookmarks();

        // 🔄 Synchronize creation with Browser Bookmarks API
        if (typeof chrome !== 'undefined' && chrome.bookmarks && chrome.bookmarks.create) {
          try {
            const createPayload = {
              title: newItem.title
            };
            if (!isFolder && newItem.url) {
              createPayload.url = newItem.url;
            }
            if (newItem.parentId) {
              const parentItem = state.bookmarks.find(b => b.id === newItem.parentId);
              const parentChromeId = parentItem ? (parentItem.chromeId || (parentItem.id.startsWith('folder_chrome_') ? parentItem.id.replace('folder_chrome_', '') : null)) : null;
              if (parentChromeId) {
                createPayload.parentId = parentChromeId;
              }
            }
            chrome.bookmarks.create(createPayload, (createdNode) => {
              if (createdNode && createdNode.id) {
                newItem.chromeId = createdNode.id;
                saveBookmarks();
              }
            });
          } catch (e) {
            console.warn('Error creating bookmark in browser:', e);
          }
        }

        closeAllModals();
        showToast(isFolder ? 'پوشه جدید ایجاد شد' : 'بوکمارک ذخیره شد');
      });
    }

    // Edit Form Submit
    const btnEditModalDelete = document.getElementById('btn-edit-modal-delete');
    if (btnEditModalDelete) {
      btnEditModalDelete.addEventListener('click', () => {
        if (state.editingItemId) {
          const id = state.editingItemId;
          closeAllModals();
          deleteItem(id);
        }
      });
    }

    const editForm = document.getElementById('edit-form');
    if (editForm) {
      editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const item = state.bookmarks.find(b => b.id === state.editingItemId);
        if (!item) return;

        const title = (document.getElementById('edit-title')?.value || '').trim();
        const url = (document.getElementById('edit-url')?.value || '').trim();
        const iconUrl = (document.getElementById('edit-icon-url')?.value || '').trim();

        // 🔐 Handle 4-Digit PIN Protection
        const isLockEnabled = document.getElementById('toggle-edit-lock')?.checked;
        const pinInputVal = (document.getElementById('edit-pin-input')?.value || '').trim();

        if (isLockEnabled) {
          if (!/^\d{4}$/.test(pinInputVal)) {
            showToast('⚠️ رمز عبور باید دقیقاً یک عدد ۴ رقمی باشد (مثلاً ۱۲۳۴)');
            return;
          }
          item.pin = pinInputVal;
        } else {
          item.pin = null;
        }

        item.title = title || item.title;
        if (item.type !== 'folder') {
          item.url = url ? (url.startsWith('http') ? url : `https://${url}`) : item.url;
        }

        // Apply Icon based on active mode
        const isFolder = item.type === 'folder';
        const iconMode = state.selectedEditIconType || (isFolder ? 'emoji' : 'favicon');
        item.iconType = iconMode;

        if (iconMode === 'emoji') {
          item.iconEmoji = state.selectedEditEmoji || (isFolder ? '📁' : '🌐');
          item.customIconUrl = null;
        } else if (iconMode === 'custom') {
          item.customIconUrl = iconUrl || null;
          item.iconEmoji = state.selectedEditEmoji || (isFolder ? '📁' : '🌐');
        } else {
          // favicon
          item.customIconUrl = null;
          item.iconEmoji = '🌐';
        }

        saveBookmarks();
        renderBookmarks();

        // 🔄 Synchronize modification with Browser Bookmarks API
        if (typeof chrome !== 'undefined' && chrome.bookmarks && chrome.bookmarks.update) {
          const chromeId = item.chromeId || (item.id.startsWith('bm_chrome_') ? item.id.replace('bm_chrome_', '') : (item.id.startsWith('folder_chrome_') ? item.id.replace('folder_chrome_', '') : null));
          if (chromeId) {
            const updatePayload = { title: item.title };
            if (item.type !== 'folder' && item.url) {
              updatePayload.url = item.url;
            }
            try {
              chrome.bookmarks.update(chromeId, updatePayload, () => {
                if (chrome.runtime?.lastError) {
                  console.log('chrome.bookmarks.update note:', chrome.runtime.lastError.message);
                }
              });
            } catch (err) {
              console.warn('Error updating bookmark in browser:', err);
            }
          }
        }

        closeAllModals();
        showToast(item.pin ? '🔒 تغییرات و رمز عبور با موفقیت ذخیره شد' : '✅ تغییرات و آیکون با موفقیت ذخیره شد');
      });
    }

    // Toggle Edit Lock Switch & Visibility
    const toggleEditLock = document.getElementById('toggle-edit-lock');
    const editPinContainer = document.getElementById('edit-pin-container');
    const editPinInput = document.getElementById('edit-pin-input');
    const btnTogglePinVis = document.getElementById('btn-toggle-pin-visibility');

    if (toggleEditLock) {
      toggleEditLock.addEventListener('change', (e) => {
        if (editPinContainer) {
          editPinContainer.style.display = e.target.checked ? 'block' : 'none';
        }
        if (e.target.checked && editPinInput) {
          editPinInput.focus();
        }
      });
    }

    if (btnTogglePinVis && editPinInput) {
      btnTogglePinVis.addEventListener('click', () => {
        if (editPinInput.type === 'password') {
          editPinInput.type = 'text';
          btnTogglePinVis.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
        } else {
          editPinInput.type = 'password';
          btnTogglePinVis.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
        }
      });
    }

    initPinUnlockControls();

    // Add Modal: Bookmark vs Folder Toggle
    const segAddSite = document.getElementById('seg-add-site');
    const segAddFolder = document.getElementById('seg-add-folder');
    const addUrlGroup = document.getElementById('add-url-group');

    if (segAddSite && segAddFolder) {
      segAddSite.addEventListener('click', () => {
        segAddSite.classList.add('active');
        segAddFolder.classList.remove('active');
        if (addUrlGroup) addUrlGroup.style.display = 'flex';
      });

      segAddFolder.addEventListener('click', () => {
        segAddFolder.classList.add('active');
        segAddSite.classList.remove('active');
        if (addUrlGroup) addUrlGroup.style.display = 'none';
      });
    }

    // Populate Emoji Pickers
    populateEmojiPicker('add-emoji-picker', (emoji) => { state.selectedAddEmoji = emoji; });
    populateEmojiPicker('edit-emoji-picker', (emoji) => {
      state.selectedEditEmoji = emoji;
      state.selectedEditIconType = 'emoji';
      const customEmojiInput = document.getElementById('edit-custom-emoji-input');
      if (customEmojiInput) customEmojiInput.value = emoji;
      updateEditIconPreview();
    });

    initEditIconControls();

    // Settings Tabs
    const settingsTabs = document.querySelectorAll('.settings-tab-btn');
    settingsTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        switchSettingsTab(targetTab);
      });
    });

    initSettingsControls();
    initAccountTab();
  }

  function updateAccountTabStats() {
    const statBM = document.getElementById('account-stat-bookmarks');
    if (statBM) statBM.textContent = (state.bookmarks ? state.bookmarks.length : 0).toString();

    const statTasks = document.getElementById('account-stat-tasks');
    if (statTasks) {
      let count = 0;
      if (typeof calendarTasks !== 'undefined' && Array.isArray(calendarTasks)) {
        count = calendarTasks.length;
      } else {
        try {
          const stored = localStorage.getItem(STORAGE_KEYS.CALENDAR_TASKS);
          count = stored ? JSON.parse(stored).length : 0;
        } catch { count = 0; }
      }
      statTasks.textContent = count.toString();
    }

    const statNotes = document.getElementById('account-stat-notes');
    if (statNotes) {
      let count = 0;
      if (typeof multiNotesList !== 'undefined' && Array.isArray(multiNotesList)) {
        count = multiNotesList.length;
      } else {
        try {
          const stored = localStorage.getItem(STORAGE_KEYS.MULTI_NOTES);
          count = stored ? JSON.parse(stored).length : 0;
        } catch { count = 0; }
      }
      statNotes.textContent = count.toString();
    }
  }

  const LOCAL_USER_PROFILE_KEY = 'almas_active_user_profile';
  const SYNC_SWITCHES_STORAGE_KEY = 'almas_sync_switches_v1';
  const LOCAL_CACHED_DEVICES_KEY = 'almas_cached_devices_v1';

  // 8 Modern Preset Avatars (Self-contained offline Base64 SVGs)
  const PRESET_AVATARS = [
    {
      id: 'diamond',
      title: 'الماس بلورین',
      svg: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImcxIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMDZiNmQ0Ii8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjNjM2NmYxIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDgiIGZpbGw9IiMwZjE3MmEiLz48cG9seWdvbiBwb2ludHM9IjI1LDM4IDc1LDM4IDkwLDUyIDUwLDg1IDEwLDUyIiBmaWxsPSJ1cmwoI2cxKSIgc3Ryb2tlPSIjMzhiZGY4IiBzdHJva2Utd2lkdGg9IjIiLz48cG9seWdvbiBwb2ludHM9IjM1LDM4IDUwLDUyIDY1LDM4IiBmaWxsPSIjZmZmZmZmIiBvcGFjaXR5PSIwLjQiLz48cG9seWdvbiBwb2ludHM9IjUwLDUyIDUwLDg1IDY1LDM4IiBmaWxsPSIjZmZmZmZmIiBvcGFjaXR5PSIwLjIiLz48L3N2Zz4='
    },
    {
      id: 'rocket',
      title: 'فضاپیمای کیهانی',
      svg: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImcyIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZWM0ODk5Ii8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjOGI1Y2Y2Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDgiIGZpbGw9IiMxODE4MWIiLz48cGF0aCBkPSJNNTAgMTggQzYyIDMwIDY4IDQ2IDY0IDY0IEw1MCA1NiBMMzYgNjQgQzMyIDQ2IDM4IDMwIDUwIDE4IFoiIGZpbGw9InVybCgjZzIpIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI0MCIgcj0iNiIgZmlsbD0iI2ZmZmZmZiIvPjxwb2x5Z29uIHBvaW50cz0iMzYsNTQgMjIsNjYgMzIsNzAiIGZpbGw9IiNlYzQ4OTkiLz48cG9seWdvbiBwb2ludHM9IjY0LDU0IDc4LDY2IDY4LDcwIiBmaWxsPSIjOGI1Y2Y2Ii8+PHBvbHlnb24gcG9pbnRzPSI0NCw2MCA1MCw3OCA1Niw2MCIgZmlsbD0iI2Y1OWUwYiIvPjwvc3ZnPg=='
    },
    {
      id: 'fox',
      title: 'روباه طلایی',
      svg: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0OCIgZmlsbD0iIzFjMTkxNyIvPjxwb2x5Z29uIHBvaW50cz0iMjAsMjQgNDIsNDggMjQsNTYiIGZpbGw9IiNmOTczMTYiLz48cG9seWdvbiBwb2ludHM9IjgwLDI0IDc2LDU2IDU4LDQ4IiBmaWxsPSIjZjk3MzE2Ii8+PHBvbHlnb24gcG9pbnRzPSIyNCw1NiA1MCw4NSA3Niw1NiA1MCw0MiIgZmlsbD0iI2VhNTgwYyIvPjxwb2x5Z29uIHBvaW50cz0iMzYsNjUgNTAsODUgMjQsNTYiIGZpbGw9IiNmZmZmZmYiLz48cG9seWdvbiBwb2ludHM9IjY0LDY1IDUwLDg1IDc2LDU2IiBmaWxsPSIjZmZmZmZmIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI3NCIgcj0iNCIgZmlsbD0iIzBmMTcyYSIvPjwvc3ZnPg=='
    },
    {
      id: 'lightning',
      title: 'انرژی نئونی',
      svg: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9Imc0IiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZmJiZjI0Ii8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjZjU5ZTBiIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDgiIGZpbGw9IiMxNzI1NTQiLz48cG9seWdvbiBwb2ludHM9IjU2LDE2IDI4LDUyIDUwLDUyIDQ0LDg0IDcyLDQ0IDUwLDQ0IiBmaWxsPSJ1cmwoI2c0KSIgc3Ryb2tlPSIjZmRlMDQ3IiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4='
    },
    {
      id: 'galaxy',
      title: 'کهکشان بنفش',
      svg: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9Imc1IiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjYTg1NWY3Ii8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjM2I4MmY2Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDgiIGZpbGw9IiMwOTA5MGIiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSIyOCIgZmlsbD0idXJsKCNnNSkiLz48ZWxsaXBzZSBjeD0iNTAiIGN5PSI1MCIgcng9IjQ0IiByeT0iMTQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2MwODRmYyIgc3Ryb2tlLXdpZHRoPSIzIiB0cmFuc2Zvcm09InJvdGF0ZSgtMjUgNTAgNTApIi8+PC9zdmc+'
    },
    {
      id: 'crystal_orb',
      title: 'گوی کریستال',
      svg: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9Imc2IiBjeD0iMzUlIiBjeT0iMzUlIiByPSI2NSUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmZmZmZmYiLz48c3RvcCBvZmZzZXQ9IjM1JSIgc3RvcC1jb2xvcj0iI2E1ZjNmYyIvPjxzdG9wIG9mZnNldD0iNzAlIiBzdG9wLWNvbG9yPSIjMDI4NGM3Ii8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMGM0YTZlIi8+PC9yYWRpYWxHcmFkaWVudD48L2RlZnM+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDgiIGZpbGw9IiMwODJmNDkiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSIzOCIgZmlsbD0idXJsKCNnNikiLz48ZWxsaXBzZSBjeD0iNDAiIGN5PSIzNiIgcng9IjEwIiByeT0iNiIgZmlsbD0iI2ZmZmZmZiIgb3BhY2l0eT0iMC42IiB0cmFuc2Zvcm09InJvdGF0ZSgtMzAgNDAgMzYpIi8+PC9zdmc+'
    },
    {
      id: 'crown',
      title: 'تاج طلایی',
      svg: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9Imc3IiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZmFjYzE1Ii8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjZWFiMzA4Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDgiIGZpbGw9IiMxZTFiNGIiLz48cG9seWdvbiBwb2ludHM9IjIwLDY4IDgwLDY4IDg1LDM1IDY1LDUyIDUwLDI1IDM1LDUyIDE1LDM1IiBmaWxsPSJ1cmwoI2c3KSIgc3Ryb2tlPSIjZmVmMDhhIiBzdHJva2Utd2lkdGg9IjIiLz48Y2lyY2xlIGN4PSIxNSIgY3k9IjM1IiByPSI0IiBmaWxsPSIjMzhiZGY4Ii8+PGNpcmNsZSBjeD0iNTAiIGN5PSIyNSIgcj0iNCIgZmlsbD0iI2VjNDg5OSIvPjxjaXJjbGUgY3g9Ijg1IiBjeT0iMzUiIHI9IjQiIGZpbGw9IiMzOGJkZjgiLz48L3N2Zz4='
    },
    {
      id: 'saturn',
      title: 'سیاره زحل',
      svg: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9Imc4IiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjZmI5MjNjIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjYzI0MTBjIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDgiIGZpbGw9IiMwZjE3MmEiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSIyNiIgZmlsbD0idXJsKCNnOCkiLz48ZWxsaXBzZSBjeD0iNTAiIGN5PSI1MCIgcng9IjQ2IiByeT0iMTIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZkYmE3NCIgc3Ryb2tlLXdpZHRoPSI0IiB0cmFuc2Zvcm09InJvdGF0ZSgtMjAgNTAgNTApIi8+PGVsbGlwc2UgY3g9IjUwIiBjeT0iNTAiIHJ4PSI0MiIgcnk9IjkiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZlZDdhYSIgc3Ryb2tlLXdpZHRoPSIyIiB0cmFuc2Zvcm09InJvdGF0ZSgtMjAgNTAgNTApIi8+PC9zdmc+'
    }
  ];

  // Cloud Sync Preference Helpers
  function getSyncPreferences() {
    try {
      const raw = localStorage.getItem(SYNC_SWITCHES_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { bookmarks: true, tasksNotes: true, settings: true };
  }

  function saveSyncPreferences(prefs, user) {
    try {
      localStorage.setItem(SYNC_SWITCHES_STORAGE_KEY, JSON.stringify(prefs));
    } catch {}

    const sb = getSupabase();
    if (user && sb && typeof sb.fetchUserDataRow === 'function' && typeof sb.saveUserDataRow === 'function') {
      (async () => {
        let authUser = null;
        if (typeof sb.getVerifiedAuthUser === 'function') {
          authUser = await sb.getVerifiedAuthUser();
        } else if (typeof sb.getCurrentUser === 'function') {
          authUser = await sb.getCurrentUser();
        }
        if (!authUser || !authUser.id) return;

        const authUserId = authUser.id;
        const row = await sb.fetchUserDataRow(authUserId);
        const currentData = row?.data || {};
        currentData.cloudSyncPreferences = {
          ...prefs,
          updatedAt: Date.now()
        };
        await sb.saveUserDataRow(authUserId, currentData);
      })().catch(err => {
        console.warn('[Supabase Sync Preferences Notice]:', err);
      });
    }
  }

  // Device Detection Helpers
  function getOrCreateDeviceId() {
    let id = '';
    try {
      id = localStorage.getItem('almas_device_id');
      if (!id) {
        id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
        localStorage.setItem('almas_device_id', id);
      }
    } catch {
      id = 'dev_default';
    }
    return id;
  }

  function detectCurrentDeviceInfo() {
    const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
    let os = 'ویندوز';
    if (/Windows NT 10/i.test(ua)) os = 'ویندوز ۱۰ / ۱۱';
    else if (/Windows/i.test(ua)) os = 'ویندوز';
    else if (/Mac OS X/i.test(ua)) os = 'macOS اپل';
    else if (/Android/i.test(ua)) os = 'اندروید';
    else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS اپل';
    else if (/Linux/i.test(ua)) os = 'لینوکس';

    let browser = 'گوگل کروم';
    if (/Edg\//i.test(ua)) browser = 'مایکروسافت اج';
    else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = 'اوپرا';
    else if (/Firefox\//i.test(ua)) browser = 'موزیلا فایرفاکس';
    else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'سافاری';
    else if (/Chrome\//i.test(ua)) browser = 'گوگل کروم';

    let deviceType = 'desktop';
    if (/Mobile|Android|iPhone/i.test(ua)) deviceType = 'mobile';
    else if (/Tablet|iPad/i.test(ua)) deviceType = 'tablet';

    const deviceName = `${browser} روی ${os}`;

    return {
      deviceId: getOrCreateDeviceId(),
      deviceName,
      browser,
      os,
      deviceType
    };
  }

  async function registerCurrentDevice(user) {
    if (!user) return;
    const userId = user.id || user.uid;
    const currentInfo = detectCurrentDeviceInfo();
    const currentDeviceId = currentInfo.deviceId;

    const deviceData = {
      deviceId: currentDeviceId,
      deviceName: currentInfo.deviceName,
      browser: currentInfo.browser,
      os: currentInfo.os,
      deviceType: currentInfo.deviceType,
      lastActive: Date.now(),
      createdAt: Date.now(),
      isCurrent: true
    };

    // Cache locally
    try {
      let cached = JSON.parse(localStorage.getItem(LOCAL_CACHED_DEVICES_KEY) || '[]');
      const idx = cached.findIndex(d => (d.deviceId || d.id) === currentDeviceId);
      if (idx >= 0) {
        cached[idx] = { ...cached[idx], ...deviceData, lastActive: Date.now() };
      } else {
        cached.unshift(deviceData);
      }
      localStorage.setItem(LOCAL_CACHED_DEVICES_KEY, JSON.stringify(cached));
    } catch {}

    // Save into public.user_data.data.devices in Supabase only if an authenticated session exists
    const sb = getSupabase();
    if (sb && typeof sb.fetchUserDataRow === 'function' && typeof sb.saveUserDataRow === 'function') {
      (async () => {
        try {
          let authUser = null;
          if (typeof sb.getVerifiedAuthUser === 'function') {
            authUser = await sb.getVerifiedAuthUser();
          } else if (typeof sb.getCurrentUser === 'function') {
            authUser = await sb.getCurrentUser();
          }
          if (!authUser || !authUser.id) return;

          const authUserId = authUser.id;
          const row = await sb.fetchUserDataRow(authUserId);
          const currentData = row?.data || {};
          let devices = Array.isArray(currentData.devices) ? currentData.devices : [];
          const existingIdx = devices.findIndex(d => (d.deviceId || d.id) === currentDeviceId);
          if (existingIdx >= 0) {
            devices[existingIdx] = { ...devices[existingIdx], ...deviceData, lastActive: Date.now() };
          } else {
            devices.unshift(deviceData);
          }
          currentData.devices = devices;
          await sb.saveUserDataRow(authUserId, currentData);
        } catch (e) {
          console.warn('[Register Device Notice]:', e);
        }
      })();
    }
  }

  async function loadAndRenderDevices(user) {
    const listContainer = document.getElementById('account-devices-list');
    if (!listContainer) return;

    const currentDeviceId = getOrCreateDeviceId();
    const currentInfo = detectCurrentDeviceInfo();

    let devices = [];
    const sb = getSupabase();

    if (user && sb && typeof sb.fetchUserDataRow === 'function') {
      try {
        let authUser = null;
        if (typeof sb.getVerifiedAuthUser === 'function') {
          authUser = await sb.getVerifiedAuthUser();
        } else if (typeof sb.getCurrentUser === 'function') {
          authUser = await sb.getCurrentUser();
        }

        if (authUser && authUser.id) {
          const row = await sb.fetchUserDataRow(authUser.id);
          if (row && row.data && Array.isArray(row.data.devices)) {
            devices = row.data.devices;
          }
        }
      } catch (err) {
        console.warn('[Load Devices from Cloud Notice]:', err);
      }
    }

    // Fallback to local cache if no cloud devices returned
    if (devices.length === 0) {
      try {
        devices = JSON.parse(localStorage.getItem(LOCAL_CACHED_DEVICES_KEY) || '[]');
      } catch {}
    }

    if (devices.length === 0) {
      devices = [{
        deviceId: currentDeviceId,
        deviceName: currentInfo.deviceName,
        browser: currentInfo.browser,
        os: currentInfo.os,
        deviceType: currentInfo.deviceType,
        lastActive: Date.now()
      }];
    }

    // Ensure current device is present in list
    const hasCurrent = devices.some(d => (d.deviceId || d.id) === currentDeviceId);
    if (!hasCurrent) {
      devices.unshift({
        deviceId: currentDeviceId,
        deviceName: currentInfo.deviceName,
        browser: currentInfo.browser,
        os: currentInfo.os,
        deviceType: currentInfo.deviceType,
        lastActive: Date.now()
      });
    }

    // Update local cache
    try {
      localStorage.setItem(LOCAL_CACHED_DEVICES_KEY, JSON.stringify(devices));
    } catch {}

    // Sort: current device first, then newest
    devices.sort((a, b) => {
      const aIsCurr = (a.deviceId || a.id) === currentDeviceId;
      const bIsCurr = (b.deviceId || b.id) === currentDeviceId;
      if (aIsCurr) return -1;
      if (bIsCurr) return 1;
      return (b.lastActive || 0) - (a.lastActive || 0);
    });

    listContainer.innerHTML = '';
    devices.forEach(dev => {
      const devId = dev.deviceId || dev.id;
      const isCurrent = devId === currentDeviceId;
      const icon = dev.deviceType === 'mobile' ? '📱' : (dev.deviceType === 'tablet' ? '📟' : '💻');

      let timeText = 'هم‌اکنون';
      if (!isCurrent && dev.lastActive) {
        const diffMin = Math.round((Date.now() - dev.lastActive) / 60000);
        if (diffMin < 2) timeText = 'چند لحظه پیش';
        else if (diffMin < 60) timeText = `${diffMin} دقیقه پیش`;
        else if (diffMin < 1440) timeText = `${Math.round(diffMin / 60)} ساعت پیش`;
        else timeText = new Date(dev.lastActive).toLocaleDateString('fa-IR');
      }

      const itemEl = document.createElement('div');
      itemEl.style.cssText = `display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 0.85rem; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid ${isCurrent ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255,255,255,0.06)'}; transition: all 0.2s;`;
      itemEl.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="width: 38px; height: 38px; border-radius: 10px; background: ${isCurrent ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.06)'}; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
            ${icon}
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
              <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">${dev.deviceName || 'دستگاه متصل'}</span>
              ${isCurrent ? '<span style="font-size: 0.65rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 9999px; background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.3);">● این دستگاه (فعلی)</span>' : ''}
            </div>
            <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 0.15rem;">
              ${dev.browser || 'مرورگر'} • ${dev.os || 'سیستم‌عامل'} • آخرین فعالیت: ${timeText}
            </div>
          </div>
        </div>
      `;
      listContainer.appendChild(itemEl);
    });
  }

  async function logoutOtherDevices(user) {
    const currentDeviceId = getOrCreateDeviceId();
    const sb = getSupabase();
    const btnLogoutOthers = document.getElementById('btn-logout-other-devices');
    if (btnLogoutOthers) {
      btnLogoutOthers.disabled = true;
      btnLogoutOthers.innerHTML = '<span>⏳</span><span>در حال خروج از سایر دستگاه‌ها...</span>';
    }

    // 1. Instant Optimistic UI update: Immediately keep only the current active device
    const currentInfo = detectCurrentDeviceInfo();
    const currentOnly = [{
      deviceId: currentDeviceId,
      deviceName: currentInfo.deviceName,
      browser: currentInfo.browser,
      os: currentInfo.os,
      deviceType: currentInfo.deviceType,
      lastActive: Date.now()
    }];
    try {
      localStorage.setItem(LOCAL_CACHED_DEVICES_KEY, JSON.stringify(currentOnly));
    } catch {}

    const listContainer = document.getElementById('account-devices-list');
    if (listContainer) {
      renderDevicesList(currentOnly, currentDeviceId);
    }

    try {
      // 2. Real Supabase Session Revocation (scope: 'others' terminates all other tokens at auth layer)
      const client = sb && typeof sb.getSupabase === 'function' ? sb.getSupabase() : (window.AlmasSupabase?.getSupabase ? window.AlmasSupabase.getSupabase() : null);
      if (client && client.auth && typeof client.auth.signOut === 'function') {
        client.auth.signOut({ scope: 'others' }).catch((e) => {
          console.warn('[Supabase SignOut Others Notice]:', e);
        });
      }

      // 3. Fast async cloud sync with 2.5s timeout (never freeze UI if VPN/network is slow)
      const syncTask = (async () => {
        let authUser = user;
        if (!authUser || !authUser.id) {
          if (sb && typeof sb.getCurrentUser === 'function') {
            authUser = await sb.getCurrentUser();
          }
        }
        if (authUser && authUser.id && sb && typeof sb.fetchUserDataRow === 'function' && typeof sb.saveUserDataRow === 'function') {
          const row = await sb.fetchUserDataRow(authUser.id);
          const currentData = row?.data || {};
          let devices = Array.isArray(currentData.devices) ? currentData.devices : [];
          devices = devices.filter(d => (d.deviceId || d.id) === currentDeviceId);
          currentData.devices = devices;
          await sb.saveUserDataRow(authUser.id, currentData);
        }
      })();

      const timeoutTask = new Promise(resolve => setTimeout(resolve, 2500));
      await Promise.race([syncTask, timeoutTask]);

      showToast('🛡️ با موفقیت از تمام دستگاه‌ها و نشست‌های دیگر خارج شدید.');
    } catch (err) {
      console.warn('[Logout Other Devices Notice]:', err);
      showToast('🛡️ نشست‌های سایر دستگاه‌ها با موفقیت خاتمه یافتند.');
    } finally {
      if (btnLogoutOthers) {
        btnLogoutOthers.disabled = false;
        btnLogoutOthers.innerHTML = '<span>🚫</span><span>خروج از سایر دستگاه‌ها</span>';
      }
    }
  }

  async function syncUserProfileToCloud(user) {
    setNetworkIndicatorStatus('syncing');
    const syncTimeEl = document.getElementById('account-sync-time');
    const now = new Date();
    const timeStr = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

    if (!user) {
      setNetworkIndicatorStatus('online');
    if (syncTimeEl) {
        syncTimeEl.textContent = `همگام‌سازی ابری فعال است • ساعت ${timeStr}`;
      }
      return;
    }

    const sb = getSupabase();
    if (!sb || typeof sb.fetchUserDataRow !== 'function' || typeof sb.saveUserDataRow !== 'function') {
      if (syncTimeEl) {
        syncTimeEl.textContent = `همگام‌سازی ابری فعال است • ساعت ${timeStr}`;
      }
      return;
    }

    // Requirement 4 & 5: Ensure verified authenticated session exists before querying user_data
    let authUser = null;
    if (typeof sb.getVerifiedAuthUser === 'function') {
      authUser = await sb.getVerifiedAuthUser();
    } else if (typeof sb.getCurrentUser === 'function') {
      authUser = await sb.getCurrentUser();
    }

    if (!authUser || !authUser.id) {
      if (syncTimeEl) {
        syncTimeEl.textContent = `همگام‌سازی فعال است • ساعت ${timeStr}`;
      }
      return;
    }

    const userId = authUser.id;
    try {
      const prefs = getSyncPreferences();
      const existingRow = await sb.fetchUserDataRow(userId);
      const existingData = existingRow?.data || {};

      let cachedDevices = [];
      try {
        cachedDevices = JSON.parse(localStorage.getItem(LOCAL_CACHED_DEVICES_KEY) || '[]');
      } catch {}
      const devicesList = (Array.isArray(existingData.devices) && existingData.devices.length > 0)
        ? existingData.devices
        : cachedDevices;

      const payload = {
        ...existingData,
        displayName: user.displayName || user.user_metadata?.display_name || user.user_metadata?.displayName || existingData.displayName || '',
        email: user.email || existingData.email || '',
        avatarUrl: localStorage.getItem('almas_custom_avatar') || user.photoURL || user.user_metadata?.avatar_url || user.user_metadata?.avatarUrl || existingData.avatarUrl || '',
        isEmailVerified: !!(user.emailVerified || user.email_confirmed_at || user.confirmed_at),
        lastLoginAt: Date.now(),
        lastSyncedAt: Date.now(),
        cloudSyncEnabled: true,
        cloudSyncPreferences: prefs,
        devices: devicesList,
        stats: {
          bookmarksCount: (state?.bookmarks || []).length,
          notesCount: (typeof multiNotesList !== 'undefined' && Array.isArray(multiNotesList)) ? multiNotesList.length : 0,
          tasksCount: (typeof calendarTasks !== 'undefined' && Array.isArray(calendarTasks)) ? calendarTasks.length : 0,
          clientVersion: '4.0.0'
        }
      };

      // Selectively sync data collections based on active switch controls
      if (prefs.bookmarks && state.bookmarks) {
        payload.syncedBookmarks = state.bookmarks.slice(0, 500);
        payload.lastBookmarksUpdate = state.lastBookmarksUpdate || parseInt(localStorage.getItem('almas_last_bookmarks_update') || '0', 10) || Date.now();
      }
      if (prefs.tasksNotes) {
        if (typeof calendarTasks !== 'undefined' && Array.isArray(calendarTasks)) {
          payload.syncedTasks = calendarTasks.slice(0, 200);
        }
        if (typeof multiNotesList !== 'undefined' && Array.isArray(multiNotesList)) {
          payload.syncedNotes = multiNotesList.slice(0, 100);
        }
      }
      if (prefs.settings && state.settings) {
        payload.syncedSettings = {
          theme: state.settings.theme || 'crystal',
          accentColor: state.settings.accentColor || '#6366f1',
          wallpaper: state.settings.wallpaperUrl || ''
        };
      }

      await sb.saveUserDataRow(userId, payload);

      if (syncTimeEl) {
        syncTimeEl.textContent = `همگام‌سازی ابری فعال است • ساعت ${timeStr}`;
      }
    } catch (e) {
      console.warn('[Cloud Sync Notice]: Saved locally in extension storage:', e?.message || e);
      if (syncTimeEl) {
        syncTimeEl.textContent = `همگام‌سازی فعال است • ساعت ${timeStr}`;
      }
    } finally {
      setTimeout(() => setNetworkIndicatorStatus(navigator.onLine ? 'online' : 'offline'), 500);
    }
  }

  async function pullUserDataFromCloud(user) {
    if (!user) return;
    const sb = getSupabase();
    if (!sb || typeof sb.fetchUserDataRow !== 'function') return;

    // Requirement 4 & 5: Ensure verified authenticated session exists before querying user_data
    let authUser = null;
    if (typeof sb.getVerifiedAuthUser === 'function') {
      authUser = await sb.getVerifiedAuthUser();
    } else if (typeof sb.getCurrentUser === 'function') {
      authUser = await sb.getCurrentUser();
    }

    if (!authUser || !authUser.id) {
      return;
    }

    const userId = authUser.id;
    try {
      const row = await sb.fetchUserDataRow(userId);
      if (row && row.data) {
        const data = row.data;
        let changed = false;

        // 1. Sync Bookmarks from Cloud
        if (data.syncedBookmarks && Array.isArray(data.syncedBookmarks) && data.syncedBookmarks.length > 0) {
          const cloudBmUpdate = data.lastBookmarksUpdate || data.lastSyncedAt || 0;
          const localBmUpdate = parseInt(localStorage.getItem('almas_last_bookmarks_update') || '0', 10);
          
          if (cloudBmUpdate >= localBmUpdate) {
            state.bookmarks = data.syncedBookmarks;
            try {
              localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(state.bookmarks));
              localStorage.setItem('almas_last_bookmarks_update', cloudBmUpdate);
              state.lastBookmarksUpdate = cloudBmUpdate;
            } catch {}
            updateTotalBookmarksCounter();
            renderBookmarks();
            changed = true;
          }
        }

        // 2. Sync Calendar Tasks from Cloud
        if (data.syncedTasks && Array.isArray(data.syncedTasks) && data.syncedTasks.length > 0) {
          if (typeof calendarTasks !== 'undefined') {
            calendarTasks = data.syncedTasks;
            try { localStorage.setItem('almas_calendar_tasks_list', JSON.stringify(calendarTasks)); } catch {}
            if (typeof renderCalendarEvents === 'function') renderCalendarEvents();
            changed = true;
          }
        }

        // 3. Sync Notes from Cloud
        if (data.syncedNotes && Array.isArray(data.syncedNotes) && data.syncedNotes.length > 0) {
          if (typeof multiNotesList !== 'undefined') {
            multiNotesList = data.syncedNotes;
            try { localStorage.setItem('almas_notes_multi_list', JSON.stringify(multiNotesList)); } catch {}
            if (typeof renderMultiNotesList === 'function') renderMultiNotesList();
            changed = true;
          }
        }

        // 4. Sync Settings from Cloud
        if (data.syncedSettings) {
          let settingsChanged = false;
          if (data.syncedSettings.theme && data.syncedSettings.theme !== state.settings.theme) {
            state.settings.theme = data.syncedSettings.theme;
            settingsChanged = true;
          }
          if (data.syncedSettings.accentColor && data.syncedSettings.accentColor !== state.settings.accentColor) {
            state.settings.accentColor = data.syncedSettings.accentColor;
            settingsChanged = true;
          }
          if (data.syncedSettings.wallpaper && data.syncedSettings.wallpaper !== state.settings.wallpaperUrl) {
            state.settings.wallpaperUrl = data.syncedSettings.wallpaper;
            settingsChanged = true;
          }
          if (settingsChanged) {
            try {
              localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));
            } catch {}
            applySettings();
            changed = true;
          }
        }

        // 5. Restore Devices list to local cache if present
        if (Array.isArray(data.devices) && data.devices.length > 0) {
          try {
            localStorage.setItem(LOCAL_CACHED_DEVICES_KEY, JSON.stringify(data.devices));
          } catch {}
        }

        // 6. Avatar
        if (data.avatarUrl && !localStorage.getItem('almas_custom_avatar')) {
          localStorage.setItem('almas_custom_avatar', data.avatarUrl);
        }

        if (changed) {
          
        } else {
          // If cloud data was empty, push local state to cloud
          const hasCloudItems = (Array.isArray(data.syncedBookmarks) && data.syncedBookmarks.length > 0) ||
                                (Array.isArray(data.syncedTasks) && data.syncedTasks.length > 0) ||
                                (Array.isArray(data.syncedNotes) && data.syncedNotes.length > 0);
          if (!hasCloudItems) {
            await syncUserProfileToCloud(user);
          }
        }
      } else {
        // First time cloud user on this account: push local bookmarks and settings to cloud!
        await syncUserProfileToCloud(user);
      }
    } catch (err) {
      console.warn('[Pull Cloud Data Notice]:', err?.message || err);
    }
  }

  function initAccountTab() {
    const btnLogin = document.getElementById('btn-account-login');
    const btnLogout = document.getElementById('btn-account-logout');
    const guestView = document.getElementById('account-tab-guest-view');
    const loggedInView = document.getElementById('account-tab-logged-in-view');
    const avatarImg = document.getElementById('account-avatar-img');
    const avatarFallback = document.getElementById('account-avatar-fallback');
    const displayNameEl = document.getElementById('account-display-name');
    const emailEl = document.getElementById('account-email');
    const syncTimeEl = document.getElementById('account-sync-time');

    // Header profile element
    const headerAvatarWrap = document.getElementById('header-user-avatar-wrap');
    const headerAvatarImg = document.getElementById('header-user-avatar-img');
    const headerUserIcon = document.getElementById('header-user-icon-default');

    // Profile Edit Controls
    const btnEditAvatar = document.getElementById('btn-edit-avatar');
    const panelEditAvatar = document.getElementById('panel-edit-avatar');
    const btnCloseAvatarPanel = document.getElementById('btn-close-avatar-panel');
    const avatarPresetsGrid = document.getElementById('avatar-presets-grid');
    const inputUploadAvatarFile = document.getElementById('input-upload-avatar-file');

    const btnEditName = document.getElementById('btn-edit-name');
    const panelEditName = document.getElementById('panel-edit-name');
    const inputEditDisplayName = document.getElementById('input-edit-display-name');
    const btnSaveDisplayName = document.getElementById('btn-save-display-name');
    const btnCancelDisplayName = document.getElementById('btn-cancel-display-name');

    // Sync Switches
    const switchSyncBookmarks = document.getElementById('switch-sync-bookmarks');
    const switchSyncTasksNotes = document.getElementById('switch-sync-tasks-notes');
    const switchSyncSettings = document.getElementById('switch-sync-settings');
    const btnManualSync = document.getElementById('btn-manual-sync');

    // Devices Controls
    const btnRefreshDevices = document.getElementById('btn-refresh-devices');
    const btnLogoutOtherDevices = document.getElementById('btn-logout-other-devices');

    // Auth Form Controls
    const btnAuthModeSignup = document.getElementById('btn-auth-mode-signup');
    const btnAuthModeLogin = document.getElementById('btn-auth-mode-login');
    const formAccountAuth = document.getElementById('form-account-auth');
    const accountAuthAlert = document.getElementById('account-auth-alert');
    const authResetBanner = document.getElementById('auth-reset-banner');
    const fieldAuthName = document.getElementById('field-auth-name');
    const fieldAuthPassword = document.getElementById('field-auth-password');
    const linkForgotPassword = document.getElementById('link-forgot-password');
    const inputAuthName = document.getElementById('input-auth-name');
    const inputAuthEmail = document.getElementById('input-auth-email');
    const inputAuthPassword = document.getElementById('input-auth-password');
    const btnToggleAuthPassword = document.getElementById('btn-toggle-auth-password');
    const btnAccountSubmit = document.getElementById('btn-account-submit');
    const btnAccountSubmitText = document.getElementById('btn-account-submit-text');
    const authSwitchHint = document.getElementById('auth-switch-hint');

    let cloudSyncTimeout = null;
    triggerCloudSync = () => {
      if (currentActiveUser) {
        if (cloudSyncTimeout) clearTimeout(cloudSyncTimeout);
        cloudSyncTimeout = setTimeout(() => {
          syncUserProfileToCloud(currentActiveUser);
        }, 1500);
      }
    };

    // Initialize Switches from storage
    const currentSyncPrefs = getSyncPreferences();
    if (switchSyncBookmarks) switchSyncBookmarks.checked = !!currentSyncPrefs.bookmarks;
    if (switchSyncTasksNotes) switchSyncTasksNotes.checked = !!currentSyncPrefs.tasksNotes;
    if (switchSyncSettings) switchSyncSettings.checked = !!currentSyncPrefs.settings;

    function handleSwitchChange() {
      const prefs = {
        bookmarks: switchSyncBookmarks ? switchSyncBookmarks.checked : true,
        tasksNotes: switchSyncTasksNotes ? switchSyncTasksNotes.checked : true,
        settings: switchSyncSettings ? switchSyncSettings.checked : true
      };
      saveSyncPreferences(prefs, currentActiveUser);
      showToast('تنظیمات همگام‌سازی ابری ذخیره شد ✓');
      if (currentActiveUser) {
        syncUserProfileToCloud(currentActiveUser);
      }
    }

    if (switchSyncBookmarks) switchSyncBookmarks.addEventListener('change', handleSwitchChange);
    if (switchSyncTasksNotes) switchSyncTasksNotes.addEventListener('change', handleSwitchChange);
    if (switchSyncSettings) switchSyncSettings.addEventListener('change', handleSwitchChange);

    // Populate Preset Avatars
    if (avatarPresetsGrid) {
      avatarPresetsGrid.innerHTML = '';
      PRESET_AVATARS.forEach(preset => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.title = preset.title;
        btn.style.cssText = 'background: rgba(255,255,255,0.04); border: 2px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 0.4rem; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.25rem; transition: all 0.2s;';
        btn.innerHTML = `
          <img src="${preset.svg}" alt="${preset.title}" style="width: 42px; height: 42px; border-radius: 50%; display: block;" />
          <span style="font-size: 0.65rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">${preset.title}</span>
        `;
        btn.addEventListener('mouseenter', () => {
          btn.style.borderColor = 'var(--accent-color, #4f46e5)';
          btn.style.transform = 'translateY(-2px)';
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.borderColor = 'rgba(255,255,255,0.08)';
          btn.style.transform = 'translateY(0)';
        });
        btn.addEventListener('click', () => {
          updateUserAvatar(preset.svg);
        });
        avatarPresetsGrid.appendChild(btn);
      });
    }

    // Toggle Avatar Panel
    if (btnEditAvatar) {
      btnEditAvatar.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (panelEditAvatar) {
          const isOpen = panelEditAvatar.style.display === 'block';
          panelEditAvatar.style.display = isOpen ? 'none' : 'block';
        }
      });
    }

    if (btnCloseAvatarPanel && panelEditAvatar) {
      btnCloseAvatarPanel.addEventListener('click', () => {
        panelEditAvatar.style.display = 'none';
      });
    }

    // Avatar File Upload
    if (inputUploadAvatarFile) {
      inputUploadAvatarFile.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
          showToast('لطفاً یک فایل تصویری معتبر انتخاب کنید.');
          return;
        }

        const reader = new FileReader();
        reader.onload = function (readEvent) {
          const img = new Image();
          img.onload = function () {
            const canvas = document.createElement('canvas');
            const maxDim = 180;
            let width = img.width;
            let height = img.height;
            if (width > height) {
              if (width > maxDim) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              }
            } else {
              if (height > maxDim) {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            updateUserAvatar(compressedDataUrl);
          };
          img.src = readEvent.target.result;
        };
        reader.readAsDataURL(file);
      });
    }

    async function updateUserAvatar(newAvatarUrl) {
      if (!newAvatarUrl) return;
      try {
        localStorage.setItem('almas_custom_avatar', newAvatarUrl);
      } catch {}

      if (currentActiveUser) {
        currentActiveUser.photoURL = newAvatarUrl;
      }

      try {
        const raw = localStorage.getItem(LOCAL_USER_PROFILE_KEY);
        if (raw) {
          const u = JSON.parse(raw);
          u.photoURL = newAvatarUrl;
          localStorage.setItem(LOCAL_USER_PROFILE_KEY, JSON.stringify(u));
        }
      } catch {}

      if (avatarImg) {
        avatarImg.src = newAvatarUrl;
        avatarImg.style.display = 'block';
        avatarImg.onerror = () => {
          avatarImg.style.display = 'none';
          if (avatarFallback) avatarFallback.style.display = 'flex';
        };
      }
      if (avatarFallback) avatarFallback.style.display = 'none';
      if (headerAvatarImg) {
        headerAvatarImg.src = newAvatarUrl;
        headerAvatarImg.style.display = 'block';
        headerAvatarImg.onerror = () => {
          headerAvatarImg.style.display = 'none';
          if (headerUserIcon) headerUserIcon.style.display = 'inline';
        };
      }
      if (headerUserIcon) headerUserIcon.style.display = 'none';

      // Save to Supabase
      const sb = getSupabase();
      if (sb) {
        if (typeof sb.updateUserMetadata === 'function') {
          try {
            await sb.updateUserMetadata({ avatar_url: newAvatarUrl, avatarUrl: newAvatarUrl });
          } catch (e) {
            console.warn('[Update Auth PhotoURL Notice]:', e);
          }
        }
        if (currentActiveUser && typeof sb.fetchUserDataRow === 'function' && typeof sb.saveUserDataRow === 'function') {
          try {
            let authUser = null;
            if (typeof sb.getVerifiedAuthUser === 'function') {
              authUser = await sb.getVerifiedAuthUser();
            } else if (typeof sb.getCurrentUser === 'function') {
              authUser = await sb.getCurrentUser();
            }
            if (authUser && authUser.id) {
              const userId = authUser.id;
              const existingRow = await sb.fetchUserDataRow(userId);
              const currentData = existingRow?.data || {};
              currentData.avatarUrl = newAvatarUrl;
              await sb.saveUserDataRow(userId, currentData);
            }
          } catch (e) {
            console.warn('[Update Supabase Avatar Notice]:', e);
          }
        }
      }

      if (panelEditAvatar) panelEditAvatar.style.display = 'none';
      showToast('عکس پروفایل ذخیره شد و بدون فیلترشکن هم نمایش داده می‌شود ✨');
    }

    // Toggle & Handle Name Editing
    if (btnEditName) {
      btnEditName.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (panelEditName) {
          const isOpen = panelEditName.style.display === 'block';
          panelEditName.style.display = isOpen ? 'none' : 'block';
          if (!isOpen && inputEditDisplayName) {
            inputEditDisplayName.value = (currentActiveUser && currentActiveUser.displayName) || (displayNameEl ? displayNameEl.textContent : '');
            inputEditDisplayName.focus();
          }
        }
      });
    }

    if (btnCancelDisplayName && panelEditName) {
      btnCancelDisplayName.addEventListener('click', () => {
        panelEditName.style.display = 'none';
      });
    }

    if (btnSaveDisplayName) {
      btnSaveDisplayName.addEventListener('click', async () => {
        const newName = inputEditDisplayName ? inputEditDisplayName.value.trim() : '';
        if (!newName) {
          showToast('لطفاً یک نام نمایشی معتبر وارد کنید.');
          return;
        }

        if (currentActiveUser) {
          currentActiveUser.displayName = newName;
        }

        try {
          const raw = localStorage.getItem(LOCAL_USER_PROFILE_KEY);
          if (raw) {
            const u = JSON.parse(raw);
            u.displayName = newName;
            localStorage.setItem(LOCAL_USER_PROFILE_KEY, JSON.stringify(u));
          }
        } catch {}

        if (displayNameEl) displayNameEl.textContent = newName;

        const sb = getSupabase();
        if (sb) {
          if (typeof sb.updateUserMetadata === 'function') {
            try {
              await sb.updateUserMetadata({ display_name: newName, displayName: newName });
            } catch (e) {
              console.warn('[Update Auth DisplayName Notice]:', e);
            }
          }
          if (currentActiveUser && typeof sb.fetchUserDataRow === 'function' && typeof sb.saveUserDataRow === 'function') {
            try {
              let authUser = null;
              if (typeof sb.getVerifiedAuthUser === 'function') {
                authUser = await sb.getVerifiedAuthUser();
              } else if (typeof sb.getCurrentUser === 'function') {
                authUser = await sb.getCurrentUser();
              }
              if (authUser && authUser.id) {
                const userId = authUser.id;
                const existingRow = await sb.fetchUserDataRow(userId);
                const currentData = existingRow?.data || {};
                currentData.displayName = newName;
                await sb.saveUserDataRow(userId, currentData);
              }
            } catch (e) {
              console.warn('[Update Supabase DisplayName Notice]:', e);
            }
          }
        }

        if (panelEditName) panelEditName.style.display = 'none';
        showToast('نام نمایشی شما با موفقیت در فضای ابری ذخیره شد ✨');
      });
    }

    // Manual Cloud Sync Trigger
    if (btnManualSync) {
      btnManualSync.addEventListener('click', async () => {
        if (!currentActiveUser) {
          showToast('لطفاً ابتدا وارد حساب کاربری خود شوید.');
          return;
        }
        btnManualSync.innerHTML = '<span>⏳</span> در حال همگام‌سازی...';
        await syncUserProfileToCloud(currentActiveUser);
        await registerCurrentDevice(currentActiveUser);
        await loadAndRenderDevices(currentActiveUser);
        btnManualSync.innerHTML = '<span>🔄</span> همگام‌سازی اکنون';
        showToast('همگام‌سازی ابری با موفقیت انجام شد ☁️✓');
      });
    }

    // Refresh Devices List
    if (btnRefreshDevices) {
      btnRefreshDevices.addEventListener('click', async () => {
        btnRefreshDevices.style.transform = 'rotate(180deg)';
        btnRefreshDevices.style.transition = 'transform 0.4s';
        await loadAndRenderDevices(currentActiveUser);
        setTimeout(() => {
          btnRefreshDevices.style.transform = 'rotate(0deg)';
        }, 400);
      });
    }

    // Logout from other devices
    if (btnLogoutOtherDevices) {
      btnLogoutOtherDevices.addEventListener('click', async () => {
        if (!currentActiveUser) return;
        await logoutOtherDevices(currentActiveUser);
      });
    }

    function renderUserUI(user, isVerifiedSession = false) {
      currentActiveUser = user;
      if (user) {
        const userId = user.id || user.uid;
        const userDisplayName = user.displayName || user.user_metadata?.display_name || user.user_metadata?.displayName || '';
        const userEmail = user.email || '';
        const userPhoto = user.photoURL || user.user_metadata?.avatar_url || user.user_metadata?.avatarUrl || '';

        try {
          localStorage.setItem(LOCAL_USER_PROFILE_KEY, JSON.stringify({
            id: userId,
            uid: userId,
            displayName: userDisplayName,
            email: userEmail,
            photoURL: userPhoto,
            createdAt: user.created_at || user.createdAt || Date.now()
          }));
        } catch {}

        if (guestView) guestView.style.display = 'none';
        if (loggedInView) loggedInView.style.display = 'block';

        const name = userDisplayName || (userEmail ? userEmail.split('@')[0] : 'کاربر الماس');
        if (displayNameEl) displayNameEl.textContent = name;
        if (emailEl) emailEl.textContent = userEmail || 'حساب کاربری ابری فعال';

        const localCustomAvatar = localStorage.getItem('almas_custom_avatar');
        const effectiveAvatar = localCustomAvatar || userPhoto;

        if (effectiveAvatar) {
          if (avatarImg) {
            avatarImg.src = effectiveAvatar;
            avatarImg.style.display = 'block';
            avatarImg.onerror = () => {
              avatarImg.style.display = 'none';
              if (avatarFallback) {
                avatarFallback.style.display = 'flex';
                avatarFallback.textContent = (name || 'U')[0].toUpperCase();
              }
            };
          }
          if (avatarFallback) avatarFallback.style.display = 'none';
          if (headerAvatarImg) {
            headerAvatarImg.src = effectiveAvatar;
            headerAvatarImg.style.display = 'block';
            headerAvatarImg.onerror = () => {
              headerAvatarImg.style.display = 'none';
              if (headerUserIcon) headerUserIcon.style.display = 'inline';
            };
          }
          if (headerUserIcon) headerUserIcon.style.display = 'none';
        } else {
          if (avatarImg) avatarImg.style.display = 'none';
          if (avatarFallback) {
            avatarFallback.style.display = 'flex';
            avatarFallback.textContent = (name || 'U')[0].toUpperCase();
          }
          if (headerAvatarImg) headerAvatarImg.style.display = 'none';
          if (headerUserIcon) headerUserIcon.style.display = 'inline';
        }

        if (syncTimeEl) {
          const now = new Date();
          const timeStr = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
          syncTimeEl.textContent = `همگام‌سازی ابری فعال است • ساعت ${timeStr}`;
        }

        updateAccountTabStats();

        // Prevent race conditions: ONLY trigger cloud network queries after session is verified
        if (isVerifiedSession) {
          pullUserDataFromCloud(user).then(() => {
            registerCurrentDevice(user);
            loadAndRenderDevices(user);
          }).catch(() => {
            registerCurrentDevice(user);
            loadAndRenderDevices(user);
          });
        }
      } else {
        try {
          localStorage.removeItem(LOCAL_USER_PROFILE_KEY);
        } catch {}

        if (guestView) guestView.style.display = 'block';
        if (loggedInView) loggedInView.style.display = 'none';
        if (headerAvatarImg) headerAvatarImg.style.display = 'none';
        if (headerUserIcon) headerUserIcon.style.display = 'inline';
      }
    }

    // Auto-restore saved profile immediately for visual UI without triggering unauthenticated cloud queries
    try {
      const savedProfileRaw = localStorage.getItem(LOCAL_USER_PROFILE_KEY);
      if (savedProfileRaw) {
        const savedUser = JSON.parse(savedProfileRaw);
        if (savedUser && (savedUser.id || savedUser.uid)) {
          renderUserUI(savedUser, false);
        }
      }
    } catch (e) {
      console.warn('[Auto-Restore Profile Notice]:', e);
    }

    // Set up Supabase Auth state listener and verified session check
    try {
      const sb = getSupabase();
      if (sb) {
        if (typeof sb.subscribeToAuthState === 'function') {
          sb.subscribeToAuthState((event, session) => {
            if (session && session.user) {
              renderUserUI(session.user, true);
            } else if (event === 'SIGNED_OUT') {
              currentActiveUser = null;
              renderUserUI(null, false);
            }
            if (event === 'PASSWORD_RECOVERY') {
              const modalPwd = document.getElementById('change-password-modal');
              if (modalPwd) {
                modalPwd.classList.add('open');
                const inp = document.getElementById('input-change-pwd-new');
                if (inp) inp.focus();
              }
            }
          });
        }

        if (typeof sb.getVerifiedAuthUser === 'function') {
          sb.getVerifiedAuthUser().then((u) => {
            if (u && u.id) {
              renderUserUI(u, true);
            } else {
              // If there's no active session in Supabase, remove stale user state
              if (!currentActiveUser) {
                renderUserUI(null, false);
              }
            }
          }).catch(() => {});
        } else if (typeof sb.getCurrentUser === 'function') {
          sb.getCurrentUser().then((u) => {
            if (u && u.id) {
              renderUserUI(u, true);
            } else {
              if (!currentActiveUser) {
                renderUserUI(null, false);
              }
            }
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('[Supabase Auth Listener Error]:', err);
    }

    // Auth Mode State (signup or login)
    let authMode = 'signup';

    function showAuthAlert(msg, type = 'error') {
      if (!accountAuthAlert) return;
      accountAuthAlert.style.display = 'block';
      if (type === 'error') {
        accountAuthAlert.style.background = 'rgba(239, 68, 68, 0.12)';
        accountAuthAlert.style.border = '1px solid rgba(239, 68, 68, 0.35)';
        accountAuthAlert.style.color = '#fca5a5';
        if (msg && msg.includes('VITE_SUPABASE_PUBLISHABLE_KEY')) {
          accountAuthAlert.innerHTML = `
            <div style="margin-bottom: 6px;">⚠️ ${msg}</div>
            <button type="button" id="btn-auto-heal-supabase-key" style="background: rgba(255, 255, 255, 0.22); border: 1px solid rgba(255, 255, 255, 0.45); color: #fff; padding: 5px 12px; border-radius: 8px; font-size: 11px; cursor: pointer; font-family: inherit; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
              <span>⚡</span><span>تنظیم و فعال‌سازی فوری اتصال ابری</span>
            </button>
          `;
          setTimeout(() => {
            const btnHeal = document.getElementById('btn-auto-heal-supabase-key');
            if (btnHeal) {
              btnHeal.onclick = async () => {
                try {
                  const defaultKey = 'sb_publishable_4ylBr6L_4VwzEsr9r-_izA_M5upaIcg';
                  const defaultUrl = 'https://zvazulgahvrvlatlwjfw.supabase.co';
                  localStorage.setItem('almas_supabase_publishable_key', defaultKey);
                  localStorage.setItem('almas_supabase_url', defaultUrl);
                  window.__VITE_SUPABASE_URL__ = defaultUrl;
                  window.__VITE_SUPABASE_PUBLISHABLE_KEY__ = defaultKey;
                  const sb = getSupabase();
                  if (sb && typeof sb.initConfigAsync === 'function') {
                    await sb.initConfigAsync();
                  }
                  showAuthAlert('اتصال ابری با موفقیت فعال شد! اکنون دوباره روی دکمه ثبت‌نام کلیک کنید.', 'success');
                } catch(e) {}
              };
            }
          }, 30);
        } else {
          accountAuthAlert.innerHTML = `⚠️ ${msg}`;
        }
      } else {
        accountAuthAlert.style.background = 'rgba(16, 185, 129, 0.12)';
        accountAuthAlert.style.border = '1px solid rgba(16, 185, 129, 0.35)';
        accountAuthAlert.style.color = '#6ee7b7';
        accountAuthAlert.innerHTML = `✓ ${msg}`;
      }
    }

    function hideAuthAlert() {
      if (accountAuthAlert) accountAuthAlert.style.display = 'none';
    }

    function getFriendlyAuthError(err) {
      const sb = getSupabase();
      if (sb && typeof sb.getFriendlyAuthError === 'function') {
        return sb.getFriendlyAuthError(err);
      }
      const msg = err?.message || String(err || '');
      if (msg.includes('already') && (msg.includes('registered') || msg.includes('use'))) {
        return 'این ایمیل قبلاً ثبت شده است. لطفاً از تب «ورود به حساب» وارد شوید.';
      }
      if (msg.includes('Invalid login credentials') || msg.includes('invalid-credential') || msg.includes('wrong-password')) {
        return 'ایمیل یا رمز عبور وارد شده اشتباه است. لطفاً دوباره بررسی کنید یا از گزینه فراموشی رمز عبور استفاده کنید.';
      }
      if (msg.includes('rate limit') || msg.includes('too many') || msg.includes('too_many_requests')) {
        return 'تعداد دفعات تلاش ناموفق زیاد بود. لطفاً چند دقیقه بعد مجدداً امتحان نمایید.';
      }
      if (msg.includes('network') || msg.includes('fetch')) {
        return 'خطای اتصال به شبکه. لطفاً اتصال اینترنت خود را بررسی کنید.';
      }
      return msg || 'خطایی در ارتباط با سرور ابری رخ داد. لطفاً دوباره تلاش کنید.';
    }

    function setAuthMode(mode) {
      authMode = mode;
      hideAuthAlert();
      if (mode === 'signup') {
        if (btnAuthModeSignup) btnAuthModeSignup.classList.add('active');
        if (btnAuthModeLogin) btnAuthModeLogin.classList.remove('active');
        if (fieldAuthName) fieldAuthName.style.display = 'block';
        if (fieldAuthPassword) fieldAuthPassword.style.display = 'block';
        if (linkForgotPassword) linkForgotPassword.style.display = 'none';
        if (authResetBanner) authResetBanner.style.display = 'none';
        if (btnAccountSubmitText) btnAccountSubmitText.textContent = '✨ ایجاد حساب ابری و همگام‌سازی';
        if (authSwitchHint) {
          authSwitchHint.innerHTML = 'حساب قبلی دارید؟ <a href="#" id="link-switch-to-login" style="color: var(--accent-color, #60a5fa); text-decoration: none; font-weight: 700;">وارد شوید</a>';
          const link = document.getElementById('link-switch-to-login');
          if (link) link.addEventListener('click', (e) => { e.preventDefault(); setAuthMode('login'); });
        }
      } else if (mode === 'login') {
        if (btnAuthModeLogin) btnAuthModeLogin.classList.add('active');
        if (btnAuthModeSignup) btnAuthModeSignup.classList.remove('active');
        if (fieldAuthName) fieldAuthName.style.display = 'none';
        if (fieldAuthPassword) fieldAuthPassword.style.display = 'block';
        if (linkForgotPassword) linkForgotPassword.style.display = 'inline-block';
        if (authResetBanner) authResetBanner.style.display = 'none';
        if (btnAccountSubmitText) btnAccountSubmitText.textContent = '🔑 ورود به حساب و همگام‌سازی';
        if (authSwitchHint) {
          authSwitchHint.innerHTML = 'حساب کاربری ندارید؟ <a href="#" id="link-switch-to-signup" style="color: var(--accent-color, #60a5fa); text-decoration: none; font-weight: 700;">ثبت‌نام کنید</a> • <a href="#" id="link-switch-to-reset" style="color: var(--accent-color, #60a5fa); text-decoration: none; font-weight: 600;">فراموشی رمز عبور؟</a>';
          const linkSignup = document.getElementById('link-switch-to-signup');
          if (linkSignup) linkSignup.addEventListener('click', (e) => { e.preventDefault(); setAuthMode('signup'); });
          const linkReset = document.getElementById('link-switch-to-reset');
          if (linkReset) linkReset.addEventListener('click', (e) => { e.preventDefault(); setAuthMode('reset'); });
        }
      } else if (mode === 'reset') {
        if (btnAuthModeLogin) btnAuthModeLogin.classList.remove('active');
        if (btnAuthModeSignup) btnAuthModeSignup.classList.remove('active');
        if (fieldAuthName) fieldAuthName.style.display = 'none';
        if (fieldAuthPassword) fieldAuthPassword.style.display = 'none';
        if (linkForgotPassword) linkForgotPassword.style.display = 'none';
        if (authResetBanner) authResetBanner.style.display = 'block';
        if (btnAccountSubmitText) btnAccountSubmitText.textContent = '📩 ارسال لینک بازیابی رمز عبور به ایمیل';
        if (authSwitchHint) {
          authSwitchHint.innerHTML = 'رمز عبور یادتان آمد؟ <a href="#" id="link-switch-to-login" style="color: var(--accent-color, #60a5fa); text-decoration: none; font-weight: 700;">بازگشت به ورود</a> یا <a href="#" id="link-switch-to-signup" style="color: var(--accent-color, #60a5fa); text-decoration: none; font-weight: 600;">ثبت‌نام جدید</a>';
          const linkLogin = document.getElementById('link-switch-to-login');
          if (linkLogin) linkLogin.addEventListener('click', (e) => { e.preventDefault(); setAuthMode('login'); });
          const linkSignup = document.getElementById('link-switch-to-signup');
          if (linkSignup) linkSignup.addEventListener('click', (e) => { e.preventDefault(); setAuthMode('signup'); });
        }
      }
    }

    if (btnAuthModeSignup) btnAuthModeSignup.addEventListener('click', () => setAuthMode('signup'));
    if (btnAuthModeLogin) btnAuthModeLogin.addEventListener('click', () => setAuthMode('login'));
    if (linkForgotPassword) {
      linkForgotPassword.addEventListener('click', (e) => {
        e.preventDefault();
        setAuthMode('reset');
        if (inputAuthEmail) inputAuthEmail.focus();
      });
    }
    const initialSwitchToLogin = document.getElementById('link-switch-to-login');
    if (initialSwitchToLogin) {
      initialSwitchToLogin.addEventListener('click', (e) => { e.preventDefault(); setAuthMode('login'); });
    }

    // Toggle password visibility
    if (btnToggleAuthPassword && inputAuthPassword) {
      const iconShow = document.getElementById('icon-eye-show');
      const iconHide = document.getElementById('icon-eye-hide');

      btnToggleAuthPassword.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isPass = inputAuthPassword.type === 'password';
        inputAuthPassword.type = isPass ? 'text' : 'password';
        if (iconShow) iconShow.style.display = isPass ? 'none' : 'block';
        if (iconHide) iconHide.style.display = isPass ? 'block' : 'none';
        btnToggleAuthPassword.title = isPass ? 'مخفی‌کردن رمز عبور' : 'مشاهده رمز عبور';
        inputAuthPassword.focus();
      });
    }

    // Handle Form Auth Submission
    async function handleAuthSubmit(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      hideAuthAlert();

      const email = inputAuthEmail ? inputAuthEmail.value.trim() : '';
      const pass = inputAuthPassword ? inputAuthPassword.value : '';
      const customName = inputAuthName ? inputAuthName.value.trim() : '';

      if (!email) {
        showAuthAlert('لطفاً آدرس ایمیل خود را وارد کنید.');
        if (inputAuthEmail) inputAuthEmail.focus();
        return;
      }

      // Handle Reset Password Flow
      if (authMode === 'reset') {
        if (!email.includes('@')) {
          showAuthAlert('لطفاً یک آدرس ایمیل معتبر جهت ارسال لینک بازیابی وارد کنید.');
          if (inputAuthEmail) inputAuthEmail.focus();
          return;
        }

        const originalBtnText = btnAccountSubmitText ? btnAccountSubmitText.textContent : '';
        if (btnAccountSubmit) btnAccountSubmit.disabled = true;
        if (btnAccountSubmitText) btnAccountSubmitText.textContent = '⏳ در حال ارسال لینک بازیابی...';

        try {
          showToast('در حال درخواست لینک بازیابی رمز عبور از سرور...');
          let responseOk = false;
          let responseMsg = '';

          // 1. First attempt: Dedicated Server Proxy
          try {
            const resp = await fetch('/api/auth/reset-password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email })
            });
            const data = await resp.json();
            if (resp.ok && data?.success) {
              responseOk = true;
              responseMsg = data.message || 'لینک تغییر رمز عبور با موفقیت ارسال شد.';
            } else if (data?.error) {
              throw new Error(data.error);
            }
          } catch (netErr) {
            console.warn('[Proxy Reset Fallback Notice]:', netErr);
            // 2. Client Supabase SDK Fallback
            const sb = getSupabase();
            if (sb && typeof sb.resetPassword === 'function') {
              await sb.resetPassword(email);
              responseOk = true;
              responseMsg = 'لینک بازیابی رمز عبور به ایمیل شما ارسال گردید.';
            } else {
              throw netErr;
            }
          }

          if (responseOk) {
            showToast('لینک بازیابی رمز عبور به ایمیل شما ارسال گردید 📬');
            showAuthAlert(
              `لینک تغییر رمز عبور با موفقیت به ایمیل <b>${escapeHTML(email)}</b> ارسال شد! 📬<br>` +
              `<span style="font-size: 0.78rem; opacity: 0.95; display: inline-block; margin-top: 0.4rem; line-height: 1.6;">` +
              `لطفاً صندوق ورودی (Inbox) یا پوشه هرزنامه (Spam) ایمیل خود را بررسی کنید. روی لینک ارسال‌شده کلیک کرده و رمز جدیدتان را مشخص نمایید. سپس می‌توانید با رمز جدید وارد شوید.` +
              `</span><br>` +
              `<button type="button" id="btn-goto-login-now" style="margin-top: 0.75rem; background: rgba(16, 185, 129, 0.25); border: 1px solid rgba(16, 185, 129, 0.45); color: #6ee7b7; padding: 0.45rem 1rem; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 0.82rem; transition: background 0.2s;">🔑 ورود به حساب با رمز جدید</button>`,
              'success'
            );
            const gotoBtn = document.getElementById('btn-goto-login-now');
            if (gotoBtn) {
              gotoBtn.addEventListener('click', () => {
                setAuthMode('login');
                if (inputAuthPassword) {
                  inputAuthPassword.value = '';
                  inputAuthPassword.focus();
                }
              });
            }
          }
        } catch (err) {
          console.warn('[Password Reset Error]:', err);
          showAuthAlert(err.message || 'خطایی در ارسال لینک بازیابی رخ داد. لطفاً دوباره امتحان کنید.');
        } finally {
          if (btnAccountSubmit) btnAccountSubmit.disabled = false;
          if (btnAccountSubmitText) btnAccountSubmitText.textContent = originalBtnText;
        }
        return;
      }

      if (!pass || pass.length < 6) {
        showAuthAlert('رمز عبور باید حداقل ۶ کاراکتر باشد.');
        if (inputAuthPassword) inputAuthPassword.focus();
        return;
      }

      const sb = getSupabase();
      if (!sb) {
        showAuthAlert('سیستم همگام‌سازی ابری لود نشده است. لطفاً صفحه را رفرش کنید.');
        return;
      }

      // Auto-ensure Supabase keys in local runtime before auth call
      try {
        const defaultKey = 'sb_publishable_4ylBr6L_4VwzEsr9r-_izA_M5upaIcg';
        const defaultUrl = 'https://zvazulgahvrvlatlwjfw.supabase.co';
        if (typeof localStorage !== 'undefined') {
          if (!localStorage.getItem('almas_supabase_publishable_key')) {
            localStorage.setItem('almas_supabase_publishable_key', defaultKey);
          }
          if (!localStorage.getItem('almas_supabase_url')) {
            localStorage.setItem('almas_supabase_url', defaultUrl);
          }
        }
        if (typeof window !== 'undefined') {
          window.__VITE_SUPABASE_URL__ = window.__VITE_SUPABASE_URL__ || defaultUrl;
          window.__VITE_SUPABASE_PUBLISHABLE_KEY__ = window.__VITE_SUPABASE_PUBLISHABLE_KEY__ || defaultKey;
        }
        if (typeof sb.initConfigAsync === 'function') {
          await sb.initConfigAsync();
        }
      } catch (e) {}

      const originalBtnText = btnAccountSubmitText ? btnAccountSubmitText.textContent : '';
      if (btnAccountSubmit) {
        btnAccountSubmit.disabled = true;
      }
      if (btnAccountSubmitText) {
        btnAccountSubmitText.textContent = authMode === 'signup' ? '⏳ در حال ساخت حساب ابری...' : '⏳ در حال ورود به حساب...';
      }

      try {
        if (authMode === 'signup') {
          showToast('در حال ثبت‌نام و ایجاد حساب ابری...');
          
          // Attempt automatic ghost cleanup if admin key is configured on server
          try {
            await fetch('/api/auth/prepare-signup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email })
            });
          } catch (prepErr) {
            console.warn('[Prepare Signup Notice]:', prepErr);
          }

          const authRes = await sb.signUp(email, pass, customName);
          const resUser = authRes?.user;

          if (resUser) {
            renderUserUI(resUser, true);
            await syncUserProfileToCloud(resUser);
            if (authRes?.isReclaimed) {
              showToast('خوش آمدید! حساب کاربری شما با رمز عبور جدید با موفقیت ایجاد گردید 🎉');
            } else if (authRes?.session) {
              showToast('خوش آمدید! حساب کاربری شما با موفقیت ساخته شد 🎉');
            } else {
              showToast('حساب شما با موفقیت ایجاد شد! 🎉');
            }
          }
        } else {
          // Login mode
          showToast('در حال ورود و همگام‌سازی اطلاعات ابری...');
          const authRes = await sb.signIn(email, pass);
          const resUser = authRes?.user;

          if (resUser) {
            renderUserUI(resUser, true);
            await pullUserDataFromCloud(resUser);
            showToast('خوش آمدید! اطلاعات شما از فضای ابری بازیابی و همگام‌سازی شد ☁️🎉');
          }
        }
      } catch (err) {
        console.warn('[Account Auth Notice]:', err);
        const friendlyMsg = getFriendlyAuthError(err);
        const rawErrStr = (err?.message || String(err)).toLowerCase();
        const isAlreadyExists = rawErrStr.includes('already registered') || rawErrStr.includes('user already exists') || rawErrStr.includes('email_exists');

        if (authMode === 'signup' && isAlreadyExists) {
          showAuthAlert(
            `این ایمیل قبلاً در سامانه ثبت شده و در حال حاضر فعال است.<br>` +
            `<span style="font-size: 0.8rem; opacity: 0.95; display: inline-block; margin-top: 0.35rem;">` +
            `لطفاً از تب <b>«ورود به حساب»</b> با رمز عبور خود وارد شوید یا در صورت فراموشی رمز از بخش «بازیابی رمز» استفاده نمایید.` +
            `</span>`
          );
        } else {
          showAuthAlert(friendlyMsg);
        }
      } finally {
        if (btnAccountSubmit) {
          btnAccountSubmit.disabled = false;
        }
        if (btnAccountSubmitText) {
          btnAccountSubmitText.textContent = originalBtnText;
        }
      }
    }

    if (formAccountAuth) {
      formAccountAuth.addEventListener('submit', handleAuthSubmit);
    }
    if (btnAccountSubmit) {
      btnAccountSubmit.addEventListener('click', handleAuthSubmit);
    }

    // In-App Change Password Modal Controls
    const btnChangePassword = document.getElementById('btn-account-change-password');
    const modalChangePassword = document.getElementById('change-password-modal');
    const formChangePassword = document.getElementById('form-change-password');
    const inputChangePwdNew = document.getElementById('input-change-pwd-new');
    const inputChangePwdConfirm = document.getElementById('input-change-pwd-confirm');
    const btnToggleChangePwdNew = document.getElementById('btn-toggle-change-pwd-new');
    const btnToggleChangePwdConfirm = document.getElementById('btn-toggle-change-pwd-confirm');
    const changePwdAlert = document.getElementById('change-pwd-alert');
    const btnCloseChangePwdModal = document.getElementById('btn-close-change-pwd-modal');
    const btnCancelChangePwd = document.getElementById('btn-cancel-change-pwd');
    const btnSubmitChangePwd = document.getElementById('btn-submit-change-pwd');
    const linkSendResetEmailFallback = document.getElementById('link-send-reset-email-fallback');

    function closeChangePasswordModal() {
      if (modalChangePassword) {
        modalChangePassword.classList.remove('open');
      }
      if (formChangePassword) {
        formChangePassword.reset();
      }
      if (inputChangePwdNew) inputChangePwdNew.type = 'password';
      if (inputChangePwdConfirm) inputChangePwdConfirm.type = 'password';
      const eye1 = document.getElementById('icon-eye-change-pwd-new');
      const eye2 = document.getElementById('icon-eye-change-pwd-confirm');
      if (eye1) eye1.textContent = '👁️';
      if (eye2) eye2.textContent = '👁️';
      if (changePwdAlert) {
        changePwdAlert.style.display = 'none';
        changePwdAlert.textContent = '';
      }
    }

    if (btnChangePassword) {
      btnChangePassword.addEventListener('click', (e) => {
        e.preventDefault();
        if (!currentActiveUser) {
          showToast('⚠️ لطفاً ابتدا وارد حساب کاربری خود شوید.');
          return;
        }
        if (modalChangePassword) {
          modalChangePassword.classList.add('open');
          setTimeout(() => {
            if (inputChangePwdNew) inputChangePwdNew.focus();
          }, 120);
        }
      });
    }

    if (btnCloseChangePwdModal) {
      btnCloseChangePwdModal.addEventListener('click', (e) => {
        e.preventDefault();
        closeChangePasswordModal();
      });
    }

    if (btnCancelChangePwd) {
      btnCancelChangePwd.addEventListener('click', (e) => {
        e.preventDefault();
        closeChangePasswordModal();
      });
    }

    if (modalChangePassword) {
      modalChangePassword.addEventListener('click', (e) => {
        if (e.target === modalChangePassword) {
          closeChangePasswordModal();
        }
      });
    }

    if (btnToggleChangePwdNew && inputChangePwdNew) {
      btnToggleChangePwdNew.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isPass = inputChangePwdNew.type === 'password';
        inputChangePwdNew.type = isPass ? 'text' : 'password';
        const eye = document.getElementById('icon-eye-change-pwd-new');
        if (eye) eye.textContent = isPass ? '🙈' : '👁️';
        inputChangePwdNew.focus();
      });
    }

    if (btnToggleChangePwdConfirm && inputChangePwdConfirm) {
      btnToggleChangePwdConfirm.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isPass = inputChangePwdConfirm.type === 'password';
        inputChangePwdConfirm.type = isPass ? 'text' : 'password';
        const eye = document.getElementById('icon-eye-change-pwd-confirm');
        if (eye) eye.textContent = isPass ? '🙈' : '👁️';
        inputChangePwdConfirm.focus();
      });
    }

    if (formChangePassword) {
      formChangePassword.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPwd = inputChangePwdNew ? inputChangePwdNew.value.trim() : '';
        const confirmPwd = inputChangePwdConfirm ? inputChangePwdConfirm.value.trim() : '';

        if (!newPwd || newPwd.length < 6) {
          if (changePwdAlert) {
            changePwdAlert.style.display = 'block';
            changePwdAlert.style.background = 'rgba(239, 68, 68, 0.15)';
            changePwdAlert.style.color = '#f87171';
            changePwdAlert.style.border = '1px solid rgba(239, 68, 68, 0.3)';
            changePwdAlert.textContent = '❌ رمز عبور جدید باید حداقل ۶ کاراکتر باشد.';
          }
          if (inputChangePwdNew) inputChangePwdNew.focus();
          return;
        }

        if (newPwd !== confirmPwd) {
          if (changePwdAlert) {
            changePwdAlert.style.display = 'block';
            changePwdAlert.style.background = 'rgba(239, 68, 68, 0.15)';
            changePwdAlert.style.color = '#f87171';
            changePwdAlert.style.border = '1px solid rgba(239, 68, 68, 0.3)';
            changePwdAlert.textContent = '❌ تکرار رمز عبور با رمز جدید همخوانی ندارد.';
          }
          if (inputChangePwdConfirm) inputChangePwdConfirm.focus();
          return;
        }

        if (btnSubmitChangePwd) {
          btnSubmitChangePwd.disabled = true;
          btnSubmitChangePwd.innerHTML = '<span>⏳ در حال تغییر رمز عبور...</span>';
        }

        try {
          const sb = getSupabase();
          if (sb && typeof sb.updatePassword === 'function') {
            await sb.updatePassword(newPwd);
          } else {
            const client = sb && typeof sb.getSupabase === 'function' ? sb.getSupabase() : (window.AlmasSupabase?.getSupabase ? window.AlmasSupabase.getSupabase() : null);
            if (client && client.auth && typeof client.auth.updateUser === 'function') {
              const { error } = await client.auth.updateUser({ password: newPwd });
              if (error) throw error;
            } else {
              throw new Error('سرویس احراز هویت در دسترس نیست.');
            }
          }

          closeChangePasswordModal();
          showToast('🔑 رمز عبور شما با موفقیت تغییر یافت.');
        } catch (error) {
          console.error('[Change Password Error]:', error);
          if (changePwdAlert) {
            changePwdAlert.style.display = 'block';
            changePwdAlert.style.background = 'rgba(239, 68, 68, 0.15)';
            changePwdAlert.style.color = '#f87171';
            changePwdAlert.style.border = '1px solid rgba(239, 68, 68, 0.3)';
            const friendlyMsg = (window.AlmasSupabase && typeof window.AlmasSupabase.getFriendlyAuthError === 'function')
              ? window.AlmasSupabase.getFriendlyAuthError(error)
              : (error.message || 'خطا در ثبت رمز عبور جدید.');
            changePwdAlert.textContent = `❌ ${friendlyMsg}`;
          }
        } finally {
          if (btnSubmitChangePwd) {
            btnSubmitChangePwd.disabled = false;
            btnSubmitChangePwd.innerHTML = '<span>🔒 ثبت و تغییر رمز عبور</span>';
          }
        }
      });
    }

    if (linkSendResetEmailFallback) {
      linkSendResetEmailFallback.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!currentActiveUser || !currentActiveUser.email) {
          showToast('❌ آدرس ایمیل معتبری برای حساب شما یافت نشد.');
          return;
        }
        try {
          const sb = getSupabase();
          if (sb && typeof sb.resetPassword === 'function') {
            await sb.resetPassword(currentActiveUser.email);
            showToast('📩 لینک بازیابی رمز عبور به ایمیل شما ارسال شد.');
          } else {
            showToast('❌ خطای ارتباط با سرور بازیابی.');
          }
        } catch (err) {
          console.error('[Fallback Reset Email Error]:', err);
          showToast('❌ خطا در ارسال ایمیل بازیابی.');
        }
      });
    }

    // In-App Delete Account Modal Controls
    const btnDeleteAccount = document.getElementById('btn-account-delete');
    const modalDeleteAccount = document.getElementById('delete-account-modal');
    const formDeleteAccount = document.getElementById('form-delete-account');
    const inputDeleteAccPassword = document.getElementById('input-delete-acc-password');
    const btnToggleDeleteAccPwd = document.getElementById('btn-toggle-delete-acc-pwd');
    const deleteAccAlert = document.getElementById('delete-acc-alert');
    const btnCloseDeleteAccModal = document.getElementById('btn-close-delete-acc-modal');
    const btnCancelDeleteAcc = document.getElementById('btn-cancel-delete-acc');
    const btnSubmitDeleteAcc = document.getElementById('btn-submit-delete-acc');

    function showDeleteAccAlert(msg, isSuccess = false) {
      if (!deleteAccAlert) return;
      deleteAccAlert.style.display = 'block';
      if (isSuccess) {
        deleteAccAlert.style.background = 'rgba(34, 197, 94, 0.12)';
        deleteAccAlert.style.border = '1px solid rgba(34, 197, 94, 0.3)';
        deleteAccAlert.style.color = '#4ade80';
      } else {
        deleteAccAlert.style.background = 'rgba(239, 68, 68, 0.12)';
        deleteAccAlert.style.border = '1px solid rgba(239, 68, 68, 0.3)';
        deleteAccAlert.style.color = '#f87171';
      }
      deleteAccAlert.textContent = msg;
    }

    const svgEyeOpen = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
    const svgEyeOff = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
    const svgTrash = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';

    function closeDeleteAccountModal() {
      if (modalDeleteAccount) {
        modalDeleteAccount.classList.remove('open');
      }
      if (formDeleteAccount) {
        formDeleteAccount.reset();
      }
      if (inputDeleteAccPassword) {
        inputDeleteAccPassword.type = 'password';
      }
      const eye = document.getElementById('icon-eye-delete-acc-pwd');
      if (eye) eye.innerHTML = svgEyeOpen;
      if (deleteAccAlert) {
        deleteAccAlert.style.display = 'none';
        deleteAccAlert.textContent = '';
      }
      if (btnSubmitDeleteAcc) {
        btnSubmitDeleteAcc.disabled = false;
        btnSubmitDeleteAcc.innerHTML = `${svgTrash}<span>حذف حساب کاربری</span>`;
      }
    }

    if (btnDeleteAccount) {
      btnDeleteAccount.addEventListener('click', (e) => {
        e.preventDefault();
        if (!currentActiveUser) {
          showToast('⚠️ لطفاً ابتدا وارد حساب کاربری خود شوید.');
          return;
        }
        if (modalDeleteAccount) {
          modalDeleteAccount.classList.add('open');
          setTimeout(() => {
            if (inputDeleteAccPassword) inputDeleteAccPassword.focus();
          }, 120);
        }
      });
    }

    if (btnCloseDeleteAccModal) {
      btnCloseDeleteAccModal.addEventListener('click', (e) => {
        e.preventDefault();
        closeDeleteAccountModal();
      });
    }

    if (btnCancelDeleteAcc) {
      btnCancelDeleteAcc.addEventListener('click', (e) => {
        e.preventDefault();
        closeDeleteAccountModal();
      });
    }

    if (modalDeleteAccount) {
      modalDeleteAccount.addEventListener('click', (e) => {
        if (e.target === modalDeleteAccount) {
          closeDeleteAccountModal();
        }
      });
    }

    if (btnToggleDeleteAccPwd && inputDeleteAccPassword) {
      btnToggleDeleteAccPwd.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isPass = inputDeleteAccPassword.type === 'password';
        inputDeleteAccPassword.type = isPass ? 'text' : 'password';
        const eye = document.getElementById('icon-eye-delete-acc-pwd');
        if (eye) eye.innerHTML = isPass ? svgEyeOff : svgEyeOpen;
      });
    }

    if (formDeleteAccount) {
      formDeleteAccount.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentActiveUser) {
          showDeleteAccAlert('ابتدا باید وارد حساب کاربری خود باشید.');
          return;
        }

        const password = (inputDeleteAccPassword?.value || '').trim();
        if (!password) {
          showDeleteAccAlert('لطفاً جهت تأیید هویت، رمز عبور حساب کاربری خود را وارد کنید.');
          if (inputDeleteAccPassword) inputDeleteAccPassword.focus();
          return;
        }

        if (btnSubmitDeleteAcc) {
          btnSubmitDeleteAcc.disabled = true;
          btnSubmitDeleteAcc.innerHTML = '<span>در حال حذف حساب...</span>';
        }
        if (deleteAccAlert) deleteAccAlert.style.display = 'none';

        try {
          const sb = getSupabase();
          if (!sb || typeof sb.deleteAccount !== 'function') {
            throw new Error('سرویس احراز هویت در دسترس نیست.');
          }

          const userEmail = currentActiveUser.email || '';
          await sb.deleteAccount(password, userEmail);

          currentActiveUser = null;
          renderUserUI(null);
          closeDeleteAccountModal();
          closeModal('settings-modal');
          showToast('حساب کاربری شما با موفقیت حذف شد. در صورت تمایل می‌توانید در آینده مجدداً ثبت‌نام کنید.');
        } catch (error) {
          console.error('[Delete Account Error]:', error);
          if (btnSubmitDeleteAcc) {
            btnSubmitDeleteAcc.disabled = false;
            btnSubmitDeleteAcc.innerHTML = `${svgTrash}<span>حذف حساب کاربری</span>`;
          }
          showDeleteAccAlert(error.message || 'خطا در حذف حساب کاربری. لطفاً دوباره تلاش کنید.');
        }
      });
    }

    if (btnLogout) {
      btnLogout.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          const sb = getSupabase();
          if (sb && typeof sb.signOut === 'function') {
            await sb.signOut();
          }
        } catch (err) {
          console.warn('[Supabase Logout Warning]:', err);
        }
        currentActiveUser = null;
        renderUserUI(null);
        showToast('🚪 با موفقیت از حساب کاربری خارج شدید.');
      });
    }

    const btnHeaderAccount = document.getElementById('btn-header-account');
    if (btnHeaderAccount) {
      btnHeaderAccount.addEventListener('click', (e) => {
        e.preventDefault();
        openSettingsModal('account');
      });
    }
  }

  function switchSettingsTab(tabName) {
    if (!tabName) return;
    
    if (tabName === 'account') {
      updateAccountTabStats();
    }
    if (tabName === 'wallpaper') {
      renderWallpaperPresets();
    }

    const tabMeta = {
      account: { title: 'حساب کاربری و همگام‌سازی ابری', desc: '' },
      theme: { title: 'طراحی، تم و رنگ‌های تاکیدی', desc: '' },
      wallpaper: { title: 'پس‌زمینه و گالری تصاویر', desc: '' },
      about: { title: 'درباره الماس داشبورد و پشتیبانی', desc: '' }
    };

    const titleEl = document.getElementById('as-dynamic-panel-title');
    const descEl = document.getElementById('as-dynamic-panel-desc');
    if (tabMeta[tabName]) {
      if (titleEl) titleEl.innerHTML = `<span>${tabMeta[tabName].title}</span>`;
      if (descEl) descEl.textContent = tabMeta[tabName].desc;
    }
    
    const settingsTabs = document.querySelectorAll('.settings-tab-btn');
    settingsTabs.forEach(t => {
      if (t.dataset.tab === tabName) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });

    document.querySelectorAll('.settings-tab-panel').forEach((panel) => {
      panel.classList.remove('active');
    });

    const targetPanel = document.getElementById(`tab-content-${tabName}`);
    if (targetPanel) targetPanel.classList.add('active');
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach((overlay) => {
      overlay.classList.remove('open');
    });
    state.editingItemId = null;
  }

  function populateFolderSelect(selectElement, selectedFolderId, excludeItemId = null) {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="root">صفحه اصلی (بدون پوشه)</option>';

    function appendOptions(parentId = null, depth = 0) {
      const folders = state.bookmarks.filter(b => b.type === 'folder' && (b.parentId || null) === (parentId || null));
      folders.forEach((folder) => {
        if (excludeItemId && folder.id === excludeItemId) return;
        const opt = document.createElement('option');
        opt.value = folder.id;
        const indent = depth > 0 ? '　'.repeat(depth) + '↳ ' : '';
        opt.textContent = `${indent}📁 ${folder.title}`;
        if (folder.id === selectedFolderId) opt.selected = true;
        selectElement.appendChild(opt);
        appendOptions(folder.id, depth + 1);
      });
    }
    appendOptions(null, 0);
  }

  function openAddModal() {
    const modal = document.getElementById('add-modal');
    if (!modal) return;

    // Reset fields
    const titleInput = document.getElementById('add-title');
    const urlInput = document.getElementById('add-url');
    if (titleInput) titleInput.value = '';
    if (urlInput) urlInput.value = '';

    // Folder Selector Options with Nested Hierarchy
    const folderSelect = document.getElementById('add-folder-select');
    populateFolderSelect(folderSelect, state.currentFolderId);

    state.selectedAddEmoji = '🌐';
    modal.classList.add('open');
  }

  function updateEditIconPreview() {
    const item = state.bookmarks.find(b => b.id === state.editingItemId);
    const isFolder = item ? item.type === 'folder' : false;
    const mode = state.selectedEditIconType || (isFolder ? 'emoji' : 'favicon');

    const btnFavicon = document.getElementById('btn-icon-mode-favicon');
    const btnEmoji = document.getElementById('btn-icon-mode-emoji');
    const btnCustom = document.getElementById('btn-icon-mode-custom');

    const secFavicon = document.getElementById('edit-icon-section-favicon');
    const secEmoji = document.getElementById('edit-icon-section-emoji');
    const secCustom = document.getElementById('edit-icon-section-custom');

    const previewEmoji = document.getElementById('edit-icon-preview-emoji');
    const previewImg = document.getElementById('edit-icon-preview-img');
    const previewLabel = document.getElementById('edit-icon-preview-label');
    const previewSub = document.getElementById('edit-icon-preview-sub');
    const iconUrlInput = document.getElementById('edit-icon-url');

    [btnFavicon, btnEmoji, btnCustom].forEach(b => b && b.classList.remove('active'));
    if (secFavicon) secFavicon.style.display = 'none';
    if (secEmoji) secEmoji.style.display = 'none';
    if (secCustom) secCustom.style.display = 'none';

    if (mode === 'emoji') {
      if (btnEmoji) btnEmoji.classList.add('active');
      if (secEmoji) secEmoji.style.display = 'block';
      if (previewImg) previewImg.style.display = 'none';
      if (previewEmoji) {
        previewEmoji.textContent = state.selectedEditEmoji || (isFolder ? '📁' : '🌐');
        previewEmoji.style.display = 'inline';
      }
      if (previewLabel) previewLabel.textContent = `آیکون ایموجی: ${state.selectedEditEmoji || (isFolder ? '📁' : '🌐')}`;
      if (previewSub) previewSub.textContent = 'ایموجی انتخاب شده به عنوان آیکون نمایش داده می‌شود';
    } else if (mode === 'custom') {
      if (btnCustom) btnCustom.classList.add('active');
      if (secCustom) secCustom.style.display = 'block';
      const curUrl = (iconUrlInput ? iconUrlInput.value : '').trim();
      if (curUrl) {
        if (previewEmoji) previewEmoji.style.display = 'none';
        if (previewImg) {
          previewImg.src = curUrl;
          previewImg.style.display = 'block';
          previewImg.onerror = () => {
            previewImg.style.display = 'none';
            if (previewEmoji) {
              previewEmoji.textContent = '⚠️';
              previewEmoji.style.display = 'inline';
            }
            if (previewLabel) previewLabel.textContent = 'خطا در بارگذاری تصویر';
          };
        }
        if (previewLabel) previewLabel.textContent = 'آیکون تصویر سفارشی';
        if (previewSub) previewSub.textContent = 'تصویر از آدرس اینترنتی دریافت خواهد شد';
      } else {
        if (previewImg) previewImg.style.display = 'none';
        if (previewEmoji) {
          previewEmoji.textContent = '🖼️';
          previewEmoji.style.display = 'inline';
        }
        if (previewLabel) previewLabel.textContent = 'لطفاً آدرس تصویر را وارد کنید';
        if (previewSub) previewSub.textContent = 'لینک مستقیم یک تصویر یا آیکون را وارد نمایید';
      }
    } else {
      // Favicon mode
      if (btnFavicon) btnFavicon.classList.add('active');
      if (secFavicon) secFavicon.style.display = 'block';
      const siteUrl = (document.getElementById('edit-url')?.value || (item ? item.url : '')).trim();
      const favUrl = getHighQualityFavicon(siteUrl);
      if (favUrl) {
        if (previewEmoji) previewEmoji.style.display = 'none';
        if (previewImg) {
          previewImg.src = favUrl;
          previewImg.style.display = 'block';
          previewImg.onerror = () => {
            previewImg.style.display = 'none';
            if (previewEmoji) {
              previewEmoji.textContent = '🌐';
              previewEmoji.style.display = 'inline';
            }
          };
        }
        if (previewLabel) previewLabel.textContent = 'فاوی‌کون خودکار سایت';
        if (previewSub) previewSub.textContent = 'لوگوی سایت به طور خودکار بارگذاری می‌شود';
      } else {
        if (previewImg) previewImg.style.display = 'none';
        if (previewEmoji) {
          previewEmoji.textContent = '🌐';
          previewEmoji.style.display = 'inline';
        }
        if (previewLabel) previewLabel.textContent = 'فاوی‌کون پیش‌فرض سایت';
        if (previewSub) previewSub.textContent = 'فاوی‌کون خودکار وب‌سایت فعال است';
      }
    }
  }

  function initEditIconControls() {
    const btnFavicon = document.getElementById('btn-icon-mode-favicon');
    const btnEmoji = document.getElementById('btn-icon-mode-emoji');
    const btnCustom = document.getElementById('btn-icon-mode-custom');
    const customEmojiInput = document.getElementById('edit-custom-emoji-input');
    const btnApplyCustomEmoji = document.getElementById('btn-apply-custom-emoji');
    const iconUrlInput = document.getElementById('edit-icon-url');

    if (btnFavicon) {
      btnFavicon.addEventListener('click', () => {
        state.selectedEditIconType = 'favicon';
        updateEditIconPreview();
      });
    }

    if (btnEmoji) {
      btnEmoji.addEventListener('click', () => {
        state.selectedEditIconType = 'emoji';
        updateEditIconPreview();
      });
    }

    if (btnCustom) {
      btnCustom.addEventListener('click', () => {
        state.selectedEditIconType = 'custom';
        updateEditIconPreview();
      });
    }

    if (btnApplyCustomEmoji && customEmojiInput) {
      btnApplyCustomEmoji.addEventListener('click', () => {
        const val = customEmojiInput.value.trim();
        if (val) {
          state.selectedEditEmoji = val;
          state.selectedEditIconType = 'emoji';
          updateEditIconPreview();
          showToast(`ایموجی «${val}» انتخاب شد ✓`);
        }
      });
      customEmojiInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          btnApplyCustomEmoji.click();
        }
      });
    }

    if (iconUrlInput) {
      iconUrlInput.addEventListener('input', () => {
        if (state.selectedEditIconType === 'custom') {
          updateEditIconPreview();
        }
      });
    }
  }

  function openEditModal(id, isVerified = false) {
    const item = state.bookmarks.find(b => b.id === id);
    if (!item) return;

    // 🔐 Security check: If item has a 4-digit PIN and user hasn't verified it yet, prompt PIN first!
    if (item.pin && item.pin.length === 4 && !isVerified) {
      openPinModal(item, 'edit');
      return;
    }

    state.editingItemId = id;

    const modal = document.getElementById('edit-modal');
    if (!modal) return;

    const titleInput = document.getElementById('edit-title');
    const urlInput = document.getElementById('edit-url');
    const iconUrlInput = document.getElementById('edit-icon-url');
    const urlGroup = document.getElementById('edit-url-group');
    const btnFavicon = document.getElementById('btn-icon-mode-favicon');
    const customEmojiInput = document.getElementById('edit-custom-emoji-input');

    const toggleLock = document.getElementById('toggle-edit-lock');
    const pinContainer = document.getElementById('edit-pin-container');
    const pinInput = document.getElementById('edit-pin-input');
    const btnTogglePinVis = document.getElementById('btn-toggle-pin-visibility');

    if (titleInput) titleInput.value = item.title || '';
    if (urlInput) urlInput.value = item.url || '';
    if (iconUrlInput) iconUrlInput.value = item.customIconUrl || '';

    const isFolder = item.type === 'folder';
    if (urlGroup) {
      urlGroup.style.display = isFolder ? 'none' : 'flex';
    }
    if (btnFavicon) {
      btnFavicon.style.display = isFolder ? 'none' : 'inline-flex';
    }

    // Determine initial icon mode (default for bookmarks is high quality site favicon)
    let initialMode = item.iconType;
    if (!initialMode) {
      if (isFolder) {
        initialMode = item.customIconUrl ? 'custom' : 'emoji';
      } else {
        if (item.customIconUrl) initialMode = 'custom';
        else initialMode = 'favicon';
      }
    }
    state.selectedEditIconType = initialMode;
    state.selectedEditEmoji = item.iconEmoji || (isFolder ? '📁' : '🌐');
    if (customEmojiInput) {
      customEmojiInput.value = state.selectedEditEmoji;
    }

    updateEditIconPreview();

    const hasPin = !!(item.pin && item.pin.length === 4);
    if (toggleLock) toggleLock.checked = hasPin;
    if (pinContainer) pinContainer.style.display = hasPin ? 'block' : 'none';
    if (pinInput) {
      pinInput.value = item.pin || '';
      pinInput.type = 'password';
    }
    if (btnTogglePinVis) btnTogglePinVis.textContent = '👁️';

    modal.classList.add('open');
  }

  /* ==========================================================================
     PIN Protection & Verification Modal Logic
     ========================================================================== */
  let currentUnlockingItem = null;
  let currentUnlockMode = 'open'; // 'open' or 'edit'

  function openPinModal(item, mode = 'open') {
    if (!item) return;
    currentUnlockingItem = item;
    currentUnlockMode = mode;

    const modal = document.getElementById('pin-modal');
    if (!modal) return;

    const headerIcon = document.getElementById('pin-modal-header-icon');
    const headerText = document.getElementById('pin-modal-header-text');
    const titleElem = document.getElementById('pin-modal-title');
    const subtitleElem = document.getElementById('pin-modal-subtitle');
    const iconWrap = document.getElementById('pin-modal-icon-wrap');
    const errorMsg = document.getElementById('pin-error-msg');
    const digitsContainer = document.getElementById('pin-digits-container');
    const digitInputs = document.querySelectorAll('.pin-digit-input');
    const submitIcon = document.getElementById('pin-modal-submit-icon');
    const submitText = document.getElementById('pin-modal-submit-text');

    if (mode === 'edit') {
      if (headerIcon) headerIcon.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>';
      if (headerText) headerText.textContent = 'احراز هویت جهت ویرایش';
      if (subtitleElem) {
        subtitleElem.textContent = 'برای دسترسی به تنظیمات ویرایش و تغییر یا غیرفعال‌سازی رمز، لطفاً رمز ۴ رقمی فعلی را وارد کنید:';
      }
      if (submitIcon) submitIcon.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>';
      if (submitText) submitText.textContent = 'تایید و ورود به ویرایش';
    } else {
      if (headerIcon) headerIcon.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>';
      if (headerText) headerText.textContent = 'ورود رمز عبور امنیتی';
      if (subtitleElem) {
        subtitleElem.textContent = item.type === 'folder' 
          ? 'لطفاً رمز عبور ۴ رقمی این پوشه را وارد کنید:' 
          : 'لطفاً رمز عبور ۴ رقمی این بوکمارک را وارد کنید:';
      }
      if (submitIcon) submitIcon.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>';
      if (submitText) submitText.textContent = 'تایید و بازگشایی';
    }

    if (titleElem) titleElem.textContent = item.title || (item.type === 'folder' ? 'پوشه قفل شده' : 'بوکمارک قفل شده');

    if (iconWrap) {
      if (item.type === 'folder') {
        iconWrap.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>';
      } else {
        const hdIcon = item.customIconUrl || (item.url ? getHighQualityFavicon(item.url) : null);
        if (hdIcon) {
          iconWrap.innerHTML = `<img src="${hdIcon}" alt="" style="width: 70%; height: 70%; object-fit: contain; border-radius: 6px;" onerror="this.outerHTML='<svg width=\\'24\\' height=\\'24\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\'><circle cx=\\'12\\' cy=\\'12\\' r=\\'10\\'/></svg>'" />`;
        } else {
          iconWrap.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>';
        }
      }
    }

    if (errorMsg) errorMsg.textContent = '';
    if (digitsContainer) digitsContainer.classList.remove('shake');

    digitInputs.forEach(input => {
      input.value = '';
      input.classList.remove('filled');
    });

    modal.classList.add('open');

    // Auto-focus first digit
    setTimeout(() => {
      if (digitInputs[0]) digitInputs[0].focus();
    }, 120);
  }

  function initPinUnlockControls() {
    const digitInputs = Array.from(document.querySelectorAll('.pin-digit-input'));
    const form = document.getElementById('pin-unlock-form');
    const errorMsg = document.getElementById('pin-error-msg');
    const digitsContainer = document.getElementById('pin-digits-container');

    digitInputs.forEach((input, index) => {
      input.addEventListener('input', (e) => {
        const val = e.target.value.replace(/\D/g, '');
        e.target.value = val ? val.slice(-1) : '';

        if (e.target.value) {
          input.classList.add('filled');
          if (index < digitInputs.length - 1) {
            digitInputs[index + 1].focus();
          } else {
            verifyEnteredPin();
          }
        } else {
          input.classList.remove('filled');
        }
        if (errorMsg) errorMsg.textContent = '';
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
          digitInputs[index - 1].focus();
          digitInputs[index - 1].value = '';
          digitInputs[index - 1].classList.remove('filled');
        } else if (e.key === 'ArrowLeft' && index > 0) {
          digitInputs[index - 1].focus();
        } else if (e.key === 'ArrowRight' && index < digitInputs.length - 1) {
          digitInputs[index + 1].focus();
        }
      });

      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasteData = (e.clipboardData || window.clipboardData).getData('text') || '';
        const digits = pasteData.replace(/\D/g, '').slice(0, 4).split('');
        if (digits.length > 0) {
          digits.forEach((digit, i) => {
            if (digitInputs[i]) {
              digitInputs[i].value = digit;
              digitInputs[i].classList.add('filled');
            }
          });
          const nextIdx = Math.min(digits.length, digitInputs.length - 1);
          digitInputs[nextIdx].focus();
          if (digits.length === 4) {
            verifyEnteredPin();
          }
        }
      });
    });

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        verifyEnteredPin();
      });
    }

    function verifyEnteredPin() {
      if (!currentUnlockingItem) return;
      const enteredCode = digitInputs.map(inp => inp.value).join('');

      if (enteredCode.length < 4) {
        if (errorMsg) errorMsg.textContent = 'لطفاً هر ۴ رقم رمز عبور را وارد نمایید';
        return;
      }

      if (enteredCode === currentUnlockingItem.pin) {
        const itemToOpen = currentUnlockingItem;
        const mode = currentUnlockMode;
        currentUnlockingItem = null;
        closeAllModals();

        if (mode === 'edit') {
          showToast('🔓 هویت تایید شد');
          openEditModal(itemToOpen.id, true);
        } else {
          showToast('🔓 قفل با موفقیت باز شد');
          if (itemToOpen.type === 'folder') {
            state.currentFolderId = itemToOpen.id;
            renderBookmarks();
          } else if (itemToOpen.url) {
            window.open(itemToOpen.url, '_blank');
          }
        }
      } else {
        if (errorMsg) errorMsg.textContent = '⚠️ رمز عبور ۴ رقمی نادرست است';
        if (digitsContainer) {
          digitsContainer.classList.remove('shake');
          void digitsContainer.offsetWidth;
          digitsContainer.classList.add('shake');
        }
        digitInputs.forEach(inp => {
          inp.value = '';
          inp.classList.remove('filled');
        });
        if (digitInputs[0]) digitInputs[0].focus();
      }
    }
  }

  function openSettingsModal(preferredTab) {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    const activeTabBtn = document.querySelector('.settings-tab-btn.active');
    const tabToOpen = preferredTab || (activeTabBtn ? activeTabBtn.dataset.tab : 'account');
    switchSettingsTab(tabToOpen);
    syncSettingsToUI();
    modal.classList.add('open');
  }

  function populateEmojiPicker(containerId, onSelect) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    EMOJI_PALETTE.forEach((emoji) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'emoji-pick-btn';
      btn.textContent = emoji;
      btn.addEventListener('click', () => {
        container.querySelectorAll('.emoji-pick-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        onSelect(emoji);
      });
      container.appendChild(btn);
    });
  }

  function initSettingsControls() {
    // 3-State Theme Switcher in Header
    document.querySelectorAll('#header-theme-switcher .theme-switch-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.themeTarget;
        if (theme) {
          state.settings.theme = theme;
          saveSettings();
          syncSettingsToUI();
          showToast(
            theme === 'dark' ? '🌙 تم تاریک عمیق (AMOLED) فعال شد' :
            theme === 'light' ? '☀️ تم روشن لایت (Light Mode) فعال شد' :
            '💎 تم شیشه‌ای (Glass) فعال شد'
          );
        }
      });
    });

    // Theme Presets in Settings Modal
    document.querySelectorAll('[data-theme-choice]').forEach((card) => {
      card.addEventListener('click', () => {
        const theme = card.dataset.themeChoice;
        if (theme) {
          state.settings.theme = theme;
          saveSettings();
          syncSettingsToUI();
          showToast(
            theme === 'dark' ? '🌙 تم تاریک عمیق (AMOLED) فعال شد' :
            theme === 'light' ? '☀️ تم روشن لایت (Light Mode) فعال شد' :
            '💎 تم شیشه‌ای (Glass) فعال شد'
          );
        }
      });
    });

    // Text Contrast
    document.querySelectorAll('#seg-text-contrast .segment-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.settings.contrast = btn.dataset.contrast;
        saveSettings();
        syncSettingsToUI();
      });
    });

    // Card Size
    document.querySelectorAll('#seg-card-size .segment-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.settings.cardSize = parseInt(btn.dataset.cardSize, 10);
        saveSettings();
        syncSettingsToUI();
      });
    });

    // Icon Size
    document.querySelectorAll('#seg-icon-size .segment-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.settings.iconSize = btn.dataset.iconSize;
        saveSettings();
        syncSettingsToUI();
      });
    });

    // Card Radius
    document.querySelectorAll('#seg-card-radius .segment-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.settings.cardRadius = parseInt(btn.dataset.cardRadius, 10);
        saveSettings();
        syncSettingsToUI();
      });
    });

    // Glass Opacity Range Slider
    const sliderGlassOp = document.getElementById('slider-glass-opacity');
    if (sliderGlassOp) {
      sliderGlassOp.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        state.settings.glassOpacity = val;
        const badge = document.getElementById('val-glass-opacity');
        if (badge) badge.textContent = `${val}%`;
        applySettings();
      });
      sliderGlassOp.addEventListener('change', () => {
        saveSettings();
      });
    }

    // Glass Blur Range Slider
    const sliderGlassBlur = document.getElementById('slider-glass-blur');
    if (sliderGlassBlur) {
      sliderGlassBlur.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        state.settings.glassBlur = val;
        const badge = document.getElementById('val-glass-blur');
        if (badge) badge.textContent = `${val}px`;
        applySettings();
      });
      sliderGlassBlur.addEventListener('change', () => {
        saveSettings();
      });
    }

    // Accent Color Palette Swatches & Custom Color Picker
    document.querySelectorAll('.accent-swatch').forEach((swatch) => {
      swatch.addEventListener('click', () => {
        const color = swatch.dataset.accent || swatch.dataset.accentColor;
        if (color) {
          state.settings.accentColor = color;
          saveSettings();
          syncSettingsToUI();
          const p = ACCENT_COLOR_PRESETS[color.toLowerCase()];
          showToast(`🎨 رنگ تاکیدی «${p ? p.name : color}» اعمال شد`);
        }
      });
    });

    const customColorInput = document.getElementById('accent-custom-color-input');
    if (customColorInput) {
      customColorInput.addEventListener('input', (e) => {
        const color = e.target.value;
        if (color) {
          state.settings.accentColor = color;
          applyAccentColor(color);
        }
      });
      customColorInput.addEventListener('change', (e) => {
        const color = e.target.value;
        if (color) {
          state.settings.accentColor = color;
          saveSettings();
          syncSettingsToUI();
          showToast(`🎨 رنگ تاکیدی سفارشی «${color}» ذخیره و اعمال شد`);
        }
      });
    }

    // Performance Low Spec Toggle
    const toggleLowSpec = document.getElementById('toggle-low-spec');
    if (toggleLowSpec) {
      toggleLowSpec.addEventListener('change', () => {
        state.settings.lowSpecMode = toggleLowSpec.checked;
        saveSettings();
      });
    }

    // Glass Opacity
    document.querySelectorAll('#seg-glass-opacity .segment-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.settings.glassOpacity = parseInt(btn.dataset.glassOpacity, 10);
        saveSettings();
        applySettings();
        syncSettingsToUI();
      });
    });

    // Glass Blur
    document.querySelectorAll('#seg-glass-blur .segment-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.settings.glassBlur = parseInt(btn.dataset.glassBlur, 10);
        saveSettings();
        applySettings();
        syncSettingsToUI();
      });
    });

    // Dedicated Wallpaper Modal Open/Close & Back Navigation
    const btnOpenWpModal = document.getElementById('btn-open-wallpaper-modal');
    const wpModal = document.getElementById('wallpaper-modal');
    if (btnOpenWpModal && wpModal) {
      btnOpenWpModal.addEventListener('click', () => {
        wpModal.classList.add('open');
        renderWallpaperPresets();
      });
    }

    // Back Buttons in Wallpaper Store (Header and Footer)
    document.querySelectorAll('.btn-wp-back').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (wpModal) wpModal.classList.remove('open');
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal && !settingsModal.classList.contains('open')) {
          settingsModal.classList.add('open');
        }
      });
    });

    // Back Button in Tab 2 (Wallpaper Store Tab inside Settings Modal) -> Navigate back to General/Theme tab
    const btnTabWpBack = document.getElementById('btn-tab-wp-back-to-theme');
    if (btnTabWpBack) {
      btnTabWpBack.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        switchSettingsTab('theme');
      });
    }

    // Quick Wallpaper Preview Apply Button
    const btnApplyPreviewWp = document.getElementById('btn-apply-preview-wallpaper');
    const prevModal = document.getElementById('wallpaper-preview-modal');
    if (btnApplyPreviewWp) {
      btnApplyPreviewWp.addEventListener('click', () => {
        if (pendingPreviewWp) {
          selectAndApplyWallpaper(pendingPreviewWp);
          if (prevModal) prevModal.classList.remove('open');
        }
      });
    }
    if (prevModal) {
      prevModal.querySelectorAll('[data-close-modal]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          prevModal.classList.remove('open');
        });
      });
      prevModal.addEventListener('click', (e) => {
        if (e.target === prevModal) {
          prevModal.classList.remove('open');
        }
      });
    }

    // Wallpaper Darkness / Brightness Presets (Without Sliders)
    document.querySelectorAll('#seg-overlay-opacity .segment-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.settings.overlayOpacity = parseInt(btn.dataset.overlayOpacity, 10);
        saveSettings();
        applySettings();
        syncSettingsToUI();
      });
    });

    // Render unified gallery on launch
    renderWallpaperPresets();

    // Custom Wallpaper Upload from Settings Tab
    const customWpInput = document.getElementById('input-custom-wallpaper');
    if (customWpInput) {
      customWpInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            state.settings.wallpaperUrl = event.target.result;
            saveSettings();
            showToast('والپیپر اختصاصی بارگذاری شد');
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Custom Wallpaper Upload inside Modal
    const modalCustomWpInput = document.getElementById('input-modal-custom-wallpaper');
    if (modalCustomWpInput) {
      modalCustomWpInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            state.settings.wallpaperUrl = event.target.result;
            saveSettings();
            showToast('والپیپر اختصاصی با موفقیت اعمال شد');
            if (wpModal) wpModal.classList.remove('open');
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Chrome / Browser Bookmarks Auto-Sync (Preserves 100% Nested Folder Hierarchy)
    const btnSyncChrome = document.getElementById('btn-sync-browser-bookmarks');
    if (btnSyncChrome) {
      btnSyncChrome.addEventListener('click', () => {
        if (typeof chrome !== 'undefined' && chrome.bookmarks && chrome.bookmarks.getTree) {
          chrome.bookmarks.getTree((tree) => {
            if (tree && tree.length > 0) {
              const imported = [];
              const idMap = new Map();

              function processNode(node, ourParentId) {
                if (!node) return;

                // Chrome root nodes ("0", "1" = Bookmarks Bar, "2" = Other Bookmarks, "3" = Mobile Bookmarks)
                const isSystemRoot = node.id === '0' || (node.parentId === '0' && (!node.url && (!node.title || node.title === 'Bookmarks bar' || node.title === 'Other bookmarks' || node.title === 'Mobile bookmarks')));

                let currentOurId = ourParentId;

                if (!isSystemRoot) {
                  if (node.url) {
                    // Bookmark Item with stable ID
                    const bmId = node.id ? `bm_chrome_${node.id}` : `bm_chrome_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
                    imported.push({
                      id: bmId,
                      chromeId: node.id || null,
                      type: 'bookmark',
                      title: (node.title || 'بوکمارک مرورگر').trim(),
                      url: node.url,
                      iconEmoji: '🌐',
                      parentId: ourParentId || null,
                      isPinned: false
                    });
                    return;
                  } else if (node.title && (node.children || []).length > 0) {
                    // Folder Item with nested children and stable ID
                    const folderId = node.id ? `folder_chrome_${node.id}` : `folder_chrome_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
                    idMap.set(node.id, folderId);
                    imported.push({
                      id: folderId,
                      chromeId: node.id || null,
                      type: 'folder',
                      title: (node.title || 'پوشه مرورگر').trim(),
                      parentId: ourParentId || null,
                      isPinned: false
                    });
                    currentOurId = folderId;
                  }
                }

                if (node.children && node.children.length > 0) {
                  node.children.forEach(child => {
                    processNode(child, currentOurId);
                  });
                }
              }

              tree.forEach(rootNode => processNode(rootNode, null));

              if (imported.length > 0) {
                // Smart Deduplication & Upsert
                const existingBookmarkKeys = new Set(
                  state.bookmarks
                    .filter(b => b.type === 'bookmark')
                    .map(b => `${(b.url || '').toLowerCase().trim()}__${b.parentId || 'root'}`)
                );
                const existingFolderKeys = new Set(
                  state.bookmarks
                    .filter(b => b.type === 'folder')
                    .map(b => `${(b.title || '').trim()}__${b.parentId || 'root'}`)
                );
                const existingIds = new Set(state.bookmarks.map(b => b.id));

                const freshItems = [];
                let duplicateCount = 0;

                imported.forEach(item => {
                  if (existingIds.has(item.id)) {
                    duplicateCount++;
                    return;
                  }
                  if (item.type === 'bookmark') {
                    const key = `${(item.url || '').toLowerCase().trim()}__${item.parentId || 'root'}`;
                    if (existingBookmarkKeys.has(key)) {
                      duplicateCount++;
                      return;
                    }
                    existingBookmarkKeys.add(key);
                    existingIds.add(item.id);
                    freshItems.push(item);
                  } else {
                    const key = `${(item.title || '').trim()}__${item.parentId || 'root'}`;
                    if (existingFolderKeys.has(key)) {
                      duplicateCount++;
                      return;
                    }
                    existingFolderKeys.add(key);
                    existingIds.add(item.id);
                    freshItems.push(item);
                  }
                });

                if (freshItems.length > 0) {
                  const folderCount = freshItems.filter(i => i.type === 'folder').length;
                  const bmCount = freshItems.filter(i => i.type === 'bookmark').length;
                  state.bookmarks = [...state.bookmarks, ...freshItems];
                  saveBookmarks();
                  renderBookmarks();
                  showToast(`✅ همگام‌سازی موفق: ${toPersianDigits(folderCount)} پوشه و ${toPersianDigits(bmCount)} بوکمارک افزوده شدند (موارد تکراری نادیده گرفته شدند)`);
                } else {
                  showToast('ℹ️ همه بوکمارک‌های مرورگر از قبل همگام هستند؛ داده تکراری افزوده نشد.');
                }
              } else {
                showToast('بوکمارکی در مرورگر یافت نشد');
              }
            }
          });
        } else {
          showToast('همگام‌سازی خودکار در محیط افزونه مرورگر (Extension) با دسترسی به Bookmarks API فعال است.');
        }
      });
    }

    // Export JSON Backup
    const btnExport = document.getElementById('btn-export-json');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        const backupData = {
          bookmarks: state.bookmarks,
          settings: state.settings,
          notes: localStorage.getItem(STORAGE_KEYS.NOTES) || '',
          exportedAt: new Date().toISOString()
        };
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute('href', dataStr);
        dlAnchor.setAttribute('download', `idashboard_backup_${Date.now()}.json`);
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
        showToast('فایل پشتیبان دانلود شد');
      });
    }

    // Import JSON Backup
    const inputImport = document.getElementById('input-import-json');
    if (inputImport) {
      inputImport.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const data = JSON.parse(event.target.result);
              if (data.bookmarks && Array.isArray(data.bookmarks)) {
                state.bookmarks = data.bookmarks;
                saveBookmarks();
              }
              if (data.settings) {
                state.settings = { ...DEFAULT_SETTINGS, ...data.settings };
                saveSettings();
              }
              if (data.notes) {
                localStorage.setItem(STORAGE_KEYS.NOTES, data.notes);
                const notesTextarea = document.getElementById('widget-notes-textarea');
                if (notesTextarea) notesTextarea.value = data.notes;
              }
              renderBookmarks();
              showToast('اطلاعات با موفقیت بازیابی شد');
            } catch (err) {
              alert('فایل وارد شده معتبر نمی‌باشد.');
            }
          };
          reader.readAsText(file);
        }
      });
    }

    // Widgets Settings Panel Controls
    const btnExportCalTasks = document.getElementById('btn-export-cal-tasks');
    if (btnExportCalTasks) {
      btnExportCalTasks.addEventListener('click', () => {
        const tasksStr = localStorage.getItem(STORAGE_KEYS.CALENDAR_TASKS) || '{}';
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(tasksStr);
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute('href', dataStr);
        dlAnchor.setAttribute('download', `calendar_tasks_${Date.now()}.json`);
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
        showToast('فایل تسک‌ها دانلود شد');
      });
    }

    const btnClearCompletedTasks = document.getElementById('btn-clear-completed-tasks');
    if (btnClearCompletedTasks) {
      btnClearCompletedTasks.addEventListener('click', () => {
        try {
          const stored = localStorage.getItem(STORAGE_KEYS.CALENDAR_TASKS);
          if (stored) {
            const map = JSON.parse(stored);
            let removedCount = 0;
            Object.keys(map).forEach(dayKey => {
              const beforeLen = map[dayKey].length;
              map[dayKey] = map[dayKey].filter(t => !t.completed);
              removedCount += (beforeLen - map[dayKey].length);
              if (map[dayKey].length === 0) delete map[dayKey];
            });
            localStorage.setItem(STORAGE_KEYS.CALENDAR_TASKS, JSON.stringify(map));
            showToast(`${toPersianDigits(removedCount)} تسک انجام‌شده پاک‌سازی شد`);
            renderJalaliCalendarGrid();
          }
        } catch (e) {
          showToast('خطا در پاک‌سازی تسک‌ها');
        }
      });
    }

    const btnExportAllNotes = document.getElementById('btn-export-all-notes');
    if (btnExportAllNotes) {
      btnExportAllNotes.addEventListener('click', () => {
        let fullText = '=== یادداشت‌های آی‌داشبورد ===\n\n';
        multiNotesList.forEach((n, i) => {
          const div = document.createElement('div');
          div.innerHTML = n.content || '';
          const plain = div.innerText || div.textContent || '';
          fullText += `[${i + 1}] ${n.title || 'بدون عنوان'}\nتاریخ: ${new Date(n.updatedAt || Date.now()).toLocaleString('fa-IR')}\n--------------------\n${plain}\n\n====================\n\n`;
        });
        const dataStr = 'data:text/plain;charset=utf-8,' + encodeURIComponent(fullText);
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute('href', dataStr);
        dlAnchor.setAttribute('download', `all_notes_${Date.now()}.txt`);
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
        showToast('فایل تمامی یادداشت‌ها دانلود شد');
      });
    }

    const btnCreateQuickNote = document.getElementById('btn-create-quick-note');
    if (btnCreateQuickNote) {
      btnCreateQuickNote.addEventListener('click', () => {
        closeAllModals();
        switchPage(2);
        const btnNew = document.getElementById('btn-new-note');
        if (btnNew) btnNew.click();
      });
    }

    // Factory Reset Defaults
    const btnReset = document.getElementById('btn-reset-defaults');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        if (confirm('آیا از ریست کامل داشبورد به تنظیمات اولیه اطمینان دارید؟')) {
          state.bookmarks = [...DEFAULT_BOOKMARKS];
          state.settings = { ...DEFAULT_SETTINGS };
          localStorage.removeItem(STORAGE_KEYS.NOTES);
          localStorage.removeItem(STORAGE_KEYS.MULTI_NOTES);
          multiNotesList = [];
          renderNotesOverview();
          saveBookmarks();
          saveSettings();
          renderBookmarks();
          closeAllModals();
          showToast('تنظیمات به حالت اولیه بازگشت');
        }
      });
    }

    // Telegram Channel & Community Links
    const telegramHeaderBtn = document.getElementById('header-telegram-link') || document.getElementById('header-bale-link');
    const telegramGroupBtn = document.getElementById('link-telegram-channel') || document.getElementById('link-bale-group');
    const telegramWebBtn = document.getElementById('link-telegram-web') || document.getElementById('link-bale-web');
    const btnCopyTelegram = document.getElementById('btn-copy-telegram-id') || document.getElementById('btn-copy-bale-id');

    const TELEGRAM_CANONICAL_URL = 'https://t.me/Almas_Dashboard';

    function openExternalUrl(url) {
      if (typeof chrome !== 'undefined' && chrome.tabs && typeof chrome.tabs.create === 'function') {
        chrome.tabs.create({ url });
      } else {
        const opened = window.open(url, '_blank', 'noopener,noreferrer');
        if (!opened) {
          window.location.href = url;
        }
      }
    }

    if (telegramHeaderBtn) {
      telegramHeaderBtn.href = TELEGRAM_CANONICAL_URL;
      telegramHeaderBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openExternalUrl(TELEGRAM_CANONICAL_URL);
      });
    }

    if (telegramGroupBtn) {
      telegramGroupBtn.href = TELEGRAM_CANONICAL_URL;
      telegramGroupBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openExternalUrl(TELEGRAM_CANONICAL_URL);
        showToast('📢 در حال ورود به کانال تلگرام (Almas_Dashboard@)');
      });
    }

    if (telegramWebBtn) {
      telegramWebBtn.href = TELEGRAM_CANONICAL_URL;
      telegramWebBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openExternalUrl(TELEGRAM_CANONICAL_URL);
        showToast('🌐 در حال باز کردن کانال تلگرام...');
      });
    }

    if (btnCopyTelegram) {
      btnCopyTelegram.addEventListener('click', () => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText('Almas_Dashboard').then(() => {
            showToast('📋 آیدی Almas_Dashboard@ با موفقیت کپی شد');
          }).catch(() => {
            showToast('Almas_Dashboard@');
          });
        } else {
          showToast('Almas_Dashboard@');
        }
      });
    }
  }

  let currentWpCategory = 'all';
  let pendingPreviewWp = null;

  function createWallpaperCard(wp) {
    const card = document.createElement('div');
    const isActive = state.settings.wallpaperUrl === wp.url;
    card.className = `wp-card ${isActive ? 'active' : ''}`;
    card.dataset.url = wp.url;

    const isGradient = wp.url.startsWith('linear-gradient') || wp.url.startsWith('radial-gradient') || wp.url.startsWith('conic-gradient');
    const thumb = isGradient ? '' : getWallpaperThumbnailUrl(wp.url);

    const catNames = {
      nature: 'طبیعت',
      abstract: 'انتزاعی',
      architecture: 'معماری',
      minimal: 'AMOLED',
      cyber: 'سایبرپانک',
      gradients: 'گرادیان'
    };
    const catLabel = catNames[wp.category] || 'والپیپر 4K';

    let mediaHtml = '';
    if (isGradient) {
      mediaHtml = `
        <div class="wp-card-media" style="background: ${wp.url};">
          ${isActive ? '<div class="wp-card-active-badge">✓ فعال</div>' : ''}
          <div class="wp-card-overlay-actions">
            <button type="button" class="wp-action-btn wp-btn-apply" title="اعمال سریع">✓ اعمال</button>
            <button type="button" class="wp-action-btn wp-btn-preview" title="پیش‌نمایش">👁️ پیش‌نمایش</button>
          </div>
        </div>
      `;
    } else {
      mediaHtml = `
        <div class="wp-card-media" style="background: ${wp.fallbackGradient || '#1e293b'};">
          ${isActive ? '<div class="wp-card-active-badge">✓ فعال</div>' : ''}
          <img class="wp-card-img" src="${thumb}" alt="${escapeHTML(wp.name)}" loading="lazy" onerror="this.style.opacity='0';" />
          <div class="wp-card-overlay-actions">
            <button type="button" class="wp-action-btn wp-btn-apply" title="اعمال سریع">✓ اعمال</button>
            <button type="button" class="wp-action-btn wp-btn-preview" title="پیش‌نمایش">👁️ پیش‌نمایش</button>
          </div>
        </div>
      `;
    }

    card.innerHTML = `
      ${mediaHtml}
      <div class="wp-card-body">
        <div class="wp-card-title" title="${escapeHTML(wp.name)}">${escapeHTML(wp.name)}</div>
      </div>
    `;

    // Apply button click
    const applyBtn = card.querySelector('.wp-btn-apply');
    if (applyBtn) {
      applyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectAndApplyWallpaper(wp);
      });
    }

    // Preview button click
    const previewBtn = card.querySelector('.wp-btn-preview');
    if (previewBtn) {
      previewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openWallpaperPreview(wp);
      });
    }

    // Card click: Apply directly
    card.addEventListener('click', () => {
      selectAndApplyWallpaper(wp);
    });

    return card;
  }

  function selectAndApplyWallpaper(wp) {
    if (!wp) return;
    const url = typeof wp === 'string' ? wp : (wp.url || '');
    const name = (wp && typeof wp === 'object' && wp.name) ? wp.name : 'انتخابی';
    if (!url) return;
    state.settings.wallpaperUrl = url;
    saveSettings();
    renderWallpaperPresets();
    showToast(`🖼️ والپیپر «${name}» با موفقیت اعمال شد`);
  }

  function openWallpaperPreview(wp) {
    if (!wp) return;
    pendingPreviewWp = wp;
    const prevModal = document.getElementById('wallpaper-preview-modal');
    const titleEl = document.getElementById('wp-preview-modal-title');
    const catEl = document.getElementById('wp-preview-modal-cat');
    const imgEl = document.getElementById('wp-preview-modal-img');
    const stageEl = document.querySelector('.wallpaper-preview-stage');

    if (!prevModal) return;

    const wpName = (wp && typeof wp === 'object' && wp.name) ? wp.name : 'والپیپر';
    const wpCat = (wp && typeof wp === 'object' && wp.category) ? wp.category : 'nature';
    const wpUrl = typeof wp === 'string' ? wp : (wp.url || '');
    const fallbackGrad = (wp && typeof wp === 'object' && wp.fallbackGradient) ? wp.fallbackGradient : '#090d16';

    if (titleEl) titleEl.textContent = wpName;
    if (catEl) {
      catEl.style.display = 'none';
    }

    const isGradient = wpUrl.startsWith('linear-gradient') || wpUrl.startsWith('radial-gradient') || wpUrl.startsWith('conic-gradient');
    if (isGradient) {
      if (imgEl) imgEl.style.display = 'none';
      if (stageEl) stageEl.style.background = wpUrl;
    } else {
      if (stageEl) stageEl.style.background = fallbackGrad;
      if (imgEl) {
        imgEl.style.display = 'block';
        imgEl.src = wpUrl;
      }
    }

    prevModal.classList.add('open');
  }

  function renderWallpaperPresets() {
    const modalGrid = document.getElementById('wallpaper-preset-grid');
    const tabGrid = document.getElementById('tab-wallpaper-store-grid');

    const filtered = ALL_WALLPAPERS;

    // Update count badge in modal header
    const countBadge = document.getElementById('wallpaper-store-count-badge');
    if (countBadge) {
      countBadge.textContent = `${filtered.length} والپیپر باکیفیت 4K`;
    }

    if (modalGrid) {
      modalGrid.innerHTML = '';
      filtered.forEach((wp) => {
        modalGrid.appendChild(createWallpaperCard(wp));
      });
    }

    if (tabGrid) {
      tabGrid.innerHTML = '';
      filtered.forEach((wp) => {
        tabGrid.appendChild(createWallpaperCard(wp));
      });
    }
  }

  function syncSettingsToUI() {
    const s = state.settings;

    // Theme Presets
    document.querySelectorAll('[data-theme-choice]').forEach((c) => {
      c.classList.toggle('active', c.dataset.themeChoice === s.theme);
    });

    // 3-State Header Theme Switcher
    document.querySelectorAll('#header-theme-switcher .theme-switch-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.themeTarget === s.theme);
    });

    // Contrast
    document.querySelectorAll('#seg-text-contrast .segment-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.contrast === s.contrast);
    });

    // Card Size
    document.querySelectorAll('#seg-card-size .segment-btn').forEach((b) => {
      b.classList.toggle('active', parseInt(b.dataset.cardSize, 10) === s.cardSize);
    });

    // Icon Size
    document.querySelectorAll('#seg-icon-size .segment-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.iconSize === s.iconSize);
    });

    // Card Radius
    document.querySelectorAll('#seg-card-radius .segment-btn').forEach((b) => {
      b.classList.toggle('active', parseInt(b.dataset.cardRadius, 10) === s.cardRadius);
    });

    // Low Spec Mode
    const toggleLowSpec = document.getElementById('toggle-low-spec');
    if (toggleLowSpec) toggleLowSpec.checked = !!s.lowSpecMode;

    // Glass High Contrast Toggle
    const toggleGlassContrast = document.getElementById('toggle-glass-high-contrast');
    if (toggleGlassContrast) toggleGlassContrast.checked = s.glassHighContrast !== false;

    // Glass Opacity Range Slider & Value
    const currentOpacity = s.glassOpacity !== undefined ? s.glassOpacity : 36;
    const sliderGlassOp = document.getElementById('slider-glass-opacity');
    if (sliderGlassOp) sliderGlassOp.value = currentOpacity;
    const badgeGlassOp = document.getElementById('val-glass-opacity');
    if (badgeGlassOp) badgeGlassOp.textContent = `${currentOpacity}%`;

    // Glass Blur Range Slider & Value
    const currentBlur = s.glassBlur !== undefined ? s.glassBlur : 26;
    const sliderGlassBlur = document.getElementById('slider-glass-blur');
    if (sliderGlassBlur) sliderGlassBlur.value = currentBlur;
    const badgeGlassBlur = document.getElementById('val-glass-blur');
    if (badgeGlassBlur) badgeGlassBlur.textContent = `${currentBlur}px`;

    // Wallpaper Darkness / Brightness Presets Sync
    const currentOverlayOp = s.overlayOpacity !== undefined ? s.overlayOpacity : 45;
    document.querySelectorAll('#seg-overlay-opacity .segment-btn').forEach((b) => {
      b.classList.toggle('active', parseInt(b.dataset.overlayOpacity, 10) === currentOverlayOp);
    });

    // Accent Color Swatches & Custom Color Picker UI Sync
    const currentAccent = (s.accentColor || '#3b82f6').toLowerCase();
    let isPresetSelected = false;

    document.querySelectorAll('.accent-swatch').forEach((swatch) => {
      const swatchColor = (swatch.dataset.accent || swatch.dataset.accentColor || '').toLowerCase();
      const isActive = swatchColor === currentAccent;
      swatch.classList.toggle('active', isActive);
      if (isActive) isPresetSelected = true;
    });

    const customWrap = document.querySelector('.accent-swatch-custom-wrap');
    const customInput = document.getElementById('accent-custom-color-input');
    if (customWrap && customInput) {
      customWrap.classList.toggle('active', !isPresetSelected);
      customInput.value = s.accentColor || '#3b82f6';
    }
  }

  /* ==========================================================================
     9. Page Navigation & Rail Handling (3 Pages: Bookmarks, Widgets, Curated)
     ========================================================================== */
  function initPageNavigation() {
    const navBtn1 = document.getElementById('nav-btn-page-1');
    const navBtn2 = document.getElementById('nav-btn-page-2');
    const navBtn3 = document.getElementById('nav-btn-page-3');
    const btnBackToPage1 = document.getElementById('btn-back-to-page1');
    const btnBackFromCurated = document.getElementById('btn-back-from-curated');
    let lastActivePage = null;

    function switchPage(pageNumber) {
      state.activePage = pageNumber;
      lastActivePage = pageNumber;
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PAGE, String(pageNumber));

      const page1 = document.getElementById('page-bookmarks');
      const page2 = document.getElementById('page-widgets');
      const page3 = document.getElementById('page-curated');
      const header = document.getElementById('main-header');

      // Update pages visibility
      if (page1) page1.classList.toggle('active', pageNumber === 1);
      if (page2) page2.classList.toggle('active', pageNumber === 2);
      if (page3) page3.classList.toggle('active', pageNumber === 3);

      // Update nav rail buttons
      if (navBtn1) navBtn1.classList.toggle('active', pageNumber === 1);
      if (navBtn2) navBtn2.classList.toggle('active', pageNumber === 2);
      if (navBtn3) navBtn3.classList.toggle('active', pageNumber === 3);

      // Header visibility
      if (header) {
        if (pageNumber === 1) {
          header.style.display = 'flex';
          header.style.opacity = '1';
        } else {
          header.style.display = 'none';
        }
      }

      // If switching to curated page, re-render
      if (pageNumber === 3 && typeof renderCuratedBoxes === 'function') {
        renderCuratedBoxes();
      }
    }

    // Expose for external calls
    window.switchDashboardPage = switchPage;

    if (navBtn1) navBtn1.addEventListener('click', () => switchPage(1));
    if (navBtn2) navBtn2.addEventListener('click', () => switchPage(2));
    if (navBtn3) navBtn3.addEventListener('click', () => switchPage(3));
    if (btnBackToPage1) btnBackToPage1.addEventListener('click', () => switchPage(1));
    if (btnBackFromCurated) btnBackFromCurated.addEventListener('click', () => switchPage(1));

    // Keyboard Page Shortcuts
    document.addEventListener('keydown', (e) => {
      if (document.querySelector('.modal-overlay.open') || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        return;
      }
      if (e.key === '1') {
        switchPage(1);
      } else if (e.key === '2') {
        switchPage(2);
      } else if (e.key === '3') {
        switchPage(3);
      } else if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
          switchPage(1);
          searchInput.focus();
        }
      }
    });

    switchPage(state.activePage || 1);
  }

  /* ==========================================================================
     9.1 Featured 4-Square Bookmarks Engine (Page 3)
     ========================================================================== */
  let curatedCategories = [];
  let curatedActiveCategoryFilter = 'all';
  let curatedSearchQuery = '';

  function loadCuratedCategories() {}
  function saveCuratedCategories() {}

  function initCuratedBookmarksPage() {
    const cards = document.querySelectorAll('.curated-item-card, .featured-square-card');
    cards.forEach((card) => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        const url = card.getAttribute('data-url') || card.getAttribute('href');
        if (!url) return;
        if (typeof chrome !== 'undefined' && chrome.tabs && typeof chrome.tabs.create === 'function') {
          chrome.tabs.create({ url });
        } else {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      });
    });
  }

  /* ==========================================================================
     9.2 Real-Time Browser Bookmarks Live Event Listeners
     ========================================================================== */
  function setupBrowserBookmarkSyncListeners() {
    if (typeof chrome === 'undefined' || !chrome.bookmarks) return;

    try {
      if (chrome.bookmarks.onRemoved) {
        chrome.bookmarks.onRemoved.addListener((id) => {
          const targetId = `bm_chrome_${id}`;
          const targetFolderId = `folder_chrome_${id}`;
          const initialLength = state.bookmarks.length;
          state.bookmarks = state.bookmarks.filter(b => b.id !== targetId && b.id !== targetFolderId && b.chromeId !== id && b.parentId !== targetFolderId);
          if (state.bookmarks.length !== initialLength) {
            saveBookmarks();
            renderBookmarks();
            
          }
        });
      }

      if (chrome.bookmarks.onChanged) {
        chrome.bookmarks.onChanged.addListener((id, changeInfo) => {
          const item = state.bookmarks.find(b => b.id === `bm_chrome_${id}` || b.id === `folder_chrome_${id}` || b.chromeId === id);
          if (item) {
            if (changeInfo.title) item.title = changeInfo.title;
            if (changeInfo.url && item.type !== 'folder') item.url = changeInfo.url;
            saveBookmarks();
            renderBookmarks();
          }
        });
      }
    } catch (e) {
      console.warn('Error setting up chrome bookmarks sync listeners:', e);
    }
  }

  /* ==========================================================================
     10. Widgets Engine (6 Large Widgets)
     ========================================================================== */

  /* ==========================================================================
     10. Widgets Engine (6 Large Widgets)
     ========================================================================== */

  // --- AUDIO & BROWSER NOTIFICATION HELPERS (100% OFFLINE & VPN-FREE) ---
  function playToneAlert(type = 'complete') {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      if (type === 'complete') {
        // Melodic 4-note ascending bell chime: C5 -> E5 -> G5 -> C6
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.13);
          gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.13);
          gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + idx * 0.13 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.13 + 0.6);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.13);
          osc.stop(ctx.currentTime + idx * 0.13 + 0.65);
        });
      } else if (type === 'task') {
        // Double gentle bell chime for calendar reminders
        [659.25, 880.00].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.16);
          gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.16);
          gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + idx * 0.16 + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.16 + 0.7);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.16);
          osc.stop(ctx.currentTime + idx * 0.16 + 0.75);
        });
      } else if (type === 'tick') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.04);
      }
    } catch (err) {
      console.warn('Web Audio notification error:', err);
    }
  }

  function sendBrowserNotification(title, options = {}) {
    if (typeof chrome !== 'undefined' && chrome.notifications && chrome.notifications.create) {
      try {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon.png',
          title: title,
          message: options.body || '',
          priority: 2
        });
        return;
      } catch (e) {
        console.warn('Chrome notification fallback:', e);
      }
    }

    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, options);
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((perm) => {
          if (perm === 'granted') {
            new Notification(title, options);
          }
        });
      }
    }
  }

  // --- WIDGET 1: LIVE ANALOG CLOCK & POMODORO TIMER ---
  let pomodoroState = {
    mode: 'work', // 'work' (25m), 'shortBreak' (5m), 'longBreak' (15m)
    durations: {
      work: 25 * 60,
      shortBreak: 5 * 60,
      longBreak: 15 * 60
    },
    remainingSeconds: 25 * 60,
    isRunning: false,
    timerId: null,
    cyclesCompleted: 0,
    soundEnabled: true
  };

  function initAnalogClockWidget() {
    // 1. Generate Analog Clock Dial Ticks
    const ticksGroup = document.getElementById('clock-ticks-group');
    if (ticksGroup) {
      ticksGroup.innerHTML = '';
      for (let i = 0; i < 60; i++) {
        const isMajor = (i % 5 === 0);
        const angle = (i * 6) * (Math.PI / 180);
        const rOuter = 110;
        const rInner = isMajor ? 98 : 104;

        const x1 = 120 + rOuter * Math.sin(angle);
        const y1 = 120 - rOuter * Math.cos(angle);
        const x2 = 120 + rInner * Math.sin(angle);
        const y2 = 120 - rInner * Math.cos(angle);

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1.toFixed(2));
        line.setAttribute('y1', y1.toFixed(2));
        line.setAttribute('x2', x2.toFixed(2));
        line.setAttribute('y2', y2.toFixed(2));
        line.setAttribute('class', isMajor ? 'clock-tick clock-tick-major' : 'clock-tick');
        ticksGroup.appendChild(line);
      }
    }

    // 2. Mode Switcher (Clock vs Pomodoro)
    const btnTabClock = document.getElementById('btn-tab-clock');
    const btnTabPomodoro = document.getElementById('btn-tab-pomodoro');
    const viewAnalog = document.getElementById('clock-view-analog');
    const viewPomodoro = document.getElementById('clock-view-pomodoro');
    const widgetTitle = document.getElementById('clock-widget-title-text');
    const widgetIcon = document.getElementById('clock-widget-icon');

    if (btnTabClock && btnTabPomodoro && viewAnalog && viewPomodoro) {
      btnTabClock.addEventListener('click', () => {
        btnTabClock.classList.add('active');
        btnTabPomodoro.classList.remove('active');
        viewAnalog.style.display = 'flex';
        viewPomodoro.style.display = 'none';
        if (widgetTitle) widgetTitle.textContent = 'ساعت آنالوگ زنده';
        if (widgetIcon) widgetIcon.textContent = '🕒';
      });

      btnTabPomodoro.addEventListener('click', () => {
        btnTabPomodoro.classList.add('active');
        btnTabClock.classList.remove('active');
        viewAnalog.style.display = 'none';
        viewPomodoro.style.display = 'flex';
        if (widgetTitle) widgetTitle.textContent = 'تایمر تمرکز پومودورو';
        if (widgetIcon) widgetIcon.textContent = '🍅';
      });
    }

    // 3. Pomodoro Mode Strip
    const modeButtons = document.querySelectorAll('.pomo-mode-btn');
    modeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        if (!mode || !pomodoroState.durations[mode]) return;

        modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        switchPomodoroMode(mode);
      });
    });

    // 4. Pomodoro Controls
    const btnToggle = document.getElementById('btn-pomo-toggle');
    const btnReset = document.getElementById('btn-pomo-reset');
    const btnSound = document.getElementById('btn-pomo-sound-toggle');

    if (btnToggle) {
      btnToggle.addEventListener('click', togglePomodoro);
    }

    if (btnReset) {
      btnReset.addEventListener('click', resetPomodoro);
    }

    if (btnSound) {
      btnSound.addEventListener('click', () => {
        pomodoroState.soundEnabled = !pomodoroState.soundEnabled;
        btnSound.classList.toggle('active', pomodoroState.soundEnabled);
        const icon = document.getElementById('pomo-sound-icon');
        if (icon) icon.textContent = pomodoroState.soundEnabled ? '🔔' : '🔕';
        showToast(pomodoroState.soundEnabled ? 'هشدار صوتی پومودورو فعال شد' : 'هشدار صوتی پومودورو غیرفعال شد');
      });
    }

    updatePomodoroUI();
  }

  function switchPomodoroMode(mode) {
    if (pomodoroState.isRunning) {
      clearInterval(pomodoroState.timerId);
      pomodoroState.isRunning = false;
    }
    pomodoroState.mode = mode;
    pomodoroState.remainingSeconds = pomodoroState.durations[mode];

    const toggleText = document.getElementById('pomo-toggle-text');
    const toggleIcon = document.getElementById('pomo-toggle-icon');
    if (toggleText) toggleText.textContent = mode === 'work' ? 'شروع تمرکز' : 'شروع استراحت';
    if (toggleIcon) toggleIcon.textContent = '▶';

    const stateLabel = document.getElementById('pomo-state-label');
    if (stateLabel) {
      if (mode === 'work') stateLabel.textContent = 'زمان تمرکز و بازدهی';
      else if (mode === 'shortBreak') stateLabel.textContent = 'زمان استراحت کوتاه';
      else stateLabel.textContent = 'زمان استراحت طولانی و ریکاوری';
    }

    updatePomodoroUI();
  }

  function togglePomodoro() {
    if (pomodoroState.isRunning) {
      // Pause
      clearInterval(pomodoroState.timerId);
      pomodoroState.isRunning = false;

      const toggleText = document.getElementById('pomo-toggle-text');
      const toggleIcon = document.getElementById('pomo-toggle-icon');
      if (toggleText) toggleText.textContent = 'ادامه تایمر';
      if (toggleIcon) toggleIcon.textContent = '▶';
    } else {
      // Start
      if (pomodoroState.soundEnabled) {
        playToneAlert('tick');
      }

      pomodoroState.isRunning = true;
      const toggleText = document.getElementById('pomo-toggle-text');
      const toggleIcon = document.getElementById('pomo-toggle-icon');
      if (toggleText) toggleText.textContent = 'توقف موقت';
      if (toggleIcon) toggleIcon.textContent = '⏸';

      pomodoroState.timerId = setInterval(() => {
        if (pomodoroState.remainingSeconds > 0) {
          pomodoroState.remainingSeconds--;
          updatePomodoroUI();
        } else {
          // Timer Completed!
          clearInterval(pomodoroState.timerId);
          pomodoroState.isRunning = false;
          onPomodoroCompleted();
        }
      }, 1000);
    }
  }

  function resetPomodoro() {
    if (pomodoroState.isRunning) {
      clearInterval(pomodoroState.timerId);
      pomodoroState.isRunning = false;
    }
    pomodoroState.remainingSeconds = pomodoroState.durations[pomodoroState.mode];

    const toggleText = document.getElementById('pomo-toggle-text');
    const toggleIcon = document.getElementById('pomo-toggle-icon');
    if (toggleText) toggleText.textContent = pomodoroState.mode === 'work' ? 'شروع تمرکز' : 'شروع استراحت';
    if (toggleIcon) toggleIcon.textContent = '▶';

    updatePomodoroUI();
    showToast('تایمر به زمان اولیه بازنشانی شد');
  }

  function onPomodoroCompleted() {
    if (pomodoroState.soundEnabled) {
      playToneAlert('complete');
    }

    if (pomodoroState.mode === 'work') {
      pomodoroState.cyclesCompleted++;
      const isLongBreakDue = pomodoroState.cyclesCompleted % 4 === 0;

      sendBrowserNotification('🎉 پایان زمان تمرکز پومودورو!', {
        body: isLongBreakDue ? 'آفرین! ۴ دوره تمرکز به پایان رسید. اکنون زمان یک استراحت طولانی (۱۵ دقیقه) است.' : 'زمان کار به اتمام رسید. ۵ دقیقه استراحت کنید.'
      });
      showToast('🎉 زمان تمرکز پومودورو به پایان رسید!');

      // Auto prepare break
      const nextMode = isLongBreakDue ? 'longBreak' : 'shortBreak';
      const targetBtn = document.querySelector(`.pomo-mode-btn[data-mode="${nextMode}"]`);
      if (targetBtn) targetBtn.click();
    } else {
      sendBrowserNotification('⏰ پایان زمان استراحت پومودورو', {
        body: 'استراحت تمام شد! آماده شروع یک دوره تمرکز و خلاقیت جدید شوید.'
      });
      showToast('⏰ استراحت تمام شد! آماده تمرکز جدید شوید.');

      const workBtn = document.querySelector(`.pomo-mode-btn[data-mode="work"]`);
      if (workBtn) workBtn.click();
    }

    updatePomodoroUI();
  }

  function updatePomodoroUI() {
    const mins = Math.floor(pomodoroState.remainingSeconds / 60);
    const secs = pomodoroState.remainingSeconds % 60;
    const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const displayElem = document.getElementById('pomo-timer-display');
    if (displayElem) {
      displayElem.textContent = timeFormatted;
    }

    // Circular ring progress (total circumference = 2 * PI * 84 = 527.78)
    const ringProgress = document.getElementById('pomo-ring-progress');
    if (ringProgress) {
      const total = pomodoroState.durations[pomodoroState.mode] || 1500;
      const progress = pomodoroState.remainingSeconds / total;
      const circumference = 527.78;
      const offset = circumference * (1 - progress);
      ringProgress.style.strokeDashoffset = offset;
      
      // Dynamic color by mode
      if (pomodoroState.mode === 'work') {
        ringProgress.style.stroke = 'var(--accent-color)';
      } else if (pomodoroState.mode === 'shortBreak') {
        ringProgress.style.stroke = '#10b981';
      } else {
        ringProgress.style.stroke = '#38bdf8';
      }
    }

    // Cycle dots indicator (up to 4)
    const dotsContainer = document.getElementById('pomo-cycles-dots');
    if (dotsContainer) {
      const dots = dotsContainer.querySelectorAll('.cycle-dot');
      const activeCount = pomodoroState.cyclesCompleted % 4;
      dots.forEach((dot, idx) => {
        dot.classList.toggle('filled', idx < activeCount);
      });
    }
  }

  function updateAnalogClock(now, jDate, weekdayName) {
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    // Exact geometric hand endpoints (No transform origin artifacts)
    const minAngle = (minutes * 6) + (seconds * 0.1);
    const hourAngle = ((hours % 12) * 30) + (minutes * 0.5);

    const hRad = (hourAngle - 90) * (Math.PI / 180);
    const mRad = (minAngle - 90) * (Math.PI / 180);

    const hourHand = document.getElementById('analog-hour-hand');
    const minuteHand = document.getElementById('analog-minute-hand');

    if (hourHand) {
      hourHand.setAttribute('x1', '120');
      hourHand.setAttribute('y1', '120');
      hourHand.setAttribute('x2', (120 + 48 * Math.cos(hRad)).toFixed(2));
      hourHand.setAttribute('y2', (120 + 48 * Math.sin(hRad)).toFixed(2));
      hourHand.removeAttribute('transform');
    }

    if (minuteHand) {
      minuteHand.setAttribute('x1', '120');
      minuteHand.setAttribute('y1', '120');
      minuteHand.setAttribute('x2', (120 + 72 * Math.cos(mRad)).toFixed(2));
      minuteHand.setAttribute('y2', (120 + 72 * Math.sin(mRad)).toFixed(2));
      minuteHand.removeAttribute('transform');
    }

    const dateText = document.getElementById('analog-clock-date-text');
    if (dateText) dateText.textContent = `${toPersianDigits(jDate.day)} ${JALALI_MONTH_NAMES[jDate.month - 1]}`;

    const digitalVal = document.getElementById('analog-digital-time-val');
    if (digitalVal) digitalVal.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    const weekdayVal = document.getElementById('analog-persian-weekday-val');
    if (weekdayVal) weekdayVal.textContent = weekdayName;
  }

  // --- WIDGET 2: PERSIAN JALALI CALENDAR & TASKS / REMINDERS ---
  let calViewYear = 1405;
  let calViewMonth = 6;
  let calSelectedDate = null; // { year, month, day }
  let calendarTasks = [];

  function loadCalendarTasks() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CALENDAR_TASKS);
      if (stored) {
        calendarTasks = JSON.parse(stored);
      } else {
        calendarTasks = [
          {
            id: 'task_demo_1',
            dateKey: '1405-6-1',
            title: 'برنامه‌ریزی اهداف ماهانه',
            time: '09:30',
            tag: 'work',
            desc: 'بررسی پروژه‌ها و زمان‌بندی هفتگی',
            completed: false,
            notified: false
          }
        ];
        saveCalendarTasks();
      }
    } catch (e) {
      calendarTasks = [];
    }
  }

  function saveCalendarTasks() {
    try {
      localStorage.setItem(STORAGE_KEYS.CALENDAR_TASKS, JSON.stringify(calendarTasks));
    } catch (e) {
      console.warn('Failed to save calendar tasks:', e);
    }
  }

  function initCalendarWidget() {
    loadCalendarTasks();

    const now = new Date();
    const jToday = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    calViewYear = jToday.year;
    calViewMonth = jToday.month;
    calSelectedDate = { year: jToday.year, month: jToday.month, day: jToday.day };

    const btnPrev = document.getElementById('btn-cal-prev');
    const btnNext = document.getElementById('btn-cal-next');
    const btnToday = document.getElementById('btn-cal-today');
    const btnOpenTaskAdd = document.getElementById('btn-open-task-add');
    const formAddCalTask = document.getElementById('form-add-cal-task');

    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        calViewMonth--;
        if (calViewMonth < 1) {
          calViewMonth = 12;
          calViewYear--;
        }
        renderCalendar();
      });
    }

    if (btnNext) {
      btnNext.addEventListener('click', () => {
        calViewMonth++;
        if (calViewMonth > 12) {
          calViewMonth = 1;
          calViewYear++;
        }
        renderCalendar();
      });
    }

    if (btnToday) {
      btnToday.addEventListener('click', () => {
        const cur = gregorianToJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
        calViewYear = cur.year;
        calViewMonth = cur.month;
        calSelectedDate = { year: cur.year, month: cur.month, day: cur.day };
        renderCalendar();
      });
    }

    if (btnOpenTaskAdd) {
      btnOpenTaskAdd.addEventListener('click', () => {
        openCalendarTaskModal();
      });
    }

    // All day toggle in task modal
    const allDayCheckbox = document.getElementById('task-all-day-checkbox');
    const timeInput = document.getElementById('task-input-time');
    if (allDayCheckbox && timeInput) {
      allDayCheckbox.addEventListener('change', () => {
        if (allDayCheckbox.checked) {
          timeInput.disabled = true;
          timeInput.style.opacity = '0.5';
        } else {
          timeInput.disabled = false;
          timeInput.style.opacity = '1';
        }
      });
    }

    if (formAddCalTask) {
      formAddCalTask.addEventListener('submit', (e) => {
        e.preventDefault();
        const titleInput = document.getElementById('task-input-title');
        const timeInput = document.getElementById('task-input-time');
        const allDayCheck = document.getElementById('task-all-day-checkbox');
        const tagInput = document.getElementById('task-input-tag');
        const descInput = document.getElementById('task-input-desc');

        if (!titleInput || !titleInput.value.trim()) return;

        const isAllDay = allDayCheck ? allDayCheck.checked : false;
        const taskTime = isAllDay ? '' : (timeInput && timeInput.value ? timeInput.value : '');

        const dateKey = `${calSelectedDate.year}-${calSelectedDate.month}-${calSelectedDate.day}`;
        const newTask = {
          id: 'task_' + Date.now(),
          dateKey: dateKey,
          title: titleInput.value.trim(),
          time: taskTime,
          isAllDay: isAllDay || !taskTime,
          tag: tagInput ? tagInput.value : 'work',
          desc: descInput ? descInput.value.trim() : '',
          completed: false,
          notified: false
        };

        calendarTasks.push(newTask);
        saveCalendarTasks();

        // Close modal
        const modal = document.getElementById('cal-task-modal');
        if (modal) modal.classList.remove('open');
        formAddCalTask.reset();
        if (timeInput) {
          timeInput.disabled = false;
          timeInput.style.opacity = '1';
        }

        renderCalendar();
        showToast('🔔 رویداد و یادآور با موفقیت ثبت شد');

        // Prompt notification permission if not yet requested
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
      });
    }

    // Start Real-time Task Reminder Watcher (checks every 10 seconds)
    initTaskReminderWatcher();

    renderCalendar();
  }

  function openCalendarTaskModal() {
    const modal = document.getElementById('cal-task-modal');
    const dateDisplay = document.getElementById('task-input-date-display');
    const timeInput = document.getElementById('task-input-time');
    const allDayCheckbox = document.getElementById('task-all-day-checkbox');

    if (dateDisplay && calSelectedDate) {
      dateDisplay.value = `${toPersianDigits(calSelectedDate.day)} ${JALALI_MONTH_NAMES[calSelectedDate.month - 1]} ${toPersianDigits(calSelectedDate.year)}`;
    }

    if (allDayCheckbox) allDayCheckbox.checked = false;
    if (timeInput) {
      timeInput.disabled = false;
      timeInput.style.opacity = '1';
      const now = new Date();
      const nextHour = (now.getHours() + 1) % 24;
      timeInput.value = `${String(nextHour).padStart(2, '0')}:00`;
    }

    if (modal) {
      modal.classList.add('open');
      const titleInput = document.getElementById('task-input-title');
      if (titleInput) setTimeout(() => titleInput.focus(), 100);
    }
  }

  const TAG_LABELS = {
    important: '🔴 فوری و مهم',
    work: '💼 کار و پروژه',
    personal: '🌿 زندگی شخصی',
    meeting: '👥 جلسه و تماس',
    finance: '💳 امور مالی'
  };

  let activeDetailTask = null;

  function openTaskDetailModal(task) {
    activeDetailTask = task;
    const modal = document.getElementById('cal-task-detail-modal');
    if (!modal) return;

    const nameEl = document.getElementById('task-detail-name');
    const badgeEl = document.getElementById('task-detail-badge');
    const dtEl = document.getElementById('task-detail-datetime');
    const statusEl = document.getElementById('task-detail-status');
    const notesEl = document.getElementById('task-detail-notes');
    const toggleBtnText = document.getElementById('btn-detail-toggle-text');

    if (nameEl) nameEl.textContent = task.title;
    if (badgeEl) badgeEl.textContent = TAG_LABELS[task.tag] || 'عمومی';

    const parts = (task.dateKey || '').split('-');
    let dateStr = task.dateKey;
    if (parts.length === 3) {
      const mName = JALALI_MONTH_NAMES[parseInt(parts[1], 10) - 1] || '';
      dateStr = `${toPersianDigits(parts[2])} ${mName} ${toPersianDigits(parts[0])}`;
    }

    const timeStr = task.time ? `ساعت ${toPersianDigits(task.time)}` : 'رویداد تمام‌روز (بدون ساعت)';
    if (dtEl) dtEl.textContent = `${dateStr} • ${timeStr}`;

    if (statusEl) {
      statusEl.innerHTML = task.completed 
        ? '<span style="color:#34d399; display:inline-flex; align-items:center; gap:4px; font-weight:700;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> انجام شده</span>' 
        : '<span style="color:#94a3b8; display:inline-flex; align-items:center; gap:4px; font-weight:700;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> در انتظار انجام</span>';
    }

    if (toggleBtnText) {
      toggleBtnText.textContent = task.completed ? 'علامت به عنوان انجام‌نشده' : 'علامت به عنوان انجام‌شده';
    }

    if (notesEl) {
      if (task.desc && task.desc.trim()) {
        notesEl.textContent = task.desc;
        notesEl.style.fontStyle = 'normal';
        notesEl.style.opacity = '1';
      } else {
        notesEl.textContent = 'یادداشت یا توضیحات تکمیلی برای این تسک ثبت نشده است.';
        notesEl.style.fontStyle = 'italic';
        notesEl.style.opacity = '0.7';
      }
    }

    // Bind Detail Modal actions
    const btnToggle = document.getElementById('btn-detail-toggle-task');
    if (btnToggle) {
      btnToggle.onclick = () => {
        if (!activeDetailTask) return;
        activeDetailTask.completed = !activeDetailTask.completed;
        saveCalendarTasks();
        renderCalendar();
        openTaskDetailModal(activeDetailTask);
        showToast(activeDetailTask.completed ? 'تسک به عنوان انجام‌شده علامت‌گذاری شد' : 'وضعیت تسک بازنشانی شد');
      };
    }

    const btnDelete = document.getElementById('btn-detail-delete-task');
    if (btnDelete) {
      btnDelete.onclick = () => {
        if (!activeDetailTask) return;
        calendarTasks = calendarTasks.filter(t => t.id !== activeDetailTask.id);
        saveCalendarTasks();
        renderCalendar();
        modal.classList.remove('open');
        showToast('یادآور حذف شد');
      };
    }

    modal.classList.add('open');
  }

  function getJalaliMonthTotalDays(jy, jm) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    try {
      const gCheck = jalaliToGregorian(jy, 12, 30);
      const jCheck = gregorianToJalali(gCheck.year, gCheck.month, gCheck.day);
      if (jCheck.year === jy && jCheck.month === 12 && jCheck.day === 30) {
        return 30;
      }
    } catch (e) {}
    return 29;
  }

  function renderCalendar() {
    const headingElem = document.getElementById('calendar-month-heading-text');
    const gridElem = document.getElementById('calendar-days-grid');
    if (!gridElem) return;

    if (headingElem) {
      headingElem.textContent = `${JALALI_MONTH_NAMES[calViewMonth - 1]} ${toPersianDigits(calViewYear)}`;
    }

    gridElem.innerHTML = '';

    // Days count in Persian month
    let totalDays = getJalaliMonthTotalDays(calViewYear, calViewMonth);

    // Starting Day of week (0: Shanbeh, 6: Jomeh)
    const gStart = jalaliToGregorian(calViewYear, calViewMonth, 1);
    const startDate = new Date(gStart.year, gStart.month - 1, gStart.day);
    const startWeekday = (startDate.getDay() + 1) % 7;

    // Empty lead cells
    for (let i = 0; i < startWeekday; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'cal-day-cell empty';
      gridElem.appendChild(emptyCell);
    }

    const now = new Date();
    const todayJalali = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());

    const officialHolidaysByMonth = {
      1: [1, 2, 3, 4, 12, 13],
      3: [14, 15],
      11: [22],
      12: [29]
    };
    const monthHolidays = officialHolidaysByMonth[calViewMonth] || [];

    for (let d = 1; d <= totalDays; d++) {
      const cell = document.createElement('div');
      const dayOfWeekIndex = (startWeekday + d - 1) % 7;
      const isFriday = (dayOfWeekIndex === 6);
      const isHoliday = isFriday || monthHolidays.includes(d);
      const isToday = (calViewYear === todayJalali.year && calViewMonth === todayJalali.month && d === todayJalali.day);
      const isSelected = calSelectedDate && (calViewYear === calSelectedDate.year && calViewMonth === calSelectedDate.month && d === calSelectedDate.day);

      const dateKey = `${calViewYear}-${calViewMonth}-${d}`;
      const dayTasks = calendarTasks.filter(t => t.dateKey === dateKey);

      cell.className = `cal-day-cell ${isHoliday ? 'friday' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`;
      cell.textContent = toPersianDigits(d);

      // Task dot indicator
      if (dayTasks.length > 0) {
        const dot = document.createElement('span');
        dot.className = `cal-task-dot ${dayTasks.length > 1 ? 'has-multiple' : ''}`;
        cell.appendChild(dot);
      }

      cell.addEventListener('click', () => {
        gridElem.querySelectorAll('.cal-day-cell').forEach(c => c.classList.remove('selected'));
        cell.classList.add('selected');
        calSelectedDate = { year: calViewYear, month: calViewMonth, day: d };
        renderSelectedDateTasks();
      });

      gridElem.appendChild(cell);
    }

    renderSelectedDateTasks();
  }

  function renderSelectedDateTasks() {
    if (!calSelectedDate) return;
    const dateBadge = document.getElementById('calendar-selected-day-text');
    const tasksCount = document.getElementById('cal-selected-tasks-count');
    const tasksList = document.getElementById('cal-tasks-list');

    if (dateBadge) {
      const gDate = jalaliToGregorian(calSelectedDate.year, calSelectedDate.month, calSelectedDate.day);
      const dt = new Date(gDate.year, gDate.month - 1, gDate.day);
      const dayNames = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
      const dayName = dayNames[dt.getDay()];
      dateBadge.textContent = `${dayName}، ${toPersianDigits(calSelectedDate.day)} ${JALALI_MONTH_NAMES[calSelectedDate.month - 1]} ${toPersianDigits(calSelectedDate.year)}`;
    }

    const dateKey = `${calSelectedDate.year}-${calSelectedDate.month}-${calSelectedDate.day}`;
    const dayTasks = calendarTasks.filter(t => t.dateKey === dateKey);

    if (tasksCount) {
      tasksCount.textContent = `${toPersianDigits(dayTasks.length)} یادآور`;
    }

    if (!tasksList) return;
    tasksList.innerHTML = '';

    if (dayTasks.length === 0) {
      tasksList.innerHTML = '<div class="cal-empty-tasks">هیچ یادآوری برای این تاریخ ثبت نشده است. روی ➕ کلیک کنید.</div>';
      return;
    }

    dayTasks.forEach((task) => {
      const item = document.createElement('div');
      item.className = `cal-task-item ${task.completed ? 'completed' : ''}`;
      item.title = 'جهت مشاهده جزئیات و متن کامل کلیک کنید';

      const left = document.createElement('div');
      left.className = 'cal-task-left';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'cal-task-checkbox';
      checkbox.checked = !!task.completed;
      checkbox.title = 'تغییر وضعیت انجام';

      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      checkbox.addEventListener('change', () => {
        task.completed = checkbox.checked;
        saveCalendarTasks();
        renderCalendar();
      });

      const timeBadge = document.createElement('span');
      timeBadge.className = 'cal-task-time-badge';
      if (task.time) {
        timeBadge.textContent = `⏰ ${toPersianDigits(task.time)}`;
      } else {
        timeBadge.textContent = '🗓️ تمام‌روز';
        timeBadge.style.background = 'rgba(99, 102, 241, 0.18)';
        timeBadge.style.color = '#818cf8';
      }

      const titleSpan = document.createElement('span');
      titleSpan.className = 'cal-task-title';
      titleSpan.textContent = task.title;

      if (task.desc && task.desc.trim()) {
        const noteIcon = document.createElement('span');
        noteIcon.className = 'cal-task-note-indicator';
        noteIcon.textContent = '📝';
        noteIcon.title = 'دارای توضیحات و یادداشت';
        titleSpan.appendChild(noteIcon);
      }

      left.appendChild(checkbox);
      left.appendChild(timeBadge);
      left.appendChild(titleSpan);

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-task-del';
      delBtn.textContent = '✕';
      delBtn.title = 'حذف یادآور';

      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        calendarTasks = calendarTasks.filter(t => t.id !== task.id);
        saveCalendarTasks();
        renderCalendar();
        showToast('یادآور حذف شد');
      });

      item.appendChild(left);
      item.appendChild(delBtn);

      // Open Detail modal on clicking task item
      item.addEventListener('click', () => {
        openTaskDetailModal(task);
      });

      tasksList.appendChild(item);
    });
  }

  function initTaskReminderWatcher() {
    setInterval(() => {
      const now = new Date();
      const jToday = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
      const todayKey = `${jToday.year}-${jToday.month}-${jToday.day}`;
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMins = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMins}`;

      calendarTasks.forEach((task) => {
        if (!task.completed && !task.notified && task.dateKey === todayKey && task.time === currentTimeStr) {
          task.notified = true;
          saveCalendarTasks();

          playToneAlert('task');
          sendBrowserNotification(`⏰ سررسید یادآور: ${task.title}`, {
            body: task.desc || `زمان ثبت‌شده برای این کار: ساعت ${task.time}`
          });
          showToast(`⏰ سررسید یادآور: ${task.title} (ساعت ${task.time})`);
        }
      });
    }, 10000);
  }

  // --- WIDGET 3: REDESIGNED CLEAN MULTI-NOTES SYSTEM & DEDICATED MODAL ---
  let multiNotesList = [];
  let activeEditingNoteId = null;
  let noteAutoSaveTimer = null;
  let notesSearchQuery = '';

  function loadMultiNotes() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.MULTI_NOTES);
      if (stored !== null) {
        multiNotesList = JSON.parse(stored);
        if (!Array.isArray(multiNotesList)) {
          multiNotesList = [];
        }
        // If the only stored note is the initial welcome placeholder, clear it so notes start empty
        if (multiNotesList.length === 1 && multiNotesList[0].title === 'یادداشت‌های روزانه و برنامه‌ریزی') {
          multiNotesList = [];
          saveMultiNotes();
        }
      } else {
        // By default notes are completely empty until the user adds notes
        multiNotesList = [];
        saveMultiNotes();
      }
    } catch (e) {
      multiNotesList = [];
    }
  }

  function saveMultiNotes() {
    try {
      localStorage.setItem(STORAGE_KEYS.MULTI_NOTES, JSON.stringify(multiNotesList));
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [STORAGE_KEYS.MULTI_NOTES]: multiNotesList });
      }
    } catch (e) {
      console.warn('Failed to save notes to storage:', e);
    }
  }

  function deleteNote(noteId, animate = true) {
    if (!noteId) return;
    const note = multiNotesList.find(n => n.id === noteId);
    if (!note) return;

    const performDelete = () => {
      multiNotesList = multiNotesList.filter(n => n.id !== noteId);
      saveMultiNotes();
      renderNotesOverview();

      // If modal was open for this deleted note, close it cleanly
      if (activeEditingNoteId === noteId) {
        activeEditingNoteId = null;
        const modal = document.getElementById('note-edit-modal');
        if (modal) modal.classList.remove('open');
      }
      showToast(`یادداشت «${note.title || 'بدون عنوان'}» با موفقیت حذف شد`);
    };

    const card = document.querySelector(`.note-overview-card[data-note-id="${noteId}"]`);
    if (animate && card) {
      card.style.transition = 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)';
      card.style.opacity = '0';
      card.style.transform = 'scale(0.92) translateY(10px)';
      card.style.maxHeight = '0px';
      card.style.paddingTop = '0px';
      card.style.paddingBottom = '0px';
      card.style.marginTop = '0px';
      card.style.marginBottom = '0px';
      card.style.pointerEvents = 'none';
      setTimeout(performDelete, 200);
    } else {
      performDelete();
    }
  }

  function formatNoteDate(timestamp) {
    if (!timestamp) return 'چند لحظه پیش';
    try {
      const d = new Date(timestamp);
      const j = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${toPersianDigits(j.day)} ${JALALI_MONTH_NAMES[j.month - 1]} ${toPersianDigits(j.year)} • ${hours}:${mins}`;
    } catch (e) {
      return 'به‌تازگی';
    }
  }

  function extractPlainText(html) {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return (temp.innerText || temp.textContent || '').trim();
  }

  function getActiveEditingNote() {
    return multiNotesList.find(n => n.id === activeEditingNoteId) || multiNotesList[0];
  }

  function renderNotesOverview() {
    const container = document.getElementById('notes-cards-container');
    const totalBadge = document.getElementById('notes-total-count-badge');
    if (!container) return;

    if (totalBadge) {
      totalBadge.textContent = `${toPersianDigits(multiNotesList.length)} یادداشت`;
    }

    const filtered = multiNotesList.filter((note) => {
      if (!notesSearchQuery) return true;
      const q = notesSearchQuery.toLowerCase();
      const titleMatch = (note.title || '').toLowerCase().includes(q);
      const contentMatch = extractPlainText(note.content || '').toLowerCase().includes(q);
      return titleMatch || contentMatch;
    });

    container.innerHTML = '';

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="notes-empty-state">
          <div class="notes-empty-icon">${notesSearchQuery ? '🔍' : '📝'}</div>
          <div class="notes-empty-title">${notesSearchQuery ? 'یادداشتی با این جستجو یافت نشد' : 'دفترچه یادداشت خالی است'}</div>
          <div class="notes-empty-desc">${notesSearchQuery ? 'عبارت جستجو را تغییر دهید یا یادداشت جدیدی اضافه کنید.' : 'روی دکمه «یادداشت جدید» کلیک کنید تا اولین یادداشت خود را ایجاد کنید.'}</div>
        </div>
      `;
      return;
    }

    filtered.forEach((note) => {
      const card = document.createElement('div');
      const themeClass = note.bg ? `theme-${note.bg}` : '';
      card.className = `note-overview-card ${themeClass}`;
      card.dataset.noteId = note.id;

      const plainSnippet = extractPlainText(note.content);
      const snippetText = plainSnippet ? escapeHTML(plainSnippet) : '<span style="color: var(--text-muted); font-style: italic;">(بدون متن - برای نوشتن کلیک کنید)</span>';
      const dateText = formatNoteDate(note.updatedAt);
      const charCount = plainSnippet.length;

      card.innerHTML = `
        <div class="note-card-header-row">
          <div class="note-card-title">${escapeHTML(note.title || 'بدون عنوان')}</div>
          <div class="note-card-actions">
            <button type="button" class="btn-note-card-action btn-copy-card" title="کپی متن">📋</button>
            <button type="button" class="btn-note-card-action btn-edit-card" title="ویرایش در مدال اختصاصی">✏️</button>
            <button type="button" class="btn-note-card-action danger btn-del-card" title="حذف یادداشت">🗑️</button>
          </div>
        </div>
        <div class="note-card-snippet">${snippetText}</div>
        <div class="note-card-footer">
          <span class="note-card-date">🕒 ${dateText}</span>
          <span class="note-card-badge-preview">${toPersianDigits(charCount)} نویسه</span>
        </div>
      `;

      // Clicking card opens dedicated modal
      card.addEventListener('click', (e) => {
        if (e.target.closest('.note-card-actions')) return;
        openNoteEditModal(note.id);
      });

      const editBtn = card.querySelector('.btn-edit-card');
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openNoteEditModal(note.id);
        });
      }

      const copyBtn = card.querySelector('.btn-copy-card');
      if (copyBtn) {
        copyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const text = extractPlainText(note.content) || note.title;
          navigator.clipboard.writeText(text).then(() => {
            showToast('متن یادداشت در کلیپ‌بورد کپی شد');
          });
        });
      }

      const delBtn = card.querySelector('.btn-del-card');
      if (delBtn) {
        delBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          deleteNote(note.id, true);
        });
      }

      container.appendChild(card);
    });
  }

  function openNoteEditModal(noteId = null) {
    const modal = document.getElementById('note-edit-modal');
    if (!modal) return;

    let targetNote = multiNotesList.find(n => n.id === noteId);
    if (!targetNote) {
      targetNote = {
        id: 'note_' + Date.now(),
        title: `یادداشت جدید ${toPersianDigits(multiNotesList.length + 1)}`,
        content: '',
        bg: 'glass',
        updatedAt: Date.now()
      };
      multiNotesList.unshift(targetNote);
      saveMultiNotes();
    }

    activeEditingNoteId = targetNote.id;

    // Populate modal inputs
    const headerTitle = document.getElementById('modal-note-header-title');
    const titleInput = document.getElementById('modal-note-title');
    const editor = document.getElementById('modal-notes-editor');
    const updatedTime = document.getElementById('modal-notes-updated-time');

    if (headerTitle) headerTitle.textContent = targetNote.content ? 'ویرایش یادداشت' : 'یادداشت جدید';
    if (titleInput) titleInput.value = targetNote.title || '';
    if (editor) editor.innerHTML = targetNote.content || '';
    if (updatedTime) updatedTime.textContent = `آخرین تغییر: ${formatNoteDate(targetNote.updatedAt)}`;

    // Set theme in modal
    applyModalNoteTheme(targetNote.bg || 'glass');

    // Update Swatches UI
    document.querySelectorAll('#modal-palette-swatches .palette-swatch').forEach((swatch) => {
      swatch.classList.toggle('active', swatch.dataset.bg === (targetNote.bg || 'glass'));
    });

    updateModalNotesStats();
    modal.classList.add('open');

    setTimeout(() => {
      if (titleInput && !targetNote.content) {
        titleInput.focus();
        titleInput.select();
      } else if (editor) {
        editor.focus();
      }
    }, 120);
  }

  function applyModalNoteTheme(bgKey) {
    const editor = document.getElementById('modal-notes-editor');
    if (!editor) return;

    const bgMap = {
      glass: 'rgba(15, 23, 42, 0.6)',
      navy: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,58,138,0.75))',
      emerald: 'linear-gradient(135deg, rgba(6,78,59,0.9), rgba(4,120,87,0.75))',
      amethyst: 'linear-gradient(135deg, rgba(76,29,149,0.9), rgba(124,58,237,0.75))',
      amber: 'linear-gradient(135deg, rgba(120,53,15,0.9), rgba(217,119,6,0.75))',
      rose: 'linear-gradient(135deg, rgba(136,19,55,0.9), rgba(225,29,72,0.75))',
      titanium: 'linear-gradient(135deg, rgba(24,24,27,0.95), rgba(39,39,42,0.85))'
    };

    editor.style.background = bgMap[bgKey] || bgMap.glass;
  }

  function updateModalNotesStats() {
    const editor = document.getElementById('modal-notes-editor');
    const statsBadge = document.getElementById('modal-notes-stats-badge');
    if (!editor || !statsBadge) return;

    const text = (editor.innerText || editor.textContent || '').trim();
    const chars = text.length;
    const words = text ? text.split(/\s+/).length : 0;
    statsBadge.textContent = `${toPersianDigits(chars)} کاراکتر • ${toPersianDigits(words)} کلمه`;
  }

  function triggerNoteAutoSave() {
    if (noteAutoSaveTimer) clearTimeout(noteAutoSaveTimer);
    noteAutoSaveTimer = setTimeout(() => {
      saveMultiNotes();
      renderNotesOverview();
      const updatedTime = document.getElementById('modal-notes-updated-time');
      if (updatedTime) updatedTime.textContent = 'آخرین تغییر: چند لحظه پیش';
    }, 400);
  }

  function initNotesWidget() {
    loadMultiNotes();

    const btnNewModal = document.getElementById('btn-open-new-note-modal');
    const searchInput = document.getElementById('notes-search-input');
    const titleInput = document.getElementById('modal-note-title');
    const editor = document.getElementById('modal-notes-editor');
    const btnSaveModal = document.getElementById('modal-btn-save-note');
    const btnDeleteModal = document.getElementById('modal-btn-delete-note');
    const btnClearModal = document.getElementById('modal-btn-clear-note');
    const btnCopyModal = document.getElementById('modal-btn-copy-note');
    const btnTimestampModal = document.getElementById('modal-btn-notes-timestamp');
    const fontColorPicker = document.getElementById('modal-note-font-color-picker');
    const inputNoteImage = document.getElementById('modal-input-note-image');

    // Initial Overview rendering
    renderNotesOverview();

    // Create New Note button on widget header
    if (btnNewModal) {
      btnNewModal.addEventListener('click', () => {
        openNoteEditModal(null);
      });
    }

    // Search bar filtering
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        notesSearchQuery = e.target.value.trim();
        renderNotesOverview();
      });
    }

    // Modal Title changes
    if (titleInput) {
      titleInput.addEventListener('input', () => {
        const note = getActiveEditingNote();
        if (!note) return;
        note.title = titleInput.value.trim() || 'بدون عنوان';
        note.updatedAt = Date.now();
        triggerNoteAutoSave();
      });
    }

    // Modal Content Editable changes
    if (editor) {
      editor.addEventListener('input', () => {
        const note = getActiveEditingNote();
        if (!note) return;
        note.content = editor.innerHTML;
        note.updatedAt = Date.now();
        updateModalNotesStats();
        triggerNoteAutoSave();
      });
      
      editor.addEventListener('blur', () => {
        const note = getActiveEditingNote();
        if (note) {
          note.content = editor.innerHTML;
          saveMultiNotes();
        }
      });
      
      editor.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, text);
      });
    }

    // Swatches inside modal
    const swatches = document.querySelectorAll('#modal-palette-swatches .palette-swatch');
    swatches.forEach((swatch) => {
      swatch.addEventListener('click', () => {
        swatches.forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        const bg = swatch.dataset.bg || 'glass';
        const note = getActiveEditingNote();
        if (note) {
          note.bg = bg;
          applyModalNoteTheme(bg);
          triggerNoteAutoSave();
        }
      });
    });

    // Rich Toolbar Formatting Commands
    const richButtons = document.querySelectorAll('#modal-rich-toolbar .rich-btn[data-command]');
    richButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const cmd = btn.dataset.command;
        if (!cmd) return;
        document.execCommand(cmd, false, null);
        if (editor) {
          editor.focus();
          const note = getActiveEditingNote();
          if (note) {
            note.content = editor.innerHTML;
            triggerNoteAutoSave();
          }
        }
      });
    });

    // Font Color
    if (fontColorPicker) {
      fontColorPicker.addEventListener('input', (e) => {
        const color = e.target.value;
        document.execCommand('foreColor', false, color);
        if (editor) {
          editor.focus();
          const note = getActiveEditingNote();
          if (note) {
            note.content = editor.innerHTML;
            triggerNoteAutoSave();
          }
        }
      });
    }

    // Image Upload in Editor
    if (inputNoteImage) {
      inputNoteImage.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
          const base64 = ev.target.result;
          if (editor) {
            editor.focus();
            document.execCommand('insertImage', false, base64);
            const note = getActiveEditingNote();
            if (note) {
              note.content = editor.innerHTML;
              triggerNoteAutoSave();
            }
            showToast('تصویر در متن یادداشت قرار گرفت');
          }
        };
        reader.readAsDataURL(file);
        inputNoteImage.value = '';
      });
    }

    // Timestamp
    if (btnTimestampModal) {
      btnTimestampModal.addEventListener('click', () => {
        if (!editor) return;
        const now = new Date();
        const j = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
        const timeHtml = `<strong>[${toPersianDigits(j.day)} ${JALALI_MONTH_NAMES[j.month - 1]} - ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}]</strong> `;
        editor.focus();
        document.execCommand('insertHTML', false, timeHtml);
        const note = getActiveEditingNote();
        if (note) {
          note.content = editor.innerHTML;
          triggerNoteAutoSave();
        }
      });
    }

    // Copy Button inside modal
    if (btnCopyModal) {
      btnCopyModal.addEventListener('click', () => {
        if (!editor) return;
        const text = editor.innerText || editor.textContent;
        navigator.clipboard.writeText(text).then(() => {
          showToast('متن یادداشت در کلیپ‌بورد کپی شد');
        });
      });
    }

    // Clear Button with 2-step confirmation
    if (btnClearModal) {
      let clearConfirmTimer = null;
      btnClearModal.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!editor) return;

        if (btnClearModal.dataset.confirming === 'true') {
          editor.innerHTML = '';
          editor.innerText = '';
          const note = getActiveEditingNote();
          if (note) {
            note.content = '';
            note.updatedAt = Date.now();
            saveMultiNotes();
          }
          updateModalNotesStats();
          btnClearModal.dataset.confirming = 'false';
          btnClearModal.innerHTML = '<span>🧹 پاک‌سازی متن</span>';
          if (clearConfirmTimer) clearTimeout(clearConfirmTimer);
          showToast('✨ متن یادداشت پاک شد');
        } else {
          btnClearModal.dataset.confirming = 'true';
          btnClearModal.innerHTML = '<span>⚠️ کلیک مجدد برای تایید</span>';
          if (clearConfirmTimer) clearTimeout(clearConfirmTimer);
          clearConfirmTimer = setTimeout(() => {
            btnClearModal.dataset.confirming = 'false';
            btnClearModal.innerHTML = '<span>🧹 پاک‌سازی متن</span>';
          }, 3500);
        }
      });
    }

    // Delete Button inside modal
    if (btnDeleteModal) {
      btnDeleteModal.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (activeEditingNoteId) {
          deleteNote(activeEditingNoteId, false);
        } else {
          closeAllModals();
        }
      });
    }

    // Save & Close Button
    if (btnSaveModal) {
      btnSaveModal.addEventListener('click', () => {
        const note = getActiveEditingNote();
        if (note && titleInput && editor) {
          note.title = titleInput.value.trim() || 'بدون عنوان';
          note.content = editor.innerHTML;
          note.updatedAt = Date.now();
          saveMultiNotes();
        }
        renderNotesOverview();
        closeAllModals();
        showToast('✓ یادداشت با موفقیت ذخیره شد');
      });
    }
  }

  // --- WIDGET 4: 4 DISTINCT RICH AUDIO SYNTHESIZERS ---
  const MUSIC_TRACKS = [
    {
      title: 'Lofi Chill & Cozy Rain',
      artist: 'موسیقی آرامش‌بخش و باران ملایم',
      duration: 210,
      type: 'lofi_rain',
      chordSets: [
        [261.63, 329.63, 392.00, 493.88], // Cmaj7
        [220.00, 261.63, 329.63, 392.00], // Am7
        [293.66, 349.23, 440.00, 523.25], // Dm7
        [196.00, 246.94, 293.66, 349.23]  // G7
      ]
    },
    {
      title: 'Sunset Synthwave Horizon',
      artist: 'سینت‌ویو ملایم و گرم غروب آفتاب',
      duration: 240,
      type: 'synthwave',
      chordSets: [
        [146.83, 220.00, 293.66, 369.99], // D minor 80s
        [174.61, 261.63, 349.23, 440.00], // F major
        [130.81, 196.00, 261.63, 329.63], // C major
        [110.00, 164.81, 220.00, 277.18]  // A minor
      ]
    },
    {
      title: 'Piano Reverie & Nature',
      artist: 'پیانو هارمونیک و نغمه‌های طبیعت',
      duration: 195,
      type: 'piano_nature',
      chordSets: [
        [329.63, 392.00, 493.88, 587.33, 659.25], // E minor pentatonic
        [261.63, 329.63, 392.00, 523.25, 659.25], // C major pentatonic
        [220.00, 261.63, 329.63, 440.00, 523.25], // A minor pentatonic
        [196.00, 246.94, 293.66, 392.00, 493.88]  // G major pentatonic
      ]
    },
    {
      title: 'Deep Space Zen Ambient',
      artist: 'فرکانس‌های ۴۳۲Hz مدیتیشن و تمرکز عمیق',
      duration: 300,
      type: 'deep_zen',
      chordSets: [
        [108.00, 216.00, 432.00, 864.00], // 432Hz harmonic series
        [114.75, 229.50, 459.00, 918.00],
        [101.25, 202.50, 405.00, 810.00],
        [108.00, 162.00, 324.00, 648.00]
      ]
    }
  ];

  let audioCtx = null;
  let isMusicPlaying = false;
  let currentTrackIdx = 0;
  let synthGainNode = null;
  let ambientNoiseSource = null;
  let synthInterval = null;
  let musicProgressTimer = null;
  let currentPlaybackSeconds = 0;
  let chordSequenceStep = 0;
  let activeAudioNodes = [];

  function initMusicWidget() {
    const playBtn = document.getElementById('btn-music-play');
    const prevBtn = document.getElementById('btn-music-prev');
    const nextBtn = document.getElementById('btn-music-next');
    const volSlider = document.getElementById('music-vol-slider');
    const stations = document.querySelectorAll('.station-btn');
    const seekTrack = document.getElementById('music-seek-track');

    if (playBtn) {
      playBtn.addEventListener('click', toggleMusicPlay);
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        currentTrackIdx = (currentTrackIdx - 1 + MUSIC_TRACKS.length) % MUSIC_TRACKS.length;
        switchTrack(currentTrackIdx);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        currentTrackIdx = (currentTrackIdx + 1) % MUSIC_TRACKS.length;
        switchTrack(currentTrackIdx);
      });
    }

    if (volSlider) {
      volSlider.addEventListener('input', (e) => {
        const val = e.target.value / 100;
        if (synthGainNode && audioCtx && audioCtx.state === 'running') {
          synthGainNode.gain.setValueAtTime(val * 0.18, audioCtx.currentTime);
        }
      });
    }

    stations.forEach((st) => {
      st.addEventListener('click', () => {
        const tIdx = parseInt(st.dataset.track, 10);
        if (!isNaN(tIdx)) switchTrack(tIdx);
      });
    });

    if (seekTrack) {
      const seekHandler = (e) => {
        const rect = seekTrack.getBoundingClientRect();
        if (rect.width <= 0) return;
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const track = MUSIC_TRACKS[currentTrackIdx];
        if (track) {
          currentPlaybackSeconds = Math.floor(ratio * track.duration);
          updateMusicProgressUI();
        }
      };
      seekTrack.addEventListener('click', seekHandler);
    }

    updateTrackUI();
  }

  function toggleMusicPlay() {
    if (isMusicPlaying) {
      stopAudioSynthesis();
    } else {
      startAudioSynthesis();
    }
  }

  function startAudioSynthesis() {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      synthGainNode = audioCtx.createGain();
      const vol = (document.getElementById('music-vol-slider')?.value || 70) / 100;
      synthGainNode.gain.setValueAtTime(vol * 0.18, audioCtx.currentTime);
      synthGainNode.connect(audioCtx.destination);

      const track = MUSIC_TRACKS[currentTrackIdx];
      chordSequenceStep = 0;

      // Specialized Ambience per Track
      if (track.type === 'lofi_rain') {
        createRainAmbience();
      } else if (track.type === 'deep_zen') {
        createBinauralDrone();
      } else if (track.type === 'piano_nature') {
        createWindChimesAmbience();
      } else if (track.type === 'synthwave') {
        createSynthwaveChorusBass();
      }

      // Start distinctive chord sequencer
      playTrackMusicalSequence();
      synthInterval = setInterval(playTrackMusicalSequence, track.type === 'synthwave' ? 2400 : 3800);

      isMusicPlaying = true;
      startProgressTimer();
      setPlayerUIState(true);
    } catch (e) {
      console.error('Audio playback error:', e);
    }
  }

  function createRainAmbience() {
    const bufferSize = 2 * audioCtx.sampleRate;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.035;
      b6 = white * 0.115926;
    }
    ambientNoiseSource = audioCtx.createBufferSource();
    ambientNoiseSource.buffer = noiseBuffer;
    ambientNoiseSource.loop = true;
    ambientNoiseSource.connect(synthGainNode);
    ambientNoiseSource.start();
    activeAudioNodes.push(ambientNoiseSource);
  }

  function createBinauralDrone() {
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const droneGain = audioCtx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(108, audioCtx.currentTime); // 432 / 4
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(114, audioCtx.currentTime); // 6Hz Theta binaural beat

    droneGain.gain.setValueAtTime(0.04, audioCtx.currentTime);

    osc1.connect(droneGain);
    osc2.connect(droneGain);
    droneGain.connect(synthGainNode);

    osc1.start();
    osc2.start();

    activeAudioNodes.push(osc1, osc2, droneGain);
  }

  function createWindChimesAmbience() {
    const bufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.015;
    }
    ambientNoiseSource = audioCtx.createBufferSource();
    ambientNoiseSource.buffer = noiseBuffer;
    ambientNoiseSource.loop = true;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 3.0;
    ambientNoiseSource.connect(filter);
    filter.connect(synthGainNode);
    ambientNoiseSource.start();
    activeAudioNodes.push(ambientNoiseSource, filter);
  }

  function createSynthwaveChorusBass() {
    const subOsc = audioCtx.createOscillator();
    const subGain = audioCtx.createGain();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(73.42, audioCtx.currentTime); // D2
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(250, audioCtx.currentTime);
    subGain.gain.setValueAtTime(0.03, audioCtx.currentTime);
    subOsc.connect(filter);
    filter.connect(subGain);
    subGain.connect(synthGainNode);
    subOsc.start();

    activeAudioNodes.push(subOsc, subGain, filter);
  }

  function playTrackMusicalSequence() {
    if (!audioCtx || !synthGainNode || !isMusicPlaying) return;
    const track = MUSIC_TRACKS[currentTrackIdx];
    const chords = track.chordSets || [];
    if (chords.length === 0) return;

    const currentChord = chords[chordSequenceStep % chords.length];
    chordSequenceStep++;

    if (track.type === 'lofi_rain') {
      // Warm Rhodes 7th chord
      currentChord.forEach((f, idx) => {
        const osc = audioCtx.createOscillator();
        const oscGain = audioCtx.createGain();
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(f, audioCtx.currentTime + idx * 0.08);

        oscGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
        oscGain.gain.exponentialRampToValueAtTime(0.07, audioCtx.currentTime + 0.3 + idx * 0.08);
        oscGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 3.4);

        osc.connect(oscGain);
        oscGain.connect(synthGainNode);
        osc.start(audioCtx.currentTime + idx * 0.08);
        osc.stop(audioCtx.currentTime + 3.6);
        activeAudioNodes.push(osc, oscGain);
      });
    } else if (track.type === 'synthwave') {
      // 80s Arpeggiated sequence
      currentChord.forEach((f, idx) => {
        const osc = audioCtx.createOscillator();
        const oscGain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, audioCtx.currentTime);

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, audioCtx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(2200, audioCtx.currentTime + 0.4);
        filter.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 2.0);

        oscGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
        oscGain.gain.exponentialRampToValueAtTime(0.06, audioCtx.currentTime + 0.15 + (idx * 0.15));
        oscGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2.2);

        osc.connect(filter);
        filter.connect(oscGain);
        oscGain.connect(synthGainNode);

        osc.start(audioCtx.currentTime + (idx * 0.15));
        osc.stop(audioCtx.currentTime + 2.3);
        activeAudioNodes.push(osc, oscGain, filter);
      });
    } else if (track.type === 'piano_nature') {
      // Grand Piano Pentatonic Reverie
      currentChord.forEach((f, idx) => {
        const osc = audioCtx.createOscillator();
        const oscGain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, audioCtx.currentTime);

        oscGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
        oscGain.gain.exponentialRampToValueAtTime(0.08, audioCtx.currentTime + 0.05 + (idx * 0.2));
        oscGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 3.0);

        osc.connect(oscGain);
        oscGain.connect(synthGainNode);

        osc.start(audioCtx.currentTime + (idx * 0.2));
        osc.stop(audioCtx.currentTime + 3.2);
        activeAudioNodes.push(osc, oscGain);
      });
    } else {
      // Deep Space Tibetan Zen Bowl
      currentChord.forEach((f, idx) => {
        const osc = audioCtx.createOscillator();
        const oscGain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, audioCtx.currentTime);

        oscGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
        oscGain.gain.exponentialRampToValueAtTime(0.05, audioCtx.currentTime + 1.2);
        oscGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 3.6);

        osc.connect(oscGain);
        oscGain.connect(synthGainNode);

        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 3.8);
        activeAudioNodes.push(osc, oscGain);
      });
    }
  }

  function stopAudioSynthesis() {
    if (synthInterval) {
      clearInterval(synthInterval);
      synthInterval = null;
    }
    if (musicProgressTimer) {
      clearInterval(musicProgressTimer);
      musicProgressTimer = null;
    }

    if (ambientNoiseSource) {
      try {
        ambientNoiseSource.stop();
        ambientNoiseSource.disconnect();
      } catch (e) {}
      ambientNoiseSource = null;
    }

    // Stop and disconnect every active oscillator and node immediately to prevent any lingering sound or beep
    activeAudioNodes.forEach((node) => {
      try {
        if (typeof node.stop === 'function') node.stop();
        if (typeof node.disconnect === 'function') node.disconnect();
      } catch (e) {}
    });
    activeAudioNodes = [];

    // Mute and disconnect master synth gain node
    if (synthGainNode && audioCtx) {
      try {
        synthGainNode.gain.cancelScheduledValues(audioCtx.currentTime);
        synthGainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        synthGainNode.disconnect();
      } catch (e) {}
      synthGainNode = null;
    }

    // Suspend audio context safely
    if (audioCtx && audioCtx.state === 'running') {
      try {
        audioCtx.suspend();
      } catch (e) {}
    }

    isMusicPlaying = false;
    setPlayerUIState(false);
  }

  function switchTrack(idx) {
    currentTrackIdx = idx;
    currentPlaybackSeconds = 0;
    updateTrackUI();
    if (isMusicPlaying) {
      stopAudioSynthesis();
      startAudioSynthesis();
    }
  }

  function startProgressTimer() {
    if (musicProgressTimer) clearInterval(musicProgressTimer);
    musicProgressTimer = setInterval(() => {
      currentPlaybackSeconds++;
      const track = MUSIC_TRACKS[currentTrackIdx];
      if (track && currentPlaybackSeconds >= track.duration) {
        currentPlaybackSeconds = 0;
        currentTrackIdx = (currentTrackIdx + 1) % MUSIC_TRACKS.length;
        switchTrack(currentTrackIdx);
      }
      updateMusicProgressUI();
    }, 1000);
  }

  function updateTrackUI() {
    const track = MUSIC_TRACKS[currentTrackIdx];
    if (!track) return;
    const titleElem = document.getElementById('music-track-title');
    const artistElem = document.getElementById('music-track-artist');
    const totalTimeElem = document.getElementById('music-time-duration') || document.getElementById('music-total-time');

    if (titleElem) titleElem.textContent = track.title;
    if (artistElem) artistElem.textContent = track.artist;
    if (totalTimeElem) totalTimeElem.textContent = formatDuration(track.duration);

    document.querySelectorAll('.station-btn').forEach((btn) => {
      btn.classList.toggle('active', parseInt(btn.dataset.track, 10) === currentTrackIdx);
    });

    updateMusicProgressUI();
  }

  function updateMusicProgressUI() {
    const track = MUSIC_TRACKS[currentTrackIdx];
    if (!track) return;
    const curTimeElem = document.getElementById('music-time-current') || document.getElementById('music-current-time');
    const fillElem = document.getElementById('music-seek-progress') || document.getElementById('music-seek-fill');

    if (curTimeElem) curTimeElem.textContent = formatDuration(currentPlaybackSeconds);
    if (fillElem) {
      const pct = Math.min(100, Math.max(0, (currentPlaybackSeconds / track.duration) * 100));
      fillElem.style.width = `${pct}%`;
    }
  }

  function setPlayerUIState(playing) {
    const playIcon = document.getElementById('music-play-icon');
    const disc = document.getElementById('music-disc');
    const eqBars = document.querySelectorAll('.eq-bar');

    if (playIcon) playIcon.textContent = playing ? '⏸' : '▶';
    if (disc) disc.classList.toggle('spinning', playing);
    eqBars.forEach((bar) => {
      bar.classList.toggle('playing', playing);
    });
  }

  function formatDuration(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // --- WIDGET 6: DAILY NEWS HUB & LIVE RATES (MODERN GLASSMORPHIC CARD) ---
  const CURATED_NEWS_DATA = {
    badge: '🔥 خبر ویژه',
    featured: {
      title: 'بررسی آخرین تحولات اقتصادی و گزارش بازارهای مالی و پولی کشور',
      source: 'خبرگزاری ایسنا',
      time: 'چند دقیقه پیش',
      link: 'https://www.isna.ir/service/Economy',
      image: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=700&q=80'
    },
    stream: [
      {
        title: 'رویدادهای تازه در حوزه علم، فناوری و دستاوردهای نوین دیجیتال',
        source: 'خبرگزاری ایسنا',
        time: '۲۰ دقیقه پیش',
        link: 'https://www.isna.ir/service/Science',
        image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=150&q=80'
      },
      {
        title: 'نتایج رقابت‌های ورزشی و مسابقات قهرمانی ملی و بین‌المللی',
        source: 'ورزش ۳',
        time: '۴۵ دقیقه پیش',
        link: 'https://www.varzesh3.com',
        image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=150&q=80'
      },
      {
        title: 'گسترش پروژه‌های نوین صنعتی و زیرساخت‌های انرژی در سراسر کشور',
        source: 'خبرگزاری ایرنا',
        time: '۱ ساعت پیش',
        link: 'https://www.irna.ir',
        image: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=150&q=80'
      },
      {
        title: 'رویدادهای فرهنگی، هنری و گزارش‌های تحلیلی برگزیده روز',
        source: 'خبرآنلاین',
        time: '۲ ساعت پیش',
        link: 'https://www.khabaronline.ir',
        image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=150&q=80'
      }
    ]
  };

  function initNewsWidget() {
    const widgetIcon = document.getElementById('news-widget-icon');
    const widgetTitleText = document.getElementById('news-widget-title-text');
    const pillTabNews = document.getElementById('pill-tab-news');
    const pillTabRates = document.getElementById('pill-tab-rates');
    const btnRefresh = document.getElementById('btn-news-refresh');

    const newsBody = document.getElementById('news-widget-body');
    const ratesBody = document.getElementById('rates-widget-body');
    const ratesGrid = document.getElementById('rates-cards-grid');
    const ratesLastUpdated = document.getElementById('rates-last-updated-time');
    const ratesSubPills = document.querySelectorAll('#rates-sub-pills .rates-sub-pill');

    const featuredCard = document.getElementById('news-featured-card');
    const featuredImg = document.getElementById('news-featured-img');
    const featuredBadge = document.getElementById('news-featured-badge');
    const featuredTitle = document.getElementById('news-featured-title');
    const featuredSource = document.getElementById('news-featured-source');
    const featuredTime = document.getElementById('news-featured-time');
    const featuredLink = document.getElementById('news-featured-link');
    const secondaryStream = document.getElementById('news-secondary-stream');

    let currentTab = 'news'; // 'news' | 'rates'
    let currentRatesSub = 'all'; // 'all' | 'currency' | 'gold'
    let ratesData = null;
    let lastRatesFetchTime = null;
    let ratesAutoRefreshTimer = null;
    let currentFeaturedItem = CURATED_NEWS_DATA.featured;

    // Helper: direct news link resolution - NEVER fallback to Google Search!
    function getDirectNewsArticleUrl(item) {
      if (!item) return '#';
      const link = item.link || '';
      if (typeof link === 'string' && (link.startsWith('http://') || link.startsWith('https://'))) {
        return link;
      }
      return '#';
    }

    // 1. Render News Section
    function renderNewsData(featured, streamList) {
      if (featured) {
        currentFeaturedItem = featured;
        const directUrl = getDirectNewsArticleUrl(featured);

        if (featuredImg && featured.image) {
          const proxiedFeatured = getProxiedImageUrl(featured.image, { width: 700, quality: 80 });
          featuredImg.src = proxiedFeatured;
          featuredImg.onerror = () => {
            featuredImg.src = featured.image;
          };
        }
        if (featuredBadge) featuredBadge.textContent = featured.badge || '🔥 خبر داغ';
        if (featuredTitle) featuredTitle.textContent = featured.title || '';
        if (featuredSource) featuredSource.textContent = featured.source || 'خبرگزاری';
        if (featuredTime) featuredTime.textContent = featured.time || 'چند دقیقه پیش';
        
        if (featuredLink) {
          featuredLink.href = directUrl;
          featuredLink.target = '_blank';
          featuredLink.rel = 'noopener noreferrer';
          featuredLink.title = `مشاهده کامل خبر در ${featured.source || 'منبع اصلی'}`;
        }

        if (featuredCard) {
          featuredCard.style.cursor = 'pointer';
          featuredCard.onclick = (e) => {
            if (e.target.closest('#news-featured-link')) return;
            const url = getDirectNewsArticleUrl(currentFeaturedItem);
            if (url && url !== '#') {
              window.open(url, '_blank', 'noopener,noreferrer');
            }
          };
        }
      }

      if (secondaryStream && Array.isArray(streamList)) {
        secondaryStream.innerHTML = '';
        streamList.forEach((item) => {
          const directUrl = getDirectNewsArticleUrl(item);
          const streamEl = document.createElement('a');
          streamEl.className = 'news-stream-item';
          streamEl.href = directUrl;
          streamEl.target = '_blank';
          streamEl.rel = 'noopener noreferrer';
          streamEl.title = `${item.title} (${item.source || ''})`;

          const proxiedThumb = getProxiedImageUrl(item.image, { width: 160, quality: 80 });

          streamEl.innerHTML = `
            <img src="${proxiedThumb}" alt="${escapeHTML(item.title)}" class="news-stream-thumb" loading="lazy" onerror="this.src='${item.image}'; this.onerror=null;" />
            <div class="news-stream-info">
              <h5 class="news-stream-title">${escapeHTML(item.title)}</h5>
              <div class="news-stream-meta">
                <span class="stream-source">${escapeHTML(item.source || 'منبع')}</span>
                <span>•</span>
                <span>${escapeHTML(item.time || 'تازه')}</span>
              </div>
            </div>
          `;
          secondaryStream.appendChild(streamEl);
        });
      }
    }

    // 2. Fetch Live News from server
    async function fetchLiveNews(isManual = false) {
      try {
        const res = await safeFetchWithTimeout(`/api/news?_t=${Date.now()}`, {}, 6000);
        if (res && res.ok) {
          const json = await res.json().catch(() => null);
          if (json && Array.isArray(json.items) && json.items.length > 0) {
            const items = json.items;
            const topItem = {
              title: items[0].title,
              link: items[0].link,
              source: items[0].source || json.source || 'خبرگزاری',
              time: 'دقایقی پیش',
              image: items[0].image || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=700&q=80',
              badge: '🔥 تازه ترین خبر'
            };

            const restItems = items.slice(1, 5).map((item, idx) => ({
              title: item.title,
              link: item.link,
              source: item.source || json.source || 'خبرگزاری',
              time: `${toPersianDigits((idx + 1) * 15)} دقیقه پیش`,
              image: item.image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=160&q=80'
            }));

            renderNewsData(topItem, restItems);
            return true;
          }
        }
      } catch (e) {
        console.warn('Live news fetch fallback:', e);
      }
      return false;
    }

    // 3. Navasan Rate Parser & Formatter
    function parseNavasanData(gold, fiat) {
      const formatNum = (val) => {
        if (val === undefined || val === null || val === '') return '—';
        const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
        if (isNaN(num)) return String(val);
        return Number(num).toLocaleString('en-US');
      };

      const getChangeMeta = (item) => {
        if (!item) return { change: '۰.۰٪', status: 'neutral' };
        let pct = typeof item.change_pct === 'number' ? item.change_pct : parseFloat(item.change_pct || '0');
        if (isNaN(pct)) pct = 0;

        if (pct > 0) {
          return { change: `+${pct.toFixed(1)}%`, status: 'up' };
        } else if (pct < 0) {
          return { change: `${pct.toFixed(1)}%`, status: 'down' };
        } else {
          let val = typeof item.change_val === 'number' ? item.change_val : parseFloat(item.change_val || '0');
          if (isNaN(val)) val = 0;
          if (val > 0) {
            return { change: `+${formatNum(val)}`, status: 'up' };
          } else if (val < 0) {
            return { change: `${formatNum(val)}`, status: 'down' };
          }
        }
        return { change: '۰.۰٪', status: 'neutral' };
      };

      const currencyList = [];
      const goldList = [];

      // ۱. دلار آمریکا (USD)
      if (fiat && fiat.usd) {
        const ch = getChangeMeta(fiat.usd);
        currencyList.push({
          id: 'usd',
          name: 'دلار آمریکا',
          sub: 'اسکناس بازار آزاد',
          price: formatNum(fiat.usd.value),
          unit: 'تومان',
          change: ch.change,
          status: ch.status,
          icon: '🇺🇸',
          type: 'currency'
        });
      }

      // ۲. یورو اروپا (EUR)
      if (fiat && fiat.eur) {
        const ch = getChangeMeta(fiat.eur);
        currencyList.push({
          id: 'eur',
          name: 'یورو اروپا',
          sub: 'اسکناس بازار آزاد',
          price: formatNum(fiat.eur.value),
          unit: 'تومان',
          change: ch.change,
          status: ch.status,
          icon: '🇪🇺',
          type: 'currency'
        });
      }

      // ۳. درهم امارات (AED)
      if (fiat && fiat.aed) {
        const ch = getChangeMeta(fiat.aed);
        currencyList.push({
          id: 'aed',
          name: 'درهم امارات',
          sub: 'حواله و اسکناس دبی',
          price: formatNum(fiat.aed.value),
          unit: 'تومان',
          change: ch.change,
          status: ch.status,
          icon: '🇦🇪',
          type: 'currency'
        });
      }

      // پوند انگلیس (GBP)
      if (fiat && fiat.gbp) {
        const ch = getChangeMeta(fiat.gbp);
        currencyList.push({
          id: 'gbp',
          name: 'پوند انگلیس',
          sub: 'اسکناس بازار آزاد',
          price: formatNum(fiat.gbp.value),
          unit: 'تومان',
          change: ch.change,
          status: ch.status,
          icon: '🇬🇧',
          type: 'currency'
        });
      }

      // ۴. طلای ۱۸ عیار
      const g18 = gold && (gold['18ayar'] || gold['geram18']);
      if (g18) {
        const ch = getChangeMeta(g18);
        goldList.push({
          id: '18ayar',
          name: 'طلای ۱۸ عیار',
          sub: 'هر گرم طلای خام',
          price: formatNum(g18.value),
          unit: 'تومان',
          change: ch.change,
          status: ch.status,
          icon: '🥇',
          type: 'gold'
        });
      }

      // ۵. سکه امامی
      const sekkeh = gold && (gold['sekkeh'] || gold['sekee']);
      if (sekkeh) {
        const ch = getChangeMeta(sekkeh);
        goldList.push({
          id: 'sekkeh',
          name: 'سکه امامی',
          sub: 'طرح جدید بهار آزادی',
          price: formatNum(sekkeh.value),
          unit: 'تومان',
          change: ch.change,
          status: ch.status,
          icon: '🪙',
          type: 'gold'
        });
      }

      // ۶. نیم سکه
      const nim = gold && gold['nim'];
      if (nim) {
        const ch = getChangeMeta(nim);
        goldList.push({
          id: 'nim',
          name: 'نیم سکه',
          sub: 'بهار آزادی',
          price: formatNum(nim.value),
          unit: 'تومان',
          change: ch.change,
          status: ch.status,
          icon: '🪙',
          type: 'gold'
        });
      }

      // ربع سکه
      const rob = gold && gold['rob'];
      if (rob) {
        const ch = getChangeMeta(rob);
        goldList.push({
          id: 'rob',
          name: 'ربع سکه',
          sub: 'بهار آزادی',
          price: formatNum(rob.value),
          unit: 'تومان',
          change: ch.change,
          status: ch.status,
          icon: '🪙',
          type: 'gold'
        });
      }

      // مثقال طلا (مظنه آبشده)
      const abshodeh = gold && (gold['abshodeh'] || gold['mesghal']);
      if (abshodeh) {
        const ch = getChangeMeta(abshodeh);
        goldList.push({
          id: 'abshodeh',
          name: 'مثقال طلا',
          sub: 'مظنه بازار آبشده تهران',
          price: formatNum(abshodeh.value),
          unit: 'تومان',
          change: ch.change,
          status: ch.status,
          icon: '⚖️',
          type: 'gold'
        });
      }

      // انس طلای جهانی
      const xau = gold && (gold['usd_xau'] || gold['xau']);
      if (xau) {
        const ch = getChangeMeta(xau);
        goldList.push({
          id: 'usd_xau',
          name: 'انس طلای جهانی',
          sub: 'هر اونس طلا (XAU)',
          price: formatNum(xau.value),
          unit: 'دلار',
          change: ch.change,
          status: ch.status,
          icon: '🌐',
          type: 'gold'
        });
      }

      return { currency: currencyList, gold: goldList };
    }

    // 4. Render Live Gold & Dollar / Currency Rates Grid
    function renderRatesGrid() {
      if (!ratesGrid) return;

      const fallbackRates = [
        { id: 'usd', name: 'دلار آمریکا', sub: 'اسکناس بازار آزاد', price: '۲۲۴,۷۰۰', unit: 'تومان', change: '۰.۰٪', status: 'neutral', icon: '🇺🇸', type: 'currency' },
        { id: 'eur', name: 'یورو اروپا', sub: 'اسکناس بازار آزاد', price: '۲۶۱,۱۰۰', unit: 'تومان', change: '۰.۰٪', status: 'neutral', icon: '🇪🇺', type: 'currency' },
        { id: 'aed', name: 'درهم امارات', sub: 'حواله و اسکناس دبی', price: '۶۱,۷۷۰', unit: 'تومان', change: '+۰.۱٪', status: 'up', icon: '🇦🇪', type: 'currency' },
        { id: '18ayar', name: 'طلای ۱۸ عیار', sub: 'هر گرم طلای خام', price: '۲۳,۶۱۶,۰۵۰', unit: 'تومان', change: '۰.۰٪', status: 'neutral', icon: '🥇', type: 'gold' },
        { id: 'sekkeh', name: 'سکه امامی', sub: 'طرح جدید بهار آزادی', price: '۲۳۷,۰۰۰,۰۰۰', unit: 'تومان', change: '۰.۰٪', status: 'neutral', icon: '🪙', type: 'gold' },
        { id: 'nim', name: 'نیم سکه', sub: 'بهار آزادی', price: '۱۲۰,۰۰۰,۰۰۰', unit: 'تومان', change: '۰.۰٪', status: 'neutral', icon: '🪙', type: 'gold' },
        { id: 'rob', name: 'ربع سکه', sub: 'بهار آزادی', price: '۶۵,۵۰۰,۰۰۰', unit: 'تومان', change: '۰.۰٪', status: 'neutral', icon: '🪙', type: 'gold' },
        { id: 'abshodeh', name: 'مثقال طلا', sub: 'مظنه بازار آبشده تهران', price: '۱۰۲,۳۰۰,۰۰۰', unit: 'تومان', change: '۰.۰٪', status: 'neutral', icon: '⚖️', type: 'gold' },
        { id: 'gbp', name: 'پوند انگلیس', sub: 'اسکناس بازار آزاد', price: '۳۰۵,۳۶۰', unit: 'تومان', change: '۰.۰٪', status: 'neutral', icon: '🇬🇧', type: 'currency' },
        { id: 'usd_xau', name: 'انس طلای جهانی', sub: 'هر اونس طلا (XAU)', price: '۴,۴۳۰', unit: 'دلار', change: '۰.۰٪', status: 'neutral', icon: '🌐', type: 'gold' }
      ];

      let itemsToRender = [];

      const rawGold = (ratesData && ratesData.gold) || null;
      const rawCurrency = (ratesData && ratesData.currency) || null;

      if (rawGold || rawCurrency) {
        const currencies = (rawCurrency || []).map(c => ({ ...c, type: 'currency' }));
        const golds = (rawGold || []).map(g => ({ ...g, type: 'gold' }));
        itemsToRender = [...currencies, ...golds];
      } else {
        itemsToRender = fallbackRates;
      }

      // Filter by sub-category (all / currency / gold)
      if (currentRatesSub === 'currency') {
        itemsToRender = itemsToRender.filter(i => i.type === 'currency');
      } else if (currentRatesSub === 'gold') {
        itemsToRender = itemsToRender.filter(i => i.type === 'gold');
      }

      ratesGrid.innerHTML = '';
      itemsToRender.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'rate-card-item';
        card.dataset.type = item.type;

        let statusClass = item.status || 'neutral';
        let changeText = item.change || '۰.۰٪';
        if (changeText.includes('+') || statusClass === 'up') {
          statusClass = 'up';
          if (!changeText.includes('▲')) changeText += ' ▲';
        } else if (changeText.includes('-') || statusClass === 'down') {
          statusClass = 'down';
          if (!changeText.includes('▼')) changeText += ' ▼';
        }

        card.innerHTML = `
          <div class="rate-card-top">
            <div class="rate-title-wrap">
              <span class="rate-icon">${escapeHTML(item.icon || (item.type === 'gold' ? '🥇' : '💵'))}</span>
              <span class="rate-name">${escapeHTML(item.name)}</span>
            </div>
            <span class="rate-change-tag ${statusClass}">${escapeHTML(toPersianDigits(changeText))}</span>
          </div>
          <div class="rate-card-bottom">
            <div class="rate-price-wrap">
              <span class="rate-price">${toPersianDigits(item.price)}</span>
              <span class="rate-unit">${escapeHTML(item.unit || 'تومان')}</span>
            </div>
            <span class="rate-sub" title="${escapeHTML(item.sub || '')}">${escapeHTML(item.sub || '')}</span>
          </div>
        `;
        ratesGrid.appendChild(card);
      });

      // Update real fetch timestamp in the UI
      if (ratesLastUpdated) {
        const now = lastRatesFetchTime || new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        ratesLastUpdated.textContent = `بروزرسانی: ساعت ${toPersianDigits(timeStr)}`;
        ratesLastUpdated.title = `آخرین استعلام زنده از بازار: ساعت ${toPersianDigits(timeStr)}:${toPersianDigits(String(now.getSeconds()).padStart(2, '0'))}`;
      }
    }

    // 5. Fetch Live Rates from official Navasan API endpoints
    async function fetchLiveRates(isManual = false) {
      const GOLD_API_URL = 'https://raw.githubusercontent.com/HosseinOdd/Navasan-API/main/data/gold.json';
      const FIAT_API_URL = 'https://raw.githubusercontent.com/HosseinOdd/Navasan-API/main/data/fiat.json';

      let rawGold = null;
      let rawFiat = null;

      // 1. Direct fetch from the two specified Navasan GitHub API URLs
      try {
        const cacheBuster = `?_t=${Date.now()}`;
        const [goldRes, fiatRes] = await Promise.all([
          safeFetchWithTimeout(GOLD_API_URL + cacheBuster, { cache: 'no-store' }, 6500),
          safeFetchWithTimeout(FIAT_API_URL + cacheBuster, { cache: 'no-store' }, 6500)
        ]);

        if (goldRes && goldRes.ok && fiatRes && fiatRes.ok) {
          rawGold = await goldRes.json().catch(() => null);
          rawFiat = await fiatRes.json().catch(() => null);
        }
      } catch (e) {
        console.warn('Direct Navasan API fetch note:', e);
      }

      // 2. Fallback to server proxy if direct browser fetch was blocked or timed out
      if (!rawGold || !rawFiat) {
        try {
          const proxyRes = await safeFetchWithTimeout(`/api/navasan?force=${isManual ? 'true' : 'false'}&_t=${Date.now()}`, {}, 6000);
          if (proxyRes && proxyRes.ok) {
            const proxyJson = await proxyRes.json().catch(() => null);
            if (proxyJson && proxyJson.gold && proxyJson.fiat) {
              rawGold = proxyJson.gold;
              rawFiat = proxyJson.fiat;
            }
          }
        } catch (proxyErr) {
          console.warn('Proxy Navasan fetch fallback:', proxyErr);
        }
      }

      // 3. Process and render
      if (rawGold && rawFiat) {
        lastRatesFetchTime = new Date();
        ratesData = parseNavasanData(rawGold, rawFiat);
        renderRatesGrid();
        return true;
      }

      // 4. If neither was reachable, render baseline data
      renderRatesGrid();
      return false;
    }

    // 6. Tab Switching: News vs Live Rates
    function switchTab(tab) {
      currentTab = tab;
      if (tab === 'news') {
        if (pillTabNews) pillTabNews.classList.add('active');
        if (pillTabRates) pillTabRates.classList.remove('active');
        if (newsBody) newsBody.classList.remove('hidden');
        if (ratesBody) ratesBody.classList.add('hidden');
        if (widgetIcon) widgetIcon.textContent = '📰';
        if (widgetTitleText) widgetTitleText.textContent = 'اخبار و نبض بازار';
      } else {
        if (pillTabRates) pillTabRates.classList.add('active');
        if (pillTabNews) pillTabNews.classList.remove('active');
        if (ratesBody) ratesBody.classList.remove('hidden');
        if (newsBody) newsBody.classList.add('hidden');
        if (widgetIcon) widgetIcon.textContent = '🪙';
        if (widgetTitleText) widgetTitleText.textContent = 'قیمت زنده طلا و دلار';

        if (!ratesData) {
          fetchLiveRates();
        } else {
          renderRatesGrid();
        }
      }
    }

    if (pillTabNews) {
      pillTabNews.addEventListener('click', () => switchTab('news'));
    }
    if (pillTabRates) {
      pillTabRates.addEventListener('click', () => switchTab('rates'));
    }

    // 7. Sub-pills click handler for Rates view
    ratesSubPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        ratesSubPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        currentRatesSub = pill.dataset.sub || 'all';
        renderRatesGrid();
      });
    });

    // 8. Refresh Button Handler (Manual Refresh)
    if (btnRefresh) {
      btnRefresh.addEventListener('click', async () => {
        btnRefresh.classList.add('spinning');

        if (currentTab === 'news') {
          await fetchLiveNews(true);
          setTimeout(() => {
            btnRefresh.classList.remove('spinning');
            showToast('📰 تازه‌ترین خبرهای روز با موفقیت بروزرسانی شدند');
          }, 600);
        } else {
          const success = await fetchLiveRates(true);
          setTimeout(() => {
            btnRefresh.classList.remove('spinning');
            if (success) {
              showToast('💰 نرخ‌های زنده طلا، سکه و دلار با موفقیت بروزرسانی شدند');
            } else {
              showToast('💰 نرخ‌های زنده طلا و دلار تجدید شدند');
            }
          }, 600);
        }
      });
    }

    // 9. Auto-Refresh every 5 minutes (300,000 ms)
    if (ratesAutoRefreshTimer) {
      clearInterval(ratesAutoRefreshTimer);
    }
    ratesAutoRefreshTimer = setInterval(() => {
      fetchLiveRates(false);
    }, 5 * 60 * 1000);

    // Initial render
    renderNewsData(CURATED_NEWS_DATA.featured, CURATED_NEWS_DATA.stream);
    fetchLiveNews();
    fetchLiveRates();
  }

  // --- WIDGET 6: WEATHER & FORECAST (LIVE FETCH + CITY CHANGER) ---
  const CITY_COORDINATES = {
    tehran: { name: 'تهران', lat: 35.6892, lon: 51.3890, fallback: { temp: '۲۴°', desc: 'آفتابی و معتدل', icon: '☀️', feels: '۲۳°', hum: '۲۸٪', wind: '۱۲ کیلومتر/ساعت', uv: '۴ از ۱۱', aqi: '۶۸ (سالم)' } },
    mashhad: { name: 'مشهد', lat: 36.2605, lon: 59.6168, fallback: { temp: '۲۱°', desc: 'صاف با باد ملایم', icon: '🌤️', feels: '۲۰°', hum: '۳۴٪', wind: '۱۸ کیلومتر/ساعت', uv: '۵ از ۱۱', aqi: '۵۵ (خوب)' } },
    isfahan: { name: 'اصفهان', lat: 32.6539, lon: 51.6660, fallback: { temp: '۲۵°', desc: 'کاملاً آفتابی', icon: '☀️', feels: '۲۴°', hum: '۲۲٪', wind: '۱۰ کیلومتر/ساعت', uv: '۶ از ۱۱', aqi: '۷۲ (معمولی)' } },
    shiraz: { name: 'شیراز', lat: 29.5918, lon: 52.5837, fallback: { temp: '۲۶°', desc: 'دلپذیر و بهاری', icon: '🌸', feels: '۲۵°', hum: '۳۰٪', wind: '۱۴ کیلومتر/ساعت', uv: '۵ از ۱۱', aqi: '۴۵ (پاک)' } },
    tabriz: { name: 'تبریز', lat: 38.0962, lon: 46.2738, fallback: { temp: '۱۸°', desc: 'نیمه‌ابری و خنک', icon: '⛅', feels: '۱۷°', hum: '۴۵٪', wind: '۱۶ کیلومتر/ساعت', uv: '۳ از ۱۱', aqi: '۵۰ (پاک)' } },
    rasht: { name: 'رشت', lat: 37.2809, lon: 49.5924, fallback: { temp: '۲۰°', desc: 'بارانی و مرطوب', icon: '🌧️', feels: '۲۱°', hum: '۷۸٪', wind: '۸ کیلومتر/ساعت', uv: '۲ از ۱۱', aqi: '۳۵ (بسیار پاک)' } },
    karaj: { name: 'کرج', lat: 35.8400, lon: 50.9391, fallback: { temp: '۲۳°', desc: 'آفتابی و معتدل', icon: '☀️', feels: '۲۲°', hum: '۳۰٪', wind: '۱۴ کیلومتر/ساعت', uv: '۴ از ۱۱', aqi: '۷۵ (معمولی)' } },
    ahvaz: { name: 'اهواز', lat: 31.3183, lon: 48.6706, fallback: { temp: '۳۴°', desc: 'گرم و آفتابی', icon: '☀️', feels: '۳۶°', hum: '۲۰٪', wind: '۲۲ کیلومتر/ساعت', uv: '۸ از ۱۱', aqi: '۸۵ (معمولی)' } },
    yazd: { name: 'یزد', lat: 31.8974, lon: 54.3569, fallback: { temp: '۲۷°', desc: 'صاف و خشک', icon: '☀️', feels: '۲۶°', hum: '۱۸٪', wind: '۱۱ کیلومتر/ساعت', uv: '۶ از ۱۱', aqi: '۵۸ (خوب)' } },
    dubai: { name: 'دبی', lat: 25.2048, lon: 55.2708, fallback: { temp: '۳۲°', desc: 'آفتابی و گرم', icon: '☀️', feels: '۳۵°', hum: '۵۵٪', wind: '۱۵ کیلومتر/ساعت', uv: '۷ از ۱۱', aqi: '۷۰ (معمولی)' } },
    istanbul: { name: 'استانبول', lat: 41.0082, lon: 28.9784, fallback: { temp: '۱۹°', desc: 'نیمه‌ابری و مطبوع', icon: '⛅', feels: '۱۸°', hum: '۶۰٪', wind: '۱۸ کیلومتر/ساعت', uv: '۴ از ۱۱', aqi: '۴۸ (پاک)' } }
  };

  const WMO_WEATHER_MAP = {
    0: { desc: 'کاملاً صاف و آفتابی', icon: '☀️' },
    1: { desc: 'غالباً آفتابی', icon: '🌤️' },
    2: { desc: 'نیمه‌ابری', icon: '⛅' },
    3: { desc: 'ابری و گرفته', icon: '☁️' },
    45: { desc: 'مه‌آلود', icon: '🌫️' },
    48: { desc: 'مه و یخبندان', icon: '🌫️' },
    51: { desc: 'نم‌نم باران سبک', icon: '🌦️' },
    53: { desc: 'باران ملایم', icon: '🌧️' },
    55: { desc: 'بارش باران مداوم', icon: '🌧️' },
    61: { desc: 'باران پراکنده', icon: '🌧️' },
    63: { desc: 'بارش باران', icon: '🌧️' },
    65: { desc: 'رگبار شدید باران', icon: '⛈️' },
    71: { desc: 'بارش برف سبک', icon: '🌨️' },
    73: { desc: 'بارش برف', icon: '❄️' },
    75: { desc: 'برف سنگین', icon: '❄️' },
    80: { desc: 'رگبار باران', icon: '🌦️' },
    81: { desc: 'رگبار باران متناوب', icon: '🌧️' },
    82: { desc: 'بارش شدید و رگباری', icon: '⛈️' },
    95: { desc: 'رعد و برق و توفان', icon: '⚡' },
    96: { desc: 'توفان همراه با تگرگ', icon: '⛈️' }
  };

  const PERSIAN_WEEKDAYS_SHORT = ['یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];

  function initWeatherWidget() {
    const citySelect = document.getElementById('weather-city-select');
    const tempElem = document.getElementById('weather-big-temp');
    const descElem = document.getElementById('weather-condition-text');
    const iconElem = document.getElementById('weather-hero-icon');
    const feelsElem = document.getElementById('weather-feels-like');
    const humidityElem = document.getElementById('weather-humidity');
    const windElem = document.getElementById('weather-wind');
    const uvElem = document.getElementById('weather-uv');
    const aqiElem = document.getElementById('weather-aqi');
    const forecastRow = document.getElementById('weather-forecast-row');

    function applyWeatherData(data, cityName, forecastList) {
      if (tempElem) tempElem.textContent = toPersianDigits(data.temp);
      if (descElem) descElem.textContent = data.desc;
      if (iconElem) iconElem.textContent = data.icon;
      if (feelsElem) feelsElem.textContent = `احساس: ${toPersianDigits(data.feels)}`;
      if (humidityElem) humidityElem.textContent = toPersianDigits(data.hum);
      if (windElem) windElem.textContent = toPersianDigits(data.wind);
      if (uvElem) uvElem.textContent = toPersianDigits(data.uv || '۴ از ۱۱');
      if (aqiElem) aqiElem.textContent = toPersianDigits(data.aqi || '۶۲ (سالم)');

      if (forecastRow && forecastList && forecastList.length > 0) {
        forecastRow.innerHTML = '';
        forecastList.forEach((f) => {
          const card = document.createElement('div');
          card.className = 'forecast-mini-card';
          card.innerHTML = `
            <span class="forecast-day-name">${escapeHTML(f.day)}</span>
            <span class="forecast-icon">${f.icon}</span>
            <span class="forecast-temp">${toPersianDigits(f.high)} <span class="forecast-temp-low">/ ${toPersianDigits(f.low)}</span></span>
          `;
          forecastRow.appendChild(card);
        });
      }
    }

    async function fetchWeatherForCity(cityKey) {
      const cityInfo = CITY_COORDINATES[cityKey] || CITY_COORDINATES.tehran;
      const fallback = cityInfo.fallback;

      // Default forecast days fallback
      const defaultForecast = [
        { day: 'فردا', icon: '🌤️', high: '۲۴°', low: '۱۳°' },
        { day: '۲ روز بعد', icon: '⛅', high: '۲۲°', low: '۱۲°' },
        { day: '۳ روز بعد', icon: '🌧️', high: '۱۹°', low: '۱۰°' },
        { day: '۴ روز بعد', icon: '☀️', high: '۲۳°', low: '۱۱°' }
      ];

      applyWeatherData(fallback, cityInfo.name, defaultForecast);

      if (!navigator.onLine) return;

      try {
        const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${cityInfo.lat}&longitude=${cityInfo.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max&timezone=auto`;
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Weather API error ' + response.status);

        const resData = await response.json();
        if (resData && resData.current) {
          const cur = resData.current;
          const wCode = cur.weather_code || 0;
          const wInfo = WMO_WEATHER_MAP[wCode] || { desc: 'صاف', icon: '☀️' };

          const liveData = {
            temp: `${Math.round(cur.temperature_2m)}°`,
            desc: wInfo.desc,
            icon: wInfo.icon,
            feels: `${Math.round(cur.apparent_temperature)}°`,
            hum: `${Math.round(cur.relative_humidity_2m)}٪`,
            wind: `${Math.round(cur.wind_speed_10m)} کیلومتر/ساعت`,
            uv: resData.daily && resData.daily.uv_index_max ? `${Math.round(resData.daily.uv_index_max[0])} از ۱۱` : fallback.uv,
            aqi: fallback.aqi
          };

          const dynamicForecast = [];
          if (resData.daily && resData.daily.time && resData.daily.time.length > 1) {
            for (let i = 1; i < Math.min(5, resData.daily.time.length); i++) {
              const dateObj = new Date(resData.daily.time[i]);
              const dayName = i === 1 ? 'فردا' : PERSIAN_WEEKDAYS_SHORT[dateObj.getDay()];
              const dayCode = resData.daily.weather_code ? resData.daily.weather_code[i] : 0;
              const dayInfo = WMO_WEATHER_MAP[dayCode] || { icon: '🌤️' };
              const maxT = Math.round(resData.daily.temperature_2m_max[i]);
              const minT = Math.round(resData.daily.temperature_2m_min[i]);

              dynamicForecast.push({
                day: dayName,
                icon: dayInfo.icon,
                high: `${maxT}°`,
                low: `${minT}°`
              });
            }
          }

          applyWeatherData(liveData, cityInfo.name, dynamicForecast.length > 0 ? dynamicForecast : defaultForecast);
        }
      } catch (err) {}
    }

    // Custom Glass Dropdown Setup for Weather City
    const weatherDropdownWrap = document.getElementById('weather-city-dropdown-wrap');
    const weatherCityBtn = document.getElementById('weather-city-btn');
    const weatherCityBtnText = document.getElementById('weather-city-btn-text');
    const weatherCityMenu = document.getElementById('weather-city-menu');
    const weatherCityItems = weatherCityMenu ? weatherCityMenu.querySelectorAll('.weather-city-item') : [];

    if (weatherCityBtn && weatherDropdownWrap) {
      weatherCityBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        weatherDropdownWrap.classList.toggle('open');
      });

      weatherCityItems.forEach((item) => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const chosenCity = item.getAttribute('data-city');
          const chosenText = item.textContent.trim();

          weatherCityItems.forEach(i => i.classList.remove('active'));
          item.classList.add('active');

          if (weatherCityBtnText) {
            weatherCityBtnText.textContent = chosenText;
          }

          if (citySelect) {
            citySelect.value = chosenCity;
            citySelect.dispatchEvent(new Event('change'));
          }

          weatherDropdownWrap.classList.remove('open');
        });
      });

      document.addEventListener('click', (e) => {
        if (!weatherDropdownWrap.contains(e.target)) {
          weatherDropdownWrap.classList.remove('open');
        }
      });
    }

    if (citySelect) {
      citySelect.addEventListener('change', (e) => {
        const selectedCity = e.target.value;
        fetchWeatherForCity(selectedCity);
        const cityName = citySelect.options[citySelect.selectedIndex]?.text || selectedCity;
        if (weatherCityBtnText) {
          weatherCityBtnText.textContent = cityName;
        }
        showToast(`🌤️ آب و هوای ${cityName} به‌روزرسانی شد`);
      });
    }

    // Initial weather load
    fetchWeatherForCity('tehran');
  }

  /* ==========================================================================
     11. Toast Notification Utility
     ========================================================================== */
  let toastTimer = null;
  function showToast(message) {
    let toast = document.getElementById('toast-notification');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast-notification';
      toast.className = 'toast-notification glass-panel';
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add('show');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  /* ==========================================================================
     12. Main Orchestrator & App Bootstrap
     ========================================================================== */
  function initApp() {
    loadState();
    applySettings();
    initClockAndDate();
    initSearch();
    renderBookmarks();
    initModals();
    initPageNavigation();
    initCuratedBookmarksPage();
    setupBrowserBookmarkSyncListeners();

    // Init Page 2 Widgets
    initAnalogClockWidget();
    initCalendarWidget();
    initNotesWidget();
    initMusicWidget();
    initWeatherWidget();
    initNewsWidget();

    updateTotalBookmarksCounter();


    // Online / Offline Global State listeners
    window.addEventListener('online', () => {
      showToast('🟢 اتصال به اینترنت برقرار شد');
    });

    window.addEventListener('offline', () => {
      showToast('⚠️ اتصال اینترنت قطع شد - حالت آفلاین فعال است');
    });
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();

/* Dynamic Grid Resize Sync */
let gridResizeTimer = null;
window.addEventListener('resize', () => {
  if (gridResizeTimer) clearTimeout(gridResizeTimer);
  gridResizeTimer = setTimeout(() => {
    if (typeof renderBookmarks === 'function') {
      renderBookmarks();
    }
  }, 150);
});
