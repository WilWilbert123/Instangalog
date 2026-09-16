'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Flag, Play, RotateCcw, Send, Flame, Zap, Trophy, Award, ArrowLeft, ArrowRight, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { getAvatarUrl, getCartoonAvatar } from '@/lib/utils/avatar';
import { sendRaceProgressBroadcast } from '@/lib/services/chatService';

interface PagpagRaceGameProps {
  onBroadcastMessage?: (msg: string) => void;
}

interface PixelCar {
  id: string;
  name: string;
  avatar: string;
  lane: number; // 0, 1, 2, 3
  progress: number; // 0..100%
  speed: number;
  isUser: boolean;
  carColor: string; // Tailwind class
  accentColor: string;
  turboTime: number;
}

interface SpawningPagpag {
  id: string;
  lane: number;
  y: number; // percentage 0..100 down the screen
}

interface RaceLeaderboardEntry {
  userId: string;
  username: string;
  displayName: string;
  bestTime: number;
  winsCount: number;
  racesCount: number;
  avatar: string;
}

const CAR_STYLES = [
  { carColor: 'bg-red-600 border-red-400', accentColor: 'bg-yellow-400' }, // Red Racer
  { carColor: 'bg-blue-600 border-blue-400', accentColor: 'bg-white' },    // Blue Racer
  { carColor: 'bg-emerald-600 border-emerald-400', accentColor: 'bg-yellow-300' }, // Green Racer
  { carColor: 'bg-slate-900 border-amber-400', accentColor: 'bg-amber-400' }, // Black/Gold Racer
];

