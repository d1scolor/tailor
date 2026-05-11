"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const TOP_BUFFER = 32;
const ACTIVATION_DISTANCE = 12;
const TRIGGER_DISTANCE = 74;
const MAX_PULL = 96;

type GestureState = {
  eligible: boolean;
  dragging: boolean;
  startX: number;
  startY: number;
};

const idleGesture: GestureState = {
  eligible: false,
  dragging: false,
  startX: 0,
  startY: 0
};

function hasBlockingOverlay() {
  return Boolean(document.querySelector('[role="dialog"][aria-modal="true"]')) || document.body.style.overflow === "hidden";
}

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof Element
    ? Boolean(target.closest('a, button, input, select, textarea, [role="button"], [contenteditable="true"], [data-pull-refresh-ignore="true"]'))
    : false;
}

export function PullToRefresh() {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const gestureRef = useRef<GestureState>(idleGesture);
  const distanceRef = useRef(0);

  useEffect(() => {
    if (!("ontouchstart" in window)) return;

    const pointerQuery = window.matchMedia("(pointer: coarse)");

    function resetGesture() {
      gestureRef.current = idleGesture;
      distanceRef.current = 0;
      setPullDistance(0);
    }

    function setDistance(nextDistance: number) {
      distanceRef.current = nextDistance;
      setPullDistance(nextDistance);
    }

    function onTouchStart(event: TouchEvent) {
      const touch = event.touches[0];
      if (
        !pointerQuery.matches ||
        refreshing ||
        event.touches.length !== 1 ||
        window.scrollY > TOP_BUFFER ||
        hasBlockingOverlay() ||
        isInteractiveTarget(event.target) ||
        !touch
      ) {
        resetGesture();
        return;
      }

      gestureRef.current = {
        eligible: true,
        dragging: false,
        startX: touch.clientX,
        startY: touch.clientY
      };
      setDistance(0);
    }

    function onTouchMove(event: TouchEvent) {
      const gesture = gestureRef.current;
      const touch = event.touches[0];
      if (!gesture.eligible || event.touches.length !== 1 || !touch) return;

      const deltaX = touch.clientX - gesture.startX;
      const deltaY = touch.clientY - gesture.startY;
      if (deltaY <= 0) {
        resetGesture();
        return;
      }
      if (Math.abs(deltaX) > deltaY || window.scrollY > TOP_BUFFER) return;
      if (deltaY < ACTIVATION_DISTANCE) return;

      event.preventDefault();
      gestureRef.current = { ...gesture, dragging: true };
      setDistance(Math.min(MAX_PULL, (deltaY - ACTIVATION_DISTANCE) * 0.58));
    }

    function onTouchEnd() {
      const shouldRefresh = gestureRef.current.dragging && distanceRef.current >= TRIGGER_DISTANCE;
      gestureRef.current = idleGesture;

      if (!shouldRefresh) {
        setDistance(0);
        return;
      }

      setRefreshing(true);
      setDistance(MAX_PULL);
      window.setTimeout(() => window.location.reload(), 120);
    }

    function onTouchCancel() {
      if (!refreshing) resetGesture();
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchCancel, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [refreshing]);

  if (!refreshing && pullDistance <= 0) return null;

  const progress = refreshing ? 1 : Math.min(1, pullDistance / TRIGGER_DISTANCE);

  return (
    <div
      className="pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[90] flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-primary shadow-lg"
      style={{
        opacity: Math.max(0.35, progress),
        transform: `translate3d(-50%, ${Math.max(-56, pullDistance - 64)}px, 0)`
      }}
      aria-hidden
    >
      <RefreshCw className={cn("h-5 w-5", refreshing ? "animate-spin" : undefined)} />
    </div>
  );
}
