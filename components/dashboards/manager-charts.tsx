"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type ChartItem = {
  name: string
  value: number
}

interface ManagerChartsProps {
  roomStatusData: ChartItem[]
  topRoomTypesData: ChartItem[]
}

const COLORS = [
  "#047857",
  "#1d4ed8",
  "#b45309",
  "#ca8a04",
  "#991b1b",
  "#475569",
]

export function ManagerCharts({
  roomStatusData,
  topRoomTypesData,
}: ManagerChartsProps) {
  const hasRoomStatusData = roomStatusData.some((item) => item.value > 0)
  const hasTopRoomTypesData = topRoomTypesData.some((item) => item.value > 0)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Структура номерного фонду</CardTitle>
        </CardHeader>

        <CardContent>
          {hasRoomStatusData ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roomStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={92}
                    stroke="#ffffff"
                    strokeWidth={2}
                  >
                    {roomStatusData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      borderColor: "#e2e8f0",
                      boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Дані про стан номерного фонду відсутні.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Топ типів номерів</CardTitle>
        </CardHeader>

        <CardContent>
          {hasTopRoomTypesData ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topRoomTypesData}>
                  <CartesianGrid stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={{ stroke: "#cbd5e1" }}
                    interval={0}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      borderColor: "#e2e8f0",
                      boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
                    }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {topRoomTypesData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={index === 0 ? "#334155" : "#64748b"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Дані про типи номерів відсутні.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
