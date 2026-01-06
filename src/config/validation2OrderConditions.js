/**
 * Validation 2 (Level 2) Order Conditions Configuration
 * 
 * This configuration defines business rule validations for orders.
 * Each field can have conditional validation rules based on other field values.
 * 
 * Supported patterns:
 * 1. "<Field> should not be null when <DepField> in (x,y,...)"
 * 2. "<Field> should be null when <DepField> in (x,y,...)"
 * 3. "<Field> must be in (x,y,...)" or "<Field> must be in (1-38)" (range syntax)
 * 4. "<Field> should not be null when <DepField> is populated/not null/not empty"
 * 5. "<Field> should not be null when <DepField> is null"
 * 6. "<Field> should/must be only populated when <DepField> in (x,y,...)"
 * 7. "<Field> should be in (x,y) when not null"
 * 8. "<Field> must be populated when <DepField> is not null and <DepField2> in (x,y,...)"
 * 9. "<Field> should be null OR <Field> should not be null and must be in (x,y,...)"
 * 10. "<Field> should be null OR must be greater than 0"
 * 11. "<Field> should not be null and must be greater than 0"
 * 12. "<Field> less than <OtherField>" (field comparison)
 * 13. "<Field> not equal to <OtherField>" (field comparison)
 * 
 * @type {Object<string, {enabled: boolean, condition: string, required: boolean}>}
 */

