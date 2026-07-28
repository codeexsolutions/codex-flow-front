import { motion } from "framer-motion";

const LoadingScreen = () => {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#1c1a2e]">
      {/* Orbs de fundo */}
      <motion.div
        className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-[#7c6ef5] blur-[90px]"
        animate={{ opacity: [0.12, 0.22, 0.12], scale: [1, 1.15, 1] }}
        transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-[#a78bfa] blur-[100px]"
        animate={{ opacity: [0.08, 0.18, 0.08], scale: [1.1, 1, 1.1] }}
        transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: 0.5 }}
      />

    
      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="relative flex h-28 w-28 items-center justify-center">
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#7c6ef5] border-r-[#a78bfa]"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
          />
          <motion.div
            className="absolute inset-3 rounded-full border-2 border-transparent border-b-[#a78bfa] border-l-[#7c6ef5]/60"
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
          />

          <motion.div
            className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#7c6ef5] to-[#a78bfa] shadow-[0_0_28px_rgba(124,110,245,0.65)]"
            animate={{ scale: [1, 1.12, 1], opacity: [0.85, 1, 0.85] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
          >
            <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-[#c4baff] shadow-[0_0_8px_rgba(167,139,250,0.8)]" />
            <span className="absolute bottom-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#7c6ef5] shadow-[0_0_6px_rgba(124,110,245,0.7)]" />
          </motion.div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <motion.p
            className="flex items-center text-lg font-medium tracking-wide text-[#e8e4ff]"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          >
            Carregando
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="ml-0.5"
                animate={{ opacity: [0.2, 1, 0.2], y: [0, -3, 0] }}
                transition={{
                  repeat: Infinity,
                  duration: 1.2,
                  ease: "easeInOut",
                  delay: i * 0.2,
                }}
              >
                .
              </motion.span>
            ))}
          </motion.p>

          {/* Barra de shimmer */}
          <div className="relative h-1 w-44 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              className="absolute inset-y-0 w-1/2 rounded-full bg-gradient-to-r from-transparent via-[#7c6ef5] to-transparent"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
