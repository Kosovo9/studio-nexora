"use client";
import dynamic from "next/dynamic";
import {useEffect, useRef, useState} from "react";

const EarthScene = dynamic(() => import("./EarthScene"), {ssr: false});

export default function EarthCanvas() {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && 
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        ("requestIdleCallback" in window
          ? (window as any).requestIdleCallback(() => setReady(true))
          : setTimeout(() => setReady(true), 120));
        io.disconnect();
      }
    }, {rootMargin: "200px"});
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      {ready ? (
        <EarthScene />
      ) : (
        <img 
          src="/earth-fallback.svg" 
          alt="" 
          className="w-full h-full object-cover opacity-40" 
          loading="eager" 
          decoding="async"
        />
      )}
    </div>
  );
}