module.exports = {
  orderId: {
    enabled: true,
    condition: "orderId should not be null",
    required: true
  },
  
  orderIdVersion: {
    enabled: true,
    condition: "orderIdVersion should not be null",
    required: true
  },
  parentOrderId: {
    enabled: true,
    condition: "parentOrderId should not be null when orderParentChildType in (2)",
    required: true
  },
  
  cancelreplaceOrderId: {
    enabled: true,
    condition: "cancelreplaceOrderId should not be null when orderAction in (9,10,11,12)",
    required: true
  },
  
  linkedOrderId: {
    enabled: false,
    condition: "linkedOrderId should be null OR linkedOrderId should not be null when orderLinkedTransactonId is not empty",
    required: true
  },
  
  linkOrderType: {
    enabled: true,
    condition: "linkOrderType should not be null when linkedOrderId is populated and must be in (1,2,3,4)",
    required: true
  },
  
  orderAction: {
    enabled: true,
    condition: "orderAction should not be null",
    required: true
  },
  
  orderStatus: {
    enabled: true,
    condition: "orderStatus should not be null and orderStatus must be in (1,2,3,4,5,6,7,8)",
    required: true
  },
  
  orderCapacity: {
    enabled: true,
    condition: "orderCapacity should not be null and orderCapacity must be in (1,2,3,4,5,6)",
    required: true
  },

  orderClientRef: {
    enabled: true,
    condition: "orderClientRef should not be null when orderAction in (14) and orderClientRef should be null when orderCapacity in (2,4)",
    required: true
  },

  orderExecutingEntity: {
    enabled: true,
    condition: "orderExecutingEntity should not be null",
    required: true
  },
  
  orderBookingEntity: {
    enabled: true,
    condition: "orderBookingEntity should not be null",
    required: false
  },
  
  orderPositionAccount: {
    enabled: true,
    condition: "orderPositionAccount should not be null",
    required: true
  },
  
  orderSide: {
    enabled: true,
    condition: "orderSide must be in (1,2,3,4,5,6)",
    required: true
  },
  
  orderClientCapacity: {
    enabled: true,
    condition: "orderClientCapacity should be null OR orderClientCapacity should not be null and must be in (1,2,3,4,5,6)",
    required: true
  },
  
  orderManualIndicator: {
    enabled: true,
    condition: "orderManualIndicator should not be null and must be in (1,2)",
    required: true
  },
  
  orderRequestTime: {
    enabled: true,
    condition: "orderRequestTime must be in nano seconds and should not be null when orderCapacity in (1) and orderAction in (1,9,11)",
    required: false
  },
  
  orderEventTime: {
    enabled: true,
    condition: "orderEventTime must be in nano seconds",
    required: true
  },
  
  orderManualTimestamp: {
    enabled: true,
    condition: "orderManualTimestamp must be in nano seconds and should not be null when orderManualIndicator in (1)",
    required: true
  },
 
  orderPublishingTime: {
    enabled: true,
    condition: "orderPublishingTime must be in nano seconds",
    required: false
  },

  orderQuantity: {
    enabled: true,
    condition: "orderQuantity should not be null and must be greater than 0",
    required: true
  },
  
  orderPrice: {
    enabled: true,
    condition: "orderPrice should not be null and must be greater than or equal to 0 when orderType not in (1,5)",
    required: true
  },
  
  orderType: {
    enabled: true,
    condition: "orderType should not be null and must be in (1,2,3,4,5,6,7)",
    required: true
  },
  
  orderTimeInforce: {
    enabled: true,
    condition: "orderTimeInforce should not be null and must be in (1,2,3,4,5,6,7,8)",
    required: true
  },
  
  orderExecutionInstructions: {
    enabled: true,
    condition: "orderExecutionInstructions should not be null and must be in (1-38)",
    required: true
  },
  
  orderAttributes: {
    enabled: true,
    condition: "orderAttributes should be null OR must be in (1-15)",
    required: true
  },
  
  orderRestrictions: {
    enabled: true,
    condition: "orderRestrictions should not be null and must be in (1-7) (single value or '~' separated list)",
    required: true
  },
  
  orderAuctionIndicator: {
    enabled: true,
    condition: "orderAuctionIndicator should be null OR must be in (1,2,3)",
    required: true
  },
  
  orderSwapIndicator: {
    enabled: true,
    condition: "orderSwapIndicator should not be null and must be in (1,2)",
    required: true
  },
  
  
  orderInstrumentId: {
    enabled: true,
    condition: "orderInstrumentId should not be null when orderOsi is null",
    required: true
  },
  

  orderCurrencyId: {
    enabled: true,
    condition: "orderCurrencyId should not be null",
    required: true
  },
  
  orderFlowType: {
    enabled: true,
    condition: "orderFlowType should be null OR (orderFlowType should not be null and must be in (1,2,3,4,5))",
    required: true
  },
  
  
  orderSymbol: {
    enabled: true,
    condition: "orderSymbol should not be null when orderInstrumentId is null",
    required: true
  },
  
  orderInstrumentReference: {
    enabled: true,
    condition: "orderInstrumentReference should not be null and must be in (1,2,3,4)",
    required: true
  },
  
  orderInstrumentReferenceValue: {
    enabled: true,
    condition: "orderInstrumentReferenceValue should not be null when orderInstrumentReference is not null",
    required: true
  },
 
  orderComplianceId: {
    enabled: true,
    condition: "orderComplianceId must be the same throughout the life cycle of an order",
    required: true
  },
  
  orderEntityId: {
    enabled: true,
    condition: "orderEntityId must be the same throughout the life cycle of an order",
    required: false
  },
  
  orderClientOrderId: {
    enabled: true,
    condition: "orderClientOrderId should not be null when orderAction in (1,2,8,9,10) and orderCapacity in (1)",
    required: true
  },
  
  orderRoutedOrderId: {
    enabled: true,
    condition: "orderRoutedOrderId should not be null when orderAction in (5,6)",
    required: true
  },
 
  orderAmendReason: {
    enabled: true,
    condition: "orderAmendReason must be only populated when orderAction in (8,9,10)",
    required: true
  },
  
  orderCancelRejectReason: {
    enabled: true,
    condition: "orderCancelRejectReason must be only populated when orderAction in (7,11,12)",
    required: true
  },
  
  orderBidSize: {
    enabled: true,
    condition: "orderBidSize should be null OR must be greater than 0",
    required: false
  },
  
  orderBidPrice: {
    enabled: true,
    condition: "orderBidPrice should be null OR must be greater than 0",
    required: false
  },
  
  orderAskSize: {
    enabled: true,
    condition: "orderAskSize should be null OR must be greater than 0",
    required: false
  },
  
  orderAskPrice: {
    enabled: true,
    condition: "orderAskPrice should be null OR must be greater than 0",
    required: false
  },
  
  orderBasketId: {
    enabled: true,
    condition: "orderBasketId should be null OR orderBasketId should not be null and not equal to orderId",
    required: true
  },
  

  //changed less than eqaul to 
  orderCumQty: {
    enabled: true,
    condition: "orderCumQty should be null OR orderCumQty less than or equal to orderQuantity",
    required: false
  },
  
  orderLeavesQty: {
    enabled: true,
    condition: "orderLeavesQty should be null OR orderLeavesQty less than or equal to orderQuantity",
    required: false
  },
  
  orderStopPrice: {
    enabled: true,
    condition: "orderStopPrice must be null OR must be greater than or equal to 0",
    required: true
  },
  
  orderDiscretionPrice: {
    enabled: true,
    condition: "orderDiscretionPrice must be null OR must be greater than or equal to 0",
    required: true
  },
  
 
  
  orderNegotiatedIndicator: {
    enabled: true,
    condition: "orderNegotiatedIndicator should be in (1,2)",
    required: true
  },
 
  

  //change
  orderActionInitiated: {
    enabled: true,
    condition: "orderActionInitiated should not be null and must be in (1,2,3,4)",
    required: true
  },
 
  
  orderSecondaryOffering: {
    enabled: true,
    condition: "orderSecondaryOffering should be null OR must be in (2,3,4)",
    required: true
  },
  
  orderStartTime: {
    enabled: true,
    condition: "orderStartTime must be nano seconds and should not be less than orderEventTime",
    required: true
  },
  
  orderTifExpiration: {
    enabled: true,
    condition: "orderTifExpiration should not be null when orderTimeInforce in (7)",
    required: true
  },
  
  orderParentChildType: {
    enabled: true,
    condition: "orderParentChildType must be in (1,2,3)",
    required: true
  },
  
  orderMinimumQty: {
    enabled: true,
    condition: "orderMinimumQty should be null OR orderMinimumQty should not be null and less than orderQuantity",
    required: true
  },
  
  orderTradingSession: {
    enabled: true,
    condition: "orderTradingSession must be in (1,2,3,4,5,6,7,8,9)",
    required: true
  },
  
  orderDisplayPrice: {
    enabled: true,
    condition: "orderDisplayPrice should be only populated when atsDisplayIndicator in (1)",
    required: true
  },
  
  atsDisplayIndicator: {
    enabled: true,
    condition: "atsDisplayIndicator should be in (1,2) when not null",
    required: true
  },

  
  orderNbboSource: {
    enabled: true,
    condition: "orderNbboSource should not be null when orderNbboTimestamp is populated",
    required: true
  },
  
  orderNbboTimestamp: {
    enabled: true,
    condition: "orderNbboTimestamp must be nano seconds and should not be null when orderNbboSource is populated",
    required: true
  },
  
  orderSolicitationFlag: {
    enabled: true,
    condition: "orderSolicitationFlag must be in (1,2)",
    required: true
  },
  
  
  routeRejectedFlag: {
    enabled: true,
    condition: "routeRejectedFlag should be null OR must be in (1,2)",
    required: true
  },
  
};
