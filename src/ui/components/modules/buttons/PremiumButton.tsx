import { forwardRef } from "react";

export interface PremiumButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "ghost";
    size?: "sm" | "md" | "lg";
}

export const PremiumButton = forwardRef<HTMLButtonElement, PremiumButtonProps>(
    ({ className = "", variant = "primary", size = "md", children, ...props }, ref) => {

        // Base styles: Flexbox, center content, rounded corners, focus rings for accessibility, smooth transition
        const baseStyles = "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none";

        // Variant styles
        const variants = {
            primary: "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_0_20px_hsl(var(--primary)/0.6)] hover:-translate-y-0.5",
            secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
            outline: "border border-input hover:bg-accent hover:text-accent-foreground glass-panel-hover",
            ghost: "hover:bg-accent hover:text-accent-foreground",
        };

        // Size styles
        const sizes = {
            sm: "h-9 px-3 text-sm",
            md: "h-11 px-6 py-2 text-base",
            lg: "h-14 px-8 text-lg rounded-2xl",
        };

        return (
            <button
                ref={ref}
                className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
                {...props}
            >
                {children}
            </button>
        );
    }
);

PremiumButton.displayName = "PremiumButton";
