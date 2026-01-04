const prisma = require("../config/db");
const { getValidationCode } = require("../constants/validationCodes");
const defaultValidation3OrderConditions = require("../config/validation3OrderConditions");
const defaultValidation3ExecutionConditions = require("../config/validation3ExecutionConditions");
const {
  classifyOrdersForBatch,
  classifyExecutionsForBatch,
} = require("./businessClassificationService");
const {
  buildEffectiveLevelSchemaPreferDefaultConditions,
} = require("./validationSchemaService");

const hasValue = (v) => {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim() !== "";
  return true;
};

const toStr = (v) => {
  if (v === null || v === undefined) return "";
  return String(v).trim();
};

const toMs = (v) => {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.getTime();
  const s = String(v).trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    if (s.length > 13) return Math.floor(n / 1e6);
    return n;
  }
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
};

const evaluateOrderValidation3ReferenceRules = (order, schema, ctx) => {
  const errors = [];
  if (!schema || typeof schema !== "object") return errors;
  const brokerDealerDestinations = ctx?.brokerDealerDestinations;
  const validFirmIds = ctx?.validFirmIds;
  const validAccountNos = ctx?.validAccountNos;
  const validCurrencyCodes = ctx?.validCurrencyCodes;
  const validInstrumentIds = ctx?.validInstrumentIds;

  const normalizeDestinationKey = (v) => toStr(v).toUpperCase();

  const isExchangeDestination = (dest) => {
    const key = normalizeDestinationKey(dest);
    if (!hasValue(key)) return false;
    if (!(brokerDealerDestinations instanceof Map)) return false;
    const info = brokerDealerDestinations.get(key);
    return !!info?.hasExchange;
  };

  const isKnownDestination = (dest) => {
    const key = normalizeDestinationKey(dest);
    if (!hasValue(key)) return false;
    if (!(brokerDealerDestinations instanceof Map)) return false;
    return brokerDealerDestinations.has(key);
  };

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
      actionStr === "6" ||
      actionStr.toLowerCase() === "order external route" ||
      actionStr.toLowerCase() === "order external route acknowledged";

    // Apply this reference-data validation only for Order_Action in (5,6)
    if (isExternalRouteAction) {
      const dest = toStr(order?.orderDestination);
      if (!hasValue(dest)) {
        addRuleError("orderDestination");
      } else {
        // Step 1: Order_Destination must match a US Broker Dealer.ClientID
        if (!isKnownDestination(dest)) {
          addRuleError("orderDestination");
        } else if (!isExchangeDestination(dest)) {
          // Step 2: matching record(s) must have Membership Type = 'Exchange'
          addRuleError("orderDestination");
        }
      }
    }
  }

  if (schema.orderRoutedOrderId?.enabled) {
    const dest = toStr(order?.orderDestination);
    const routedId = toStr(order?.orderRoutedOrderId);
    const isExchange = hasValue(dest) && isExchangeDestination(dest);
    if (isExchange && !hasValue(routedId)) {
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
      !validFirmIds.has(n)
    ) {
      addRuleError("orderBookingEntity");
    }
  }

  if (schema.orderPositionAccount?.enabled) {
    const acct = toStr(order?.orderPositionAccount);
    if (!hasValue(acct)) {
      addRuleError("orderPositionAccount");
    } else if (
      validAccountNos instanceof Set &&
      !validAccountNos.has(acct)
    ) {
      addRuleError("orderPositionAccount");
    }
  }

  if (schema.orderCurrencyId?.enabled) {
    const code = toStr(order?.orderCurrencyId);
    if (!hasValue(code)) {
      addRuleError("orderCurrencyId");
    } else if (
      validCurrencyCodes instanceof Set &&
      !validCurrencyCodes.has(code)
    ) {
      addRuleError("orderCurrencyId");
    }
  }

  if (schema.orderInstrumentId?.enabled) {
    const inst = toStr(order?.orderInstrumentId);
    if (!hasValue(inst)) {
      addRuleError("orderInstrumentId");
    } else if (
      validInstrumentIds instanceof Set &&
      !validInstrumentIds.has(inst)
    ) {
      addRuleError("orderInstrumentId");
    }
  }

  if (schema.orderExecutingAccount?.enabled) {
    const acct = toStr(order?.orderExecutingAccount);
    if (hasValue(acct)) {
      if (
        validAccountNos instanceof Set &&
        !validAccountNos.has(acct)
      ) {
        addRuleError("orderExecutingAccount");
      }
    }
  }

  if (schema.orderClearingAccount?.enabled) {
    const acct = toStr(order?.orderClearingAccount);
    if (hasValue(acct)) {
      if (
        validAccountNos instanceof Set &&
        !validAccountNos.has(acct)
      ) {
        addRuleError("orderClearingAccount");
      }
    }
  }

  if (schema.orderStartTime?.enabled) {
    const start = toMs(order?.orderStartTime);
    const evt = toMs(order?.orderEventTime);
    if (start !== null && evt !== null && start < evt) {
      addRuleError("orderStartTime");
    }
  }

  if (schema.orderIdSession?.enabled) {
    const actionStr = String(order?.orderAction ?? "").trim();
    const actionNum = Number.parseInt(actionStr, 10);
    const isExternalRouteAction =
      actionNum === 5 ||
      actionNum === 6 ||
      actionStr === "5" ||
      actionStr === "6" ||
      actionStr.toLowerCase() === "order external route" ||
      actionStr.toLowerCase() === "order external route acknowledged";
    const dest = toStr(order?.orderDestination);
    const isExchange = hasValue(dest) && isExchangeDestination(dest);
    if (isExternalRouteAction && isExchange) {
      const session = toStr(order?.orderIdSession);
      if (!hasValue(session)) {
        addRuleError("orderIdSession");
      }
    }
  }

  return errors;
};

