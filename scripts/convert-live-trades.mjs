#!/usr/bin/env node
// 실매매(KIS 모의투자) export CSV → 대시보드용 JSON 변환기
//
// 사용법:
//   node scripts/convert-live-trades.mjs <export-dir> [output-dir] [--unknown-as-unfilled]
//
// <export-dir> 에는 zscore_trade_plan.csv 와 trade_order.csv 가 있어야 합니다.
// 기본 output-dir: public/data/live/paper-trading
//
// 생성 파일 (백테스트 bt-* 폴더와 같은 구조):
//   summary.json                 포트폴리오 요약 + 종목별 runs
//   <symbol>/chart.json          평가 시점별 가격 · 밴드 · 자산
//   <symbol>/trades.json         주문 내역 (접수/거절/미확인 포함)
//   <symbol>/daily-results.json  CSV 원본 평가 로그 + 주문 상태 + 장부
//
// 체결 판정 (trade_order.csv 기준):
//   SUBMITTED + broker_acknowledged=t → 체결
//   SUBMISSION_UNKNOWN (제출 결과 미확인) → 기본값은 체결로 간주하고 대시보드에도 일반 체결로 표시.
//                                           --unknown-as-unfilled 를 주면 미체결로 처리
//   REJECTED                               → 미체결
// 시장가 주문이라 실제 체결가는 export 에 없으므로
// 주문 기준가(reference_price)로 체결됐다고 가정합니다. 수수료·세금은 0 으로 둡니다
// (백테스트와 동일한 가정).

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

const cliArgs = process.argv.slice(2)
const UNKNOWN_AS_FILLED = !cliArgs.includes("--unknown-as-unfilled")
const [exportDirArg, outDirArg] = cliArgs.filter((a) => !a.startsWith("--"))
if (!exportDirArg) {
  console.error(
    "usage: node scripts/convert-live-trades.mjs <export-dir> [output-dir] [--unknown-as-unfilled]",
  )
  process.exit(1)
}
const exportDir = path.resolve(exportDirArg)
const outDir = path.resolve(outDirArg ?? path.join(projectRoot, "public/data/live/paper-trading"))

const Z_THRESHOLD = 2

// ---------- CSV ----------

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ""
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') {
        quoted = false
      } else {
        field += c
      }
    } else if (c === '"') {
      quoted = true
    } else if (c === ",") {
      row.push(field)
      field = ""
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++
      row.push(field)
      field = ""
      if (row.some((v) => v !== "")) rows.push(row)
      row = []
    } else {
      field += c
    }
  }
  row.push(field)
  if (row.some((v) => v !== "")) rows.push(row)

  const [header, ...body] = rows
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])))
}

function readCsv(name) {
  const file = path.join(exportDir, name)
  if (!fs.existsSync(file)) {
    console.error(`missing ${file}`)
    process.exit(1)
  }
  return parseCsv(fs.readFileSync(file, "utf8"))
}

// ---------- helpers ----------

const num = (v) => (v === "" || v == null ? null : Number(v))
const round = (v, digits) => {
  const f = 10 ** digits
  return Math.round(v * f) / f
}

// "2026-10-12 09:11:49.15185" (KST, tz 없음) → "2026-10-12T09:11:49.151850+09:00"
function kstIso(ts) {
  const [date, time] = ts.split(" ")
  const [hms, frac = ""] = time.split(".")
  return `${date}T${hms}.${frac.padEnd(6, "0").slice(0, 6)}+09:00`
}

const ORDER_NOTES = {
  SUBMITTED: "Z-score 신호 시점 시장가 주문 접수 (체결가는 주문 기준가로 추정)",
  SUBMISSION_UNKNOWN: "주문 제출 결과 미확인 — 체결되지 않은 것으로 처리",
  REJECTED: "브로커 주문 거절 — 체결 없음",
  NOT_SUBMITTED: "매매 제안이 주문으로 제출되지 않음",
}

// ---------- load ----------

const stocks = JSON.parse(fs.readFileSync(path.join(projectRoot, "public/data/stocks.json"), "utf8"))
const plans = readCsv("zscore_trade_plan.csv")
const orders = readCsv("trade_order.csv")

const orderKey = (symbol, date, side) => `${symbol}|${date}|${side}`
const orderByKey = new Map()
for (const o of orders) {
  const key = orderKey(o.symbol, o.prepared_at_kst.slice(0, 10), o.side)
  if (orderByKey.has(key)) console.warn(`duplicate order for ${key}; keeping the first`)
  else orderByKey.set(key, o)
}
const matchedOrders = new Set()

const windowSizes = new Set(plans.map((p) => Number(p.lookback_window)))
const budgets = new Set(plans.map((p) => Number(p.purchase_budget)))
if (windowSizes.size !== 1 || budgets.size !== 1) {
  console.warn("lookback_window / purchase_budget 가 행마다 다릅니다. 첫 값을 기준으로 요약합니다.")
}
const windowSize = [...windowSizes][0]
const budget = [...budgets][0]

const tradeDates = plans.map((p) => p.trade_date).sort()
const period = { startDate: tradeDates[0], endDate: tradeDates[tradeDates.length - 1] }

