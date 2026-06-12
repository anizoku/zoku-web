// TODO: substituir pelo SVG final dos mascotes quando o design estiver pronto

// Mascote cinza compacto
export function MascotGray({ size = 80, mood = "normal" }) {
  const eyeY = mood === "confused" ? 38 : mood === "excited" ? 36 : 38;
  const mouthPath = mood === "excited"
    ? "M 32 52 Q 40 58 48 52"
    : mood === "confused"
    ? "M 34 54 Q 40 50 46 54"
    : "M 34 53 Q 40 57 46 53";

  return (
    <svg width={size} height={size} viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Antenna */}
      <line x1="40" y1="8" x2="40" y2="20" stroke="#8B8FA8" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="40" cy="6" r="3.5" fill="#6DFF3C" />
      {/* Body */}
      <rect x="16" y="20" width="48" height="56" rx="14" fill="#4A4D5E" />
      {/* Face plate */}
      <rect x="20" y="26" width="40" height="36" rx="10" fill="#3A3D4E" />
      {/* Eyes */}
      <circle cx="31" cy={eyeY} r="5" fill="#6DFF3C" opacity="0.9" />
      <circle cx="49" cy={eyeY} r="5" fill="#6DFF3C" opacity="0.9" />
      <circle cx="32.5" cy={eyeY - 1} r="2" fill="#0F0F0F" />
      <circle cx="50.5" cy={eyeY - 1} r="2" fill="#0F0F0F" />
      {/* Mouth */}
      <path d={mouthPath} stroke="#6DFF3C" strokeWidth="2" strokeLinecap="round" fill="none" />
      {mood === "confused" && (
        <text x="52" y="28" fontSize="12" fill="#6DFF3C" fontWeight="bold">?</text>
      )}
      {/* Feet */}
      <rect x="24" y="74" width="12" height="10" rx="5" fill="#3A3D4E" />
      <rect x="44" y="74" width="12" height="10" rx="5" fill="#3A3D4E" />
    </svg>
  );
}

// Mascote roxo esguio
export function MascotPurple({ size = 80 }) {
  const h = size * 1.2;
  return (
    <svg width={size} height={h} viewBox="0 0 70 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Antenna */}
      <line x1="35" y1="6" x2="35" y2="18" stroke="#9B59B6" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="35" cy="4" r="3.5" fill="#00FF88" />
      {/* Body — taller/slimmer */}
      <rect x="18" y="18" width="34" height="66" rx="12" fill="#6C3483" />
      {/* Face plate */}
      <rect x="21" y="24" width="28" height="34" rx="9" fill="#5B2C6F" />
      {/* Eyes */}
      <circle cx="29" cy="38" r="4.5" fill="#00FF88" opacity="0.95" />
      <circle cx="41" cy="38" r="4.5" fill="#00FF88" opacity="0.95" />
      <circle cx="30" cy="37" r="1.8" fill="#0F0F0F" />
      <circle cx="42" cy="37" r="1.8" fill="#0F0F0F" />
      {/* Smile */}
      <path d="M 27 48 Q 35 54 43 48" stroke="#00FF88" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Speech bubble indicator */}
      {/* Feet */}
      <rect x="20" y="82" width="10" height="12" rx="5" fill="#5B2C6F" />
      <rect x="40" y="82" width="10" height="12" rx="5" fill="#5B2C6F" />
    </svg>
  );
}

// Duo (ambos juntos)
export function MascotDuo({ size = 120 }) {
  return (
    <div className="flex items-end gap-2 justify-center">
      <MascotGray size={size * 0.75} mood="excited" />
      <MascotPurple size={size} />
    </div>
  );
}

// Mini (para toasts)
export function MascotMini({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect x="4" y="8" width="24" height="20" rx="7" fill="#6C3483" />
      <rect x="7" y="11" width="18" height="13" rx="5" fill="#5B2C6F" />
      <circle cx="12" cy="17" r="2.5" fill="#00FF88" />
      <circle cx="20" cy="17" r="2.5" fill="#00FF88" />
      <path d="M 11 23 Q 16 26 21 23" stroke="#00FF88" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}