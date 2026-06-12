import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    const main = document.querySelector("main");
    if (main) {
      main.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [pathname]);
  return null;
}