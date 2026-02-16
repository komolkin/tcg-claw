"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface FlipCardProps {
  front: string;
  back?: string;
  alt: string;
  className?: string;
  onFrontLoad?: () => void;
}

/**
 * A card image that flips to reveal the back on hover/tap.
 * Uses a CSS 3D transform for a smooth flip animation.
 */
export function FlipCard({ front, back, alt, className, onFrontLoad }: FlipCardProps) {
  const [tapped, setTapped] = useState(false);
  const hasBack = !!back && back !== front;

  return (
    <div
      className={cn("perspective-midrange", className)}
      onMouseEnter={() => hasBack && setTapped(true)}
      onMouseLeave={() => setTapped(false)}
      onClick={() => hasBack && setTapped((v) => !v)}
    >
      <div
        className={cn(
          "relative h-full w-full transition-transform duration-500 transform-3d",
          tapped && "rotate-y-180",
        )}
      >
        {/* Front */}
        <div className="absolute inset-0 backface-hidden">
          <Image
            src={front}
            alt={alt}
            fill
            sizes="240px"
            className="rounded-lg object-contain shadow-lg"
            draggable={false}
            priority
            onLoad={onFrontLoad}
          />
        </div>

        {/* Back */}
        {hasBack && (
          <div className="absolute inset-0 rotate-y-180 backface-hidden">
            <Image
              src={back}
              alt={`${alt} (back)`}
              fill
              sizes="240px"
              className="rounded-lg object-contain shadow-lg"
              draggable={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
