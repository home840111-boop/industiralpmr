import { initializeApp } from "firebase/app";
import { getDatabase, Database } from "firebase/database";
import { firebaseConfig } from "./config";
import { getAuth } from "firebase/auth";
import { getMessaging } from "firebase/messaging";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// initialize firebase
const app = initializeApp(firebaseConfig);

// firebase analytics
const analytics = getAnalytics(app);
analytics.app.automaticDataCollectionEnabled = true;

// firebase components
const db: Database = getDatabase(app);
const auth = getAuth(app);
const messaging = getMessaging(app);
const storage = getStorage(app);

// export firebase components
export { db, auth, messaging, storage, analytics };
