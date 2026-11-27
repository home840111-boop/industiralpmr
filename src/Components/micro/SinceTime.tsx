import dayjs, { Dayjs } from "../Functions/dayjs";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
import { Text, TextProps } from "@chakra-ui/react";
import MyTooltip from "./MyTooltip";
dayjs.extend(duration);
dayjs.extend(relativeTime);

interface SinceTimeProps extends TextProps {
    since: number | string,
    tooltipPrefix?: string,
    textPrefix?: string,
    textSuffix?: string
}
const SinceTime = ({
    since,
    tooltipPrefix = "",
    textPrefix = "since: ",
    textSuffix = "",
    ...props
}: SinceTimeProps): JSX.Element => {
    let mySince: Dayjs;
    if (typeof since === "string") mySince = dayjs(since);
    else mySince = dayjs.unix(since);
    const now = dayjs();
    const element = dayjs.duration(now.diff(mySince)).humanize();

    return <Text
        {...props}>
        {textPrefix}
        <strong>
            <MyTooltip
                label={tooltipPrefix + mySince.format("hh:mm:ss A DD MMM, YYYY")}
                aria-label="A tooltip">
                {element}
            </MyTooltip>
        </strong>
        {textSuffix}
    </Text>
}

export default SinceTime