export function PagpagRaceGame({ onBroadcastMessage }: PagpagRaceGameProps) {
  const { user, openAuthModal } = useAuthStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [raceTime, setRaceTime] = useState(0);
  const [bestTime, setBestTime] = useState<number | null>(null);
  const [speedMph, setSpeedMph] = useState(0);
  const [userLane, setUserLane] = useState(1); // 0, 1, 2, 3
  const [userTurbo, setUserTurbo] = useState(false);
  const [spawningPagpags, setSpawningPagpags] = useState<SpawningPagpag[]>([]);
  const [placements, setPlacements] = useState<PixelCar[]>([]);
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [viewTab, setViewTab] = useState<'race' | 'leaderboard'>('race');
  const [leaderboard, setLeaderboard] = useState<RaceLeaderboardEntry[]>([]);

  const userId = user?.id;
  const startTimeRef = useRef<number>(0);
  const lastBroadcastRef = useRef<number>(0);

  const [cars, setCars] = useState<PixelCar[]>([
    { id: 'user', name: user?.display_name || 'You (Pagpag Car)', avatar: user?.avatar_url || '', lane: 1, progress: 0, speed: 0, isUser: true, carColor: CAR_STYLES[0].carColor, accentColor: CAR_STYLES[0].accentColor, turboTime: 0 },
    { id: 'ai-1', name: 'Mang Boy (Red Flash)', avatar: '', lane: 0, progress: 0, speed: 1.8, isUser: false, carColor: CAR_STYLES[1].carColor, accentColor: CAR_STYLES[1].accentColor, turboTime: 0 },
    { id: 'ai-2', name: 'Chooks Master', avatar: '', lane: 2, progress: 0, speed: 1.6, isUser: false, carColor: CAR_STYLES[2].carColor, accentColor: CAR_STYLES[2].accentColor, turboTime: 0 },
    { id: 'ai-3', name: 'Boses Ng Masa', avatar: '', lane: 3, progress: 0, speed: 1.4, isUser: false, carColor: CAR_STYLES[3].carColor, accentColor: CAR_STYLES[3].accentColor, turboTime: 0 },
  ]);

  // Fetch real Supabase race leaderboard on mount
  useEffect(() => {
    fetch('/api/game/race-leaderboard')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success) {
          const list = (data.leaderboard || []) as RaceLeaderboardEntry[];
          setLeaderboard(list);

          if (userId) {
            const userRecord = list.find((r) => r.userId === userId || r.username === user?.username);
            if (userRecord && userRecord.bestTime < 900) {
              setBestTime(userRecord.bestTime);
            }
          }
        }
      })
      .catch(() => { });
  }, [userId, user?.username]);

  // Keyboard controls for Steering and Acceleration
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || isFinished) return;

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        setUserLane((prev) => Math.max(0, prev - 1));
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        setUserLane((prev) => Math.min(3, prev + 1));
      } else if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        handleAccelerate();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, isFinished]);

  // Spawning Pagpags on the race track
  useEffect(() => {
    let spawnInterval: NodeJS.Timeout;
    if (isPlaying && !isFinished) {
      spawnInterval = setInterval(() => {
        setSpawningPagpags((prev) => {
          if (prev.length >= 4) return prev;
          const randomLane = Math.floor(Math.random() * 4);
          const newItem: SpawningPagpag = {
            id: `pagpag-${Date.now()}-${Math.random()}`,
            lane: randomLane,
            y: 0,
          };
          return [...prev, newItem];
        });
      }, 1200);
    }
    return () => clearInterval(spawnInterval);
  }, [isPlaying, isFinished]);

  // Main 2D Racing & Physics loop
  useEffect(() => {
    let animId: number;

    if (isPlaying && !isFinished) {
      const updatePhysics = () => {
        const now = Date.now();
        const elapsed = (now - startTimeRef.current) / 1000;
        setRaceTime(elapsed);

        // Move spawning Pagpags down the road
        setSpawningPagpags((prev) => {
          const updated = prev.map((p) => ({ ...p, y: p.y + 2.5 })).filter((p) => p.y <= 100);

          // Check if User car hits a Pagpag on the track!
          const userCarPos = cars.find((c) => c.isUser);
          if (userCarPos) {
            const hitIndex = updated.findIndex(
              (p) => p.lane === userLane && p.y >= 70 && p.y <= 90
            );

            if (hitIndex >= 0) {
              // Trigger PAGPAG TURBO BOOST!
              setUserTurbo(true);
              setSpeedMph((prevSpeed) => Math.min(240, prevSpeed + 60));
              setTimeout(() => setUserTurbo(false), 2000);
              updated.splice(hitIndex, 1);
            }
          }

          return updated;
        });

        // Update car positions
        setCars((prev) => {
          let winnerFound = false;

          const nextCars = prev.map((car) => {
            if (car.isUser) {
              const turboBoost = userTurbo ? 0.07 : 0;
              const newProgress = Math.min(100, car.progress + 0.08 + turboBoost);
              if (newProgress >= 100) winnerFound = true;
              return { ...car, lane: userLane, progress: newProgress };
            } else {
              const randomBoost = Math.random() * 0.015;
              const newProgress = Math.min(100, car.progress + car.speed + randomBoost);
              if (newProgress >= 100) winnerFound = true;
              return { ...car, progress: newProgress };
            }
          });

          // Check finish condition
          const finishedList = nextCars.filter((c) => c.progress >= 100);
          if (finishedList.length > 0 || winnerFound) {
            setIsFinished(true);
            setIsPlaying(false);

            const sorted = [...nextCars].sort((a, b) => b.progress - a.progress);
            setPlacements(sorted);

            const userPos = sorted.findIndex((c) => c.isUser) + 1;

            if (userId) {
              fetch('/api/game/race-leaderboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, raceTime: elapsed, placement: userPos }),
              })
                .then((res) => res.json())
                .then((data) => {
                  if (data?.leaderboard) setLeaderboard(data.leaderboard);
                  if (data?.personalBestTime) {
                    setBestTime((prev) => (prev === null || data.personalBestTime < prev ? data.personalBestTime : prev));
                  }
                })
                .catch(() => { });
            }
          }

          // Broadcast live race progress to online chatters via WebSockets
          if (now - lastBroadcastRef.current > 400 && userId) {
            lastBroadcastRef.current = now;
            const userCar = nextCars.find((c) => c.isUser);
            if (userCar) {
              sendRaceProgressBroadcast({
                userId,
                displayName: user?.display_name || 'Racer',
                lane: userLane,
                progress: userCar.progress,
                speedMph,
                avatarUrl: user?.avatar_url,
              });
            }
          }

          return nextCars;
        });

        if (!isFinished) {
          animId = requestAnimationFrame(updatePhysics);
        }
      };

      animId = requestAnimationFrame(updatePhysics);
    }

    return () => cancelAnimationFrame(animId);
  }, [isPlaying, isFinished, userLane, userTurbo, speedMph, userId, user?.avatar_url, user?.display_name, cars]);

  const handleStartRace = () => {
    const freshUserRacerName = user?.display_name || 'You (Pagpag Car)';
    setUserLane(1);
    setUserTurbo(false);
    setCars([
      { id: 'user', name: freshUserRacerName, avatar: user?.avatar_url || '', lane: 1, progress: 0, speed: 0, isUser: true, carColor: CAR_STYLES[0].carColor, accentColor: CAR_STYLES[0].accentColor, turboTime: 0 },
      { id: 'ai-1', name: 'Mang Boy (Red Flash)', avatar: '', lane: 0, progress: 0, speed: 0.082 + Math.random() * 0.01, isUser: false, carColor: CAR_STYLES[1].carColor, accentColor: CAR_STYLES[1].accentColor, turboTime: 0 },
      { id: 'ai-2', name: 'Chooks Master', avatar: '', lane: 2, progress: 0, speed: 0.078 + Math.random() * 0.01, isUser: false, carColor: CAR_STYLES[2].carColor, accentColor: CAR_STYLES[2].accentColor, turboTime: 0 },
      { id: 'ai-3', name: 'Boses Ng Masa', avatar: '', lane: 3, progress: 0, speed: 0.074 + Math.random() * 0.01, isUser: false, carColor: CAR_STYLES[3].carColor, accentColor: CAR_STYLES[3].accentColor, turboTime: 0 },
    ]);
    setSpeedMph(40);
    setRaceTime(0);
    setIsFinished(false);
    setBroadcastSent(false);
    setSpawningPagpags([]);
    startTimeRef.current = Date.now();
    setIsPlaying(true);
  };

  const handleAccelerate = () => {
    if (!isPlaying || isFinished) return;
    setSpeedMph((prev) => Math.min(220, prev + 8));
    setCars((prev) =>
      prev.map((c) => (c.isUser ? { ...c, progress: Math.min(100, c.progress + 0.45) } : c))
    );
  };

  const userRank = placements.findIndex((c) => c.isUser) + 1;

  const handleBroadcastRace = () => {
    if (!onBroadcastMessage) return;
    const name = user?.display_name || 'A racer';
    const rankText = userRank === 1 ? '1st Place' : userRank === 2 ? '2nd Place' : '3rd Place';
    onBroadcastMessage(`${name} placed ${rankText} in the Pagpag Pixel Car Race with a time of ${raceTime.toFixed(2)}s!`);
    setBroadcastSent(true);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-white p-4 md:p-6 overflow-y-auto font-mono">
      {/* Race Header Banner */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center p-1 shadow-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pagpag.png" alt="Pagpag Logo" className="w-full h-full object-contain scale-110" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-wide text-white flex items-center gap-2">
              Pagpag 2D Pixel Race
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/40 uppercase tracking-widest">
                2D Highway Arcade
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-sans">Steer left/right & hit spawning Pagpags on the highway for TURBO speed!</p>
          </div>
        </div>

        {/* Best Time & Navigation Tabs */}
        <div className="flex items-center gap-3">
          {bestTime !== null && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-400 text-xs font-bold">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Best: {bestTime.toFixed(2)}s</span>
            </div>
          )}

          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewTab('race')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${viewTab === 'race' ? 'bg-orange-500 text-black shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Race Track
            </button>
            <button
              onClick={() => setViewTab('leaderboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${viewTab === 'leaderboard' ? 'bg-orange-500 text-black shadow' : 'text-slate-400 hover:text-white'}`}
            >
              <Award className="w-3.5 h-3.5" /> Rankings
            </button>
          </div>
        </div>
      </div>

      {viewTab === 'race' ? (
        /* Top-Down 2D Highway Pixel Race Canvas */
        <div className="my-4 flex-1 flex flex-col min-h-[420px] rounded-2xl border-2 border-slate-800 bg-emerald-900/40 overflow-hidden shadow-2xl relative">
          {/* Dashboard HUD */}
          <div className="px-6 py-2.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between z-20">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Timer</span>
                <p className="text-lg font-black text-amber-400 font-mono leading-none">{raceTime.toFixed(2)}s</p>
              </div>

              <div>
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Speedometer</span>
                <p className="text-lg font-black text-cyan-400 font-mono leading-none">{speedMph} <span className="text-xs font-normal">MPH</span></p>
              </div>
            </div>

            {userTurbo && (
              <div className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-400 text-xs font-black animate-pulse flex items-center gap-1">
                <Flame className="w-4 h-4 text-rose-500" /> PAGPAG TURBO BOOST!
              </div>
            )}
          </div>

          {/* Vertical 2D Highway Arena (Matching User Image Spec) */}
          <div className="flex-1 relative w-full h-full flex justify-center bg-emerald-800 overflow-hidden select-none">
            {/* Left & Right Grass Verges */}
            <div className="w-8 md:w-16 h-full bg-emerald-700 border-r-4 border-emerald-900 z-10" />

            {/* Asphalt 4-Lane Road */}
            <div className="flex-1 max-w-md h-full bg-slate-800 relative border-r-4 border-l-4 border-slate-900 shadow-2xl flex">
              {/* Red & White Checkered Curbstone Left */}
              <div className="w-3 h-full bg-[repeating-linear-gradient(to_bottom,#ef4444_0,#ef4444_16px,#ffffff_16px,#ffffff_32px)] border-r border-slate-900" />

              {/* Highway Lanes Area */}
              <div className="flex-1 h-full relative grid grid-cols-4 divide-x-2 divide-dashed divide-slate-400/30">
                {/* Lane 1, 2, 3, 4 Background Lines */}
                <div className="h-full relative overflow-hidden">
                  <div className={`absolute inset-0 bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_20px,#ffffff_20px,#ffffff_40px)] opacity-20 ${isPlaying ? 'animate-equalizer' : ''}`} />
                </div>
                <div className="h-full relative overflow-hidden" />
                <div className="h-full relative overflow-hidden" />
                <div className="h-full relative overflow-hidden" />

                {/* Render Spawning Collectible Pagpags on Highway */}
                {spawningPagpags.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      left: `${(p.lane * 25) + 4}%`,
                      top: `${p.y}%`,
                    }}
                    className="absolute z-20 w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/50 p-1 flex items-center justify-center animate-bounce shadow-[0_0_12px_rgba(251,191,36,0.5)] pointer-events-none"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/pagpag.png" alt="Pagpag Turbo Boost" className="w-full h-full object-contain" />
                  </div>
                ))}

                {/* Render 4 Pixel Cars on Road */}
                {cars.map((car) => {
                  const lanePercent = car.lane * 25 + 2.5;
                  const yPositionPercent = car.isUser ? 75 : Math.max(10, 80 - car.progress * 0.7);

                  return (
                    <div
                      key={car.id}
                      style={{
                        left: `${lanePercent}%`,
                        top: `${yPositionPercent}%`,
                      }}
                      className="absolute z-30 transition-all duration-100 flex flex-col items-center"
                    >
                      {/* Name badge */}
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${car.isUser ? 'bg-amber-400 text-black' : 'bg-slate-900 text-slate-300'} mb-0.5 shadow shrink-0 whitespace-nowrap`}>
                        {car.name}
                      </span>

                      {/* Top-Down Pixel Sports Car Frame */}
                      <div className={`w-8 h-14 rounded-lg ${car.carColor} border-2 p-0.5 relative flex flex-col items-center justify-between shadow-2xl ${car.isUser && userTurbo ? 'shadow-[0_0_20px_#f43f5e] border-amber-300' : ''}`}>
                        {/* Front Windshield */}
                        <div className="w-6 h-3 bg-slate-950 rounded-xs border border-slate-700 mt-1" />

                        {/* Center Racing Stripe */}
                        <div className={`w-2 h-6 ${car.accentColor} rounded-xs`} />

                        {/* Rear Windshield */}
                        <div className="w-6 h-2 bg-slate-950 rounded-xs border border-slate-700 mb-1" />

                        {/* Turbo Flame Exhaust if User Turbo Active */}
                        {car.isUser && userTurbo && (
                          <div className="w-4 h-5 bg-gradient-to-t from-rose-500 to-amber-400 rounded-b-md absolute -bottom-4 animate-bounce" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Red & White Checkered Curbstone Right */}
              <div className="w-3 h-full bg-[repeating-linear-gradient(to_bottom,#ef4444_0,#ef4444_16px,#ffffff_16px,#ffffff_32px)] border-l border-slate-900" />
            </div>

            {/* Left & Right Grass Verges */}
            <div className="w-8 md:w-16 h-full bg-emerald-700 border-l-4 border-emerald-900 z-10" />
          </div>

          {/* Steer & Accelerate Controls Bar */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 z-20 flex flex-col sm:flex-row items-center justify-between gap-3">
            {!isPlaying && !isFinished && (
              <button
                onClick={handleStartRace}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 text-black font-black text-base shadow-xl flex items-center justify-center gap-2 transition transform active:scale-95"
              >
                <Play className="w-5 h-5 fill-black" /> START 2D CAR RACE
              </button>
            )}

            {isPlaying && (
              <div className="w-full flex items-center justify-between gap-3">
                {/* Steering Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setUserLane((prev) => Math.max(0, prev - 1))}
                    disabled={userLane === 0}
                    className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-800 text-white font-black flex items-center gap-1 active:scale-95 transition"
                  >
                    <ArrowLeft className="w-5 h-5" /> LEFT
                  </button>
                  <button
                    onClick={() => setUserLane((prev) => Math.min(3, prev + 1))}
                    disabled={userLane === 3}
                    className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-800 text-white font-black flex items-center gap-1 active:scale-95 transition"
                  >
                    RIGHT <ArrowRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Accelerate Sprint Pedal */}
                <button
                  onClick={handleAccelerate}
                  className="flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-black font-black text-sm shadow-xl flex items-center justify-center gap-2 transition transform active:scale-95 animate-pulse"
                >
                  <Zap className="w-5 h-5 fill-black" /> SPRINT FAST!
                </button>
              </div>
            )}

            {isFinished && (
              <div className="w-full flex flex-col items-center p-3 rounded-xl bg-slate-900 border border-slate-800 text-center animate-fadeIn font-sans">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-1">
                  <Trophy className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-base font-black text-white font-mono">Race Finished!</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  You finished <span className="font-bold text-amber-400">{userRank === 1 ? '1st Place' : userRank === 2 ? '2nd Place' : '3rd Place'}</span> in <span className="text-white font-mono">{raceTime.toFixed(2)}s</span>!
                </p>

                {!user && (
                  <button
                    onClick={() => openAuthModal('Sign in to save your best race time to the Supabase leaderboard!')}
                    className="mt-2 px-4 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold hover:border-amber-400 transition"
                  >
                    Sign in to save race record to global leaderboard! 🏆
                  </button>
                )}

                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={handleStartRace}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 border border-slate-700 transition"
                  >
                    <RotateCcw className="w-4 h-4" /> RACE AGAIN
                  </button>

                  {onBroadcastMessage && (
                    <button
                      onClick={handleBroadcastRace}
                      disabled={broadcastSent}
                      className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-bold text-xs flex items-center gap-2 shadow-lg disabled:opacity-50 transition"
                    >
                      <Send className="w-4 h-4" />
                      {broadcastSent ? 'Victory Sent to Chat!' : 'Broadcast Victory'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Supabase Real Race Rankings */
        <div className="my-4 flex-1 p-4 rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-col font-sans">
          <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-4 flex items-center gap-2 font-mono">
            <Award className="w-4 h-4 text-amber-400" /> Fastest Pagpag Racers (Supabase DB)
          </h4>

          {leaderboard.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">
              No live race records yet. Be the first to win a race and claim the #1 best time!
            </p>
          ) : (
            <div className="space-y-2.5 overflow-y-auto flex-1">
              {leaderboard.map((item, idx) => {
                const nameToShow = item.displayName || item.username || 'Racer';
                const avatarSrc = getAvatarUrl(item.avatar, item.username);
                return (
                  <div
                    key={`${item.username}-${idx}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center font-mono ${idx === 0 ? 'bg-amber-500 text-black' : idx === 1 ? 'bg-slate-300 text-black' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'
                        }`}>
                        {idx + 1}
                      </span>
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-700 bg-slate-800">
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
                      <div>
                        <h5 className="text-xs font-bold text-slate-200">{nameToShow}</h5>
                        <p className="text-[10px] text-slate-500">{item.winsCount} Wins • {item.racesCount} Races</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-black text-amber-400">{item.bestTime.toFixed(2)}s</span>
                      <span className="block text-[9px] text-slate-500 uppercase">Best Time</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
