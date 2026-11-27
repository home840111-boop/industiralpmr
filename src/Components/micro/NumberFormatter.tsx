import { Text, TextProps } from '@chakra-ui/react';
import { useMemo } from 'react';

interface props extends TextProps {
    number: number,
    suffix?: string,
    sideSize?: "extra-small" | "small" | "medium" | "large"
}
const NumberFormatter = ({
    number,
    suffix = '',
    sideSize = "small",
    ...rest
}: props): JSX.Element => {
    const safeNumber = typeof number === 'number' && !isNaN(number) ? number : Number(number) || 0;
    const formatted = useMemo(() => {
        const parts = safeNumber.toString().split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts.join(".");
    }, [safeNumber]);
    return <Text {...rest} display={"inline"}>{formatted}<span style={{
        fontSize: sideSize === "extra-small" ? "0.4em" : sideSize === "small" ? '0.6em' : sideSize === "medium" ? '0.8em' : '1em',
        marginLeft: '0.2em'
    }}>{suffix}</span></Text>
}

export default NumberFormatter;