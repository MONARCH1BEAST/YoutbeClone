"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import PremiumUpgradeButton from "@/components/PremiumUpgradeButton";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/AuthContext";
import { getUserPlan } from "@/lib/plans";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
  };
  onNextVideo?: () => void;
  onOpenComments?: () => void;
  onCloseWebsite?: () => void;
}

export default function VideoPlayer({
  video,
  onNextVideo,
  onOpenComments,
  onCloseWebsite,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const tapCountRef = useRef(0);
  const lastTapTimeRef = useRef(0);
  const gestureRegionRef = useRef<"left" | "center" | "right" | null>(null);
  const gestureTimeoutRef = useRef<number | null>(null);
  const { user } = useUser();
  const userPlan = getUserPlan(user);
  const watchLimitSeconds =
    userPlan.watchLimitMinutes === null ? null : userPlan.watchLimitMinutes * 60;
  const [limitReached, setLimitReached] = useState(false);

  const handleTimeUpdate = () => {
    const player = videoRef.current;

    if (!player || watchLimitSeconds === null) {
      return;
    }

    if (player.currentTime >= watchLimitSeconds) {
      player.currentTime = watchLimitSeconds;
      player.pause();
      setLimitReached(true);
    }
  };

  const handleSeeking = () => {
    const player = videoRef.current;

    if (!player || watchLimitSeconds === null) {
      return;
    }

    if (player.currentTime > watchLimitSeconds) {
      player.currentTime = watchLimitSeconds;
      setLimitReached(true);
    }
  };

  const resetGesture = () => {
    tapCountRef.current = 0;
    gestureRegionRef.current = null;
    if (gestureTimeoutRef.current) {
      window.clearTimeout(gestureTimeoutRef.current);
      gestureTimeoutRef.current = null;
    }
  };

  const seekBy = (seconds: number) => {
    const player = videoRef.current;
    if (!player) return;
    const target = Math.min(Math.max(0, player.currentTime + seconds), player.duration || Infinity);
    player.currentTime = target;
  };

  const togglePlayback = () => {
    const player = videoRef.current;
    if (!player) return;
    if (player.paused) {
      player.play().catch(() => {});
    } else {
      player.pause();
    }
  };

  const handleGesture = (event: React.MouseEvent<HTMLVideoElement>) => {
    const player = videoRef.current;
    if (!player) return;

    const bounds = player.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const width = bounds.width;
    const region = x < width * 0.33 ? "left" : x > width * 0.66 ? "right" : "center";
    const now = Date.now();

    if (now - lastTapTimeRef.current > 500 || gestureRegionRef.current !== region) {
      tapCountRef.current = 0;
      gestureRegionRef.current = region;
    }

    lastTapTimeRef.current = now;
    tapCountRef.current += 1;

    if (gestureTimeoutRef.current) {
      window.clearTimeout(gestureTimeoutRef.current);
    }

    gestureTimeoutRef.current = window.setTimeout(() => {
      const count = tapCountRef.current;
      const activeRegion = gestureRegionRef.current;

      if (count === 1 && activeRegion === "center") {
        togglePlayback();
      }
      if (count === 2 && activeRegion === "left") {
        seekBy(-10);
      }
      if (count === 2 && activeRegion === "right") {
        seekBy(10);
      }
      if (count === 3 && activeRegion === "center") {
        onNextVideo?.();
      }
      if (count === 3 && activeRegion === "right") {
        onCloseWebsite?.();
      }
      if (count === 3 && activeRegion === "left") {
        onOpenComments?.();
      }
      resetGesture();
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (gestureTimeoutRef.current) {
        window.clearTimeout(gestureTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        onClick={handleGesture}
        onDoubleClick={(e) => e.preventDefault()}
        onSeeking={handleSeeking}
        onTimeUpdate={handleTimeUpdate}
        poster={`/placeholder.svg?height=480&width=854`}
      >
        <source
          src={`${process.env.NEXT_PUBLIC_API_URL}/${video?.filepath}`}
          type="video/mp4"
        />
        Your browser does not support the video tag.
      </video>

      {limitReached && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6 text-center text-white">
          <div className="max-w-md space-y-4">
            <div>
              <h2 className="text-xl font-semibold">Watch limit reached</h2>
              <p className="mt-2 text-sm text-gray-200">
                Your {userPlan.name} plan allows{" "}
                {userPlan.watchLimitMinutes} minutes of video watching.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <PremiumUpgradeButton plan="gold" variant="secondary">
                Upgrade to Gold
              </PremiumUpgradeButton>
              <Button asChild variant="outline">
                <Link href="/premium">View plans</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
