/**
 * Auto-generated Validation 3 Execution Conditions Configuration
 * Run scripts/generateValidation3Configs.js to update.
 * Do not edit manually.
 */

module.exports = {
  "executionLastMarket": {
    "enabled": true,
    "condition": "Execution_Last_Market in (Reference Data - Exchange Codes — ISO 10383 Market Identifier Code.MICCode)",
    "required": true
  },
  "executionAccount": {
    "enabled": true,
    "condition": "(Execution_Account should not be null and it must be present in (Lookup table)))",
    "required": true
  },
  "executionBookingAccount": {
    "enabled": true,
    "condition": "(Execution_Booking_Account should be null OR (Execution_Booking_Account should not be null and it must be present in (Lookup table)))",
    "required": true
  },
  "executionBookingEntity": {
    "enabled": true,
    "condition": "Order_Booking_Entity  must be in (Reference Data - Client Mapping.Firm Details.FirmID)",
    "required": true
  },
  "executionCurrencyId": {
    "enabled": true,
    "condition": "Execution_Currency_ID should not be null and must be in (Reference Data - ISO 4217 Currency Codes)",
    "required": true
  },
  "executionExecutingEntity": {
    "enabled": true,
    "condition": "Execution_Executing_Entity should not be null and Execution_Executing_Entity must be in (Reference Data - Client Mapping.Firm Details.FirmID)",
    "required": true
  }
};
