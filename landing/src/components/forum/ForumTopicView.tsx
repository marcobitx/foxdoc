// landing/src/components/forum/ForumTopicView.tsx
// Single forum topic view with replies and reply form
// Displays post details, vote button, replies list, and comment input
// Related: ForumConvexProvider.tsx, ForumPostList.tsx, categories.ts

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import ForumConvexProvider from "./ForumConvexProvider";
import { getCategoryTitle, getCategoryColor } from "./categories";
import { timeAgo } from "./timeAgo";

const FONTS = {
  heading: "'Space Grotesk', sans-serif",
  body: "'Plus Jakarta Sans', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

const COLORS = {
  pageBg: "#1a1512",
  cardBg: "#342c27",
  rowHover: "#2a2320",
  textPrimary: "#fdf9f7",
  textSecondary: "#c4b8ad",
  textTertiary: "#7a6b61",
  textMuted: "#564d46",
  amber: "#f59e0b",
  border: "rgba(168,162,158,0.18)",
};

function TopicViewInner({ postId }: { postId: string }) {
  const { isAuthenticated } = useConvexAuth();
  const typedId = postId as Id<"forum_posts">;

  const post = useQuery(api.forum.getPost, { postId: typedId });
  const replies = useQuery(api.forum.listReplies, { postId: typedId });
  const myVotes = useQuery(api.forum.myVotes, isAuthenticated ? {} : "skip");
  const toggleVote = useMutation(api.forum.toggleVote);
  const createReply = useMutation(api.forum.createReply);

  const [replyBody, setReplyBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function requireAuth() {
    window.location.href = `/auth?returnUrl=${encodeURIComponent(window.location.pathname)}`;
  }

  async function handleVote(targetId: string, targetType: "post" | "reply") {
    if (!isAuthenticated) {
      requireAuth();
      return;
    }
    await toggleVote({ targetId, targetType });
  }

  async function handleSubmitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyBody.trim() || submitting) return;
    if (!isAuthenticated) {
      requireAuth();
      return;
    }
    setSubmitting(true);
    try {
      await createReply({ postId: typedId, body: replyBody.trim() });
      setReplyBody("");
    } finally {
      setSubmitting(false);
    }
  }

  if (post === undefined) {
    return (
      <div style={{ color: COLORS.textMuted, textAlign: "center", padding: "48px 0", fontSize: "14px", fontFamily: FONTS.body }}>
        Kraunama...
      </div>
    );
  }

  if (post === null) {
    return (
      <div style={{ color: COLORS.textTertiary, textAlign: "center", padding: "48px 0", fontSize: "14px", fontFamily: FONTS.body }}>
        Tema nerasta.
      </div>
    );
  }

  const catColor = getCategoryColor(post.category);
  const hasVotedPost = myVotes?.includes(post._id);
  const backUrl = `/forum/${post.category}`;

  return (
    <div style={{ fontFamily: FONTS.body }}>
      {/* Back link */}
      <a
        href={backUrl}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          color: COLORS.textTertiary,
          fontSize: "13px",
          textDecoration: "none",
          marginBottom: "20px",
          transition: "color 0.12s",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = COLORS.amber; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = COLORS.textTertiary; }}
      >
        {"\u2190"} Atgal {"\u012F"} forum{"\u0105"}
      </a>

      {/* Post header */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: catColor,
              background: `${catColor}1F`,
              padding: "2px 8px",
              borderRadius: "4px",
            }}
          >
            {getCategoryTitle(post.category)}
          </span>
          <span style={{ fontSize: "12px", color: COLORS.textTertiary }}>
            {post.authorName ?? "Anonimas"}
          </span>
          <span style={{ color: COLORS.textMuted, fontSize: "12px" }}>{"\u00B7"}</span>
          <span style={{ fontSize: "12px", color: COLORS.textTertiary }}>
            {timeAgo(post._creationTime)}
          </span>
        </div>

        <h1
          style={{
            fontSize: "22px",
            fontWeight: 700,
            fontFamily: FONTS.heading,
            color: COLORS.textPrimary,
            margin: "0 0 14px 0",
            lineHeight: 1.3,
          }}
        >
          {post.title}
        </h1>

        {/* Post body */}
        <div
          style={{
            fontSize: "14px",
            lineHeight: 1.7,
            color: COLORS.textSecondary,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {post.body}
        </div>

        {/* Post vote button */}
        <div style={{ marginTop: "16px" }}>
          <button
            onClick={() => handleVote(post._id, "post")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: hasVotedPost ? `${COLORS.amber}1A` : "transparent",
              border: `1px solid ${hasVotedPost ? COLORS.amber : COLORS.border}`,
              borderRadius: "6px",
              padding: "5px 12px",
              cursor: "pointer",
              transition: "all 0.12s",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 3L13 10H3L8 3Z" fill={hasVotedPost ? COLORS.amber : COLORS.textMuted} />
            </svg>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                fontFamily: FONTS.mono,
                color: hasVotedPost ? COLORS.amber : COLORS.textTertiary,
              }}
            >
              {post.upvotes ?? 0}
            </span>
          </button>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: "1px", background: COLORS.border, margin: "24px 0" }} />

      {/* Replies header */}
      <h2
        style={{
          fontSize: "15px",
          fontWeight: 700,
          fontFamily: FONTS.heading,
          color: COLORS.textPrimary,
          marginBottom: "16px",
        }}
      >
        Atsakymai ({replies?.length ?? 0})
      </h2>

      {/* Replies list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
        {replies?.length === 0 && (
          <div style={{ color: COLORS.textMuted, fontSize: "13px", padding: "16px 0" }}>
            Dar n{"\u0117"}ra atsakym{"\u0173"}. B{"\u016B"}kite pirmas!
          </div>
        )}

        {replies?.map((reply: any) => {
          const hasVotedReply = myVotes?.includes(reply._id);

          return (
            <div
              key={reply._id}
              style={{
                background: COLORS.cardBg,
                border: `1px solid ${COLORS.border}`,
                borderRadius: "8px",
                padding: "14px 16px",
              }}
            >
              {/* Reply meta */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "8px",
                  fontSize: "12px",
                  color: COLORS.textTertiary,
                }}
              >
                <span style={{ fontWeight: 600 }}>{reply.authorName ?? "Anonimas"}</span>
                <span style={{ color: COLORS.textMuted }}>{"\u00B7"}</span>
                <span>{timeAgo(reply._creationTime)}</span>
              </div>

              {/* Reply body */}
              <div
                style={{
                  fontSize: "13px",
                  lineHeight: 1.65,
                  color: COLORS.textSecondary,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {reply.body}
              </div>

              {/* Reply vote */}
              <div style={{ marginTop: "10px" }}>
                <button
                  onClick={() => handleVote(reply._id, "reply")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "2px 4px",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M8 3L13 10H3L8 3Z" fill={hasVotedReply ? COLORS.amber : COLORS.textMuted} />
                  </svg>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      fontFamily: FONTS.mono,
                      color: hasVotedReply ? COLORS.amber : COLORS.textTertiary,
                    }}
                  >
                    {reply.upvotes ?? 0}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply form or guest CTA */}
      {isAuthenticated ? (
        <form onSubmit={handleSubmitReply}>
          <textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Ra\u0161ykite atsakym\u0105..."
            rows={4}
            maxLength={5000}
            style={{
              width: "100%",
              background: COLORS.cardBg,
              color: COLORS.textPrimary,
              border: `1px solid ${COLORS.border}`,
              borderRadius: "8px",
              padding: "12px 14px",
              fontSize: "13px",
              fontFamily: FONTS.body,
              lineHeight: 1.6,
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(245,158,11,0.35)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = COLORS.border; }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
            <button
              type="submit"
              disabled={!replyBody.trim() || submitting}
              style={{
                background: COLORS.amber,
                color: "#1a1512",
                border: "none",
                borderRadius: "6px",
                padding: "8px 20px",
                fontSize: "13px",
                fontWeight: 700,
                fontFamily: FONTS.heading,
                cursor: !replyBody.trim() || submitting ? "not-allowed" : "pointer",
                opacity: !replyBody.trim() || submitting ? 0.5 : 1,
                transition: "all 0.15s",
              }}
            >
              {submitting ? "Siunčiama..." : "Atsakyti"}
            </button>
          </div>
        </form>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "20px",
            color: COLORS.textTertiary,
            fontSize: "14px",
            border: `1px solid ${COLORS.border}`,
            borderRadius: "8px",
            background: COLORS.cardBg,
          }}
        >
          <a
            href={`/auth?returnUrl=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "")}`}
            style={{ color: COLORS.amber, textDecoration: "none", fontWeight: 600 }}
          >
            Prisijunkite
          </a>
          , kad gal{"\u0117"}tum{"\u0117"}te komentuoti.
        </div>
      )}
    </div>
  );
}

export default function ForumTopicView({ postId }: { postId: string }) {
  return (
    <ForumConvexProvider>
      <TopicViewInner postId={postId} />
    </ForumConvexProvider>
  );
}
