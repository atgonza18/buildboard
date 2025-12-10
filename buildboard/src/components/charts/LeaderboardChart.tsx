import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LeaderboardEntry {
  foremanName: string;
  totalActualQuantity: number;
  rank: number;
  variancePercent?: number;
  productionFactor?: number;
}

interface LeaderboardChartProps {
  data: LeaderboardEntry[];
  title?: string;
}

export function LeaderboardChart({
  data,
  title = "Top Performers",
}: LeaderboardChartProps) {
  // Take top 10 and sort for horizontal bar chart
  const chartData = data
    .slice(0, 10)
    .map((entry) => ({
      name: entry.foremanName,
      value: entry.productionFactor ?? 0,
      rank: entry.rank,
      variance: entry.variancePercent ?? 0,
    }))
    .reverse(); // Reverse for horizontal bar chart (highest at top)

  const getBarColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "#fbbf24"; // Gold
      case 2:
        return "#94a3b8"; // Silver
      case 3:
        return "#cd7f32"; // Bronze
      default:
        return "#3b82f6"; // Blue
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 40)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 20, right: 30, left: 80, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              type="number"
              domain={[0, 'auto']}
              tick={{ fill: "#64748b", fontSize: 12 }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickFormatter={(value) => value.toFixed(2)}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: "#64748b", fontSize: 12 }}
              axisLine={{ stroke: "#e2e8f0" }}
              width={70}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
              }}
              formatter={(value: number) => [value.toFixed(2), "Production Factor"]}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.rank)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
