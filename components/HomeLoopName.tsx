import type { ElementType, ReactNode } from "react";

import Heart from "@/components/Heart";

type HomeLoopNameProps = {
  as?: ElementType;
  className?: string;
  withHeart?: boolean;
  heartSize?: number;
  heartClassName?: string;
  children?: ReactNode;
};

/** Brand name with accent-colored H (same red/pink as Add Event). */
export default function HomeLoopName({
  as: Tag = "span",
  className = "",
  withHeart = false,
  heartSize = 18,
  heartClassName = "ml-2 inline-block translate-y-[-0.15em] opacity-80 animate-heart-float",
}: HomeLoopNameProps) {
  return (
    <Tag className={className}>
      <span className="text-accent">H</span>
      omeLoop
      {withHeart ? <Heart size={heartSize} className={heartClassName} /> : null}
    </Tag>
  );
}
