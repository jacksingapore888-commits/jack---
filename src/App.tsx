/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Trophy, Clock, Target, Info, ChevronRight, Play, Zap, Award, Sparkles, AlertCircle } from 'lucide-react';

// --- Types ---

interface Color {
  h: number;
  s: number;
  l: number;
}

interface GameState {
  score: number;
  combo: number;
  maxCombo: number;
  startTime: number | null;
  elapsedTime: number;
  isPlaying: boolean;
  isGameOver: boolean;
  gridSize: number;
  rank: string;
}

// --- Constants ---

const INITIAL_GRID_SIZE = 4; // 从较小的网格开始，方便上手
const MAX_GRID_SIZE = 9;
const INITIAL_DELTA = 18; // 初始难度略低
const MIN_DELTA = 1.2;    // 大师级的极小色差

const RANKS = [
  { threshold: 0, title: "色彩萌新", description: "刚刚开始探索光谱的奥秘。" },
  { threshold: 10, title: "色调学徒", description: "正在培养对细节的敏锐洞察力。" },
  { threshold: 20, title: "色彩侦察员", description: "你的视觉已经开始变得专业化。" },
  { threshold: 35, title: "棱镜大师", description: "对光影和色彩有着卓越的敏感度。" },
  { threshold: 50, title: "光谱圣贤", description: "你能看见他人无法想象的色彩。" },
  { threshold: 70, title: "视觉艺术家", description: "已达到完美的色觉感知境界。" },
];

// --- Utils ---

const generateRandomColor = (): Color => ({
  h: Math.floor(Math.random() * 360),
  s: 30 + Math.floor(Math.random() * 50), // 30-80% 饱和度
  l: 35 + Math.floor(Math.random() * 40), // 35-75% 亮度
});

const colorToCss = (color: Color, alpha: number = 1) => 
  `hsla(${color.h}, ${color.s}%, ${color.l}%, ${alpha})`;

