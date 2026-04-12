import Image from "next/image";
import React from "react";
import { motion } from "framer-motion";

const LogoLoader = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="text-center mt-12 text-theme-900"
    >
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] border border-stone-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-10">
        <div className="animate-pulse text-stone-500">
          <Image
            src="/logo.png"
            alt="MORRIS MONYE"
            width={256}
            height={256}
            className="object-contain w-[100px] h-[100px]"
          />
        </div>
      </div>
    </motion.div>
  );
};

export default LogoLoader;
