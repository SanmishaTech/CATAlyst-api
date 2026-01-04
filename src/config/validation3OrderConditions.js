/**
 * Auto-generated Validation 3 Order Conditions Configuration
 * Run scripts/generateValidation3Configs.js to update.
 * Do not edit manually.
 */

module.exports = {
  "orderDestination": {
    "enabled": true,
    "condition": "Order_Destination must present in Reference Data - US Broker Dealer.ClientID when Order_Action in (5,6) and Reference Data - US Broker Dealer.Membership Type = 'Exchange'",
    "required": true
  },
  "orderExecutingEntity": {
    "enabled": true,
    "condition": "Order_Executing_Entity should not be null and Order_Executing_Entity must be present in Reference Data - Firm Entity.FirmID",
    "required": true
  },
  "orderBookingEntity": {
    "enabled": true,
    "condition": "Order_Booking_Entity should not be null and Order_Booking_Entity must be present in Reference Data - Firm Entity.FirmID",
    "required": true
  },
  "orderPositionAccount": {
    "enabled": true,
    "condition": "Order_Position_Account should not be null and Order_Position_Account must be present in Reference Data - Account Mapping.AccountNo",
    "required": true
  },
  "orderInstrumentId": {
    "enabled": true,
    "condition": "Order_Instrument_ID should not be null and Order_Instrument_ID must be present in Reference Data - Instruments Mapping.Instrument_ID",
    "required": true
  },
  "orderCurrencyId": {
    "enabled": true,
    "condition": "Order_Currency_ID should not be null and Order_Currency_ID must be present in Reference Data - ISO 4217 Currency Codes.Code",
    "required": true
  },
  "orderExecutingAccount": {
    "enabled": true,
    "condition": "((Order_Executing_Account should be null) OR (Order_Executing_Account should not be null and Order_Executing_Account must be present in Reference Data - Account Mapping.AccountNo))",
    "required": false
  },
  "orderClearingAccount": {
    "enabled": true,
    "condition": "((Order_Clearing_Account should be null) OR (Order_Clearing_Account should not be null and Order_Clearing_Account must be present in Reference Data - Account Mapping.AccountNo))",
    "required": false
  },
  "orderRoutedOrderId": {
    "enabled": true,
    "condition": "Must be populated when Order_Destination is not null and Order_Destination is present in Reference Data - US Broker Dealer.ClientID and Reference Data - US Broker Dealer.Membership Type = 'Exchange'",
    "required": true
  },
  "orderStartTime": {
    "enabled": true,
    "condition": "Order_Start_Time should not be less than Order_Event_Time",
    "required": true
  },
  "orderIdSession": {
    "enabled": true,
    "condition": "Order_Session is required when Order_Destination must be present in Reference Data - US Broker Dealer.ClientID when Order_Action in (5,6) and Reference Data - US Broker Dealer.Membership Type = 'Exchange'",
    "required": true
  }
};
