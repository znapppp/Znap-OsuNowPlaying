window.COUNTER_PATH = window.COUNTER_PATH || 'Znap-OsuNowPlaying';

// Served by tosu over http -> use its host; hosted elsewhere (e.g. GitHub Pages) -> local tosu, overridable with ?host=
const params = new URLSearchParams(window.location.search);
const WS_HOST =
  params.get('host') ||
  (window.location.protocol === 'http:' && window.location.host) ||
  '127.0.0.1:24050';

import WebSocketManager from './socket.js';
const socket = new WebSocketManager(WS_HOST);

// Configuration state (supports both Tosu settings.json and URL query parameters for GitHub Pages)
const config = {
  ShowNowPlayingLabel: params.has('label') ? params.get('label') !== '0' && params.get('label') !== 'false' : true,
  NowPlayingText: params.get('labeltext') || 'Now Playing',
  TextAlignment: params.get('align') || 'Center', // Center | Left | Right
  LayoutStyle: params.get('layout') || 'Stacked (2 Lines)', // Stacked (2 Lines) | Single Line
  ShowDifficulty: params.has('diff') ? params.get('diff') !== '0' && params.get('diff') !== 'false' : true,
  UseUnicode: params.has('unicode') ? params.get('unicode') === '1' || params.get('unicode') === 'true' : false,
  FontStyle: params.get('font') || 'Rounded Clean (M PLUS / Quicksand)',
  TitleFontSize: params.has('tsize') ? Number(params.get('tsize')) : 26,
  SubFontSize: params.has('ssize') ? Number(params.get('ssize')) : 17,
  TextColor: params.get('color') || '#FFFFFF',
  SubTextColor: params.get('subcolor') || '#F2F4F8',
  ShadowStrength: params.get('shadow') || 'Soft Clean',
  MaxWidth: params.has('maxw') ? Number(params.get('maxw')) : 720,
  TransitionDuration: params.has('duration') ? Number(params.get('duration')) : 550,
  HideWhenIdle: params.has('gameplay') ? params.get('gameplay') === '1' || params.get('gameplay') === 'true' : false
};

// Live beatmap data cache
const state = {
  checksum: '',
  title: '',
  titleUnicode: '',
  artist: '',
  artistUnicode: '',
  version: '',
  mapper: '',
  gameState: 'menu',
  lastRenderedKey: ''
};

// DOM Elements
const rootEl = document.getElementById('now-playing-root');
const headerEl = document.getElementById('np-header');
const headerTextEl = document.getElementById('np-label-text');
const cardEl = document.getElementById('song-card');
const titleScrollEl = document.getElementById('title-scroll');
const metaScrollEl = document.getElementById('meta-scroll');
const titleEl = document.getElementById('song-title');
const artistEl = document.getElementById('song-artist');
const sepEl = document.getElementById('meta-sep');
const diffEl = document.getElementById('song-diff');

let transitionTimeout = null;
let transitionRaf = null;

