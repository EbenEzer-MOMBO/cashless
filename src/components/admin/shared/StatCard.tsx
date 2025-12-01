import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  subtitle?: string;
  className?: string;
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  iconColor = "text-primary", 
  subtitle,
  className = ""
}: StatCardProps) {
  return (
    <Card className={`border-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-95 bg-gradient-to-br from-card to-muted/30 ${className}`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Modern Icon with gradient background */}
          <div className="relative shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl blur-sm"></div>
            <div className={`relative p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shadow-sm`}>
              <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${iconColor}`} />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] sm:text-xs text-muted-foreground font-medium truncate mb-1">{title}</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground leading-tight">{value}</p>
            {subtitle && (
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 truncate">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}