const getTargetColor = (base: Color, delta: number): Color => {
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

const getRank = (score: number) => {
  return [...RANKS].reverse().find(r => score >= r.threshold) || RANKS[0];
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    combo: 0,
    maxCombo: 0,
    startTime: null,
    elapsedTime: 0,
    isPlaying: false,
    isGameOver: false,
    gridSize: INITIAL_GRID_SIZE,
    rank: RANKS[0].title,
  });

  const [colors, setColors] = useState<{ base: Color; target: Color; targetIndex: number } | null>(null);
  const [lastDiff, setLastDiff] = useState<{ base: Color; target: Color; correct: boolean } | null>(null);
  const [feedback, setFeedback] = useState<{ x: number; y: number; type: 'correct' | 'wrong' } | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startNewRound = useCallback(() => {
    const base = generateRandomColor();
    // 根据得分调整难度曲线
    const currentDelta = Math.max(MIN_DELTA, INITIAL_DELTA - (gameState.score * 0.35));
    const target = getTargetColor(base, currentDelta);
    const targetIndex = Math.floor(Math.random() * (gameState.gridSize * gameState.gridSize));

    setColors({ base, target, targetIndex });
  }, [gameState.score, gameState.gridSize]);

  const startGame = () => {
    setGameState({
      score: 0,
      combo: 0,
      maxCombo: 0,
      startTime: Date.now(),
      elapsedTime: 0,
      isPlaying: true,
      isGameOver: false,
      gridSize: INITIAL_GRID_SIZE,
      rank: RANKS[0].title,
    });
    setLastDiff(null);
  };

  const stopGame = () => {
    setGameState(prev => ({ ...prev, isPlaying: false, isGameOver: true }));
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleBlockClick = (index: number, e: React.MouseEvent) => {
    if (!gameState.isPlaying || !colors) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (index === colors.targetIndex) {
      // 正确！
      setFeedback({ x: e.clientX, y: e.clientY, type: 'correct' });
      setLastDiff({ base: colors.base, target: colors.target, correct: true });
      
      setGameState(prev => {
        const newScore = prev.score + 1 + Math.floor(prev.combo / 5); // 连击奖励
        const newCombo = prev.combo + 1;
        const newMaxCombo = Math.max(prev.maxCombo, newCombo);
        
        // 动态网格缩放
        let newGridSize = prev.gridSize;
        if (newScore === 5) newGridSize = 5;
        if (newScore === 15) newGridSize = 6;
        if (newScore === 30) newGridSize = 7;
        if (newScore === 50) newGridSize = 8;

        return {
          ...prev,
          score: newScore,
          combo: newCombo,
          maxCombo: newMaxCombo,
          gridSize: newGridSize,
          rank: getRank(newScore).title
        };
      });
      
      // 自动清除反馈
      setTimeout(() => setFeedback(null), 500);
    } else {
      // 错误！
      setFeedback({ x: e.clientX, y: e.clientY, type: 'wrong' });
      setLastDiff({ base: colors.base, target: colors.target, correct: false });
      setTimeout(() => {
        setFeedback(null);
        stopGame();
      }, 400);
    }
  };

  // 计时器逻辑
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

  // 回合初始化
  useEffect(() => {
    if (gameState.isPlaying) {
      startNewRound();
    }
  }, [gameState.score, gameState.isPlaying, startNewRound]);

  const currentRank = getRank(gameState.score);

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#F5F5F0] overflow-x-hidden">
      {/* 动态背景光晕 */}
      <AnimatePresence>
        {colors && gameState.isPlaying && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.05 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-0"
            style={{ backgroundColor: colorToCss(colors.base) }}
          />
        )}
      </AnimatePresence>

      {/* 页眉 */}
      <header className="relative z-10 max-w-5xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-6 border-b border-[#141414]/10">
        <div className="flex flex-col items-center md:items-start">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-serif italic tracking-tight leading-none">色感挑战</h1>
            <div className="px-2 py-1 bg-[#141414] text-[#F5F5F0] text-[8px] font-mono uppercase tracking-widest rounded">专业版</div>
          </div>
          <p className="text-[10px] uppercase tracking-[0.3em] font-mono opacity-40 mt-3">艺术视觉敏感度评估</p>
        </div>

        <div className="flex items-center gap-10">
          <div className="flex flex-col items-center">
            <span className="text-[9px] uppercase tracking-widest font-mono opacity-40 mb-1 flex items-center gap-1">
              <Trophy size={10} /> 得分
            </span>
            <motion.span 
              key={gameState.score}
              initial={{ scale: 1.2, color: "#5A5A40" }}
              animate={{ scale: 1, color: "#141414" }}
              className="text-3xl font-mono font-medium"
            >
              {gameState.score}
            </motion.span>
          </div>
          
          <div className="flex flex-col items-center">
            <span className="text-[9px] uppercase tracking-widest font-mono opacity-40 mb-1 flex items-center gap-1">
              <Zap size={10} /> 连击
            </span>
            <motion.span 
              key={gameState.combo}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className={`text-3xl font-mono font-medium ${gameState.combo > 5 ? 'text-orange-600' : ''}`}
            >
              x{gameState.combo}
            </motion.span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[9px] uppercase tracking-widest font-mono opacity-40 mb-1 flex items-center gap-1">
              <Clock size={10} /> 用时
            </span>
            <span className="text-3xl font-mono font-medium">{gameState.elapsedTime.toFixed(1)}s</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12 flex flex-col items-center">
        {!gameState.isPlaying && !gameState.isGameOver ? (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-xl"
          >
            <div className="mb-12 p-10 border border-[#141414] rounded-[2.5rem] bg-white shadow-[12px_12px_0px_0px_rgba(20,20,20,1)] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles size={120} />
              </div>
              
              <Award className="mx-auto mb-6 text-[#5A5A40]" size={48} />
              <h2 className="text-3xl font-serif italic mb-6">大师级视觉训练</h2>
              <p className="text-base leading-relaxed opacity-60 mb-10 max-w-md mx-auto">
                专为艺术家和设计师打造的专业挑战。
                训练你的眼睛检测可见光谱中最细微的变化。
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-10 text-left">
                <div className="p-4 bg-[#F5F5F0] rounded-2xl">
                  <h4 className="text-[10px] font-mono uppercase font-bold mb-1">高精度</h4>
                  <p className="text-xs opacity-60">Delta-E 灵敏度训练，低至 1.2% 的色差。</p>
                </div>
                <div className="p-4 bg-[#F5F5F0] rounded-2xl">
                  <h4 className="text-[10px] font-mono uppercase font-bold mb-1">自适应</h4>
                  <p className="text-xs opacity-60">网格复杂度根据技能从 4x4 扩展至 9x9。</p>
                </div>
              </div>

              <button 
                onClick={startGame}
                className="group relative w-full py-5 bg-[#141414] text-[#F5F5F0] rounded-2xl flex items-center justify-center gap-3 overflow-hidden transition-all active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <Play size={20} fill="currentColor" className="relative z-10" />
                <span className="relative z-10 uppercase tracking-[0.3em] text-xs font-bold">开始评估</span>
              </button>
            </div>
            
            <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest">建议在校准过的显示器上进行</p>
          </motion.div>
        ) : (
          <div className="w-full flex flex-col lg:flex-row items-start justify-center gap-12">
            {/* 左侧：网格 */}
            <div className="w-full max-w-[540px] flex flex-col items-center">
              <div 
                className="relative aspect-square w-full p-5 bg-white border border-[#141414]/10 rounded-[3rem] shadow-2xl"
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
                      whileHover={{ scale: 0.97, zIndex: 1 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={(e) => handleBlockClick(i, e)}
                      className="w-full h-full rounded-xl transition-colors duration-200 shadow-sm"
                      style={{ 
                        backgroundColor: i === colors.targetIndex ? colorToCss(colors.target) : colorToCss(colors.base)
                      }}
                    />
                  ))}
                </div>

                {/* 反馈粒子 */}
                <AnimatePresence>
                  {feedback && (
                    <motion.div 
                      initial={{ scale: 0, opacity: 1 }}
                      animate={{ scale: 2, opacity: 0 }}
                      exit={{ opacity: 0 }}
                      className={`fixed pointer-events-none z-50 w-12 h-12 rounded-full border-4 flex items-center justify-center ${feedback.type === 'correct' ? 'border-green-500' : 'border-red-500'}`}
                      style={{ left: feedback.x - 24, top: feedback.y - 24 }}
                    >
                      {feedback.type === 'correct' ? <Sparkles className="text-green-500" /> : <AlertCircle className="text-red-500" />}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 游戏结束覆盖层 */}
                <AnimatePresence>
                  {gameState.isGameOver && (
                    <motion.div 
                      initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                      animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
                      className="absolute inset-0 z-20 flex items-center justify-center p-6 rounded-[3rem] overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-[#141414]/90" />
                      <motion.div 
                        initial={{ y: 40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="relative z-30 text-[#F5F5F0] w-full text-center"
                      >
                        <div className="mb-6 inline-flex p-4 bg-white/10 rounded-full">
                          <Award size={48} className="text-orange-400" />
                        </div>
                        <h2 className="text-4xl font-serif italic mb-2">评估报告</h2>
                        <div className="flex items-center justify-center gap-2 mb-8">
                          <div className="h-[1px] w-8 bg-white/20"></div>
                          <p className="text-[10px] opacity-60 font-mono uppercase tracking-[0.3em]">{currentRank.title}</p>
                          <div className="h-[1px] w-8 bg-white/20"></div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3 mb-10">
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                            <p className="text-[8px] uppercase opacity-40 mb-1 font-mono">得分</p>
                            <p className="text-2xl font-mono">{gameState.score}</p>
                          </div>
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                            <p className="text-[8px] uppercase opacity-40 mb-1 font-mono">最高连击</p>
                            <p className="text-2xl font-mono">{gameState.maxCombo}</p>
                          </div>
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                            <p className="text-[8px] uppercase opacity-40 mb-1 font-mono">总用时</p>
                            <p className="text-2xl font-mono">{gameState.elapsedTime.toFixed(0)}s</p>
                          </div>
                        </div>

                        <button 
                          onClick={startGame}
                          className="w-full py-5 bg-[#F5F5F0] text-[#141414] rounded-2xl flex items-center justify-center gap-3 hover:bg-white transition-all active:scale-95 font-bold uppercase tracking-widest text-xs"
                        >
                          <RefreshCw size={18} />
                          开启新会话
                        </button>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <div className="mt-8 flex items-center gap-4 w-full">
                <div className="flex-1 h-1 bg-[#141414]/5 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-[#141414]"
                    animate={{ width: `${Math.min(100, (gameState.score / 70) * 100)}%` }}
                  />
                </div>
                <span className="text-[9px] font-mono opacity-40 uppercase tracking-widest">晋升至 {RANKS.find(r => r.threshold > gameState.score)?.title || "最高等级"} 的进度</span>
              </div>
            </div>

            {/* 右侧：分析 */}
            <div className="w-full lg:w-[380px] space-y-8">
              {/* 头衔卡片 */}
              <div className="bg-white p-8 rounded-[2rem] border border-[#141414]/5 shadow-sm relative overflow-hidden">
                <div className="absolute -top-4 -right-4 opacity-[0.03]">
                  <Trophy size={120} />
                </div>
                <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] opacity-40 mb-4">当前头衔</h3>
                <h4 className="text-2xl font-serif italic mb-2">{currentRank.title}</h4>
                <p className="text-xs opacity-50 leading-relaxed">{currentRank.description}</p>
              </div>

              {/* 差异分析 */}
              <div className="bg-white p-8 rounded-[2rem] border border-[#141414]/5 shadow-sm">
                <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] opacity-40 mb-6 flex items-center gap-2">
                  <Target size={14} /> 色彩差异分析
                </h3>
                
                {lastDiff ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex -space-x-6">
                        <motion.div 
                          key={`base-${gameState.score}`}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          className="w-20 h-20 rounded-full border-4 border-white shadow-xl z-10" 
                          style={{ backgroundColor: colorToCss(lastDiff.base) }} 
                        />
                        <motion.div 
                          key={`target-${gameState.score}`}
                          initial={{ x: 20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          className="w-20 h-20 rounded-full border-4 border-white shadow-xl" 
                          style={{ backgroundColor: colorToCss(lastDiff.target) }} 
                        />
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[8px] font-mono uppercase tracking-widest ${lastDiff.correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {lastDiff.correct ? '捕捉成功' : '未能识别'}
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-[#141414]/5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono opacity-40 uppercase">色相偏移</span>
                        <span className="text-xs font-mono font-bold">{Math.abs(lastDiff.base.h - lastDiff.target.h).toFixed(1)}°</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono opacity-40 uppercase">饱和度</span>
                        <span className="text-xs font-mono font-bold">{Math.abs(lastDiff.base.s - lastDiff.target.s).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono opacity-40 uppercase">亮度</span>
                        <span className="text-xs font-mono font-bold">{Math.abs(lastDiff.base.l - lastDiff.target.l).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-[#141414]/5 rounded-3xl">
                    <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest">等待数据捕获...</p>
                  </div>
                )}
              </div>

              {/* 引擎参数 */}
              <div className="bg-[#141414] text-[#F5F5F0] p-8 rounded-[2rem] shadow-xl">
                <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] opacity-40 mb-6">引擎参数</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] font-mono opacity-40 uppercase">当前精度 Delta</span>
                    <span className="text-sm font-mono text-orange-400">
                      {Math.max(MIN_DELTA, INITIAL_DELTA - (gameState.score * 0.35)).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] font-mono opacity-40 uppercase">网格密度</span>
                    <span className="text-sm font-mono">{gameState.gridSize}x{gameState.gridSize}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] font-mono opacity-40 uppercase">调色模式</span>
                    <span className="text-sm font-mono">HSL 自适应</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 页脚 */}
      <footer className="relative z-10 max-w-5xl mx-auto px-6 py-16 border-t border-[#141414]/10 flex flex-col md:flex-row justify-between items-center gap-8 opacity-30">
        <div className="flex flex-col items-center md:items-start gap-2">
          <p className="text-[10px] uppercase tracking-[0.4em] font-mono font-bold">色彩视觉实验室</p>
          <p className="text-[8px] font-mono">标准化色彩敏感度评估系统 v1.2.4</p>
        </div>
        <div className="flex gap-10">
          <a href="#" className="text-[9px] uppercase tracking-widest font-mono hover:opacity-100 transition-opacity border-b border-transparent hover:border-current">方法论</a>
          <a href="#" className="text-[9px] uppercase tracking-widest font-mono hover:opacity-100 transition-opacity border-b border-transparent hover:border-current">校准指南</a>
          <a href="#" className="text-[9px] uppercase tracking-widest font-mono hover:opacity-100 transition-opacity border-b border-transparent hover:border-current">隐私政策</a>
        </div>
      </footer>
    </div>
  );
}
