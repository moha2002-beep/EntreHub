/**
 * ReplyThread.jsx
 *
 * Real-time, fully-nested discussion thread for a single post.
 *
 * Architecture — flat storage, tree rendering:
 *   Firestore stores all replies in a flat sub-collection.
 *   Each reply has a `parentId` field:
 *     null      → direct reply to the post (root level)
 *     <replyId> → reply to another reply (nested)
 *
 *   On every snapshot we call buildTree() to convert the flat array
 *   into a nested tree, then render it recursively with ReplyItem.
 *   This keeps Firestore queries simple (one orderBy query, no indexes)
 *   while supporting unlimited nesting depth.
 *
 * Teaching concepts:
 *
 *   1. Tree construction from a flat list
 *      buildTree() runs in O(n) — one pass to index by id, one pass
 *      to attach each node to its parent's .children array.
 *
 *   2. Recursive React components
 *      ReplyItem renders itself for each child reply.  React creates a
 *      separate component instance (and separate state) for each node,
 *      so each reply's "show reply form" toggle is independent.
 *
 *   3. Depth cap
 *      Visual indentation stops at MAX_INDENT_DEPTH (4) to prevent
 *      replies becoming too narrow on small screens, but the data
 *      structure supports unlimited nesting.
 *
 *   4. Prop drilling vs context
 *      reportedIds and onReport are passed as props through the tree.
 *      This is intentional — the state lives in ReplyThread (the
 *      single source of truth) and flows downward explicitly, which
 *      is easier to follow than a context for a contained feature.
 */

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { listenToReplies, createReply, flagReply } from "../services/postService";
import { formatRelativeTime } from "../utils/formatTime";
import "../styles/Community.css";

const ROLE_LABELS = {
  mentor: "Mentor",
  entrepreneur: "Entrepreneur",
  investor: "Investor",
};

// Visual indentation stops compounding after this depth.
// Data can still nest deeper — it just won't indent further.
const MAX_INDENT_DEPTH = 4;

// ── Tree builder ─────────────────────────────────────────────────────────────

/**
 * Converts a flat array of reply documents into a nested tree.
 *
 * Each node in the returned tree has a `.children` array containing
 * its direct child replies, in the same createdAt-asc order they
 * came from Firestore.
 *
 * Orphaned replies (parentId points to a deleted reply) are promoted
 * to root level rather than being silently dropped.
 */
function buildTree(replies) {
  // Step 1 — index every reply by its Firestore document id
  const byId = {};
  replies.forEach((r) => {
    byId[r.id] = { ...r, children: [] };
  });

  // Step 2 — attach each reply to its parent, or to the root list
  const roots = [];
  replies.forEach((r) => {
    if (r.parentId && byId[r.parentId]) {
      byId[r.parentId].children.push(byId[r.id]);
    } else {
      roots.push(byId[r.id]);
    }
  });

  return roots;
}

// ── Inline compose form ──────────────────────────────────────────────────────

/**
 * InlineReplyForm — compact textarea shown directly beneath a reply
 * when the user clicks "↩ Reply".
 *
 * Props:
 *   postId     {string}
 *   parentId   {string}   ID of the reply being replied to
 *   authorRole {string}   current user's role
 *   onDone     {function} called after submit OR cancel — closes the form
 */
function InlineReplyForm({ postId, parentId, authorRole, onDone }) {
  const { user } = useAuth();
  const [body, setBody]           = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      await createReply(postId, {
        body: body.trim(),
        authorId:   user.uid,
        authorName: user.displayName || user.email,
        authorRole: authorRole || "entrepreneur",
        parentId,
      });
      onDone(); // close the form on success
    } catch (err) {
      console.error("Nested reply failed:", err);
      setError("Failed to post reply. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="inline-reply-form" onSubmit={handleSubmit} noValidate>
      <textarea
        className="reply-form-textarea inline-reply-textarea"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a reply..."
        rows={2}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
      />
      {error && <p className="reply-form-error">{error}</p>}
      <div className="inline-reply-actions">
        <button
          type="button"
          className="inline-reply-cancel"
          onClick={onDone}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="reply-form-submit"
          disabled={submitting || !body.trim()}
        >
          {submitting ? "Posting..." : "Reply"}
        </button>
      </div>
    </form>
  );
}

// ── Single reply node (recursive) ────────────────────────────────────────────

/**
 * ReplyItem — renders one reply node and recurses into its children.
 *
 * Props:
 *   reply       {object}    tree node: reply data + .children array
 *   postId      {string}
 *   authorRole  {string}    current user's role (for new nested replies)
 *   reportedIds {Set}       set of reply ids flagged in this session
 *   onReport    {function}  (replyId) => void
 *   depth       {number}    0 = root, increments with each nesting level
 */
