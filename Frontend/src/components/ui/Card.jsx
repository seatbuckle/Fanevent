import * as Chakra from "@chakra-ui/react";
const { Box, Heading, HStack } = Chakra;

export const Card = ({ title, right, children, ...props }) => (
  <Box bg="white" borderWidth="1px" borderRadius="2xl" boxShadow="sm" p={{ base: 4, md: 5 }} {...props}>
    {(title || right) && (
      <HStack justify="space-between" mb={3}>
        {title && <Heading as="h3" size="sm" color="gray.800">{title}</Heading>}
        {right}
      </HStack>
    )}
    {children}
  </Box>
);
