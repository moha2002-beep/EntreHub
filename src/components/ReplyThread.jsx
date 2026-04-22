/**
 * ReplyThread.jsx — Nested discussion thread with moderation.
 */

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { listenToReplies, createReply, reportReply } from "../services/postService";
import { checkAccountStatus } from "../services/userService";
import { moderateContent } from "../utils/moderation";
import { formatRelativeTime } from "../utils/formatTime";
import "../styles/Community.css";

const ROLE_LABELS = {
  mentor: "Mentor",
  entrepreneur: "Entrepreneur",
  investor: "Investor",
};

const MAX_INDENT_DEPTH = 4;

// Tree builder 

function buildTree(replies) {
  const byId = {};
  replies.forEach((r) => {
    byId[r.id] = { ...r, children: [] };
  });
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

//  Inline compose form 

function InlineReplyForm({ postId, parentId, authorRole, onDone, accountStatus }) {
  const { user } = useAuth();
  const [body, setBody]               = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState(null);
  const [moderationError, setModerationError] = useState(null);

  const isSuspended = accountStatus?.status === "suspended";
  const isBanned    = accountStatus?.status === "banned";

  if (isBanned) return null;

  const handleBodyChange = (e) => {
    setBody(e.target.value);
    if (moderationError) setModerationError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!body.trim() || isSuspended) return;

    const check = moderateContent(body);
    if (!check.safe) {
      setModerationError(
        `Restricted content: "${check.flaggedWords.join('", "')}". Please edit before submitting.`
      );
      return;
    }

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
      onDone();
    } catch (err) {
      console.error("Nested reply failed:", err);
      if (err.code === "CONTENT_VIOLATION") {
        setModerationError(
          "Your content violates our Safety Guidelines and was not submitted. Repeated violations may affect your account."
        );
      } else {
        setError("Failed to post reply. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="inline-reply-form" onSubmit={handleSubmit} noValidate>
      <textarea
        className="reply-form-textarea inline-reply-textarea"
        value={body}
        onChange={handleBodyChange}
        placeholder={isSuspended ? "Your account is suspended." : "Write a reply..."}
        rows={2}
        disabled={isSuspended}
        autoFocus={!isSuspended}
      />
      {moderationError && (
        <div className="moderation-warning moderation-warning-compact">
          <p>{moderationError}</p>
          <button type="button" className="moderation-warning-dismiss" onClick={() => setModerationError(null)}>✕</button>
        </div>
      )}
      {error && <p className="reply-form-error">{error}</p>}
      <div className="inline-reply-actions">
        <button type="button" className="inline-reply-cancel" onClick={onDone}>
          Cancel
        </button>
        <button
          type="submit"
          className="reply-form-submit"
          disabled={submitting || !body.trim() || isSuspended || !!moderationError}
        >
          {submitting ? "Posting..." : "Reply"}
        </button>
      </div>
    </form>
  );
}

// Single reply node cursive) 

function ReplyItem({ reply, postId, currentUserId, authorRole, accountStatus, onReport, depth }) {
  const [showReplyForm, setShowReplyForm] = useState(false);

  const hasReported = (reply.reportedBy || []).includes(currentUserId);

  return (
    <div className={`reply-item${reply.isMentorReply ? " reply-item-mentor" : ""}`}>

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
          disabled={hasReported}
          title={hasReported ? "You have already reported this reply" : "Report reply"}
        >
          {hasReported ? "Reported" : "⚑ Report"}
        </button>
      </div>

      <p className="reply-item-body">{reply.body}</p>

      <button
        type="button"
        className="reply-action-btn"
        onClick={() => setShowReplyForm((v) => !v)}
      >
        ↩ Reply
      </button>

      {showReplyForm && (
        <InlineReplyForm
          postId={postId}
          parentId={reply.id}
          authorRole={authorRole}
          accountStatus={accountStatus}
          onDone={() => setShowReplyForm(false)}
        />
      )}

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
              currentUserId={currentUserId}
              authorRole={authorRole}
              accountStatus={accountStatus}
              onReport={onReport}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Container 

function ReplyThread({ postId, authorRole }) {
  const { user } = useAuth();
  const [replies, setReplies]             = useState([]);
  const [body, setBody]                   = useState("");
  const [submitting, setSubmitting]       = useState(false);
  const [error, setError]                 = useState(null);
  const [moderationError, setModerationError] = useState(null);
  const [accountStatus, setAccountStatus] = useState(null);
  const [warnDismissed, setWarnDismissed] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    checkAccountStatus(user.uid)
      .then(setAccountStatus)
      .catch((err) => {
        console.error("Account status check failed:", err);
        setAccountStatus({ status: "active" });
      });
  }, [user]);

  useEffect(() => {
    const unsub = listenToReplies(postId, setReplies, console.error);
    return () => unsub();
  }, [postId]);

  const handleReport = async (replyId) => {
    if (!user?.uid) return;
    try {
      await reportReply(postId, replyId, user.uid);
    } catch (err) {
      console.error("Report reply failed:", err);
    }
  };

  const handleBodyChange = (e) => {
    setBody(e.target.value);
    if (moderationError) setModerationError(null);
  };

  const handleTopLevelSubmit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;

    const check = moderateContent(body);
    if (!check.safe) {
      setModerationError(
        `Your reply contains restricted content: "${check.flaggedWords.join('", "')}". Please edit before submitting.`
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createReply(postId, {
        body: body.trim(),
        authorId:   user.uid,
        authorName: user.displayName || user.email,
        authorRole: authorRole || "entrepreneur",
        parentId:   null,
      });
      setBody("");
    } catch (err) {
      console.error("Reply failed:", err);
      if (err.code === "CONTENT_VIOLATION") {
        setModerationError(
          "Your content violates our Safety Guidelines and was not submitted. Repeated violations may affect your account."
        );
      } else {
        setError("Failed to post reply. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Logic: Hide replies with 3+ reports.
   */
  const REPORT_THRESHOLD = 3;
  const visibleReplies = replies.filter(
    (r) => !r.reportCount || r.reportCount < REPORT_THRESHOLD
  );

  const tree = buildTree(visibleReplies);

  const isSuspended = accountStatus?.status === "suspended";
  const isBanned    = accountStatus?.status === "banned";

  return (
    <div className="reply-thread">
      <p className="reply-thread-count">
        {visibleReplies.length} {visibleReplies.length === 1 ? "reply" : "replies"}
      </p>

      {visibleReplies.length === 0 ? (
        <p className="reply-empty">No replies yet — be the first to respond.</p>
      ) : (
        <div className="reply-list">
          {tree.map((reply) => (
            <ReplyItem
              key={reply.id}
              reply={reply}
              postId={postId}
              currentUserId={user.uid}
              authorRole={authorRole}
              accountStatus={accountStatus}
              onReport={handleReport}
              depth={0}
            />
          ))}
        </div>
      )}

      {/* Top-level compose form */}

      {/* Banned — no compose form at all */}
      {isBanned ? (
        <div className="account-status-banner account-status-banned">
          <p className="account-status-title">Your account has been permanently banned.</p>
          {accountStatus.reason && (
            <p className="account-status-reason">Reason: {accountStatus.reason}</p>
          )}
        </div>
      ) : (
        <form className="reply-form" onSubmit={handleTopLevelSubmit} noValidate>

          {/* Suspension notice above the form */}
          {isSuspended && (
            <div className="account-status-banner account-status-suspended">
              <p className="account-status-title">Your account is suspended.</p>
              {accountStatus.until && (
                <p className="account-status-reason">
                  Until:{" "}
                  {accountStatus.until.toLocaleDateString("en-GB", {
                    day: "numeric", month: "long", year: "numeric",
                  })}
                </p>
              )}
              {accountStatus.reason && (
                <p className="account-status-reason">Reason: {accountStatus.reason}</p>
              )}
              <p className="account-status-contact">
                You can read replies but cannot post until your suspension ends.
              </p>
            </div>
          )}

          {/* Warning banner — dismissable */}
          {accountStatus?.status === "warned" && !warnDismissed && (
            <div className="account-status-banner account-status-warned">
              <p className="account-status-title">
                Your account has received a warning. Further violations may result in suspension.
              </p>
              <button
                type="button"
                className="account-status-dismiss"
                onClick={() => setWarnDismissed(true)}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Moderation warning */}
          {moderationError && (
            <div className="moderation-warning">
              <p>{moderationError}</p>
              <button
                type="button"
                className="moderation-warning-dismiss"
                onClick={() => setModerationError(null)}
              >
                ✕
              </button>
            </div>
          )}

          <textarea
            className="reply-form-textarea"
            value={body}
            onChange={handleBodyChange}
            placeholder={isSuspended ? "Your account is suspended." : "Write a reply..."}
            rows={3}
            disabled={isSuspended}
          />
          {error && <p className="reply-form-error">{error}</p>}
          <div className="reply-form-footer">
            <button
              type="submit"
              className="reply-form-submit"
              disabled={submitting || !body.trim() || isSuspended || !!moderationError}
            >
              {submitting ? "Posting..." : "Post Reply"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default ReplyThread;
