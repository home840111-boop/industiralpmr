try {// Scripts for firebase and firebase messaging
  importScripts("https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js");
  importScripts(
    "https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js"
  );

  // Initialize the Firebase app in the service worker
  // "Default" Firebase configuration (prevents errors)
  const defaultConfig = {
    apiKey: "AIzaSyB5aftaKekSPImudIC9qRjge9HWjex3C-8",
    authDomain: "auth.industrialpmr.com",
    databaseURL: "https://industrialpmr-default-rtdb.firebaseio.com",
    projectId: "industrialpmr",
    storageBucket: "industrialpmr.appspot.com",
    messagingSenderId: "817474172678",
    appId: "1:817474172678:web:f54f488cec3af0d3e55087",
    measurementId: "G-YG3DGJLZ9F",
  };

  firebase.initializeApp(defaultConfig);

  // Retrieve firebase messaging
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
      body: payload.notification.body,
      icon: payload.notification.image,
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (error) {
  console.error("Error initializing Firebase Messaging:", error);
}