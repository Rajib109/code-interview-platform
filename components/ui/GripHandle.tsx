/**
 * GripHandle — Reusable drag handle for react-resizable-panels Separators.
 *
 * Renders as a thin bar with a centered grip dot.  Used between
 * all resizable panel pairs in the app.
 */

'use client';

import { Separator } from 'react-resizable-panels';

interface GripHandleProps {
  /** 'horizontal' renders a vertical bar; 'vertical' renders a horizontal bar. */
  direction?: 'horizontal' | 'vertical';
}

export default function GripHandle({ direction = 'horizontal' }: GripHandleProps) {
  if (direction === 'vertical') {
    return (
      <Separator className="h-1.5 bg-slate-800 hover:bg-blue-600 active:bg-blue-500 transition-colors cursor-row-resize flex justify-center items-center">
        <div className="w-4 h-0.5 bg-slate-600 rounded-full" />
      </Separator>
    );
  }

  return (
    <Separator className="w-1.5 bg-slate-800 hover:bg-blue-600 active:bg-blue-500 transition-colors cursor-col-resize flex flex-col justify-center items-center">
      <div className="h-4 w-0.5 bg-slate-600 rounded-full" />
    </Separator>
  );
}
