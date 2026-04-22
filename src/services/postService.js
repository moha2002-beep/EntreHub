/**
 * postService.js — Community feed & discussion thread operations.
 */

import {
  collection,
  addDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  runTransaction,
  arrayUnion,
  arrayRemove,
  increment,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { moderateContent, detectThreateningIntent } from "../utils/moderation";
import { recordViolation } from "./userService";

/**
 * Service-layer moderation — catches content that bypasses the frontend.
 */
async function runModerationCheck(text, authorId, context) {
  const check  = moderateContent(text);
  const threat = detectThreateningIntent(text);

  if (!check.safe || threat.threatening) {
    await recordViolation(authorId, `Prohibited content in ${context}`);
    const err = new Error("Your content violates our Safety Guidelines and was not submitted.");
    err.code  = "CONTENT_VIOLATION";
    throw err;
  }
}

// POSTS

export function listenToPosts(onUpdate, onError) {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const posts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onUpdate(posts);
    },
    onError
  );
}

export function listenToPost(postId, onUpdate, onError) {
  return onSnapshot(
    doc(db, "posts", postId),
    (snap) => {
      if (snap.exists()) {
        onUpdate({ id: snap.id, ...snap.data() });
      }
    },
    onError
  );
}

export async function createPost({
  title,
  body,
  category,
  authorId,
  authorName,
  authorRole,
}) {
  await runModerationCheck(`${title} ${body}`, authorId, "post");

  const docRef = await addDoc(collection(db, "posts"), {
    title,
    body,
    category,
    authorId,
    authorName,
    authorRole,
    createdAt: serverTimestamp(),
    upvotes: 0,
    upvotedBy: [],
    flagged: false,
    replyCount: 0,
  });
  return docRef.id;
}

/**
 * Uses a transaction to toggle upvotes atomically.
 */
export async function upvotePost(postId, uid) {
  const ref = doc(db, "posts", postId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const alreadyVoted = (snap.data().upvotedBy || []).includes(uid);

    if (alreadyVoted) {
      tx.update(ref, {
        upvotes: increment(-1),
        upvotedBy: arrayRemove(uid),
      });
    } else {
      tx.update(ref, {
        upvotes: increment(1),
        upvotedBy: arrayUnion(uid),
      });
    }
  });
}

export async function flagPost(postId) {
  await updateDoc(doc(db, "posts", postId), { flagged: true });
}

// REPLIES 

export function listenToReplies(postId, onUpdate, onError) {
  const q = query(
    collection(db, "posts", postId, "replies"),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const replies = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onUpdate(replies);
    },
    onError
  );
}

export async function createReply(postId, { body, authorId, authorName, authorRole, parentId = null }) {
  await runModerationCheck(body, authorId, "reply");

  await addDoc(collection(db, "posts", postId, "replies"), {
    body,
    authorId,
    authorName,
    authorRole,
    parentId,
    isMentorReply: authorRole === "mentor",
    createdAt: serverTimestamp(),
    flagged: false,
  });
  await updateDoc(doc(db, "posts", postId), {
    replyCount: increment(1),
  });
}

export async function flagReply(postId, replyId) {
  await updateDoc(
    doc(db, "posts", postId, "replies", replyId),
    { flagged: true }
  );
}

// REPORT SYSTEM 

/**
 * Records a report. Uses a transaction to prevent duplicate counting.
 */
export async function reportPost(postId, reporterId) {
  const ref = doc(db, "posts", postId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const alreadyReported = (snap.data().reportedBy || []).includes(reporterId);
    if (alreadyReported) return;

    tx.update(ref, {
      reportCount: increment(1),
      reportedBy: arrayUnion(reporterId),
    });
  });
}

export async function reportReply(postId, replyId, reporterId) {
  const ref = doc(db, "posts", postId, "replies", replyId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const alreadyReported = (snap.data().reportedBy || []).includes(reporterId);
    if (alreadyReported) return;

    tx.update(ref, {
      reportCount: increment(1),
      reportedBy: arrayUnion(reporterId),
    });
  });
}
