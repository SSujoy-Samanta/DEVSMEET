'use client';
import React from "react";
import clsx from "clsx";

// Define the variant type
export type VariantType =
  | "primary"
  | "secondary"
  | "danger"
  | "success"
  | "outline"
  | "link"
  | "connect"
  | "blueOcean"
  | "sunsetGlow"
  | "emeraldShine"
  | "purpleHaze"
  | "steelGray"
  | "fieryRed"
  | "aquaBreeze"
  | "goldenGlow";

interface ButtonProps {
    label: string;
    onClick: () => void;
    variant?: VariantType;
    size?: "small" | "medium" | "large";
    disabled?: boolean;
    fullWidth?: boolean;
    className?: string;
    children?:React.ReactNode,
}

const Button= ({
  label,
  onClick,
  variant = "primary",
  size = "medium",
  disabled = false,
  fullWidth = false,
  className = "",
  children
}:ButtonProps) => {
    // Base styles
    const baseStyles =
        "rounded-lg font-semibold transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

    // Variant styles
    const variantStyles = {
        primary:"bg-blue-600 text-white shadow-md hover:bg-blue-700 focus:ring-blue-400",
        secondary:"bg-gray-600 text-white shadow-md hover:bg-gray-700 focus:ring-gray-400",
        danger: "bg-red-500 text-white shadow-md hover:bg-red-600 focus:ring-red-400",
        success:"bg-green-500 text-white shadow-md hover:bg-green-600 focus:ring-green-400",
        outline:"border border-gray-500 text-gray-700 bg-transparent hover:bg-gray-100 focus:ring-gray-400",
        link: "text-blue-600 hover:underline hover:text-blue-700 focus:ring-transparent",
        connect: "bg-gradient-to-r from-gray-600 to-gray-900 text-white shadow-md hover:from-gray-700 hover:to-black focus:ring-gray-400",
        blueOcean: "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md hover:from-blue-600 hover:to-indigo-700 focus:ring-blue-400",
        sunsetGlow: "bg-gradient-to-r from-orange-400 to-pink-500 text-white shadow-md hover:from-orange-500 hover:to-pink-600 focus:ring-orange-400",
        emeraldShine: "bg-gradient-to-r from-green-400 to-teal-500 text-white shadow-md hover:from-green-500 hover:to-teal-600 focus:ring-green-400",
        purpleHaze: "bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md hover:from-purple-600 hover:to-pink-700 focus:ring-purple-400",
        steelGray: "bg-gradient-to-r from-gray-700 to-gray-900 text-white shadow-md hover:from-gray-800 hover:to-black focus:ring-gray-500",
        fieryRed: "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md hover:from-red-600 hover:to-rose-700 focus:ring-red-400",
        aquaBreeze: "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-md hover:from-cyan-500 hover:to-blue-600 focus:ring-cyan-400",
        goldenGlow: "bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-md hover:from-yellow-500 hover:to-amber-600 focus:ring-yellow-400",
    };

    // Size styles
    const sizeStyles = {
        small: "px-3 py-1 text-sm",
        medium: "px-4 py-2 text-base",
        large: "px-6 py-3 text-lg",
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={clsx(
                baseStyles,
                variantStyles[variant],
                sizeStyles[size],
                fullWidth && "w-full",
                className
            )}
        
        >
            {children}
            {label}
        </button>
    );
};

export default Button;
