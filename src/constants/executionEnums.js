/**
 * Execution Enum Definitions
 * Based on "Enum Mapping - Executions" sheet from Order & Execution Object Mapping Excel
 */

const ExecutionSide = {
  1: "Buy",
  2: "Sell Long",
  3: "Buy Minus",
  4: "Sell Plus",
  5: "Sell Short",
  6: "Sell Short Exempt"
};

const ExecutionPostingSide = {
  1: "Buy",
  2: "Sell Long",
  3: "Buy Minus",
  4: "Sell Plus",
  5: "Sell Short",
  6: "Sell Short Exempt"
};

const ExecutionAllocationSide = {
  1: "Buy",
  2: "Sell Long",
  3: "Buy Minus",
  4: "Sell Plus",
  5: "Sell Short",
  6: "Sell Short Exempt"
};

const ExecutionBrokerCapacity = {
  1: "Agency",
  2: "Principal",
  3: "Cross as Agent",
  4: "Cross as Principal"
};

const ExecutionCapacity = {
  1: "Agency",
  2: "Principal",
  3: "Cross as Agent",
  4: "Cross as Principal"
};

const ExecutionManualIndicator = {
  1: "Manual",
  2: "Electronic"
};

const IsMarketExecution = {
  1: "Y",
  2: "N"
};

const ExecutionTransactionType = {
  1: "Street",
  2: "Client",
  3: "Internal",
  4: "Indicative"
};

const ExecutionBookingEligiblity = {
  1: "Y",
  2: "N"
};

const ExecutionSwapIndicator = {
  1: "Cash",
  2: "Swap"
};

const ExecutionSecondaryOffering = {
  1: "PREIPO",
  2: "POSTIPO",
  3: "IPO"
};

const ExecutonSessionActual = {
  1: "DAY",
  2: "PRE-SESSION",
  3: "POST-SESSION"
};

const ExecutionLastLiquidityIndicator = {
  1: "Added Liquidity",
  2: "Removed Liquidity",
  3: "Liquidity Routed Out"
};

const ExecutionWaiverIndicator = {
  1: "Y",
  2: "N"
};

const ExecutionPackageIndicator = {
  1: "Package",
  2: "Leg"
};

const ExecutionRawLiquidityIndicator = {
  1: "Y",
  2: "N"
};

const ExecutionNegotiatedIndicator = {
  1: "Y",
  2: "N"
};

const ExecutionOpenCloseIndicator = {
  1: "Open",
  2: "Close"
};

const ExecutionAction = {
  1: "Pending",
  2: "New",
  3: "Replaced",
  4: "Bust"
};

const ExecutionInstrumentReference = {
  1: "CUSIP",
  2: "SEDOL",
  3: "ISIN",
  4: "RIC Code"
};

// Helper function to validate enum value
const validateEnum = (enumObj, value, enumName) => {
  if (value === null || value === undefined || value === "") {
    return { valid: true, value: null };
  }

  // Convert to number if it's a string that looks like a number
  let numValue = value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = parseInt(value.trim(), 10);
    if (!isNaN(parsed)) {
      numValue = parsed;
    }
  }
  
  // Check if value matches an enum key (numeric)
  const validKeys = Object.keys(enumObj).map(k => parseInt(k, 10));
  if (validKeys.includes(numValue)) {
    return { valid: true, value: numValue };
  }

  // Check if value matches an enum label (string)
  // This allows templates to use human-readable labels like "Buy", "Agency", etc.
  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    for (const [key, label] of Object.entries(enumObj)) {
      if (label.toLowerCase() === trimmedValue.toLowerCase()) {
        return { valid: true, value: parseInt(key, 10) };
      }
    }
  }

  // Invalid value - return error with valid options (show both numeric and labels)
  const validOptions = validKeys.map(k => `${k} (${enumObj[k]})`).join(", ");
  return { 
    valid: false, 
    error: `Invalid ${enumName} value: "${value}". Must be one of: ${validOptions}`
  };
};

// Export all enums and validation function
module.exports = {
  ExecutionSide,
  ExecutionPostingSide,
  ExecutionAllocationSide,
  ExecutionBrokerCapacity,
  ExecutionCapacity,
  ExecutionManualIndicator,
  IsMarketExecution,
  ExecutionTransactionType,
  ExecutionBookingEligiblity,
  ExecutionSwapIndicator,
  ExecutionSecondaryOffering,
  ExecutonSessionActual,
  ExecutionLastLiquidityIndicator,
  ExecutionWaiverIndicator,
  ExecutionPackageIndicator,
  ExecutionRawLiquidityIndicator,
  ExecutionNegotiatedIndicator,
  ExecutionOpenCloseIndicator,
  ExecutionAction,
  ExecutionInstrumentReference,
  validateEnum
};
