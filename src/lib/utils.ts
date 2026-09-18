import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** window.location.origin alone drops the GitHub Pages base path (e.g. /approve-pixel-flow/). */
export function reviewLinkFor(shareToken: string) {
  return `${window.location.origin}${import.meta.env.BASE_URL}review/${shareToken}`;
}
