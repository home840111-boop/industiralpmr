import { logEvent } from "firebase/analytics";
import { FormEvent } from "react";
import { z } from "zod";
import { analytics } from "../../Components/firebase";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  remember_me: z.boolean(),
});

interface formSchema {
  email: null | FormDataEntryValue;
  password: null | FormDataEntryValue;
  remember_me: boolean;
}

const handler = async (
  e: FormEvent,
  setErrors: Function,
  setLoggingIn: Function,
  toast: Function,
) => {
  const { target } = e;
  const form = new FormData(target as HTMLFormElement);
  if (!form) return;
  const formData: formSchema = {
    email: form.get("email"),
    password: form.get("password"),
    remember_me: form.get("remember_me") !== null,
  };

  const results = loginSchema.safeParse(formData);

  if (!results.success) {
    const errors = results.error.format();
    setErrors({
      email: errors.email?._errors.join(", ") || null,
      password: errors.password?._errors.join(", ") || null,
      remember_me: errors.remember_me?._errors.join(", ") || null,
    });
  } else {
    setErrors({
      email: null,
      password: null,
      remember_me: null,
    });
    setLoggingIn(true);
    try {
      localStorage.removeItem("8812");
      const resp = await import("../../Components/firebase/api/auth");
      const user = await resp.login(
        formData.email as string,
        formData.password as string,
        formData.remember_me,
      );
      setLoggingIn(false);
      logEvent(analytics, "login", {
        user: user.user?.displayName,
      });
      toast({
        title: "Success!",
        description: `You are now logged in!`,
        status: "success",
        duration: 3000,
        position: "bottom",
      });
    } catch (err: any) {
      setLoggingIn(false);
      let { message } = err;
      message = message.replace("Firebase: ", "");
      toast({
        title: "Error!",
        description: message,
        status: "error",
        duration: 3000,
        position: "bottom",
      });
    }
  }
};

export default handler;
