/**
 * resourceService.js — Firestore CRUD for the resources collection.
 */

import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  runTransaction,
  doc,
} from "firebase/firestore";
import { db } from "./firebase";
import { moderateContent, detectThreateningIntent } from "../utils/moderation";
import { recordViolation } from "./userService";

const RESOURCES_REF = () => collection(db, "resources");

export function listenToResources(onData, onError) {
  const q = query(RESOURCES_REF(), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const resources = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData(resources);
    },
    onError
  );
}

/**
 * Runs moderation checks before writing to Firestore.
 */
export async function createResource(data) {
  const textToCheck = `${data.title} ${data.description}`;
  const check  = moderateContent(textToCheck);
  const threat = detectThreateningIntent(textToCheck);

  if (!check.safe || threat.threatening) {
    await recordViolation(data.authorId, "Prohibited content in resource");
    const err = new Error("Your content violates our Safety Guidelines and was not submitted.");
    err.code  = "CONTENT_VIOLATION";
    throw err;
  }

  const docRef = await addDoc(RESOURCES_REF(), {
    title:       data.title.trim(),
    url:         data.url.trim(),
    description: data.description.trim(),
    category:    data.category,
    authorId:    data.authorId,
    authorName:  data.authorName,
    authorRole:  data.authorRole,
    createdAt:   serverTimestamp(),
    upvotes:     0,
    upvotedBy:   [],
  });
  return docRef.id;
}

/**
 * Uses a transaction to prevent concurrent upvote race conditions.
 */
export async function upvoteResource(resourceId, uid) {
  const ref = doc(db, "resources", resourceId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Resource not found");

    const upvotedBy = snap.data().upvotedBy || [];
    const hasVoted  = upvotedBy.includes(uid);

    tx.update(ref, {
      upvotes:   (snap.data().upvotes || 0) + (hasVoted ? -1 : 1),
      upvotedBy: hasVoted
        ? upvotedBy.filter((id) => id !== uid)
        : [...upvotedBy, uid],
    });
  });
}
