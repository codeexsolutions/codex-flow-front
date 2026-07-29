"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import useThemeStore from "@/shared/theme/theme.store";

type AnimationLevel = "full" | "reduce";

function useAnimationLevel(): AnimationLevel {
  const motionPref = useThemeStore((s) => s.motion);
  if (motionPref === "reduce") return "reduce";
  // Auto: checa prefers-reduced-motion
  if (typeof window === "undefined") return "full";
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  return mq.matches ? "reduce" : "full";
}

type MotionBoxProps = HTMLMotionProps<"div"> & {
  children: ReactNode;
  as?: "div" | "span";
};

/**
 * Componente que aplica animações CSS/React Motion apenas se
 * a preferência de animação não for "reduce".
 *
 * Quando reduzido, renderiza uma <div> simples sem animação.
 */
export function MotionBox({ children, as: Tag = "div", ...props }: MotionBoxProps) {
  const level = useAnimationLevel();

  if (level === "reduce") {
    return <Tag className={props.className} style={props.style}>{children}</Tag>;
  }

  return <motion.div {...props}>{children}</motion.div>;
}

/**
 * AnimatedMount — fade in + subida suave para elementos que entram em tela.
 * Respeita a preferência de animação do usuário.
 */
export function AnimatedMount({ children, className = "" }: { children: ReactNode; className?: string }) {
  const level = useAnimationLevel();

  if (level === "reduce") {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * AnimatedList — stagger para listas de itens.
 */
export function AnimatedList({ children, className = "" }: { children: ReactNode; className?: string }) {
  const level = useAnimationLevel();

  if (level === "reduce") {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * AnimatedItem — item individual para usar dentro de AnimatedList.
 */
export function AnimatedItem({ children, className = "" }: { children: ReactNode; className?: string }) {
  const level = useAnimationLevel();

  if (level === "reduce") {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export type { AnimationLevel };
