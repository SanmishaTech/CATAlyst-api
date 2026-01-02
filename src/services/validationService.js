const prisma = require("../config/db");
const { z, ZodIssueCode } = require("zod");
const { getValidationCode } = require("../constants/validationCodes");
const defaultValidation2OrderConditions = require("../config/validation2OrderConditions");
const defaultValidation2ExecutionConditions = require("../config/validation2ExecutionConditions");
const defaultValidation3OrderConditions = require("../config/validation3OrderConditions");
const defaultValidation3ExecutionConditions = require("../config/validation3ExecutionConditions");
const {
  classifyOrdersForBatch,
  classifyExecutionsForBatch,
} = require("./businessClassificationService");

const buildEffectiveLevel2Schema = (defaults, clientSchema) => {
  const defaultsObj = defaults && typeof defaults === "object" ? defaults : {};
  const clientObj = clientSchema && typeof clientSchema === "object" ? clientSchema : {};
  const effective = {};

  for (const [field, defaultVal] of Object.entries(defaultsObj)) {
    const clientVal = clientObj[field];
    if (defaultVal && typeof defaultVal === "object") {
      effective[field] = {
        ...defaultVal,
        ...(clientVal && typeof clientVal === "object" ? clientVal : {}),
      };
      // Preserve default condition if client didn't supply one.
      // (Fixes stale configs where DB only stores enabled toggles but not updated condition strings.)
      const clientCondition =
        clientVal && typeof clientVal === "object" ? clientVal.condition : undefined;
      if (
        defaultVal.condition &&
        (!clientVal ||
          typeof clientVal !== "object" ||
          clientCondition === undefined ||
          clientCondition === null ||
          String(clientCondition).trim() === "" ||
          String(clientCondition).trim() === "-")
      ) {
        effective[field].condition = defaultVal.condition;
      }
    } else {
      effective[field] = clientVal !== undefined ? clientVal : defaultVal;
    }
  }

  for (const [field, val] of Object.entries(clientObj)) {
    if (effective[field] !== undefined) continue;
    effective[field] = val;
  }

  return effective;
};

