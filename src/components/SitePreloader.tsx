"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { LoadingScreen } from "@/components/LoadingScreen";

type PreloaderPhase = "loading" | "exiting" | "done";

const MIN_REVEAL_MS = 680;
const SAFETY_CAP_MS = 12000;

export function SitePreloader() {
  const pathname = usePathname();
  const { hydrated, workspaceReady, locale } = useApp();

  const [phase, setPhase] = useState<PreloaderPhase>("loading");
  const [progress, setProgress] = useState<number>(8);
  const [statusIndex, setStatusIndex] = useState<number>(0);

  const mountedAtRef = useRef<number | null>(null);
  const readyRef = useRef<boolean>(false);
  const finishingRef = useRef<boolean>(false);

  const requiresWorkspace = pathname === "/" || pathname === "/admin";
  const isRouteReady = requiresWorkspace
    ? hydrated && workspaceReady
    : hydrated;

  useEffect(() => {
    readyRef.current = isRouteReady;
  }, [isRouteReady]);

  useEffect(() => {
    if (phase !== "loading") return;

    if (mountedAtRef.current === null) {
      mountedAtRef.current = performance.now();
    }

    let rafId = 0;
    let exitTimer: ReturnType<typeof setTimeout> | null = null;
    let doneTimer: ReturnType<typeof setTimeout> | null = null;

    const statusTimer = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % 3);
    }, 1700);

    const tick = (now: number) => {
      const start = mountedAtRef.current ?? now;
      const elapsed = now - start;
      const ready = readyRef.current || elapsed >= SAFETY_CAP_MS;

      if (ready && elapsed >= MIN_REVEAL_MS) {
        if (!finishingRef.current) {
          finishingRef.current = true;
          setProgress(100);
          exitTimer = setTimeout(() => {
            setPhase("exiting");
            doneTimer = setTimeout(() => {
              setPhase("done");
            }, 680);
          }, 180);
        }
        return;
      }

      setProgress((prev) => {
        // Fast initial climb to ~62%, then smooth asymptotic easing toward 92%
        const target = ready ? 96 : elapsed < 600 ? 62 : 92;
        const step = ready ? 0.18 : elapsed < 600 ? 0.09 : 0.025;
        const next = prev + (target - prev) * step;
        return Math.min(96, Math.max(prev, next));
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(statusTimer);
      if (exitTimer) clearTimeout(exitTimer);
      if (doneTimer) clearTimeout(doneTimer);
    };
  }, [phase]);

  if (phase === "done") {
    return null;
  }

  const messages =
    locale === "ar"
      ? [
          "تهيئة الفضاء الخاص...",
          "اتصال آمن ومشفر...",
          "مزامنة بيانات الإقامة...",
        ]
      : [
          "Initialisation de l'espace...",
          "Connexion sécurisée...",
          "Synchronisation des données...",
        ];

  return (
    <LoadingScreen
      overlay
      exiting={phase === "exiting"}
      progress={progress}
      locale={locale}
      statusText={messages[statusIndex]}
    />
  );
}
