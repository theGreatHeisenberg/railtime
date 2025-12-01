export type ThemeName = 'dark' | 'cyberpunk' | 'upside-down' | 'aurora' | 'holiday';

export interface ThemeColors {
  // Background colors
  bg: {
    primary: string;
    secondary: string;
    tertiary: string;
    card: string;
  };
  // Text colors
  text: {
    primary: string;
    secondary: string;
    accent: string;
    muted: string;
  };
  // UI elements
  ui: {
    border: string;
    divider: string;
    hover: string;
    active: string;
  };
  // Status colors
  status: {
    onTime: string;
    delayed: string;
    early: string;
  };
  // Progress bar colors
  progress: {
    passed: string;
    current: string;
    upcoming: string;
    origin: string;
  };
  // Track/train colors
  track: {
    background: string;
    fill: string;
    accent: string;
  };
  // Shadows & effects
  shadow: string;
  glow: string;
}

export interface Theme {
  name: ThemeName;
  label: string;
  colors: ThemeColors;
  gradients: {
    main: string;
    accent: string;
  };
  typography: {
    fontFamily: string;
    logoText: string;
  };
  logo: {
    icon: string;
  };
}

export const themes: Record<ThemeName, Theme> = {
  dark: {
    name: 'dark',
    label: '🌙 Dark',
    colors: {
      bg: {
        primary: 'bg-slate-950',
        secondary: 'bg-slate-900',
        tertiary: 'bg-slate-800',
        card: 'bg-slate-900',
      },
      text: {
        primary: 'text-slate-100',
        secondary: 'text-slate-300',
        accent: 'text-slate-400',
        muted: 'text-slate-500',
      },
      ui: {
        border: 'border-slate-700',
        divider: 'border-slate-800',
        hover: 'hover:bg-slate-700/50',
        active: 'bg-slate-700',
      },
      status: {
        onTime: 'text-green-400',
        delayed: 'text-red-400',
        early: 'text-blue-400',
      },
      progress: {
        passed: 'rgb(34, 197, 94)',
        current: 'rgb(34, 211, 238)',
        upcoming: 'rgb(100, 116, 139)',
        origin: '#fbbf24',
      },
      track: {
        background: 'bg-slate-700',
        fill: 'bg-gradient-to-r from-cyan-500 to-blue-500',
        accent: 'rgba(6,182,212,0.5)',
      },
      shadow: 'shadow-2xl',
      glow: 'drop-shadow-md',
    },
    gradients: {
      main: 'from-slate-900 to-slate-950',
      accent: 'from-blue-600 to-cyan-600',
    },
    typography: {
      fontFamily: 'font-mono',
      logoText: 'RAILTIME',
    },
    logo: {
      icon: '▸',
    },
  },
  cyberpunk: {
    name: 'cyberpunk',
    label: '⚡ Cyberpunk',
    colors: {
      bg: {
        primary: 'bg-black',
        secondary: 'bg-black',
        tertiary: 'bg-black/80',
        card: 'bg-black',
      },
      text: {
        primary: 'text-cyan-300',
        secondary: 'text-cyan-400',
        accent: 'text-cyan-500',
        muted: 'text-cyan-700',
      },
      ui: {
        border: 'border-cyan-500/50',
        divider: 'border-cyan-900/50',
        hover: 'hover:bg-cyan-900/30',
        active: 'bg-cyan-900/50',
      },
      status: {
        onTime: 'text-lime-400',
        delayed: 'text-pink-400',
        early: 'text-cyan-400',
      },
      progress: {
        passed: '#06b6d4',
        current: '#00ff41',
        upcoming: '#1a1a2e',
        origin: '#ff006e',
      },
      track: {
        background: 'bg-cyan-900/20',
        fill: 'bg-gradient-to-r from-cyan-500 to-pink-500 shadow-[0_0_30px_rgba(6,182,212,0.8)]',
        accent: 'rgba(6,182,212,0.8)',
      },
      shadow: 'shadow-[0_0_50px_rgba(6,182,212,0.15)]',
      glow: 'drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]',
    },
    gradients: {
      main: 'from-black via-cyan-900/20 to-black',
      accent: 'from-cyan-500 via-pink-500 to-purple-600',
    },
    typography: {
      fontFamily: 'font-mono',
      logoText: 'RAILTIME',
    },
    logo: {
      icon: '▸',
    },
  },
  'upside-down': {
    name: 'upside-down',
    label: '🔴 Upside Down',
    colors: {
      bg: {
        primary: 'bg-black',
        secondary: 'bg-neutral-950',
        tertiary: 'bg-neutral-900',
        card: 'bg-neutral-950/80',
      },
      text: {
        primary: 'text-red-500',
        secondary: 'text-red-400',
        accent: 'text-red-600',
        muted: 'text-red-900',
      },
      ui: {
        border: 'border-red-600/60',
        divider: 'border-red-900/40',
        hover: 'hover:bg-red-950/40',
        active: 'bg-red-950/60',
      },
      status: {
        onTime: 'text-red-500',
        delayed: 'text-orange-500',
        early: 'text-red-400',
      },
      progress: {
        passed: 'rgb(153, 27, 27)',
        current: 'rgb(220, 38, 38)',
        upcoming: 'rgb(38, 38, 38)',
        origin: '#dc2626',
      },
      track: {
        background: 'bg-neutral-900',
        fill: 'bg-gradient-to-r from-red-600 to-red-800 shadow-[0_0_30px_rgba(220,38,38,0.6)]',
        accent: 'rgba(220,38,38,0.7)',
      },
      shadow: 'shadow-[0_0_50px_rgba(220,38,38,0.3)]',
      glow: 'drop-shadow-[0_0_10px_rgba(220,38,38,0.9)]',
    },
    gradients: {
      main: 'from-black via-neutral-950 to-black',
      accent: 'from-red-600 via-red-700 to-red-900',
    },
    typography: {
      fontFamily: 'font-creepster',
      logoText: 'STRANGER TRAINS',
    },
    logo: {
      icon: 'ꓕ',
    },
  },
  aurora: {
    name: 'aurora',
    label: '🌌 Aurora',
    colors: {
      bg: {
        primary: 'bg-slate-950',
        secondary: 'bg-slate-900/80',
        tertiary: 'bg-teal-900/30',
        card: 'bg-slate-900/60',
      },
      text: {
        primary: 'text-emerald-100',
        secondary: 'text-teal-200',
        accent: 'text-cyan-300',
        muted: 'text-teal-600',
      },
      ui: {
        border: 'border-emerald-500/40',
        divider: 'border-teal-900/40',
        hover: 'hover:bg-teal-900/30',
        active: 'bg-emerald-900/40',
      },
      status: {
        onTime: 'text-emerald-400',
        delayed: 'text-rose-400',
        early: 'text-cyan-400',
      },
      progress: {
        passed: 'rgb(16, 185, 129)',
        current: 'rgb(34, 211, 238)',
        upcoming: 'rgb(45, 85, 89)',
        origin: '#10b981',
      },
      track: {
        background: 'bg-teal-950/40',
        fill: 'bg-gradient-to-r from-emerald-500 via-cyan-500 to-teal-500 shadow-[0_0_40px_rgba(16,185,129,0.4)]',
        accent: 'rgba(16,185,129,0.5)',
      },
      shadow: 'shadow-[0_0_40px_rgba(16,185,129,0.1)]',
      glow: 'drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]',
    },
    gradients: {
      main: 'from-slate-950 via-teal-950/30 to-emerald-950/20',
      accent: 'from-emerald-500 via-cyan-500 to-teal-600',
    },
    typography: {
      fontFamily: 'font-mono',
      logoText: 'RAILTIME',
    },
    logo: {
      icon: '▸',
    },
  },
  holiday: {
    name: 'holiday',
    label: '🎄 Holiday',
    colors: {
      bg: {
        primary: 'bg-green-950',
        secondary: 'bg-green-900',
        tertiary: 'bg-red-950/30',
        card: 'bg-green-900/60',
      },
      text: {
        primary: 'text-red-100',
        secondary: 'text-green-100',
        accent: 'text-yellow-400',
        muted: 'text-green-700',
      },
      ui: {
        border: 'border-red-500/40',
        divider: 'border-green-800/40',
        hover: 'hover:bg-red-900/30',
        active: 'bg-red-900/40',
      },
      status: {
        onTime: 'text-green-400',
        delayed: 'text-red-400',
        early: 'text-yellow-400',
      },
      progress: {
        passed: 'rgb(22, 163, 74)',
        current: 'rgb(250, 204, 21)',
        upcoming: 'rgb(127, 29, 29)',
        origin: '#ef4444',
      },
      track: {
        background: 'bg-green-950/40',
        fill: 'bg-gradient-to-r from-red-600 via-yellow-500 to-green-600 shadow-[0_0_40px_rgba(220,38,38,0.4)]',
        accent: 'rgba(250,204,21,0.5)',
      },
      shadow: 'shadow-[0_0_40px_rgba(220,38,38,0.1)]',
      glow: 'drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]',
    },
    gradients: {
      main: 'from-green-950 via-red-950/20 to-green-950',
      accent: 'from-red-600 via-yellow-500 to-green-600',
    },
    typography: {
      fontFamily: 'font-mountains',
      logoText: 'HOLIDAY EXPRESS',
    },
    logo: {
      icon: '🎄',
    },
  },
};
