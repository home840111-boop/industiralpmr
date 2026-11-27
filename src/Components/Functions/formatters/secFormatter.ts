export default function secFormatter(sec:number) {
    sec = isNaN(sec) || sec < 0 ? 0 : sec;
    if (sec < 60) {
        return `${Math.round(sec)}s`
    } else if (sec < (60 * 60)) {
        if (sec % 60 === 0) {
            return `${Math.round(sec / 60)}m`
        } else {
            return `${Math.round((sec - (sec % 60)) / 60)}m ${Math.round(sec % 60)}s`
        }
    } else {
        if (sec % (60 * 60) === 0) {
            return `${Math.round(sec / (60 * 60))}h`
        } else if ((sec % (60 * 60)) % 60 === 0) {
            return `${Math.round((sec - (sec % (60 * 60))) / 3600)}h ${Math.round(((sec % (60 * 60)) - (sec % 60)) / 60)}m`
        } else {
            if (((sec % (60 * 60)) - (sec % 60)) / 60 === 0) {
                return `${Math.round((sec - (sec % (60 * 60))) / 3600)}h ${Math.round(sec % 60)}s`
            } else {
                return `${Math.round((sec - (sec % (60 * 60))) / 3600)}h ${Math.round(((sec % (60 * 60)) - (sec % 60)) / 60)}m ${Math.round(sec % 60)}s`
            }
        }
    }
}