// ---------- per-symbol ledger ----------

const symbolsInData = new Set(plans.map((p) => p.symbol))
const orderedSymbols = [
  ...stocks.map((s) => s.symbol).filter((s) => symbolsInData.has(s)),
  ...[...symbolsInData].filter((s) => !stocks.some((st) => st.symbol === s)).sort(),
]

const runs = []
let lastEvaluatedAt = ""

for (const symbol of orderedSymbols) {
  const stock = stocks.find((s) => s.symbol === symbol) ?? { companyName: symbol, sector: "-" }
  const rows = plans
    .filter((p) => p.symbol === symbol)
    .sort((a, b) => a.evaluated_at_kst.localeCompare(b.evaluated_at_kst))

  let cash = budget
  let position = 0
  let peak = budget
  let maxDrawdown = 0
  let highest = budget
  let lowest = budget

  const chart = []
  const trades = []
  const daily = []

  for (const r of rows) {
    const price = Number(r.current_price)
    const mean = Number(r.rolling_mean)
    const std = Number(r.rolling_stddev)
    const z = Number(r.z_score)
    const proposalSide = r.proposal_side || null

    const order = proposalSide
      ? orderByKey.get(orderKey(symbol, r.trade_date, proposalSide))
      : undefined
    if (order) matchedOrders.add(order)

    const orderStatus = proposalSide ? (order?.state ?? "NOT_SUBMITTED") : null
    const filled =
      (order?.state === "SUBMITTED" && order.broker_acknowledged === "t") ||
      (UNKNOWN_AS_FILLED && order?.state === "SUBMISSION_UNKNOWN")
    // 대시보드용 상태: 체결로 간주한 미확인 주문은 일반 체결(SUBMITTED)로 표시.
    // 원본 상태는 daily-results.json 의 orderStatus / orderStateReason 에 남김
    const displayStatus =
      UNKNOWN_AS_FILLED && orderStatus === "SUBMISSION_UNKNOWN" ? "SUBMITTED" : orderStatus
    const quantity = order ? Number(order.quantity) : num(r.proposed_quantity)
    const orderPrice = order ? Number(order.reference_price) : (num(r.proposed_price) ?? price)

    if (filled) {
      if (proposalSide === "BUY") {
        cash -= quantity * orderPrice
        position += quantity
        if (cash < 0) {
          console.warn(
            `${symbol} ${r.trade_date}: BUY 후 현금 ${cash.toLocaleString("ko-KR")}원 — 종목 예산 초과`,
          )
        }
      } else {
        if (quantity > position) {
          console.warn(`${symbol} ${r.trade_date}: SELL ${quantity} > 보유 ${position}`)
        }
        cash += quantity * orderPrice
        position -= quantity
      }
    }

    const totalAsset = cash + position * price
    peak = Math.max(peak, totalAsset)
    maxDrawdown = Math.min(maxDrawdown, ((totalAsset - peak) / peak) * 100)
    highest = Math.max(highest, totalAsset)
    lowest = Math.min(lowest, totalAsset)

    const evaluatedAt = kstIso(r.evaluated_at_kst)
    if (evaluatedAt > lastEvaluatedAt) lastEvaluatedAt = evaluatedAt

    chart.push({
      tradeDate: r.trade_date,
      evaluatedAt,
      closePrice: price,
      rollingMean: mean,
      upperBand: round(mean + Z_THRESHOLD * std, 2),
      lowerBand: round(mean - Z_THRESHOLD * std, 2),
      zScore: z,
      signal: r.signal,
      executedOrderSide: filled ? proposalSide : "NONE",
      orderSide: proposalSide ?? "NONE",
      orderStatus: displayStatus ?? "NO_ORDER",
      totalAssetKrw: totalAsset,
      cashKrw: cash,
      positionQuantity: position,
    })

    if (proposalSide) {
      trades.push({
        tradeDate: r.trade_date,
        orderedAt: order ? kstIso(order.prepared_at_kst) : evaluatedAt,
        side: proposalSide,
        quantity,
        price: orderPrice,
        orderType: order?.order_type ?? "MARKET",
        orderStatus: displayStatus,
        brokerAcknowledged: order?.broker_acknowledged === "t",
        commissionKrw: 0,
        sellTaxKrw: 0,
        cashKrwAfterExecution: filled ? cash : null,
        positionQuantityAfterExecution: position,
        totalAssetKrwAfterExecution: filled ? totalAsset : null,
        note:
          displayStatus === "SUBMITTED"
            ? ORDER_NOTES.SUBMITTED
            : order?.state_reason || ORDER_NOTES[displayStatus],
      })
    }

    daily.push({
      tradeDate: r.trade_date,
      evaluatedAt,
      currentPrice: price,
      zScore: z,
      rollingMean: mean,
      rollingStddev: std,
      upperBand: round(mean + Z_THRESHOLD * std, 2),
      lowerBand: round(mean - Z_THRESHOLD * std, 2),
      deviationRatePercent: round(((price - mean) / mean) * 100, 4),
      signal: r.signal,
      signalReason: r.reason,
      proposalSide,
      proposedQuantity: num(r.proposed_quantity),
      proposedPrice: num(r.proposed_price),
      purchaseBudgetKrw: Number(r.purchase_budget),
      orderStatus: orderStatus ?? "NO_ORDER",
      orderStateReason: order?.state_reason || null,
      brokerAcknowledged: order ? order.broker_acknowledged === "t" : null,
      executedOrderSide: filled ? proposalSide : "NONE",
      executedQuantity: filled ? quantity : 0,
      executedPrice: filled ? orderPrice : null,
      cashKrw: cash,
      positionQuantity: position,
      totalAssetKrw: totalAsset,
    })
  }

  const last = chart[chart.length - 1]
  const finalAsset = last ? last.totalAssetKrw : budget
  const filledTrades = trades.filter((t) => t.cashKrwAfterExecution !== null)

  runs.push({
    symbol,
    companyName: stock.companyName,
    sector: stock.sector,
    initialBudgetKrw: budget,
    finalAssetKrw: finalAsset,
    profitKrw: finalAsset - budget,
    returnRatePercent: round(((finalAsset - budget) / budget) * 100, 3),
    tradeCount: filledTrades.length,
    buyCount: filledTrades.filter((t) => t.side === "BUY").length,
    sellCount: filledTrades.filter((t) => t.side === "SELL").length,
    finalPositionQuantity: position,
    maxDrawdownPercent: round(maxDrawdown, 4),
    finalCashKrw: cash,
    finalEvaluationPrice: last?.closePrice ?? null,
    lastEvaluatedDate: last?.tradeDate ?? null,
    highestAssetKrw: highest,
    lowestAssetKrw: lowest,
    evaluationCount: rows.length,
    signalCount: rows.filter((r) => r.signal !== "HOLD").length,
    orderCount: trades.length,
    rejectedOrderCount: trades.filter((t) => t.orderStatus === "REJECTED").length,
    unconfirmedOrderCount: trades.filter((t) => t.orderStatus === "SUBMISSION_UNKNOWN").length,
    minCashKrw: Math.min(budget, ...chart.map((c) => c.cashKrw)),
  })

  const symbolDir = path.join(outDir, symbol)
  fs.mkdirSync(symbolDir, { recursive: true })
  fs.writeFileSync(path.join(symbolDir, "chart.json"), JSON.stringify(chart, null, 2) + "\n")
  fs.writeFileSync(path.join(symbolDir, "trades.json"), JSON.stringify(trades, null, 2) + "\n")
  fs.writeFileSync(path.join(symbolDir, "daily-results.json"), JSON.stringify(daily, null, 2) + "\n")
}

