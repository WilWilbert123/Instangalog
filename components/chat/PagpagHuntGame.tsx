'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Zap, Play, RotateCcw, Send, Flame, Sparkles, Award } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { getAvatarUrl, getCartoonAvatar } from '@/lib/utils/avatar';

interface PagpagHuntGameProps {
  onBroadcastMessage?: (msg: string) => void;
}

interface TargetItem {
  id: string;
  x: number; // percentage 5..85
  y: number; // percentage 10..80
  type: 'normal' | 'gold' | 'spicy';
  points: number;
  size: number;
  rotation: number;
}

interface ClickParticle {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
}

interface LeaderboardEntry {
  userId?: string;
  username: string;
  displayName: string;
  score: number;
  avatar: string;
}

export function PagpagHuntGame({ onBroadcastMessage }: PagpagHuntGameProps) {
  const { user, openAuthModal } = useAuthStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [combo, setCombo] = useState(0);
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const [targets, setTargets] = useState<TargetItem[]>([]);
  const [particles, setParticles] = useState<ClickParticle[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const lastTapTimeRef = useRef<number>(0);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const userId = user?.id;

  // Fetch real leaderboard & user high score from Supabase API on mount
  useEffect(() => {
    fetch('/api/game/leaderboard')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success) {
          const list = (data.leaderboard || []) as LeaderboardEntry[];
          setLeaderboard(list);

          // Find current logged-in user score in Supabase leaderboard
          if (userId) {
            const userRecord = list.find((item) => item.userId === userId || item.username === user?.username);
            if (userRecord) {
              setHighScore(userRecord.score);
            } else {
              setHighScore(0);
            }
          } else {
            setHighScore(0);
          }
        }
      })
      .catch(() => {});
  }, [userId, user?.username]);

  // Update highscore if user beats it in current session
  useEffect(() => {
    setHighScore((prev) => (score > prev ? score : prev));
  }, [score]);

  // Main game loop timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isPlaying && timeLeft === 0) {
      setIsPlaying(false);
      setGameOver(true);
      setTargets([]);

      // Submit score to Supabase DB & update leaderboard if signed in
      if (userId) {
        fetch('/api/game/leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, score }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data?.leaderboard) {
              setLeaderboard(data.leaderboard);
            }
            if (data?.personalHighScore) {
              setHighScore(data.personalHighScore);
            }
          })
          .catch(() => {});
      }
    }
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft, score, userId]);

  // Spawn targets periodically
  useEffect(() => {
    let spawnTimer: NodeJS.Timeout;
    if (isPlaying) {
      spawnTimer = setInterval(() => {
        spawnNewTarget();
      }, 650);
    }
    return () => clearInterval(spawnTimer);
  }, [isPlaying]);

  const spawnNewTarget = () => {
    setTargets((prev) => {
      if (prev.length >= 7) return prev; // Limit active targets to 7

      const rand = Math.random();
      let type: 'normal' | 'gold' | 'spicy' = 'normal';
      let points = 10;
      let size = 56;

      if (rand > 0.85) {
        type = 'gold';
        points = 50;
        size = 64;
      } else if (rand > 0.7) {
        type = 'spicy';
        points = 25;
        size = 60;
      }

      const newTarget: TargetItem = {
        id: `pagpag-${Date.now()}-${Math.random()}`,
        x: Math.floor(Math.random() * 75) + 8,
        y: Math.floor(Math.random() * 70) + 10,
        type,
        points,
        size,
        rotation: Math.floor(Math.random() * 60) - 30,
      };

      return [...prev, newTarget];
    });
  };

  const handleStartGame = () => {
    setScore(0);
    setTimeLeft(30);
    setCombo(0);
    setComboMultiplier(1);
    setGameOver(false);
    setBroadcastSent(false);
    setTargets([]);
    setIsPlaying(true);
    spawnNewTarget();
  };

  const handleTargetClick = (target: TargetItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isPlaying) return;

    const now = Date.now();
    const diff = now - lastTapTimeRef.current;
    lastTapTimeRef.current = now;

    let newCombo = combo;
    let newMult = comboMultiplier;

    if (diff < 700) {
      newCombo = combo + 1;
      if (newCombo >= 10) newMult = 3;
      else if (newCombo >= 5) newMult = 2;
    } else {
      newCombo = 1;
      newMult = 1;
    }

    setCombo(newCombo);
    setComboMultiplier(newMult);

    const addedPoints = target.points * newMult;
    setScore((prev) => prev + addedPoints);

    // Remove clicked target
    setTargets((prev) => prev.filter((t) => t.id !== target.id));

    // Spawn floating particle
    const rect = gameAreaRef.current?.getBoundingClientRect();
    const posX = e.clientX - (rect?.left || 0);
    const posY = e.clientY - (rect?.top || 0);

    const particleText =
      target.type === 'gold'
        ? `+${addedPoints} GOLD!`
        : target.type === 'spicy'
        ? `+${addedPoints} SPICY!`
        : `+${addedPoints}`;

    const particleColor =
      target.type === 'gold'
        ? 'text-amber-400 font-extrabold'
        : target.type === 'spicy'
        ? 'text-rose-500 font-extrabold'
        : 'text-emerald-400 font-bold';

    const pId = `p-${Date.now()}-${Math.random()}`;
    setParticles((prev) => [...prev, { id: pId, x: posX, y: posY, text: particleText, color: particleColor }]);

    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== pId));
    }, 800);
  };

  const handleBroadcastScore = () => {
    if (!onBroadcastMessage) return;
    const name = user?.display_name || 'A player';
    onBroadcastMessage(`${name} just scored ${score} PTS in Pagpag Hunt Arcade! Can you beat it?`);
    setBroadcastSent(true);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-white p-4 md:p-6 overflow-y-auto">
      {/* Header Banner */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center p-1 shadow-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pagpag.png" alt="Pagpag Logo" className="w-full h-full object-contain scale-110" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-wide text-white flex items-center gap-2">
              Pagpag Hunt Arcade
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                Tap Game
              </span>
            </h2>
            <p className="text-xs text-slate-400">Tap spawning Pagpag pieces fast to earn mega combo points!</p>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4 text-xs font-bold">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>High: <span className="text-amber-400">{highScore}</span></span>
          </div>
        </div>
      </div>

      {/* Main Arcade Arena */}
      <div className="my-4 flex-1 flex flex-col min-h-[360px] relative rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 overflow-hidden shadow-2xl">
        {/* Game HUD Bar */}
        <div className="px-6 py-3 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Score</span>
              <p className="text-2xl font-black text-amber-400 leading-none">{score}</p>
            </div>

            {combo > 1 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 animate-pulse">
                <Flame className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-extrabold text-rose-300">{combo}x COMBO ({comboMultiplier}x PTS)!</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Time</span>
            <div className={`px-3 py-1 rounded-xl font-black text-sm border ${timeLeft <= 5 ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-ping' : 'bg-slate-800 border-slate-700 text-emerald-400'}`}>
              {timeLeft}s
            </div>
          </div>
        </div>

        {/* Floating Game Canvas */}
        <div
          ref={gameAreaRef}
          className="flex-1 relative w-full h-full cursor-crosshair select-none overflow-hidden"
        >
          {/* Subtle grid pattern background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20" />

          {!isPlaying && !gameOver && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm p-6 text-center">
              <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4 shadow-lg animate-bounce">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/pagpag.png" alt="Pagpag" className="w-16 h-16 object-contain" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">Ready to Hunt Pagpag?</h3>
              <p className="text-xs text-slate-400 max-w-sm mb-6">
                Tap as many Pagpags as you can in 30 seconds! Look out for Golden (+50) & Spicy (+25) Pagpags.
              </p>
              <button
                onClick={handleStartGame}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-sm shadow-xl shadow-amber-500/20 flex items-center gap-2 transform transition hover:scale-105 active:scale-95"
              >
                <Play className="w-5 h-5 fill-black" />
                START ARCADE GAME
              </button>
            </div>
          )}

          {gameOver && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md p-6 text-center animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-3">
                <Trophy className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="text-2xl font-black text-white">Time's Up!</h3>
              <p className="text-xs text-slate-400 mt-1">Final Score</p>
              <div className="text-5xl font-black text-amber-400 my-2">{score} <span className="text-sm font-bold text-slate-400">PTS</span></div>

              {score >= highScore && score > 0 && (
                <div className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" /> NEW PERSONAL HIGH SCORE!
                </div>
              )}

              {!user && (
                <button
                  onClick={() => openAuthModal('Sign in to save your score to the global Supabase leaderboard!')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold mb-4 hover:border-amber-400 transition"
                >
                  Sign in to save score to global leaderboard! 🏆
                </button>
              )}

              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={handleStartGame}
                  className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 border border-slate-700 transition"
                >
                  <RotateCcw className="w-4 h-4" /> PLAY AGAIN
                </button>

                {onBroadcastMessage && (
                  <button
                    onClick={handleBroadcastScore}
                    disabled={broadcastSent}
                    className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-2 shadow-lg disabled:opacity-50 transition"
                  >
                    <Send className="w-4 h-4" />
                    {broadcastSent ? 'Broadcasted to Chat!' : 'Broadcast to Chat'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Render Active Spawning Pagpags */}
          {isPlaying &&
            targets.map((target) => (
              <button
                key={target.id}
                onClick={(e) => handleTargetClick(target, e)}
                style={{
                  left: `${target.x}%`,
                  top: `${target.y}%`,
                  width: `${target.size}px`,
                  height: `${target.size}px`,
                  transform: `rotate(${target.rotation}deg)`,
                }}
                className={`absolute z-10 transition-transform hover:scale-125 active:scale-95 flex items-center justify-center p-1 rounded-2xl ${
                  target.type === 'gold'
                    ? 'bg-amber-500/20 border-2 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.6)] animate-pulse'
                    : target.type === 'spicy'
                    ? 'bg-rose-500/20 border-2 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.6)] animate-bounce'
                    : 'bg-slate-800/40 border border-amber-500/30 shadow-md'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/pagpag.png" alt="Pagpag target" className="w-full h-full object-contain" />
              </button>
            ))}

          {/* Floating score text particles */}
          {particles.map((p) => (
            <div
              key={p.id}
              style={{ left: `${p.x}px`, top: `${p.y}px` }}
              className={`absolute z-30 pointer-events-none text-sm animate-floatUp ${p.color}`}
            >
              {p.text}
            </div>
          ))}
        </div>
      </div>

      {/* Arcade Leaderboard Section */}
      <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60">
        <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3 flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" /> Pagpag Arcade Leaderboard
        </h4>
        {leaderboard.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-3">
            No live scores recorded yet. Be the first to play and claim the #1 spot!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {leaderboard.map((item, idx) => {
              const nameToShow = item.displayName || (item as any).display_name || 'Player';
              const avatarSrc = getAvatarUrl(item.avatar, item.username);
              return (
                <div
                  key={`${item.username}-${idx}`}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${
                      idx === 0 ? 'bg-amber-500 text-black' : idx === 1 ? 'bg-slate-300 text-black' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-700 bg-slate-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={avatarSrc}
                        alt={nameToShow}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = getCartoonAvatar(item.username);
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-200">{nameToShow}</span>
                  </div>
                  <span className="text-xs font-black text-amber-400">{item.score} PTS</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
