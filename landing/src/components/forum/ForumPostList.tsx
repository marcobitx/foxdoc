// landing/src/components/forum/ForumPostList.tsx
// Main forum post list with filters, category badges, voting, and pagination
// Entry point for /forum and /forum/{category} pages
// Related: ForumConvexProvider.tsx, categories.ts, timeAgo.ts

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import ForumConvexProvider from "./ForumConvexProvider";
import { CATEGORIES, getCategoryTitle, getCategoryColor } from "./categories";
import { timeAgo } from "./timeAgo";

type SortMode = "recent" | "popular" | "unanswered";

const FONTS = {
  heading: "'Space Grotesk', sans-serif",
  body: "'Plus Jakarta Sans', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

const COLORS = {
  pageBg: "#1a1512",
  tabBarBg: "#0d0a08",
  tabActive: "#2a2320",
  rowHover: "#2a2320",
  inputBg: "#342c27",
  textPrimary: "#fdf9f7",
  textSecondary: "#c4b8ad",
  textTertiary: "#7a6b61",
  textMuted: "#564d46",
  amber: "#f59e0b",
  border: "rgba(168,162,158,0.18)",
};

function PostListInner({ initialCategory }: { initialCategory?: string }) {
  const { isAuthenticated } = useConvexAuth();
  const [sort, setSort] = useState<SortMode>("recent");
  const [category, setCategory] = useState<string>(initialCategory ?? "all");
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const postsResult = useQuery(api.forum.listPosts, {
    sortBy: sort,
    category: category === "all" ? undefined : category,
  });

  const myVotes = useQuery(api.forum.myVotes, isAuthenticated ? {} : "skip");
  const toggleVote = useMutation(api.forum.toggleVote);

  const posts = postsResult?.posts ?? [];
  const nextCursor = postsResult?.nextCursor;

  function requireAuth() {
    window.location.href = `/auth?returnUrl=${encodeURIComponent(window.location.pathname)}`;
  }

  async function handleVote(postId: string) {
    if (!isAuthenticated) {
      requireAuth();
      return;
    }
    await toggleVote({ targetId: postId, targetType: "post" });
  }

  function handleNewTopic() {
    if (!isAuthenticated) {
      requireAuth();
      return;
    }
    window.location.href = "/forum/nauja";
  }

  const tabs: { key: SortMode; label: string }[] = [
    { key: "recent", label: "Naujausios" },
    { key: "popular", label: "Populiarios" },
    { key: "unanswered", label: "Be atsakymo" },
  ];

  return (
    <div style={{ fontFamily: FONTS.body }}>
      {/* Header bar: tabs + category filter + new topic button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "16px",
        }}
      >
        {/* Sort tabs */}
        <div
          style={{
            display: "flex",
            background: COLORS.tabBarBg,
            borderRadius: "8px",
            padding: "3px",
            gap: "2px",
          }}
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setSort(t.key); setCursor(undefined); }}
              style={{
                padding: "7px 16px",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 600,
                fontFamily: FONTS.body,
                background: sort === t.key ? COLORS.tabActive : "transparent",
                color: sort === t.key ? COLORS.textPrimary : COLORS.textTertiary,
                transition: "all 0.15s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {/* Category filter */}
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setCursor(undefined); }}
            style={{
              background: COLORS.inputBg,
              color: COLORS.textSecondary,
              border: `1px solid ${COLORS.border}`,
              borderRadius: "6px",
              padding: "7px 12px",
              fontSize: "13px",
              fontFamily: FONTS.body,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="all">Visos kategorijos</option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.title}
              </option>
            ))}
          </select>

          {/* New topic button */}
          <button
            onClick={handleNewTopic}
            style={{
              background: COLORS.amber,
              color: "#1a1512",
              border: "none",
              borderRadius: "6px",
              padding: "7px 16px",
              fontSize: "13px",
              fontWeight: 700,
              fontFamily: FONTS.heading,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = "0.9"; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = "1"; }}
          >
            + Nauja tema
          </button>
        </div>
      </div>

      {/* Post list */}
      <div
        style={{
          border: `1px solid ${COLORS.border}`,
          borderRadius: "10px",
          overflow: "hidden",
        }}
      >
        {posts.length === 0 && postsResult !== undefined && (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              color: COLORS.textTertiary,
              fontSize: "14px",
            }}
          >
            Dar n\u0117ra tem\u0173. B\u016bkite pirmas!
          </div>
        )}

        {posts.length === 0 && postsResult === undefined && (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              color: COLORS.textMuted,
              fontSize: "14px",
            }}
          >
            Kraunama...
          </div>
        )}

        {posts.map((post: any, i: number) => {
          const catColor = getCategoryColor(post.category);
          const hasVoted = myVotes?.includes(post._id);

          return (
            <div
              key={post._id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "14px",
                padding: "14px 18px",
                borderBottom: i < posts.length - 1 ? `1px solid ${COLORS.border}` : "none",
                cursor: "pointer",
                transition: "background 0.12s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = COLORS.rowHover; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              onClick={(e) => {
                // Don't navigate if clicking the vote button
                if ((e.target as HTMLElement).closest("[data-vote]")) return;
                window.location.href = `/forum/tema/${post._id}`;
              }}
            >
              {/* Upvote button */}
              <div
                data-vote="true"
                onClick={(e) => { e.stopPropagation(); handleVote(post._id); }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "2px",
                  minWidth: "36px",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  style={{ transition: "transform 0.12s" }}
                >
                  <path
                    d="M8 3L13 10H3L8 3Z"
                    fill={hasVoted ? COLORS.amber : COLORS.textMuted}
                  />
                </svg>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    fontFamily: FONTS.mono,
                    color: hasVoted ? COLORS.amber : COLORS.textTertiary,
                  }}
                >
                  {post.upvotes ?? 0}
                </span>
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  {/* Category badge */}
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      fontFamily: FONTS.body,
                      color: catColor,
                      background: `${catColor}1F`,
                      padding: "2px 8px",
                      borderRadius: "4px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {getCategoryTitle(post.category)}
                  </span>

                  {/* Title */}
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      fontFamily: FONTS.heading,
                      color: COLORS.textPrimary,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {post.title}
                  </span>
                </div>

                {/* Meta row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginTop: "4px",
                    fontSize: "12px",
                    color: COLORS.textTertiary,
                    fontFamily: FONTS.body,
                  }}
                >
                  <span>{post.authorName ?? "Anonimas"}</span>
                  <span style={{ color: COLORS.textMuted }}>{"\u00B7"}</span>
                  <span>{timeAgo(post._creationTime)}</span>
                  <span style={{ color: COLORS.textMuted }}>{"\u00B7"}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M2 4C2 3.44772 2.44772 3 3 3H13C13.5523 3 14 3.44772 14 4V10C14 10.5523 13.5523 11 13 11H9L6 14V11H3C2.44772 11 2 10.5523 2 10V4Z"
                        stroke={COLORS.textMuted}
                        strokeWidth="1.2"
                      />
                    </svg>
                    {post.replyCount ?? 0}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Load more */}
      {nextCursor && (
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <button
            onClick={() => setCursor(nextCursor)}
            style={{
              background: COLORS.inputBg,
              color: COLORS.textSecondary,
              border: `1px solid ${COLORS.border}`,
              borderRadius: "6px",
              padding: "8px 24px",
              fontSize: "13px",
              fontWeight: 600,
              fontFamily: FONTS.body,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.borderColor = "rgba(245,158,11,0.35)"; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.borderColor = COLORS.border; }}
          >
            Rodyti daugiau
          </button>
        </div>
      )}
    </div>
  );
}

export default function ForumPostList({ initialCategory }: { initialCategory?: string }) {
  return (
    <ForumConvexProvider>
      <PostListInner initialCategory={initialCategory} />
    </ForumConvexProvider>
  );
}
