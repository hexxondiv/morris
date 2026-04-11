"use client";

import { useCurrentSession } from "@/lib/auth-client";
import clsx from "clsx";
import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import theme from "./theme";

const TYPES = ["user", "session"];

export function CodeSwitcher() {
  const [selectedType, setSelectedType] = useState(TYPES[0]);
  const { data: session } = useCurrentSession();
  const user = session?.user ?? null;

  const selectedCode = JSON.stringify(
    {
      user,
      session,
    }[selectedType],
    null,
    2
  );

  return (
    <div className={clsx("h-[41.625rem]")}>
      <div className="w-full bg-[#F7F7F8] rounded-md p-[0.1875rem] flex gap-1.5">
        {TYPES.map((type) => (
          <button
            className={clsx(
              "capitalize rounded h-7 text-[0.8125rem] flex-1 hover:text-black font-medium",
              selectedType === type
                ? "bg-white shadow-sm text-black"
                : "text-[#5E5F6E]"
            )}
            key={type}
            onClick={() => setSelectedType(type)}
          >
            {type}
          </button>
        ))}
      </div>
      <div className="relative h-[calc(100%-42px)]">
        <div className="mask h-full">
          {/* @ts-expect-error */}
          <SyntaxHighlighter language="javascript" style={theme}>
            {selectedCode}
          </SyntaxHighlighter>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-white to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-[#EEEEF0]" />
      </div>
    </div>
  );
}
