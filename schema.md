{
  "orderId": {
    "type": "string",
    "min": 1,
    "max": 128,
    "optional": false
  },
  "orderIdVersion": {
    "type": "number",
    "min": 0,
    "optional": true
  },
  "orderIdSession": {
    "type": "string",
    "min": 1,
    "max": 16,
    "optional": true
  },
  "orderIdInstance": {
    "type": "string",
    "min": 1,
    "max": 64,
    "optional": true
  },
  "parentOrderId": {
    "type": "string",
    "min": 1,
    "max": 128,
    "optional": true
  },
  "cancelreplaceOrderId": {
    "type": "string",
    "min": 1,
    "max": 128,
    "optional": true
  },
  "linkedOrderId": {
    "type": "string",
    "min": 1,
    "max": 128,
    "optional": true
  },
  "orderAction": {
    "type": "string",
    "min": 1,
    "max": 50,
    "optional": false
  },
  "orderStatus": {
    "type": "string",
    "min": 1,
    "max": 48,
    "optional": true
  },
  "orderCapacity": {
    "type": "string",
    "min": 1,
    "max": 48,
    "optional": false
  },
  "orderDestination": {
    "type": "string",
    "min": 1,
    "max": 48,
    "optional": true
  },
  "orderClientRef": {
    "type": "string",
    "min": 1,
    "max": 128,
    "optional": true
  },
  "orderClientRefDetails": {
    "type": "string",
    "min": 1,
    "max": 48,
    "optional": true
  },
  "orderExecutingEntity": {
    "type": "number",
    "min": 0,
    "optional": true
  },
  "orderBookingEntity": {
    "type": "number",
    "min": 0,
    "optional": true
  },
  "orderPositionAccount": {
    "type": "number",
    "min": 0,
    "optional": true
  },
  "orderSide": {
    "type": "string",
    "min": 1,
    "max": 50,
    "optional": false
  },
  "orderClientCapacity": {
    "type": "string",
    "min": 1,
    "max": 50,
    "optional": true
  },
  "orderManualIndicator": {
    "type": "string",
    "min": 1,
    "max": 50,
    "optional": true
  },
  "orderRequestTime": {
    "type": "string",
    "min": 1,
    "max": 50,
    "optional": true
  },
  "orderEventTime": {
    "type": "string",
    "min": 1,
    "max": 50,
    "optional": true
  },
  "orderManualTimestamp": {
    "type": "string",
    "min": 1,
    "max": 50,
    "optional": true
  },
  "orderOmsSource": {
    "type": "string",
    "min": 1,
    "max": 64,
    "optional": false
  },
  "orderPublishingTime": {
    "type": "string",
    "min": 1,
    "max": 50,
    "optional": false
  },
  "orderTradeDate": {
    "type": "string",
    "min": 1,
    "max": 50,
    "optional": true
  },
  "orderQuantity": {
    "type": "decimal",
    "min": 0,
    "precision": 18,
    "scale": 6,
    "optional": true
  },
  "orderPrice": {
    "type": "decimal",
    "min": 0,
    "precision": 18,
    "scale": 6,
    "optional": true
  },
  "orderType": {
    "type": "string",
    "min": 1,
    "max": 50,
    "optional": false
  },
  "orderTimeInforce": {
    "type": "string",
    "min": 1,
    "max": 50,
    "optional": true
  },
  "orderExecutionInstructions": {
    "type": "string",
    "min": 1,
    "max": 128,
    "optional": true
  },
  "orderAttributes": {
    "type": "string",
    "min": 1,
    "max": 128,
    "optional": true
  },
  "orderRestrictions": {
    "type": "string",
    "min": 1,
    "max": 256,
    "optional": true
  },
  "orderAuctionIndicator": {
    "type": "string",
    "min": 1,
    "max": 64,
    "optional": true
  },
  "orderSwapIndicator": {
    "type": "string",
    "min": 1,
    "max": 50,
    "optional": true
  },
  "orderOsi": {
    "type": "string",
    "min": 1,
    "max": 128,
    "optional": true
  },
  "orderInstrumentId": {
    "type": "number",
    "min": 0,
    "optional": true
  },
  "orderLinkedInstrumentId": {
    "type": "number",
    "min": 0,
    "optional": true
  },
  "orderCurrencyId": {
    "type": "string",
    "min": 1,
    "max": 32,
    "optional": true
  },
  "orderFlowType": {
    "type": "string",
    "min": 1,
    "max": 32,
    "optional": true
  },
  "orderAlgoInstruction": {
    "type": "string",
    "min": 1,
    "max": 64,
    "optional": true
  },
  "orderSymbol": {
    "type": "string",
    "min": 1,
    "max": 64,
    "optional": true
  },
  "orderInstrumentReference": {
    "type": "string",
    "min": 1,
    "max": 24,
    "optional": true
  },
  "orderInstrumentReferenceValue": {
    "type": "string",
    "min": 1,
    "max": 64,
    "optional": true
  },
  "orderOptionPutCall": {
    "type": "string",
    "min": 1,
    "max": 50,
    "optional": true
  },
  "orderOptionStrikePrice": {
    "type": "decimal",
    "min": 0,
    "precision": 18,
    "scale": 6,
    "optional": true
  },
  "orderOptionLegIndicator": {
    "type": "string",
    "min": 1,
    "max": 50,
    "optional": true
  },
  "orderComplianceId": {
    "type": "string",
    "min": 1,
    "max": 128,
    "optional": false
  },
  "orderEntityId": {
    "type": "string",
    "min": 1,
    "max": 128,
    "optional": true
  },
  "orderExecutingAccount": {
    "type": "number",
    "min": 0,
    "optional": true
  },
  "orderClearingAccount": {
    "type": "number",
    "min": 0,
    "optional": true
  },
  "orderClientOrderId": {
    "type": "string",
    "min": 1,
    "max": 128,
    "optional": true
  },
  "orderRoutedOrderId": {
    "type": "string",
    "min": 1,
    "max": 128,
    "optional": true
  },
  "orderTradingOwner": {
    "type": "number",
    "min": 0,
    "optional": true
  },
  "orderExtendedAttribute": {
    "type": "string",
    "min": 1,
    "max": 256,
    "optional": true
  },
  "orderQuoteId": {
    "type": "string",
    "min": 1,
    "max": 128,
    "optional": true
  },
  "orderRepresentOrderId": {
    "type": "string",
    "min": 1,
    "max": 128,
    "optional": true
  },
  "orderOnBehalfCompId": {
    "type": "string",
    "min": 1,
    "max": 64,
    "optional": true
  },
  "orderSpread": {
    "type": "decimal",
    "min": 0,
    "precision": 18,
    "scale": 6,
    "optional": true
  },
  "orderAmendReason": {
    "type": "string",
    "min": 1,
    "max": 64,
    "optional": true
  },
  "orderCancelRejectReason": {
    "type": "string",
    "min": 1,
    "max": 64,
    "optional": true
  },
  "orderBidSize": {
    "type": "decimal",
    "min": 0,
    "precision": 18,
    "scale": 6,
    "optional": true
  },
  "orderBidPrice": {
    "type": "decimal",
    "min": 0,
    "precision": 18,
    "scale": 6,
    "optional": true
  },
  "orderAskSize": {
    "type": "decimal",
    "min": 0,
    "precision": 18,
    "scale": 6,
    "optional": true
  },
  "orderAskPrice": {
    "type": "decimal",
    "min": 0,
    "precision": 18,
    "scale": 6,
    "optional": true
  },
  "orderBasketId": {
    "type": "string",
    "min": 1,
    "max": 128,
    "optional": true
  },
  "orderCumQty": {
    "type": "decimal",
    "min": 0,
    "precision": 18,
    "scale": 6,
    "optional": true
  },
  "orderLeavesQty": {
    "type": "decimal",
    "min": 0,
    "precision": 18,
    "scale": 6,
    "optional": true
  },
  "orderStopPrice": {
    "type": "decimal",
    "min": 0,
    "precision": 18,
    "scale": 6,
    "optional": true
  },
  "orderDiscretionPrice": {
    "type": "decimal",
    "min": 0,
    "precision": 18,
    "scale": 6,
    "optional": true
  },
  "orderExdestinationInstruction": {
    "type": "string",
    "min": 1,
    "max": 64,
    "optional": true
  },
  "orderExecutionParameter": {
    "type": "string",
    "min": 1,
    "max": 128,
    "optional": true
  },
  "orderInfobarrierId": {
    "type": "string",
    "min": 1,
    "max": 128,
    "optional": true
  },
  "orderLegRatio": {
    "type": "decimal",
    "min": 0,
    "precision": 18,
    "scale": 6,
    "optional": true
  },
  "orderLocateId": {
    "type": "string",
    "min": 1,
    "max": 128,
    "optional": true
  },
  "orderNegotiatedIndicator": {
    "type": "string",
    "min": 1,
    "max": 50,
    "optional": true
  },
  "orderOpenClose": {
    "type": "string",
    "min": 1,
    "max": 50,
    "optional": true
  },
  "orderParticipantPriorityCode": {
    "type": "string",
    "min": 1,
    "max": 32,
    "optional": true
  },
  "orderActionInitiated": {
    "type": "string",
    "min": 1,
    "max": 32,
    "optional": true
  },
  "orderPackageIndicator": {
    "type": "string",
    "min": 1,
    "max": 50,
    "optional": true
  },
  "orderPackageId": {
    "type": "string",
    "min": 1,
    "max": 128,
    "optional": true
  },
  "orderPackagePricetype": {
    "type": "string",
    "min": 1,
    "max": 64,
    "optional": true
  },
  "orderStrategyType": {
    "type": "string",
    "min": 1,
    "max": 64,
    "optional": true
  },
  "orderSecondaryOffering": {
    "type": "string",
    "min": 1,
    "max": 50,
    "optional": true
  },
  "orderStartTime": {
    "type": "string",
    "min": 1,
    "max": 50,
    "optional": true
  },
  "orderTifExpiration": {
    "type": "string",
    "min": 1,
    "max": 50,
    "optional": true
  },
  "orderParentChildType": {
    "type": "string",
    "min": 1,
    "max": 50,
    "optional": true
  },
  "orderMinimumQty": {
    "type": "decimal",
    "min": 0,
    "precision": 18,
    "scale": 6,
    "optional": true
  },
  "orderTradingSession": {
    "type": "string",
    "min": 1,
    "max": 50,
    "optional": true
  },
  "orderDisplayPrice": {
    "type": "decimal",
    "min": 0,
    "precision": 18,
    "scale": 6,
    "optional": true
  },
  "orderSeqNumber": {
    "type": "string",
    "min": 1,
    "max": 128,
    "optional": true
  },
  "atsDisplayIndicator": {
    "type": "string",
    "min": 1,
    "max": 50,
    "optional": true
  },
  "orderDisplayQty": {
    "type": "decimal",
    "min": 0,
    "precision": 18,
    "scale": 6,
    "optional": true
  },
  "orderWorkingPrice": {
    "type": "decimal",
    "min": 0,
    "precision": 18,
    "scale": 6,
    "optional": true
  },
  "atsOrderType": {
    "type": "string",
    "min": 1,
    "max": 32,
    "optional": true
  },
  "orderNbboSource": {
    "type": "string",
    "min": 1,
    "max": 64,
    "optional": true
  },
  "orderNbboTimestamp": {
    "type": "string",
    "min": 1,
    "max": 50,
    "optional": true
  },
  "orderSolicitationFlag": {
    "type": "string",
    "min": 1,
    "max": 50,
    "optional": true
  },
  "orderNetPrice": {
    "type": "decimal",
    "min": 0,
    "precision": 18,
    "scale": 6,
    "optional": true
  },
  "routeRejectedFlag": {
    "type": "string",
    "min": 1,
    "max": 50,
    "optional": true
  },
  "orderOriginationSystem": {
    "type": "string",
    "min": 1,
    "max": 64,
    "optional": false
  }
}
