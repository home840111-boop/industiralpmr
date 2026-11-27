import { FC } from 'react';
import { Button, ButtonProps } from '@chakra-ui/react';

interface Props extends ButtonProps {
    children: string | JSX.Element,
    ref?: any
}
const Secondary: FC<Props> = ({
    children,
    ...props
}) => {

    return <Button
        variant="outline"
        border="2px solid"
        borderColor={"orange.400"}
        color={"orange.400"}
        _hover={{
            bg: '#ed89361c',
        }}
        {...props}>
        {children}
    </Button>
}

export default Secondary;