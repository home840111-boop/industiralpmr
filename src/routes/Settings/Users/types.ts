import { UserRole } from "../../../Components/Store/atoms";

interface userType {
  uid: string;
  email: string;
  name: string;
  lastLogin: string;
  role: UserRole;
  department: string[];
  disabled: boolean;
}

interface ErrorsType {
  name: string | null;
  email: string | null;
  department: string | null;
  role: string | null;
  password: string | null;
  confirmPassword: string | null;
}

export type { userType, ErrorsType };
