import {
    Select,
    Props,
} from "chakra-react-select";
import type { OptionsOrGroups, GroupBase } from "chakra-react-select/dist/types";

interface Option {
    label: string,
    value: string,
}
type SearchableSelectorOptions = OptionsOrGroups<Option, GroupBase<Option>>;
interface SelectProps extends Omit<Props, "noOptionsMessage" | "options" | "onChange"> {
    onChange?: (value: any) => void,
    options?: SearchableSelectorOptions,
    noOptionsMessage?: string,
}
const SearchableSelector = ({
    onChange,
    options,
    noOptionsMessage,
    ...props
}: SelectProps) => {
    const myNoOptionsMessage = noOptionsMessage ? () => noOptionsMessage : undefined

    return <Select
        {...props}
        noOptionsMessage={myNoOptionsMessage}
        options={options}
        onChange={onChange}
        selectedOptionColorScheme={"orange"}
        focusBorderColor={"primary"} />
}

export type { SearchableSelectorOptions };
export default SearchableSelector;