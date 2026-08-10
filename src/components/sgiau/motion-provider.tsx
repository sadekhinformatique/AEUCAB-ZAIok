"use client"

import { MotionConfig } from "framer-motion"
import type { ComponentProps } from "react"

export function MotionProvider({ children, ...props }: ComponentProps<typeof MotionConfig>) {
  return <MotionConfig {...props}>{children}</MotionConfig>
}
