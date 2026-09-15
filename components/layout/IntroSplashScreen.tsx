'use client';

import React, { useEffect, useState } from 'react';

export function IntroSplashScreen() {
  const [show, setShow] = useState(true);
  const [animateText, setAnimateText] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Stage 1: Logo falls from top to center
    const textTimer = setTimeout(() => {
      setAnimateText(true);
    }, 700);

    // Stage 2: Hold intro screen briefly then fade out
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 2400);

    // Stage 3: Unmount intro overlay completely
    const removeTimer = setTimeout(() => {
      setShow(false);
    }, 3100);

    return () => {
      clearTimeout(textTimer);
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black transition-opacity duration-700 pointer-events-none ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center justify-center space-y-6">
        {/* Animated Falling Pagpag Logo */}
        <div className="w-32 h-32 sm:w-44 sm:h-44 relative animate-intro-fall drop-shadow-[0_10px_25px_rgba(234,88,12,0.4)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pagpag.png"
            alt="Pagpag Logo"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Animated PAGPAG Text Banner */}
        <div className="h-14 flex items-center justify-center overflow-hidden">
          {animateText && (
            <div className="flex items-center text-4xl sm:text-6xl font-extrabold tracking-widest uppercase">
              <span className="text-orange-500 animate-slide-left drop-shadow-md">
                PAG
              </span>
              <span className="text-white animate-slide-right drop-shadow-md">
                PAG
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
