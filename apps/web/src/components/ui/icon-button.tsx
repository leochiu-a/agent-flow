import * as React from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const sizeMap = {
  xs: "icon-xs",
  sm: "icon-sm",
  default: "icon",
} as const;

const variantMap = {
  ghost: { variant: "ghost", className: "hover:text-pink" },
  border: { variant: "icon-border", className: "" },
} as const;

interface IconButtonProps extends Omit<React.ComponentProps<"button">, "children"> {
  icon: React.ReactElement;
  size?: "xs" | "sm" | "default";
  variant?: "ghost" | "border";
  tooltip?: string;
  tooltipSide?: "top" | "bottom" | "left" | "right";
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    { icon, size = "xs", variant = "ghost", tooltip, tooltipSide = "top", className, ...props },
    ref,
  ) => {
    const v = variantMap[variant];
    const button = (
      <Button
        ref={ref}
        variant={v.variant}
        size={sizeMap[size]}
        className={cn(v.className, className)}
        {...props}
      >
        {icon}
      </Button>
    );

    if (!tooltip) return button;

    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side={tooltipSide}>{tooltip}</TooltipContent>
      </Tooltip>
    );
  },
);

IconButton.displayName = "IconButton";

export { IconButton };
export type { IconButtonProps };
