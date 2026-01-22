import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

// Example RTDB function
export const helloWorld = functions.https.onRequest((request, response) => {
  response.send("Hello from Firebase!");
});

// Example RTDB trigger
export const onDataCreated = functions.database
  .ref("/items/{itemId}")
  .onCreate((snapshot, context) => {
    const data = snapshot.val();
    console.log("New item created:", context.params.itemId, data);
    return null;
  });
