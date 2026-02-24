/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Heart } from 'lucide-react';

// --- Constants & Assets ---

const ASSETS = {
  player: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMzIgNEwyMCAyOEwzMiAyMkw0NCAyOEwzMiA0WiIgZmlsbD0iIzBlYTVlOSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBhdGggZD0iTTMyIDIyTDI0IDQwSDQwTzMyIDIyWiIgZmlsbD0iIzM4YmRmOCIvPjxwYXRoIGQ9Ik0xOCA0MkwxMCA1MEwyMCA0OEwxOCA0MlpNNDYgNDJMNjAgNTBMODEgNDhMNDYgNDJaIiBmaWxsPSIjMjc2YWY1Ii8+PC9zdmc+',
  enemy: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMzIgNjBMMjAgMzZMMzIgNDJMMTQgMzZMMzIgNjBaIiBmaWxsPSIjZjg3MTcxIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiLz48cGF0aCBkPSJNMzIgNDJMMjQgMjRINDBMMzIgNDJaIiBmaWxsPSIjZmJiZjI0Ii8+PHBhdGggZD0iTTE4IDIyTDEwIDE0TDIwIDE2TDE4IDIyWk00NiAyMkw2MCAxNEw4MCAxNkw0NiAyMloiIGZpbGw9IiNjMDg0ZmMiLz48L3N2Zz4='
};

interface Star {
  x: number;
  y: number;
  s: number;
}

interface Bullet {
  x: number;
  y: number;
}

class Player {
  x: number;
  y: number;
  w: number = 60;
  h: number = 60;
  speed: number = 8;
  invincibility: number = 0;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.x = canvasWidth / 2;
    this.y = canvasHeight - 120;
  }

  update(keys: Record<string, boolean>, canvasWidth: number, canvasHeight: number) {
    if (keys['w'] || keys['ArrowUp']) this.y -= this.speed;
    if (keys['s'] || keys['ArrowDown']) this.y += this.speed;
    if (keys['a'] || keys['ArrowLeft']) this.x -= this.speed;
    if (keys['d'] || keys['ArrowRight']) this.x += this.speed;
    
    this.x = Math.max(30, Math.min(canvasWidth - 30, this.x));
    this.y = Math.max(30, Math.min(canvasHeight - 30, this.y));
    
    if (this.invincibility > 0) this.invincibility--;
  }

  draw(ctx: CanvasRenderingContext2D, playerImg: HTMLImageElement) {
    if (this.invincibility % 6 > 3) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    // 引擎火光
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath(); 
    ctx.moveTo(-8, 25); 
    ctx.lineTo(0, 25 + Math.random() * 15); 
    ctx.lineTo(8, 25); 
    ctx.fill();
    // 绘制主机
    ctx.drawImage(playerImg, -this.w / 2, -this.h / 2, this.w, this.h);
    ctx.restore();
  }
}

class Enemy {
  x: number;
  y: number;
  w: number = 50;
  h: number = 50;
  speed: number;

  constructor(canvasWidth: number, level: number) {
    this.x = Math.random() * (canvasWidth - 60) + 30;
    this.y = -60;
    this.speed = 3 + Math.random() * 2 + level * 0.5;
  }

  update() {
    this.y += this.speed;
  }

