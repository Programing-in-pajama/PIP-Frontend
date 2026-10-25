import React from 'react';

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export function Icon({ name, size = 20, className = '', strokeWidth }) {
  const props = { ...base, width: size, height: size, className, ...(strokeWidth ? { strokeWidth } : {}) };
  switch (name) {
    case 'pin':
      return (
        <svg {...props}>
          <path d="M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10Z" />
          <circle cx="12" cy="11" r="2.2" />
        </svg>
      );
    case 'home':
      return (
        <svg {...props}>
          <path d="M4 10.5 12 4l8 6.5V20h-5v-5H9v5H4Z" />
        </svg>
      );
    case 'user':
      return (
        <svg {...props}>
          <circle cx="12" cy="8.2" r="3.6" />
          <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />
        </svg>
      );
    case 'search':
      return (
        <svg {...props}>
          <circle cx="10.8" cy="10.8" r="6.3" />
          <path d="m15.5 15.5 4 4" />
        </svg>
      );
    case 'close':
      return (
        <svg {...props}>
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      );
    case 'chevron-left':
      return (
        <svg {...props}>
          <path d="m14.5 5-7 7 7 7" />
        </svg>
      );
    case 'chevron-right':
      return (
        <svg {...props}>
          <path d="m9.5 5 7 7-7 7" />
        </svg>
      );
    case 'chevron-down':
      return (
        <svg {...props}>
          <path d="m5 9 7 7 7-7" />
        </svg>
      );
    case 'arrow-right':
      return (
        <svg {...props}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      );
    case 'eye':
      return (
        <svg {...props}>
          <path d="M2.8 12S6.2 6.2 12 6.2 21.2 12 21.2 12 17.8 17.8 12 17.8 2.8 12 2.8 12Z" />
          <circle cx="12" cy="12" r="2.6" />
        </svg>
      );
    case 'eye-off':
      return (
        <svg {...props}>
          <path d="M3.5 3.5 20.5 20.5" />
          <path d="M9.9 5.1A9.7 9.7 0 0 1 12 4.9c5.8 0 9.2 5.8 9.2 5.8a17 17 0 0 1-3 3.7M6.4 6.6A17 17 0 0 0 2.8 10.7s3.4 5.8 9.2 5.8c1.1 0 2.1-.2 3-.5" />
          <path d="M10.3 10.4a2.4 2.4 0 0 0 3.3 3.4" />
        </svg>
      );
    case 'bookmark':
      return (
        <svg {...props}>
          <path d="M6.5 4.5h11a1 1 0 0 1 1 1V20l-6.5-4-6.5 4V5.5a1 1 0 0 1 1-1Z" />
        </svg>
      );
    case 'bookmark-filled':
      return (
        <svg {...props} fill="currentColor">
          <path d="M6.5 4.5h11a1 1 0 0 1 1 1V20l-6.5-4-6.5 4V5.5a1 1 0 0 1 1-1Z" />
        </svg>
      );
    case 'trash':
      return (
        <svg {...props}>
          <path d="M4.5 7h15M9.5 7V4.8h5V7M6.8 7l.8 12.2h8.8L17.2 7M10.2 10.5v5.4M13.8 10.5v5.4" />
        </svg>
      );
    case 'plus':
      return (
        <svg {...props}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case 'check':
      return (
        <svg {...props}>
          <path d="m5 12.5 4.4 4.3L19 6.8" />
        </svg>
      );
    case 'alert':
      return (
        <svg {...props}>
          <path d="M12 4.2 21 20H3Z" />
          <path d="M12 9.5v4.2M12 17.1h.01" />
        </svg>
      );
    case 'pill':
      return (
        <svg {...props}>
          <rect x="3.4" y="9" width="17.2" height="6" rx="3" transform="rotate(-30 12 12)" />
          <path d="m8.9 8.7 6.2 6.6" />
        </svg>
      );
    case 'leaf':
      return (
        <svg {...props}>
          <path d="M19.5 4.5c0 8-4.4 12-10 12a5.5 5.5 0 0 1 0-11c4 0 5.5-1 10-1Z" />
          <path d="M4.5 19.5c1.8-5 5.4-8.3 10-10" />
        </svg>
      );
    case 'lock':
      return (
        <svg {...props}>
          <rect x="5" y="10.3" width="14" height="9.7" rx="2.2" />
          <path d="M8.3 10.3V8a3.7 3.7 0 0 1 7.4 0v2.3" />
        </svg>
      );
    case 'folder':
      return (
        <svg {...props}>
          <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
        </svg>
      );
    case 'edit':
      return (
        <svg {...props}>
          <path d="M14.7 5.2 18.8 9.3M4.8 19.2l1-4.6L16 4.4a1.6 1.6 0 0 1 2.3 0l1.3 1.3a1.6 1.6 0 0 1 0 2.3L9.4 18.2Z" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );
    case 'walk':
      return (
        <svg {...props}>
          <circle cx="13.2" cy="4.6" r="1.8" />
          <path d="m11.4 8-2.6 4.3 2.7 1.9-1.4 5.3M11.5 8l3.3 2.2 2.7-.6M11.5 14.2l3.4 1.3 1.3 3.5" />
        </svg>
      );
    case 'grip':
      return (
        <svg {...props} fill="currentColor" stroke="none">
          <circle cx="9" cy="6" r="1.3" />
          <circle cx="15" cy="6" r="1.3" />
          <circle cx="9" cy="12" r="1.3" />
          <circle cx="15" cy="12" r="1.3" />
          <circle cx="9" cy="18" r="1.3" />
          <circle cx="15" cy="18" r="1.3" />
        </svg>
      );
    case 'refresh':
      return (
        <svg {...props}>
          <path d="M20 11a8 8 0 1 0-2.6 6.4M20 5v6h-6" />
        </svg>
      );
    case 'target':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="7.4" />
          <circle cx="12" cy="12" r="2.4" />
          <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
        </svg>
      );
    case 'crosshair':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8" />
          <line x1="12" y1="2" x2="12" y2="6" />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="2" y1="12" x2="6" y2="12" />
          <line x1="18" y1="12" x2="22" y2="12" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
        </svg>
      );
    case 'volume':
      return (
        <svg {...props}>
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      );
    case 'volume-x':
      return (
        <svg {...props}>
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="22" y1="9" x2="16" y2="15" />
          <line x1="16" y1="9" x2="22" y2="15" />
        </svg>
      );
    case 'utensils':
    case 'restaurant':
      return (
        <svg {...props}>
          <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2" />
          <path d="M15 11v11" />
          <path d="M5 2v20" />
          <path d="M5 2c2.5 0 4 1.5 4 4s-1.5 4-4 4" />
        </svg>
      );
    case 'navigation':
      return (
        <svg {...props}>
          <polygon points="3 11 22 2 13 21 11 13 3 11" />
        </svg>
      );
    default:
      return null;
  }
}

export default Icon;
