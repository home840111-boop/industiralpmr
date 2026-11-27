import { get } from "../../../Components/firebase/api/db";
import { userType } from "./types";
import dayjs from "../../../Components/Functions/dayjs";
import { toIdArray } from "../../../Services/rbac";

const fetch = async (setUsers: Function) => {
  const ref = await get(`sub-users`);
  const users = ref.val() || {};
  const myUsers: userType[] = Object.entries(users).map(([uid, user]: any) => {
    const { department, disabled, email, lastLogin, name, role } = user || {};
    return {
      uid: uid as string,
      email: email as string,
      name: name as string,
      lastLogin: lastLogin
        ? dayjs(lastLogin).format("YYYY-MM-DD HH:mm:ss")
        : "Never",
      role: role as userType["role"],
      department: toIdArray(department),
      disabled: !!disabled,
    };
  });
  setUsers(myUsers);
  return;
};

export default fetch;
