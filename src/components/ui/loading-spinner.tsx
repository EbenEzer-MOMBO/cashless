import * as React from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const loadingSpinnerVariants = cva(
  "loading-pulse flex items-center justify-center",
  {
    variants: {
      variant: {
        default: "text-primary",
        muted: "text-muted-foreground",
        accent: "text-accent-foreground",
      },
      size: {
        xs: "w-4 h-4",
        sm: "w-6 h-6", 
        default: "w-8 h-8",
        lg: "w-12 h-12",
        xl: "w-16 h-16",
        fullscreen: "w-24 h-24",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof loadingSpinnerVariants> {
  showText?: boolean
  text?: string
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, variant, size, showText = false, text = "Chargement...", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex flex-col items-center justify-center gap-3", className)}
        {...props}
      >
        <div className={cn(loadingSpinnerVariants({ variant, size }))}>
          <img 
            src="/lovable-uploads/87482f30-6e93-418a-a376-a9677189bc82.png" 
            alt="Chargement..."
            className="w-full h-full object-contain animate-spin"
            style={{
              animationDuration: '2s',
              filter: 'drop-shadow(0 0 10px hsl(var(--primary) / 0.3))'
            }}
          />
        </div>
        {showText && (
          <p className="text-sm text-muted-foreground animate-pulse">
            {text}
          </p>
        )}
      </div>
    )
  }
)
LoadingSpinner.displayName = "LoadingSpinner"

// Fullscreen loading overlay
const LoadingOverlay = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, text = "Chargement en cours...", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center",
          "bg-background/80 backdrop-blur-sm",
          className
        )}
        {...props}
      >
        <div className="glass-morphism p-8 rounded-2xl">
          <LoadingSpinner 
            size="fullscreen" 
            showText 
            text={text}
            className="text-center"
          />
        </div>
      </div>
    )
  }
)
LoadingOverlay.displayName = "LoadingOverlay"

export { LoadingSpinner, LoadingOverlay, loadingSpinnerVariants }