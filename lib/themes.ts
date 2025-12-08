/**
 * Unified Theme System for RailTime
 * 
 * All theme-specific styling is defined here. Components should use
 * the theme object directly instead of boolean flags or switch statements.
 */

export type ThemeName = 'swiss' | 'swiss-dark' | 'obsidian' | 'napkin' | 'confetti' | 'minimalist';

// Raw color values (hex) for use in style props
export interface ThemeRawColors {
  bg: { primary: string; secondary: string; card: string; };
  text: { primary: string; secondary: string; muted: string; accent: string; };
  accent: { primary: string; secondary: string; success: string; warning: string; error: string; };
  border: { primary: string; secondary: string; };
  trainType: {
    bullet: { bg: string; text: string; };
    limited: { bg: string; text: string; };
    local: { bg: string; text: string; };
  };
}

// CSS class strings for Tailwind
export interface ThemeClasses {
  // Layout
  container: string;
  card: string;
  cardHover: string;
  header: string;
  // Typography
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textAccent: string;
  // Inputs & Buttons
  input: string;
  buttonPrimary: string;
  buttonSecondary: string;
  buttonGhost: string;
  // Borders & Dividers
  border: string;
  divider: string;
  // Status indicators
  statusOnTime: string;
  statusDelayed: string;
  statusEarly: string;
  // Track visualization
  track: string;
  trackProgress: string;
  trainIcon: string;
  // Special effects
  shadow: string;
  glow: string;
}

// Theme style properties
export interface ThemeStyles {
  borderRadius: string;      // CSS border-radius value
  borderWidth: string;       // e.g., "2px", "3px"
  fontFamily: string;        // CSS font-family or Tailwind class
  isRounded: boolean;        // Whether to use rounded corners
  hasShadow: boolean;        // Whether theme uses shadows
  isDark: boolean;           // Dark mode theme
}

// Typography settings
export interface ThemeTypography {
  fontFamily: string;
  logoText: string;
}

export interface Theme {
  name: ThemeName;
  label: string;
  icon: string;
  raw: ThemeRawColors;
  classes: ThemeClasses;
  styles: ThemeStyles;
  typography: ThemeTypography;
}

// ============================================================================
// SWISS LIGHT THEME
// ============================================================================
const swissTheme: Theme = {
  name: 'swiss',
  label: 'Swiss',
  icon: '■',
  raw: {
    bg: { primary: '#FAFAFA', secondary: '#F3F4F6', card: '#FFFFFF' },
    text: { primary: '#111827', secondary: '#374151', muted: '#6B7280', accent: '#E31837' },
    accent: { primary: '#E31837', secondary: '#3B82F6', success: '#22C55E', warning: '#F59E0B', error: '#EF4444' },
    border: { primary: '#E5E7EB', secondary: '#D1D5DB' },
    trainType: {
      bullet: { bg: '#EF4444', text: '#FFFFFF' },
      limited: { bg: '#F59E0B', text: '#111827' },
      local: { bg: '#3B82F6', text: '#FFFFFF' },
    },
  },
  classes: {
    container: 'bg-[#FAFAFA]',
    card: 'bg-white border border-[#E5E7EB] rounded-lg',
    cardHover: 'hover:shadow-md hover:border-[#D1D5DB] transition-all',
    header: 'bg-[#F3F4F6]',
    textPrimary: 'text-[#111827]',
    textSecondary: 'text-[#374151]',
    textMuted: 'text-[#6B7280]',
    textAccent: 'text-[#E31837]',
    input: 'bg-white border border-[#E5E7EB] rounded-md focus:border-[#E31837] focus:ring-1 focus:ring-[#E31837]',
    buttonPrimary: 'bg-[#E31837] text-white rounded-md hover:bg-[#C41230] transition-colors',
    buttonSecondary: 'bg-[#3B82F6] text-white rounded-md hover:bg-[#2563EB] transition-colors',
    buttonGhost: 'bg-transparent text-[#6B7280] hover:bg-[#F3F4F6] rounded-md transition-colors',
    border: 'border-[#E5E7EB]',
    divider: 'border-[#E5E7EB]',
    statusOnTime: 'text-[#22C55E]',
    statusDelayed: 'text-[#EF4444]',
    statusEarly: 'text-[#3B82F6]',
    track: 'bg-[#F3F4F6] rounded-full',
    trackProgress: 'bg-[#E31837]',
    trainIcon: 'bg-[#E31837] rounded-full',
    shadow: 'shadow-sm',
    glow: '',
  },
  styles: {
    borderRadius: '0.5rem',
    borderWidth: '1px',
    fontFamily: 'font-outfit',
    isRounded: true,
    hasShadow: true,
    isDark: false,
  },
  typography: {
    fontFamily: 'font-outfit',
    logoText: 'RailTime',
  },
};

