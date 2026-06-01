import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

import rawSummary from "@/public/data/backtests/bt-20260602-003020/summary.json"
import chart005930 from "@/public/data/backtests/bt-20260602-003020/005930/chart.json"
import chart017670 from "@/public/data/backtests/bt-20260602-003020/017670/chart.json"
import chart030200 from "@/public/data/backtests/bt-20260602-003020/030200/chart.json"
import chart055550 from "@/public/data/backtests/bt-20260602-003020/055550/chart.json"
import chart105560 from "@/public/data/backtests/bt-20260602-003020/105560/chart.json"
import trades017670 from "@/public/data/backtests/bt-20260602-003020/017670/trades.json"
import trades030200 from "@/public/data/backtests/bt-20260602-003020/030200/trades.json"
import trades055550 from "@/public/data/backtests/bt-20260602-003020/055550/trades.json"
import trades105560 from "@/public/data/backtests/bt-20260602-003020/105560/trades.json"

const chartDataMap = {
  "005930": chart005930,
  "017670": chart017670,
  "030200": chart030200,
  "055550": chart055550,
  "105560": chart105560,
} as Record<string, typeof chart017670>

const allTrades = [
  ...trades017670.map((t) => ({ ...t, symbol: "017670", companyName: "SK텔레콤" })),
  ...trades030200.map((t) => ({ ...t, symbol: "030200", companyName: "KT" })),
  ...trades055550.map((t) => ({ ...t, symbol: "055550", companyName: "신한지주" })),
  ...trades105560.map((t) => ({ ...t, symbol: "105560", companyName: "KB금융" })),
].sort((a, b) => a.tradeDate.localeCompare(b.tradeDate))

export default function Page() {
  return (
    <TooltipProvider>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <SectionCards
                  portfolioSummary={rawSummary.portfolioSummary}
                  runs={rawSummary.runs}
                  period={rawSummary.period}
                />
                <div className="px-4 lg:px-6">
                  <ChartAreaInteractive
                    chartDataMap={chartDataMap}
                    runs={rawSummary.runs}
                  />
                </div>
                <DataTable runs={rawSummary.runs} trades={allTrades} />
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
