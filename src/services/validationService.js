const prisma = require("../config/db");
const { z } = require("zod");
const { getValidationCode } = require("../constants/validationCodes");
const {
  classifyOrdersForBatch,
  classifyExecutionsForBatch,
} = require("./businessClassificationService");

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
        errors: [
          {
            field: "schema",
            message: "Invalid or missing validation schema",
            code: "schema_error",
          },
        ],
      };
    }

    const normalizedData = { ...(orderData || {}) };

    // Build dynamic zod schema from stored configuration
    const schemaShape = {};
    
    for (const [fieldName, fieldConfig] of Object.entries(zodSchemaObj)) {
      if (!fieldConfig || typeof fieldConfig !== "object") continue;

      if (fieldConfig.optional) {
        const v = normalizedData[fieldName];
        if (
          v === null ||
          v === undefined ||
          (typeof v === "string" && v.trim() === "")
        ) {
          delete normalizedData[fieldName];
        }
      }
      
      let fieldSchema;
      
      // Handle different field types
      switch (fieldConfig.type) {
        case "string": {
          // Optional behavior requested by user:
          // - If optional and value is empty => no error
          // - If optional and value is present => validate type + max (and other validators)
          const isOptional = !!fieldConfig.optional;

          let stringSchema = z.string();

          if (fieldConfig.min !== undefined) {
            stringSchema = stringSchema.min(fieldConfig.min, fieldConfig.minMessage);
          }
          if (fieldConfig.max !== undefined) {
            stringSchema = stringSchema.max(fieldConfig.max, fieldConfig.maxMessage);
          }
          if (fieldConfig.email) {
            stringSchema = stringSchema.email(fieldConfig.emailMessage);
          }
          if (fieldConfig.regex) {
            try {
              stringSchema = stringSchema.regex(
                new RegExp(fieldConfig.regex),
                fieldConfig.regexMessage
              );
            } catch (e) {
              // Ignore invalid regex in schema config to avoid breaking entire validation
            }
          }

          // If optional, allow empty string to pass without triggering min/max/regex/email.
          fieldSchema = isOptional
            ? z.union([stringSchema, z.literal("")])
            : stringSchema;
          break;
        }
          
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
          if (
            fieldConfig.values &&
            Array.isArray(fieldConfig.values) &&
            fieldConfig.values.length > 0
          ) {
            fieldSchema = z.enum(fieldConfig.values);
          } else {
            fieldSchema = z.any();
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
    const result = dynamicSchema.safeParse(normalizedData);
    
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
      errors: [
        {
          field: "schema",
          message: error?.message ? String(error.message) : "Validation error",
          code: "validation_error",
        },
      ],
    };
  }
};

/**
 * Validates executions against client's execution validation schema
 * @param {Object} executionData - The execution data to validate
 * @param {Object} zodSchemaObj - The zod schema object from client's exe_validation_1 field
 * @returns {Object} - { success: boolean, errors?: array }
 */
