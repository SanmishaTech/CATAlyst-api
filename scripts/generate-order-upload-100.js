/*
  Generate backend/docs/ORDER_UPLOAD-100.json with 100 orders.
  Each order includes ALL headers used by the Excel/JSON import (set to null by default),
  and fills all required fields with valid enum values + a few useful fields (symbol, qty, price).
*/

// node .\scripts\generate-order-upload-100.js

const fs = require('fs');
const path = require('path');
const { OrderAction, OrderCapacity, OrderSide, OrderType } = require('../src/constants/orderEnums');

// Headers copied from src/controllers/templateController.js to ensure 1:1 alignment
const headers = [
  "orderId",
  "orderIdVersion",
  "orderIdSession",
  "orderIdInstance",
  "parentOrderId",
  "cancelreplaceOrderId",
  "linkedOrderId",
  "orderAction",
  "orderStatus",
  "orderCapacity",
  "orderDestination",
  "orderClientRef",
  "orderClientRefDetails",
  "orderExecutingEntity",
  "orderBookingEntity",
  "orderPositionAccount",
  "orderSide",
  "orderClientCapacity",
  "orderManualIndicator",
  "orderRequestTime",
  "orderEventTime",
  "orderManualTimestamp",
  "orderOmsSource",
  "orderPublishingTime",
  "orderTradeDate",
  "orderQuantity",
  "orderPrice",
  "orderType",
  "orderTimeInforce",
  "orderExecutionInstructions",
  "orderAttributes",
  "orderRestrictions",
  "orderAuctionIndicator",
  "orderSwapIndicator",
  "orderOsi",
  "orderInstrumentId",
  "orderLinkedInstrumentId",
  "orderCurrencyId",
  "orderFlowType",
  "orderAlgoInstruction",
  "orderSymbol",
  "orderInstrumentReference",
  "orderInstrumentReferenceValue",
  "orderOptionPutCall",
  "orderOptionStrikePrice",
  "orderOptionLegIndicator",
  "orderComplianceId",
  "orderEntityId",
  "orderExecutingAccount",
  "orderClearingAccount",
  "orderClientOrderId",
  "orderRoutedOrderId",
  "orderTradingOwner",
  "orderExtendedAttribute",
  "orderQuoteId",
  "orderRepresentOrderId",
  "orderOnBehalfCompId",
  "orderSpread",
  "orderAmendReason",
  "orderCancelRejectReason",
  "orderBidSize",
  "orderBidPrice",
  "orderAskSize",
  "orderAskPrice",
  "orderBasketId",
  "orderCumQty",
  "orderLeavesQty",
  "orderStopPrice",
  "orderDiscretionPrice",
  "orderExdestinationInstruction",
  "orderExecutionParameter",
  "orderInfobarrierId",
  "orderLegRatio",
  "orderLocateId",
  "orderNegotiatedIndicator",
  "orderOpenClose",
  "orderParticipantPriorityCode",
  "orderActionInitiated",
  "orderPackageIndicator",
  "orderPackageId",
  "orderPackagePricetype",
  "orderStrategyType",
  "orderSecondaryOffering",
  "orderStartTime",
  "orderTifExpiration",
  "orderParentChildType",
  "orderMinimumQty",
  "orderTradingSession",
  "orderDisplayPrice",
  "orderSeqNumber",
  "atsDisplayIndicator",
  "orderDisplayQty",
  "orderWorkingPrice",
  "atsOrderType",
  "orderNbboSource",
  "orderNbboTimestamp",
  "orderSolicitationFlag",
  "orderNetPrice",
  "routeRejectedFlag",
  "orderOriginationSystem",
];

const validActions = [
  OrderAction.orderRequested,
  OrderAction.orderReplaced,
  OrderAction.orderCanceled,
].filter(Boolean);

const validCapacities = [
  OrderCapacity.agency,
  OrderCapacity.principal,
  OrderCapacity.risklessPrincipal,
  OrderCapacity.individual,
].filter(Boolean);

const validSides = [
  OrderSide.buy,
  OrderSide.sellLong,
  OrderSide.sellShort,
].filter(Boolean);

const validTypes = [
  OrderType.market,
  OrderType.limit,
  OrderType.stopLoss,
  OrderType.stopLimit,
].filter(Boolean);

const symbols = ["AAPL", "MSFT", "GOOGL", "TSLA", "NVDA", "AMZN", "META", "NFLX", "ORCL", "INTC", "AMD"];

function pad(n, w = 3) { return String(n).padStart(w, '0'); }

function buildOrder(i) {
  // Start with all keys present, null values
  const order = Object.fromEntries(headers.map(h => [h, null]));

  // Required + practical fields
  order.orderId = `ORD-${pad(i)}`;
  order.orderAction = validActions[(i - 1) % validActions.length];
  order.orderCapacity = validCapacities[(i - 1) % validCapacities.length];
  order.orderSide = validSides[(i - 1) % validSides.length];
  order.orderType = validTypes[(i - 1) % validTypes.length];

  order.orderOmsSource = `TradingSystem${((i - 1) % 3) + 1}`;
  const minute = 30 + ((i - 1) % 30);
  order.orderPublishingTime = `2024-01-15T09:${String(minute).padStart(2, '0')}:00`;
  order.orderComplianceId = `COMP-${pad(i)}`;
  order.orderOriginationSystem = `OMS-SYSTEM-${((i - 1) % 3) + 1}`;

  // Helpful extras
  order.orderSymbol = symbols[(i - 1) % symbols.length];
  order.orderQuantity = 50 + ((i - 1) % 500);
  order.orderPrice = 10 + ((i - 1) % 990) + 0.5;

  // Some reasonable optional demo values (others left null intentionally)
  order.orderIdVersion = 1;
  order.orderIdSession = 1;
  order.orderTradeDate = "2024-01-15";
  order.orderDisplayQty = order.orderQuantity;
  order.orderWorkingPrice = order.orderPrice;

  return order;
}

function main() {
  const orders = [];
  for (let i = 1; i <= 100; i++) {
    orders.push(buildOrder(i));
  }

  const out = { orders };
  const outPath = path.join(__dirname, '..', 'docs', 'ORDER_UPLOAD-100.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`Wrote ${orders.length} orders to ${outPath}`);
}

if (require.main === module) {
  main();
}
