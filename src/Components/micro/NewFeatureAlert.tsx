

import { Alert, AlertDescription, AlertIcon, AlertProps, AlertTitle } from '@chakra-ui/react'

interface Props extends AlertProps {
    title?: string;
    description?: string;
}

const NewFeatureAlert = ({
    title = "New Feature Alert! 🚀",
    description = "New feature has been deployed.",
    ...props
}: Props) => {
    return <Alert
        mt={5}
        borderRadius={5}
        status='info'
        {...props}>
        <AlertIcon />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>
            {description}
        </AlertDescription>
    </Alert>
}

export default NewFeatureAlert;