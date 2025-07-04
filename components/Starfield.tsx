import React, { useRef, useEffect } from "react";

interface Star {
  x: number;
  y: number;
  z: number;
  o: number;
}

export interface StarfieldProps {
  isSpeaking: boolean;
  startupMode?: boolean;
}

const STAR_COUNT = 300;
const SPEED_IDLE = 0.4;
const SPEED_SPEAKING = 1;
// Eliminado SPEED_STARTUP y VIBRATE_STARTUP
const VIBRATE_INTENSITY = 2.5; // vibración leve sólo cuando habla

export const Starfield: React.FC<StarfieldProps> = ({ isSpeaking, startupMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const stars = useRef<Star[]>([]);
  // Suavizado de velocidad y vibración
  const animState = useRef({
    speed: SPEED_IDLE,
    vibrate: 0,
  });

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const w = canvasRef.current.width = window.innerWidth;
    const h = canvasRef.current.height = window.innerHeight;

    // Init stars (menos concentración en el centro)
    const CENTER_RADIUS = 240;
    stars.current = Array.from({ length: STAR_COUNT }, () => {
      let x, y, tries = 0;
      do {
        x = Math.random() * w - w/2;
        y = Math.random() * h - h/2;
        tries++;
        // Si cae en el centro, hay 85% de probabilidad de rechazarla
        if (Math.sqrt(x * x + y * y) < CENTER_RADIUS && Math.random() < 0.85) continue;
        break;
      } while (tries < 10);
      return {
        x,
        y,
        z: Math.random() * w,
        o: 0.5 + Math.random() * 0.5
      };
    });

    // Estrella fugaz curva y elegante
    let shootingStar = null;
    let shootingStarTimeout = null;
    function launchShootingStar() {
      // Solo esquinas, nunca por el centro
      const corners = [
        { x: -60, y: -60, cx: w*0.2, cy: h*0.2, ex: w*0.3, ey: h*0.1 }, // arriba izq
        { x: w+60, y: -60, cx: w*0.8, cy: h*0.2, ex: w*0.7, ey: h*0.1 }, // arriba der
        { x: -60, y: h+60, cx: w*0.2, cy: h*0.8, ex: w*0.3, ey: h*0.9 }, // abajo izq
        { x: w+60, y: h+60, cx: w*0.8, cy: h*0.8, ex: w*0.7, ey: h*0.9 }, // abajo der
      ];
      const route = corners[Math.floor(Math.random()*corners.length)];
      shootingStar = {
        t: 0,
        duration: 120 + Math.random()*50,
        ...route
      };
      shootingStarTimeout = setTimeout(launchShootingStar, 4000 + Math.random() * 7000);
    }
    launchShootingStar();

    function draw() {
      ctx.clearRect(0, 0, w, h);
      // Target speed and vibrate
      let targetSpeed = SPEED_IDLE;
      let targetVibrate = 0;
      // Eliminado el modo startupMode (viaje dimensional)
      if (isSpeaking) {
        targetSpeed = SPEED_SPEAKING;
        targetVibrate = VIBRATE_INTENSITY;
      }
      // Suavizado
      animState.current.speed += (targetSpeed - animState.current.speed) * 0.12;
      animState.current.vibrate += (targetVibrate - animState.current.vibrate) * 0.14;
      for (let i = 0; i < STAR_COUNT; i++) {
        let star = stars.current[i];
        star.z -= animState.current.speed;
        if (star.z <= 0) {
          // Reubicar evitando el centro
          let x, y;
          do {
            x = Math.random() * w - w/2;
            y = Math.random() * h - h/2;
          } while (Math.sqrt(x * x + y * y) < 120);
          star.x = x;
          star.y = y;
          star.z = w;
        }
        let k = 128.0 / star.z;
        let sx = star.x * k + w/2;
        let sy = star.y * k + h/2;
        let r = (1 - star.z / w) * 2.5 + (startupMode ? 2.5 : 0.5);
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, 2 * Math.PI);
        // Colores variados para nebulosa
        const starColors = [
          [180,220,255], // azul-blanco
          [120,180,255], // azul
          [200,160,255], // violeta
          [255,200,255], // rosa
          [180,255,255], // cian
          [255,255,255], // blanco
        ];
        const colorIdx = i % starColors.length;
        const [rC,gC,bC] = starColors[colorIdx];
        ctx.fillStyle = `rgba(${rC},${gC},${bC},${star.o})`;
        ctx.shadowColor = `rgba(${rC},${gC},${bC},0.7)`;
        ctx.shadowBlur = isSpeaking || startupMode ? 18 : 8;
        ctx.fill();
      }
      // Dibuja estrella fugaz curva y elegante
      if (shootingStar && shootingStar.t <= 1) {
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = '#fff';
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 20;
        ctx.lineWidth = 3.2;
        // Movimiento curvo (cuadrática de Bezier), trazo más largo
        const t = shootingStar.t;
        const x = (1-t)*(1-t)*shootingStar.x + 2*(1-t)*t*shootingStar.cx + t*t*shootingStar.ex;
        const y = (1-t)*(1-t)*shootingStar.y + 2*(1-t)*t*shootingStar.cy + t*t*shootingStar.ey;
        // Calcula punto anterior para el trazo
        const prevT = t - 0.12;
        const px = (1-prevT)*(1-prevT)*shootingStar.x + 2*(1-prevT)*prevT*shootingStar.cx + prevT*prevT*shootingStar.ex;
        const py = (1-prevT)*(1-prevT)*shootingStar.y + 2*(1-prevT)*prevT*shootingStar.cy + prevT*prevT*shootingStar.ey;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.restore();
        // Shadow más vistoso
        ctx.shadowBlur = 32;
        shootingStar.t += 1/shootingStar.duration;
      }

      // Vibrate effect
      if (animState.current.vibrate > 0.15) {
        const dx = (Math.random() - 0.5) * animState.current.vibrate;
        const dy = (Math.random() - 0.5) * animState.current.vibrate;
        canvasRef.current!.style.transform = `translate(${dx}px,${dy}px)`;
      } else {
        canvasRef.current!.style.transform = '';
      }
      animationRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => {
      cancelAnimationFrame(animationRef.current!);
      if (shootingStarTimeout) clearTimeout(shootingStarTimeout);
    };
  }, [isSpeaking, startupMode]);

  // Responsive
  useEffect(() => {
    const resize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        background: 'radial-gradient(ellipse at center, #111 0%, #000 100%)',
        pointerEvents: 'none',
        transition: 'background 0.5s',
      }}
    />
  );
};

export default Starfield;