const buildEffectiveLevelSchemaPreferDefaultConditions = (defaults, clientSchema) => {
  const effective = buildEffectiveLevel2Schema(defaults, clientSchema);
  const defaultsObj = defaults && typeof defaults === "object" ? defaults : {};
  for (const [field, defaultVal] of Object.entries(defaultsObj)) {
    if (!defaultVal || typeof defaultVal !== "object") continue;
    if (!defaultVal.condition) continue;
    if (effective[field] && typeof effective[field] === "object") {
      effective[field].condition = defaultVal.condition;
    }
  }
  return effective;
};

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
    const isExternalRouteAction = actionNum === 5 || actionNum === 6 || actionStr === "5" || actionStr === "6";

    // Apply this reference-data validation only for Order_Action in (5,6)
    if (isExternalRouteAction) {
      const dest = String(order?.orderDestination ?? "").trim();
      if (!dest) {
        addRuleError("orderDestination");
      } else if (exchangeDestinations instanceof Set && !exchangeDestinations.has(dest)) {
        addRuleError("orderDestination");
      }
    }
  }

  if (schema.orderRoutedOrderId?.enabled) {
    const dest = String(order?.orderDestination ?? "").trim();
    const routedId = String(order?.orderRoutedOrderId ?? "").trim();
    const isExchange = exchangeDestinations instanceof Set && dest && exchangeDestinations.has(dest);
    if (isExchange && !routedId) {
      addRuleError("orderRoutedOrderId");
    }
  }

  if (schema.orderExecutingEntity?.enabled) {
    const v = order?.orderExecutingEntity;
    const n = typeof v === "number" ? v : Number.parseInt(String(v ?? "").trim(), 10);
    if (!Number.isFinite(n)) {
      addRuleError("orderExecutingEntity");
    } else if (validFirmIds instanceof Set && validFirmIds.size > 0 && !validFirmIds.has(n)) {
      addRuleError("orderExecutingEntity");
    }
  }

  if (schema.orderBookingEntity?.enabled) {
    const v = order?.orderBookingEntity;
    const n = typeof v === "number" ? v : Number.parseInt(String(v ?? "").trim(), 10);
    if (!Number.isFinite(n)) {
      addRuleError("orderBookingEntity");
    } else if (validFirmIds instanceof Set && validFirmIds.size > 0 && !validFirmIds.has(n)) {
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

    // Normalize inputs so optional fields can be "empty" (null/undefined/blank string)
    // IMPORTANT: For optional fields we must treat `null` as missing. If we apply `.optional()`
    // outside `z.preprocess`, Zod checks the ORIGINAL input (null) and does not short-circuit,
    // causing a required_error after preprocess converts null -> undefined.
    const emptyToUndefined = (value, nullable = false) => {
      if (value === undefined) return undefined;
      if (value === null) return nullable ? null : undefined;
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed === "") return undefined;
        return trimmed;
      }
      return value;
    };

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

      // Handle different field types
      switch (fieldConfig.type) {
        case "string": {
          let stringSchema = z.string({
            required_error: "required",
            invalid_type_error: "invalid format",
          });

          if (fieldConfig.min !== undefined) {

            stringSchema = stringSchema.min(fieldConfig.min, fieldConfig.minMessage);

          }
          if (fieldConfig.max !== undefined) {
            stringSchema = stringSchema.max(
              fieldConfig.max,
              fieldConfig.maxMessage || "invalid format"
            );
          }
          if (fieldConfig.email) {
            stringSchema = stringSchema.email(
              fieldConfig.emailMessage || "invalid format"
            );
          }
          if (fieldConfig.regex) {
            try {
              stringSchema = stringSchema.regex(
                new RegExp(fieldConfig.regex),
                fieldConfig.regexMessage || "invalid format"
              );
            } catch (e) {
              // ignore invalid regex config
            }
          }

          innerSchema = stringSchema;
          break;
        }

        case "number": {
          let numberSchema = z.number({
            required_error: "required",
            invalid_type_error: "invalid format",
          });
          if (fieldConfig.min !== undefined) {
            numberSchema = numberSchema.min(
              fieldConfig.min,
              fieldConfig.minMessage || "value out of range"
            );
          }
          if (fieldConfig.max !== undefined) {
            numberSchema = numberSchema.max(
              fieldConfig.max,
              fieldConfig.maxMessage || "value out of range"
            );
          }
          if (fieldConfig.int) {
            numberSchema = numberSchema.int(
              fieldConfig.intMessage || "invalid format"
            );
          }

          innerSchema = numberSchema;
          break;
        }

        case "boolean": {
          innerSchema = z.boolean({
            required_error: "required",
            invalid_type_error: "invalid format",
          });
          break;
        }

        case "date": {
          innerSchema = z
            .string({
              required_error: "required",
              invalid_type_error: "invalid format",
            })
            .datetime(fieldConfig.datetimeMessage || "invalid format");
          break;
        }

        case "decimal": {
          const decimalSchema = z
            .string({
              required_error: "required",
              invalid_type_error: "invalid format",
            })
            .superRefine((val, ctx) => {
              const str = String(val).trim();
              if (!/^[+-]?\d+(?:\.\d+)?$/.test(str)) {
                ctx.addIssue({ code: ZodIssueCode.custom, message: "invalid format" });
                return;
              }

              const unsigned = str.replace(/^[+-]/, "");
              const parts = unsigned.split(".");
              const intPart = parts[0] || "0";
              const fracPart = parts[1] || "";
              const intDigitsRaw = intPart.replace(/^0+/, "");
              const intDigits = intDigitsRaw.length === 0 ? 1 : intDigitsRaw.length;
              const fracDigits = fracPart.length;
              const totalDigits = intDigits + fracDigits;

              if (fieldConfig.scale !== undefined && fracDigits > fieldConfig.scale) {
                ctx.addIssue({ code: ZodIssueCode.custom, message: "invalid format" });
                return;
              }
              if (
                fieldConfig.precision !== undefined &&
                totalDigits > fieldConfig.precision
              ) {
                ctx.addIssue({ code: ZodIssueCode.custom, message: "invalid format" });
                return;
              }

              const num = Number(str);
              if (!Number.isFinite(num)) {
                ctx.addIssue({ code: ZodIssueCode.custom, message: "invalid format" });
                return;
              }

              if (fieldConfig.min !== undefined && num < fieldConfig.min) {
                ctx.addIssue({ code: ZodIssueCode.custom, message: "value out of range" });
                return;
              }
              if (fieldConfig.max !== undefined && num > fieldConfig.max) {
                ctx.addIssue({ code: ZodIssueCode.custom, message: "value out of range" });
              }
            });

          innerSchema = decimalSchema;
          break;
        }

        case "enum": {
          if (
            fieldConfig.values &&
            Array.isArray(fieldConfig.values) &&
            fieldConfig.values.length > 0
          ) {
            innerSchema = z.enum(fieldConfig.values, {
              required_error: "required",
              invalid_type_error: "invalid format",
            });
          } else {
            innerSchema = z.any();
          }
          break;
        }

        default:
          innerSchema = z.any();
      }

      // Apply optional/nullable to the INNER schema so preprocess runs first.
      if (isOptional) {
        innerSchema = innerSchema.optional();
      }
      if (isNullable) {
        innerSchema = innerSchema.nullable();
      }

      // Preprocess values into the appropriate normalized representation.
      let fieldSchema;
      if (fieldConfig.type === "number") {
        fieldSchema = z.preprocess(
          (value) => {
            const v = emptyToUndefined(value, isNullable);
            if (v === undefined || v === null) return v;
            if (typeof v === "string") {
              const n = Number(v);
              return Number.isFinite(n) ? n : v;
            }
            return v;
          },
          innerSchema
        );
      } else if (fieldConfig.type === "decimal") {
        fieldSchema = z.preprocess(
          (value) => {
            const v = emptyToUndefined(value, isNullable);
            if (v === undefined || v === null) return v;
            if (typeof v === "object" && v && typeof v.toString === "function") {
              return v.toString();
            }
            if (typeof v === "number") return String(v);
            return v;
          },
          innerSchema
        );
      } else {
        fieldSchema = z.preprocess(
          (value) => emptyToUndefined(value, isNullable),
          innerSchema
        );
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
// 3. "<Field> must be in (x,y,...)" or "<Field> must be in (1-38)" (range syntax)
// 4. "<Field> should not be null when <DepField> is populated/not null/not empty"
// 5. "<Field> should not be null when <DepField> is null"
// 6. "<Field> should/must be only populated when <DepField> in (x,y,...)"
// 7. "<Field> should be in (x,y) when not null"
// 8. "<Field> must be populated when <DepField> is not null and <DepField2> in (x,y,...)"
// 9. "<Field> should be null OR <Field> should not be null and must be in (x,y,...)"
// 10. "<Field> should be null OR must be greater than 0"
// 11. "<Field> should not be null and must be greater than 0"
// 12. "<Field> less than <OtherField>" (field comparison)
// 13. "<Field> not equal to <OtherField>" (field comparison)
// returns array of { field, message }
const evaluateLevel2Rules = (record, rulesObj) => {
  const errors = [];
  const normalizeKey = (k) => String(k || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  const splitOutsideParens = (input, keyword) => {
    const s = String(input || "");
    const lower = s.toLowerCase();
    const needle = ` ${String(keyword).toLowerCase()} `;
    const parts = [];
    let depth = 0;
    let start = 0;

    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === "(") depth++;
      if (ch === ")" && depth > 0) depth--;

      if (depth === 0 && lower.slice(i, i + needle.length) === needle) {
        parts.push(s.slice(start, i).trim());
        start = i + needle.length;
        i = start - 1;
      }
    }
    parts.push(s.slice(start).trim());
    return parts.filter(Boolean);
  };

  const hasValue = (v) => {
    if (v === null || v === undefined) return false;
    if (typeof v === "string") return v.trim() !== "";
    return true;
  };

  const toNumber = (v) => {
    if (typeof v === "number") return v;
    const n = Number.parseFloat(String(v ?? "").trim());
    return Number.isFinite(n) ? n : null;
  };

  const parseList = (vals) => String(vals || "")
    .split(",")
    .map((v) => v.replace(/['"()]/g, "").trim())
    .filter(Boolean);

  // Parse range like "1-38" into array ["1","2",...,"38"]
  const parseRange = (rangeStr) => {
    const rangeMatch = /^(\d+)-(\d+)$/.exec(rangeStr.trim());
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      const result = [];
      for (let i = start; i <= end; i++) {
        result.push(String(i));
      }
      return result;
    }
    return null;
  };

  // Parse list that may contain ranges like "(1-38)" or "(1,2,3)"
  const parseListWithRanges = (vals) => {
    const raw = String(vals || "").replace(/[()]/g, "").trim();
    // Check if it's a range pattern
    const rangeResult = parseRange(raw);
    if (rangeResult) return rangeResult;
    // Otherwise parse as comma-separated list
    return raw.split(",").map((v) => v.replace(/['"]/g, "").trim()).filter(Boolean);
  };

  const listIncludes = (value, list) => {
    const s = String(value ?? "").trim();
    if (s === "") return false;
    if (list.includes(s)) return true;
    const n = toNumber(s);
    if (n === null) return false;
    return list.some((item) => {
      const ni = toNumber(item);
      return ni !== null && ni === n;
    });
  };

  // Build a normalized->value map so that rule conditions can be case/underscore-insensitive
  const recNorm = {};
  for (const [k, v] of Object.entries(record || {})) {
    recNorm[normalizeKey(k)] = v;
  }

  const getVal = (k) => recNorm[normalizeKey(k)];
  if (!rulesObj || typeof rulesObj !== 'object') return errors;

  for (const [field, rule] of Object.entries(rulesObj)) {
    if (!rule?.enabled || !rule.condition || rule.condition.trim() === '-' ) continue;
    const condRaw = String(rule.condition);
    const cond = condRaw.toLowerCase();

    // Try to detect the target field name from the condition; fallback to schema key
    // First try to match against the original condition (preserves case)
    const targetMatchOriginal = /^\s*(?<target>[a-z0-9_]+)\b/i.exec(condRaw);
    const target = targetMatchOriginal?.groups?.target || field;

    const v = getVal(target);
    const present = hasValue(v);

    // ============================================
    // Handle "should be in (x,y) when not null" pattern
    // Pattern: "<Field> should be in (x,y,...) when not null"
    // Meaning: If field has a value, it must be in the list
    // ============================================
    const shouldBeInWhenNotNullMatch = /\b(should|must)\s+be\s+in\s*\((?<vals>[^)]+)\)\s+when\s+not\s+null\b/i.exec(condRaw);
    if (shouldBeInWhenNotNullMatch?.groups) {
      // Only validate if field has a value
      if (present) {
        const list = parseListWithRanges(shouldBeInWhenNotNullMatch.groups.vals);
        const sVal = String(v ?? "").trim();
        if (sVal && !list.includes(sVal)) {
          errors.push({ field, message: `${field} value ${sVal} not in allowed list (${list.join(',')})` });
        }
      }
      continue;
    }

    // ============================================
    // Handle "must be populated when <dep> is not null and <dep2> in (x,y,...)"
    // Complex condition with multiple dependencies
    // ============================================
    const mustBePopulatedComplexMatch = /\b(must|should)\s+be\s+populated\s+when\s+(?<dep1>[a-z0-9_]+)\s+is\s+not\s+null\s+and\s+(?<dep2>[a-z0-9_]+)\s+in\s*\((?<vals>[^)]+)\)/i.exec(condRaw);
    if (mustBePopulatedComplexMatch?.groups) {
      const dep1Field = mustBePopulatedComplexMatch.groups.dep1;
      const dep2Field = mustBePopulatedComplexMatch.groups.dep2;
      const dep2List = parseListWithRanges(mustBePopulatedComplexMatch.groups.vals);
      const dep1Val = getVal(dep1Field);
      const dep2Val = String(getVal(dep2Field) ?? "").trim();
      const dep1Present = hasValue(dep1Val);
      const dep2InList = dep2Val !== "" && dep2List.includes(dep2Val);
      
      // Only apply if both conditions are met
      if (dep1Present && dep2InList && !present) {
        errors.push({
          field,
          message: `${field} must be populated when ${dep1Field} is not null and ${dep2Field} in (${dep2List.join(',')})`,
        });
      }
      continue;
    }

    // ============================================
    // Handle "only populated when" / "be only populated when" patterns
    // Pattern: "<Field> should/must be only populated when <DepField> in (x,y,...)"
    // Meaning: Field should be null UNLESS the condition is met
    // ============================================
    const onlyPopulatedWhenInMatch = /\b(should|must)\s+be\s+only\s+populated\s+when\s+(?<dep>[a-z0-9_]+)\s+in\s*\((?<vals>[^)]+)\)/i.exec(condRaw);
    if (onlyPopulatedWhenInMatch?.groups) {
      const depField = onlyPopulatedWhenInMatch.groups.dep;
      const depList = parseListWithRanges(onlyPopulatedWhenInMatch.groups.vals);
      const depVal = String(getVal(depField) ?? "").trim();
      const conditionMet = depVal !== "" && depList.includes(depVal);
      
      // If condition is NOT met, field should be null
      if (!conditionMet && present) {
        errors.push({
          field,
          message: `${field} should only be populated when ${depField} in (${depList.join(',')})`,
        });
      }
      continue;
    }

    // ============================================
    // Handle "when <depField> is populated/not null/not empty"
    // ============================================
    const whenPopulatedMatch = /\bwhen\s+(?<dep>[a-z0-9_]+)\s+(is\s+populated|is\s+not\s+null|is\s+not\s+empty)\b/i.exec(cond);
    if (whenPopulatedMatch?.groups) {
      const depField = whenPopulatedMatch.groups.dep;
      const depVal = getVal(depField);
      const depPresent = hasValue(depVal);
      
      // Only apply rule if dependency field is populated
      if (!depPresent) continue;
      
      // Check for "should not be null" requirement
      const requiresNotNull = /\b(should|must)\s+not\s+be\s+null\b/i.test(condRaw);
      if (requiresNotNull && !present) {
        errors.push({
          field,
          message: `${field} should not be null when ${depField} is populated`,
        });
        continue;
      }

      // Check for "must be in" requirement
      const mustInMatch = /\bmust\s+be\s+in\s*\((?<vals>[^)]+)\)/i.exec(condRaw);
      if (mustInMatch?.groups?.vals && present) {
        const list = parseListWithRanges(mustInMatch.groups.vals);
        const sVal = String(v ?? "").trim();
        if (sVal && !list.includes(sVal)) {
          errors.push({ field, message: `${field} value ${sVal} not in allowed list (${list.join(',')})` });
        }
      }
      continue;
    }

    // ============================================
    // Handle "when <depField> is null"
    // ============================================
    const whenNullMatch = /\bwhen\s+(?<dep>[a-z0-9_]+)\s+is\s+null\b/i.exec(cond);
    if (whenNullMatch?.groups) {
      const depField = whenNullMatch.groups.dep;
      const depVal = getVal(depField);
      const depPresent = hasValue(depVal);
      
      // Only apply rule if dependency field is null
      if (depPresent) continue;
      
      // Check for "should not be null" requirement
      const requiresNotNull = /\b(should|must)\s+not\s+be\s+null\b/i.test(condRaw);
      if (requiresNotNull && !present) {
        errors.push({
          field,
          message: `${field} should not be null when ${depField} is null`,
        });
      }
      continue;
    }

    // ============================================
    // Handle "when <depField> in (x,y,...)"
    // ============================================
    const whenMatch = /\bwhen\s+(?<dep>[a-z0-9_]+)\s+in\s*\((?<vals>[^)]+)\)/i.exec(cond);
    let applies = true;
    let depField = null;
    let depList = [];
    if (whenMatch?.groups) {
      depField = whenMatch.groups.dep;
      depList = parseListWithRanges(whenMatch.groups.vals);
      applies = listIncludes(getVal(depField), depList);
    }

    if (!applies) continue;

    // ============================================
    // Handle "when <depField> not in (x,y,...)" - inverse condition
    // ============================================
    const whenNotInMatch = /\bwhen\s+(?<dep>[a-z0-9_]+)\s+not\s+in\s*\((?<vals>[^)]+)\)/i.exec(cond);
    if (whenNotInMatch?.groups) {
      const notInDepField = whenNotInMatch.groups.dep;
      const notInDepList = parseListWithRanges(whenNotInMatch.groups.vals);
      // Skip if the value IS in the list (condition not met)
      if (listIncludes(getVal(notInDepField), notInDepList)) continue;
    }

    const evalAtom = (atomRaw) => {
      const atom = String(atomRaw || "").trim();
      const atomLower = atom.toLowerCase();

      let atomField = target;
      let rest = atom;
      const prefix = /^\s*(?<f>[a-z0-9_]+)\s+(?<r>.+)$/i.exec(atom);
      if (prefix?.groups?.f && prefix?.groups?.r) {
        // Only treat the leading token as a field name if it exists on the record.
        // This prevents phrases like "must be greater than 0" from treating "must" as a field.
        const candidate = prefix.groups.f;
        const candidateExists = Object.prototype.hasOwnProperty.call(recNorm, normalizeKey(candidate));
        if (candidateExists) {
          atomField = candidate;
          rest = prefix.groups.r.trim();
        }
      }

      const restLower = rest.toLowerCase();
      const val = getVal(atomField);
      const valPresent = hasValue(val);

      // Handle "should/must be null" or "is null"
      if (/^(should|must)\s+be\s+null$/i.test(restLower) || /^is\s+null$/i.test(restLower)) {
        return !valPresent;
      }
      // Handle "should/must not be null" or "is not null" or "is populated" or "is not empty"
      if (/^(should|must)\s+not\s+be\s+null$/i.test(restLower) || 
          /^is\s+not\s+null$/i.test(restLower) ||
          /^is\s+populated$/i.test(restLower) ||
          /^is\s+not\s+empty$/i.test(restLower)) {
        return valPresent;
      }

      // Handle "in (x,y,...)" or "must be in (x,y,...)"
      const inMatch = /\b(in|must\s+be\s+in)\s*\((?<vals>[^)]+)\)/i.exec(rest);
      if (inMatch?.groups?.vals) {
        const list = parseListWithRanges(inMatch.groups.vals);
        const sVal = String(val ?? "").trim();
        // If value is empty and field is optional (has "OR" in condition), this is OK
        if (sVal === "") return true; // Empty values don't need to match the list
        return list.includes(sVal);
      }

      const gteMatch = /\bgreater\s+than\s+or\s+equal\s+to\s+(?<num>-?\d+(?:\.\d+)?)\b/i.exec(rest);
      if (gteMatch?.groups?.num) {
        const n = toNumber(val);
        const rhs = Number.parseFloat(gteMatch.groups.num);
        if (n === null) return !valPresent; // null is OK if not present
        return n >= rhs;
      }

      const gtMatch = /\bgreater\s+than\s+(?<num>-?\d+(?:\.\d+)?)\b/i.exec(rest);
      if (gtMatch?.groups?.num) {
        const n = toNumber(val);
        const rhs = Number.parseFloat(gtMatch.groups.num);
        if (n === null) return !valPresent; // null is OK if not present
        return n > rhs;
      }

      // Handle "less than or equal to <num>"
      const lteNumMatch = /\bless\s+than\s+or\s+equal\s+to\s+(?<num>-?\d+(?:\.\d+)?)\b/i.exec(rest);
      if (lteNumMatch?.groups?.num) {
        const n = toNumber(val);
        const rhs = Number.parseFloat(lteNumMatch.groups.num);
        if (n === null) return !valPresent;
        return n <= rhs;
      }

      // Handle "less than or equal to <field>" (comparison between two fields)
      const lteFieldMatch = /\bless\s+than\s+or\s+equal\s+to\s+(?<other>[a-z0-9_]+)\b/i.exec(restLower);
      if (lteFieldMatch?.groups?.other) {
        const left = toNumber(val);
        const right = toNumber(getVal(lteFieldMatch.groups.other));
        // If left is null/undefined, this condition passes (null is OK)
        if (left === null) return true;
        // If right is null/undefined, we can't compare, so pass
        if (right === null) return true;
        return left <= right;
      }

      // Handle "less than <num>"
      const ltNumMatch = /\bless\s+than\s+(?<num>-?\d+(?:\.\d+)?)\b/i.exec(rest);
      if (ltNumMatch?.groups?.num) {
        const n = toNumber(val);
        const rhs = Number.parseFloat(ltNumMatch.groups.num);
        if (n === null) return !valPresent;
        return n < rhs;
      }

      // Handle "less than <field>" (comparison between two fields)
      // Exclude the "less than or equal to" variant handled above.
      const ltFieldMatch = /\bless\s+than\s+(?!or\s+equal\s+to\s)(?<other>[a-z0-9_]+)\b/i.exec(restLower);
      if (ltFieldMatch?.groups?.other) {
        const left = toNumber(val);
        const right = toNumber(getVal(ltFieldMatch.groups.other));
        // If left is null/undefined, this condition passes (null is OK)
        if (left === null) return true;
        // If right is null/undefined, we can't compare, so pass
        if (right === null) return true;
        return left < right;
      }

      const neqMatch = /\bnot\s+equal\s+to\s+(?<other>[a-z0-9_]+)\b/i.exec(restLower);
      if (neqMatch?.groups?.other) {
        const otherVal = getVal(neqMatch.groups.other);
        const leftS = String(val ?? "").trim();
        const rightS = String(otherVal ?? "").trim();
        // If either is empty, they're not equal (pass)
        if (leftS === "" || rightS === "") return true;
        return leftS !== rightS;
      }

      // Handle "should be in (x,y,...)" pattern at atom level
      const shouldBeInMatch = /\b(should|must)\s+be\s+in\s*\((?<vals>[^)]+)\)/i.exec(rest);
      if (shouldBeInMatch?.groups?.vals) {
        const list = parseListWithRanges(shouldBeInMatch.groups.vals);
        const sVal = String(val ?? "").trim();
        if (sVal === "") return true; // Empty values are OK
        return list.includes(sVal);
      }

      return null;
    };

    const condForEval = condRaw
      .replace(/\bwhen\s+[a-z0-9_]+\s+(?:not\s+)?in\s*\([^)]+\)/ig, "")
      .trim();
    const hasLogic = /\s+or\s+/i.test(condForEval) || /\s+and\s+/i.test(condForEval) || /greater\s+than|less\s+than|not\s+equal|\bin\s*\(/i.test(condForEval);
    if (hasLogic) {
      const orTerms = splitOutsideParens(condForEval, "or");
      let parseable = true;
      const valid = orTerms.some((orTerm) => {
        const andTerms = splitOutsideParens(orTerm, "and");
        const andRes = andTerms.map((a) => evalAtom(a));
        if (andRes.some((r) => r === null)) {
          parseable = false;
          return false;
        }
        return andRes.every(Boolean);
      });

      if (parseable) {
        if (!valid) {
          errors.push({ field, message: `${field} does not satisfy rule: ${condRaw}` });
        }
        continue;
      }

      continue;
    }

    const requiresNotNull = /\b(should|must)\s+not\s+be\s+null\b/i.test(condRaw);
    const requiresNull = !requiresNotNull && /\b(should|must)\s+be\s+null\b/i.test(condRaw);

    if (requiresNotNull && !present) {
      errors.push({
        field,
        message: depField
          ? `${field} should not be null when ${depField} in (${depList.join(',')})`
          : `${field} should not be null`,
      });
      continue;
    }

    if (requiresNull && present) {
      errors.push({
        field,
        message: depField
          ? `${field} should be null when ${depField} in (${depList.join(',')})`
          : `${field} should be null`,
      });
      continue;
    }

    // Handle "must be in (x-y)" with range syntax
    const mustInMatch = /\bmust\b[^()]*\bin\s*\((?<vals>[^)]+)\)/i.exec(condRaw);
    const plainInMatch = new RegExp(`\\b${String(target).replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\s+(should\\s+be\\s+)?in\\s*\\((?<vals>[^)]+)\\)`, "i").exec(condRaw);
    const listVals = mustInMatch?.groups?.vals || plainInMatch?.groups?.vals || null;
    if (listVals) {
      const list = parseListWithRanges(listVals);
      const val = String(v ?? "").trim();
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
        data: { validation_2: true, validation_2_status: 'passed' },
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
        data: { validation_2: true, validation_2_status: 'passed' },
      });
      return;
    }

    const effectiveSchema = buildEffectiveLevelSchemaPreferDefaultConditions(
      defaultValidation2OrderConditions,
      client.validation_2
    );

    // Get all orders for this batch
    const orders = await prisma.order.findMany({
      where: { batchId: batchId },
    });

    console.log(`[Validation 2] Validating ${orders.length} orders for batch ${batchId}`);

    // Validate each order and store results
    const validationResults = [];
    
    for (const order of orders) {
      let validationResult = validateOrder(order, effectiveSchema);
      // Apply simple Level-2 rules
      const ruleErrors = evaluateLevel2Rules(order, effectiveSchema);
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
      await prisma.batch.update({ where: { id: batchId }, data: { validation_2: true, validation_2_status: 'passed' } });
      return;
    }

    const client = await prisma.client.findUnique({
      where: { id: batch.user.clientId },
      select: { exe_validation_2: true },
    });

    if (!client || !client.exe_validation_2) {
      console.log(`[Validation 2] Client has no execution validation_2 schema configured`);
      await prisma.batch.update({ where: { id: batchId }, data: { validation_2: true, validation_2_status: 'passed' } });
      return;
    }

    const effectiveExeSchema = buildEffectiveLevelSchemaPreferDefaultConditions(
      defaultValidation2ExecutionConditions,
      client.exe_validation_2
    );

    // Get all executions for this batch
    const executions = await prisma.execution.findMany({ where: { batchId } });
    console.log(`[Validation 2] Validating ${executions.length} executions for batch ${batchId}`);

    let successCount = 0;
    let failCount = 0;
    const failed = [];

    for (const exe of executions) {
      let result = validateExecution(exe, effectiveExeSchema);
      // Apply Level-2 rules for executions
      const ruleErrors = evaluateLevel2Rules(exe, effectiveExeSchema);
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
      await prisma.batch.update({ where: { id: batchId }, data: { validation_3: true, validation_3_status: 'passed' } });
      return;
    }
    const client = await prisma.client.findUnique({ where: { id: batch.user.clientId }, select: { validation_3: true } });
    if (!client || !client.validation_3) {
      await prisma.batch.update({ where: { id: batchId }, data: { validation_3: true, validation_3_status: 'passed' } });
      return;
    }

    const effectiveSchema = buildEffectiveLevelSchemaPreferDefaultConditions(
      defaultValidation3OrderConditions,
      client.validation_3
    );

    const orders = await prisma.order.findMany({ where: { batchId } });
    const exchangeRows = await prisma.uSBrokerDealer.findMany({
      where: {
        membershipType: 'Exchange',
        clientId: { not: null },
      },
      select: { clientId: true },
    });
    const exchangeDestinations = new Set(
      (exchangeRows || [])
        .map((r) => String(r.clientId ?? '').trim())
        .filter(Boolean)
    );

    const firmIdsToCheck = new Set();
    for (const o of orders) {
      const exec = typeof o.orderExecutingEntity === 'number'
        ? o.orderExecutingEntity
        : Number.parseInt(String(o.orderExecutingEntity ?? '').trim(), 10);
      const book = typeof o.orderBookingEntity === 'number'
        ? o.orderBookingEntity
        : Number.parseInt(String(o.orderBookingEntity ?? '').trim(), 10);
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

    let passCnt = 0, failCnt = 0;
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

    if (!batch.user.clientId) { await prisma.batch.update({ where:{id:batchId}, data:{ validation_3:true, validation_3_status: 'passed' } }); return; }
    const client = await prisma.client.findUnique({ where:{id:batch.user.clientId}, select:{ exe_validation_3:true } });
    if (!client || !client.exe_validation_3) { await prisma.batch.update({ where:{id:batchId}, data:{ validation_3:true, validation_3_status: 'passed' } }); return; }

    const effectiveExeSchema = buildEffectiveLevelSchemaPreferDefaultConditions(
      defaultValidation3ExecutionConditions,
      client.exe_validation_3
    );

    const executions = await prisma.execution.findMany({ where:{ batchId } });
    let pass=0, fail=0;
    for (const exe of executions) {
      let result = validateExecution(exe, effectiveExeSchema);
      // Apply Level-2 rules for executions
      const ruleErrors = evaluateLevel2Rules(exe, effectiveExeSchema);
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
