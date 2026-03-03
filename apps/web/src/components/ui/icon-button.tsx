import * as React from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const sizeMap = {
  xs: "icon-xs",
  sm: "icon-sm",
  default: "icon",
} as const;

interface IconButtonProps extends Omit<React.ComponentProps<"button">, "children"> {
  icon: React.ReactElement;
  size?: "xs" | "sm" | "default";
  tooltip?: string;
  tooltipSide?: "top" | "bottom" | "left" | "right";
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = "xs", tooltip, tooltipSide = "top", className, ...props }, ref) => {
    const button = (
      <Button
        ref={ref}
        variant="ghost"
        size={sizeMap[size]}
        className={cn("hover:text-pink", className)}
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
