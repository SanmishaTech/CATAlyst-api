const prisma = require("../config/db");
const { z } = require("zod");
const { getValidationCode } = require("../constants/validationCodes");

/**
 * Validates orders against client's validation schema
 * @param {Object} orderData - The order data to validate
 * @param {Object} zodSchemaObj - The zod schema object from client's validation_1 field
 * @returns {Object} - { success: boolean, errors?: array }
 */
const validateOrder = (orderData, zodSchemaObj) => {
  try {
    // Reconstruct the zod schema from the stored JSON object
    // The zodSchemaObj should contain field definitions
    if (!zodSchemaObj || typeof zodSchemaObj !== "object") {
      return {
        success: false,
        errors: ["Invalid or missing validation schema"],
      };
    }

    // Build dynamic zod schema from stored configuration
    const schemaShape = {};
    
    for (const [fieldName, fieldConfig] of Object.entries(zodSchemaObj)) {
      if (!fieldConfig || typeof fieldConfig !== "object") continue;
      
      let fieldSchema;
      
      // Handle different field types
      switch (fieldConfig.type) {
        case "string":
          fieldSchema = z.string();
          if (fieldConfig.min !== undefined) {
            fieldSchema = fieldSchema.min(fieldConfig.min, fieldConfig.minMessage);
          }
          if (fieldConfig.max !== undefined) {
            fieldSchema = fieldSchema.max(fieldConfig.max, fieldConfig.maxMessage);
          }
          if (fieldConfig.email) {
            fieldSchema = fieldSchema.email(fieldConfig.emailMessage);
          }
          if (fieldConfig.regex) {
            fieldSchema = fieldSchema.regex(new RegExp(fieldConfig.regex), fieldConfig.regexMessage);
          }
          break;
          
        case "number":
          fieldSchema = z.number();
          if (fieldConfig.min !== undefined) {
            fieldSchema = fieldSchema.min(fieldConfig.min, fieldConfig.minMessage);
          }
          if (fieldConfig.max !== undefined) {
            fieldSchema = fieldSchema.max(fieldConfig.max, fieldConfig.maxMessage);
          }
          if (fieldConfig.int) {
            fieldSchema = fieldSchema.int(fieldConfig.intMessage);
          }
          break;
          
        case "boolean":
          fieldSchema = z.boolean();
          break;
          
        case "date":
          fieldSchema = z.string().datetime(fieldConfig.datetimeMessage);
          break;
          
        case "enum":
          if (fieldConfig.values && Array.isArray(fieldConfig.values)) {
            fieldSchema = z.enum(fieldConfig.values);
          }
          break;
          
        default:
          fieldSchema = z.any();
      }
      
      // Handle optional/required
      if (fieldConfig.optional) {
        fieldSchema = fieldSchema.optional();
      }
      if (fieldConfig.nullable) {
        fieldSchema = fieldSchema.nullable();
      }
      
      schemaShape[fieldName] = fieldSchema;
    }
    
    const dynamicSchema = z.object(schemaShape);
    
    // Validate the order data
    const result = dynamicSchema.safeParse(orderData);
    
    if (result.success) {
      return { success: true };
    } else {
      return {
        success: false,
        errors: result.error.errors.map(err => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        })),
      };
    }
  } catch (error) {
    return {
      success: false,
      errors: [{ message: "Validation error", details: error.message }],
    };
  }
};

/**
 * Process validation for a specific batch
 * @param {number} batchId - The batch ID to validate
 */
