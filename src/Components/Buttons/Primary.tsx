import { FC } from 'react';
import { Button, ButtonProps, useColorModeValue } from '@chakra-ui/react';

const Primary: FC<ButtonProps> = ({
    children,
    ...props
}) => {
    return <Button
        bg={"orange.400"}
        color={useColorModeValue('white', 'gray.800')}
        _hover={{
            bgColor: 'orange.500'
        }}
        {...props}>
        {children}
    </Button>
}

export default Primary