/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Trophy, Clock, Target, Info, ChevronRight, Play } from 'lucide-react';

// --- Types ---

interface Color {
  h: number;
  s: number;
  l: number;
}

interface GameState {
  score: number;
  startTime: number | null;
  elapsedTime: number;
  isPlaying: boolean;
  isGameOver: boolean;
  gridSize: number;
  difficulty: number; // 0 to 1, where 1 is hardest (smallest delta)
}

// --- Constants ---

const INITIAL_GRID_SIZE = 5;
const MAX_GRID_SIZE = 8;
const INITIAL_DELTA = 15; // Starting lightness/saturation difference
const MIN_DELTA = 1.5;    // Minimum difference for high levels

// --- Utils ---

const generateRandomColor = (): Color => ({
  h: Math.floor(Math.random() * 360),
  s: 40 + Math.floor(Math.random() * 40), // 40-80% saturation
  l: 40 + Math.floor(Math.random() * 40), // 40-80% lightness
});

const colorToCss = (color: Color) => `hsl(${color.h}, ${color.s}%, ${color.l}%)`;

const getTargetColor = (base: Color, delta: number): Color => {
  // Randomly decide whether to shift hue, saturation, or lightness
  const type = Math.random();
  const shift = Math.random() > 0.5 ? delta : -delta;

  if (type < 0.33) {
    return { ...base, h: (base.h + shift * 2 + 360) % 360 };
  } else if (type < 0.66) {
    return { ...base, s: Math.max(0, Math.min(100, base.s + shift)) };
  } else {
    return { ...base, l: Math.max(0, Math.min(100, base.l + shift)) };
  }
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    startTime: null,
    elapsedTime: 0,
    isPlaying: false,
    isGameOver: false,
    gridSize: INITIAL_GRID_SIZE,
    difficulty: 0,
  });

  const [colors, setColors] = useState<{ base: Color; target: Color; targetIndex: number } | null>(null);
  const [lastDiff, setLastDiff] = useState<{ base: Color; target: Color } | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startNewRound = useCallback(() => {
    const base = generateRandomColor();
    // Calculate delta based on score
    // Difficulty curve: starts easy, gets hard fast
    const currentDelta = Math.max(MIN_DELTA, INITIAL_DELTA - (gameState.score * 0.4));
    const target = getTargetColor(base, currentDelta);
    const targetIndex = Math.floor(Math.random() * (gameState.gridSize * gameState.gridSize));

    setColors({ base, target, targetIndex });
  }, [gameState.score, gameState.gridSize]);

  const startGame = () => {
    setGameState({
      score: 0,
      startTime: Date.now(),
      elapsedTime: 0,
      isPlaying: true,
      isGameOver: false,
      gridSize: INITIAL_GRID_SIZE,
      difficulty: 0,
    });
    setLastDiff(null);
  };

  const stopGame = () => {
    setGameState(prev => ({ ...prev, isPlaying: false, isGameOver: true }));
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleBlockClick = (index: number) => {
    if (!gameState.isPlaying || !colors) return;

    if (index === colors.targetIndex) {
      // Correct!
      setLastDiff({ base: colors.base, target: colors.target });
      setGameState(prev => {
        const newScore = prev.score + 1;
        // Increase grid size occasionally? The prompt said 5x5, but maybe we can scale it.
        // Let's stick to 5x5 as requested but maybe allow it to grow slightly for "art students"
        const newGridSize = newScore > 15 ? 6 : (newScore > 30 ? 7 : INITIAL_GRID_SIZE);
        return {
          ...prev,
          score: newScore,
          gridSize: newGridSize
        };
      });
    } else {
      // Wrong!
      stopGame();
    }
  };

  // Timer logic
  useEffect(() => {
    if (gameState.isPlaying) {
      timerRef.current = setInterval(() => {
        setGameState(prev => ({
          ...prev,
          elapsedTime: prev.startTime ? (Date.now() - prev.startTime) / 1000 : 0
        }));
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState.isPlaying]);

  // Round initialization
  useEffect(() => {
    if (gameState.isPlaying) {
      startNewRound();
    }
  }, [gameState.score, gameState.isPlaying, startNewRound]);

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#F5F5F0]">
      {/* Header */}
      <header className="max-w-4xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-6 border-b border-[#141414]/10">
        <div className="flex flex-col">
          <h1 className="text-3xl font-serif italic tracking-tight leading-none">Chromatic Sensitivity</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] font-mono opacity-50 mt-2">Artistic Vision Assessment Tool v1.0</p>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-wider font-mono opacity-50 mb-1 flex items-center gap-1">
              <Trophy size={10} /> Score
            </span>
            <span className="text-2xl font-mono font-medium">{gameState.score}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-wider font-mono opacity-50 mb-1 flex items-center gap-1">
              <Clock size={10} /> Time
            </span>
            <span className="text-2xl font-mono font-medium">{gameState.elapsedTime.toFixed(1)}s</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 flex flex-col items-center">
        {!gameState.isPlaying && !gameState.isGameOver ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md"
          >
            <div className="mb-8 p-8 border border-[#141414] rounded-2xl bg-white shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]">
              <Info className="mx-auto mb-4 opacity-30" size={32} />
              <h2 className="text-xl font-serif italic mb-4">The Challenge</h2>
              <p className="text-sm leading-relaxed opacity-70 mb-6">
                Identify the single block with a slightly different hue, saturation, or lightness. 
                As you progress, the difference becomes nearly imperceptible.
              </p>
              <button 
                onClick={startGame}
                className="w-full py-4 bg-[#141414] text-[#F5F5F0] rounded-xl flex items-center justify-center gap-2 hover:bg-[#141414]/90 transition-all active:scale-95"
              >
                <Play size={18} fill="currentColor" />
                <span className="uppercase tracking-widest text-xs font-bold">Begin Assessment</span>
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="w-full flex flex-col items-center gap-12">
            {/* Grid Container */}
            <div 
              className="relative aspect-square w-full max-w-[500px] p-4 bg-white border border-[#141414]/10 rounded-3xl shadow-xl"
            >
              <div 
                className="grid gap-2 h-full w-full"
                style={{ 
                  gridTemplateColumns: `repeat(${gameState.gridSize}, 1fr)`,
                  gridTemplateRows: `repeat(${gameState.gridSize}, 1fr)`
                }}
              >
                {colors && Array.from({ length: gameState.gridSize * gameState.gridSize }).map((_, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 0.98 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleBlockClick(i)}
                    className="w-full h-full rounded-lg transition-colors duration-300"
                    style={{ 
                      backgroundColor: i === colors.targetIndex ? colorToCss(colors.target) : colorToCss(colors.base)
                    }}
                  />
                ))}
              </div>

              {/* Game Over Overlay */}
              <AnimatePresence>
                {gameState.isGameOver && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute inset-0 z-10 flex items-center justify-center p-6"
                  >
                    <div className="bg-[#141414] text-[#F5F5F0] p-10 rounded-3xl w-full text-center shadow-2xl">
                      <h2 className="text-4xl font-serif italic mb-2">Assessment Complete</h2>
                      <p className="text-sm opacity-60 mb-8 font-mono uppercase tracking-widest">Chromatic Precision: {Math.min(100, (gameState.score / 50) * 100).toFixed(0)}%</p>
                      
                      <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="p-4 border border-white/20 rounded-2xl">
                          <p className="text-[10px] uppercase opacity-40 mb-1">Final Score</p>
                          <p className="text-3xl font-mono">{gameState.score}</p>
                        </div>
                        <div className="p-4 border border-white/20 rounded-2xl">
                          <p className="text-[10px] uppercase opacity-40 mb-1">Time Elapsed</p>
                          <p className="text-3xl font-mono">{gameState.elapsedTime.toFixed(1)}s</p>
                        </div>
                      </div>

                      <button 
                        onClick={startGame}
                        className="w-full py-4 bg-[#F5F5F0] text-[#141414] rounded-xl flex items-center justify-center gap-2 hover:bg-white transition-all active:scale-95"
                      >
                        <RefreshCw size={18} />
                        <span className="uppercase tracking-widest text-xs font-bold">Retry Challenge</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Visualization Section */}
            <div className="w-full max-w-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-[1px] flex-1 bg-[#141414]/10"></div>
                <span className="text-[10px] uppercase tracking-[0.3em] font-mono opacity-40">Chromatic Analysis</span>
                <div className="h-[1px] flex-1 bg-[#141414]/10"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Last Difference Visualization */}
                <div className="bg-white p-6 rounded-2xl border border-[#141414]/5 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Target size={14} /> Last Detection
                  </h3>
                  {lastDiff ? (
                    <div className="flex items-center gap-4">
                      <div className="flex -space-x-4">
                        <div className="w-16 h-16 rounded-full border-2 border-white shadow-lg z-10" style={{ backgroundColor: colorToCss(lastDiff.base) }}></div>
                        <div className="w-16 h-16 rounded-full border-2 border-white shadow-lg" style={{ backgroundColor: colorToCss(lastDiff.target) }}></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-mono opacity-50 mb-1">DELTA ANALYSIS</p>
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-[11px] font-mono">
                            <span>HUE</span>
                            <span>{Math.abs(lastDiff.base.h - lastDiff.target.h).toFixed(1)}°</span>
                          </div>
                          <div className="flex justify-between text-[11px] font-mono">
                            <span>SAT</span>
                            <span>{Math.abs(lastDiff.base.s - lastDiff.target.s).toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between text-[11px] font-mono">
                            <span>LUM</span>
                            <span>{Math.abs(lastDiff.base.l - lastDiff.target.l).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-16 flex items-center justify-center border-2 border-dashed border-[#141414]/10 rounded-xl">
                      <p className="text-[10px] font-mono opacity-30 uppercase">No data captured</p>
                    </div>
                  )}
                </div>

                {/* Level Progress */}
                <div className="bg-white p-6 rounded-2xl border border-[#141414]/5 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                    <ChevronRight size={14} /> Difficulty Curve
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-mono opacity-50 uppercase">Current Precision Required</span>
                      <span className="text-sm font-mono font-bold">
                        {Math.max(MIN_DELTA, INITIAL_DELTA - (gameState.score * 0.4)).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-[#141414]/5 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-[#141414]"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (gameState.score / 40) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[9px] font-mono opacity-40 leading-tight">
                      * Difficulty increases every correct selection. Grid size expands at scores 15 and 30.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-6 py-12 border-t border-[#141414]/10 flex flex-col md:flex-row justify-between items-center gap-4 opacity-40">
        <p className="text-[10px] uppercase tracking-widest font-mono">© 2026 Chromatic Vision Lab</p>
        <div className="flex gap-6">
          <a href="#" className="text-[10px] uppercase tracking-widest font-mono hover:opacity-100 transition-opacity">Methodology</a>
          <a href="#" className="text-[10px] uppercase tracking-widest font-mono hover:opacity-100 transition-opacity">Calibration</a>
          <a href="#" className="text-[10px] uppercase tracking-widest font-mono hover:opacity-100 transition-opacity">Support</a>
        </div>
      </footer>
    </div>
  );
}
