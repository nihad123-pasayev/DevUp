import confetti from "canvas-confetti";

const COLORS = ["#0B72F5", "#162136", "#5AA9FF", "#FFFFFF", "#1B7F4B"];

export function playCelebration() {
  // səs
  try {
    const sound = new Audio("../../public/sounds/success");
    sound.volume = 0.7;
    sound.play().catch(() => {});
  } catch {
    /* ignore */
  }

  // pəncərənin sol və sağ kənarlarından confetti (təxminən 3.5 saniyə)
  const end = Date.now() + 3500;
  const frame = () => {
    const base = {
      particleCount: 4,
      spread: 60,
      startVelocity: 55,
      colors: COLORS,
      zIndex: 3000,
      disableForReducedMotion: true,
    };
    confetti({ ...base, angle: 60, origin: { x: 0, y: 0.8 } });
    confetti({ ...base, angle: 120, origin: { x: 1, y: 0.8 } });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}