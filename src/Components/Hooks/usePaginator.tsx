import { useState } from "react";

const usePaginator = <T,>(data: T[], initialSize = 10, step = 5) => {
    const start = 0;
    const [end, setEnd] = useState(initialSize);

    const getCurrentSlice = () => data.slice(start, end);

    const loadNext = () => {
        if (end < data.length) {
            setEnd((prev) => Math.min(prev + step, data.length));
        }
    };

    const loadPrevious = () => {
        if (start > 0) {
            setEnd((prev) => prev - step);
        }
    };

    return { getCurrentSlice, loadNext, loadPrevious };
};

export default usePaginator