import { z } from "zod";

const forgotPassSchema = z.object({
  email: z
    .string()
    .email()
    .refine((email) => {
      const domain = email.split("@")[1];
      return domain !== "industrialpmr.com";
    }, "You cannot reset your password with this email address, contact support."),
});

const handler = (
  email: string | FormDataEntryValue,
  setError: Function,
  setSending: Function,
  toast: Function,
  onClose: Function
): void => {
  const formData = {
    email,
  };

  const results = forgotPassSchema.safeParse(formData);

  if (!results.success) {
    const errors = results.error.format();
    setError(errors.email?._errors.join(", ") || null);
  } else {
    setError(null);
    setSending(true);
    import("../../../Components/firebase/api/auth")
      .then(async (resp) => {
        await resp.forgotPassword(formData.email as string);
        setSending(false);
        toast({
          title: "Success!",
          description: `Check your email for a link to reset your password.`,
          status: "success",
          duration: 6000,
          position: "bottom",
        });
        onClose();
      })
      .catch((err) => {
        setSending(false);
        toast({
          title: "Error",
          description: err.message,
          status: "error",
          duration: 6000,
          position: "bottom",
        });
      });
  }
};

export default handler;
