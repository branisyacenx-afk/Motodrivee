import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface ScreenHeaderProps {
  title: string;
  onBack: () => void;
  right?: ReactNode;
}

export function ScreenHeader({ title, onBack, right }: ScreenHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur-md sm:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 py-2 pe-4 ps-3 text-sm font-bold text-white ring-1 ring-white/15 transition hover:bg-white/20 active:scale-95"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
          رجوع
        </button>
        <h1 className="truncate text-lg font-extrabold text-white">{title}</h1>
      </div>
      {right}
    </header>
  );
}
