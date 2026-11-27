import { useEffect, useState } from "react";

const IsScreenSmall = (pixel: number) => {
  const [isSmall, setIsSmall] = useState<boolean>(
    window.matchMedia(`(max-width: ${pixel}px)`).matches,
  );
  const resizeHandler = (e: any) => {
    setIsSmall(e.matches);
  };
  useEffect(() => {
    window
      .matchMedia(`(max-width: ${pixel}px)`)
      .addEventListener(`change`, resizeHandler);
    return () => {
      window
        .matchMedia(`(max-width: ${pixel}px)`)
        .removeEventListener(`change`, resizeHandler);
    };
  }, [pixel]);

    return isSmall;
};

export default IsScreenSmall;