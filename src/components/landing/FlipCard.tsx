"use client";

import { useState } from "react";
import Image from "next/image";

export function FlipCard({ image, title, description }: { image: string; title: string; description: string }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setFlipped((f) => !f)}
      className="relative h-56 w-full [perspective:1000px] text-left"
      aria-label={`${title} — toca para ver más`}
    >
      <div
        className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]"
        style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        <div className="glass absolute inset-0 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 [backface-visibility:hidden]">
          <div className="relative h-24 w-24">
            <Image src={image} alt={title} fill sizes="96px" className="object-contain" />
          </div>
          <p className="text-sm font-semibold text-center">{title}</p>
        </div>
        <div
          className="glass-strong absolute inset-0 rounded-2xl p-4 flex items-center justify-center text-center [backface-visibility:hidden]"
          style={{ transform: "rotateY(180deg)" }}
        >
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </button>
  );
}
