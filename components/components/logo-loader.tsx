import Image from "next/image";
import React from "react";
import logo from "@/images/logo.png";
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
          <Image src={logo} alt="MORRIS MONYE logo" width={100} height={100} />
        </div>
      </div>
    </motion.div>
  );
};

export default LogoLoader;
