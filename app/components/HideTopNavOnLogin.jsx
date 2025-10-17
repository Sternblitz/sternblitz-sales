"use client";
import { usePathname } from "next/navigation";

export default function HideTopNavOnLogin({ children }) {
  const pathname = usePathname();
  if (pathname === "/login") return null;
  return children;
}
