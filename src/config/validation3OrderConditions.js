/**
 * Auto-generated Validation 3 Order Conditions Configuration
 * Run scripts/generateValidation3Configs.js to update.
 * Do not edit manually.
 */

module.exports = {
  "orderDestination": {
    "enabled": true,
    "condition": "Order_Destination must present in Reference Data - US Broker Dealer.ClientID and Reference Data - US Broker Dealer.Membership Type = 'Exchange'",
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
    "condition": "Order_Position_Account should not be null and Order_Position_Account must be present in Referance Data - Account Mapping.AccountNo",
    "required": true
  },
  "orderCurrencyId": {
    "enabled": true,
    "condition": "Order_Currency_ID should not be null and Order_Currency_ID must be present in Reference Data - ISO 4217 Currency Codes.Code",
    "required": true
  },
  "orderExecutingAccount": {
    "enabled": true,
    "condition": "((Order_Executing_Account should be null) OR (Order_Executing_Account should not be null and Order_Executing_Account must be present in Referance Data - Account Mapping.AccountNo))",
    "required": true
  },
  "orderClearingAccount": {
    "enabled": true,
    "condition": "((Order_Clearing_Account should be null) OR (Order_Clearing_Account should not be null and Order_Clearing_Account must be present in Referance Data - Account Mapping.AccountNo))",
    "required": true
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
  }
};