// ============================================================================
// SWISS DARK THEME
// ============================================================================
const swissDarkTheme: Theme = {
  name: 'swiss-dark',
  label: 'Swiss Dark',
  icon: '■',
  raw: {
    bg: { primary: '#111827', secondary: '#1F2937', card: '#1F2937' },
    text: { primary: '#F9FAFB', secondary: '#E5E7EB', muted: '#9CA3AF', accent: '#F87171' },
    accent: { primary: '#F87171', secondary: '#60A5FA', success: '#34D399', warning: '#FBBF24', error: '#F87171' },
    border: { primary: '#374151', secondary: '#4B5563' },
    trainType: {
      bullet: { bg: '#F87171', text: '#FFFFFF' },
      limited: { bg: '#FBBF24', text: '#111827' },
      local: { bg: '#60A5FA', text: '#FFFFFF' },
    },
  },
  classes: {
    container: 'bg-[#111827]',
    card: 'bg-[#1F2937] border border-[#374151] rounded-lg',
    cardHover: 'hover:border-[#4B5563] transition-all',
    header: 'bg-[#1F2937]',
    textPrimary: 'text-[#F9FAFB]',
    textSecondary: 'text-[#E5E7EB]',
    textMuted: 'text-[#9CA3AF]',
    textAccent: 'text-[#F87171]',
    input: 'bg-[#1F2937] border border-[#374151] rounded-md text-[#F9FAFB] focus:border-[#F87171]',
    buttonPrimary: 'bg-[#F87171] text-white rounded-md hover:bg-[#EF4444] transition-colors',
    buttonSecondary: 'bg-[#60A5FA] text-white rounded-md hover:bg-[#3B82F6] transition-colors',
    buttonGhost: 'bg-transparent text-[#9CA3AF] hover:bg-[#374151] rounded-md transition-colors',
    border: 'border-[#374151]',
    divider: 'border-[#374151]',
    statusOnTime: 'text-[#34D399]',
    statusDelayed: 'text-[#F87171]',
    statusEarly: 'text-[#60A5FA]',
    track: 'bg-[#374151] rounded-full',
    trackProgress: 'bg-[#F87171]',
    trainIcon: 'bg-[#F87171] rounded-full',
    shadow: '',
    glow: '',
  },
  styles: {
    borderRadius: '0.5rem',
    borderWidth: '1px',
    fontFamily: 'font-outfit',
    isRounded: true,
    hasShadow: false,
    isDark: true,
  },
  typography: {
    fontFamily: 'font-outfit',
    logoText: 'RailTime',
  },
};

