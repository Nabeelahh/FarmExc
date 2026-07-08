import React from 'react';
import { Loader2, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutoSaveIndicatorProps {
  isSaving: boolean;
  lastSaved: Date | null;
  className?: string;
}

export function AutoSaveIndicator({ isSaving, lastSaved, className }: AutoSaveIndicatorProps) {
  const formatLastSaved = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);

    if (diffSecs < 60) {
      return `Saved ${diffSecs}s ago`;
    } else if (diffMins < 60) {
      return `Saved ${diffMins}m ago`;
    } else {
      return `Saved ${date.toLocaleTimeString()}`;
    }
  };

  return (
    <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      {isSaving ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>Saving...</span>
        </>
      ) : lastSaved ? (
        <>
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span>{formatLastSaved(lastSaved)}</span>
        </>
      ) : (
        <>
          <Clock className="w-4 h-4" />
          <span>Auto-save enabled</span>
        </>
      )}
    </div>
  );
}
