export type ThemeName = 'swiss' | 'swiss-dark' | 'obsidian' | 'napkin' | 'confetti' | 'minimalist';

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
  swiss: {
    name: 'swiss',
    label: '■ Swiss',
    colors: {
      bg: {
        primary: 'bg-[#FAFAFA]',
        secondary: 'bg-[#F3F4F6]',
        tertiary: 'bg-[#E5E7EB]',
        card: 'bg-white',
      },
      text: {
        primary: 'text-[#111827]',
        secondary: 'text-[#111827]',
        accent: 'text-[#E31837]',
        muted: 'text-[#6B7280]',
      },
      ui: {
        border: 'border-[#E5E7EB]',
        divider: 'border-[#E5E7EB]',
        hover: 'hover:bg-[#F3F4F6]',
        active: 'bg-[#F3F4F6]',
      },
      status: {
        onTime: 'text-[#22C55E]',
        delayed: 'text-[#EF4444]',
        early: 'text-[#E31837]',
      },
      progress: {
        passed: '#E31837',
        current: '#22C55E',
        upcoming: '#F3F4F6',
        origin: '#F59E0B',
      },
      track: {
        background: 'bg-[#F3F4F6]',
        fill: 'bg-[#E31837]',
        accent: 'rgba(227,24,55,0.3)',
      },
      shadow: 'shadow-none',
      glow: 'shadow-none',
    },
    gradients: {
      main: 'from-white to-[#F3F4F6]',
      accent: 'from-[#E31837] to-[#22C55E]',
    },
    typography: {
      fontFamily: 'font-outfit',
      logoText: 'RailTime',
    },
    logo: {
      icon: '■',
    },
  },
  'swiss-dark': {
    name: 'swiss-dark',
    label: '■ Swiss Dark',
    colors: {
      bg: {
        primary: 'bg-[#111827]',
        secondary: 'bg-[#1F2937]',
        tertiary: 'bg-[#374151]',
        card: 'bg-[#1F2937]',
      },
      text: {
        primary: 'text-[#F9FAFB]',
        secondary: 'text-[#E5E7EB]',
        accent: 'text-[#F87171]',
        muted: 'text-[#9CA3AF]',
      },
      ui: {
        border: 'border-[#374151]',
        divider: 'border-[#374151]',
        hover: 'hover:bg-[#374151]',
        active: 'bg-[#374151]',
      },
      status: {
        onTime: 'text-[#34D399]',
        delayed: 'text-[#F87171]',
        early: 'text-[#F87171]',
      },
      progress: {
        passed: '#F87171',
        current: '#34D399',
        upcoming: '#374151',
        origin: '#FBBF24',
      },
      track: {
        background: 'bg-[#374151]',
        fill: 'bg-[#F87171]',
        accent: 'rgba(248,113,113,0.3)',
      },
      shadow: 'shadow-none',
      glow: 'shadow-none',
    },
    gradients: {
      main: 'from-[#111827] to-[#1F2937]',
      accent: 'from-[#F87171] to-[#34D399]',
    },
    typography: {
      fontFamily: 'font-outfit',
      logoText: 'RailTime',
    },
    logo: {
      icon: '■',
    },
  },
  obsidian: {
    name: 'obsidian',
    label: '✦ Obsidian',
    colors: {
      bg: {
        primary: 'bg-[#050506]',
        secondary: 'bg-[#0a0a0c]',
        tertiary: 'bg-[#0f0f12]',
        card: 'bg-gradient-to-b from-white/[0.08] to-white/[0.02]',
      },
      text: {
        primary: 'text-[#EDEDEF]',
        secondary: 'text-[#EDEDEF]/90',
        accent: 'text-[#5E6AD2]',
        muted: 'text-[#8A8F98]',
      },
      ui: {
        border: 'border-white/[0.06]',
        divider: 'border-white/[0.06]',
        hover: 'hover:bg-white/[0.08]',
        active: 'bg-white/[0.10]',
      },
      status: {
        onTime: 'text-emerald-400',
        delayed: 'text-rose-400',
        early: 'text-[#5E6AD2]',
      },
      progress: {
        passed: '#5E6AD2',
        current: '#6872D9',
        upcoming: 'rgba(255,255,255,0.1)',
        origin: '#5E6AD2',
      },
      track: {
        background: 'bg-white/[0.06]',
        fill: 'bg-gradient-to-r from-[#5E6AD2] to-[#6872D9]',
        accent: 'rgba(94,106,210,0.5)',
      },
      shadow: 'shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_2px_20px_rgba(0,0,0,0.4),0_0_40px_rgba(0,0,0,0.2)]',
      glow: 'shadow-[0_0_30px_rgba(94,106,210,0.15)]',
    },
    gradients: {
      main: 'from-[#050506] via-[#0a0a0c] to-[#020203]',
      accent: 'from-[#5E6AD2] to-[#6872D9]',
    },
    typography: {
      fontFamily: 'font-sans',
      logoText: 'RailTime',
    },
    logo: {
      icon: '✦',
    },
  },
  napkin: {
    name: 'napkin',
    label: '✏️ Napkin',
    colors: {
      bg: {
        primary: 'bg-[#fdfbf7]',
        secondary: 'bg-white',
        tertiary: 'bg-[#e5e0d8]',
        card: 'bg-white',
      },
      text: {
        primary: 'text-[#2d2d2d]',
        secondary: 'text-[#2d2d2d]/80',
        accent: 'text-[#ff4d4d]',
        muted: 'text-[#2d2d2d]/50',
      },
      ui: {
        border: 'border-[#2d2d2d]',
        divider: 'border-[#2d2d2d]/30',
        hover: 'hover:bg-[#ff4d4d]',
        active: 'bg-[#ff4d4d]/20',
      },
      status: {
        onTime: 'text-[#2d5da1]',
        delayed: 'text-[#ff4d4d]',
        early: 'text-[#2d5da1]',
      },
      progress: {
        passed: '#2d5da1',
        current: '#ff4d4d',
        upcoming: '#e5e0d8',
        origin: '#ff4d4d',
      },
      track: {
        background: 'bg-[#e5e0d8]',
        fill: 'bg-[#2d2d2d]',
        accent: 'rgba(45,45,45,0.3)',
      },
      shadow: 'shadow-[4px_4px_0px_0px_#2d2d2d]',
      glow: 'shadow-[8px_8px_0px_0px_#2d2d2d]',
    },
    gradients: {
      main: 'from-[#fdfbf7] to-white',
      accent: 'from-[#ff4d4d] to-[#2d5da1]',
    },
    typography: {
      fontFamily: 'font-patrick-hand',
      logoText: 'RailTime',
    },
    logo: {
      icon: '✏️',
    },
  },
  confetti: {
    name: 'confetti',
    label: '🎨 Confetti',
    colors: {
      bg: {
        primary: 'bg-[#FFFDF5]',
        secondary: 'bg-white',
        tertiary: 'bg-[#F1F5F9]',
        card: 'bg-white',
      },
      text: {
        primary: 'text-[#1E293B]',
        secondary: 'text-[#1E293B]/80',
        accent: 'text-[#8B5CF6]',
        muted: 'text-[#64748B]',
      },
      ui: {
        border: 'border-[#1E293B]',
        divider: 'border-[#E2E8F0]',
        hover: 'hover:bg-[#FBBF24]',
        active: 'bg-[#8B5CF6]/20',
      },
      status: {
        onTime: 'text-[#34D399]',
        delayed: 'text-[#F472B6]',
        early: 'text-[#8B5CF6]',
      },
      progress: {
        passed: '#8B5CF6',
        current: '#F472B6',
        upcoming: '#E2E8F0',
        origin: '#FBBF24',
      },
      track: {
        background: 'bg-[#E2E8F0]',
        fill: 'bg-gradient-to-r from-[#8B5CF6] via-[#F472B6] to-[#FBBF24]',
        accent: 'rgba(139,92,246,0.3)',
      },
      shadow: 'shadow-[4px_4px_0px_0px_#1E293B]',
      glow: 'shadow-[6px_6px_0px_0px_#E2E8F0]',
    },
    gradients: {
      main: 'from-[#FFFDF5] to-white',
      accent: 'from-[#8B5CF6] via-[#F472B6] to-[#FBBF24]',
    },
    typography: {
      fontFamily: 'font-outfit',
      logoText: 'RailTime',
    },
    logo: {
      icon: '●',
    },
  },
  minimalist: {
    name: 'minimalist',
    label: '▢ Minimalist',
    colors: {
      bg: {
        primary: 'bg-white',
        secondary: 'bg-[#F2F2F2]',
        tertiary: 'bg-[#E5E5E5]',
        card: 'bg-white',
      },
      text: {
        primary: 'text-black',
        secondary: 'text-black',
        accent: 'text-[#FF3000]',
        muted: 'text-[#666666]',
      },
      ui: {
        border: 'border-black',
        divider: 'border-black',
        hover: 'hover:bg-[#FF3000] hover:text-white',
        active: 'bg-black text-white',
      },
      status: {
        onTime: 'text-black',
        delayed: 'text-[#FF3000]',
        early: 'text-[#FF3000]',
      },
      progress: {
        passed: '#000000',
        current: '#FF3000',
        upcoming: '#F2F2F2',
        origin: '#FF3000',
      },
      track: {
        background: 'bg-[#F2F2F2]',
        fill: 'bg-black',
        accent: 'rgba(255,48,0,0.2)',
      },
      shadow: 'shadow-none',
      glow: 'shadow-none',
    },
    gradients: {
      main: 'from-white to-[#F2F2F2]',
      accent: 'from-black to-[#FF3000]',
    },
    typography: {
      fontFamily: 'font-inter',
      logoText: 'RAILTIME',
    },
    logo: {
      icon: '▢',
    },
  },
};
