import NumberFormatter from './NumberFormatter';

interface props {
    number: number
}
const UnitFormatter = ({
    number,
    ...props
}: props): JSX.Element => {
    number = +(number).toFixed(3);
    return <NumberFormatter number={number} suffix="kWh" {...props} />
}

export default UnitFormatter;