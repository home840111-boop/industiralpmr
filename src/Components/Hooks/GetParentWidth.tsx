import { useCallback, useState } from "react";

const GetParentWidth = ({
    children
}: {
    children: (props: { height: number | null, width: number | null }) => JSX.Element
}) => {
    const [height, setHeight] = useState(null);
    const [width, setWidth] = useState(null);
    const div = useCallback((node: any) => {
        if (node !== null) {
            setHeight(node.getBoundingClientRect().height);
            setWidth(node.getBoundingClientRect().width);
        }
    }, []);

    return <div ref={div}>
        {children({ height, width })}
    </div>
}

export default GetParentWidth