// ============================
// Level-2 simple rule evaluator
// Supports patterns:
// 1. "<Field> should not be null when <DepField> in (x,y,...)"
// 2. "<Field> should be null when <DepField> in (x,y,...)"
// 3. "<Field> must be in (x,y,...)"
// returns array of { field, message }
const evaluateLevel2Rules = (record, rulesObj) => {
  const errors = [];
  // Build a lowercase->value map so that rule conditions can be case-insensitive
  const recLower = {};
  for (const [k, v] of Object.entries(record || {})) {
    recLower[k.toLowerCase()] = v;
  }
  if (!rulesObj || typeof rulesObj !== 'object') return errors;

  for (const [field, rule] of Object.entries(rulesObj)) {
    if (!rule?.enabled || !rule.condition || rule.condition.trim() === '-' ) continue;
    const cond = rule.condition.toLowerCase();

    // Pattern 0: unconditional null requirement (no "when <depField>" clause)
    if (!cond.includes(' when ')) {
      const nullMatch = /^(?<target>[a-z0-9_]+).*?should\s+(?<neg>not\s+)?be null$/i.exec(cond);
      if (nullMatch) {
        const { target, neg } = nullMatch.groups;
        const hasValue = recLower[target] !== null && recLower[target] !== undefined && String(recLower[target]).trim() !== '';
        if (neg && !hasValue) {
          errors.push({ field, message: `${field} should not be null` });
        }
        if (!neg && hasValue) {
          errors.push({ field, message: `${field} should be null` });
        }
        continue; // processed this rule
      }
    }

    // Pattern 1 & 2: population based on other field list
    const popRegex = /^(?<target>[a-z0-9_]+).*?(?<should>should|must).*?(?<nullstate>not be null|be null).*?when (?<dep>[a-z0-9_]+) in \((?<vals>[^)]+)\)/;
    const popMatch = cond.match(popRegex);
    if (popMatch) {
      const { target, dep, nullstate, vals } = popMatch.groups;
      const list = vals.split(/[, ]+/).map(v => v.replace(/['"()]/g,'').trim()).filter(Boolean);
      const depVal = String(recLower[dep] ?? '').trim();
      const targetValPresent = recLower[target] !== null && recLower[target] !== undefined && String(recLower[target]).trim() !== '';
      const depMatch = list.includes(depVal);
      if (depMatch) {
        if (nullstate === 'not be null' && !targetValPresent) {
          errors.push({ field, message: `${field} should not be null when ${dep} in (${list.join(',')})`});
        }
        if (nullstate === 'be null' && targetValPresent) {
          errors.push({ field, message: `${field} should be null when ${dep} in (${list.join(',')})`});
        }
      }
      continue;
    }

    // Pattern 3: enum constraint "must be in (..)":
    const enumRegex = /^(?<target>[a-z0-9_]+).*?must.*?in \((?<vals>[^)]+)\)/;
    const enumMatch = cond.match(enumRegex);
    if (enumMatch) {
      const { target, vals } = enumMatch.groups;
      const list = vals.split(/[, ]+/).map(v => v.replace(/['"()]/g,'').trim()).filter(Boolean);
      const val = String(recLower[target] ?? '').trim();
      if (val && !list.includes(val)) {
        errors.push({ field, message: `${field} value ${val} not in allowed list (${list.join(',')})`});
      }
    }
  }
  return errors;
};

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
        data: { validation_1: true, validation_1_status: 'passed' },
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
        data: { validation_1: true, validation_1_status: 'passed' },
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
              validationLevel: 1,  // Validation 1
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
    const validationStatus = allPassed ? 'passed' : 'failed';
    
    // Mark batch as validated
    await prisma.batch.update({
      where: { id: batchId },
      data: { 
        validation_1: allPassed,
        validation_1_status: validationStatus,
      },
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
      await prisma.batch.update({ where: { id: batchId }, data: { validation_1: true, validation_1_status: 'passed' } });
      return;
    }

    const client = await prisma.client.findUnique({
      where: { id: batch.user.clientId },
      select: { exe_validation_1: true, validation_1: true },
    });

    if (!client || !client.exe_validation_1) {
      console.log(`[Validation] Client has no execution validation schema configured`);
      await prisma.batch.update({ where: { id: batchId }, data: { validation_1: true, validation_1_status: 'passed' } });
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
              validationLevel: 1,  // Validation 1
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

    const validationStatus = allPassed ? 'passed' : 'failed';
    await prisma.batch.update({
      where: { id: batchId },
      data: {
        validation_1: allPassed,
        validation_1_status: validationStatus,
        errorLog: errorLog ?? batch.errorLog
      }
    });

    await markPreviousValidationErrorsDedupedForExecutionBatch(batchId, batch.user.id);
    console.log(`[Validation] Execution Batch ${batchId} completed: ${successCount} passed, ${failCount} failed - Overall: ${allPassed ? 'PASSED' : 'FAILED'}`);

    return { batchId, totalExecutions: executions.length, successCount, failCount };
  } catch (error) {
    console.error(`[Validation] Error processing execution batch ${batchId}:`, error);
    throw error;
  }
};

/**
 * Process Validation 2 for a specific batch (Level 2 validation)
 * @param {number} batchId - The batch ID to validate
 */
const processValidation2ForBatch = async (batchId) => {
  try {
    console.log(`[Validation 2] Processing batch ${batchId}`);
    
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
      console.log(`[Validation 2] Batch ${batchId} not found`);
      return;
    }

    // Check if validation_1 passed
    if (batch.validation_1_status !== 'passed') {
      console.log(`[Validation 2] Batch ${batchId} - validation_1_status is not 'passed', skipping validation_2`);
      return;
    }

    // Check if already validated
    if (batch.validation_2 !== null) {
      console.log(`[Validation 2] Batch ${batchId} already validated`);
      return;
    }

    // Route execution batches to execution validator
    if (batch.fileType === 'execution') {
      return await processExecutionValidation2ForBatch(batchId, batch);
    }

    // Get client's validation_2 schema
    if (!batch.user.clientId) {
      console.log(`[Validation 2] User ${batch.userId} has no associated client`);
      await prisma.batch.update({
        where: { id: batchId },
        data: { validation_2: true },
      });
      return;
    }

    const client = await prisma.client.findUnique({
      where: { id: batch.user.clientId },
      select: { validation_2: true },
    });

    if (!client || !client.validation_2) {
      console.log(`[Validation 2] Client has no validation_2 schema configured`);
      await prisma.batch.update({
        where: { id: batchId },
        data: { validation_2: true },
      });
      return;
    }

    // Get all orders for this batch
    const orders = await prisma.order.findMany({
      where: { batchId: batchId },
    });

    console.log(`[Validation 2] Validating ${orders.length} orders for batch ${batchId}`);

    // Validate each order and store results
    const validationResults = [];
    
    for (const order of orders) {
      let validationResult = validateOrder(order, client.validation_2);
      // Apply simple Level-2 rules
      const ruleErrors = evaluateLevel2Rules(order, client.validation_2);
      if (ruleErrors.length > 0) {
        validationResult = {
          success: false,
          errors: [
            ...(validationResult.errors || []),
            ...ruleErrors.map(e => ({ field: e.field, message: e.message })),
          ],
        };
      }
      
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
              validationLevel: 2,  // Validation 2
              field: error.field || 'unknown',
              message: error.message || 'Validation 2 failed',
              code: error.code || 'validation_2_error',
              batchId: batchId,
              orderId: order.id,
              is_deduped: 0,
              is_validated: 0,
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
    
    // Set validation_2 based on results:
    // true (1) if all orders passed, false (0) if any failed
    const allPassed = failCount === 0;
    const validationStatus = allPassed ? 'passed' : 'failed';
    
    // Mark batch as validated
    await prisma.batch.update({
      where: { id: batchId },
      data: { 
        validation_2: allPassed,
        validation_2_status: validationStatus,
      },
    });

    await markPreviousValidationErrorsDedupedForOrderBatch(batchId, batch.user.id);
    
    console.log(`[Validation 2] Batch ${batchId} completed: ${successCount} passed, ${failCount} failed - Overall: ${allPassed ? 'PASSED' : 'FAILED'}`);
    
    return {
      batchId,
      totalOrders: orders.length,
      successCount,
      failCount,
    };
  } catch (error) {
    console.error(`[Validation 2] Error processing batch ${batchId}:`, error);
    throw error;
  }
};

/**
 * Process Validation 2 for execution batch (Level 2 validation)
 * @param {number} batchId - The batch ID to validate
 */
const processExecutionValidation2ForBatch = async (batchId, batch = null) => {
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
        console.log(`[Validation 2] Batch ${batchId} not found`);
        return;
      }
    }

    // Get client's execution validation_2 schema
    if (!batch.user.clientId) {
      console.log(`[Validation 2] User ${batch.userId} has no associated client`);
      await prisma.batch.update({ where: { id: batchId }, data: { validation_2: true } });
      return;
    }

    const client = await prisma.client.findUnique({
      where: { id: batch.user.clientId },
      select: { exe_validation_2: true },
    });

    if (!client || !client.exe_validation_2) {
      console.log(`[Validation 2] Client has no execution validation_2 schema configured`);
      await prisma.batch.update({ where: { id: batchId }, data: { validation_2: true } });
      return;
    }

    // Get all executions for this batch
    const executions = await prisma.execution.findMany({ where: { batchId } });
    console.log(`[Validation 2] Validating ${executions.length} executions for batch ${batchId}`);

    let successCount = 0;
    let failCount = 0;
    const failed = [];

    for (const exe of executions) {
      let result = validateExecution(exe, client.exe_validation_2);
      // Apply Level-2 rules for executions
      const ruleErrors = evaluateLevel2Rules(exe, client.exe_validation_2);
      if (ruleErrors.length > 0) {
        result = {
          success: false,
          errors: [...(result.errors || []), ...ruleErrors]
        };
      }

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
            // Determine validation code based on error message patterns
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
              validationLevel: 2,  // Validation 2
              field: error.field || 'unknown',
              message: error.message || 'Validation 2 failed',
              code: error.code || 'validation_2_error',
              batchId: batchId,
              executionId: exe.id,
              is_deduped: 0,
              is_validated: 0,
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
      ? JSON.stringify({ type: 'execution_validation_2', failedExecutions: failed.slice(0, 100), totalFailed: failCount })
      : null;

    const validationStatus = allPassed ? 'passed' : 'failed';
    await prisma.batch.update({
      where: { id: batchId },
      data: {
        validation_2: allPassed,
        validation_2_status: validationStatus,
        errorLog: errorLog ?? batch.errorLog
      }
    });

    await markPreviousValidationErrorsDedupedForExecutionBatch(batchId, batch.user.id);
    console.log(`[Validation 2] Execution Batch ${batchId} completed: ${successCount} passed, ${failCount} failed - Overall: ${allPassed ? 'PASSED' : 'FAILED'}`);

    return { batchId, totalExecutions: executions.length, successCount, failCount };
  } catch (error) {
    console.error(`[Validation 2] Error processing execution batch ${batchId}:`, error);
    throw error;
  }
};

// ===============================
// Level-3 processors (copy of Level-2 logic with updated flags)
// ===============================

/**
 * Process Validation 3 for order batch (Level 3 validation)
 */
const processValidation3ForBatch = async (batchId) => {
  try {
    console.log(`[Validation 3] Processing batch ${batchId}`);
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { user: { select: { id: true, clientId: true } } },
    });
    if (!batch) return console.log(`[Validation 3] Batch ${batchId} not found`);

    // require previous level passed
    if (batch.validation_2_status !== 'passed') {
      return console.log(`[Validation 3] Batch ${batchId} - validation_2_status not 'passed', skipping`);
    }
    if (batch.validation_3 !== null) return console.log(`[Validation 3] Batch ${batchId} already validated`);
    if (batch.fileType === 'execution') return await processExecutionValidation3ForBatch(batchId, batch);

    // no client association
    if (!batch.user.clientId) {
      await prisma.batch.update({ where: { id: batchId }, data: { validation_3: true } });
      return;
    }
    const client = await prisma.client.findUnique({ where: { id: batch.user.clientId }, select: { validation_3: true } });
    if (!client || !client.validation_3) {
      await prisma.batch.update({ where: { id: batchId }, data: { validation_3: true } });
      return;
    }

    const orders = await prisma.order.findMany({ where: { batchId } });
    let passCnt = 0, failCnt = 0;
    for (const order of orders) {
      let result = validateOrder(order, client.validation_3);
      const ruleErrors = evaluateLevel2Rules(order, client.validation_3) || [];
      if (ruleErrors.length) {
        result = { success: false, errors: [...(result.errors||[]), ...ruleErrors] };
      }
      const validation = await prisma.validation.create({ data: { orderId: order.id, batchId, success: result.success, validatedAt: new Date() } });
      if (!result.success && result.errors?.length) {
        await prisma.validationError.createMany({ data: result.errors.map(err=>({ validationId: validation.id, validationLevel: 3, field: err.field||'unknown', message: err.message||'Validation 3 failed', code: err.code||'validation_3_error', batchId, orderId: order.id, validationCode: getValidationCode('CTX_INVALID_COMBINATION').code, is_deduped:0, is_validated:0 })) });
      }
      result.success? passCnt++ : failCnt++;
    }
    const allPassed = failCnt === 0;
    await prisma.batch.update({ where:{id:batchId}, data:{ validation_3: allPassed, validation_3_status: allPassed?'passed':'failed' } });
    // Persist business classifications (order-level)
    await classifyOrdersForBatch(batchId);
    console.log(`[Validation 3] Batch ${batchId} completed: ${passCnt} passed, ${failCnt} failed`);
  } catch (e) { console.error(`[Validation 3] Error batch ${batchId}`, e); throw e; }
};

