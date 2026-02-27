// frontend/src/components/LineDivider.tsx
// Decorative line divider with endpoint dots
// Supports horizontal and vertical orientations
// Related: App.tsx, HistoryView.tsx, NotesView.tsx

interface Props {
  orientation: 'horizontal' | 'vertical';
  className?: string;
}

export default function LineDivider({ orientation, className = '' }: Props) {
  if (orientation === 'horizontal') {
    return (
      <div className={`relative w-full h-[5px] flex items-center ${className}`} aria-hidden="true">
        <div className="absolute inset-x-[2px] top-1/2 h-[1px] bg-surface-400/35 -translate-y-1/2" />
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[5px] h-[5px] rounded-full bg-surface-400/50" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[5px] h-[5px] rounded-full bg-surface-400/50" />
      </div>
    );
  }

  return (
    <div className={`h-full w-[5px] flex justify-center ${className}`} aria-hidden="true">
      <div className="absolute inset-y-[2px] left-1/2 w-[1px] bg-surface-400/35 -translate-x-1/2" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[5px] h-[5px] rounded-full bg-surface-400/50" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[5px] h-[5px] rounded-full bg-surface-400/50" />
    </div>
  );
}