// ============================================================================
// OBSIDIAN THEME
// ============================================================================
const obsidianTheme: Theme = {
  name: 'obsidian',
  label: 'Obsidian',
  icon: '✦',
  raw: {
    bg: { primary: '#050506', secondary: '#0a0a0c', card: '#0f0f12' },
    text: { primary: '#EDEDEF', secondary: '#EDEDEF', muted: '#8A8F98', accent: '#5E6AD2' },
    accent: { primary: '#5E6AD2', secondary: '#6872D9', success: '#34D399', warning: '#FBBF24', error: '#F87171' },
    border: { primary: 'rgba(255,255,255,0.06)', secondary: 'rgba(255,255,255,0.10)' },
    trainType: {
      bullet: { bg: 'rgba(244,63,94,0.2)', text: '#fb7185' },
      limited: { bg: 'rgba(251,191,36,0.2)', text: '#fbbf24' },
      local: { bg: 'rgba(94,106,210,0.2)', text: '#5E6AD2' },
    },
  },
  classes: {
    container: 'bg-[#050506]',
    card: 'bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.06] rounded-xl',
    cardHover: 'hover:bg-white/[0.08] hover:border-white/[0.10] transition-all',
    header: 'bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.06]',
    textPrimary: 'text-[#EDEDEF]',
    textSecondary: 'text-[#EDEDEF]/90',
    textMuted: 'text-[#8A8F98]',
    textAccent: 'text-[#5E6AD2]',
    input: 'bg-[#0f0f12] border border-white/[0.10] rounded-lg text-[#EDEDEF] focus:border-[#5E6AD2]',
    buttonPrimary: 'bg-[#5E6AD2] text-white rounded-lg hover:bg-[#6872D9] shadow-[0_0_0_1px_rgba(94,106,210,0.5),0_4px_12px_rgba(94,106,210,0.3)]',
    buttonSecondary: 'bg-white/[0.08] text-[#EDEDEF] border border-white/[0.06] rounded-lg hover:bg-white/[0.12]',
    buttonGhost: 'bg-transparent text-[#8A8F98] hover:bg-white/[0.08] rounded-lg transition-colors',
    border: 'border-white/[0.06]',
    divider: 'border-white/[0.06]',
    statusOnTime: 'text-emerald-400',
    statusDelayed: 'text-rose-400',
    statusEarly: 'text-[#5E6AD2]',
    track: 'bg-white/[0.06] rounded-full',
    trackProgress: 'bg-gradient-to-r from-[#5E6AD2] to-[#6872D9]',
    trainIcon: 'bg-[#5E6AD2] rounded-full',
    shadow: 'shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_2px_20px_rgba(0,0,0,0.4)]',
    glow: 'shadow-[0_0_30px_rgba(94,106,210,0.15)]',
  },
  styles: {
    borderRadius: '0.75rem',
    borderWidth: '1px',
    fontFamily: 'font-sans',
    isRounded: true,
    hasShadow: true,
    isDark: true,
  },
  typography: {
    fontFamily: 'font-sans',
    logoText: 'RailTime',
  },
};

// ============================================================================
// NAPKIN (SKETCH) THEME
// ============================================================================
const napkinTheme: Theme = {
  name: 'napkin',
  label: 'Napkin',
  icon: '✏️',
  raw: {
    bg: { primary: '#fdfbf7', secondary: '#FFFFFF', card: '#FFFFFF' },
    text: { primary: '#2d2d2d', secondary: '#2d2d2d', muted: 'rgba(45,45,45,0.5)', accent: '#ff4d4d' },
    accent: { primary: '#ff4d4d', secondary: '#2d5da1', success: '#2d5da1', warning: '#fff9c4', error: '#ff4d4d' },
    border: { primary: '#2d2d2d', secondary: 'rgba(45,45,45,0.3)' },
    trainType: {
      bullet: { bg: '#ff4d4d', text: '#FFFFFF' },
      limited: { bg: '#fff9c4', text: '#2d2d2d' },
      local: { bg: '#2d5da1', text: '#FFFFFF' },
    },
  },
  classes: {
    container: 'bg-[#fdfbf7]',
    card: 'bg-white border-[3px] border-[#2d2d2d] shadow-[4px_4px_0px_0px_#2d2d2d]',
    cardHover: 'hover:shadow-[2px_2px_0px_0px_#2d2d2d] hover:translate-x-[2px] hover:translate-y-[2px] transition-all',
    header: 'bg-white border-[3px] border-[#2d2d2d]',
    textPrimary: 'text-[#2d2d2d]',
    textSecondary: 'text-[#2d2d2d]/80',
    textMuted: 'text-[#2d2d2d]/50',
    textAccent: 'text-[#ff4d4d]',
    input: 'bg-white border-2 border-[#2d2d2d] text-[#2d2d2d] focus:border-[#ff4d4d]',
    buttonPrimary: 'bg-[#ff4d4d] text-white border-[3px] border-[#2d2d2d] shadow-[3px_3px_0px_0px_#2d2d2d] hover:shadow-[1px_1px_0px_0px_#2d2d2d] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px]',
    buttonSecondary: 'bg-[#2d5da1] text-white border-[3px] border-[#2d2d2d] shadow-[3px_3px_0px_0px_#2d2d2d] hover:shadow-[1px_1px_0px_0px_#2d2d2d] hover:translate-x-[2px] hover:translate-y-[2px]',
    buttonGhost: 'bg-transparent text-[#2d2d2d]/60 border-2 border-dashed border-[#2d2d2d]/30 hover:border-[#2d2d2d] hover:text-[#2d2d2d]',
    border: 'border-[#2d2d2d]',
    divider: 'border-[#2d2d2d]/30 border-dashed',
    statusOnTime: 'text-[#2d5da1]',
    statusDelayed: 'text-[#ff4d4d]',
    statusEarly: 'text-[#2d5da1]',
    track: 'bg-[#e5e0d8] border-[3px] border-[#2d2d2d]',
    trackProgress: 'bg-[#2d2d2d]',
    trainIcon: 'bg-[#ff4d4d] border-[3px] border-[#2d2d2d] shadow-[3px_3px_0px_0px_#2d2d2d]',
    shadow: 'shadow-[4px_4px_0px_0px_#2d2d2d]',
    glow: 'shadow-[6px_6px_0px_0px_#2d2d2d]',
  },
  styles: {
    borderRadius: '40px 8px 45px 6px / 8px 42px 7px 40px', // Wobbly sketch effect
    borderWidth: '3px',
    fontFamily: 'font-patrick-hand',
    isRounded: false, // Uses wobbly borders instead
    hasShadow: true,
    isDark: false,
  },
  typography: {
    fontFamily: 'font-patrick-hand',
    logoText: 'RailTime',
  },
};

