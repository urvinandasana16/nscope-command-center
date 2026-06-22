"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartData } from "@/lib/mock-data";
import { Card } from "./ui/primitives";

export function DashboardCharts() {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartFrame title="Device Status Pie Chart">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={chartData.deviceStatus} dataKey="value" nameKey="name" innerRadius={58} outerRadius={90} paddingAngle={4}>
              {chartData.deviceStatus.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame title="Alert Trend Graph">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData.alertTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="warning" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.18} />
            <Area type="monotone" dataKey="critical" stroke="#EF4444" fill="#EF4444" fillOpacity={0.2} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame title="Client Device Distribution">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData.clientDistribution}>
            <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" />
            <XAxis dataKey="client" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="devices" fill="#3B82F6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame title="Ticket Status Chart">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData.ticketStatus} layout="vertical" margin={{ left: 28 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" />
            <Tooltip />
            <Bar dataKey="value" fill="#22C55E" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    </div>
  );
}

function ChartFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="mb-4 text-base font-semibold">{title}</h2>
      {children}
    </Card>
  );
}
