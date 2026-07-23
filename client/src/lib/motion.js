/** Shared Framer Motion variants for consistent, restrained motion. */

export const pageVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1], when: 'beforeChildren', staggerChildren: 0.05 },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
};

export const assistantBubble = {
  hidden: { opacity: 0, x: -8, scale: 0.98 },
  show: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.18, ease: 'easeOut' } },
};

export const userBubble = {
  hidden: { opacity: 0, x: 8, scale: 0.98 },
  show: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.18, ease: 'easeOut' } },
};

export const modalVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, scale: 0.98, y: 4, transition: { duration: 0.14 } },
};

export const fieldSwap = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.12 } },
};
