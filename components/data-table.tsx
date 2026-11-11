"use client"

import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  ChevronUpIcon,
  ChevronDownIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
} from "lucide-react"

export type Run = {
  symbol: string
  companyName: string
  sector: string
  initialBudgetKrw: number
  finalAssetKrw: number
  profitKrw: number
  returnRatePercent: number
  tradeCount: number
  buyCount: number
  sellCount: number
  finalPositionQuantity: number
  maxDrawdownPercent: number
  // 실매매 전용 (백테스트 데이터에는 없음)
  orderCount?: number
  rejectedOrderCount?: number
  unconfirmedOrderCount?: number
  finalEvaluationPrice?: number | null
  lastEvaluatedDate?: string | null
  /** 운용 중 최저 현금. 음수면 종목 예산을 넘겨 매수한 것 */
  minCashKrw?: number
}

export type Trade = {
  tradeDate: string
  side: string
  quantity: number
  price: number
  commissionKrw: number
  sellTaxKrw: number
  /** 체결되지 않은 주문(실매매)은 null */
  cashKrwAfterExecution: number | null
  totalAssetKrwAfterExecution: number | null
  note: string
  symbol: string
  companyName: string
  /** 실매매 주문 상태: SUBMITTED | REJECTED | SUBMISSION_UNKNOWN | NOT_SUBMITTED */
  orderStatus?: string
}

type Labels = {
  resultTitle: string
  periodLabel: string
}

const ORDER_STATUS: Record<string, { label: string; className: string }> = {
  SUBMITTED: {
    label: "체결",
    className: "text-blue-600 border-blue-200 dark:border-blue-800",
  },
  REJECTED: {
    label: "거절",
    className: "text-red-600 border-red-200 dark:border-red-800",
  },
  SUBMISSION_UNKNOWN: {
    label: "미확인",
    className: "text-amber-600 border-amber-200 dark:border-amber-800",
  },
  NOT_SUBMITTED: {
    label: "미제출",
    className: "text-muted-foreground",
  },
}

function isFilled(trade: Trade) {
  return trade.totalAssetKrwAfterExecution !== null
}

function formatKRW(value: number) {
  return `₩${Math.abs(value).toLocaleString("ko-KR")}`
}

function ReturnBadge({ value }: { value: number }) {
  if (value > 0)
    return (
      <span className="font-semibold tabular-nums text-green-600">
        +{value.toFixed(2)}%
      </span>
    )
  if (value < 0)
    return (
      <span className="font-semibold tabular-nums text-red-600">
        {value.toFixed(2)}%
      </span>
    )
  return (
    <span className="font-semibold tabular-nums text-muted-foreground">
      0.00%
    </span>
  )
}

function SortHeader({
  label,
  column,
}: {
  label: string
  column: { getIsSorted: () => false | "asc" | "desc"; toggleSorting: (desc?: boolean) => void }
}) {
  const sorted = column.getIsSorted()
  return (
    <button
      className="flex items-center gap-1 hover:text-foreground transition-colors"
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {label}
      {sorted === "asc" ? (
        <ChevronUpIcon className="size-3" />
      ) : sorted === "desc" ? (
        <ChevronDownIcon className="size-3" />
      ) : (
        <span className="size-3 opacity-30">↕</span>
      )}
    </button>
  )
}

