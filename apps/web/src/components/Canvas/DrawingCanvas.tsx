import { useRef, useEffect, useCallback } from 'react';
import { useDrawingStore } from '@/stores/drawingStore';
import { useGameStore } from '@/stores/gameStore';
import { useSocket } from '@/hooks/useSocket';
import { cn } from '@/utils/cn';
import type { DrawAction, ServerToClientEvents } from '@doodledraw/shared';

interface DrawingCanvasProps {
  isDrawer: boolean;
  isBlurred: boolean;
  /** Which socket event to listen to for incoming draw actions (default: 'draw:action'). */
  listenEvent?: keyof ServerToClientEvents;
  /** Which custom DOM event name to listen to for history replay (default: 'doodledraw:replayHistory'). */
  replayEventName?: string;
}

/** How often (ms) to emit partial stroke updates while drawing. */
const EMIT_INTERVAL_MS = 50;
/** Minimum new points before emitting a partial stroke. */
const MIN_POINTS_TO_EMIT = 3;

export default function DrawingCanvas({
  isDrawer,
  isBlurred,
  listenEvent = 'draw:action',
  replayEventName = 'doodledraw:replayHistory',
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const pointsRef = useRef<{ x: number; y: number }[]>([]);
  const historyRef = useRef<ImageData[]>([]);
  const { tool, color, brushSize } = useDrawingStore();
  const { socket, on } = useSocket();

  // Streaming stroke refs
  const strokeIdRef = useRef<string | null>(null);
  const lastEmitIndexRef = useRef(0);
  const lastEmitTimeRef = useRef(0);

  const getCtx = useCallback(() => {
    return canvasRef.current?.getContext('2d') ?? null;
  }, []);

  const getCanvasPoint = useCallback((e: PointerEvent): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const saveToHistory = useCallback(() => {
    const ctx = getCtx();
    if (!ctx || !canvasRef.current) return;
    const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    historyRef.current.push(imageData);
    if (historyRef.current.length > 50) historyRef.current.shift();
  }, [getCtx]);

  const drawLine = useCallback((points: { x: number; y: number }[], strokeColor: string, strokeSize: number, eraserMode: boolean) => {
    const ctx = getCtx();
    if (!ctx || points.length < 2) return;

    ctx.beginPath();
    ctx.lineWidth = strokeSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (eraserMode) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = strokeColor;
    }

    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const midX = (points[i - 1].x + points[i].x) / 2;
      const midY = (points[i - 1].y + points[i].y) / 2;
      ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, midX, midY);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }, [getCtx]);

  const floodFill = useCallback((startX: number, startY: number, fillColor: string) => {
    const ctx = getCtx();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;

    const startIdx = (Math.floor(startY) * width + Math.floor(startX)) * 4;
    const startR = data[startIdx];
    const startG = data[startIdx + 1];
    const startB = data[startIdx + 2];
    const startA = data[startIdx + 3];

    const hex = fillColor.replace('#', '');
    const fillR = parseInt(hex.substring(0, 2), 16);
    const fillG = parseInt(hex.substring(2, 4), 16);
    const fillB = parseInt(hex.substring(4, 6), 16);

    if (startR === fillR && startG === fillG && startB === fillB && startA === 255) return;

    const tolerance = 30;
    const matchColor = (idx: number) => {
      return (
        Math.abs(data[idx] - startR) <= tolerance &&
        Math.abs(data[idx + 1] - startG) <= tolerance &&
        Math.abs(data[idx + 2] - startB) <= tolerance &&
        Math.abs(data[idx + 3] - startA) <= tolerance
      );
    };

    const stack: [number, number][] = [[Math.floor(startX), Math.floor(startY)]];
    const visited = new Uint8Array(width * height);

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const pixelIdx = y * width + x;

      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (visited[pixelIdx]) continue;

      const dataIdx = pixelIdx * 4;
      if (!matchColor(dataIdx)) continue;

      visited[pixelIdx] = 1;
      data[dataIdx] = fillR;
      data[dataIdx + 1] = fillG;
      data[dataIdx + 2] = fillB;
      data[dataIdx + 3] = 255;

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    ctx.putImageData(imageData, 0, 0);
  }, [getCtx]);

  /** Emit a partial stroke with the points accumulated since lastEmitIndex. */
  const emitPartialStroke = useCallback(() => {
    const currentPoints = pointsRef.current;
    const startIdx = Math.max(0, lastEmitIndexRef.current - 1); // overlap by 1 for smooth joining
    if (startIdx >= currentPoints.length) return;

    const segment = currentPoints.slice(startIdx);
    if (segment.length < 2) return;

    socket.current?.emit('draw:action', {
      type: 'stroke',
      points: segment,
      color: tool === 'eraser' ? '#000' : color,
      brushSize,
      tool: tool as 'pen' | 'eraser',
      strokeId: strokeIdRef.current || undefined,
      timestamp: Date.now(),
      playerId: '',
    });

    lastEmitIndexRef.current = currentPoints.length;
    lastEmitTimeRef.current = Date.now();
  }, [socket, tool, color, brushSize]);

  // Handle pointer events for drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isDrawer) return;

    const handlePointerDown = (e: PointerEvent) => {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      const point = getCanvasPoint(e);

      if (tool === 'fill') {
        saveToHistory();
        floodFill(point.x, point.y, color);
        socket.current?.emit('draw:action', {
          type: 'fill',
          points: [point],
          color,
          tool: 'fill',
          timestamp: Date.now(),
          playerId: '',
        });
        return;
      }

      isDrawingRef.current = true;
      pointsRef.current = [point];
      strokeIdRef.current = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
          });
      lastEmitIndexRef.current = 0;
      lastEmitTimeRef.current = Date.now();
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      const point = getCanvasPoint(e);
      pointsRef.current.push(point);
      drawLine(pointsRef.current.slice(-2), tool === 'eraser' ? '#000' : color, brushSize, tool === 'eraser');

      // Emit partial stroke if enough time/points have passed
      const now = Date.now();
      const newPointsSinceEmit = pointsRef.current.length - lastEmitIndexRef.current;
      if (now - lastEmitTimeRef.current >= EMIT_INTERVAL_MS && newPointsSinceEmit >= MIN_POINTS_TO_EMIT) {
        emitPartialStroke();
      }
    };

    const handlePointerUp = () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;

      if (pointsRef.current.length > 0) {
        saveToHistory();
        // Emit any remaining un-emitted points
        emitPartialStroke();
      }
      pointsRef.current = [];
      strokeIdRef.current = null;
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointerleave', handlePointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointerleave', handlePointerUp);
    };
  }, [isDrawer, tool, color, brushSize, getCanvasPoint, drawLine, floodFill, saveToHistory, socket, emitPartialStroke]);

  // Undo: restore previous canvas state from history
  const undoCanvas = useCallback(() => {
    const ctx = getCtx();
    if (!ctx || !canvasRef.current) return;
    if (historyRef.current.length > 0) {
      historyRef.current.pop(); // remove current state
    }
    if (historyRef.current.length > 0) {
      ctx.putImageData(historyRef.current[historyRef.current.length - 1], 0, 0);
    } else {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [getCtx]);

  // Listen for remote draw actions
  useEffect(() => {
    const handleDrawAction = (data: DrawAction) => {
      if (data.type === 'stroke' && data.points) {
        saveToHistory();
        drawLine(data.points, data.color || '#000', data.brushSize || 5, data.tool === 'eraser');
      } else if (data.type === 'fill' && data.points?.[0]) {
        saveToHistory();
        floodFill(data.points[0].x, data.points[0].y, data.color || '#000');
      } else if (data.type === 'clear') {
        const ctx = getCtx();
        if (ctx && canvasRef.current) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          historyRef.current = [];
        }
      } else if (data.type === 'undo') {
        undoCanvas();
      }
    };

    const unsub = on(listenEvent, handleDrawAction);

    const unsub2 = on('draw:history', (data: { actions: DrawAction[] }) => {
      data.actions.forEach(action => {
        if (action.type === 'stroke' && action.points) {
          drawLine(action.points, action.color || '#000', action.brushSize || 5, action.tool === 'eraser');
        } else if (action.type === 'fill' && action.points?.[0]) {
          floodFill(action.points[0].x, action.points[0].y, action.color || '#000');
        }
      });
    });

    return () => {
      unsub();
      unsub2();
    };
  }, [on, listenEvent, drawLine, floodFill, getCtx, saveToHistory, undoCanvas]);

  // Clear canvas only when becoming the drawer (new round starting).
  // Don't clear when isDrawer goes false (round ending) — keep the drawing visible.
  const prevIsDrawerRef = useRef(isDrawer);
  useEffect(() => {
    const wasDrawer = prevIsDrawerRef.current;
    prevIsDrawerRef.current = isDrawer;

    // Only clear when transitioning TO drawer, or on initial mount
    if (!isDrawer && wasDrawer) return; // round ended, keep drawing visible

    const ctx = getCtx();
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      historyRef.current = [];
    }
  }, [getCtx, isDrawer]);

  // Listen for reconnection history replay
  useEffect(() => {
    const handleReplay = (e: Event) => {
      const { actions } = (e as CustomEvent).detail;
      const ctx = getCtx();
      if (ctx && canvasRef.current) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        historyRef.current = [];
      }
      for (const action of actions) {
        if (action.type === 'stroke' && action.points) {
          drawLine(action.points, action.color || '#000', action.brushSize || 5, action.tool === 'eraser');
        } else if (action.type === 'fill' && action.points?.[0]) {
          floodFill(action.points[0].x, action.points[0].y, action.color || '#000');
        } else if (action.type === 'clear') {
          const ctx = getCtx();
          if (ctx && canvasRef.current) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            historyRef.current = [];
          }
        }
      }
    };
    window.addEventListener(replayEventName, handleReplay);
    return () => window.removeEventListener(replayEventName, handleReplay);
  }, [drawLine, floodFill, getCtx, replayEventName]);

  // Listen for local undo/clear (triggered by the drawer's own toolbar)
  useEffect(() => {
    if (!isDrawer) return;
    const handleLocalUndo = () => undoCanvas();
    const handleLocalClear = () => {
      const ctx = getCtx();
      if (ctx && canvasRef.current) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        historyRef.current = [];
      }
    };
    window.addEventListener('doodledraw:localUndo', handleLocalUndo);
    window.addEventListener('doodledraw:localClear', handleLocalClear);
    return () => {
      window.removeEventListener('doodledraw:localUndo', handleLocalUndo);
      window.removeEventListener('doodledraw:localClear', handleLocalClear);
    };
  }, [isDrawer, undoCanvas, getCtx]);

  // Emit canvas snapshots for bot guessing (every 5 seconds during drawing phase).
  // When human draws: human sends snapshots for bot guessers.
  // When bot draws: human guesser sends snapshots so the server can see what's on canvas.
  useEffect(() => {
    const { players, phase, drawerId } = useGameStore.getState();
    const hasBots = players.some((p) => p.isBot);
    if (!hasBots || phase !== 'drawing') return;

    // Determine if we should send snapshots:
    // 1. We are the drawer (human drawing, bot guessing)
    // 2. The drawer is a bot (bot drawing, we need to send what we see)
    const drawerIsBot = players.some((p) => p.id === drawerId && p.isBot);
    if (!isDrawer && !drawerIsBot) return;

    const interval = setInterval(() => {
      const currentPhase = useGameStore.getState().phase;
      if (currentPhase !== 'drawing') return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      // Create a smaller canvas for the snapshot (400x300).
      const snapshotCanvas = document.createElement('canvas');
      snapshotCanvas.width = 400;
      snapshotCanvas.height = 300;
      const sCtx = snapshotCanvas.getContext('2d');
      if (!sCtx) return;
      sCtx.drawImage(canvas, 0, 0, 400, 300);

      const base64 = snapshotCanvas.toDataURL('image/png');
      socket.current?.emit('canvas:snapshot', { image: base64 });
    }, 5000);

    return () => clearInterval(interval);
  }, [isDrawer, socket]);

  return (
    <div className="relative rounded-game overflow-hidden shadow-game-lg bg-white dark:bg-white">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className={cn(
          'w-full aspect-[4/3] touch-none bg-white',
          isDrawer ? 'cursor-crosshair' : 'cursor-default',
          isBlurred && 'blur-sm',
          !isDrawer && 'pointer-events-none'
        )}
      />
    </div>
  );
}
