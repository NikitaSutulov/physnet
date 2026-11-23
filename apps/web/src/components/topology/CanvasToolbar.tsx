'use client';

interface CanvasToolbarProps {
  scale: number;
  gridVisible: boolean;
  snapEnabled: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onToggleGrid: () => void;
  onToggleSnap: () => void;
}

const btn =
  'flex h-8 min-w-8 items-center justify-center rounded px-2 text-sm text-foreground transition-colors hover:bg-surface-muted';

export function CanvasToolbar({
  scale,
  gridVisible,
  snapEnabled,
  onZoomIn,
  onZoomOut,
  onFit,
  onToggleGrid,
  onToggleSnap,
}: CanvasToolbarProps) {
  return (
    <div className="absolute right-3 bottom-3 flex items-center gap-0.5 rounded-lg border border-border bg-surface/95 p-1 shadow-sm backdrop-blur">
      <button type="button" className={btn} onClick={onZoomOut} aria-label="Зменшити">
        −
      </button>
      <span className="w-14 text-center font-mono text-xs text-muted tabular-nums">
        {Math.round(scale * 100)}%
      </span>
      <button type="button" className={btn} onClick={onZoomIn} aria-label="Збільшити">
        +
      </button>
      <span className="mx-1 h-5 w-px bg-border" />
      <button type="button" className={btn} onClick={onFit}>
        Вмістити
      </button>
      <button
        type="button"
        className={`${btn} ${gridVisible ? 'bg-surface-muted' : ''}`}
        onClick={onToggleGrid}
        aria-pressed={gridVisible}
      >
        Сітка
      </button>
      <button
        type="button"
        className={`${btn} ${snapEnabled ? 'bg-surface-muted' : ''}`}
        onClick={onToggleSnap}
        aria-pressed={snapEnabled}
        title="Прив’язувати пристрої до вузлів сітки"
      >
        Прив’язка
      </button>
    </div>
  );
}
