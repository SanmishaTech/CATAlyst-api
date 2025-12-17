/**
 * Auto-generated Validation 3 Order Conditions Configuration
 * Run scripts/generateValidation3Configs.js to update.
 * Do not edit manually.
 */

module.exports = {
  "orderDestination": {
    "enabled": true,
    "condition": "Order_Destination must be provided when order is routed to external destination, exchanges or external/internal venue and Order_Destination must be in (Reference Data - Exchange Codes — ISO 10383 Market Identifier Code.MIC",
    "required": true
  },
  "orderExecutingEntity": {
    "enabled": true,
    "condition": "Order_Executing_Entity should not be null and Order_Executing_Entity must be in (Reference Data - Client Mapping.Firm Details.FirmID)",
    "required": true
  },
  "orderBookingEntity": {
    "enabled": true,
    "condition": "nst",
    "required": true
  },
  "orderPositionAccount": {
    "enabled": true,
    "condition": "Order_Position_Account should not be null",
    "required": true
  },
  "orderCurrencyId": {
    "enabled": true,
    "condition": "Order_Currency_ID should not be null and must be in (Reference Data - ISO 4217 Currency Codes)",
    "required": true
  },
  "orderExecutingAccount": {
    "enabled": true,
    "condition": "(Order_Executing_Account should be null OR (Order_Executing_Account should not be null and it must be present in (Lookup table)))",
    "required": true
  },
  "orderClearingAccount": {
    "enabled": true,
    "condition": "(Order_Clearing_Account should be null OR (Order_Clearing_Account should not be null and it must be present in (Lookup table)))",
    "required": true
  },
  "orderRoutedOrderId": {
    "enabled": true,
    "condition": "Must be populated when Ex_Destination is not null and Order_Exdestination_Instruction in ('Internal','External') and Ex_Destination in (Reference Data - Exchange Codes — ISO 10383 Market Identifier Code.MICCode)",
    "required": true
  },
  "orderStartTime": {
    "enabled": true,
    "condition": "Order_Start_Time should not be less than Order_Event_Time",
    "required": true
  }
};