const buildRunColumns = (labels: Labels): ColumnDef<Run>[] => [
  {
    accessorKey: "companyName",
    header: "종목",
    cell: ({ row }) => <RunCellViewer run={row.original} labels={labels} />,
    enableHiding: false,
  },
  {
    accessorKey: "sector",
    header: "섹터",
    cell: ({ row }) => (
      <Badge variant="outline" className="text-xs">
        {row.original.sector}
      </Badge>
    ),
  },
  {
    accessorKey: "returnRatePercent",
    header: ({ column }) => (
      <div className="text-right">
        <SortHeader label="수익률" column={column} />
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right">
        <ReturnBadge value={row.original.returnRatePercent} />
      </div>
    ),
  },
  {
    accessorKey: "profitKrw",
    header: () => <div className="text-right">수익금</div>,
    cell: ({ row }) => {
      const v = row.original.profitKrw
      return (
        <div
          className={`text-right tabular-nums ${v > 0 ? "text-green-600" : v < 0 ? "text-red-600" : "text-muted-foreground"}`}
        >
          {v >= 0 ? "+" : "-"}{formatKRW(v)}
        </div>
      )
    },
  },
  {
    accessorKey: "finalAssetKrw",
    header: () => <div className="text-right">최종 자산</div>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">{formatKRW(row.original.finalAssetKrw)}</div>
    ),
  },
  {
    accessorKey: "tradeCount",
    header: () => <div className="text-right">거래수</div>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">{row.original.tradeCount}건</div>
    ),
  },
  {
    accessorKey: "finalPositionQuantity",
    header: "보유",
    cell: ({ row }) => {
      const qty = row.original.finalPositionQuantity
      return qty > 0 ? (
        <Badge variant="outline" className="text-xs text-blue-600 border-blue-200 dark:border-blue-800">
          {qty}주
        </Badge>
      ) : (
        <Badge variant="outline" className="text-xs text-muted-foreground">
          없음
        </Badge>
      )
    },
  },
]

const buildTradeColumns = (withStatus: boolean): ColumnDef<Trade>[] => [
  {
    accessorKey: "tradeDate",
    header: "날짜",
    cell: ({ row }) => (
      <span className="tabular-nums">
        {new Date(row.original.tradeDate).toLocaleDateString("ko-KR", {
          month: "2-digit",
          day: "2-digit",
        })}
      </span>
    ),
  },
  {
    accessorKey: "companyName",
    header: "종목",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.companyName}</div>
        <div className="text-xs text-muted-foreground">{row.original.symbol}</div>
      </div>
    ),
    enableHiding: false,
  },
  {
    accessorKey: "side",
    header: "구분",
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={`font-semibold ${row.original.side === "BUY" ? "text-green-600 border-green-200 dark:border-green-800" : "text-red-600 border-red-200 dark:border-red-800"}`}
      >
        {row.original.side === "BUY" ? (
          <TrendingUpIcon className="size-3" />
        ) : (
          <TrendingDownIcon className="size-3" />
        )}
        {row.original.side}
      </Badge>
    ),
  },
  ...(withStatus
    ? [
        {
          accessorKey: "orderStatus",
          header: "상태",
          cell: ({ row }) => {
            const { orderStatus, note } = row.original
            // 결과 미확인 주문을 체결로 간주한 경우도 "체결"로 표시
            const status = isFilled(row.original)
              ? ORDER_STATUS.SUBMITTED
              : ORDER_STATUS[orderStatus ?? ""]
            const label = status?.label ?? orderStatus
            return (
              <Badge
                variant="outline"
                title={note}
                className={`text-xs ${status?.className ?? ""}`}
              >
                {label}
              </Badge>
            )
          },
        } satisfies ColumnDef<Trade>,
      ]
    : []),
  {
    accessorKey: "quantity",
    header: () => <div className="text-right">수량</div>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {row.original.quantity.toLocaleString("ko-KR")}주
      </div>
    ),
  },
  {
    accessorKey: "price",
    header: () => <div className="text-right">{withStatus ? "주문가" : "체결가"}</div>,
    cell: ({ row }) => (
      <div
        className={`text-right tabular-nums ${isFilled(row.original) ? "" : "text-muted-foreground"}`}
      >
        {formatKRW(row.original.price)}
      </div>
    ),
  },
  {
    id: "amount",
    header: () => (
      <div className="text-right">{withStatus ? "주문금액" : "체결금액"}</div>
    ),
    cell: ({ row }) => (
      <div
        className={`text-right tabular-nums ${isFilled(row.original) ? "" : "text-muted-foreground line-through"}`}
      >
        {formatKRW(row.original.price * row.original.quantity)}
      </div>
    ),
  },
  {
    accessorKey: "totalAssetKrwAfterExecution",
    header: () => <div className="text-right">체결 후 자산</div>,
    cell: ({ row }) => {
      const asset = row.original.totalAssetKrwAfterExecution
      return (
        <div className="text-right tabular-nums">
          {asset === null ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            formatKRW(asset)
          )}
        </div>
      )
    },
  },
]