// ============================================================================
// CONFETTI (PLAYFUL) THEME
// ============================================================================
const confettiTheme: Theme = {
  name: 'confetti',
  label: 'Confetti',
  icon: '🎨',
  raw: {
    bg: { primary: '#FFFDF5', secondary: '#FFFFFF', card: '#FFFFFF' },
    text: { primary: '#1E293B', secondary: '#334155', muted: '#64748B', accent: '#8B5CF6' },
    accent: { primary: '#8B5CF6', secondary: '#F472B6', success: '#34D399', warning: '#FBBF24', error: '#F472B6' },
    border: { primary: '#1E293B', secondary: '#E2E8F0' },
    trainType: {
      bullet: { bg: '#F472B6', text: '#FFFFFF' },
      limited: { bg: '#FBBF24', text: '#1E293B' },
      local: { bg: '#8B5CF6', text: '#FFFFFF' },
    },
  },
  classes: {
    container: 'bg-[#FFFDF5]',
    card: 'bg-white border-2 border-[#1E293B] rounded-2xl shadow-[4px_4px_0px_0px_#1E293B]',
    cardHover: 'hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#1E293B] transition-all',
    header: 'bg-white border-2 border-[#1E293B] rounded-2xl',
    textPrimary: 'text-[#1E293B]',
    textSecondary: 'text-[#334155]',
    textMuted: 'text-[#64748B]',
    textAccent: 'text-[#8B5CF6]',
    input: 'bg-white border-2 border-[#1E293B] rounded-xl text-[#1E293B] shadow-[3px_3px_0px_0px_#1E293B] focus:shadow-[4px_4px_0px_0px_#8B5CF6]',
    buttonPrimary: 'bg-[#8B5CF6] text-white border-2 border-[#1E293B] rounded-full shadow-[4px_4px_0px_0px_#1E293B] hover:shadow-[6px_6px_0px_0px_#1E293B] hover:-translate-y-0.5 active:shadow-[2px_2px_0px_0px_#1E293B] active:translate-y-0.5',
    buttonSecondary: 'bg-[#FBBF24] text-[#1E293B] border-2 border-[#1E293B] rounded-full shadow-[4px_4px_0px_0px_#1E293B] hover:shadow-[6px_6px_0px_0px_#1E293B] hover:-translate-y-0.5',
    buttonGhost: 'bg-transparent text-[#64748B] border-2 border-dashed border-[#E2E8F0] rounded-full hover:border-[#8B5CF6] hover:text-[#8B5CF6]',
    border: 'border-[#1E293B]',
    divider: 'border-[#E2E8F0]',
    statusOnTime: 'text-[#34D399]',
    statusDelayed: 'text-[#F472B6]',
    statusEarly: 'text-[#8B5CF6]',
    track: 'bg-[#E2E8F0] border-2 border-[#1E293B] rounded-full',
    trackProgress: 'bg-gradient-to-r from-[#8B5CF6] via-[#F472B6] to-[#FBBF24]',
    trainIcon: 'bg-[#8B5CF6] rounded-full border-2 border-[#1E293B] shadow-[3px_3px_0px_0px_#1E293B]',
    shadow: 'shadow-[4px_4px_0px_0px_#1E293B]',
    glow: 'shadow-[6px_6px_0px_0px_#E2E8F0]',
  },
  styles: {
    borderRadius: '1rem',
    borderWidth: '2px',
    fontFamily: 'font-outfit',
    isRounded: true,
    hasShadow: true,
    isDark: false,
  },
  typography: {
    fontFamily: 'font-outfit',
    logoText: 'RailTime',
  },
};

