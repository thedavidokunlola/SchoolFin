"use client";

// src/components/ui/InteractiveBackground.tsx
// Google Antigravity-style interactive particle grid with spring physics,
// cursor repulsion, and elastic home-return dynamics.

import React, { useEffect, useRef } from "react";

interface GridParticle {
  x: number;
  y: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  baseRadius: number;
  radius: number;
  color: string;
  activeColor: string;
  baseAlpha: number;
  alpha: number;
}

export function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let particles: GridParticle[] = [];

    const mouse = {
      x: -9999,
      y: -9999,
      targetX: -9999,
      targetY: -9999,
      radius: 500, // Interaction area: 500px
      isActive: false,
    };

    const initGrid = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);

      // Grid spacing
      const spacing = 32;
      const cols = Math.floor(width / spacing) + 2;
      const rows = Math.floor(height / spacing) + 2;

      const offsetX = (width - (cols - 1) * spacing) / 2;
      const offsetY = (height - (rows - 1) * spacing) / 2;

      particles = [];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const originX = offsetX + c * spacing;
          const originY = offsetY + r * spacing;

          particles.push({
            x: originX,
            y: originY,
            originX,
            originY,
            vx: 0,
            vy: 0,
            baseRadius: 0.3, // Reduced to 0.3px
            radius: 0.3,
            color: "rgba(148, 163, 184, ", // Slate-400
            activeColor: "rgba(43, 53, 175, ", // Primary Indigo #2B35AF
            baseAlpha: 0.28,
            alpha: 0.28,
          });
        }
      }
    };

    initGrid();

    const handleResize = () => {
      initGrid();
    };

    const handleMouseMove = (e: MouseEvent) => {
      // If hovering over the sign-in card or any element designated with data-no-bg-interaction, pause mouse repulsion
      const target = e.target as HTMLElement | null;
      if (target && target.closest("[data-no-bg-interaction]")) {
        mouse.isActive = false;
        mouse.targetX = -9999;
        mouse.targetY = -9999;
        return;
      }

      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.isActive = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        if (target && target.closest("[data-no-bg-interaction]")) {
          mouse.isActive = false;
          mouse.targetX = -9999;
          mouse.targetY = -9999;
          return;
        }

        mouse.targetX = touch.clientX;
        mouse.targetY = touch.clientY;
        mouse.isActive = true;
      }
    };

    const handleMouseLeave = () => {
      mouse.isActive = false;
      mouse.targetX = -9999;
      mouse.targetY = -9999;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);

    // Physics constants
    const springConstant = 0.055; // Elasticity
    const damping = 0.88; // Friction
    const pushStrength = 5.8; // Repulsion force multiplier

    const render = () => {
      // Smooth mouse lerp
      if (mouse.isActive) {
        mouse.x += (mouse.targetX - mouse.x) * 0.15;
        mouse.y += (mouse.targetY - mouse.y) * 0.15;
      } else {
        mouse.x += (-9999 - mouse.x) * 0.1;
        mouse.y += (-9999 - mouse.y) * 0.1;
      }

      ctx.clearRect(0, 0, width, height);

      // Render & update particles with Antigravity spring physics
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // 1. Mouse Repulsion Force
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouse.radius && dist > 0 && mouse.isActive) {
          const force = (1 - dist / mouse.radius) * pushStrength;
          const angle = Math.atan2(dy, dx);
          p.vx -= Math.cos(angle) * force;
          p.vy -= Math.sin(angle) * force;
        }

        // 2. Hooke's Law Spring Force to Home (Origin)
        const homeDx = p.originX - p.x;
        const homeDy = p.originY - p.y;
        p.vx += homeDx * springConstant;
        p.vy += homeDy * springConstant;

        // 3. Damping Friction
        p.vx *= damping;
        p.vy *= damping;

        // 4. Update Position
        p.x += p.vx;
        p.y += p.vy;

        // Calculate visual feedback based on displacement & mouse proximity
        const displacement = Math.sqrt(
          (p.x - p.originX) * (p.x - p.originX) + (p.y - p.originY) * (p.y - p.originY)
        );

        let proximityFactor = 0;
        if (dist < mouse.radius && mouse.isActive) {
          proximityFactor = 1 - dist / mouse.radius;
        }

        p.radius = p.baseRadius + proximityFactor * 0.5 + Math.min(displacement * 0.02, 0.4);
        p.alpha = Math.min(0.9, p.baseAlpha + proximityFactor * 0.65 + Math.min(displacement * 0.04, 0.4));

        // Draw particle dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);

        if (proximityFactor > 0.1 || displacement > 2) {
          ctx.fillStyle = `${p.activeColor}${p.alpha})`;
        } else {
          ctx.fillStyle = `${p.color}${p.alpha})`;
        }

        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#F8FAFC]">
      {/* Antigravity Interactive Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
        style={{ touchAction: "none" }}
      />
    </div>
  );
}
