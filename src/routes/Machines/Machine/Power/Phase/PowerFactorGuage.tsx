import { Gauge } from "@ant-design/plots"
import { useMemo } from "react";

const PowerFactorGuage = ({
    PF
}: {
    PF: number
}) => {
    const factor = useMemo(() => {
        // i have a variable PF in typescipt
        // PF will be from -1 to 1,
        // if PF is 1 or -1 then, factor will be 50
        // if PF is 0 - -1 then factor will be from 0 - 50, depending on PF value
        // if PF is 1 - 0 then factor will be from 50 - 100 depending on PF value
        // EG: if PF is -0.90 then factor will be 45, if PF is 0.90 then factor = 55
        let factor: number;

        if (PF === 1 || PF === -1) {
            factor = 50;
        } else if (PF < 0) {
            factor = Math.abs(PF) * 50;
        } else {
            factor =  50 - (PF * 50) + 50;
        }

        return factor / 100;
    }, [PF]);

    const guageConfig = {
        percent: Math.abs(factor),
        height: 130,
        range: {
            ticks: [0, 0.35, 0.45, 0.55, 0.65, 1],
            color: ['#F4664A', '#FAAD14', '#30BF78', '#FAAD14', '#F4664A'],
            width: 10,
        },
        // startAngle: Math.PI,
        // endAngle: 2 * Math.PI,
        indicator: {
            pointer: {
                style: {
                    stroke: '#D0D0D0',
                    width: 2,
                    fontSize: 0,
                },
            },
            pin: {
                style: {
                    stroke: '#D0D0D0',
                    width: 2,
                },
            },
        },
        statistic: {
            title: {
                style: {
                    fontSize: '20px',
                    fontWeight: 600,
                    color: Math.abs(PF) > 0.9 ? '#30BF78' : Math.abs(PF) > 0.75 ? '#FAAD14' : '#F4664A',
                },
                formatter: () => `${PF.toFixed(2)}`,
            },
            content: {
                offsetY: 5,
                style: {
                    fontSize: '15px',
                    lineHeight: '44px',
                    color: '#4B535E',
                },
                formatter: () => 'Power Factor',
            },
        },
    };

    return <Gauge
    axis={{
        label: {
            formatter: (v) => {

                const PF = parseFloat(v);
                let factor = 0;
                if (PF === 0 || PF === 1) {
                    factor = 0;
                } else if (PF <= 0.5) {
                    factor = PF * 2;
                } else {
                    factor = Math.abs(PF - 1) * 2;
                }
                return factor.toFixed(2);
            }
        }
    }}
    // indicator={{
    //     pointer: {
    //         style: {
    //             fontSize
    //         }
    //     }
    // }}
    {...guageConfig} />
}

export default PowerFactorGuage