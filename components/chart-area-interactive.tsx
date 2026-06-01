"use client";

import * as React from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ChartEntry = {
  tradeDate: string;
  closePrice: number;
  rollingMean: number;
  upperBand: number;
  lowerBand: number;
  zScore: number;
  signal: string;
  executedOrderSide: string;
  totalAssetKrw: number;
};

type Run = {
  symbol: string;
  companyName: string;
  returnRatePercent: number;
};

type Props = {
  chartDataMap: Record<string, ChartEntry[]>;
  runs: Run[];
};

const chartConfig = {
  closePrice: {
    label: "종가",
    color: "var(--primary)",
  },
  rollingMean: {
    label: "9일 이동평균",
    color: "var(--chart-2)",
  },
  upperBand: {
    label: "상단밴드 (+2σ)",
    color: "var(--chart-4)",
  },
  lowerBand: {
    label: "하단밴드 (-2σ)",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

type DotProps = {
  cx?: number;
  cy?: number;
  payload?: ChartEntry;
  index?: number;
};

function TradeDot({ cx = 0, cy = 0, payload }: DotProps) {
  if (!payload) return null;
  if (payload.executedOrderSide === "BUY") {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill="#22c55e"
        stroke="white"
        strokeWidth={2}
      />
    );
  }
  if (payload.executedOrderSide === "SELL") {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill="#ef4444"
        stroke="white"
        strokeWidth={2}
      />
    );
  }
  return <circle cx={cx} cy={cy} r={0} fill="transparent" />;
}

export function ChartAreaInteractive({ chartDataMap, runs }: Props) {
  const [selectedSymbol, setSelectedSymbol] = React.useState("017670");

  const data = chartDataMap[selectedSymbol] ?? [];
  const selectedRun = runs.find((r) => r.symbol === selectedSymbol);

  const priceValues = data.flatMap((d) => [
    d.closePrice,
    d.upperBand,
    d.lowerBand,
  ]);
  const yMin = Math.floor(Math.min(...priceValues) * 0.995);
  const yMax = Math.ceil(Math.max(...priceValues) * 1.005);

  const returnLabel =
    selectedRun && selectedRun.returnRatePercent !== 0
      ? `${selectedRun.returnRatePercent > 0 ? "+" : ""}${selectedRun.returnRatePercent.toFixed(2)}%`
      : "거래 없음";

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>
          {selectedRun?.companyName ?? selectedSymbol} ({selectedSymbol}) — 5월
          가격 추이
        </CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            수익률 {returnLabel}
          </span>
          <span className="@[540px]/card:hidden">
            가격 / 밴드 · {returnLabel}
          </span>
        </CardDescription>
        <CardAction>
          <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
            <SelectTrigger
              className="w-44 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate"
              size="sm"
              aria-label="종목 선택"
            >
              <SelectValue placeholder="종목 선택" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {runs.map((run) => (
                <SelectItem
                  key={run.symbol}
                  value={run.symbol}
                  className="rounded-lg"
                >
                  {run.companyName} ({run.symbol})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-72 w-full"
        >
          <ComposedChart data={data} margin={{ left: 0, right: 8 }}>
            <defs>
              <linearGradient id="fillClosePrice" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-closePrice)"
                  stopOpacity={0.9}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-closePrice)"
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="tradeDate"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={28}
              tickFormatter={(value) =>
                new Date(value).toLocaleDateString("ko-KR", {
                  month: "numeric",
                  day: "numeric",
                })
              }
            />
            <YAxis
              domain={[yMin, yMax]}
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              width={72}
              tickFormatter={(value) =>
                `₩${Number(value).toLocaleString("ko-KR")}`
              }
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString("ko-KR", {
                      month: "long",
                      day: "numeric",
                    })
                  }
                  formatter={(value, name) => {
                    const labels: Record<string, string> = {
                      closePrice: "종가",
                      rollingMean: "이동평균",
                      upperBand: "상단밴드",
                      lowerBand: "하단밴드",
                    };
                    return [
                      `₩${Math.round(Number(value)).toLocaleString("ko-KR")}`,
                      labels[name as string] ?? name,
                    ];
                  }}
                  indicator="dot"
                />
              }
            />
            {/* Bollinger bands */}
            <Line
              dataKey="upperBand"
              type="monotone"
              stroke="var(--color-upperBand)"
              strokeWidth={1}
              strokeDasharray="3 5"
              dot={false}
              opacity={0.55}
            />
            <Line
              dataKey="lowerBand"
              type="monotone"
              stroke="var(--color-lowerBand)"
              strokeWidth={1}
              strokeDasharray="3 5"
              dot={false}
              opacity={0.55}
            />
            {/* Rolling mean */}
            <Line
              dataKey="rollingMean"
              type="monotone"
              stroke="var(--color-rollingMean)"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
            />
            {/* Close price with trade markers */}
            <Area
              dataKey="closePrice"
              type="monotone"
              fill="url(#fillClosePrice)"
              stroke="var(--color-closePrice)"
              strokeWidth={2}
              dot={(props: DotProps) => (
                <TradeDot key={props.payload?.tradeDate} {...props} />
              )}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ChartContainer>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 px-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full bg-green-500" />
            BUY 체결
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full bg-red-500" />
            SELL 체결
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-px w-5"
              style={{ borderTop: "1.5px dashed var(--chart-2)" }}
            />
            9일 이동평균
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-px w-5"
              style={{ borderTop: "1px dashed var(--chart-4)", opacity: 0.6 }}
            />
            Z-score ±2σ
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
