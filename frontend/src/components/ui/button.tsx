import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 btn-shine",
  {
    variants: {
      variant: {
        default: "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40",
        destructive: "bg-red-500 text-white hover:bg-red-600",
        outline: "border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-800",
        secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200",
        ghost: "hover:bg-slate-100 text-slate-700",
        link: "text-blue-600 underline-offset-4 hover:underline",
        gold: "bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/25",
        dark: "bg-slate-900 text-white hover:bg-slate-800",
        "outline-dark": "border-2 border-white/20 text-white hover:bg-white/10",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 px-4 py-2 text-xs",
        lg: "h-13 px-8 py-3.5 text-base",
        xl: "h-14 px-10 py-4 text-base rounded-2xl",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
