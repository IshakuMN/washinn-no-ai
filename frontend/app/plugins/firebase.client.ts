import { initializeApp } from "firebase/app";
import { getDatabase, connectDatabaseEmulator } from "firebase/database";

export default defineNuxtPlugin((nuxtApp) => {
  const config = {
    apiKey: "demo-key",
    authDomain: "demo-washinn.firebaseapp.com",
    databaseURL: "http://127.0.0.1:9000/?ns=demo-washinn",
    projectId: "demo-washinn",
    storageBucket: "demo-washinn.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef",
  };

  const app = initializeApp(config);
  const db = getDatabase(app);

  // In a real app, use runtime config. For this demo, we assume localhost.
  // connectDatabaseEmulator(db, 'localhost', 9000)
  // Note: getDatabase(app) with databaseURL pointing to emulator port often works without connectDatabaseEmulator if configured right,
  // but explicit connection is safer.
  connectDatabaseEmulator(db, "127.0.0.1", 9000);

  return {
    provide: {
      db,
    },
  };
});
