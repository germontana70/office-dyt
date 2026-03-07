import { forwardRef } from "react";

export interface GradientTextProps extends React.HTMLAttributes<HTMLSpanElement> {
    as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "span" | "p";
    direction?: "to-r" | "to-l" | "to-t" | "to-b" | "to-br" | "to-bl" | "to-tr" | "to-tl";
    colors?: string; // e.g. "from-primary via-fuchsia-500 to-primary"
}

export const GradientText = forwardRef<HTMLElement, GradientTextProps>(
    ({ className = "", as: Tag = "span", direction = "to-r", colors = "from-primary to-secondary", children, ...props }, ref) => {
        return (
            <Tag
                ref={ref as any}
                className={`bg-gradient-${direction} ${colors} bg-clip-text text-transparent ${className}`}
                {...props}
            >
                {children}
            </Tag>
        );
    }
);

GradientText.displayName = "GradientText";
