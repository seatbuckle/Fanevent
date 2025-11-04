import { Box } from '@chakra-ui/react'
import { useState, useEffect } from 'react'

const BRAND_PALETTE = [
  'rgba(236, 72, 153, 0.28)',  // pink
  'rgba(99, 102, 241, 0.28)',  // indigo
  'rgba(56, 189, 248, 0.28)',  // sky
  'rgba(168, 85, 247, 0.28)',  // purple
  'rgba(34, 197, 94, 0.28)',   // green
]

const BlurCircle = ({
  top = 'auto',
  left = 'auto',
  right = 'auto',
  bottom = 'auto',
  intervalMs = 3000, // every 3 seconds
  size = 232,
  blur = 60,
}) => {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setIdx(prev => (prev + 1) % BRAND_PALETTE.length)
    }, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return (
    <Box
      position="absolute"
      pointerEvents="none"
      zIndex={0}
      height={`${size}px`}
      width={`${size}px`}
      borderRadius="full"
      bg={BRAND_PALETTE[idx]}
      filter={`blur(${blur}px)`}
      // ⬇️ smoother, slower fade transition
      transition="background-color 2.8s cubic-bezier(0.4, 0, 0.2, 1)"
      style={{ top, left, right, bottom }}
    />
  )
}

export default BlurCircle
