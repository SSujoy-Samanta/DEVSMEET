"use effect"

import React from 'react';
import { MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

// Define props interface for the button component
interface AnimatedChatButtonProps {
    onClick: () => void;
    isActive: boolean;
    className?: string;
}
// Fancy Gradient Button Component
export const FancyAnimatedChatButton: React.FC<AnimatedChatButtonProps> = ({
    onClick,
    isActive,
    className = ''
}) => {
    return (
        <motion.button
            className={`p-2 sm:p-3 rounded-full flex items-center justify-center text-white relative overflow-hidden shadow-lg ${className}`}
            style={{
                background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
            }}
            onClick={onClick}
            whileHover={{
                scale: 1.05,
                boxShadow: "0 8px 25px rgba(79, 70, 229, 0.4)"
            }}
            whileTap={{ scale: 0.95 }}
            transition={{
                type: "spring",
                stiffness: 400,
                damping: 17
            }}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
        >
            {/* Animated highlight overlay */}
            <motion.div
                className="absolute inset-0 bg-white opacity-10"
                initial={{ x: "-100%", y: "-100%" }}
                animate={{ x: "100%", y: "100%" }}
                transition={{
                    repeat: Infinity,
                    repeatType: "loop",
                    duration: 3,
                    ease: "linear"
                }}
            />

            <motion.div
                animate={{ rotate: isActive ? 180 : 0 }}
                transition={{ duration: 0.4, type: "spring" }}
            >
                <MessageSquare size={18} className="sm:hidden" />
                <MessageSquare size={20} className="hidden sm:block" />
            </motion.div>

            {/* Click ripple effect */}
            <motion.span
                className="absolute w-full h-full rounded-full bg-white"
                initial={{ scale: 0, opacity: 0.7 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 0.8 }}
                key={isActive ? "active" : "inactive"}
            />
        </motion.button>
    );
};
