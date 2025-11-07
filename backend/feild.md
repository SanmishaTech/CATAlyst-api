Field Descriptions

Order Identification:
1. Scenario - Test or business scenario identifier
2. Order_ID - Unique order identifier
3. Order_ID_Version - Version number of the order
4. Order_ID_Session - Trading session identifier
5. Order_ID_Instance - Instance identifier for the order
6. Parent_Order_ID - Identifier of the parent order (for child orders)
7. Cancelreplace_Order_ID - Original order ID when canceling/replacing
8. Linked_Order_ID - Related or linked order identifier

Order Status & Action:
9. Order_Action - Action taken on the order (new, cancel, replace, etc.)
10. Order_Status - Current status of the order (open, filled, canceled, etc.)

Order Capacity & Routing:
11. Order_Capacity - Trading capacity (principal, agency, riskless principal)
12. Order_Destination - Exchange or venue where order is routed
13. Order_Client_Ref - Client reference number
14. Order_Client_Ref_Details - Additional client reference details
15. Order_Executing_Entity - Entity executing the order
16. Order_Booking_Entity - Entity booking the order
17. Order_Position_Account - Account for position tracking

Order Details:
18. Order_Side - Buy or sell side
19. Order_Client_Capacity - Client's trading capacity
20. Order_Manual_Indicator - Whether order was manually entered
21. Order_Request_Time - Time order was requested
22. Order_Event_Time - Time of order event
23. Order_Manual_Timestamp - Timestamp for manual orders
24. Order_OMS_Source - Order management system source
25. Order_Publishing_Time - Time order was published
26. Order_Trade_Date - Trade date

Order Quantity & Price:
27. Order_Quantity - Total order quantity
28. Order_Price - Order price
29. Order_Type - Order type (market, limit, stop, etc.)
30. Order_TimeInforce - Time in force (day, GTC, IOC, FOK, etc.)

Order Instructions:
31. Order_Execution_Instructions - Special execution instructions
32. Order_Attributes - Additional order attributes
33. Order_Restrictions - Trading restrictions on the order
34. Order_Auction_Indicator - Whether order participates in auction
35. Order_Swap_Indicator - Swap transaction indicator
36. Order_OSI - Order source indicator

Instrument Details:
37. Order_Instrument_ID - Unique instrument identifier
38. Order_Linked_Instrument_ID - Related instrument identifier
39. Order_Currency_ID - Currency of the order
40. Order_Flow_Type - Order flow classification
41. Order_Algo_Instruction - Algorithmic trading instructions
42. Order_Symbol - Trading symbol
43. Order_Instrument_Reference - Type of instrument reference
44. Order_Instrument_Reference_Value - Value of instrument reference
45. Order_Option_Put_Call - Put or call for options
46. Order_Option_Strike_Price - Strike price for options
47. Order_Option_Leg_Indicator - Multi-leg option indicator

Account & Compliance:
48. Order_Compliance_ID - Compliance identifier
49. Order_Entity_ID - Entity identifier
50. Order_Executing_Account - Executing account number
51. Order_Clearing_Account - Clearing account number
52. Order_Client_Order_ID - Client's order identifier
53. Order_Routed_Order_ID - Order ID after routing
54. Order_Trading_Owner - Owner/trader of the order
55. Order_Extended_Attribute - Extended attributes field
56. Order_Quote_ID - Related quote identifier
57. Order_Represent_Order_ID - Representative order identifier
58. Order_On_Behalf_Comp_ID - On-behalf-of company ID
59. Order_spread - Spread value for multi-leg orders

Order Modifications:
60. Order_Amend_Reason - Reason for order amendment
61. Order_Cancel_Reject_Reason - Reason for cancel/reject

Market Data:
62. Order_Bid_Size - Bid size at order time
63. Order_Bid_Price - Bid price at order time
64. Order_Ask_Size - Ask size at order time
65. Order_Ask_Price - Ask price at order time

Advanced Order Parameters:
66. Order_Basket_ID - Basket order identifier
67. Order_Cum_Qty - Cumulative filled quantity
68. Order_Leaves_Qty - Remaining unfilled quantity
69. Order_Stop_Price - Stop price for stop orders
70. Order_Discretion_Price - Discretionary price limit
71. Order_Exdestination_Instruction - Exchange destination instructions
72. Order_Execution_Parameter - Execution parameters
73. Order_Infobarrier_ID - Information barrier identifier
74. Order_Leg_Ratio - Ratio for multi-leg orders
75. Order_Locate_ID - Short sale locate identifier
76. Order_Negotiated_Indicator - Negotiated trade indicator
77. Order_Open_Close - Open or close position indicator
78. Order_Participant_Priority_Code - Participant priority code
79. Order_,Action_Initiated - Who initiated the action
80. Order_Package_Indicator - Package order indicator
81. Order_Package_ID - Package identifier
82. Order_Package_Pricetype - Package pricing type
83. Order_Strategy_Type - Trading strategy type
84. Order_Secondary_Offering - Secondary offering indicator
85. Order_Start_Time - Order start time
86. Order_TIF_Expiration - Time in force expiration
87. Order_Parent_Child_Type - Parent-child relationship type
88. Order_Minimum_Qty - Minimum execution quantity
89. Order_Trading_Session - Trading session designation
90. Order_Display_Price - Displayed price
91. Order_Seq_Number - Sequence number

ATS & Display:
92. ATS_Display_Indicator - Alternative trading system display indicator
93. Order_Display_Qty - Displayed quantity
94. Order_Working_Price - Working price
95. ATS_Order_Type - ATS order type

NBBO & Compliance:
96. Order_Nbbo_Source - National best bid and offer source
97. Order_Nbbo_Timestamp - NBBO timestamp
98. Order_Solicitation_Flag - Solicited order flag
99. Order_Net_Price - Net price

Routing Status:
100. Route_Rejected_Flag - Whether route was rejected
101. Order_Origination_System - System where order originated