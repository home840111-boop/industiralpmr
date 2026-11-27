

import { Alert, AlertDescription, AlertIcon, AlertProps, AlertTitle } from '@chakra-ui/react'

interface Props extends AlertProps {
    title?: string;
    description?: string;
}

const NotFoundAlert = ({
    title = "Not found!",
    description = "Unable to find relevant data.",
    ...props
}: Props) => {
    return <Alert
        mt={5}
        borderRadius={5}
        {...props}
        status='error'>
        <AlertIcon />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>
            {description}
        </AlertDescription>
    </Alert>
}

export default NotFoundAlert