const processBatchValidation = async (batchId) => {
  try {
    console.log(`[Validation] Processing batch ${batchId}`);
    
    // Get batch with user info to find clientId
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        user: {
          select: {
            id: true,
            clientId: true,
          },
        },
      },
    });

    if (!batch) {
      console.log(`[Validation] Batch ${batchId} not found`);
      return;
    }

    if (batch.validation_1 !== null) {
      console.log(`[Validation] Batch ${batchId} already validated`);
      return;
    }

    // Get client's validation schema
    if (!batch.user.clientId) {
      console.log(`[Validation] User ${batch.userId} has no associated client`);
      await prisma.batch.update({
        where: { id: batchId },
        data: { validation_1: true },
      });
      return;
    }

    const client = await prisma.client.findUnique({
      where: { id: batch.user.clientId },
      select: { validation_1: true },
    });

    if (!client || !client.validation_1) {
      console.log(`[Validation] Client has no validation schema configured`);
      await prisma.batch.update({
        where: { id: batchId },
        data: { validation_1: true },
      });
      return;
    }

    // Get all orders for this batch
    const orders = await prisma.order.findMany({
      where: { batchId: batchId },
    });

    console.log(`[Validation] Validating ${orders.length} orders for batch ${batchId}`);

    // Validate each order and store results
    const validationResults = [];
    
    for (const order of orders) {
      const validationResult = validateOrder(order, client.validation_1);
      
      // Store validation result with individual error records
      const validation = await prisma.validation.create({
        data: {
          orderId: order.id,
          batchId: batchId,
          success: validationResult.success,
          validatedAt: new Date(),
        },
      });
      
      // Create individual error records if validation failed
      if (!validationResult.success && validationResult.errors && validationResult.errors.length > 0) {
        await prisma.validationError.createMany({
          data: validationResult.errors.map(error => {
            // Determine validation code based on error type
            let validationCodeKey = 'CTX_INVALID_COMBINATION'; // default
            
            if (error.message?.toLowerCase().includes('required')) {
              validationCodeKey = 'REQ_MISSING_FIELD';
            } else if (error.message?.toLowerCase().includes('format') || error.message?.toLowerCase().includes('invalid')) {
              validationCodeKey = 'FMT_INVALID_FORMAT';
            } else if (error.message?.toLowerCase().includes('duplicate')) {
              validationCodeKey = 'DUP_DUPLICATE_RECORD';
            } else if (error.message?.toLowerCase().includes('range') || error.message?.toLowerCase().includes('out of')) {
              validationCodeKey = 'RNG_VALUE_OUT_OF_RANGE';
            } else if (error.message?.toLowerCase().includes('enum') || error.message?.toLowerCase().includes('allowed')) {
              validationCodeKey = 'REF_INVALID_ENUM';
            }
            
            const validationCodeObj = getValidationCode(validationCodeKey);
            
            return {
              validationId: validation.id,
              validationCode: validationCodeObj.code,
              field: error.field || 'unknown',
              message: error.message || 'Validation failed',
              code: error.code || 'validation_error',
              batchId: batchId,
              orderId: order.id,
            };
          }),
        });
      }
      
      validationResults.push({
        orderId: order.id,
        success: validationResult.success,
      });
    }

    const successCount = validationResults.filter(r => r.success).length;
    const failCount = validationResults.filter(r => !r.success).length;
    
    // Set validation_1 based on results:
    // true (1) if all orders passed, false (0) if any failed
    const allPassed = failCount === 0;
    
    // Update is_validated flag for each order based on validation result
    for (const result of validationResults) {
      await prisma.order.update({
        where: { id: result.orderId },
        data: { is_validated: result.success ? 1 : 0 },
      });
    }
    
    // Mark batch as validated
    await prisma.batch.update({
      where: { id: batchId },
      data: { validation_1: allPassed },
    });
    
    console.log(`[Validation] Batch ${batchId} completed: ${successCount} passed, ${failCount} failed - Overall: ${allPassed ? 'PASSED' : 'FAILED'}`);
    
    return {
      batchId,
      totalOrders: orders.length,
      successCount,
      failCount,
    };
  } catch (error) {
    console.error(`[Validation] Error processing batch ${batchId}:`, error);
    throw error;
  }
};

module.exports = {
  validateOrder,
  processBatchValidation,
};
