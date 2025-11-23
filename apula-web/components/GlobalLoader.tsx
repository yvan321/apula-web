"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Lottie from "lottie-react";
import fireAnimation from "@/public/lottie/fire.json";

export default function GlobalLoader() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);

    const timeout = setTimeout(() => {
      setLoading(false);
    }, 500);

    return () => clearTimeout(timeout);
  }, [pathname]);

  if (!loading) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#ffffff", // white background
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 99999,
      }}
    >
      <Lottie
        animationData={fireAnimation}
        loop={true}
        autoplay={true}
        style={{
          width: 160,
          height: 160,
        }}
      />
    </div>
  );
}
