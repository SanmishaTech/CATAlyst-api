/**
 * Business Classification Configuration
 *
 * Source: docs/Business_Classification.md
 *
 * Purpose:
 * - Provide a readable, structured summary of the business classification rules
 * - Act as a single reference for product/ops users and developers
 * - Keep rule text human-friendly while remaining machine-loadable if needed
 *
 * Structure:
 * {
 *   order: {
 *     classificationKey: {
 *       displayName: string,
 *       scope: 'order',
 *       purpose: string,
 *       cases: [
 *         {
 *           name: string,
 *           criteria: string,
 *           result: string,
 *           relatedFields: string[]
 *         }
 *       ],
 *       notes?: string
 *     },
 *     ...
 *   },
 *   execution: {
 *     classificationKey: { ...same shape... },
 *     ...
 *   },
 *   referenceData: [
 *     { name: string, fields: string[] }
 *   ]
 * }
 */

const businessClassificationConfig = {
  order: {
    clientType: {
      displayName: "Client Type",
      scope: "order",
      purpose: "Identifies the type of client initiating or associated with the order.",
      cases: [
        {
          name: "US Broker Dealer - FINRA Member",
          criteria:
            "Order_Client_Ref exists in US Broker Dealer reference; Membership Type = FINRA Member",
          result: "Client Type = 'US Broker Dealer - FINRA Member'",
          relatedFields: [
            "Order Client Ref (Order)",
            "ClientID (US Broker Dealer ref)",
            "Membership Type (US Broker Dealer ref)",
            "Foreign Broker Dealer (ref)",
            "Broker Dealer (ref)",
            "Affiliate Flag (ref)",
            "MIC Value (ref)",
            "Exchange (ref)",
          ],
        },
        {
          name: "US Broker Dealer - Non FINRA Member",
          criteria:
            "Order_Client_Ref exists in US Broker Dealer reference; Membership Type = FINRA Non-Member",
          result: "Client Type = 'US Broker Dealer - Non FINRA Member'",
          relatedFields: ["Order Client Ref (Order)", "ClientID", "Membership Type"],
        },
        {
          name: "Foreign Broker Dealer",
          criteria:
            "Order_Client_Ref exists in US Broker Dealer reference; Membership Type IN (FINRA Member, FINRA Non-Member); ForeignBrokerDealer = 'Y'",
          result: "Client Type = 'Foreign Broker Dealer'",
          relatedFields: ["Order Client Ref", "ClientID", "Membership Type", "ForeignBrokerDealer"],
        },
        {
          name: "Institutional",
          criteria:
            "Order_Client_Ref exists in US Broker Dealer reference AND (ForeignBrokerDealer = 'N' OR BrokerDealer = 'N' OR MIC Value is null)",
          result: "Client Type = 'Institutional'",
          relatedFields: ["Order Client Ref", "ClientID", "ForeignBrokerDealer", "BrokerDealer", "MIC Value"],
        },
        {
          name: "Affiliate Entity",
          criteria:
            "Order_Client_Ref exists in US Broker Dealer reference; Membership Type IN (FINRA Member, FINRA Non-Member); AffiliateFlag = 'Y'",
          result: "Client Type = 'Affiliate Entity'",
          relatedFields: ["Order Client Ref", "ClientID", "Membership Type", "AffiliateFlag"],
        },
        {
          name: "Exchange",
          criteria:
            "Order_Client_Ref exists in US Broker Dealer reference; MIC Value not null AND MIC Value present in Destination Code Mapping",
          result: "Client Type = 'Exchange'",
          relatedFields: ["Order Client Ref", "ClientID", "MIC Value", "Destination Code Mapping"],
        },
      ],
    },

    orderEdge: {
      displayName: "Order Edge",
      scope: "order",
      purpose: "Indicates the direction and nature of order handling (client-facing vs market-facing).",
      cases: [
        {
          name: "Client Facing",
          criteria: "Order_Capacity IN (1) AND Order_OMS_Source = Order_Origination_System",
          result: "Order Edge = 'Client Facing'",
          relatedFields: ["Order Capacity", "Order OMS Source", "Order Origination System", "Order Destination", "Order Action", "Order Info Barrier ID", "Linked Order Type"],
        },
        {
          name: "Market Facing",
          criteria: "Order_Destination is NOT null AND Order_Action = Order Externally Routed Accepted",
          result: "Order Edge = 'Market Facing'",
          relatedFields: ["Order Destination", "Order Action"],
        },
        {
          name: "Principal",
          criteria: "Order_Capacity IN (4) AND Order_OMS_Source = Order_Origination_System",
          result: "Order Edge = 'Principal'",
          relatedFields: ["Order Capacity", "Order OMS Source", "Order Origination System"],
        },
        {
          name: "Aggregated",
          criteria: "Linked_Order_Type IN (4)",
          result: "Order Edge = 'Aggregated'",
          relatedFields: ["Linked Order Type"],
        },
        {
          name: "Information Barrier",
          criteria: "Order_Action IN (4) AND Order_InfoBarrier_ID differs from previous record",
          result: "Order Edge = 'Information Barrier'",
          relatedFields: ["Order Action", "Order InfoBarrier ID"],
        },
        {
          name: "Internal",
          criteria: "Order Edge NOT IN (Client Facing, Market Facing, Principal, Aggregated, Information Barrier)",
          result: "Order Edge = 'Internal'",
          relatedFields: ["Order Action", "Order Destination", "Linked Order Type"],
        },
      ],
    },

    orderCapacityDerived: {
      displayName: "Order Capacity Derived",
      scope: "order",
      purpose: "Derives the capacity in which the order was placed.",
      cases: [
        { name: "Agency", criteria: "Order_Capacity IN (1)", result: "Order Capacity Derived = 'Agency'", relatedFields: ["Order Capacity"] },
        { name: "Proprietary", criteria: "Order_Capacity IN (2)", result: "Order Capacity Derived = 'Proprietary'", relatedFields: ["Order Capacity"] },
        { name: "Individual", criteria: "Order_Capacity IN (3)", result: "Order Capacity Derived = 'Individual'", relatedFields: ["Order Capacity"] },
        { name: "Principal", criteria: "Order_Capacity IN (4)", result: "Order Capacity Derived = 'Principal'", relatedFields: ["Order Capacity"] },
        { name: "Riskless Principal", criteria: "Order_Capacity IN (5)", result: "Order Capacity Derived = 'Riskless Principal'", relatedFields: ["Order Capacity"] },
        { name: "Agent for Other Member", criteria: "Order_Capacity IN (5)", result: "Order Capacity Derived = 'Agent for Other Member'", relatedFields: ["Order Capacity"] },
      ],
    },

    arrivalMarketability: {
      displayName: "Arrival Marketability",
      scope: "order",
      purpose: "Determines whether the order is marketable upon arrival.",
      cases: [
        {
          name: "Marketable",
          criteria:
            "Order_Type IN (1) OR (Order_Type IN (2) AND Side IN (2,4,5,6) AND Order_Price <= Order_Bid_Price) OR (Order_Type IN (2) AND Side IN (1) AND Order_Price >= Order_Ask_Price)",
          result: "Arrival Marketability = 'Marketable'",
          relatedFields: ["Order Type", "Side", "Order Price", "Order Bid Price", "Order Ask Price"],
        },
        {
          name: "Non-Marketable",
          criteria: "Complement of Marketable condition",
          result: "Arrival Marketability = 'Non-Marketable'",
          relatedFields: ["Order Type", "Side", "Order Price", "Order Bid Price", "Order Ask Price"],
        },
      ],
    },

    orderClassification: {
      displayName: "Order Classification",
      scope: "order",
      purpose: "Classifies the order based on characteristics and linkages.",
      cases: [
        { name: "Representative Order", criteria: "Linked_Order_Type IN (1)", result: "Order Classification = 'Representative Order'", relatedFields: ["Linked Order Type", "Order Capacity", "Order Client Ref"] },
        { name: "Client Order", criteria: "Order Capacity IN (1) AND Order_Client_Ref NOT null", result: "Order Classification = 'Client Order'", relatedFields: ["Order Capacity", "Order Client Ref"] },
        { name: "Principal Order", criteria: "Order Capacity IN (4) AND Order_Client_Ref is null AND Linked_Order_Type NOT IN (1)", result: "Order Classification = 'Principal Order'", relatedFields: ["Order Capacity", "Order Client Ref", "Linked Order Type"] },
        { name: "Synthetic Order", criteria: "Linked_Order_Type IN (5)", result: "Order Classification = 'Synthetic Order'", relatedFields: ["Linked Order Type"] },
      ],
    },

    flowTypeDerived: {
      displayName: "Flow Type Derived",
      scope: "order",
      purpose: "Identifies the flow type of the order.",
      cases: [
        { name: "Algo", criteria: "Order_Flow_Type IN (2)", result: "Flow Type Derived = 'Algo'", relatedFields: ["Order Flow Type"] },
        { name: "DMA (Direct Market Access)", criteria: "Order_Flow_Type IN (1)", result: "Flow Type Derived = 'DMA'", relatedFields: ["Order Flow Type"] },
        { name: "Sponsored Access", criteria: "Order_Flow_Type IN (3)", result: "Flow Type Derived = 'Sponsored Access'", relatedFields: ["Order Flow Type"] },
      ],
    },

    orderRoute: {
      displayName: "Order Route",
      scope: "order",
      purpose: "Indicates where the order is routed (exchange, ATS, broker, internal).",
      cases: [
        {
          name: "Externally ATS",
          criteria: "Order_Client_Ref exists in US Broker Dealer ref; ATSFlag = 'Y'",
          result: "Order Route = 'Externally ATS'",
          relatedFields: ["Order Client Ref", "ClientID", "ATSFlag", "Membership Type", "Broker Dealer"],
        },
        {
          name: "Externally Exchange",
          criteria: "Order_Client_Ref exists in US Broker Dealer ref; Membership Type = 'Exchange'",
          result: "Order Route = 'Externally Exchange'",
          relatedFields: ["Order Client Ref", "ClientID", "Membership Type"],
        },
        {
          name: "Externally Broker",
          criteria: "Order_Client_Ref exists in US Broker Dealer ref; BrokerDealer = 'Y'",
          result: "Order Route = 'Externally Broker'",
          relatedFields: ["Order Client Ref", "ClientID", "BrokerDealer"],
        },
        {
          name: "Internal",
          criteria: "Order Route NOT IN (Externally ATS, Externally Exchange, Externally Broker)",
          result: "Order Route = 'Internal'",
          relatedFields: ["Order Client Ref", "ClientID", "Membership Type", "BrokerDealer", "ATSFlag"],
        },
      ],
    },

    orderStatus: {
      displayName: "Order Status",
      scope: "order",
      purpose: "Represents the current status of the order.",
      cases: [
        { name: "Open", criteria: "Order_Status IN (1)", result: "Code = 1", relatedFields: ["Order Status"] },
        { name: "Canceled", criteria: "Order_Status IN (2)", result: "Code = 2", relatedFields: ["Order Status"] },
        { name: "Replaced", criteria: "Order_Status IN (3)", result: "Code = 3", relatedFields: ["Order Status"] },
        { name: "Done for day", criteria: "Order_Status IN (4)", result: "Code = 4", relatedFields: ["Order Status"] },
        { name: "Expired", criteria: "Order_Status IN (5)", result: "Code = 5", relatedFields: ["Order Status"] },
        { name: "Rejected", criteria: "Order_Status IN (6)", result: "Code = 6", relatedFields: ["Order Status"] },
        { name: "Partially filled", criteria: "Order_Status IN (7)", result: "Code = 7", relatedFields: ["Order Status"] },
        { name: "Filled", criteria: "Order_Status IN (8)", result: "Code = 8", relatedFields: ["Order Status"] },
      ],
    },

    orderAction: {
      displayName: "Order Action",
      scope: "order",
      purpose: "Describes the specific action taken on the order.",
      cases: [
        { name: "Order Requested", criteria: "Code = 1", result: "Action = 1", relatedFields: ["Order Action"] },
        { name: "Order Request Accepted", criteria: "Code = 2", result: "Action = 2", relatedFields: ["Order Action"] },
        { name: "Order Internal Route", criteria: "Code = 3", result: "Action = 3", relatedFields: ["Order Action"] },
        { name: "Order Internal Route Acknowledged", criteria: "Code = 4", result: "Action = 4", relatedFields: ["Order Action"] },
        { name: "Order External Route", criteria: "Code = 5", result: "Action = 5", relatedFields: ["Order Action"] },
        { name: "Order External Route Acknowledged", criteria: "Code = 6", result: "Action = 6", relatedFields: ["Order Action"] },
        { name: "Order Canceled", criteria: "Code = 7", result: "Action = 7", relatedFields: ["Order Action"] },
        { name: "Order Replaced", criteria: "Code = 8", result: "Action = 8", relatedFields: ["Order Action"] },
        { name: "Order Replace - Client Requested", criteria: "Code = 9", result: "Action = 9", relatedFields: ["Order Action"] },
        { name: "Order Replace - Client Request Accepted", criteria: "Code = 10", result: "Action = 10", relatedFields: ["Order Action"] },
        { name: "Order Cancel - Client Requested", criteria: "Code = 11", result: "Action = 11", relatedFields: ["Order Action"] },
        { name: "Order Cancel - Client Request Accepted", criteria: "Code = 12", result: "Action = 12", relatedFields: ["Order Action"] },
        { name: "Order Expired", criteria: "Code = 13", result: "Action = 13", relatedFields: ["Order Action"] },
        { name: "Order External Route (Alternative)", criteria: "Code = 14", result: "Action = 14", relatedFields: ["Order Action"] },
        { name: "Order Externally Routed Accepted", criteria: "Code = 15", result: "Action = 15", relatedFields: ["Order Action"] },
        { name: "Order Rejected", criteria: "Code = 16", result: "Action = 16", relatedFields: ["Order Action"] },
        { name: "Order Suspended", criteria: "Code = 17", result: "Action = 17", relatedFields: ["Order Action"] },
        { name: "Done for day", criteria: "Code = 18", result: "Action = 18", relatedFields: ["Order Action"] },
      ],
    },

    actionInitiation: {
      displayName: "Action Initiation (Order)",
      scope: "order",
      purpose: "Identifies who initiated the order action.",
      cases: [
        { name: "Firm", criteria: "Order_Action_Initiated IN (1)", result: "Action Initiation = 'Firm'", relatedFields: ["Order Action Initiated"] },
        { name: "Exchange", criteria: "Order_Action_Initiated IN (2)", result: "Action Initiation = 'Exchange'", relatedFields: ["Order Action Initiated"] },
        { name: "Client", criteria: "Order_Action_Initiated IN (3)", result: "Action Initiation = 'Client'", relatedFields: ["Order Action Initiated"] },
        { name: "Broker", criteria: "Order_Action_Initiated IN (4)", result: "Action Initiation = 'Broker'", relatedFields: ["Order Action Initiated"] },
      ],
    },

    productType: {
      displayName: "Product Type (Order)",
      scope: "order",
      purpose: "Identifies the type of security being ordered.",
      cases: [
        { name: "Equity", criteria: "Order_Instrument_ID in Instruments Mapping; TYPECODE IN ('COMMON STOCK','ETF','PREFERRED STOCK','WARRANT')", result: "Product Type = 'Equity'", relatedFields: ["Order Instrument ID", "InstrumentID", "TYPECODE"] },
        { name: "Options", criteria: "Order_Instrument_ID in Instruments Mapping; TYPECODE IN ('OPTION COMMON STOCK')", result: "Product Type = 'Options'", relatedFields: ["Order Instrument ID", "InstrumentID", "TYPECODE"] },
        { name: "Swap", criteria: "TBD", result: "Product Type = 'Swap'", relatedFields: ["Order Instrument ID"] },
        { name: "Futures", criteria: "Order_Instrument_ID in Instruments Mapping; TYPECODE IN ('FUTURE')", result: "Product Type = 'Futures'", relatedFields: ["Order Instrument ID", "InstrumentID", "TYPECODE"] },
      ],
      notes: "Most classifications rely on Instruments Mapping reference data.",
    },

    entityType: {
      displayName: "Entity Type (Order)",
      scope: "order",
      purpose: "Identifies the type of entity associated with the order.",
      cases: [
        {
          name: "US Broker Dealer",
          criteria: "Order_Client_Ref in US Broker Dealer reference AND BrokerDealer = 'Y'",
          result: "Entity Type = 'US Broker Dealer'",
          relatedFields: ["Order Client Ref", "ClientID", "BrokerDealer"],
        },
        {
          name: "International Broker Dealer",
          criteria: "TBD",
          result: "Entity Type = 'International Broker Dealer'",
          relatedFields: ["Order Client Ref"],
        },
        {
          name: "Exempt",
          criteria: "TBD",
          result: "Entity Type = 'Exempt'",
          relatedFields: ["Order Client Ref"],
        },
        {
          name: "Investment Fund",
          criteria: "TBD",
          result: "Entity Type = 'Investment Fund'",
          relatedFields: ["Order Client Ref"],
        },
        {
          name: "Branch",
          criteria: "TBD",
          result: "Entity Type = 'Branch'",
          relatedFields: ["Order Client Ref"],
        },
      ],
    },
  },

  execution: {
    productType: {
      displayName: "Product Type (Execution)",
      scope: "execution",
      purpose: "Identifies the type of security being executed.",
      cases: [
        { name: "Equity", criteria: "Execution_Instrument_ID in Instruments Mapping; TYPECODE IN ('COMMON STOCK','ETF','PREFERRED STOCK','WARRANT')", result: "Product Type = 'Equity'", relatedFields: ["Execution Instrument ID", "InstrumentID", "TYPECODE"] },
        { name: "Options", criteria: "Execution_Instrument_ID in Instruments Mapping; TYPECODE IN ('OPTION COMMON STOCK')", result: "Product Type = 'Options'", relatedFields: ["Execution Instrument ID", "InstrumentID", "TYPECODE"] },
        { name: "Swap", criteria: "TBD", result: "Product Type = 'Swap'", relatedFields: ["Execution Instrument ID"] },
        { name: "Futures", criteria: "Execution_Instrument_ID in Instruments Mapping; TYPECODE IN ('FUTURE')", result: "Product Type = 'Futures'", relatedFields: ["Execution Instrument ID", "InstrumentID", "TYPECODE"] },
      ],
    },

    executionCapacity: {
      displayName: "Execution Capacity",
      scope: "execution",
      purpose: "Indicates the capacity in which the execution was completed.",
      cases: [
        { name: "Agency", criteria: "Execution_Capacity IN (1)", result: "Execution Capacity = 'Agency'", relatedFields: ["Execution Capacity"] },
        { name: "Principal", criteria: "Execution_Capacity IN (2)", result: "Execution Capacity = 'Principal'", relatedFields: ["Execution Capacity"] },
        { name: "Riskless Principal", criteria: "Execution_Capacity IN (5)", result: "Execution Capacity = 'Riskless Principal'", relatedFields: ["Execution Capacity"] },
      ],
    },

    tradeType: {
      displayName: "Trade Type",
      scope: "execution",
      purpose: "Identifies the settlement type of the execution.",
      cases: [
        {
          name: "Self Clear",
          criteria:
            "Execution_Booking_Account NOT null AND present in Account Mapping AND Account Mapping.Clearing Type = 'Self Clear'",
          result: "Trade Type = 'Self Clear'",
          relatedFields: ["Execution Booking Account", "AccountNo", "Clearing Type"],
        },
        {
          name: "Non Self Clear",
          criteria: "Complement of Self Clear condition",
          result: "Trade Type = 'Non Self Clear'",
          relatedFields: ["Execution Booking Account", "AccountNo", "Clearing Type"],
        },
      ],
    },

    priceImprovement: {
      displayName: "Price Improvement",
      scope: "execution",
      purpose: "Compares execution price to order price to determine price improvement.",
      cases: [
        {
          name: "Price Improved",
          criteria:
            "(Execution_Last_Price > Order_Price AND Execution_Side IN (2,4,5,6) AND Arrival Marketability = Marketable) OR (Execution_Last_Price < Order_Price AND Execution_Side IN (1,3) AND Arrival Marketability = Marketable)",
          result: "Price Improvement = 'Price Improved'",
          relatedFields: ["Execution Last Price", "Order Price", "Execution Side", "Order Type", "Side", "Order Bid Price", "Order Ask Price"],
        },
        {
          name: "No Price Improved",
          criteria:
            "(Execution_Last_Price = Order_Price AND Execution_Side IN (2,4,5,6) AND Arrival Marketability = Marketable) OR (Execution_Last_Price = Order_Price AND Execution_Side IN (1,3) AND Arrival Marketability = Marketable)",
          result: "Price Improvement = 'No Price Improved'",
          relatedFields: ["Execution Last Price", "Order Price", "Execution Side", "Order Type", "Side", "Order Bid Price", "Order Ask Price"],
        },
        {
          name: "Price Disimprove",
          criteria:
            "(Execution_Last_Price < Order_Price AND Execution_Side IN (2,4,5,6) AND Arrival Marketability = Marketable) OR (Execution_Last_Price > Order_Price AND Execution_Side IN (1,3) AND Arrival Marketability = Marketable)",
          result: "Price Improvement = 'Price Disimprove'",
          relatedFields: ["Execution Last Price", "Order Price", "Execution Side", "Order Type", "Side", "Order Bid Price", "Order Ask Price"],
        },
      ],
    },

    manningExecutionType: {
      displayName: "Manning Execution Type",
      scope: "execution",
      purpose: "Categorizes execution type based on capacity and transaction type.",
      cases: [
        { name: "Agency", criteria: "Execution_Capacity IN (1)", result: "Manning Execution Type = 'Agency'", relatedFields: ["Execution Capacity"] },
        { name: "Principal", criteria: "Execution_Capacity IN (2)", result: "Manning Execution Type = 'Principal'", relatedFields: ["Execution Capacity"] },
        { name: "Cross as Agent", criteria: "Execution_Capacity IN (3)", result: "Manning Execution Type = 'Cross as Agent'", relatedFields: ["Execution Capacity"] },
        { name: "Cross as Principal", criteria: "Execution_Capacity IN (4)", result: "Manning Execution Type = 'Cross as Principal'", relatedFields: ["Execution Capacity"] },
        { name: "Riskless Principal", criteria: "Execution_Capacity IN (5)", result: "Manning Execution Type = 'Riskless Principal'", relatedFields: ["Execution Capacity"] },
      ],
    },

    executionStatus: {
      displayName: "Execution Status",
      scope: "execution",
      purpose: "Indicates the reporting status of the execution.",
      cases: [
        {
          name: "Tape Reported",
          criteria: "Regulatory_Execution_ID NOT null AND Execution_Capacity IN (4, 2)",
          result: "Execution Status = 'Tape Reported'",
          relatedFields: ["Regulatory Execution ID", "Execution Capacity"],
        },
        {
          name: "Clearing only",
          criteria:
            "Regulatory_Execution_ID is null AND Execution_Capacity IN (1,3) AND Execution_Transaction_Type IN (7) AND Execution_Contra_Broker NOT null AND Execution_Contra_Broker in US Broker Dealer ref AND Membership Type NOT IN ('Exchange')",
          result: "Execution Status = 'Clearing only'",
          relatedFields: ["Regulatory Execution ID", "Execution Capacity", "Execution Transaction Type", "Execution Contra Broker", "ClientID", "Membership Type"],
        },
      ],
    },

    actionInitiation: {
      displayName: "Action Initiation (Execution)",
      scope: "execution",
      purpose: "Identifies the source of the execution.",
      cases: [
        {
          name: "Exchange",
          criteria:
            "Execution_Transaction_Type = 'Street' AND Execution_Contra_Broker in US Broker Dealer ref AND Membership Type = 'Exchange'",
          result: "Action Initiation = 'Exchange'",
          relatedFields: ["Execution Transaction Type", "Execution Contra Broker", "ClientID", "Membership Type"],
        },
        {
          name: "Client",
          criteria:
            "Execution_Transaction_Type = 'Client' AND Execution_Contra_Broker in US Broker Dealer ref AND Membership Type NOT IN ('Exchange')",
          result: "Action Initiation = 'Client'",
          relatedFields: ["Execution Transaction Type", "Execution Contra Broker", "ClientID", "Membership Type"],
        },
        {
          name: "Broker",
          criteria:
            "Execution_Transaction_Type = 'Street' AND Execution_Contra_Broker in US Broker Dealer ref AND Membership Type NOT IN ('Exchange')",
          result: "Action Initiation = 'Broker'",
          relatedFields: ["Execution Transaction Type", "Execution Contra Broker", "ClientID", "Membership Type"],
        },
        {
          name: "Clearing Broker",
          criteria:
            "Execution_Transaction_Type = 'Clearing' AND Execution_Contra_Broker in US Broker Dealer ref AND Membership Type NOT IN ('Exchange')",
          result: "Action Initiation = 'Clearing Broker'",
          relatedFields: ["Execution Transaction Type", "Execution Contra Broker", "ClientID", "Membership Type"],
        },
      ],
    },

    clearingType: {
      displayName: "Clearing Type",
      scope: "execution",
      purpose: "Identifies whether execution is eligible for booking.",
      cases: [
        { name: "Bookable", criteria: "Execution_Booking_Eligibility IN (1)", result: "Clearing Type = 'Bookable'", relatedFields: ["Execution Booking Eligibility"] },
        { name: "Non Booking", criteria: "Execution_Booking_Eligibility IN (2)", result: "Clearing Type = 'Non Booking'", relatedFields: ["Execution Booking Eligibility"] },
      ],
    },

    entityType: {
      displayName: "Entity Type (Execution)",
      scope: "execution",
      purpose: "Identifies the type of entity associated with the execution.",
      cases: [
        { name: "US Broker Dealer", criteria: "TBD", result: "Entity Type = 'US Broker Dealer'", relatedFields: ["Execution Contra Broker"] },
        { name: "International Broker Dealer", criteria: "TBD", result: "Entity Type = 'International Broker Dealer'", relatedFields: ["Execution Contra Broker"] },
        { name: "Exempt", criteria: "TBD", result: "Entity Type = 'Exempt'", relatedFields: ["Execution Contra Broker"] },
        { name: "Investment Fund", criteria: "TBD", result: "Entity Type = 'Investment Fund'", relatedFields: ["Execution Contra Broker"] },
        { name: "Branch", criteria: "TBD", result: "Entity Type = 'Branch'", relatedFields: ["Execution Contra Broker"] },
      ],
    },
  },

  referenceData: [
    {
      name: "US Broker Dealer Reference Data",
      fields: [
        "ClientID",
        "Membership Type (FINRA Member, FINRA Non-Member, Exchange)",
        "ForeignBrokerDealer (Y/N)",
        "BrokerDealer (Y/N)",
        "AffiliateFlag (Y/N)",
        "MIC Value",
        "ATSFlag (Y/N)",
      ],
    },
    {
      name: "Instruments Mapping",
      fields: [
        "InstrumentID",
        "TYPECODE (COMMON STOCK, ETF, PREFERRED STOCK, WARRANT, OPTION COMMON STOCK, FUTURE)",
      ],
    },
    {
      name: "Account Mapping",
      fields: ["AccountNo", "Clearing Type (Self Clear, etc.)"],
    },
    {
      name: "Destination Code Mapping",
      fields: ["MIC Values", "Destination mappings"],
    },
  ],
};

module.exports = businessClassificationConfig;
