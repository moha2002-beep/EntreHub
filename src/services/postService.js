/**
 * postService.js
 *
 * All Firestore operations for the Community feature.
 *
 * Data model:
 *   posts/{postId}                   — top-level collection
 *   posts/{postId}/replies/{replyId} — sub-collection
 *
 * We use a top-level posts collection (not a subcollection under users)
 * so that any user can query the full feed with a simple orderBy query,
 * without needing a collectionGroup index.
 *
 * Teaching note — top-level vs sub-collection:
 *   The bookings collection is top-level because BOTH mentors and
 *   entrepreneurs query it.  Posts are also top-level for the same
 *   reason — any user sees the full feed.
 *   Replies are a sub-collection (posts/{postId}/replies) because
 *   they are ONLY ever queried in the context of one specific post.
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

// ── POSTS ────────────────────────────────────────────────────────────────────

/**
 * Subscribes to the full posts feed, ordered newest-first.
 *
 * We fetch ALL posts and let the component handle sort/filter in JS.
 * This avoids needing a separate Firestore composite index for every
 * sort + filter combination, which would be required if we used
 * multiple orderBy() / where() chains.
 *
 * Returns an unsubscribe function — call it in useEffect cleanup.
 */
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

/**
 * Subscribes to a single post document for real-time updates.
 * Used in PostDetail so the upvote count stays live without re-fetching.
 *
 * Returns an unsubscribe function.
 */
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

/**
 * Creates a new post document with all required fields.
 * Returns the auto-generated document ID.
 */
export async function createPost({
  title,
  body,
  category,
  authorId,
  authorName,
  authorRole,
}) {
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
 * Toggles an upvote on a post for the given user.
 *
 * Teaching note — runTransaction:
 *   We need to READ upvotedBy first to decide whether to ADD or REMOVE
 *   the user's UID.  This read-then-write pattern is a classic race
 *   condition: two users clicking simultaneously could both read the
 *   same state and both compute an incorrect result.
 *
 *   runTransaction() wraps the read + write in a single atomic operation.
 *   If another write happens between our read and write, Firestore
 *   automatically retries the transaction — guaranteeing correctness.
 *
 *   Inside the transaction we use arrayUnion/arrayRemove and increment()
 *   (Firestore field transform sentinels) rather than computing values
 *   ourselves.  The transforms are applied atomically on the server,
 *   which is safer than reading a number, adding 1, and writing it back.
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

/**
 * Sets flagged: true on a post document.
 * The post stays visible until a moderator reviews it (Phase 6).
 */
export async function flagPost(postId) {
  await updateDoc(doc(db, "posts", postId), { flagged: true });
}

// ── REPLIES ──────────────────────────────────────────────────────────────────

/**
 * Subscribes to the replies sub-collection for a post,
 * ordered oldest-first so the thread reads top-to-bottom.
 *
 * Teaching note — sub-collection reference:
 *   collection(db, "posts", postId, "replies") is a three-segment path:
 *   collection → document → sub-collection.
 *   Firestore treats it as a distinct namespace scoped to that post.
 *
 * Returns an unsubscribe function.
 */
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

/**
 * Adds a reply to the sub-collection and increments replyCount on the
 * parent post in two separate writes.
 *
 * Teaching note — why NOT a transaction here:
 *   Unlike upvotePost, we don't need to READ before writing.
 *   increment() is applied atomically on the Firestore server, so two
 *   simultaneous replies will both increment correctly without a
 *   transaction.  Two separate writes are simpler and faster (no extra
 *   read round-trip that a transaction requires).
 */
/**
 * @param {string} postId
 * @param {{ body, authorId, authorName, authorRole, parentId }} data
 *   parentId — null for a top-level reply; the replyId of the parent
 *   reply for a nested reply.  This is how the full discussion tree
 *   is encoded in a flat Firestore sub-collection: every reply knows
 *   its parent, and we rebuild the tree in JS when rendering.
 */
export async function createReply(postId, { body, authorId, authorName, authorRole, parentId = null }) {
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

/**
 * Sets flagged: true on a reply document.
 */
export async function flagReply(postId, replyId) {
  await updateDoc(
    doc(db, "posts", postId, "replies", replyId),
    { flagged: true }
  );
}
