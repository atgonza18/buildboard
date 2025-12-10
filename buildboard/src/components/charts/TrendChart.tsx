import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TrendData {
  date: string;
  productionFactor: number;
  forecastHours?: number;
  actualHours?: number;
}

interface TrendChartProps {
  data: TrendData[];
  title?: string;
}

// Custom tooltip - defined outside component to avoid recreation on each render
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const pf = payload[0].value;
    const hours = payload[0].payload.actualHours;
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-lg">
        <p className="font-medium text-slate-900 dark:text-white">{label}</p>
        <p className={`text-lg font-bold ${pf >= 1 ? 'text-emerald-600' : 'text-amber-600'}`}>
          PF: {pf.toFixed(2)}
        </p>
        {hours !== undefined && hours > 0 && (
          <p className="text-sm text-slate-500">{hours.toFixed(1)} man-hours</p>
        )}
        <p className="text-xs text-slate-400 mt-1">
          {pf >= 1 ? 'Above target' : 'Below target'}
        </p>
      </div>
    );
  }
  return null;
}

export function TrendChart({
  data,
  title = "Production Factor Trend",
}: TrendChartProps) {
  // Format date for display
  const formattedData = data.map((d) => ({
    ...d,
    displayDate: new Date(d.date + "T12:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    // Round PF for display
    pf: Number(d.productionFactor.toFixed(2)),
  }));

  // Calculate average PF for the period
  const avgPF = data.length > 0
    ? data.reduce((sum, d) => sum + d.productionFactor, 0) / data.length
    : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          {data.length > 0 && (
            <div className="text-sm">
              <span className="text-slate-500">Avg: </span>
              <span className={`font-bold ${avgPF >= 1 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {avgPF.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={formattedData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="displayDate"
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={{ stroke: "#e2e8f0" }}
              />
              <YAxis
                domain={[0, 'auto']}
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickFormatter={(value) => value.toFixed(1)}
              />
              <Tooltip content={<CustomTooltip />} />
              {/* Reference line at PF = 1.0 (target) */}
              <ReferenceLine
                y={1}
                stroke="#94a3b8"
                strokeDasharray="5 5"
                label={{
                  value: "Target (1.0)",
                  position: "right",
                  fill: "#94a3b8",
                  fontSize: 11,
                }}
              />
              <Line
                type="monotone"
                dataKey="pf"
                name="Production Factor"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: "#2563eb" }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-slate-400">
            No trend data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
