import { db } from "../index";
import {
  ref as FBRef,
  child,
  get as FBGet,
  DatabaseReference,
  onValue,
  runTransaction,
  DataSnapshot,
  set as FBSet,
  update as FBUpdate,
  TransactionResult,
  remove as FBRemove,
  query as FBQuery,
  QueryConstraint,
  push as FBPush,
  Unsubscribe,
} from "firebase/database";
import store from "../../Store";
import { isImpersonationReadOnlyAtom, isMasterAdminAtom, uidAtom } from "../../Store/atoms";

const isSafeModeBlocked = (path?: string): boolean => {
  const isMaster = store.get(isMasterAdminAtom);
  const isReadOnly = store.get(isImpersonationReadOnlyAtom);
  if (isMaster && isReadOnly) {
    console.warn(`[Safe Mode] Write to '${path || "db"}' blocked.`);
    return true;
  }
  return false;
};

const get = (path: string): Promise<DataSnapshot> => {
  return new Promise((resolve, reject) => {
    const uid = store.get(uidAtom);
    if (!uid) reject("No user logged in");
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;
    const fullPath = `/users/${uid}/` + cleanPath;
    const dbRef: DatabaseReference = FBRef(db);
    const ref: DatabaseReference = child(dbRef, fullPath);
    FBGet(ref)
      .then((snapshot) => {
        // send recieved snapshot to resolve
        resolve(snapshot);
      })
      .catch((error) => {
        // raise exception
        reject(error);
      });
  });
};

const remove = (path: string): Promise<DataSnapshot | any> => {
  return new Promise((resolve, reject) => {
    if (isSafeModeBlocked(path)) {
      return reject(new Error("Action blocked: Safe Mode is active during impersonation."));
    }
    const uid = store.get(uidAtom);
    if (!uid) reject("No user logged in");
    path = `/users/${uid}/` + path;
    const dbRef: DatabaseReference = FBRef(db);
    const ref: DatabaseReference = child(dbRef, path);
    FBRemove(ref).then(resolve).catch(reject);
  });
};

const rawGet = (path: string): Promise<DataSnapshot> => {
  return new Promise((resolve, reject) => {
    const dbRef: DatabaseReference = FBRef(db);
    const ref: DatabaseReference = child(dbRef, path);
    FBGet(ref)
      .then((snapshot) => {
        // send recieved snapshot to resolve
        resolve(snapshot);
      })
      .catch((error) => {
        // raise exception
        reject(error);
      });
  });
};

const push = (path: string, payload: unknown): Promise<DatabaseReference> => {
  return new Promise((resolve, reject) => {
    if (isSafeModeBlocked(path)) {
      return reject(new Error("Action blocked: Safe Mode is active during impersonation."));
    }
    const uid = store.get(uidAtom);
    if (!uid) reject("No user logged in");
    path = `/users/${uid}/` + path;
    const dbRef: DatabaseReference = FBRef(db);
    const ref: DatabaseReference = child(dbRef, path);
    FBPush(ref, payload).then(resolve).catch(reject);
  });
};

const set = (path: string, data: any): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (path.replace(/^\/+/, "").startsWith("users/") && isSafeModeBlocked(path)) {
      return reject(new Error("Action blocked: Safe Mode is active during impersonation."));
    }
    const dbRef: DatabaseReference = FBRef(db);
    const ref: DatabaseReference = child(dbRef, path);
    FBSet(ref, data).then(resolve).catch(reject);
  });
};

const update = (path: string, data: any): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (isSafeModeBlocked(path)) {
      return reject(new Error("Action blocked: Safe Mode is active during impersonation."));
    }
    const uid = store.get(uidAtom);
    if (!uid) reject("No user logged in");
    path = `/users/${uid}/` + path;
    const dbRef: DatabaseReference = FBRef(db);
    const ref: DatabaseReference = child(dbRef, path);
    FBUpdate(ref, data).then(resolve).catch(reject);
  });
};

const query = (
  path: string,
  ...queries: QueryConstraint[]
): Promise<DataSnapshot> => {
  return new Promise((resolve, reject) => {
    const uid = store.get(uidAtom);
    if (!uid) reject("No user logged in");
    path = `/users/${uid}/` + path;
    FBGet(FBQuery(FBRef(db, path), ...queries))
      .then(resolve)
      .catch(reject);
  });
};

const rawQuery = (
  path: string,
  ...queries: QueryConstraint[]
): Promise<DataSnapshot> => {
  return new Promise((resolve, reject) => {
    const uid = store.get(uidAtom);
    if (!uid) reject("No user logged in");
    FBGet(FBQuery(FBRef(db, path), ...queries))
      .then(resolve)
      .catch(reject);
  });
};

const listen = (
  path: string,
  callback: (snapshot: DataSnapshot) => unknown,
): Unsubscribe => {
  const dbRef: DatabaseReference = FBRef(db);
  const ref: DatabaseReference = child(dbRef, path);
  return onValue(ref, callback);
};

const transaction = (
  path: string,
  transactionUpdate: (currentData: any) => unknown,
): Promise<TransactionResult> => {
  return new Promise((resolve, reject) => {
    if (isSafeModeBlocked(path)) {
      return reject(new Error("Action blocked: Safe Mode is active during impersonation."));
    }
    const uid = store.get(uidAtom);
    if (!uid) reject("No user logged in");
    path = `/users/${uid}/` + path;
    runTransaction(FBRef(db, path), transactionUpdate)
      .then(resolve)
      .catch(reject);
  });
};

export {
  get,
  rawGet,
  set,
  update,
  remove,
  query,
  push,
  listen,
  rawQuery,
  transaction,
};
