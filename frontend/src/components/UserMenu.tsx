// frontend/src/components/UserMenu.tsx
// User avatar + dropdown menu with logout in the TopBar
// Opens on hover (instant), closes on mouse leave (100ms delay)
// Related: TopBar.tsx, ConvexAuthWrapper.tsx

import { useState, useRef, useCallback } from "react";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";
import { LogOut } from "lucide-react";

export default function UserMenu() {
  const { signOut } = useAuthActions();
  const currentUser = useQuery(api.users.currentUser);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout>>();
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();

  const startOpen = useCallback(() => {
    clearTimeout(closeTimer.current);
    openTimer.current = setTimeout(() => setOpen(true), 0);
  }, []);

  const startClose = useCallback(() => {
    clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 100);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "https://foxdoc.io";
  };

  const displayName = currentUser?.name || currentUser?.email || "Vartotojas";
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={startOpen}
      onMouseLeave={startClose}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-700/30 transition-colors"
      >
        {currentUser?.image ? (
          <img src={currentUser.image} alt="" className="w-7 h-7 rounded-full" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-xs font-semibold">
            {initials}
          </div>
        )}
        <span className="text-sm text-surface-300 hidden sm:block max-w-[120px] truncate">
          {displayName}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 py-1 bg-surface-800 border border-surface-700/50 rounded-lg shadow-xl z-50 animate-fade-in"
          style={{ animationDuration: '150ms' }}
        >
          <div className="px-3 py-2 border-b border-surface-700/50">
            <p className="text-sm text-surface-200 truncate">{displayName}</p>
            {currentUser?.email && (
              <p className="text-xs text-surface-400 truncate">{currentUser.email}</p>
            )}
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:bg-surface-700/50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Atsijungti
          </button>
        </div>
      )}
    </div>
  );
}