// Apply visual configuration to CSS variables and classes
function applyVisualConfig() {
  const rootStyle = document.documentElement.style;

  // 0. "Now Playing" Top Header Label
  if (headerEl && headerTextEl) {
    headerTextEl.textContent = config.NowPlayingText || 'Now Playing';
    if (config.ShowNowPlayingLabel) {
      headerEl.classList.remove('hidden');
    } else {
      headerEl.classList.add('hidden');
    }
  }

  // 1. Alignment
  const align = String(config.TextAlignment).toLowerCase();
  rootEl.classList.remove('align-center', 'align-left', 'align-right');
  if (align.includes('left')) {
    rootEl.classList.add('align-left');
  } else if (align.includes('right')) {
    rootEl.classList.add('align-right');
  } else {
    rootEl.classList.add('align-center');
  }

  // 2. Layout Style
  const layout = String(config.LayoutStyle).toLowerCase();
  rootEl.classList.remove('layout-stacked', 'layout-single');
  if (layout.includes('single')) {
    rootEl.classList.add('layout-single');
  } else {
    rootEl.classList.add('layout-stacked');
  }

  // 3. Font Family
  const fontChoice = String(config.FontStyle).toLowerCase();
  if (fontChoice.includes('mali') || fontChoice.includes('handwritten') || fontChoice.includes('itim')) {
    rootStyle.setProperty('--font-family', "'Mali', 'Itim', 'M PLUS Rounded 1c', sans-serif");
  } else if (fontChoice.includes('nunito') || fontChoice.includes('bubble')) {
    rootStyle.setProperty('--font-family', "'Nunito', 'M PLUS Rounded 1c', 'Mali', sans-serif");
  } else {
    rootStyle.setProperty('--font-family', "'Quicksand', 'M PLUS Rounded 1c', 'Mali', sans-serif");
  }

  // 4. Font Sizes & Max Width & Duration
  const titleSize = Number(config.TitleFontSize) || 26;
  const subSize = Number(config.SubFontSize) || 17;
  const maxWidth = Number(config.MaxWidth) || 720;
  const duration = Math.max(150, Number(config.TransitionDuration) || 550);

  rootStyle.setProperty('--title-size', `${titleSize}px`);
  rootStyle.setProperty('--sub-size', `${subSize}px`);
  rootStyle.setProperty('--max-width', `${maxWidth}px`);
  rootStyle.setProperty('--transition-ms', `${duration}ms`);

  // 5. Colors
  if (config.TextColor) {
    rootStyle.setProperty('--title-color', config.TextColor);
  }
  if (config.SubTextColor) {
    rootStyle.setProperty('--sub-color', config.SubTextColor);
    rootStyle.setProperty('--diff-color', config.SubTextColor);
  }

  // 6. Shadow Strength
  const shadow = String(config.ShadowStrength).toLowerCase();
  if (shadow.includes('none')) {
    rootStyle.setProperty('--text-shadow', 'none');
  } else if (shadow.includes('strong')) {
    rootStyle.setProperty(
      '--text-shadow',
      '0 2px 12px rgba(0, 0, 0, 0.85), 0 1px 4px rgba(0, 0, 0, 0.75), 0 0 2px rgba(0, 0, 0, 0.6)'
    );
  } else if (shadow.includes('pastel') || shadow.includes('glow')) {
    rootStyle.setProperty(
      '--text-shadow',
      '0 2px 12px rgba(255, 165, 215, 0.55), 0 2px 8px rgba(0, 0, 0, 0.55)'
    );
  } else {
    // Soft Clean (Default)
    rootStyle.setProperty(
      '--text-shadow',
      '0 2px 10px rgba(0, 0, 0, 0.55), 0 1px 3px rgba(0, 0, 0, 0.45)'
    );
  }

  // Re-evaluate visibility and text rendering
  updateVisibilityState();
  renderSongText(false);
}

// Compute current display strings based on config
function getDisplayStrings() {
  const useUni = Boolean(config.UseUnicode);
  const rawTitle = (useUni && state.titleUnicode ? state.titleUnicode : state.title) || state.title || '';
  const rawArtist = (useUni && state.artistUnicode ? state.artistUnicode : state.artist) || state.artist || '';
  const rawDiff = state.version || '';

  return {
    title: rawTitle.trim(),
    artist: rawArtist.trim(),
    diff: rawDiff.trim()
  };
}

// Check and update smooth back-and-forth marquee if text exceeds MaxWidth
function updateMarqueeFor(scrollEl) {
  if (!scrollEl || !scrollEl.parentElement) return;
  const wrapper = scrollEl.parentElement;

  scrollEl.classList.remove('animate-marquee');
  wrapper.classList.remove('is-scrolling');
  scrollEl.style.removeProperty('--scroll-distance');
  scrollEl.style.removeProperty('--scroll-duration');

  // Measure overflow on next frame
  requestAnimationFrame(() => {
    const containerWidth = wrapper.clientWidth;
    const contentWidth = scrollEl.scrollWidth;
    const overflow = contentWidth - containerWidth;

    if (overflow > 12 && containerWidth > 0) {
      const distance = -(overflow + 16);
      // Smooth reading speed (~35px per second, minimum 6 seconds)
      const durationSec = Math.max(6, Math.min(24, Math.round(overflow / 32) + 5));
      scrollEl.style.setProperty('--scroll-distance', `${distance}px`);
      scrollEl.style.setProperty('--scroll-duration', `${durationSec}s`);
      wrapper.classList.add('is-scrolling');
      scrollEl.classList.add('animate-marquee');
    }
  });
}

