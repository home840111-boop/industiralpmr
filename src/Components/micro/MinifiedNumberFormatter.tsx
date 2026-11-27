import { useMemo } from 'react'
import MyTooltip from './MyTooltip';

interface props {
    number: number,
    suffix?: string,
    sideSize?: "extra-small" | "small" | "medium" | "large",
    suffixOnlyInTooltip?: boolean
}
const formatter = Intl.NumberFormat('en', { notation: 'compact' });
const MinifiedNumberFormatter = ({
    number,
    suffix = '',
    sideSize = "small",
    suffixOnlyInTooltip = false
}: props): JSX.Element => {
    const safeNumber = typeof number === 'number' && !isNaN(number) ? number : Number(number) || 0;
    const formatted = useMemo(() => {
        const parts = safeNumber.toString().split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts.join(".");
    }, [safeNumber]);
    const minified = useMemo(() => formatter.format(safeNumber), [safeNumber]);

    return <MyTooltip label={`${formatted} ${suffix}`}><span>{minified}{!suffixOnlyInTooltip && <span style={{
        fontSize: sideSize === "extra-small" ? "0.4em" : sideSize === "small" ? '0.6em' : sideSize === "medium" ? '0.8em' : '1em',
        marginLeft: '0.2em'
    }}>{suffix}</span>}</span></MyTooltip>
}

export default MinifiedNumberFormatter;