// landing/src/components/forum/ForumNewPost.tsx
// New forum topic creation form with title, category, and body inputs
// Redirects to auth if not logged in, redirects to topic on success
// Related: ForumConvexProvider.tsx, ForumPostList.tsx, categories.ts

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import ForumConvexProvider from "./ForumConvexProvider";
import { CATEGORIES } from "./categories";

const FONTS = {
  heading: "'Space Grotesk', sans-serif",
  body: "'Plus Jakarta Sans', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

const COLORS = {
  pageBg: "#1a1512",
  inputBg: "#342c27",
  textPrimary: "#fdf9f7",
  textSecondary: "#c4b8ad",
  textTertiary: "#7a6b61",
  textMuted: "#564d46",
  amber: "#f59e0b",
  border: "rgba(168,162,158,0.18)",
  focusBorder: "rgba(245,158,11,0.35)",
};

const TITLE_MAX = 200;
const BODY_MAX = 5000;

function NewPostInner() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const createPost = useMutation(api.forum.createPost);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].slug);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to auth if not authenticated (after loading)
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/auth?returnUrl=/forum/nauja";
    }
  }, [isLoading, isAuthenticated]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim() || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const postId = await createPost({
        title: title.trim(),
        category,
        body: body.trim(),
      });
      window.location.href = `/forum/tema/${postId}`;
    } catch (err: any) {
      setError(err.message || "Klaida kuriant tem\u0105");
      setSubmitting(false);
    }
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div style={{ color: COLORS.textMuted, textAlign: "center", padding: "48px 0", fontSize: "14px", fontFamily: FONTS.body }}>
        Kraunama...
      </div>
    );
  }

  const inputStyle = (focused: boolean): React.CSSProperties => ({
    width: "100%",
    background: COLORS.inputBg,
    color: COLORS.textPrimary,
    border: `1px solid ${focused ? COLORS.focusBorder : COLORS.border}`,
    borderRadius: "8px",
    padding: "10px 14px",
    fontSize: "14px",
    fontFamily: FONTS.body,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  });

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "13px",
    fontWeight: 600,
    color: COLORS.textSecondary,
    marginBottom: "6px",
    fontFamily: FONTS.body,
  };

  const counterStyle = (current: number, max: number): React.CSSProperties => ({
    fontSize: "11px",
    fontFamily: FONTS.mono,
    color: current > max * 0.9 ? COLORS.amber : COLORS.textMuted,
    textAlign: "right",
    marginTop: "4px",
  });

  return (
    <div style={{ fontFamily: FONTS.body, maxWidth: "640px" }}>
      <h1
        style={{
          fontSize: "20px",
          fontWeight: 700,
          fontFamily: FONTS.heading,
          color: COLORS.textPrimary,
          marginBottom: "24px",
        }}
      >
        Nauja tema
      </h1>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        {/* Title */}
        <div>
          <label style={labelStyle}>Pavadinimas</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
            maxLength={TITLE_MAX}
            placeholder="\u012Eveskite temos pavadinim\u0105..."
            style={inputStyle(false)}
            onFocus={(e) => { e.currentTarget.style.borderColor = COLORS.focusBorder; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = COLORS.border; }}
          />
          <div style={counterStyle(title.length, TITLE_MAX)}>
            {title.length}/{TITLE_MAX}
          </div>
        </div>

        {/* Category */}
        <div>
          <label style={labelStyle}>Kategorija</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{
              ...inputStyle(false),
              cursor: "pointer",
              appearance: "auto",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = COLORS.focusBorder; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = COLORS.border; }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        {/* Body */}
        <div>
          <label style={labelStyle}>Turinys</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
            maxLength={BODY_MAX}
            rows={8}
            placeholder="Apra\u0161ykite savo klausim\u0105 ar tem\u0105..."
            style={{
              ...inputStyle(false),
              resize: "vertical",
              lineHeight: 1.6,
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = COLORS.focusBorder; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = COLORS.border; }}
          />
          <div style={counterStyle(body.length, BODY_MAX)}>
            {body.length}/{BODY_MAX}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              fontSize: "13px",
              color: "#ef4444",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: "6px",
              padding: "10px 14px",
            }}
          >
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "flex-end" }}>
          <a
            href="/forum"
            style={{
              color: COLORS.textTertiary,
              fontSize: "13px",
              textDecoration: "none",
              padding: "8px 16px",
              transition: "color 0.12s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = COLORS.textSecondary; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = COLORS.textTertiary; }}
          >
            At\u0161aukti
          </a>
          <button
            type="submit"
            disabled={!title.trim() || !body.trim() || submitting}
            style={{
              background: COLORS.amber,
              color: "#1a1512",
              border: "none",
              borderRadius: "6px",
              padding: "9px 24px",
              fontSize: "14px",
              fontWeight: 700,
              fontFamily: FONTS.heading,
              cursor: !title.trim() || !body.trim() || submitting ? "not-allowed" : "pointer",
              opacity: !title.trim() || !body.trim() || submitting ? 0.5 : 1,
              transition: "all 0.15s",
            }}
          >
            {submitting ? "Kuriama..." : "Sukurti tem\u0105"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ForumNewPost() {
  return (
    <ForumConvexProvider>
      <NewPostInner />
    </ForumConvexProvider>
  );
}
