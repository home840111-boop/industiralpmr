import {
  Button,
  FormControl,
  FormLabel,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  ModalHeader,
  Text,
  useToast,
} from "@chakra-ui/react";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { FormEvent, useEffect, useState } from "react";
import Primary from "../Buttons/Primary";
import { auth } from "../firebase";
import { PrimaryInput } from "../Inputs";
import BackdropLoader from "../Loaders/BackdropLoader";
import MyModal from "../micro/MyModal";

const PasswordReauthModal = ({
  isOpen,
  onClose,
  callback,
  title = "Confirm Your Password",
  description = "For security, enter your account password to create this user.",
}: {
  isOpen: boolean;
  onClose: () => void;
  callback: () => void;
  title?: string;
  description?: string;
}) => {
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) setPassword("");
  }, [isOpen]);

  const handleConfirm = async (e: FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || !user.email) {
      toast({
        title: "Error",
        description: "No authenticated user email found.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    if (!password) {
      toast({
        title: "Password required",
        description: "Please enter your current password.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setLoading("Verifying password");
    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      setPassword("");
      setLoading(null);
      onClose();
      callback();
    } catch (err: any) {
      console.error("Password re-authentication failed:", err);
      setLoading(null);
      toast({
        title: "Authentication Failed",
        description:
          err?.code === "auth/wrong-password" || err?.code === "auth/invalid-credential"
            ? "Incorrect password. Please try again."
            : err?.message || "Could not verify password.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {loading && <BackdropLoader text={loading} />}
      <MyModal
        isOpen={isOpen}
        onClose={onClose}
        closeOnEsc={false}
        closeOnOverlayClick={false}
        isCentered
      >
        <form onSubmit={handleConfirm} autoComplete="off">
          <ModalHeader>{title}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Text fontSize="sm" opacity={0.8} mb={4}>
              {description}
            </Text>
            <FormControl isRequired>
              <FormLabel>Current Password</FormLabel>
              <PrimaryInput
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Primary type="submit" mr={3}>
              Verify & Continue
            </Primary>
            <Button onClick={onClose}>Cancel</Button>
          </ModalFooter>
        </form>
      </MyModal>
    </>
  );
};

export default PasswordReauthModal;
