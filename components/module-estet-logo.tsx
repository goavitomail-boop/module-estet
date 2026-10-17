"use client";

import { motion } from "framer-motion";

type Props = {
  className?: string;
  animate?: boolean;
  inverted?: boolean;
};

const GOLD = "#B2935A";

export default function ModuleEstetLogo({
  className = "",
  animate = true,
  inverted = false,
}: Props) {
  const ink = inverted ? "#F5F1E8" : "#171717";
  const MotionPath = motion.path;
  const MotionLine = motion.line;
  const MotionText = motion.text;
  const initial = animate ? "hidden" : false;
  const animation = animate ? "visible" : undefined;
  const draw = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: { pathLength: 1, opacity: 1 },
  };

  return (
    <svg
      className={className}
      viewBox="0 0 1200 720"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      role="img"
      aria-label="Модуль Эстет — кухни на заказ"
    >
      <g transform="translate(66 52)" stroke={GOLD}>
        <MotionPath
          d="M18 18H402V118 M18 18V416H116 M402 416H304 M402 416V316"
          strokeWidth="16"
          strokeLinecap="square"
          strokeLinejoin="miter"
          variants={draw}
          initial={initial}
          animate={animation}
          transition={{ duration: 1, ease: "easeInOut" }}
        />
        <MotionPath
          d="M104 348V104L210 216L316 104V348"
          strokeWidth="16"
          strokeLinecap="square"
          strokeLinejoin="miter"
          variants={draw}
          initial={initial}
          animate={animation}
          transition={{ duration: 1.15, delay: 0.2, ease: "easeInOut" }}
        />
        <MotionLine
          x1="132" y1="262" x2="132" y2="314"
          strokeWidth="7" strokeLinecap="round"
          variants={draw} initial={initial} animate={animation}
          transition={{ duration: 0.4, delay: 0.95 }}
        />
      </g>

      <g transform="translate(505 52)" stroke={ink}>
        <MotionPath
          d="M4 18H604V134H4Z"
          strokeWidth="7" strokeLinejoin="round"
          variants={draw} initial={initial} animate={animation}
          transition={{ duration: 0.9, delay: 0.4 }}
        />
        {[204, 404].map((x, index) => (
          <MotionLine key={x} x1={x} y1="18" x2={x} y2="134" strokeWidth="7"
            variants={draw} initial={initial} animate={animation}
            transition={{ duration: 0.4, delay: 0.78 + index * 0.08 }} />
        ))}
        {[104, 304, 504].map((x, index) => (
          <MotionLine key={x} x1={x} y1="52" x2={x} y2="80" stroke={GOLD}
            strokeWidth="7" strokeLinecap="round" variants={draw} initial={initial}
            animate={animation} transition={{ duration: 0.3, delay: 0.92 + index * 0.06 }} />
        ))}
        <MotionLine x1="146" y1="151" x2="430" y2="151" stroke={GOLD}
          strokeWidth="7" strokeLinecap="round" variants={draw} initial={initial}
          animate={animation} transition={{ duration: 0.5, delay: 1.08 }} />

        <MotionPath
          d="M58 226V181C58 161 70 151 87 151S116 162 116 181V197"
          strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"
          variants={draw} initial={initial} animate={animation}
          transition={{ duration: 0.65, delay: 1.1 }}
        />

        {/* The worktop is a single continuous datum. Every object meets it. */}
        <MotionPath
          d="M4 226H604V426H4Z M204 226V426 M404 226V426"
          strokeWidth="7" strokeLinejoin="round"
          variants={draw} initial={initial} animate={animation}
          transition={{ duration: 0.95, delay: 1.28 }}
        />

        <MotionPath
          d="M456 226C460 208 478 198 504 198C530 198 548 208 552 226Z"
          strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"
          variants={draw} initial={initial} animate={animation}
          transition={{ duration: 0.5, delay: 1.58 }}
        />

        {[286, 332].map((y, index) => (
          <MotionLine key={y} x1="266" y1={y} x2="342" y2={y} stroke={GOLD}
            strokeWidth="7" strokeLinecap="round" variants={draw} initial={initial}
            animate={animation} transition={{ duration: 0.3, delay: 1.86 + index * 0.08 }} />
        ))}
        {[514, 544].map((x, index) => (
          <MotionLine key={x} x1={x} y1="282" x2={x} y2="352" stroke={GOLD}
            strokeWidth="7" strokeLinecap="round" variants={draw} initial={initial}
            animate={animation} transition={{ duration: 0.3, delay: 2 + index * 0.07 }} />
        ))}
        <MotionLine x1="22" y1="426" x2="22" y2="442" strokeWidth="7" strokeLinecap="round"
          variants={draw} initial={initial} animate={animation} transition={{ duration: 0.25, delay: 2.08 }} />
        <MotionLine x1="586" y1="426" x2="586" y2="442" strokeWidth="7" strokeLinecap="round"
          variants={draw} initial={initial} animate={animation} transition={{ duration: 0.25, delay: 2.12 }} />
      </g>

      <MotionText x="600" y="568" textAnchor="middle" fontFamily="Montserrat, Arial, sans-serif"
        fontSize="60" fontWeight="600" letterSpacing="8" fill={ink}
        initial={animate ? { opacity: 0, y: 12 } : false}
        animate={animate ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.7, delay: 2.15, ease: "easeOut" }}>
        МОДУЛЬ ЭСТЕТ
      </MotionText>

      <MotionLine x1="214" y1="634" x2="364" y2="634" stroke={GOLD} strokeWidth="5"
        variants={draw} initial={initial} animate={animation} transition={{ duration: 0.45, delay: 2.48 }} />
      <MotionText x="600" y="646" textAnchor="middle" fontFamily="Montserrat, Arial, sans-serif"
        fontSize="24" fontWeight="500" letterSpacing="10" fill={GOLD}
        initial={animate ? { opacity: 0 } : false} animate={animate ? { opacity: 1 } : undefined}
        transition={{ duration: 0.6, delay: 2.55 }}>
        КУХНИ НА ЗАКАЗ
      </MotionText>
      <MotionLine x1="836" y1="634" x2="986" y2="634" stroke={GOLD} strokeWidth="5"
        variants={draw} initial={initial} animate={animation} transition={{ duration: 0.45, delay: 2.48 }} />
    </svg>
  );
}

export function ModuleEstetMark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 440 440" xmlns="http://www.w3.org/2000/svg"
      fill="none" role="img" aria-label="Модуль Эстет">
      <g transform="translate(10 10)" stroke={GOLD}>
        <path d="M18 18H402V118 M18 18V416H116 M402 416H304 M402 416V316"
          strokeWidth="16" strokeLinecap="square" strokeLinejoin="miter" />
        <path d="M104 348V104L210 216L316 104V348"
          strokeWidth="16" strokeLinecap="square" strokeLinejoin="miter" />
        <line x1="132" y1="262" x2="132" y2="314" strokeWidth="7" strokeLinecap="round" />
      </g>
    </svg>
  );
}
