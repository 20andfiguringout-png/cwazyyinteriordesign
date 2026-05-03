import { useMemo, useState } from "react";

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

interface UndoRedoResult<T> {
  state: T;
  set: (next: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useUndoRedo<T>(initial: T, maxHistory: number = 20): UndoRedoResult<T> {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initial,
    future: [],
  });

  const set = (next: T) => {
    setHistory((prev) => {
      if (Object.is(prev.present, next)) return prev;
      const nextPast = [...prev.past, prev.present];
      return {
        past: nextPast.slice(Math.max(0, nextPast.length - maxHistory)),
        present: next,
        future: [],
      };
    });
  };

  const undo = () => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      return {
        past: prev.past.slice(0, -1),
        present: previous,
        future: [prev.present, ...prev.future].slice(0, maxHistory),
      };
    });
  };

  const redo = () => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;
      const [next, ...remaining] = prev.future;
      const nextPast = [...prev.past, prev.present];
      return {
        past: nextPast.slice(Math.max(0, nextPast.length - maxHistory)),
        present: next,
        future: remaining,
      };
    });
  };

  return useMemo(
    () => ({
      state: history.present,
      set,
      undo,
      redo,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
    }),
    [history],
  );
}