// Populate DOM text and trigger smooth transition if song changed
function renderSongText(animate = true) {
  const { title, artist, diff } = getDisplayStrings();
  if (!title && !artist) return;

  const showDiff = Boolean(config.ShowDifficulty) && Boolean(diff);
  const renderKey = `${title}|||${artist}|||${showDiff ? diff : ''}|||${config.LayoutStyle}`;

  if (animate && renderKey === state.lastRenderedKey) {
    return;
  }
  state.lastRenderedKey = renderKey;

  const applyDomContent = () => {
    const isSingleLine = String(config.LayoutStyle).toLowerCase().includes('single');

    if (isSingleLine) {
      // Single Line: Artist - Title [Difficulty]
      titleEl.textContent = artist ? `${artist}  —  ${title}` : title;
      artistEl.textContent = '';
      sepEl.classList.add('hidden');
      if (showDiff) {
        diffEl.textContent = `[${diff}]`;
        diffEl.classList.remove('hidden');
      } else {
        diffEl.textContent = '';
        diffEl.classList.add('hidden');
      }
    } else {
      // Stacked 2 Lines:
      // Line 1: Title
      // Line 2: Artist • [Difficulty]
      titleEl.textContent = title;
      artistEl.textContent = artist;

      if (showDiff) {
        diffEl.textContent = `[${diff}]`;
        diffEl.classList.remove('hidden');
        if (artist) {
          sepEl.classList.remove('hidden');
        } else {
          sepEl.classList.add('hidden');
        }
      } else {
        diffEl.textContent = '';
        diffEl.classList.add('hidden');
        sepEl.classList.add('hidden');
      }
    }

    updateMarqueeFor(titleScrollEl);
    updateMarqueeFor(metaScrollEl);
  };

  if (!animate) {
    applyDomContent();
    return;
  }

  // Smooth 2-stage transition: Blur & float out -> swap text -> Blur & float in
  if (transitionTimeout) clearTimeout(transitionTimeout);
  if (transitionRaf) cancelAnimationFrame(transitionRaf);

  const halfDuration = Math.max(120, Math.round((Number(config.TransitionDuration) || 550) * 0.48));

  cardEl.classList.remove('visible', 'switching-in-prep');
  cardEl.classList.add('switching-out');

  transitionTimeout = setTimeout(() => {
    applyDomContent();

    // Prepare incoming position below without transition
    cardEl.classList.remove('switching-out');
    cardEl.classList.add('switching-in-prep');

    // Force reflow so browser registers the starting position
    void cardEl.offsetWidth;

    transitionRaf = requestAnimationFrame(() => {
      cardEl.classList.remove('switching-in-prep');
      if (!shouldHideForState()) {
        cardEl.classList.add('visible');
      }
    });
  }, halfDuration);
}

function shouldHideForState() {
  if (!config.HideWhenIdle) return false;
  return state.gameState !== 'play';
}

function updateVisibilityState() {
  if (shouldHideForState()) {
    cardEl.classList.add('hidden-idle');
    cardEl.classList.remove('visible');
    if (headerEl) headerEl.classList.add('hidden-idle');
  } else {
    cardEl.classList.remove('hidden-idle');
    if (headerEl) headerEl.classList.remove('hidden-idle');
    if (!cardEl.classList.contains('switching-out') && !cardEl.classList.contains('switching-in-prep')) {
      cardEl.classList.add('visible');
    }
  }
}

// Helper for boolean settings
function toBool(val) {
  return val === true || val === 'true' || val === 1 || val === '1';
}

