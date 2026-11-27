import NumberFormatter from "./NumberFormatter"

interface props {
    number: number,
    pc_weight?: number | null
}
const WeightFormatter = ({
    number,
    pc_weight,
    ...props
}: props): JSX.Element => {
    if (pc_weight) {
        const pcs = +(number / pc_weight).toFixed(0);
        return <>
            <WeightFormatter number={number} />
            {' / '}
            <NumberFormatter number={pcs} suffix='pc(s)' />
        </>
    }

    let suffix;
    if (Math.abs(number) >= 1000) {
        number = +(number / 1000).toFixed(2);
        suffix = 'Kg'
    } else {
        if (number < 0.01 && number > 0) {
            number *= 1000;
            suffix = 'mg'
        } else {
            number = +(number).toFixed(2);
            suffix = 'g'
        }
    }
    return <NumberFormatter number={number} suffix={suffix} {...props} />
}

export default WeightFormatter;