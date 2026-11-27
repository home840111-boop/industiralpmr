import { Box, Progress, Text } from '@chakra-ui/react';
import { useMemo } from 'react';

interface PowerTriangleProps {
  apparentPower: number;
  activePower: number;
  reactivePower: number;
}

const PowerProgress = ({ apparentPower, activePower, reactivePower }: PowerTriangleProps) => {
  const percent = useMemo(() => {
    const total = Math.max(apparentPower, 0);
    const active = Math.max(activePower, 0);

    const percent = active / total * 100;

    return percent;
  }, [apparentPower, activePower]);

  return <Box pt={10} width="80%">
    <Progress colorScheme={"orange"} width="100%" borderRightRadius={'md'} value={percent} size="lg" />
    <Text fontWeight={500} fontSize="sm" opacity={0.8}>
      Active/Reactive Power
    </Text>
  </Box>
};

export default PowerProgress;