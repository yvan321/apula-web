"use client";

import { useEffect } from "react";

const ThemeClient = () => {
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const nextTheme = stored === "light" || stored === "dark" ? stored : "dark";
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  return null;
};

export default ThemeClient;
