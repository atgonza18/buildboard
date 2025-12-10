import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface ScopeCardProps {
  scopeId: string;
  scopeName: string;
  projectId: string;
  totalForecastQuantity: number;
  totalActualQuantity: number;
  productionRate: number;
  entriesCount: number;
}

export function ScopeCard({
  scopeId,
  scopeName,
  projectId,
  totalForecastQuantity,
  totalActualQuantity,
  productionRate,
  entriesCount,
}: ScopeCardProps) {
  const completionRate =
    totalForecastQuantity > 0
      ? Math.round((totalActualQuantity / totalForecastQuantity) * 100)
      : 0;

  const variance = totalActualQuantity - totalForecastQuantity;
  const isPositive = variance >= 0;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{scopeName}</CardTitle>
          <Badge
            variant="outline"
            className={
              isPositive
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
            }
          >
            {isPositive ? "+" : ""}
            {variance.toLocaleString()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Progress</span>
            <span className="font-medium">{completionRate}%</span>
          </div>
          <Progress value={Math.min(completionRate, 100)} className="h-2" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500">Forecast</p>
            <p className="font-semibold">{totalForecastQuantity.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-slate-500">Actual</p>
            <p className="font-semibold">{totalActualQuantity.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-slate-500">Production Rate</p>
            <p className="font-semibold">{productionRate.toFixed(2)}/hr</p>
          </div>
          <div>
            <p className="text-slate-500">Entries</p>
            <p className="font-semibold">{entriesCount}</p>
          </div>
        </div>

        {/* Link to scope detail */}
        <Link
          to={`/project/${projectId}/scope/${scopeId}`}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          View Details
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}