function ReplyItem({ reply, postId, authorRole, reportedIds, onReport, depth }) {
  const [showReplyForm, setShowReplyForm] = useState(false);

  return (
    <div className={`reply-item${reply.isMentorReply ? " reply-item-mentor" : ""}`}>

      {/* Header row */}
      <div className="reply-item-header">
        <span className="reply-author">{reply.authorName}</span>
        <span className={`post-card-role-badge role-${reply.authorRole}`}>
          {ROLE_LABELS[reply.authorRole] || reply.authorRole}
        </span>
        {reply.isMentorReply && (
          <span className="reply-mentor-badge">Mentor Response</span>
        )}
        <span className="post-card-time reply-time">
          {formatRelativeTime(reply.createdAt)}
        </span>
        <button
          type="button"
          className="post-card-report"
          onClick={() => onReport(reply.id)}
        >
          {reportedIds.has(reply.id) ? "Reported" : "⚑ Report"}
        </button>
      </div>

      {/* Body */}
      <p className="reply-item-body">{reply.body}</p>

      {/* ↩ Reply toggle */}
      <button
        type="button"
        className="reply-action-btn"
        onClick={() => setShowReplyForm((v) => !v)}
      >
        ↩ Reply
      </button>

      {/* Inline compose form — shown when ↩ Reply is clicked */}
      {showReplyForm && (
        <InlineReplyForm
          postId={postId}
          parentId={reply.id}
          authorRole={authorRole}
          onDone={() => setShowReplyForm(false)}
        />
      )}

      {/* Children — indented, with a left-border connector.
          Once MAX_INDENT_DEPTH is reached we stop adding indentation
          (reply-children-flat) so replies don't become unreadably narrow. */}
      {reply.children.length > 0 && (
        <div
          className={
            "reply-children" +
            (depth >= MAX_INDENT_DEPTH ? " reply-children-flat" : "")
          }
        >
          {reply.children.map((child) => (
            <ReplyItem
              key={child.id}
              reply={child}
              postId={postId}
              authorRole={authorRole}
              reportedIds={reportedIds}
              onReport={onReport}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Container ────────────────────────────────────────────────────────────────

/**
 * ReplyThread — root container.
 *
 * Owns the Firestore listener, reported-ids state, and the top-level
 * compose form (parentId: null).  Nested compose forms live inside
 * each ReplyItem and are self-contained.
 */
function ReplyThread({ postId, authorRole }) {
  const { user } = useAuth();
  const [replies, setReplies]         = useState([]);
  const [body, setBody]               = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState(null);
  const [reportedIds, setReportedIds] = useState(new Set());

  useEffect(() => {
    const unsub = listenToReplies(postId, setReplies, console.error);
    return () => unsub();
  }, [postId]);

  const handleReport = async (replyId) => {
    if (reportedIds.has(replyId)) return;
    try {
      await flagReply(postId, replyId);
      setReportedIds((prev) => new Set([...prev, replyId]));
    } catch (err) {
      console.error("Report reply failed:", err);
    }
  };

  const handleTopLevelSubmit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      await createReply(postId, {
        body: body.trim(),
        authorId:   user.uid,
        authorName: user.displayName || user.email,
        authorRole: authorRole || "entrepreneur",
        parentId:   null, // explicit: this is a root-level reply
      });
      setBody("");
    } catch (err) {
      console.error("Reply failed:", err);
      setError("Failed to post reply. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const tree = buildTree(replies);

  return (
    <div className="reply-thread">
      <p className="reply-thread-count">
        {replies.length} {replies.length === 1 ? "reply" : "replies"}
      </p>

      {replies.length === 0 ? (
        <p className="reply-empty">No replies yet — be the first to respond.</p>
      ) : (
        <div className="reply-list">
          {tree.map((reply) => (
            <ReplyItem
              key={reply.id}
              reply={reply}
              postId={postId}
              authorRole={authorRole}
              reportedIds={reportedIds}
              onReport={handleReport}
              depth={0}
            />
          ))}
        </div>
      )}

      {/* Top-level compose form — always at the bottom */}
      <form className="reply-form" onSubmit={handleTopLevelSubmit} noValidate>
        <textarea
          className="reply-form-textarea"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a reply..."
          rows={3}
        />
        {error && <p className="reply-form-error">{error}</p>}
        <div className="reply-form-footer">
          <button
            type="submit"
            className="reply-form-submit"
            disabled={submitting || !body.trim()}
          >
            {submitting ? "Posting..." : "Post Reply"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ReplyThread;