const evaluateExecutionValidation3ReferenceRules = (exe, schema, ctx) => {
  const errors = [];
  if (!schema || typeof schema !== "object") return errors;
  const validFirmIds = ctx?.validFirmIds;
  const validAccountNos = ctx?.validAccountNos;
  const validCurrencyCodes = ctx?.validCurrencyCodes;
  const validInstrumentIds = ctx?.validInstrumentIds;
  const brokerDealerDestinations = ctx?.brokerDealerDestinations;

  const normalizeDestinationKey = (v) => toStr(v).toUpperCase();

  const isExchangeDestination = (dest) => {
    const key = normalizeDestinationKey(dest);
    if (!hasValue(key)) return false;
    if (!(brokerDealerDestinations instanceof Map)) return false;
    const info = brokerDealerDestinations.get(key);
    return !!info?.hasExchange;
  };

  const isKnownDestination = (dest) => {
    const key = normalizeDestinationKey(dest);
    if (!hasValue(key)) return false;
    if (!(brokerDealerDestinations instanceof Map)) return false;
    return brokerDealerDestinations.has(key);
  };

  const addRuleError = (field) => {
    const cond = schema?.[field]?.condition;
    errors.push({
      field,
      message: `${field} does not satisfy rule: ${cond ?? ""}`.trim(),
    });
  };

  if (schema.executionLastMarket?.enabled) {
    const mic = toStr(exe?.executionLastMarket);
    if (!hasValue(mic)) {
      addRuleError("executionLastMarket");
    } else if (!isKnownDestination(mic)) {
      addRuleError("executionLastMarket");
    }
  }

  if (schema.externalExecutionId?.enabled) {
    const lastMarket = toStr(exe?.executionLastMarket);
    if (hasValue(lastMarket) && isKnownDestination(lastMarket) && isExchangeDestination(lastMarket)) {
      const extId = toStr(exe?.externalExecutionId);
      if (!hasValue(extId)) {
        addRuleError("externalExecutionId");
      }
    }
  }

  if (schema.executionAccount?.enabled) {
    const acct = toStr(exe?.executionAccount);
    if (!hasValue(acct)) {
      addRuleError("executionAccount");
    } else if (
      validAccountNos instanceof Set &&
      !validAccountNos.has(acct)
    ) {
      addRuleError("executionAccount");
    }
  }

  if (schema.executionBookingAccount?.enabled) {
    const acct = toStr(exe?.executionBookingAccount);
    if (hasValue(acct)) {
      if (
        validAccountNos instanceof Set &&
        !validAccountNos.has(acct)
      ) {
        addRuleError("executionBookingAccount");
      }
    }
  }

  if (schema.executionBookingEntity?.enabled) {
    const v = exe?.executionBookingEntity;
    const n =
      typeof v === "number" ? v : Number.parseInt(String(v ?? "").trim(), 10);
    if (!Number.isFinite(n)) {
      addRuleError("executionBookingEntity");
    } else if (
      validFirmIds instanceof Set &&
      !validFirmIds.has(n)
    ) {
      addRuleError("executionBookingEntity");
    }
  }

  if (schema.executionTradingEntity?.enabled) {
    const v = exe?.executionTradingEntity;
    const n =
      typeof v === "number" ? v : Number.parseInt(String(v ?? "").trim(), 10);
    if (!Number.isFinite(n)) {
      addRuleError("executionTradingEntity");
    } else if (validFirmIds instanceof Set && !validFirmIds.has(n)) {
      addRuleError("executionTradingEntity");
    }
  }

  if (schema.executionExecutingEntity?.enabled) {
    const v = exe?.executionExecutingEntity;
    const n =
      typeof v === "number" ? v : Number.parseInt(String(v ?? "").trim(), 10);
    if (!Number.isFinite(n)) {
      addRuleError("executionExecutingEntity");
    } else if (
      validFirmIds instanceof Set &&
      !validFirmIds.has(n)
    ) {
      addRuleError("executionExecutingEntity");
    }
  }

  if (schema.executionInstrumentId?.enabled) {
    const inst = toStr(exe?.executionInstrumentId);
    if (!hasValue(inst)) {
      addRuleError("executionInstrumentId");
    } else if (validInstrumentIds instanceof Set && !validInstrumentIds.has(inst)) {
      addRuleError("executionInstrumentId");
    }
  }

  if (schema.executionContraBroker?.enabled) {
    const contra = toStr(exe?.executionContraBroker);
    if (hasValue(contra) && !isKnownDestination(contra)) {
      addRuleError("executionContraBroker");
    }
  }

  if (schema.executionCurrencyId?.enabled) {
    const code = toStr(exe?.executionCurrencyId);
    if (!hasValue(code)) {
      addRuleError("executionCurrencyId");
    } else if (
      validCurrencyCodes instanceof Set &&
      !validCurrencyCodes.has(code)
    ) {
      addRuleError("executionCurrencyId");
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
    const brokerDealerRows = await prisma.uSBrokerDealer.findMany({
      where: {
        clientRefId: batch.user.clientId,
        activeFlag: true,
        clientId: { not: null },
      },
      select: { clientId: true, membershipType: true },
    });
    const brokerDealerDestinations = new Map();
    for (const row of brokerDealerRows || []) {
      const key = String(row.clientId ?? "").trim().toUpperCase();
      if (!key) continue;
      const membership = String(row.membershipType ?? "").trim().toLowerCase();
      const prev = brokerDealerDestinations.get(key) || { hasExchange: false };
      brokerDealerDestinations.set(key, {
        hasExchange: prev.hasExchange || membership === "exchange",
      });
    }

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

    const accountNosToCheck = new Set();
    const currencyCodesToCheck = new Set();
    const instrumentIdsToCheck = new Set();
    for (const o of orders) {
      const pos = toStr(o.orderPositionAccount);
      const execAcct = toStr(o.orderExecutingAccount);
      const clrAcct = toStr(o.orderClearingAccount);
      const ccy = toStr(o.orderCurrencyId);
      const inst = toStr(o.orderInstrumentId);
      if (hasValue(pos)) accountNosToCheck.add(pos);
      if (hasValue(execAcct)) accountNosToCheck.add(execAcct);
      if (hasValue(clrAcct)) accountNosToCheck.add(clrAcct);
      if (hasValue(ccy)) currencyCodesToCheck.add(ccy);
      if (hasValue(inst)) instrumentIdsToCheck.add(inst);
    }

    const accountRows = accountNosToCheck.size
      ? await prisma.accountMapping.findMany({
          where: {
            clientRefId: batch.user.clientId,
            accountNo: { in: Array.from(accountNosToCheck) },
          },
          select: { accountNo: true },
        })
      : [];
    const validAccountNos = new Set(
      (accountRows || [])
        .map((r) => toStr(r.accountNo))
        .filter((x) => hasValue(x))
    );

    const currencyRows = currencyCodesToCheck.size
      ? await prisma.currencyCode.findMany({
          where: {
            clientRefId: batch.user.clientId,
            code: { in: Array.from(currencyCodesToCheck) },
          },
          select: { code: true },
        })
      : [];
    const validCurrencyCodes = new Set(
      (currencyRows || [])
        .map((r) => toStr(r.code))
        .filter((x) => hasValue(x))
    );

    const instrumentRows = instrumentIdsToCheck.size
      ? await prisma.instrumentsMapping.findMany({
          where: {
            clientRefId: batch.user.clientId,
            instrumentId: { in: Array.from(instrumentIdsToCheck) },
          },
          select: { instrumentId: true },
        })
      : [];
    const validInstrumentIds = new Set(
      (instrumentRows || [])
        .map((r) => toStr(r.instrumentId))
        .filter((x) => hasValue(x))
    );

    let passCnt = 0,
      failCnt = 0;
    for (const order of orders) {
      let result = { success: true, errors: [] };
      const ruleErrors = [];
      const refErrors = evaluateOrderValidation3ReferenceRules(order, effectiveSchema, {
        brokerDealerDestinations,
        validFirmIds,
        validAccountNos,
        validCurrencyCodes,
        validInstrumentIds,
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

    const firmIdsToCheck = new Set();
    const accountNosToCheck = new Set();
    const currencyCodesToCheck = new Set();
    const instrumentIdsToCheck = new Set();
    for (const e of executions) {
      const execEnt =
        typeof e.executionExecutingEntity === "number"
          ? e.executionExecutingEntity
          : Number.parseInt(String(e.executionExecutingEntity ?? "").trim(), 10);
      const bookEnt =
        typeof e.executionBookingEntity === "number"
          ? e.executionBookingEntity
          : Number.parseInt(String(e.executionBookingEntity ?? "").trim(), 10);
      const tradeEnt =
        typeof e.executionTradingEntity === "number"
          ? e.executionTradingEntity
          : Number.parseInt(String(e.executionTradingEntity ?? "").trim(), 10);
      if (Number.isFinite(execEnt)) firmIdsToCheck.add(execEnt);
      if (Number.isFinite(bookEnt)) firmIdsToCheck.add(bookEnt);
      if (Number.isFinite(tradeEnt)) firmIdsToCheck.add(tradeEnt);

      const acct = toStr(e.executionAccount);
      const bookAcct = toStr(e.executionBookingAccount);
      const ccy = toStr(e.executionCurrencyId);
      if (hasValue(acct)) accountNosToCheck.add(acct);
      if (hasValue(bookAcct)) accountNosToCheck.add(bookAcct);
      if (hasValue(ccy)) currencyCodesToCheck.add(ccy);

      const inst = toStr(e.executionInstrumentId);
      if (hasValue(inst)) instrumentIdsToCheck.add(inst);
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

    const accountRows = accountNosToCheck.size
      ? await prisma.accountMapping.findMany({
          where: {
            clientRefId: batch.user.clientId,
            accountNo: { in: Array.from(accountNosToCheck) },
          },
          select: { accountNo: true },
        })
      : [];
    const validAccountNos = new Set(
      (accountRows || [])
        .map((r) => toStr(r.accountNo))
        .filter((x) => hasValue(x))
    );

    const currencyRows = currencyCodesToCheck.size
      ? await prisma.currencyCode.findMany({
          where: {
            clientRefId: batch.user.clientId,
            code: { in: Array.from(currencyCodesToCheck) },
          },
          select: { code: true },
        })
      : [];
    const validCurrencyCodes = new Set(
      (currencyRows || [])
        .map((r) => toStr(r.code))
        .filter((x) => hasValue(x))
    );

    const instrumentRows = instrumentIdsToCheck.size
      ? await prisma.instrumentsMapping.findMany({
          where: {
            clientRefId: batch.user.clientId,
            instrumentId: { in: Array.from(instrumentIdsToCheck) },
          },
          select: { instrumentId: true },
        })
      : [];
    const validInstrumentIds = new Set(
      (instrumentRows || [])
        .map((r) => toStr(r.instrumentId))
        .filter((x) => hasValue(x))
    );

    const brokerDealerRows = await prisma.uSBrokerDealer.findMany({
      where: {
        clientRefId: batch.user.clientId,
        activeFlag: true,
        clientId: { not: null },
      },
      select: { clientId: true, membershipType: true },
    });
    const brokerDealerDestinations = new Map();
    for (const row of brokerDealerRows || []) {
      const key = String(row.clientId ?? "").trim().toUpperCase();
      if (!key) continue;
      const membership = String(row.membershipType ?? "").trim().toLowerCase();
      const prev = brokerDealerDestinations.get(key) || { hasExchange: false };
      brokerDealerDestinations.set(key, {
        hasExchange: prev.hasExchange || membership === "exchange",
      });
    }
    let pass = 0,
      fail = 0;
    for (const exe of executions) {
      let result = { success: true, errors: [] };
      const ruleErrors = [];
      const refErrors = evaluateExecutionValidation3ReferenceRules(exe, effectiveExeSchema, {
        validFirmIds,
        validAccountNos,
        validCurrencyCodes,
        validInstrumentIds,
        brokerDealerDestinations,
      });
      const allErrors = [...(result.errors || []), ...(ruleErrors || []), ...(refErrors || [])];
      if (allErrors.length > 0) {
        result = { success: false, errors: allErrors };
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