// ============================================================================
// MINIMALIST (SWISS INTERNATIONAL) THEME
// ============================================================================
const minimalistTheme: Theme = {
  name: 'minimalist',
  label: 'Minimalist',
  icon: '▢',
  raw: {
    bg: { primary: '#FFFFFF', secondary: '#F2F2F2', card: '#FFFFFF' },
    text: { primary: '#000000', secondary: '#000000', muted: '#666666', accent: '#FF3000' },
    accent: { primary: '#FF3000', secondary: '#000000', success: '#000000', warning: '#FF3000', error: '#FF3000' },
    border: { primary: '#000000', secondary: '#E5E5E5' },
    trainType: {
      bullet: { bg: '#FF3000', text: '#FFFFFF' },
      limited: { bg: '#000000', text: '#FFFFFF' },
      local: { bg: '#F2F2F2', text: '#000000' },
    },
  },
  classes: {
    container: 'bg-white',
    card: 'bg-white border-2 border-black',
    cardHover: 'hover:bg-[#FF3000] hover:text-white transition-all duration-150',
    header: 'bg-[#F2F2F2] border-b-4 border-black',
    textPrimary: 'text-black',
    textSecondary: 'text-black',
    textMuted: 'text-[#666666]',
    textAccent: 'text-[#FF3000]',
    input: 'bg-white border-b-2 border-black text-black focus:border-[#FF3000] placeholder:text-[#666666] placeholder:uppercase placeholder:text-xs placeholder:tracking-wider',
    buttonPrimary: 'bg-black text-white hover:bg-[#FF3000] transition-all duration-150 uppercase text-xs tracking-[0.15em] font-bold',
    buttonSecondary: 'bg-[#F2F2F2] text-black border-2 border-black hover:bg-black hover:text-white transition-all duration-150 uppercase text-xs tracking-[0.15em] font-bold',
    buttonGhost: 'bg-transparent text-[#666666] border-2 border-dashed border-black/30 hover:border-black hover:text-black uppercase text-xs tracking-[0.15em]',
    border: 'border-black',
    divider: 'border-black',
    statusOnTime: 'text-black',
    statusDelayed: 'text-[#FF3000]',
    statusEarly: 'text-[#FF3000]',
    track: 'bg-[#F2F2F2] border-2 border-black',
    trackProgress: 'bg-black',
    trainIcon: 'bg-[#FF3000] border-2 border-black',
    shadow: '',
    glow: '',
  },
  styles: {
    borderRadius: '0',
    borderWidth: '2px',
    fontFamily: 'font-inter',
    isRounded: false,
    hasShadow: false,
    isDark: false,
  },
  typography: {
    fontFamily: 'font-inter',
    logoText: 'RAILTIME',
  },
};

// ============================================================================
// THEME REGISTRY
// ============================================================================
export const themes: Record<ThemeName, Theme> = {
  swiss: swissTheme,
  'swiss-dark': swissDarkTheme,
  obsidian: obsidianTheme,
  napkin: napkinTheme,
  confetti: confettiTheme,
  minimalist: minimalistTheme,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Get train type colors for a specific theme */
export function getTrainTypeStyle(theme: Theme, trainType: string): { bg: string; text: string } {
  const type = trainType.toLowerCase() as 'bullet' | 'limited' | 'local';
  return theme.raw.trainType[type] || theme.raw.trainType.local;
}

/** Get status color class */
export function getStatusClass(theme: Theme, status: 'on-time' | 'delayed' | 'early'): string {
  switch (status) {
    case 'on-time': return theme.classes.statusOnTime;
    case 'delayed': return theme.classes.statusDelayed;
    case 'early': return theme.classes.statusEarly;
    default: return theme.classes.textMuted;
  }
}

/** Check if theme is dark mode */
export function isDarkTheme(theme: Theme): boolean {
  return theme.styles.isDark;
}

/** Get border radius style for inline styles */
export function getBorderRadius(theme: Theme): string {
  return theme.styles.borderRadius;
}