// Apply settings received from Tosu
function applyTosuSettings(message) {
  if (!message || typeof message !== 'object') return;

  if (message.ShowNowPlayingLabel !== undefined) config.ShowNowPlayingLabel = toBool(message.ShowNowPlayingLabel);
  if (message.NowPlayingText !== undefined) config.NowPlayingText = message.NowPlayingText;
  if (message.TextAlignment !== undefined) config.TextAlignment = message.TextAlignment;
  if (message.LayoutStyle !== undefined) config.LayoutStyle = message.LayoutStyle;
  if (message.ShowDifficulty !== undefined) config.ShowDifficulty = toBool(message.ShowDifficulty);
  if (message.UseUnicode !== undefined) config.UseUnicode = toBool(message.UseUnicode);
  if (message.FontStyle !== undefined) config.FontStyle = message.FontStyle;
  if (message.TitleFontSize !== undefined) config.TitleFontSize = Number(message.TitleFontSize);
  if (message.SubFontSize !== undefined) config.SubFontSize = Number(message.SubFontSize);
  if (message.TextColor !== undefined) config.TextColor = message.TextColor;
  if (message.SubTextColor !== undefined) config.SubTextColor = message.SubTextColor;
  if (message.ShadowStrength !== undefined) config.ShadowStrength = message.ShadowStrength;
  if (message.MaxWidth !== undefined) config.MaxWidth = Number(message.MaxWidth);
  if (message.TransitionDuration !== undefined) config.TransitionDuration = Number(message.TransitionDuration);
  if (message.HideWhenIdle !== undefined) config.HideWhenIdle = toBool(message.HideWhenIdle);

  applyVisualConfig();
}

// Listen for Tosu WebSocket commands (Settings updates)
socket.commands((data) => {
  try {
    const { command, message } = data;
    if (!message || typeof message !== 'object') return;
    if (command === 'getSettings') {
      console.log('[Znap-OsuNowPlaying] Settings loaded:', message);
    }
    applyTosuSettings(message);
  } catch (err) {
    console.error('[Znap-OsuNowPlaying] Settings error:', err);
  }
});

// Request initial settings from Tosu
const counterPath = window.COUNTER_PATH || 'Znap-OsuNowPlaying';
socket.sendCommand('getSettings', counterPath);
if (counterPath !== encodeURI(counterPath)) {
  socket.sendCommand('getSettings', encodeURI(counterPath));
}

// Subscribe to Tosu v2 WebSocket for beatmap metadata & game state
socket.api_v2(
  (data) => {
    let songChanged = false;

    if (data?.state?.name !== undefined && state.gameState !== data.state.name) {
      state.gameState = data.state.name;
      updateVisibilityState();
    }

    const bm = data?.beatmap;
    if (bm) {
      if (bm.checksum !== undefined && bm.checksum !== state.checksum) {
        state.checksum = bm.checksum;
        songChanged = true;
      }

      const newTitle = bm.title ?? '';
      const newTitleUni = bm.titleUnicode ?? '';
      const newArtist = bm.artist ?? '';
      const newArtistUni = bm.artistUnicode ?? '';
      const newVersion = bm.version ?? '';
      const newMapper = bm.mapper ?? '';

      if (
        newTitle !== state.title ||
        newTitleUni !== state.titleUnicode ||
        newArtist !== state.artist ||
        newArtistUni !== state.artistUnicode ||
        newVersion !== state.version
      ) {
        state.title = newTitle;
        state.titleUnicode = newTitleUni;
        state.artist = newArtist;
        state.artistUnicode = newArtistUni;
        state.version = newVersion;
        state.mapper = newMapper;
        songChanged = true;
      }
    }

    if (songChanged) {
      renderSongText(true);
    }
  },
  [
    {
      field: 'beatmap',
      keys: [
        'checksum',
        'title',
        'titleUnicode',
        'artist',
        'artistUnicode',
        'version',
        'mapper'
      ]
    },
    {
      field: 'state',
      keys: ['name']
    }
  ]
);

// Initialize visual config on startup
applyVisualConfig();
