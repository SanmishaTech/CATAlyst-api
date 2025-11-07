const {
  OrderAction,
  OrderStatus,
  OrderCapacity,
  OrderClientCapacity,
  OrderSide,
  OrderManualIndicator,
  OrderType,
  OrderTimeInforce,
  OrderAuctionIndicator,
  OrderSwapIndicator,
  OrderOptionPutCall,
  OrderOptionLegIndicator,
  OrderNegotiatedIndicator,
  OrderOpenClose,
  OrderPackageIndicator,
  OrderSecondaryOffering,
  OrderParentChildType,
  OrderTradingSession,
  AtsDisplayIndicator,
  OrderSolicitationFlag,
  RouteRejectedFlag,
  ExecutionSide,
  OrderExecutionInstructions,
  OrderAttributes,
  OrderRestrictions,
  OrderInstrumentReference,
  OrderActionInitiated,
  OrderFlowType
} = require("../constants/orderEnums");

/**
 * Get all order enums
 */
const getAllOrderEnums = async (req, res, next) => {
  try {
    res.json({
      OrderAction,
      OrderStatus,
      OrderCapacity,
      OrderClientCapacity,
      OrderSide,
      OrderManualIndicator,
      OrderType,
      OrderTimeInforce,
      OrderAuctionIndicator,
      OrderSwapIndicator,
      OrderOptionPutCall,
      OrderOptionLegIndicator,
      OrderNegotiatedIndicator,
      OrderOpenClose,
      OrderPackageIndicator,
      OrderSecondaryOffering,
      OrderParentChildType,
      OrderTradingSession,
      AtsDisplayIndicator,
      OrderSolicitationFlag,
      RouteRejectedFlag,
      ExecutionSide,
      OrderExecutionInstructions,
      OrderAttributes,
      OrderRestrictions,
      OrderInstrumentReference,
      OrderActionInitiated,
      OrderFlowType
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get specific enum by name
 */
const getEnumByName = async (req, res, next) => {
  try {
    const { enumName } = req.params;
    
    const enumMap = {
      OrderAction,
      OrderStatus,
      OrderCapacity,
      OrderClientCapacity,
      OrderSide,
      OrderManualIndicator,
      OrderType,
      OrderTimeInforce,
      OrderAuctionIndicator,
      OrderSwapIndicator,
      OrderOptionPutCall,
      OrderOptionLegIndicator,
      OrderNegotiatedIndicator,
      OrderOpenClose,
      OrderPackageIndicator,
      OrderSecondaryOffering,
      OrderParentChildType,
      OrderTradingSession,
      AtsDisplayIndicator,
      OrderSolicitationFlag,
      RouteRejectedFlag,
      ExecutionSide,
      OrderExecutionInstructions,
      OrderAttributes,
      OrderRestrictions,
      OrderInstrumentReference,
      OrderActionInitiated,
      OrderFlowType
    };
    
    const enumObj = enumMap[enumName];
    
    if (!enumObj) {
      return res.status(404).json({
        error: "Enum not found",
        availableEnums: Object.keys(enumMap)
      });
    }
    
    res.json({
      name: enumName,
      values: enumObj
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllOrderEnums,
  getEnumByName
};
