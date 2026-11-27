import {
    Select,
    SelectProps,
} from "@chakra-ui/react"

interface props extends SelectProps {
    children: JSX.Element | JSX.Element[]
}
const PrimarySelect = ({
    children,
    ...props
}: props) => {

    return <Select
        focusBorderColor={"primary"}
        {...props}>
        {children}
    </Select>
}

export default PrimarySelect;