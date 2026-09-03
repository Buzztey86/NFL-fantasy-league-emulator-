"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

export function AnimatedList<T>({
  items,
  renderItem,
  keyExtractor,
  className,
  itemClassName,
}: {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string | number;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <div className={className}>
      {items.map((item, i) => (
        <motion.div
          key={keyExtractor(item, i)}
          className={itemClassName}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3) }}
        >
          {renderItem(item, i)}
        </motion.div>
      ))}
    </div>
  );
}
