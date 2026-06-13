"use client";

import { useRef, useEffect } from "react";

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (video.duration && video.currentTime >= video.duration * 0.7) {
        video.pause();
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#05070f]">

      <div className="absolute top-0 inset-x-0 h-[10vh] bg-black z-40 pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-[10vh] bg-black z-40 pointer-events-none" />

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 80%, #0d0f20 0%, #05070f 60%)",
        }}
      />

      <div
        className="absolute inset-x-0 bottom-0 z-10 pointer-events-none"
        style={{
          height: "60%",
          background:
            "radial-gradient(ellipse 30% 50% at 50% 100%, rgba(255, 110, 30, 0.18) 0%, rgba(255, 60, 0, 0.06) 40%, transparent 70%)",
        }}
      />

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-20"
        style={{
          mixBlendMode: "screen",
          objectPosition: "center center",
        }}
      >
        <source src="/videos/hero.mp4" type="video/mp4" />
      </video>

      <div
        className="absolute top-0 inset-x-0 z-30 pointer-events-none"
        style={{
          height: "35%",
          background: "linear-gradient(to bottom, #05070f 0%, transparent 100%)",
        }}
      />

      <div
        className="absolute bottom-0 inset-x-0 z-30 pointer-events-none"
        style={{
          height: "40%",
          background: "linear-gradient(to top, #05070f 0%, transparent 100%)",
        }}
      />

      <div
        className="absolute inset-0 z-30 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 75% 80% at 50% 50%, transparent 40%, rgba(5, 7, 15, 0.75) 100%)",
        }}
      />

    </div>
  );
}