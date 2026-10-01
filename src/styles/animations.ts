import type { Variants, TargetAndTransition, Transition, AnimatePresenceProps, MotionProps } from 'framer-motion';

/* ==========================================
   Framer Motion Animation Variants
   ==========================================
   Use these with framer-motion's motion components
   ========================================== */

/* Container Variants */
export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0,
      when: "beforeChildren",
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
      when: "afterChildren",
    },
  },
};

export const containerFadeVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1],
      staggerChildren: 0.08,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

/* Item Variants */
export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
      mass: 0.8,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
};

export const itemFadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
};

export const itemSlideUpVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20,
    },
  },
  exit: {
    opacity: 0,
    y: 30,
    transition: {
      duration: 0.3,
      ease: "easeIn",
    },
  },
};

export const itemSlideDownVariants: Variants = {
  hidden: { opacity: 0, y: -30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20,
    },
  },
  exit: {
    opacity: 0,
    y: -30,
    transition: {
      duration: 0.3,
      ease: "easeIn",
    },
  },
};

export const itemSlideLeftVariants: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20,
    },
  },
  exit: {
    opacity: 0,
    x: 30,
    transition: {
      duration: 0.3,
      ease: "easeIn",
    },
  },
};

export const itemSlideRightVariants: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20,
    },
  },
  exit: {
    opacity: 0,
    x: -30,
    transition: {
      duration: 0.3,
      ease: "easeIn",
    },
  },
};

/* Scale Variants */
export const scaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
};

export const scaleUpVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
};

/* Rotate Variants */
export const rotateVariants: Variants = {
  hidden: { opacity: 0, rotate: -10 },
  visible: {
    opacity: 1,
    rotate: 0,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20,
    },
  },
  exit: {
    opacity: 0,
    rotate: 10,
    transition: {
      duration: 0.3,
    },
  },
};

/* Flip Variants */
export const flipVariants: Variants = {
  hidden: {
    opacity: 0,
    rotateY: -90,
    transformPerspective: 1000,
  },
  visible: {
    opacity: 1,
    rotateY: 0,
    transformPerspective: 1000,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    rotateY: 90,
    transformPerspective: 1000,
    transition: {
      duration: 0.3,
    },
  },
};

/* Slide Variants */
export const slideVariants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

/* Page Transition Variants */
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    x: "-100%",
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      type: "tween",
      ease: "anticipate",
      duration: 0.5,
    },
  },
  exit: {
    opacity: 0,
    x: "100%",
    transition: {
      type: "tween",
      ease: "anticipate",
      duration: 0.5,
    },
  },
};

export const pageSlideVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      type: "tween",
      ease: "easeOut",
      duration: 0.4,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      type: "tween",
      ease: "easeIn",
      duration: 0.3,
    },
  },
};

export const pageFadeVariants: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
};

/* Modal Variants */
export const modalOverlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.2,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.15,
      ease: "easeIn",
    },
  },
};

export const modalContentVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
};

export const drawerVariants: Variants = {
  hidden: {
    x: "100%",
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
  },
  visible: {
    x: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    x: "100%",
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
  },
};

export const drawerLeftVariants: Variants = {
  hidden: {
    x: "-100%",
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
  },
  visible: {
    x: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    x: "-100%",
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
  },
};

/* Accordion Variants */
export const accordionVariants: Variants = {
  closed: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: 0.3, ease: "easeInOut" },
      opacity: { duration: 0.2, ease: "easeOut" },
    },
  },
  open: {
    height: "auto",
    opacity: 1,
    transition: {
      height: { duration: 0.3, ease: "easeInOut" },
      opacity: { duration: 0.3, ease: "easeIn", delay: 0.1 },
    },
  },
};

/* List Item Variants */
export const listItemVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      type: "spring",
      stiffness: 200,
      damping: 20,
    },
  }),
  exit: {
    opacity: 0,
    x: 20,
    transition: {
      duration: 0.2,
    },
  },
};

/* Card Hover Variants */
export const cardHoverVariants: Variants = {
  rest: {
    scale: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
  hover: {
    scale: 1.02,
    y: -4,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
  tap: {
    scale: 0.98,
    y: 0,
    transition: {
      duration: 0.1,
    },
  },
};

/* Glow Variants */
export const glowVariants: Variants = {
  initial: {
    boxShadow: "0 0 0px rgba(0, 0, 0, 0)",
  },
  animate: {
    boxShadow: [
      "0 0 5px rgb(var(--color-primary))",
      "0 0 10px rgb(var(--color-primary))",
      "0 0 20px rgb(var(--color-primary))",
      "0 0 10px rgb(var(--color-primary))",
      "0 0 5px rgb(var(--color-primary))",
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

/* Pulse Variants */
export const pulseVariants: Variants = {
  initial: {
    scale: 1,
    opacity: 1,
  },
  animate: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

/* Shake Variants */
export const shakeVariants: Variants = {
  shake: {
    x: [0, -10, 10, -10, 10, -5, 5, 0],
    transition: {
      duration: 0.5,
      ease: "easeInOut",
    },
  },
};

/* Bounce Variants */
export const bounceVariants: Variants = {
  bounce: {
    y: [0, -20, 0],
    transition: {
      duration: 0.6,
      ease: "easeInOut",
      times: [0, 0.5, 1],
    },
  },
};

/* Stagger Variants for specific use cases */
export const staggerFastVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0,
    },
  },
};

export const staggerSlowVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1,
    },
  },
};