/** Process Validation 3 for execution batch */
const processExecutionValidation3ForBatch = async (batchId, batch=null) => {
  try {
    if (!batch) batch = await prisma.batch.findUnique({ where:{id:batchId}, include:{user:{select:{id:true,clientId:true}}}});
    if (!batch) return console.log(`[Validation 3] Execution batch ${batchId} not found`);
    if (batch.validation_2_status !== 'passed') return console.log(`[Validation 3] Execution batch ${batchId} – validation_2_status not 'passed', skip`);
    if (batch.validation_3 !== null) return console.log(`[Validation 3] Execution batch ${batchId} already validated`);

    if (!batch.user.clientId) { await prisma.batch.update({ where:{id:batchId}, data:{ validation_3:true } }); return; }
    const client = await prisma.client.findUnique({ where:{id:batch.user.clientId}, select:{ exe_validation_3:true } });
    if (!client || !client.exe_validation_3) { await prisma.batch.update({ where:{id:batchId}, data:{ validation_3:true } }); return; }

    const executions = await prisma.execution.findMany({ where:{ batchId } });
    let pass=0, fail=0;
    for (const exe of executions) {
      let result = validateExecution(exe, client.exe_validation_3);
      // Apply Level-2 rules for executions
      const ruleErrors = evaluateLevel2Rules(exe, client.exe_validation_3);
      if (ruleErrors.length > 0) {
        result = { success: false, errors: [...(result.errors||[]), ...ruleErrors] };
      }
      const validation = await prisma.validation.create({ data:{ executionId: exe.id, batchId, success: result.success, validatedAt:new Date() } });
      if (!result.success && result.errors?.length) {
        await prisma.validationError.createMany({ data: result.errors.map(err=>({ validationId:validation.id, validationLevel: 3, field: err.field||'unknown', message: err.message||'Validation 3 failed', code: err.code||'validation_3_error', batchId, executionId: exe.id, validationCode: getValidationCode('CTX_INVALID_COMBINATION').code, is_deduped:0, is_validated:0 })) });
      }
      result.success? pass++ : fail++;
    }
    const allPassed = fail===0;
    await prisma.batch.update({ where:{id:batchId}, data:{ validation_3: allPassed, validation_3_status: allPassed?'passed':'failed' } });
    // Persist business classifications (execution-level)
    await classifyExecutionsForBatch(batchId);
    console.log(`[Validation 3] Execution Batch ${batchId} completed: ${pass} passed, ${fail} failed`);
  } catch(err){ console.error(`[Validation 3] Error execution batch ${batchId}`, err); throw err; }
};

module.exports = {
  validateOrder,
  validateExecution,
  processBatchValidation,
  processExecutionBatchValidation,
  processValidation2ForBatch,
  processExecutionValidation2ForBatch,
  processValidation3ForBatch,
  processExecutionValidation3ForBatch,
};
