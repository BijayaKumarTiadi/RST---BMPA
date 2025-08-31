import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatItem {
  title: string;
  value: string;
  change?: string;
  icon: LucideIcon;
  color: 'primary' | 'chart-1' | 'chart-2' | 'chart-3' | 'chart-4';
}

interface DashboardStatsProps {
  stats: StatItem[];
  loading?: boolean;
}

export default function DashboardStats({ stats, loading }: DashboardStatsProps) {
  const getColorClasses = (color: StatItem['color']) => {
    switch (color) {
      case 'primary':
        return 'bg-primary/10 text-primary';
      case 'chart-1':
        return 'bg-chart-1/10 text-chart-1';
      case 'chart-2':
        return 'bg-chart-2/10 text-chart-2';
      case 'chart-3':
        return 'bg-chart-3/10 text-chart-3';
      case 'chart-4':
        return 'bg-chart-4/10 text-chart-4';
      default:
        return 'bg-primary/10 text-primary';
    }
  };

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-secondary rounded w-20" />
                  <div className="h-8 bg-secondary rounded w-16" />
                </div>
                <div className="w-12 h-12 bg-secondary rounded-lg" />
              </div>
              <div className="h-3 bg-secondary rounded w-16 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const colorClasses = getColorClasses(stat.color);
        
        return (
          <Card key={index} data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground" data-testid={`stat-value-${index}`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              {stat.change && (
                <p className="text-xs text-muted-foreground mt-2" data-testid={`stat-change-${index}`}>
                  {stat.change} from last month
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
