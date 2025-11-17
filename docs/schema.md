{
  "orderId": {
    "type": "string",
    "min": 1
  },
  "orderIdVersion": {
    "type": "number",
    "int": true,
    "min": 1
  },
  "orderIdSession": {
    "type": "string",
    "min": 1
  },
  "orderIdInstance": {
    "type": "string",
    "min": 1
  },
  "parentOrderId": {
    "type": "string",
    "nullable": true
  },
  "cancelreplaceOrderId": {
    "type": "string",
    "nullable": true,
    "optional": true
  },
  "linkedOrderId": {
    "type": "string",
    "nullable": true,
    "optional": true
  },
  "orderAction": {
    "type": "enum",
    "values": ["Order Requested", "Order Request Accepted", "Order Internal Route", "Order Internal Route Acknowledged", "Order External Route", "Order External Route Acknowledged", "Order Canceled", "Order Replaced", "Order Replace - Client Requested", "Order Replace - Client Request Accepted", "Order Cancel - Client Requested", "Order Cancel - Client Request Accepted", "Order Expired", "Order External Route", "Order Externally Routed Accepted", "Order Rejected", "Order Suspended", "Done for day"]
  },
  "orderStatus": {
    "type": "enum",
    "values": ["Open", "Canceled", "Replaced", "Done for day", "Expired", "Rejected", "Partially filled", "Filled"]
  },
  "orderCapacity": {
    "type": "enum",
    "values": ["Agency", "Proprietary", "Individual", "Principal", "Riskless Principal", "Agent for Other Member"]
  },
  "orderDestination": {
    "type": "string",
    "min": 1
  },
  "orderClientRef": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderClientRefDetails": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderExecutingEntity": {
    "type": "number",
    "int": true
  },
  "orderBookingEntity": {
    "type": "number",
    "int": true
  },
  "orderPositionAccount": {
    "type": "number",
    "int": true
  },
  "orderSide": {
    "type": "enum",
    "values": ["Buy", "Sell Long", "Buy Minus", "Sell Plus", "Sell Short", "Sell Short Exempt"]
  },
  "orderClientCapacity": {
    "type": "enum",
    "values": ["Agency", "Proprietary", "Individual", "Principal", "Riskless Principal", "Agent for Other Member"]
  },
  "orderManualIndicator": {
    "type": "enum",
    "values": ["Manual", "Electronic"]
  },
  "orderRequestTime": {
    "type": "date"
  },
  "orderEventTime": {
    "type": "date"
  },
  "orderManualTimestamp": {
    "type": "date",
    "nullable": true,
    "optional": true
  },
  "orderOmsSource": {
    "type": "string",
    "min": 1
  },
  "orderPublishingTime": {
    "type": "date"
  },
  "orderTradeDate": {
    "type": "string",
    "min": 1
  },
  "orderQuantity": {
    "type": "number",
    "min": 1
  },
  "orderPrice": {
    "type": "number",
    "min": 0
  },
  "orderType": {
    "type": "enum",
    "values": ["Market", "Limit", "Stop Loss", "Stop Limit", "Market On Close", "Pegged", "Forex Swap"]
  },
  "orderTimeInforce": {
    "type": "enum",
    "values": ["Day", "Good Till Cancel", "At the Opening", "Immediate Or Cancel", "Fill Or Kill", "Good Till Crossing", "Good Till Date", "At the Close"]
  },
  "orderExecutionInstructions": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderAttributes": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderRestrictions": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderAuctionIndicator": {
    "type": "enum",
    "values": ["None", "AOK", "APCM", "AUC"],
    "optional": true,
    "nullable": true
  },
  "orderSwapIndicator": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderOsi": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderInstrumentId": {
    "type": "number",
    "int": true
  },
  "orderLinkedInstrumentId": {
    "type": "number",
    "int": true,
    "nullable": true,
    "optional": true
  },
  "orderCurrencyId": {
    "type": "string",
    "min": 3,
    "max": 3
  },
  "orderFlowType": {
    "type": "enum",
    "values": ["DMA", "Algo", "Sponsored Access"]
  },
  "orderAlgoInstruction": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderSymbol": {
    "type": "string",
    "min": 1
  },
  "orderInstrumentReference": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderInstrumentReferenceValue": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderOptionPutCall": {
    "type": "enum",
    "values": ["Call", "Put"],
    "optional": true,
    "nullable": true
  },
  "orderOptionStrikePrice": {
    "type": "number",
    "optional": true,
    "nullable": true
  },
  "orderOptionLegIndicator": {
    "type": "enum",
    "values": ["None", "Package", "Leg"],
    "optional": true,
    "nullable": true
  },
  "orderComplianceId": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderEntityId": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderExecutingAccount": {
    "type": "number",
    "int": true
  },
  "orderClearingAccount": {
    "type": "number",
    "int": true
  },
  "orderClientOrderId": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderRoutedOrderId": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderTradingOwner": {
    "type": "number",
    "int": true
  },
  "orderExtendedAttribute": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderQuoteId": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderRepresentOrderId": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderOnBehalfCompId": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderSpread": {
    "type": "number",
    "optional": true,
    "nullable": true
  },
  "orderAmendReason": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderCancelRejectReason": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderBidSize": {
    "type": "number",
    "optional": true,
    "nullable": true
  },
  "orderBidPrice": {
    "type": "number",
    "optional": true,
    "nullable": true
  },
  "orderAskSize": {
    "type": "number",
    "optional": true,
    "nullable": true
  },
  "orderAskPrice": {
    "type": "number",
    "optional": true,
    "nullable": true
  },
  "orderBasketId": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderCumQty": {
    "type": "number",
    "min": 0
  },
  "orderLeavesQty": {
    "type": "number",
    "min": 0
  },
  "orderStopPrice": {
    "type": "number",
    "optional": true,
    "nullable": true
  },
  "orderDiscretionPrice": {
    "type": "number",
    "optional": true,
    "nullable": true
  },
  "orderExdestinationInstruction": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderExecutionParameter": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderInfobarrierId": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderLegRatio": {
    "type": "number",
    "optional": true,
    "nullable": true
  },
  "orderLocateId": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderNegotiatedIndicator": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderOpenClose": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderParticipantPriorityCode": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderActionInitiated": {
    "type": "enum",
    "values": ["Firm", "Exchange", "Client", "Broker"],
    "optional": true,
    "nullable": true
  },
  "orderPackageIndicator": {
    "type": "enum",
    "values": ["None", "Package", "Leg"],
    "optional": true,
    "nullable": true
  },
  "orderPackageId": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderPackagePricetype": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderStrategyType": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderSecondaryOffering": {
    "type": "enum",
    "values": ["None", "PREIPO", "POSTIPO", "IPO"],
    "optional": true,
    "nullable": true
  },
  "orderStartTime": {
    "type": "date",
    "optional": true,
    "nullable": true
  },
  "orderTifExpiration": {
    "type": "date",
    "optional": true,
    "nullable": true
  },
  "orderParentChildType": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderMinimumQty": {
    "type": "number",
    "optional": true,
    "nullable": true
  },
  "orderTradingSession": {
    "type": "enum",
    "values": ["PRE-OPEN", "AFTER-HOURS", "CROSS_2", "TOSTNET", "TOSTNET2", "ALL", "DAY", "PRE-SESSION", "POST-SESSION"],
    "optional": true,
    "nullable": true
  },
  "orderDisplayPrice": {
    "type": "number",
    "optional": true,
    "nullable": true
  },
  "orderSeqNumber": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "atsDisplayIndicator": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderDisplayQty": {
    "type": "number",
    "optional": true,
    "nullable": true
  },
  "orderWorkingPrice": {
    "type": "number",
    "optional": true,
    "nullable": true
  },
  "atsOrderType": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderNbboSource": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderNbboTimestamp": {
    "type": "date",
    "optional": true,
    "nullable": true
  },
  "orderSolicitationFlag": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderNetPrice": {
    "type": "number",
    "optional": true,
    "nullable": true
  },
  "routeRejectedFlag": {
    "type": "string",
    "optional": true,
    "nullable": true
  },
  "orderOriginationSystem": {
    "type": "string",
    "optional": true,
    "nullable": true
  }
}
