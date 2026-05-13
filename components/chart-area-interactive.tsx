"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

export const description = "삼성전자 가격 추이 차트"

const chartData = [
  { date: "2026-03-17", price: 178600, mean: 179821 },
  { date: "2026-03-18", price: 179400, mean: 179822 },
  { date: "2026-03-19", price: 181200, mean: 179934 },
  { date: "2026-03-20", price: 177800, mean: 179811 },
  { date: "2026-03-21", price: 180900, mean: 179867 },
  { date: "2026-03-24", price: 183200, mean: 180156 },
  { date: "2026-03-25", price: 179100, mean: 179878 },
  { date: "2026-03-26", price: 175600, mean: 179534 },
  { date: "2026-03-27", price: 178200, mean: 179333 },
  { date: "2026-03-28", price: 180100, mean: 179500 },
  { date: "2026-03-29", price: 179700, mean: 179578 },
  { date: "2026-03-30", price: 176300, mean: 179422 },
  { date: "2026-03-31", price: 167200, mean: 177811 },
  { date: "2026-04-01", price: 189600, mean: 179989 },
  { date: "2026-04-02", price: 178400, mean: 180489 },
  { date: "2026-04-03", price: 186200, mean: 181511 },
  { date: "2026-04-07", price: 193100, mean: 183011 },
  { date: "2026-04-08", price: 196500, mean: 183011 },
  { date: "2026-04-09", price: 189200, mean: 184011 },
  { date: "2026-04-10", price: 168500, mean: 183944 },
  { date: "2026-04-11", price: 173200, mean: 182933 },
  { date: "2026-04-14", price: 179800, mean: 181600 },
  { date: "2026-04-15", price: 162300, mean: 180533 },
  { date: "2026-04-16", price: 171500, mean: 180033 },
  { date: "2026-04-17", price: 182100, mean: 179711 },
  { date: "2026-04-18", price: 186900, mean: 180122 },
]

const chartConfig = {
  price: {
    label: "현재가",
    color: "var(--primary)",
  },
  mean: {
    label: "이동평균",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("30d")

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date("2026-04-18")
    let daysToSubtract = 30
    if (timeRange === "14d") {
      daysToSubtract = 14
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>삼성전자 (005930) 가격 추이</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            현재가 및 9일 이동평균
          </span>
          <span className="@[540px]/card:hidden">가격 / 이동평균</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="30d">최근 30일</ToggleGroupItem>
            <ToggleGroupItem value="14d">최근 14일</ToggleGroupItem>
            <ToggleGroupItem value="7d">최근 7일</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="기간 선택"
            >
              <SelectValue placeholder="최근 30일" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="30d" className="rounded-lg">
                최근 30일
              </SelectItem>
              <SelectItem value="14d" className="rounded-lg">
                최근 14일
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                최근 7일
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-62.5 w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillPrice" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-price)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-price)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillMean" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-mean)"
                  stopOpacity={0.4}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-mean)"
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("ko-KR", {
                  month: "numeric",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("ko-KR", {
                      month: "long",
                      day: "numeric",
                    })
                  }}
                  formatter={(value) =>
                    `₩${Number(value).toLocaleString("ko-KR")}`
                  }
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="mean"
              type="natural"
              fill="url(#fillMean)"
              stroke="var(--color-mean)"
              strokeDasharray="4 4"
            />
            <Area
              dataKey="price"
              type="natural"
              fill="url(#fillPrice)"
              stroke="var(--color-price)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
