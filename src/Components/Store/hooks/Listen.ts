import store from "..";
import { useEffect, useState } from "react";

const Listen = (atom: any) => {
  const [value, setValue] = useState<any>(null);

  useEffect(() => {
    const value = store.get(atom);
    setValue(value);
    const unsub = store.sub(atom, () => {
      const value = store.get(atom);
      setValue(value);
    });
    return unsub;
  }, [atom]);

  return value;
};

export default Listen;
