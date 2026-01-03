const prisma = require("../config/db");
const { getValidationCode } = require("../constants/validationCodes");
const defaultValidation3OrderConditions = require("../config/validation3OrderConditions");
const defaultValidation3ExecutionConditions = require("../config/validation3ExecutionConditions");
const {
  classifyOrdersForBatch,
  classifyExecutionsForBatch,
} = require("./businessClassificationService");
const { validateOrder, validateExecution } = require("./validationLevel1Service");
const { evaluateLevel2Rules } = require("./validationLevel2Service");
const {
  buildEffectiveLevelSchemaPreferDefaultConditions,
} = require("./validationSchemaService");

const toMs = (v) => {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.getTime();
  const s = String(v).trim();
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
};

const evaluateOrderValidation3ReferenceRules = (order, schema, ctx) => {
  const errors = [];
  if (!schema || typeof schema !== "object") return errors;
  const exchangeDestinations = ctx?.exchangeDestinations;
  const validFirmIds = ctx?.validFirmIds;

  const addRuleError = (field) => {
    const cond = schema?.[field]?.condition;
    errors.push({
      field,
      message: `${field} does not satisfy rule: ${cond ?? ""}`.trim(),
    });
  };

  if (schema.orderDestination?.enabled) {
    const actionStr = String(order?.orderAction ?? "").trim();
    const actionNum = Number.parseInt(actionStr, 10);
    const isExternalRouteAction =
      actionNum === 5 ||
      actionNum === 6 ||
      actionStr === "5" ||
      actionStr === "6";

    // Apply this reference-data validation only for Order_Action in (5,6)
    if (isExternalRouteAction) {
      const dest = String(order?.orderDestination ?? "").trim();
      if (!dest) {
        addRuleError("orderDestination");
      } else if (
        exchangeDestinations instanceof Set &&
        !exchangeDestinations.has(dest)
      ) {
        addRuleError("orderDestination");
      }
    }
  }

  if (schema.orderRoutedOrderId?.enabled) {
    const dest = String(order?.orderDestination ?? "").trim();
    const routedId = String(order?.orderRoutedOrderId ?? "").trim();
    const isExchange =
      exchangeDestinations instanceof Set &&
      dest &&
      exchangeDestinations.has(dest);
    if (isExchange && !routedId) {
      addRuleError("orderRoutedOrderId");
    }
  }

  if (schema.orderExecutingEntity?.enabled) {
    const v = order?.orderExecutingEntity;
    const n =
      typeof v === "number" ? v : Number.parseInt(String(v ?? "").trim(), 10);
    if (!Number.isFinite(n)) {
      addRuleError("orderExecutingEntity");
    } else if (
      validFirmIds instanceof Set &&
      validFirmIds.size > 0 &&
      !validFirmIds.has(n)
    ) {
      addRuleError("orderExecutingEntity");
    }
  }

  if (schema.orderBookingEntity?.enabled) {
    const v = order?.orderBookingEntity;
    const n =
      typeof v === "number" ? v : Number.parseInt(String(v ?? "").trim(), 10);
    if (!Number.isFinite(n)) {
      addRuleError("orderBookingEntity");
    } else if (
      validFirmIds instanceof Set &&
      validFirmIds.size > 0 &&
      !validFirmIds.has(n)
    ) {
      addRuleError("orderBookingEntity");
    }
  }

  if (schema.orderStartTime?.enabled) {
    const start = toMs(order?.orderStartTime);
    const evt = toMs(order?.orderEventTime);
    if (start !== null && evt !== null && start < evt) {
      addRuleError("orderStartTime");
    }
  }

  return errors;
};

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
    if (batch.validation_2_status !== "passed") {
      return console.log(
        `[Validation 3] Batch ${batchId} - validation_2_status not 'passed', skipping`
      );
    }
    if (batch.validation_3 !== null)
      return console.log(`[Validation 3] Batch ${batchId} already validated`);
    if (batch.fileType === "execution")
      return await processExecutionValidation3ForBatch(batchId, batch);

    // no client association
    if (!batch.user.clientId) {
      await prisma.batch.update({
        where: { id: batchId },
        data: { validation_3: true, validation_3_status: "passed" },
      });
      return;
    }
    const client = await prisma.client.findUnique({
      where: { id: batch.user.clientId },
      select: { validation_3: true },
    });
    if (!client || !client.validation_3) {
      await prisma.batch.update({
        where: { id: batchId },
        data: { validation_3: true, validation_3_status: "passed" },
      });
      return;
    }

    const effectiveSchema = buildEffectiveLevelSchemaPreferDefaultConditions(
      defaultValidation3OrderConditions,
      client.validation_3
    );

    const orders = await prisma.order.findMany({ where: { batchId } });
    const exchangeRows = await prisma.uSBrokerDealer.findMany({
      where: {
        membershipType: "Exchange",
        clientId: { not: null },
      },
      select: { clientId: true },
    });
    const exchangeDestinations = new Set(
      (exchangeRows || [])
        .map((r) => String(r.clientId ?? "").trim())
        .filter(Boolean)
    );

    const firmIdsToCheck = new Set();
    for (const o of orders) {
      const exec =
        typeof o.orderExecutingEntity === "number"
          ? o.orderExecutingEntity
          : Number.parseInt(String(o.orderExecutingEntity ?? "").trim(), 10);
      const book =
        typeof o.orderBookingEntity === "number"
          ? o.orderBookingEntity
          : Number.parseInt(String(o.orderBookingEntity ?? "").trim(), 10);
      if (Number.isFinite(exec)) firmIdsToCheck.add(exec);
      if (Number.isFinite(book)) firmIdsToCheck.add(book);
    }
    const firmRows = firmIdsToCheck.size
      ? await prisma.firmEntity.findMany({
          where: {
            clientRefId: batch.user.clientId,
            firmId: { in: Array.from(firmIdsToCheck) },
            activeFlag: true,
          },
          select: { firmId: true },
        })
      : [];
    const validFirmIds = new Set((firmRows || []).map((r) => r.firmId));

    let passCnt = 0,
      failCnt = 0;
    for (const order of orders) {
      let result = validateOrder(order, effectiveSchema);
      const ruleErrors = evaluateLevel2Rules(order, effectiveSchema) || [];
      const refErrors = evaluateOrderValidation3ReferenceRules(order, effectiveSchema, {
        exchangeDestinations,
        validFirmIds,
      });
      const allErrors = [...(result.errors || []), ...ruleErrors, ...refErrors];
      if (allErrors.length) {
        result = { success: false, errors: allErrors };
      }
      const validation = await prisma.validation.create({
        data: {
          orderId: order.id,
          batchId,
          success: result.success,
          validatedAt: new Date(),
        },
      });
      if (!result.success && result.errors?.length) {
        await prisma.validationError.createMany({
          data: result.errors.map((err) => ({
            validationId: validation.id,
            validationLevel: 3,
            field: err.field || "unknown",
            message: err.message || "Validation 3 failed",
            code: err.code || "validation_3_error",
            batchId,
            orderId: order.id,
            validationCode: getValidationCode("CTX_INVALID_COMBINATION").code,
            is_deduped: 0,
            is_validated: 0,
          })),
        });
      }
      result.success ? passCnt++ : failCnt++;
    }
    const allPassed = failCnt === 0;
    await prisma.batch.update({
      where: { id: batchId },
      data: {
        validation_3: allPassed,
        validation_3_status: allPassed ? "passed" : "failed",
      },
    });
    // Persist business classifications (order-level)
    await classifyOrdersForBatch(batchId);
    console.log(
      `[Validation 3] Batch ${batchId} completed: ${passCnt} passed, ${failCnt} failed`
    );
  } catch (e) {
    console.error(`[Validation 3] Error batch ${batchId}`, e);
    throw e;
  }
};

