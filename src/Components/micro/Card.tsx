import { Card, CardProps, useColorMode } from '@chakra-ui/react'
import { useMemo } from 'react'

interface props extends CardProps {
    children: React.ReactNode,
    noPadding?: boolean
}
const MyCard = ({
    children,
    noPadding = false,
    ...props
}: props) => {
    const { colorMode } = useColorMode();
    const { bgColor, textColor } = useMemo(() => {
        return {
            bgColor: `${colorMode}.navBG`,
            textColor: `${colorMode}.navText`
        }
    }, [colorMode])
    return <Card
        py={noPadding ? undefined : 6}
        px={noPadding ? undefined : 2}
        borderRadius={"5px"}
        bgColor={bgColor}
        color={textColor}
        {...props}>
        {children}
    </Card>
}

export default MyCard