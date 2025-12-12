const prisma = require("../config/db");
const { z } = require("zod");
const { getValidationCode } = require("../constants/validationCodes");

 const markPreviousValidationErrorsDedupedForOrderBatch = async (batchId, userId) => {
  await prisma.$executeRaw`
    UPDATE validation_errors ve_old
    INNER JOIN orders o_old ON ve_old.orderId = o_old.id
    INNER JOIN (
      SELECT DISTINCT
        o_new.uniqueID AS uniqueID,
        ve_new.validationCode AS validationCode,
        ve_new.code AS code,
        ve_new.field AS field,
        ve_new.message AS message
      FROM validation_errors ve_new
      INNER JOIN orders o_new ON ve_new.orderId = o_new.id
      WHERE ve_new.batchId = ${batchId}
        AND o_new.userId = ${userId}
        AND ve_new.orderId IS NOT NULL
    ) sig
      ON o_old.uniqueID = sig.uniqueID
     AND ve_old.validationCode = sig.validationCode
     AND ve_old.code = sig.code
     AND ve_old.field = sig.field
     AND ve_old.message = sig.message
    SET ve_old.is_deduped = 1
    WHERE ve_old.batchId <> ${batchId}
      AND o_old.userId = ${userId}
      AND ve_old.orderId IS NOT NULL
  `;
 };

 const markPreviousValidationErrorsDedupedForExecutionBatch = async (batchId, userId) => {
  await prisma.$executeRaw`
    UPDATE validation_errors ve_old
    INNER JOIN executions e_old ON ve_old.executionId = e_old.id
    INNER JOIN (
      SELECT DISTINCT
        e_new.uniqueID AS uniqueID,
        ve_new.validationCode AS validationCode,
        ve_new.code AS code,
        ve_new.field AS field,
        ve_new.message AS message
      FROM validation_errors ve_new
      INNER JOIN executions e_new ON ve_new.executionId = e_new.id
      WHERE ve_new.batchId = ${batchId}
        AND e_new.userId = ${userId}
        AND ve_new.executionId IS NOT NULL
    ) sig
      ON e_old.uniqueID = sig.uniqueID
     AND ve_old.validationCode = sig.validationCode
     AND ve_old.code = sig.code
     AND ve_old.field = sig.field
     AND ve_old.message = sig.message
    SET ve_old.is_deduped = 1
    WHERE ve_old.batchId <> ${batchId}
      AND e_old.userId = ${userId}
      AND ve_old.executionId IS NOT NULL
  `;
 };

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
 * Validates executions against client's execution validation schema
 * @param {Object} executionData - The execution data to validate
 * @param {Object} zodSchemaObj - The zod schema object from client's exe_validation_1 field
 * @returns {Object} - { success: boolean, errors?: array }
 */
const validateExecution = (executionData, zodSchemaObj) => {
  // Reuse the same dynamic zod validation as orders
  return validateOrder(executionData, zodSchemaObj);
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

    // Route execution batches to execution validator
    if (batch.fileType === 'execution') {
      return await processExecutionBatchValidation(batchId, batch);
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
              is_deduped: 0,  // New validation errors start as not deduped
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
    
    
    // Mark batch as validated
    await prisma.batch.update({
      where: { id: batchId },
      data: { validation_1: allPassed },
    });

    await markPreviousValidationErrorsDedupedForOrderBatch(batchId, batch.user.id);
    
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

/**
 * Process execution validation for a specific batch
 * @param {number} batchId - The batch ID to validate
 */
const processExecutionBatchValidation = async (batchId, batch = null) => {
  try {
    // Get batch if not provided
    if (!batch) {
      batch = await prisma.batch.findUnique({
        where: { id: batchId },
        include: {
          user: {
            select: { id: true, clientId: true },
          },
        },
      });
      if (!batch) {
        console.log(`[Validation] Batch ${batchId} not found`);
        return;
      }
    }

    // Get client's execution validation schema
    if (!batch.user.clientId) {
      console.log(`[Validation] User ${batch.userId} has no associated client`);
      await prisma.batch.update({ where: { id: batchId }, data: { validation_1: true } });
      return;
    }

    const client = await prisma.client.findUnique({
      where: { id: batch.user.clientId },
      select: { exe_validation_1: true },
    });

    if (!client || !client.exe_validation_1) {
      console.log(`[Validation] Client has no execution validation schema configured`);
      await prisma.batch.update({ where: { id: batchId }, data: { validation_1: true } });
      return;
    }

    // Get all executions for this batch
    const executions = await prisma.execution.findMany({ where: { batchId } });
    console.log(`[Validation] Validating ${executions.length} executions for batch ${batchId}`);

    let successCount = 0;
    let failCount = 0;
    const failed = [];

    for (const exe of executions) {
      const result = validateExecution(exe, client.exe_validation_1);

      // Persist validation result for each execution
      const validation = await prisma.validation.create({
        data: {
          executionId: exe.id,
          batchId: batchId,
          success: result.success,
          validatedAt: new Date(),
        },
      });

      // Persist individual error records when validation fails
      if (!result.success && result.errors && result.errors.length > 0) {
        await prisma.validationError.createMany({
          data: result.errors.map((error) => {
            // Determine validation code based on error message patterns (same mapping logic as order validation)
            let validationCodeKey = 'CTX_INVALID_COMBINATION';
            const msg = error.message?.toLowerCase() || '';
            if (msg.includes('required')) {
              validationCodeKey = 'REQ_MISSING_FIELD';
            } else if (msg.includes('format') || msg.includes('invalid')) {
              validationCodeKey = 'FMT_INVALID_FORMAT';
            } else if (msg.includes('duplicate')) {
              validationCodeKey = 'DUP_DUPLICATE_RECORD';
            } else if (msg.includes('range') || msg.includes('out of')) {
              validationCodeKey = 'RNG_VALUE_OUT_OF_RANGE';
            } else if (msg.includes('enum') || msg.includes('allowed')) {
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
              executionId: exe.id,
              is_deduped: 0,  // New validation errors start as not deduped
              is_validated: result.success ? 1 : 0,  // Set based on validation result
            };
          }),
        });
      }

      if (result.success) {
        successCount++;
      } else {
        failCount++;
        failed.push({
          executionId: exe.id,
          executionIdentifier: exe.executionId || exe.executionSeqNumber,
          errors: result.errors,
        });
      }
    }

    const allPassed = failCount === 0;
    const errorLog = failed.length > 0
      ? JSON.stringify({ type: 'execution_validation', failedExecutions: failed.slice(0, 100), totalFailed: failCount })
      : null;

    await prisma.batch.update({ where: { id: batchId }, data: { validation_1: allPassed, errorLog: errorLog ?? batch.errorLog } });

    await markPreviousValidationErrorsDedupedForExecutionBatch(batchId, batch.user.id);
    console.log(`[Validation] Execution Batch ${batchId} completed: ${successCount} passed, ${failCount} failed - Overall: ${allPassed ? 'PASSED' : 'FAILED'}`);

    return { batchId, totalExecutions: executions.length, successCount, failCount };
  } catch (error) {
    console.error(`[Validation] Error processing execution batch ${batchId}:`, error);
    throw error;
  }
};

module.exports = {
  validateOrder,
  validateExecution,
  processBatchValidation,
  processExecutionBatchValidation,
};
