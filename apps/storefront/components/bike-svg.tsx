import type { Category } from "@lume/domain";

type Props = {
  variant: Category;
  color: string;
  className?: string;
  title?: string;
};

function Wheel({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#070708" stroke="#3c3c42" strokeWidth="10" />
      <circle cx={cx} cy={cy} r={r * 0.68} fill="none" stroke="#c8c6bf" strokeWidth="2" />
      <circle cx={cx} cy={cy} r={r * 0.14} fill="#ece8e1" />
    </g>
  );
}

export function BikeSvg({ variant, color, className, title = "Moto LUME" }: Props) {
  return (
    <svg viewBox="0 0 880 460" className={className} role="img" aria-label={title}>
      <ellipse cx="430" cy="390" rx="250" ry="16" fill="#000" opacity="0.45" />
      {variant === "mobilete" && <Mobilete color={color} />}
      {variant === "scooter" && <Scooter color={color} />}
      {variant === "naked" && <Naked color={color} />}
      {variant === "adventure" && <Adventure color={color} />}
      {variant === "sport" && <Sport color={color} />}
    </svg>
  );
}

function Mobilete({ color }: { color: string }) {
  return (
    <g>
      <Wheel cx={230} cy={320} r={62} />
      <Wheel cx={640} cy={320} r={62} />
      <path d="M250 310 C330 300 360 250 430 248 L560 250 L620 200" fill="none" stroke={color} strokeWidth="16" strokeLinecap="round" />
      <path d="M360 250 L390 310" fill="none" stroke="#8d8a84" strokeWidth="8" strokeLinecap="round" />
      <rect x="390" y="292" width="90" height="28" rx="6" fill="#1b1b1f" stroke={color} />
      <path d="M430 248 L455 180 L520 168" fill="none" stroke="#d9d6cf" strokeWidth="8" strokeLinecap="round" />
      <circle cx="430" cy="230" r="10" fill="#ff2d2d" />
      <rect x="250" y="250" width="70" height="14" rx="7" fill="#111114" />
    </g>
  );
}

function Scooter({ color }: { color: string }) {
  return (
    <g>
      <Wheel cx={210} cy={318} r={70} />
      <Wheel cx={650} cy={318} r={70} />
      <path d="M250 300 H470" stroke="#9a9791" strokeWidth="10" strokeLinecap="round" />
      <path d="M230 250 C300 210 390 200 470 214 C560 230 600 180 640 168" fill={color} opacity="0.95" />
      <path d="M250 268 C340 240 430 236 500 250 L560 300 L280 308 Z" fill={color} />
      <path d="M470 214 L620 250 L600 300 L500 250 Z" fill="#101013" />
      <rect x="560" y="150" width="18" height="70" rx="6" fill="#d9d6cf" transform="rotate(18 569 185)" />
      <circle cx="300" cy="236" r="9" fill="#ff2d2d" />
      <path d="M180 250 H250" stroke="#ece8e1" strokeWidth="8" strokeLinecap="round" />
    </g>
  );
}

function Naked({ color }: { color: string }) {
  return (
    <g>
      <Wheel cx={200} cy={312} r={78} />
      <Wheel cx={660} cy={312} r={78} />
      <path d="M210 300 L360 250 L520 236 L600 190" fill="none" stroke={color} strokeWidth="14" strokeLinejoin="round" />
      <path d="M360 250 L330 300" stroke="#b7b4ad" strokeWidth="8" />
      <path d="M520 236 L560 300" stroke="#b7b4ad" strokeWidth="8" />
      <rect x="390" y="248" width="110" height="42" rx="8" fill="#141418" stroke={color} />
      <rect x="300" y="228" width="120" height="22" rx="10" fill="#111114" />
      <circle cx="548" cy="188" r="22" fill="#f4f4f2" />
      <circle cx="548" cy="188" r="10" fill="#9fd6ff" />
      <path d="M560 168 H640" stroke="#ece8e1" strokeWidth="8" strokeLinecap="round" />
      <circle cx="430" cy="262" r="7" fill="#ff2d2d" />
    </g>
  );
}

function Adventure({ color }: { color: string }) {
  return (
    <g>
      <Wheel cx={190} cy={318} r={84} />
      <Wheel cx={680} cy={318} r={84} />
      <path d="M150 230 H250 L300 200 H390" fill="none" stroke="#8d8a84" strokeWidth="8" />
      <path d="M230 290 L400 230 L560 214 L640 170" fill="none" stroke={color} strokeWidth="16" strokeLinecap="round" />
      <path d="M400 230 L360 310" stroke="#c8c6bf" strokeWidth="7" />
      <path d="M560 214 L610 300" stroke="#c8c6bf" strokeWidth="7" />
      <path d="M520 150 L640 150 L690 210 L560 214 Z" fill={color} />
      <path d="M640 150 L700 190" stroke="#f4f4f2" strokeWidth="8" />
      <rect x="430" y="236" width="100" height="36" rx="6" fill="#121216" stroke="#ff2d2d" />
      <rect x="250" y="210" width="90" height="16" rx="6" fill="#1a1a1e" />
    </g>
  );
}

function Sport({ color }: { color: string }) {
  return (
    <g>
      <Wheel cx={200} cy={318} r={86} />
      <Wheel cx={680} cy={318} r={86} />
      <path d="M160 250 C230 210 300 200 380 210 L470 200 L620 168 L700 210 L640 250 L470 236 L300 250 Z" fill={color} />
      <path d="M470 200 L250 230 L210 300" fill="none" stroke="#9c998f" strokeWidth="8" />
      <path d="M560 220 L640 300" stroke="#d5d1c8" strokeWidth="8" />
      <path d="M600 180 L690 150" stroke="#f4f4f2" strokeWidth="8" strokeLinecap="round" />
      <path d="M250 214 L340 200" stroke="#111114" strokeWidth="16" strokeLinecap="round" />
      <circle cx="188" cy="236" r="8" fill="#ff2d2d" />
      <path d="M620 190 L655 205" stroke="#9fd6ff" strokeWidth="6" strokeLinecap="round" />
    </g>
  );
}
