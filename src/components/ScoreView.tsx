import { useEffect, useRef, useState } from "react";
import type { Exercise } from "../engine/types";
import { renderScore, type ScoreLayout } from "../render/renderScore";

interface ScoreViewProps {
  exercise: Exercise;
  activeMeasure: number | null;
  startMeasure: number;
  onSelectMeasure: (index: number) => void;
}

export function ScoreView({
  exercise,
  activeMeasure,
  startMeasure,
  onSelectMeasure,
}: ScoreViewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<ScoreLayout | null>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const update = () => setAvailableWidth(host.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || availableWidth <= 0) return;
    let cancelled = false;
    setLayout(null);
    setError(null);

    renderScore(host, exercise, availableWidth)
      .then((nextLayout) => {
        if (!cancelled) setLayout(nextLayout);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "The score could not be drawn.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [exercise, availableWidth]);

  const activeBox =
    activeMeasure === null ? undefined : layout?.measures.find((box) => box.index === activeMeasure);

  return (
    <div className="score-stage">
      <div ref={hostRef} className="score-host" aria-label="Generated grand staff score" />
      {error && <div className="score-error">Score error: {error}</div>}
      {layout?.measures.map((box) => (
        <button
          key={box.index}
          type="button"
          className={box.index === startMeasure ? "measure-jump selected" : "measure-jump"}
          style={{
            left: `${box.x}px`,
            top: `${box.y}px`,
            width: `${box.width}px`,
            height: `${box.height}px`,
          }}
          onClick={(event) => {
            onSelectMeasure(box.index);
            event.currentTarget.blur();
          }}
          data-measure={box.index}
          aria-label={`Start playback at bar ${box.index + 1}`}
          title={`Start at bar ${box.index + 1}`}
        />
      ))}
      {activeBox && (
        <div
          className="measure-highlight"
          style={{
            left: `${activeBox.x}px`,
            top: `${activeBox.y}px`,
            width: `${activeBox.width}px`,
            height: `${activeBox.height}px`,
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
