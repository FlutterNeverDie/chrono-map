/** 선 아이콘 (24 그리드, currentColor). 이모지 대신 쓴다 */
type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const GlobeIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </svg>
);

export const SunIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
  </svg>
);

export const MoonIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
  </svg>
);

export const ChevronLeftIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="m15 6-6 6 6 6" />
  </svg>
);

export const ChevronRightIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const ChevronDownIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const ChevronUpIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="m6 15 6-6 6 6" />
  </svg>
);

export const PlusIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const MinusIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M5 12h14" />
  </svg>
);

export const PinIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
    <circle cx="12" cy="10" r="2.2" />
  </svg>
);

export const ExternalIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
);

export const PlayIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M8 5.5v13l10.5-6.5L8 5.5Z" fill="currentColor" />
  </svg>
);

export const PauseIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M8 5v14M16 5v14" strokeWidth={2.5} />
  </svg>
);

export const SlidersIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </svg>
);

export const XIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

/** 접힌 지도(본 지도) */
export const MapIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2Z" />
    <path d="M9 4v14M15 6v14" />
  </svg>
);

/** 엇갈린 두 칼(전쟁 지도) */
export const SwordsIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M4 4l10 10M12.5 16.5l4-4M15 15l4.5 4.5" />
    <path d="M20 4 10 14M7.5 12.5l4 4M9 15l-4.5 4.5" />
  </svg>
);

/** 바이러스(역병 지도): 몸통 + 끝이 둥근 돌기 */
export const VirusIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="4.5" />
    <path d="M12 7.5V5M12 16.5V19M7.5 12H5M16.5 12H19M15.2 8.8l1.6-1.6M8.8 15.2l-1.6 1.6M8.8 8.8 7.2 7.2M15.2 15.2l1.6 1.6" />
    <circle cx="12" cy="3.6" r="1.2" />
    <circle cx="12" cy="20.4" r="1.2" />
    <circle cx="3.6" cy="12" r="1.2" />
    <circle cx="20.4" cy="12" r="1.2" />
    <circle cx="17.8" cy="6.2" r="1.2" />
    <circle cx="6.2" cy="17.8" r="1.2" />
    <circle cx="6.2" cy="6.2" r="1.2" />
    <circle cx="17.8" cy="17.8" r="1.2" />
  </svg>
);

/** 전구(발명 지도) */
export const BulbIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M9 18h6M10 21h4" />
    <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z" />
  </svg>
);

/** 위키백과(둥근 테두리 안의 W) */
