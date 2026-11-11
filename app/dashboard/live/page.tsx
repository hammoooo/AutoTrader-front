import type { Metadata } from "next"

import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable, type Trade } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"

// 데이터 갱신: node scripts/convert-live-trades.mjs <autotrader-paper-export 폴더>
import rawSummary from "@/public/data/live/paper-trading/summary.json"
import chart005930 from "@/public/data/live/paper-trading/005930/chart.json"
import chart017670 from "@/public/data/live/paper-trading/017670/chart.json"
import chart030200 from "@/public/data/live/paper-trading/030200/chart.json"
import chart055550 from "@/public/data/live/paper-trading/055550/chart.json"
import chart105560 from "@/public/data/live/paper-trading/105560/chart.json"
import trades005930 from "@/public/data/live/paper-trading/005930/trades.json"
import trades017670 from "@/public/data/live/paper-trading/017670/trades.json"
import trades030200 from "@/public/data/live/paper-trading/030200/trades.json"
import trades055550 from "@/public/data/live/paper-trading/055550/trades.json"
import trades105560 from "@/public/data/live/paper-trading/105560/trades.json"

export const metadata: Metadata = {
  title: "실매매 대시보드 | AutoTrader",
  description: "Z-Score 평균회귀 전략 실매매(KIS 모의투자) 기록",
}

const chartDataMap = {
  "005930": chart005930,
  "017670": chart017670,
  "030200": chart030200,
  "055550": chart055550,
  "105560": chart105560,
} as Record<string, typeof chart030200>

const tradesMap: Record<string, Omit<Trade, "symbol" | "companyName">[]> = {
  "005930": trades005930,
  "017670": trades017670,
  "030200": trades030200,
  "055550": trades055550,
  "105560": trades105560,
}

const allTrades: Trade[] = rawSummary.runs
  .flatMap((run) =>
    (tradesMap[run.symbol] ?? []).map((t) => ({
      ...t,
      symbol: run.symbol,
      companyName: run.companyName,
    })),
  )
  .sort((a, b) => a.tradeDate.localeCompare(b.tradeDate))

const orderCount = rawSummary.runs.reduce((sum, r) => sum + r.orderCount, 0)

// 체결이 가장 많은 종목을 차트 기본값으로
const defaultSymbol = [...rawSummary.runs].sort(
  (a, b) => b.tradeCount - a.tradeCount || b.orderCount - a.orderCount,
)[0].symbol

const { startDate, endDate } = rawSummary.period
const shortPeriod = `${startDate.slice(5).replace("-", "/")} ~ ${endDate.slice(5).replace("-", "/")}`
const fullPeriod = `${startDate.replaceAll("-", ".")} ~ ${endDate.slice(5).replaceAll("-", ".")}`

export default function Page() {
  return (
    <>
      <SiteHeader title="실매매 대시보드" badge={rawSummary.source} />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <SectionCards
              portfolioSummary={rawSummary.portfolioSummary}
              runs={rawSummary.runs}
              period={rawSummary.period}
              windowSize={rawSummary.windowSize}
              periodCaption="운용 기간"
              tradeCountLabel="체결 건수"
              orderCount={orderCount}
            />
            <div className="px-4 lg:px-6">
              <ChartAreaInteractive
                chartDataMap={chartDataMap}
                runs={rawSummary.runs}
                defaultSymbol={defaultSymbol}
                periodLabel={shortPeriod}
                priceLabel="평가가"
                windowSize={rawSummary.windowSize}
              />
            </div>
            <DataTable
              runs={rawSummary.runs}
              trades={allTrades}
              resultTitle="실매매 결과"
              periodLabel={fullPeriod}
            />
          </div>
        </div>
      </div>
    </>
  )
}
