import React from 'react';

export const StandHunterLogo = ({
  size = 32,
  animated = true,
  className = '',
}) => {
  return (
    <div 
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      id="standhunter-logo-radar"
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer dashed cyan circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="#00F0FF"
          strokeWidth="2"
          strokeDasharray="4 4"
          opacity="0.8"
        />

        {/* Outer corner targeting brackets */}
        <path
          d="M 22 36 L 22 22 L 36 22"
          stroke="#00F0FF"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 78 36 L 78 22 L 64 22"
          stroke="#00F0FF"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 22 64 L 22 78 L 36 78"
          stroke="#00F0FF"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 78 64 L 78 78 L 64 78"
          stroke="#00F0FF"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Middle gradient ring */}
        <circle
          cx="50"
          cy="50"
          r="30"
          stroke="url(#radarGradient)"
          strokeWidth="2.5"
        />

        {/* Crosshair lines */}
        <line x1="14" y1="50" x2="28" y2="50" stroke="#00F0FF" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="72" y1="50" x2="86" y2="50" stroke="#00F0FF" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="50" y1="14" x2="50" y2="28" stroke="#00F0FF" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="50" y1="72" x2="50" y2="86" stroke="#00F0FF" strokeWidth="2.5" strokeLinecap="round" />

        {/* Inner dashed magenta ring */}
        <circle
          cx="50"
          cy="50"
          r="18"
          stroke="#FF007F"
          strokeWidth="2.5"
          strokeDasharray="3 3"
        />

        {/* Rotating radar sweep wedge */}
        {animated && (
          <g className="origin-center animate-[spin_4s_linear_infinite]">
            <path
              d="M 50 50 L 50 20 A 30 30 0 0 1 78 40 Z"
              fill="url(#sweepGradient)"
              opacity="0.4"
            />
          </g>
        )}

        {/* Center glowing bullseye */}
        <circle cx="50" cy="50" r="4.5" fill="#00F0FF" />
        <circle cx="50" cy="50" r="2" fill="#FFFFFF" />

        <defs>
          <linearGradient id="radarGradient" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00F0FF" />
            <stop offset="0.5" stopColor="#7B2CBF" />
            <stop offset="1" stopColor="#00F0FF" />
          </linearGradient>
          <radialGradient id="sweepGradient" cx="50" cy="50" r="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#00F0FF" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
};
