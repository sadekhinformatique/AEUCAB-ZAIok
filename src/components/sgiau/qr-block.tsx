"use client"

import { useEffect, useState } from "react"
import QRCode from "qrcode"

/**
 * Real, scannable QR code rendered with the `qrcode` library.
 * Used on member cards and receipts for presence checks, votes and verification.
 */
export function QrBlock({ value, size = 96, className }: { value: string; size?: number; className?: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    QRCode.toDataURL(value, { width: size, margin: 1, color: { dark: "#086808", light: "#ffffff" } })
      .then((url) => {
        if (alive) setDataUrl(url)
      })
      .catch(() => {
        if (alive) setDataUrl(null)
      })
    return () => {
      alive = false
    }
  }, [value, size])

  if (!dataUrl) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} role="img" aria-label={`QR ${value}`}>
        <rect width={size} height={size} fill="#ffffff" rx={6} />
      </svg>
    )
  }

  return (
    <img
      src={dataUrl}
      width={size}
      height={size}
      className={className}
      role="img"
      alt={`QR ${value}`}
      style={{ borderRadius: 6, imageRendering: "pixelated" }}
    />
  )
}
