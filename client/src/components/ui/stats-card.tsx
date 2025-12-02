import { ElementType, ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon | ElementType
  iconColor?: string
  trend?: {
    value: string | number
    isPositive: boolean
  }
  className?: string
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor = "bg-primary",
  trend,
  className
}: StatsCardProps) {
  return (
    <div className={cn("saber-card p-6 animate-scale-in", className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">
              {description}
            </p>
          )}
          {trend && (
            <p className={cn(
              "text-sm mt-2 flex items-center font-semibold",
              trend.isPositive ? "text-saber-success" : "text-saber-danger"
            )}>
              <span className="text-xs mr-1">
                {trend.isPositive ? "↗" : "↘"}
              </span>
              {trend.value} este mês
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-sm", iconColor)}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        )}
      </div>
    </div>
  )
}