/** Process Validation 3 for execution batch */
const processExecutionValidation3ForBatch = async (batchId, batch = null) => {
  try {
    if (!batch)
      batch = await prisma.batch.findUnique({
        where: { id: batchId },
        include: { user: { select: { id: true, clientId: true } } },
      });
    if (!batch)
      return console.log(`[Validation 3] Execution batch ${batchId} not found`);
    if (batch.validation_2_status !== "passed")
      return console.log(
        `[Validation 3] Execution batch ${batchId} – validation_2_status not 'passed', skip`
      );
    if (batch.validation_3 !== null)
      return console.log(`[Validation 3] Execution batch ${batchId} already validated`);

    if (!batch.user.clientId) {
      await prisma.batch.update({
        where: { id: batchId },
        data: { validation_3: true, validation_3_status: "passed" },
      });
      return;
    }
    const client = await prisma.client.findUnique({
      where: { id: batch.user.clientId },
      select: { exe_validation_3: true },
    });
    if (!client || !client.exe_validation_3) {
      await prisma.batch.update({
        where: { id: batchId },
        data: { validation_3: true, validation_3_status: "passed" },
      });
      return;
    }

    const effectiveExeSchema = buildEffectiveLevelSchemaPreferDefaultConditions(
      defaultValidation3ExecutionConditions,
      client.exe_validation_3
    );

    const executions = await prisma.execution.findMany({ where: { batchId } });
    let pass = 0,
      fail = 0;
    for (const exe of executions) {
      let result = validateExecution(exe, effectiveExeSchema);
      // Apply Level-2 rules for executions
      const ruleErrors = evaluateLevel2Rules(exe, effectiveExeSchema);
      if (ruleErrors.length > 0) {
        result = {
          success: false,
          errors: [...(result.errors || []), ...ruleErrors],
        };
      }
      const validation = await prisma.validation.create({
        data: {
          executionId: exe.id,
          batchId,
          success: result.success,
          validatedAt: new Date(),
        },
      });
      if (!result.success && result.errors?.length) {
        await prisma.validationError.createMany({
          data: result.errors.map((err) => ({
            validationId: validation.id,
            validationLevel: 3,
            field: err.field || "unknown",
            message: err.message || "Validation 3 failed",
            code: err.code || "validation_3_error",
            batchId,
            executionId: exe.id,
            validationCode: getValidationCode("CTX_INVALID_COMBINATION").code,
            is_deduped: 0,
            is_validated: 0,
          })),
        });
      }
      result.success ? pass++ : fail++;
    }
    const allPassed = fail === 0;
    await prisma.batch.update({
      where: { id: batchId },
      data: {
        validation_3: allPassed,
        validation_3_status: allPassed ? "passed" : "failed",
      },
    });
    // Persist business classifications (execution-level)
    await classifyExecutionsForBatch(batchId);
    console.log(
      `[Validation 3] Execution Batch ${batchId} completed: ${pass} passed, ${fail} failed`
    );
  } catch (err) {
    console.error(`[Validation 3] Error execution batch ${batchId}`, err);
    throw err;
  }
};

module.exports = {
  processValidation3ForBatch,
  processExecutionValidation3ForBatch,
};
