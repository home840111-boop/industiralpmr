import {
  getDownloadURL as getDownloadURLFB,
  ref,
  StorageReference,
  uploadBytes,
} from "firebase/storage";
import { storage } from "..";
import store from "../../Store";
import { uidAtom } from "../../Store/atoms";

const uploadBlob = async (name: string, blob: Blob) => {
  const uid = store.get(uidAtom);
  if (!uid) throw new Error("No user logged in");
  const storageRef = ref(
    storage,
    `in-app-browser-temp-downloads/${uid}/${name}`,
  );
  return await uploadBytes(storageRef, blob);
};

const getDownloadURL = async (ref: StorageReference) => {
  return await getDownloadURLFB(ref);
};

export { uploadBlob, getDownloadURL };
