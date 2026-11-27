import {
    NumberDecrementStepper,
    NumberIncrementStepper,
    NumberInput,
    NumberInputField,
    NumberInputProps,
    NumberInputStepper,
} from "@chakra-ui/react"

interface props extends NumberInputProps {
    placeholder: string
}
const PrimaryNumberInput = ({
    ...props
}: props) => {

    return <NumberInput focusBorderColor={"primary"} {...props}>
        <NumberInputField />
        <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
        </NumberInputStepper>
    </NumberInput>
}

export default PrimaryNumberInput;