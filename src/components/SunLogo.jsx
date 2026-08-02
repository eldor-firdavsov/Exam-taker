import React from 'react'

export default function SunLogo({ className = "h-7 w-7", style = {} }) {
  // 8 evenly spaced rays at 45 degree intervals around (50,50)
  // Rays placed dynamically via exact 8-fold radial symmetry around central sun disk
  const angles = [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5]

  return (
    <svg
      viewBox="0 0 100 100"
      fill="currentColor"
      className={className}
      style={{ color: '#FABB00', ...style }}
      aria-hidden="true"
    >
      {/* Central Sun Circle */}
      <circle cx="50" cy="50" r="18" />

      {/* 8 Clean Rectangular Sun Rays around the center */}
      {angles.map((angle) => (
        <rect
          key={angle}
          x="44"
          y="6"
          width="12"
          height="22"
          rx="1"
          transform={`rotate(${angle} 50 50)`}
        />
      ))}
    </svg>
  )
}
