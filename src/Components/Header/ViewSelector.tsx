import {
    Box,
    Flex,
    Icon,
    useColorMode,
    useRadio,
    useRadioGroup
} from "@chakra-ui/react"
import { useMemo } from "react";
import {
    BsGridFill,
    BsListUl
} from "react-icons/bs";
import { SelectViewProps, OptionProps, ViewCompProps } from "../../routes/Machines/types";

const ViewSelector = ({
    view,
    setView
}: SelectViewProps) => {
    const { colorMode } = useColorMode();
    const { inputBG } = useMemo(() => {
        return {
            inputBG: `${colorMode}.navBG`
        }
    }, [colorMode]);
    const options: OptionProps[] = [{
        value: 'grid',
        label: 'Grid',
        icon: BsGridFill
    }, {
        value: 'list',
        label: 'List',
        icon: BsListUl
    }]
    const { getRadioProps } = useRadioGroup({
        name: 'view',
        defaultValue: view,
        onChange: setView,
    });

    return <Flex
        alignItems="center"
        justifyContent="center"
        borderRadius="3px"
        bgColor={inputBG}
        boxShadow="sm"
    >
        {options.map((option, index) => {
            const radio = getRadioProps({ value: option.value });
            return <View key={option.value} {...radio} icon={option.icon} label={option.label} borderRadius={index === 0 ? '3px 0 0 3px' : index === options.length - 1 ? '0 3px 3px 0' : '0'} />;
        })}
    </Flex>
}

const View = ({
    icon,
    label,
    borderRadius,
    ...props
}: ViewCompProps) => {
    const { colorMode } = useColorMode();
    const { inputBG } = useMemo(() => {
        return {
            inputBG: `${colorMode}.navBG`,
        }
    }, [colorMode]);
    const { getInputProps, getCheckboxProps } = useRadio(props);

    const input = getInputProps();
    const checkbox = getCheckboxProps();

    return <Box as='label'>
        <input {...input} />
        <Box
            borderRadius={borderRadius}
            {...checkbox}
            cursor='pointer'
            _checked={{
                bg: 'primary',
                color: inputBG,
                borderColor: 'primary',
            }}
            _focus={{
                boxShadow: 'none',
            }}
            display='flex'
            alignItems='center'
            justifyContent='center'
            w="35px"
            h="35px">
            <Icon
                _groupChecked={{
                    color: inputBG,
                }}
                as={icon} />
        </Box>
    </Box>
}

export default ViewSelector