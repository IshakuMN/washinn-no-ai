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

/**
 * Automatically manages reverse indexes for Tasks.
 * Triggers on Create, Update, and Delete.
 * Maintains:
 * - tasksByProject/{projectId}/{taskId}
 * - tasksByUser/{assigneeId}/{taskId}
 */
export const onTaskWrite = functions.database
  .ref("/tasks/{taskId}")
  .onWrite(async (change, context) => {
    const taskId = context.params.taskId;
    const before = change.before.exists() ? change.before.val() : null;
    const after = change.after.exists() ? change.after.val() : null;

    const updates: { [key: string]: any } = {};

    // --- 1. Handle Project Index ---
    const oldProjectId = before?.projectId;
    const newProjectId = after?.projectId;

    if (oldProjectId !== newProjectId) {
      // Removed or Changed: Remove from old index
      if (oldProjectId) {
        updates[`tasksByProject/${oldProjectId}/${taskId}`] = null;
      }
      // Created or Changed: Add to new index
      if (newProjectId) {
        updates[`tasksByProject/${newProjectId}/${taskId}`] = true;
      }
    }

    // --- 2. Handle User (Assignee) Index ---
    const oldAssigneeId = before?.assigneeId;
    const newAssigneeId = after?.assigneeId;

    if (oldAssigneeId !== newAssigneeId) {
      if (oldAssigneeId) {
        updates[`tasksByUser/${oldAssigneeId}/${taskId}`] = null;
      }
      if (newAssigneeId) {
        updates[`tasksByUser/${newAssigneeId}/${taskId}`] = true;
      }
    }

    // Apply all updates atomically
    if (Object.keys(updates).length > 0) {
      await admin.database().ref().update(updates);
    }

    return null;
  });
