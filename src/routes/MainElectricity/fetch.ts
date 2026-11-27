import { auth } from "../../Components/firebase";
import { get } from "../../Components/firebase/api/db";
import store from "../../Components/Store";
import { uidAtom } from "../../Components/Store/atoms";

const fetch = async (): Promise<boolean> => {
  const masterUid = store.get(uidAtom);
  const { uid } = auth.currentUser || { uid: masterUid };
  const isSubUser = uid !== masterUid;
  if (isSubUser) return false;
  const hasMeterSnap = await get("simple_meter/updated");
  const hasMeter = hasMeterSnap.exists();
  return hasMeter;
};

export default fetch;