function RunTable({ runs, labels }: { runs: Run[]; labels: Labels }) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "returnRatePercent", desc: true },
  ])
  const columns = React.useMemo(() => buildRunColumns(labels), [labels])

  const table = useReactTable({
    data: runs,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-muted">
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((h) => (
                <TableHead key={h.id} colSpan={h.colSpan}>
                  {h.isPlaceholder
                    ? null
                    : flexRender(h.column.columnDef.header, h.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function TradeTable({ trades }: { trades: Trade[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "tradeDate", desc: false },
  ])
  const withStatus = trades.some((t) => t.orderStatus !== undefined)
  const columns = React.useMemo(() => buildTradeColumns(withStatus), [withStatus])

  const table = useReactTable({
    data: trades,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-muted">
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((h) => (
                <TableHead key={h.id} colSpan={h.colSpan}>
                  {h.isPlaceholder
                    ? null
                    : flexRender(h.column.columnDef.header, h.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function DataTable({
  runs,
  trades,
  resultTitle = "백테스트 결과",
  periodLabel = "2026년 5월",
  tradesFootnote,
}: {
  runs: Run[]
  trades: Trade[]
  /** 종목 상세 Drawer 제목 접미사 */
  resultTitle?: string
  /** 종목 상세 Drawer 부제의 기간 */
  periodLabel?: string
  /** 거래 내역 탭 아래 각주 */
  tradesFootnote?: string
}) {
  const filled = trades.filter(isFilled)
  const buyCount = filled.filter((t) => t.side === "BUY").length
  const sellCount = filled.filter((t) => t.side === "SELL").length
  const labels = React.useMemo(
    () => ({ resultTitle, periodLabel }),
    [resultTitle, periodLabel],
  )

  return (
    <Tabs defaultValue="performance" className="w-full flex-col justify-start gap-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <TabsList>
          <TabsTrigger value="performance">
            종목별 성과
            <Badge variant="secondary" className="ml-1 size-5 rounded-full px-0 text-center text-[10px]">
              {runs.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="trades">
            거래 내역
            <Badge variant="secondary" className="ml-1 size-5 rounded-full px-0 text-center text-[10px]">
              {trades.length}
            </Badge>
          </TabsTrigger>
        </TabsList>
        <div className="hidden text-xs text-muted-foreground @4xl/main:flex gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block size-2 rounded-full bg-green-500" />
            매수 {buyCount}건
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block size-2 rounded-full bg-red-500" />
            매도 {sellCount}건
          </span>
        </div>
      </div>

      <TabsContent value="performance" className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
        <RunTable runs={runs} labels={labels} />
      </TabsContent>

      <TabsContent value="trades" className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
        <TradeTable trades={trades} />
        {tradesFootnote && (
          <p className="text-xs text-muted-foreground">{tradesFootnote}</p>
        )}
      </TabsContent>
    </Tabs>
  )
}

const drawerChartConfig = {
  totalAssetKrw: {
    label: "총 자산",
    color: "var(--primary)",
  },
} satisfies ChartConfig

function RunCellViewer({ run, labels }: { run: Run; labels: Labels }) {
  const isMobile = useIsMobile()

  const assetChartData = [
    { label: "초기", totalAssetKrw: run.initialBudgetKrw },
    { label: "최종", totalAssetKrw: run.finalAssetKrw },
  ]

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button variant="link" className="w-fit px-0 text-left text-foreground">
          <span className="font-medium">{run.companyName}</span>
          <span className="ml-2 text-xs text-muted-foreground">{run.symbol}</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>
            {run.companyName} ({run.symbol}) — {labels.resultTitle}
          </DrawerTitle>
          <DrawerDescription>{run.sector} · {labels.periodLabel}</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          {!isMobile && (
            <>
              <div className="grid grid-cols-2 gap-3 rounded-lg border p-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">수익률</span>
                  <span className={`text-lg font-bold tabular-nums ${run.returnRatePercent > 0 ? "text-green-600" : run.returnRatePercent < 0 ? "text-red-600" : ""}`}>
                    {run.returnRatePercent >= 0 ? "+" : ""}{run.returnRatePercent.toFixed(3)}%
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">수익금</span>
                  <span className={`text-lg font-bold tabular-nums ${run.profitKrw > 0 ? "text-green-600" : run.profitKrw < 0 ? "text-red-600" : ""}`}>
                    {run.profitKrw >= 0 ? "+" : "-"}₩{Math.abs(run.profitKrw).toLocaleString("ko-KR")}
                  </span>
                </div>
              </div>
              <Separator />
            </>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">초기 자금</span>
              <span className="font-medium tabular-nums">₩{run.initialBudgetKrw.toLocaleString("ko-KR")}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">최종 자산</span>
              <span className="font-medium tabular-nums">₩{run.finalAssetKrw.toLocaleString("ko-KR")}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">총 거래수</span>
              <span className="font-medium">{run.tradeCount}건</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">매수 / 매도</span>
              <span className="font-medium">{run.buyCount}건 / {run.sellCount}건</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">최대 낙폭 (MDD)</span>
              <span className={`font-medium tabular-nums ${run.maxDrawdownPercent < 0 ? "text-red-600" : ""}`}>
                {run.maxDrawdownPercent.toFixed(4)}%
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">잔여 보유 수량</span>
              <span className="font-medium">
                {run.finalPositionQuantity > 0 ? `${run.finalPositionQuantity}주` : "없음"}
              </span>
            </div>
            {run.orderCount !== undefined && (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">
                  주문 / 거절{run.unconfirmedOrderCount ? " / 미확인" : ""}
                </span>
                <span className="font-medium">
                  {run.orderCount}건 / {run.rejectedOrderCount ?? 0}건
                  {run.unconfirmedOrderCount ? ` / ${run.unconfirmedOrderCount}건` : ""}
                </span>
              </div>
            )}
            {run.minCashKrw !== undefined && run.minCashKrw < 0 && (
              <div className="col-span-2 flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">예산 초과 매수</span>
                <span className="font-medium tabular-nums text-amber-600">
                  최저 현금 -₩{Math.abs(run.minCashKrw).toLocaleString("ko-KR")} (종목 예산 ₩{run.initialBudgetKrw.toLocaleString("ko-KR")} 초과)
                </span>
              </div>
            )}
            {run.finalEvaluationPrice != null && run.lastEvaluatedDate && (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">마지막 평가가</span>
                <span className="font-medium tabular-nums">
                  ₩{run.finalEvaluationPrice.toLocaleString("ko-KR")}
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({run.lastEvaluatedDate.slice(5).replace("-", "/")})
                  </span>
                </span>
              </div>
            )}
          </div>
          {!isMobile && run.tradeCount > 0 && (
            <>
              <Separator />
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 font-medium leading-none">
                  {run.returnRatePercent > 0 ? (
                    <>수익 실현 <TrendingUpIcon className="size-4 text-green-600" /></>
                  ) : (
                    <>손실 발생 <TrendingDownIcon className="size-4 text-red-600" /></>
                  )}
                </div>
                <div className="text-muted-foreground">
                  초기 ₩{run.initialBudgetKrw.toLocaleString("ko-KR")} → 최종 ₩{run.finalAssetKrw.toLocaleString("ko-KR")}
                </div>
              </div>
            </>
          )}
          {!isMobile && run.tradeCount === 0 && (
            <>
              <Separator />
              <div className="flex items-center gap-2 text-muted-foreground">
                <MinusIcon className="size-4" />
                <span>
                  {run.orderCount
                    ? `매매 신호로 주문 ${run.orderCount}건이 나갔지만 체결되지 않아 초기 자금 유지`
                    : "이 종목은 매매 신호가 발생하지 않아 거래 없이 초기 자금 유지"}
                </span>
              </div>
            </>
          )}
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">닫기</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
