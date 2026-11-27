import NumberFormatter from "./NumberFormatter"

interface props {
    number: number,
}
const LengthFormatter = ({
    number,
    ...props
}: props): JSX.Element => {

    let suffix;
    if (number < 1) {
        number *= 1000;
        suffix = 'mm'
    } else {
        number = +(number).toFixed(2);
        suffix = 'm'
    }
    return <NumberFormatter number={number} suffix={suffix} {...props} />
}

export default LengthFormatter;