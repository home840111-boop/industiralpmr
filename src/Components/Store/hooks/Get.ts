import store from "..";
import { useEffect, useState } from "react";
import { Atom } from "jotai";

// : <Value>(atom: Atom<Value>) => Value
const Get = <Value>(atom: Atom<Value>): Value => {
  const [value, setValue] = useState<Value>(() => store.get(atom));

  useEffect(() => {
    setValue(store.get(atom));
    const unsub = store.sub(atom, () => {
      setValue(store.get(atom));
    });
    return () => {
      unsub();
    };
  }, [atom]);

  return value;
};

export default Get;