/* Notification Variants */
export const notificationVariants: Variants = {
  initial: {
    opacity: 0,
    y: -100,
    x: 0,
    scale: 0.8,
  },
  animate: {
    opacity: 1,
    y: 0,
    x: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    y: -100,
    x: 0,
    scale: 0.8,
    transition: {
      duration: 0.3,
      ease: "easeIn",
    },
  },
};

/* Toast Variants */
export const toastVariants: Variants = {
  initial: {
    opacity: 0,
    y: 50,
    scale: 0.9,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    y: 50,
    scale: 0.9,
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
};

/* Progress Variants */
export const progressVariants: Variants = {
  initial: {
    scaleX: 0,
    originX: 0,
  },
  animate: {
    scaleX: 1,
    transition: {
      duration: 1,
      ease: "easeOut",
    },
  },
};

/* Circle Progress Variants */
export const circleProgressVariants: Variants = {
  initial: {
    strokeDashoffset: 283,
  },
  animate: {
    strokeDashoffset: 0,
    transition: {
      duration: 1.5,
      ease: "easeInOut",
    },
  },
};

/* Tab Variants */
export const tabVariants: Variants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
};

/* Dropdown Variants */
export const dropdownVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -10,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: {
      duration: 0.15,
    },
  },
};

/* Avatar Group Variants */
export const avatarGroupVariants: Variants = {
  initial: {
    x: 0,
  },
  hover: {
    x: -10,
    transition: {
      duration: 0.2,
      ease: "easeOut",
    },
  },
};

/* Skeleton Variants */
export const skeletonVariants: Variants = {
  initial: {
    opacity: 0.6,
  },
  animate: {
    opacity: [0.6, 0.3, 0.6],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

/* Number Counter Variants */
export const counterVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
};

/* Hover Effect Variants */
export const hoverScaleVariants: TargetAndTransition = {
  scale: 1.05,
  transition: {
    type: "spring",
    stiffness: 400,
    damping: 17,
  },
};

export const hoverRotateVariants: TargetAndTransition = {
  rotate: 5,
  transition: {
    type: "spring",
    stiffness: 300,
    damping: 20,
  },
};

/* While Tap Variants */
export const whileTapVariants: TargetAndTransition = {
  scale: 0.95,
  transition: {
    type: "spring",
    stiffness: 400,
    damping: 17,
  },
};

/* Drag Props */
export const dragVariants: MotionProps = {
  drag: true,
  whileDrag: { scale: 1.05, cursor: "grabbing" },
  dragConstraints: {
    left: -10,
    right: 10,
    top: -10,
    bottom: 10,
  },
  dragElastic: 0.2,
};

/* Scroll Progress Variants */
export const scrollProgressVariants: Variants = {
  initial: {
    scaleX: 0,
    originX: 0,
  },
  animate: {
    scaleX: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

/* Magnetic Button Variants */
export const magneticButtonVariants: Variants = {
  initial: {
    x: 0,
    y: 0,
  },
  hover: {
    x: 0,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20,
    },
  },
};

/* Image Reveal Variants */
export const imageRevealVariants: Variants = {
  hidden: {
    clipPath: "inset(100% 0 0 0)",
  },
  visible: {
    clipPath: "inset(0% 0 0 0)",
    transition: {
      duration: 0.8,
      ease: "easeInOut",
    },
  },
  exit: {
    clipPath: "inset(0 0 100% 0)",
    transition: {
      duration: 0.5,
      ease: "easeInOut",
    },
  },
};

/* Text Reveal Variants */
export const textRevealVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    filter: "blur(10px)",
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

/* Morph Transition Variants */
export const morphVariants: Variants = {
  initial: {
    borderRadius: "50%",
    width: 60,
    height: 60,
  },
  animate: {
    borderRadius: "16px",
    width: "100%",
    height: "100%",
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 25,
    },
  },
};

/* Shared Layout Transition */
export const layoutTransition: Transition | Record<string, Transition> = {
  type: "spring",
  stiffness: 300,
  damping: 30,
};

/* AnimatePresence Mode */
export const animatePresenceModes: Record<string, AnimatePresenceProps['mode']> = {
  wait: "wait",
  sync: "sync",
  popLayout: "popLayout",
  waitPrevious: "wait",
};

/* Gesture Config */
export const gestureConfig: MotionProps = {
  drag: true,
  dragConstraints: { left: 0, right: 0, top: 0, bottom: 0 },
  dragElastic: 1,
  whileHover: "hover",
  whileTap: "tap",
  whileDrag: "drag",
};

/* Transition Presets */
export const transitionPresets: Transition | Record<string, Transition> = {
  default: {
    type: "spring",
    stiffness: 260,
    damping: 20,
  },
  gentle: {
    type: "spring",
    stiffness: 100,
    damping: 15,
  },
  wobbly: {
    type: "spring",
    stiffness: 150,
    damping: 15,
  },
  stiff: {
    type: "spring",
    stiffness: 400,
    damping: 30,
  },
  slow: {
    type: "spring",
    stiffness: 80,
    damping: 20,
    mass: 1.2,
  },
  molasses: {
    type: "spring",
    stiffness: 50,
    damping: 20,
    mass: 2,
  },
  easeOut: {
    type: "tween",
    ease: "easeOut",
    duration: 0.3,
  },
  easeInOut: {
    type: "tween",
    ease: "easeInOut",
    duration: 0.4,
  },
  sharp: {
    type: "tween",
    ease: [0.4, 0, 0.2, 1],
    duration: 0.3,
  },
};