for (const o of orders) {
  if (!matchedOrders.has(o)) {
    console.warn(`order without matching trade plan row: ${o.symbol} ${o.prepared_at_kst} ${o.side}`)
  }
}

const totalInitial = runs.reduce((s, r) => s + r.initialBudgetKrw, 0)
const totalFinal = runs.reduce((s, r) => s + r.finalAssetKrw, 0)

const summary = {
  runId: `paper-${period.startDate.replaceAll("-", "")}-${period.endDate.replaceAll("-", "")}`,
  source: "KIS 모의투자",
  createdAt: kstIso(
    new Date(Date.now() + 9 * 3600 * 1000).toISOString().replace("T", " ").replace("Z", ""),
  ),
  period,
  windowSize,
  zScoreThreshold: Z_THRESHOLD,
  initialBudgetKrwPerSymbol: budget,
  priceBasis: "영업일 장중 Z-score 평가 시점의 현재가",
  assumptions: {
    fillPrice: "시장가 주문의 기준가(reference_price)",
    feesAndTaxes: "미반영",
    submissionUnknownTreatedAsFilled: UNKNOWN_AS_FILLED,
  },
  valuation: {
    evaluatedAt: lastEvaluatedAt,
    note: "보유 종목은 각 종목의 마지막 평가 시점 현재가로 평가",
  },
  portfolioSummary: {
    symbolCount: runs.length,
    totalInitialBudgetKrw: totalInitial,
    totalFinalAssetKrw: totalFinal,
    totalProfitKrw: totalFinal - totalInitial,
    totalReturnRatePercent: round(((totalFinal - totalInitial) / totalInitial) * 100, 3),
    averageReturnRatePercent: round(runs.reduce((s, r) => s + r.returnRatePercent, 0) / runs.length, 3),
  },
  runs,
}

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2) + "\n")

console.log(`wrote ${path.relative(projectRoot, outDir)} (${runs.length} symbols, ${plans.length} evaluations, ${orders.length} orders)`)
for (const r of runs) {
  console.log(
    `  ${r.symbol} ${r.companyName.padEnd(6)} ${String(r.returnRatePercent).padStart(7)}%  체결 ${r.tradeCount} / 주문 ${r.orderCount}  보유 ${r.finalPositionQuantity}`,
  )
}
console.log(
  `  합계 ${summary.portfolioSummary.totalProfitKrw.toLocaleString("ko-KR")}원 (${summary.portfolioSummary.totalReturnRatePercent}%)`,
)
