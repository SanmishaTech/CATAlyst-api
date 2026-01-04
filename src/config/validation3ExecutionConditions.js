/**
 * Auto-generated Validation 3 Execution Conditions Configuration
 * Run scripts/generateValidation3Configs.js to update.
 * Do not edit manually.
 */

module.exports = {
  "externalExecutionId": {
    "enabled": true,
    "condition": "External_Execution_ID is required when Execution_Last_Market is not null and Execution_Last_Market must be present in Reference Data - US Broker Dealer.ClientID and Reference Data - US Broker Dealer.Membership Type = 'Exchange'",
    "required": true
  },
  "executionLastMarket": {
    "enabled": true,
    "condition": "Execution_Last_Market must be present in Reference Data - US Broker Dealer.ClientID",
    "required": true
  },
  "executionAccount": {
    "enabled": true,
    "condition": "Execution_Account should not be null and Execution_Account must be present in Reference Data - Account Mapping.AccountNo",
    "required": true
  },
  "executionBookingAccount": {
    "enabled": true,
    "condition": "((Execution_Booking_Account should be null) OR (Execution_Booking_Account should not be null and Execution_Booking_Account must be present in Reference Data - Account Mapping.AccountNo))",
    "required": false
  },
  "executionBookingEntity": {
    "enabled": true,
    "condition": "Execution_Booking_Entity should not be null and Execution_Booking_Entity must be present in Reference Data - Firm Entity.FirmID",
    "required": true
  },
  "executionTradingEntity": {
    "enabled": true,
    "condition": "Execution_Trading_Entity should not be null and Execution_Trading_Entity must be present in Reference Data - Firm Entity.FirmID",
    "required": true
  },
  "executionInstrumentId": {
    "enabled": true,
    "condition": "Execution_Instrument_ID should not be null and Execution_Instrument_ID must be present in Reference Data - Instruments Mapping.Instrument_ID",
    "required": true
  },
  "executionContraBroker": {
    "enabled": true,
    "condition": "Execution_Contra_Broker must be present in Reference Data - US Broker Dealer.ClientID",
    "required": false
  },
  "executionCurrencyId": {
    "enabled": true,
    "condition": "Execution_Currency_ID should not be null and Execution_Currency_ID must be present in Reference Data - ISO 4217 Currency Codes.Code",
    "required": true
  },
  "executionExecutingEntity": {
    "enabled": true,
    "condition": "Execution_Executing_Entity should not be null and Execution_Executing_Entity must be present in Reference Data - Firm Entity.FirmID",
    "required": true
  }
};