  draw(ctx: CanvasRenderingContext2D, enemyImg: HTMLImageElement) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.drawImage(enemyImg, -this.w / 2, -this.h / 2, this.w, this.h);
    ctx.restore();
  }
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameActive, setGameActive] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);

  // Refs for game objects to avoid re-renders during loop
  const playerRef = useRef<Player | null>(null);
  const enemiesRef = useRef<Enemy[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const starsRef = useRef<Star[]>([]);
  const keysRef = useRef<Record<string, boolean>>({});
  const lastShootTimeRef = useRef(0);
  const imagesRef = useRef<Record<string, HTMLImageElement>>({});

  // Initialize images
  useEffect(() => {
    Object.entries(ASSETS).forEach(([key, src]) => {
      const img = new Image();
      img.src = src;
      imagesRef.current[key] = img;
    });
  }, []);

  const handleResize = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  const startGame = () => {
    setScore(0);
    setLives(3);
    setLevel(1);
    setIsGameOver(false);
    setGameActive(true);
    
    const canvas = canvasRef.current;
    if (canvas) {
      playerRef.current = new Player(canvas.width, canvas.height);
    }
    enemiesRef.current = [];
    bulletsRef.current = [];
    lastShootTimeRef.current = 0;
  };

  const gameOver = useCallback(() => {
    setGameActive(false);
    setIsGameOver(true);
  }, []);

  // Game Loop
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Stars background
      if (starsRef.current.length < 100) {
        starsRef.current.push({
          x: Math.random() * canvas.width,
          y: -10,
          s: Math.random() * 2 + 1
        });
      }
      
      ctx.fillStyle = "#fff";
      starsRef.current.forEach((s, i) => {
        s.y += s.s;
        ctx.fillRect(s.x, s.y, s.s, s.s);
        if (s.y > canvas.height) starsRef.current.splice(i, 1);
      });

      if (gameActive && playerRef.current) {
        const player = playerRef.current;
        const keys = keysRef.current;

        // Update & Draw Player
        player.update(keys, canvas.width, canvas.height);
        if (imagesRef.current.player) {
          player.draw(ctx, imagesRef.current.player);
        }

        // Shooting logic
        if (keys[' '] || keys['isTouch']) {
          const now = Date.now();
          if (now - lastShootTimeRef.current > 150) {
            bulletsRef.current.push({ x: player.x, y: player.y - 30 });
            lastShootTimeRef.current = now;
          }
        }

        // Bullets
        bulletsRef.current.forEach((b, i) => {
          b.y -= 12;
          ctx.fillStyle = "#38bdf8";
          ctx.fillRect(b.x - 2, b.y, 4, 15);
          
          if (b.y < 0) {
            bulletsRef.current.splice(i, 1);
            return;
          }
          
          enemiesRef.current.forEach((e, ei) => {
            if (Math.hypot(b.x - e.x, b.y - e.y) < 25) {
              setScore(prev => prev + 100);
              bulletsRef.current.splice(i, 1);
              enemiesRef.current.splice(ei, 1);
            }
          });
        });

        // Enemy Spawning
        if (Math.random() < 0.02 + level * 0.01) {
          enemiesRef.current.push(new Enemy(canvas.width, level));
        }

        // Enemies
        enemiesRef.current.forEach((e, i) => {
          e.update();
          if (imagesRef.current.enemy) {
            e.draw(ctx, imagesRef.current.enemy);
          }
          
          if (e.y > canvas.height) {
            enemiesRef.current.splice(i, 1);
            return;
          }

          // Collision detection
          if (player.invincibility <= 0 && Math.hypot(e.x - player.x, e.y - player.y) < 40) {
            setLives(prev => {
              const next = prev - 1;
              if (next <= 0) {
                gameOver();
              }
              return next;
            });
            player.invincibility = 100;
            enemiesRef.current.splice(i, 1);
          }
        });

        // Level up logic
        setLevel(Math.floor(score / 2000) + 1);
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    loop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameActive, level, score, gameOver]);

  // Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keysRef.current[e.key] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current[e.key] = false; };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    keysRef.current['isTouch'] = true;
    const t = e.touches[0];
    if (playerRef.current) {
      playerRef.current.x = t.clientX;
      playerRef.current.y = t.clientY - 60;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (playerRef.current) {
      playerRef.current.x = t.clientX;
      playerRef.current.y = t.clientY - 60;
    }
  };

  const handleTouchEnd = () => {
    keysRef.current['isTouch'] = false;
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#020617] font-['Orbitron',_sans-serif] text-slate-200 select-none touch-none">
      <canvas 
        ref={canvasRef} 
        className="absolute top-0 left-0 w-full h-full block"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* HUD */}
      {gameActive && (
        <div className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl">
            <div className="text-[10px] text-sky-400 font-bold uppercase tracking-widest">Score</div>
            <div className="text-3xl font-bold tabular-nums">{score}</div>
          </div>
          <div className="flex gap-2 text-rose-500 text-2xl pt-2">
            {Array.from({ length: lives }).map((_, i) => (
              <Heart key={i} fill="currentColor" size={24} />
            ))}
          </div>
        </div>
      )}

      {/* Start Screen */}
      {!gameActive && !isGameOver && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
          <div className="bg-white/5 backdrop-blur-md border border-white/20 p-12 rounded-[2.5rem] text-center max-w-sm w-full">
            <h1 className="text-6xl font-black mb-2 bg-gradient-to-b from-white to-sky-500 bg-clip-text text-transparent italic tracking-tighter">JACK</h1>
            <p className="text-sky-300 tracking-[0.4em] mb-10 text-xs font-bold uppercase">星际先锋</p>
            <button 
              onClick={startGame}
              className="px-12 py-4 bg-sky-600 hover:bg-sky-500 rounded-full font-bold transition-all shadow-lg shadow-sky-500/25 active:scale-95"
            >
              启动引擎
            </button>
          </div>
        </div>
      )}

      {/* Game Over Overlay */}
      {isGameOver && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-10 rounded-[3rem] text-center max-w-sm w-full mx-4">
            <h2 className="text-4xl font-black mb-6 tracking-tight">GAME OVER</h2>
            <div className="text-5xl font-bold text-sky-400 mb-8 tabular-nums">{score}</div>
            <button 
              onClick={startGame}
              className="w-full py-4 bg-white text-slate-950 rounded-2xl font-black hover:bg-sky-400 transition-colors active:scale-95"
            >
              再来一次
            </button>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
      `}</style>
    </div>
  );
}
