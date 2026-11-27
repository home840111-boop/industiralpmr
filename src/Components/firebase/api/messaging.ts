import { getToken as getTokenFB } from "firebase/messaging";
import { messaging } from "..";

const getToken = async () => {
  try {
    const token = await getTokenFB(messaging);
    return token;
  } catch (err) {
    console.error(err);
    return null;
  }
};

const sendNotification = async (token: string, title: string, body: string) => {
  const resp = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `key=${process.env.REACT_APP_VAPID_KEY}`,
    },
    body: JSON.stringify({
      to: token,
      notification: {
        title,
        body,
      },
    }),
  });
  return resp;
};

export { getToken, sendNotification };
