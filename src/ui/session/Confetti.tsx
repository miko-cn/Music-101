/**
 * 结算页的彩带：一张盖在卡片上的 canvas，喷一次就停。
 *
 * 用 canvas 而不是 60 个 DOM 节点：每片每帧都在变位置和角度，
 * 走 DOM 就是 60 个元素一起改 transform，canvas 一次重绘就完事。
 *
 * 用户要求减少动效时整个不画——这是纯庆祝，没有它不丢任何信息。
 */
import { useEffect, useRef } from "react";
import { palette } from "../theme.ts";

const PIECES = 60;
const LIFETIME_MS = 1200;
const COLORS = [palette.brand, palette.accent, palette.success];
/** 像素 / 秒²。 */
const GRAVITY = 1400;
/** 每秒保留的速度比例：空气阻力让彩带「飘」而不是「砸」下来。 */
const DRAG_PER_SECOND = 0.25;

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  width: number;
  height: number;
  color: string;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduced = prefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const ratio = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.scale(ratio, ratio);

    // 从卡片上部的中线喷出：向上为主，左右散开。
    const pieces: Piece[] = Array.from({ length: PIECES }, (_, index) => {
      const spread = (Math.random() - 0.5) * 1.6;
      const speed = 520 + Math.random() * 420;
      return {
        x: width / 2,
        y: height * 0.28,
        vx: Math.sin(spread) * speed,
        vy: -Math.cos(spread) * speed,
        angle: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 14,
        width: 6 + Math.random() * 5,
        height: 9 + Math.random() * 6,
        color: COLORS[index % COLORS.length] ?? palette.brand,
      };
    });

    let frame = 0;
    let started: number | null = null;
    let last = 0;
    const tick = (now: number) => {
      if (started === null) {
        started = now;
        last = now;
      }
      const elapsed = now - started;
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      context.clearRect(0, 0, width, height);
      if (elapsed >= LIFETIME_MS) return;
      const drag = DRAG_PER_SECOND ** dt;
      // 最后三成时间淡出，停帧时不会「啪」一下全消失。
      context.globalAlpha = Math.min(1, (1 - elapsed / LIFETIME_MS) / 0.3);
      for (const piece of pieces) {
        piece.vx *= drag;
        piece.vy = piece.vy * drag + GRAVITY * dt;
        piece.x += piece.vx * dt;
        piece.y += piece.vy * dt;
        piece.angle += piece.spin * dt;
        context.save();
        context.translate(piece.x, piece.y);
        context.rotate(piece.angle);
        // 高度随角度伸缩，看起来像纸片在翻面。
        context.scale(1, Math.cos(piece.angle * 1.7));
        context.fillStyle = piece.color;
        context.fillRect(-piece.width / 2, -piece.height / 2, piece.width, piece.height);
        context.restore();
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  if (reduced) return null;
  return <canvas ref={canvasRef} className="session-confetti" aria-hidden="true" />;
}
