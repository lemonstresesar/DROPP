import React, { useId } from 'react';

interface DroppLogoProps {
  compact?: boolean;
}

export const DroppLogo: React.FC<DroppLogoProps> = ({ compact = false }) => {
  const gradId = useId();

  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 select-none">
      <svg
        width="26"
        height="26"
        viewBox="0 0 512 512"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          <linearGradient id={gradId} x1="120" y1="120" x2="404" y2="416" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF7847" />
            <stop offset="58%" stopColor="#FF5A1F" />
            <stop offset="100%" stopColor="#E03E00" />
          </linearGradient>
        </defs>
        <rect width="512" height="512" rx="112" fill="#09090B" />
        <path
          d="M162 152C162 134.327 176.327 120 194 120H278C347.588 120 404 176.412 404 246C404 315.588 347.588 372 278 372H194C176.327 372 162 357.673 162 340V152Z"
          stroke={`url(#${gradId})`}
          strokeWidth="38"
        />
        <path
          d="M232 204H276C299.196 204 318 222.804 318 246C318 269.196 299.196 288 276 288H232V204Z"
          fill="#FFFFFF"
        />
        <circle cx="144" cy="392" r="24" fill={`url(#${gradId})`} />
      </svg>
      {!compact && (
        <span className="text-lg font-extrabold tracking-tight text-[#09090B] dark:text-white">
          DROP
          <span className="text-[#FF5A1F]">P</span>
        </span>
      )}
    </span>
  );
};
