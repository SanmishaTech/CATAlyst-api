/**
 * Validation 2 (Level 2) Execution Conditions Configuration
 * 
 * This configuration defines business rule validations for executions.
 * Each field can have conditional validation rules based on other field values.
 * 
 * Supported patterns:
 * 1. "<Field> should not be null when <DepField> in (x,y,...)"
 * 2. "<Field> should be null when <DepField> in (x,y,...)"
 * 3. "<Field> must be in (x,y,...)"
 * 
 * @type {Object<string, {enabled: boolean, condition: string, required: boolean}>}
 */

module.exports = {
  executionId: {
    enabled: false,
    condition: "-",
    required: true
  },
  
  previousExecutionId: {
    enabled: true,
    condition: "previousExecutionId should not be null when executionAction in (3,4)",
    required: true
  },
  
  executionEntityId: {
    enabled: true,
    condition: "executionEntityId should not be null and must be the same throughout the life cycle of an execution",
    required: false
  },
  
  executionVersion: {
    enabled: true,
    condition: "executionVersion must be greater than or equal to 0",
    required: true
  },
  
  executionSeqNumber: {
    enabled: false,
    condition: "-",
    required: false
  },
  
  externalExecutionId: {
    enabled: true,
    condition: "externalExecutionId is required when executionLastMarket is not null and isMarketExecution in (1)",
    required: true
  },
  
  executionSide: {
    enabled: true,
    condition: "executionSide should not be null and must be in (1,2,3,4,5,6)",
    required: true
  },
  
  executionPostingSide: {
    enabled: true,
    condition: "executionPostingSide must be in (1,2,3,4,5,6)",
    required: true
  },
  
  executionAllocationSide: {
    enabled: false,
    condition: "-",
    required: true
  },
  
  executionBrokerCapacity: {
    enabled: true,
    condition: "executionBrokerCapacity must be in (1,2,3,4)",
    required: true
  },
  
  executionCapacity: {
    enabled: true,
    condition: "executionCapacity should not be null and must be in (1,2,3,4)",
    required: true
  },
  
  executionEventTime: {
    enabled: true,
    condition: "executionEventTime must be in nano seconds",
    required: true
  },
  
  executionTime: {
    enabled: true,
    condition: "executionTime must be in nano seconds",
    required: true
  },
  
  executionManualIndicator: {
    enabled: true,
    condition: "executionManualIndicator must be in (1,2)",
    required: true
  },
  
  executionManualEventTime: {
    enabled: true,
    condition: "executionManualEventTime should not be null when executionManualIndicator in (1) and must be nano seconds",
    required: true
  },
  
  isMarketExecution: {
    enabled: true,
    condition: "isMarketExecution must be in (1,2)",
    required: true
  },
  
  executionLastMarket: {
    enabled: true,
    condition: "executionLastMarket should not be null when isMarketExecution in (1)",
    required: true
  },
  
  executionAccount: {
    enabled: true,
    condition: "executionAccount should not be null and must be present in lookup table",
    required: true
  },
  
  executionBookingAccount: {
    enabled: true,
    condition: "executionBookingAccount should be null OR must be present in lookup table",
    required: true
  },
  
  executionBookingEntity: {
    enabled: false,
    condition: "-",
    required: true
  },
  
  executionTradingEntity: {
    enabled: false,
    condition: "-",
    required: true
  },
  
  executionDeskId: {
    enabled: false,
    condition: "-",
    required: true
  },
  
  executionOsi: {
    enabled: false,
    condition: "-",
    required: true
  },
  
  executionInstrumentId: {
    enabled: false,
    condition: "-",
    required: true
  },
  
  executionLinkedInstrumentId: {
    enabled: false,
    condition: "-",
    required: false
  },
  
  executionSymbol: {
    enabled: false,
    condition: "-",
    required: true
  },
  
  executionInstrumentReference: {
    enabled: false,
    condition: "-",
    required: true
  },
  
  executionInstrumentReferenceValue: {
    enabled: true,
    condition: "executionInstrumentReference must be in (1,2,3,4)",
    required: true
  },
  
  executionLastPrice: {
    enabled: true,
    condition: "executionLastPrice must be greater than or equal to 0",
    required: true
  },
  
  executionLastQuantity: {
    enabled: true,
    condition: "executionLastQuantity must be greater than 0",
    required: true
  },
  
  executionContraBroker: {
    enabled: false,
    condition: "-",
    required: true
  },
  
  linkedExecutionId: {
    enabled: true,
    condition: "linkedExecutionId should be null OR linkedExecutionId should not be null and not equal to executionId",
    required: true
  },
  
  executionTransactionType: {
    enabled: true,
    condition: "executionTransactionType must be in (1,2,3,4)",
    required: true
  },
  
  executionIdInstance: {
    enabled: false,
    condition: "-",
    required: true
  },
  
  executionSession: {
    enabled: false,
    condition: "-",
    required: true
  },
  
  executionOrderIdInstance: {
    enabled: false,
    condition: "-",
    required: true
  },
  
  executionOrderIdSession: {
    enabled: false,
    condition: "-",
    required: true
  },
  
  executonOrderId: {
    enabled: false,
    condition: "-",
    required: true
  },
  
  executionOrderIdVersion: {
    enabled: false,
    condition: "-",
    required: true
  },
  
  executionTradeExecutionSystem: {
    enabled: false,
    condition: "-",
    required: true
  },
  
  executionOmsSource: {
    enabled: false,
    condition: "-",
    required: true
  },
  
  executionBookingEligiblity: {
    enabled: true,
    condition: "executionBookingEligiblity should be null OR must be in (Y,N)",
    required: true
  },
  
  executionTradeDate: {
    enabled: false,
    condition: "-",
    required: true
  },
  
  executionCurrencyId: {
    enabled: false,
    condition: "-",
    required: true
  },
  
  executionPositionId: {
    enabled: false,
    condition: "-",
    required: true
  },
  
  executionSwapIndicator: {
    enabled: true,
    condition: "executionSwapIndicator should not be null OR must be in (1,2)",
    required: true
  },
  
  executionSettleDate: {
    enabled: false,
    condition: "-",
    required: true
  },
  
  executionCommisionFee: {
    enabled: false,
    condition: "-",
    required: false
  },
  
  executionRollupId: {
    enabled: false,
    condition: "-",
    required: false
  },
  
  executionSecondaryOffering: {
    enabled: false,
    condition: "-",
    required: false
  },
  
  executionCumQuantity: {
    enabled: false,
    condition: "-",
    required: false
  },
  
  executionTradeFactors: {
    enabled: false,
    condition: "-",
    required: false
  },
  
  executionRiskDate: {
    enabled: false,
    condition: "-",
    required: false
  },
  
  executionOrderComplianceId: {
    enabled: false,
    condition: "-",
    required: false
  },
  
  executionInfoBarrierId: {
    enabled: false,
    condition: "-",
    required: false
  },
  
  executonSessionActual: {
    enabled: false,
    condition: "-",
    required: false
  },
  
  executionStrategy: {
    enabled: false,
    condition: "-",
    required: false
  },
  
  executionLastLiquidityIndicator: {
    enabled: false,
    condition: "-",
    required: false
  },
  
  executionWaiverIndicator: {
    enabled: false,
    condition: "-",
    required: false
  },
  
  executionLifecycleType: {
    enabled: false,
    condition: "-",
    required: false
  },
  
  executionPackageIndicator: {
    enabled: false,
    condition: "-",
    required: false
  },
  
  executionRawLiquidityIndicator: {
    enabled: false,
    condition: "-",
    required: false
  },
  
  executionPackageId: {
    enabled: false,
    condition: "-",
    required: false
  },
  
  executionQuoteId: {
    enabled: false,
    condition: "-",
    required: false
  },
  
  executionYield: {
    enabled: false,
    condition: "-",
    required: false
  },
  
  executionSpread: {
    enabled: false,
    condition: "-",
    required: false
  },
  
  executionNegotiatedIndicator: {
    enabled: false,
    condition: "-",
    required: false
  },
  
  executionOpenCloseIndicator: {
    enabled: false,
    condition: "-",
    required: false
  },
  
  exchangeExecId: {
    enabled: false,
    condition: "-",
    required: false
  },
  
  executionAction: {
    enabled: false,
    condition: "-",
    required: false
  },
  
  executionCrossId: {
    enabled: false,
    condition: "-",
    required: false
  },
  
  executionExecutingEntity: {
    enabled: false,
    condition: "-",
    required: false
  }
};
