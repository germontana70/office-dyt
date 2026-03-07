import { forwardRef } from "react";

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    interactive?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
    ({ className = "", interactive = false, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`glass-panel rounded-2xl p-6 ${interactive ? "glass-panel-hover cursor-pointer" : ""
                    } ${className}`}
                {...props}
            >
                {children}
            </div>
        );
    }
);

GlassCard.displayName = "GlassCard";
