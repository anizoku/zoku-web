import { useRef, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useSiteConfig } from "@/hooks/useSiteConfig";

/**
 * Hook que gerencia o som de conquista.
 * - Pré-carrega o áudio customizado (se configurado pelo admin).
 * - Se não houver som customizado, usa um "plim plim" gerado via Web Audio API.
 * - Respeita a preferência do usuário (achievement_sound_enabled).
 * - Toca apenas uma vez por batch de desbloqueios.
 */
export function useAchievementSound(userEmail) {
  const audioRef = useRef(null);
  const { config } = useSiteConfig();
  const soundUrl = config?.achievement_sound_url;

  const { data: profiles } = useQuery({
    queryKey: ["user-profile-sound", userEmail],
    queryFn: () => base44.entities.UserProfile.filter({ user_email: userEmail }),
    enabled: !!userEmail,
    staleTime: 30000,
  });
  const soundEnabled = profiles?.[0]?.achievement_sound_enabled !== false;

  // Pré-carrega o áudio customizado
  useEffect(() => {
    if (!soundUrl) {
      audioRef.current = null;
      return;
    }
    const audio = new Audio();
    audio.src = soundUrl;
    audio.preload = "auto";
    audio.volume = 0.5;
    audioRef.current = audio;
    return () => { audioRef.current = null; };
  }, [soundUrl]);

  // Som padrão: "plim plim" gerado via Web Audio API (dois tons ascendentes)
  const playDefaultChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const notes = [
        { freq: 880, start: 0, dur: 0.15 },
        { freq: 1318.5, start: 0.1, dur: 0.2 },
      ];
      notes.forEach(({ freq, start, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0, now + start);
        gain.gain.linearRampToValueAtTime(0.25, now + start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + dur);
      });
      setTimeout(() => ctx.close().catch(() => {}), 600);
    } catch {}
  }, []);

  const play = useCallback(() => {
    if (!soundEnabled) return;
    if (soundUrl && audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      } catch {}
    } else {
      playDefaultChime();
    }
  }, [soundEnabled, soundUrl, playDefaultChime]);

  return { play };
}