
import { Box } from '@chakra-ui/react'

const BlurCircle = ({ top = "auto", left = "auto", right = "auto", bottom = "auto" }) => {
  return (
    <Box
      position="absolute"
      zIndex={-1}
      height="232px"
      width="232px"
      borderRadius="full"
      bg="rgba(59, 130, 246, 0.2)"
      filter="blur(60px)"
      style={{ top, left, right, bottom }}
    />
  )
}