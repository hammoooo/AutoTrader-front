"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  BarChart3Icon,
  MinusIcon,
} from "lucide-react";

type Run = {
  symbol: string;
  companyName: string;
  sector: string;
  initialBudgetKrw: number;
  finalAssetKrw: number;
  profitKrw: number;
  returnRatePercent: number;
  tradeCount: number;
  buyCount: number;
  sellCount: number;
  finalPositionQuantity: number;
  maxDrawdownPercent: number;
};

type PortfolioSummary = {
  symbolCount: number;
  totalInitialBudgetKrw: number;
  totalFinalAssetKrw: number;
  totalProfitKrw: number;
  totalReturnRatePercent: number;
  averageReturnRatePercent: number;
};

type Props = {
  portfolioSummary: PortfolioSummary;
  runs: Run[];
  period: { startDate: string; endDate: string };
  windowSize?: number;
  /** 기간 앞에 붙는 문구 (예: "백테스트 기간", "운용 기간") */
  periodCaption?: string;
  tradeCountLabel?: string;
  /** 체결 여부와 무관한 전체 주문 수 (실매매) */
  orderCount?: number;
};

function formatKRW(value: number) {
  return `₩${Math.abs(value).toLocaleString("ko-KR")}`;
}

function signed(value: number) {
  return `${value > 0 ? "+" : value < 0 ? "-" : ""}${formatKRW(value)}`;
}

function returnTone(value: number) {
  if (value > 0) return "text-green-600 border-green-200 dark:border-green-800";
  if (value < 0) return "text-red-600 border-red-200 dark:border-red-800";
  return "text-muted-foreground";
}

function ReturnIcon({ value, className }: { value: number; className?: string }) {
  if (value > 0) return <TrendingUpIcon className={className} />;
  if (value < 0) return <TrendingDownIcon className={className} />;
  return <MinusIcon className={className} />;
}

export function SectionCards({
  portfolioSummary,
  runs,
  period,
  windowSize = 9,
  periodCaption = "백테스트 기간",
  tradeCountLabel = "총 거래 건수",
  orderCount,
}: Props) {
  const sorted = [...runs].sort(
    (a, b) => b.returnRatePercent - a.returnRatePercent,
  );
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const totalTrades = runs.reduce((sum, r) => sum + r.tradeCount, 0);
  const isProfit = portfolioSummary.totalProfitKrw >= 0;

  const periodLabel = `${period.startDate.slice(5).replace("-", "/")} ~ ${period.endDate.slice(5).replace("-", "/")}`;

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      {/* Card 1: Total Portfolio Profit */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>포트폴리오 총 수익금</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isProfit ? "+" : "-"}
            {formatKRW(portfolioSummary.totalProfitKrw)}
          </CardTitle>
          <CardAction>
            <Badge
              variant="outline"
              className={
                isProfit
                  ? "text-green-600 border-green-200 dark:border-green-800"
                  : "text-red-600 border-red-200 dark:border-red-800"
              }
            >
              {isProfit ? <TrendingUpIcon /> : <TrendingDownIcon />}
              {isProfit ? "+" : ""}
              {portfolioSummary.totalReturnRatePercent.toFixed(2)}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            원금 {formatKRW(portfolioSummary.totalInitialBudgetKrw)} 기준
          </div>
          <div className="text-muted-foreground">
            최종 자산 {formatKRW(portfolioSummary.totalFinalAssetKrw)}
          </div>
        </CardFooter>
      </Card>

      {/* Card 2: Trade Stats */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>{tradeCountLabel}</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {totalTrades}건
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <BarChart3Icon />
              {portfolioSummary.symbolCount}개 종목
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Z-Score 평균회귀 전략 (Window {windowSize})
          </div>
          <div className="text-muted-foreground">
            {periodCaption} {periodLabel}
            {orderCount !== undefined && ` · 주문 ${orderCount}건`}
          </div>
        </CardFooter>
      </Card>

      {/* Card 3: Best Stock */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>최고 수익 종목</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {best.companyName}
          </CardTitle>
          <CardAction>
            <Badge
              variant="outline"
              className={returnTone(best.returnRatePercent)}
            >
              <ReturnIcon value={best.returnRatePercent} />
              {best.returnRatePercent > 0 ? "+" : ""}
              {best.returnRatePercent.toFixed(2)}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            수익금 {signed(best.profitKrw)}{" "}
            <ReturnIcon value={best.profitKrw} className="size-4" />
          </div>
          <div className="text-muted-foreground">
            {best.sector} - {best.tradeCount}건 거래
            {/* {best.maxDrawdownPercent.toFixed(2)}% */}
          </div>
        </CardFooter>
      </Card>

      {/* Card 4: Worst Stock */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>최저 수익 종목</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {worst.companyName}
          </CardTitle>
          <CardAction>
            <Badge
              variant="outline"
              className={
                worst.returnRatePercent < 0
                  ? returnTone(worst.returnRatePercent)
                  : "text-muted-foreground"
              }
            >
              {worst.returnRatePercent < 0 ? (
                <TrendingDownIcon />
              ) : (
                <MinusIcon />
              )}
              {worst.returnRatePercent >= 0 ? "+" : ""}
              {worst.returnRatePercent.toFixed(2)}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            수익금 {worst.profitKrw >= 0 ? "+" : "-"}
            {formatKRW(worst.profitKrw)} <TrendingDownIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">
            {worst.sector} - {worst.tradeCount}건 거래
            {/* {worst.maxDrawdownPercent.toFixed(2)}% */}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
