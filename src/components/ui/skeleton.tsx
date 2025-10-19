import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const skeletonVariants = cva(
  "skeleton-shimmer rounded-md",
  {
    variants: {
      variant: {
        default: "bg-muted",
        card: "bg-card border border-border",
        text: "bg-muted/50",
        avatar: "bg-muted rounded-full",
        button: "bg-muted/70 rounded-lg",
      },
      animation: {
        pulse: "animate-pulse",
        shimmer: "skeleton-shimmer",
        none: "",
      },
    },
    defaultVariants: {
      variant: "default",
      animation: "shimmer",
    },
  }
)

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

function Skeleton({
  className,
  variant,
  animation,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(skeletonVariants({ variant, animation, className }))}
      {...props}
    />
  )
}

// Pre-built skeleton components for common use cases
const SkeletonText = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <Skeleton variant="text" className={cn("h-4 w-full", className)} {...props} />
)

const SkeletonAvatar = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <Skeleton variant="avatar" className={cn("h-12 w-12", className)} {...props} />
)

const SkeletonButton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <Skeleton variant="button" className={cn("h-10 w-24", className)} {...props} />
)

const SkeletonCard = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <Skeleton variant="card" className={cn("p-6 space-y-4", className)} {...props}>
    <div className="space-y-2">
      <SkeletonText className="w-3/4" />
      <SkeletonText className="w-1/2" />
    </div>
    <div className="flex space-x-4">
      <SkeletonAvatar />
      <div className="space-y-2 flex-1">
        <SkeletonText className="w-full" />
        <SkeletonText className="w-2/3" />
      </div>
    </div>
  </Skeleton>
)

export { 
  Skeleton, 
  SkeletonText, 
  SkeletonAvatar, 
  SkeletonButton, 
  SkeletonCard,
  skeletonVariants 
}
