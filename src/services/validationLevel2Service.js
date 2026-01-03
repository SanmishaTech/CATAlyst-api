const prisma = require("../config/db");
const { getValidationCode } = require("../constants/validationCodes");
const defaultValidation2OrderConditions = require("../config/validation2OrderConditions");
const defaultValidation2ExecutionConditions = require("../config/validation2ExecutionConditions");
const { validateOrder, validateExecution } = require("./validationLevel1Service");
const {
  buildEffectiveLevelSchemaPreferDefaultConditions,
} = require("./validationSchemaService");
const {
  markPreviousValidationErrorsDedupedForOrderBatch,
  markPreviousValidationErrorsDedupedForExecutionBatch,
} = require("./validationDedupeService");

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
const evaluateLevel2RulesLegacy = (record, rulesObj) => {
  const errors = [];
  const normalizeKey = (k) =>
    String(k || "")
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

  const parseListWithRanges = (vals) => {
    const raw = String(vals || "").replace(/[()]/g, "").trim();
    const rangeResult = parseRange(raw);
    if (rangeResult) return rangeResult;
    return raw
      .split(",")
      .map((v) => v.replace(/['"]/g, "").trim())
      .filter(Boolean);
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

  const recNorm = {};
  for (const [k, v] of Object.entries(record || {})) {
    recNorm[normalizeKey(k)] = v;
  }

  const getVal = (k) => recNorm[normalizeKey(k)];
  if (!rulesObj || typeof rulesObj !== "object") return errors;

  for (const [field, rule] of Object.entries(rulesObj)) {
    if (!rule?.enabled || !rule.condition || rule.condition.trim() === "-") continue;
    const condRaw = String(rule.condition);
    const cond = condRaw.toLowerCase();

    const targetMatchOriginal = /^\s*(?<target>[a-z0-9_]+)\b/i.exec(condRaw);
    const target = targetMatchOriginal?.groups?.target || field;

    const v = getVal(target);
    const present = hasValue(v);

    const shouldBeInWhenNotNullMatch = /\b(should|must)\s+be\s+in\s*\((?<vals>[^)]+)\)\s+when\s+not\s+null\b/i.exec(
      condRaw
    );
    if (shouldBeInWhenNotNullMatch?.groups) {
      if (present) {
        const list = parseListWithRanges(shouldBeInWhenNotNullMatch.groups.vals);
        const sVal = String(v ?? "").trim();
        if (sVal && !list.includes(sVal)) {
          errors.push({
            field,
            message: `${field} value ${sVal} not in allowed list (${list.join(",")})`,
          });
        }
      }
      continue;
    }

    const mustBePopulatedComplexMatch =
      /\b(must|should)\s+be\s+populated\s+when\s+(?<dep1>[a-z0-9_]+)\s+is\s+not\s+null\s+and\s+(?<dep2>[a-z0-9_]+)\s+in\s*\((?<vals>[^)]+)\)/i.exec(
        condRaw
      );
    if (mustBePopulatedComplexMatch?.groups) {
      const dep1Field = mustBePopulatedComplexMatch.groups.dep1;
      const dep2Field = mustBePopulatedComplexMatch.groups.dep2;
      const dep2List = parseListWithRanges(mustBePopulatedComplexMatch.groups.vals);
      const dep1Val = getVal(dep1Field);
      const dep2Val = String(getVal(dep2Field) ?? "").trim();
      const dep1Present = hasValue(dep1Val);
      const dep2InList = dep2Val !== "" && dep2List.includes(dep2Val);

      if (dep1Present && dep2InList && !present) {
        errors.push({
          field,
          message: `${field} must be populated when ${dep1Field} is not null and ${dep2Field} in (${dep2List.join(",")})`,
        });
      }
      continue;
    }

    const onlyPopulatedWhenInMatch =
      /\b(should|must)\s+be\s+only\s+populated\s+when\s+(?<dep>[a-z0-9_]+)\s+in\s*\((?<vals>[^)]+)\)/i.exec(
        cond
      );
    if (onlyPopulatedWhenInMatch?.groups) {
      const depField = onlyPopulatedWhenInMatch.groups.dep;
      const depList = parseListWithRanges(onlyPopulatedWhenInMatch.groups.vals);
      const depVal = String(getVal(depField) ?? "").trim();
      const conditionMet = depVal !== "" && depList.includes(depVal);

      if (!conditionMet && present) {
        errors.push({
          field,
          message: `${field} should only be populated when ${depField} in (${depList.join(",")})`,
        });
      }
      continue;
    }

    const whenPopulatedMatch =
      /\bwhen\s+(?<dep>[a-z0-9_]+)\s+(is\s+populated|is\s+not\s+null|is\s+not\s+empty)\b/i.exec(
        cond
      );
    if (whenPopulatedMatch?.groups) {
      const depField = whenPopulatedMatch.groups.dep;
      const depVal = getVal(depField);
      const depPresent = hasValue(depVal);

      if (!depPresent) continue;

      const requiresNotNull = /\b(should|must)\s+not\s+be\s+null\b/i.test(condRaw);
      if (requiresNotNull && !present) {
        errors.push({
          field,
          message: `${field} should not be null when ${depField} is populated`,
        });
        continue;
      }

      const mustInMatch = /\bmust\s+be\s+in\s*\((?<vals>[^)]+)\)/i.exec(condRaw);
      if (mustInMatch?.groups?.vals && present) {
        const list = parseListWithRanges(mustInMatch.groups.vals);
        const sVal = String(v ?? "").trim();
        if (sVal && !list.includes(sVal)) {
          errors.push({
            field,
            message: `${field} value ${sVal} not in allowed list (${list.join(",")})`,
          });
        }
      }
      continue;
    }

    const whenNullMatch = /\bwhen\s+(?<dep>[a-z0-9_]+)\s+is\s+null\b/i.exec(cond);
    if (whenNullMatch?.groups) {
      const depField = whenNullMatch.groups.dep;
      const depVal = getVal(depField);
      const depPresent = hasValue(depVal);

      if (depPresent) continue;

      const requiresNotNull = /\b(should|must)\s+not\s+be\s+null\b/i.test(condRaw);
      if (requiresNotNull && !present) {
        errors.push({
          field,
          message: `${field} should not be null when ${depField} is null`,
        });
      }
      continue;
    }

    const whenMatch = /\bwhen\s+(?<dep>[a-z0-9_]+)\s+in\s*\((?<vals>[^)]+)\)/i.exec(
      cond
    );
    let applies = true;
    let depField = null;
    let depList = [];
    if (whenMatch?.groups) {
      depField = whenMatch.groups.dep;
      depList = parseListWithRanges(whenMatch.groups.vals);
      applies = listIncludes(getVal(depField), depList);
    }

    if (!applies) continue;

    const whenNotInMatch =
      /\bwhen\s+(?<dep>[a-z0-9_]+)\s+not\s+in\s*\((?<vals>[^)]+)\)/i.exec(cond);
    if (whenNotInMatch?.groups) {
      const notInDepField = whenNotInMatch.groups.dep;
      const notInDepList = parseListWithRanges(whenNotInMatch.groups.vals);
      if (listIncludes(getVal(notInDepField), notInDepList)) continue;
    }

    const evalAtom = (atomRaw) => {
      const atom = String(atomRaw || "").trim();
      const atomLower = atom.toLowerCase();

      let atomField = target;
      let rest = atom;
      const prefix = /^\s*(?<f>[a-z0-9_]+)\s+(?<r>.+)$/i.exec(atom);
      if (prefix?.groups?.f && prefix?.groups?.r) {
        const candidate = prefix.groups.f;
        const candidateExists = Object.prototype.hasOwnProperty.call(
          recNorm,
          normalizeKey(candidate)
        );
        if (candidateExists) {
          atomField = candidate;
          rest = prefix.groups.r.trim();
        }
      }

      const restLower = rest.toLowerCase();
      const val = getVal(atomField);
      const valPresent = hasValue(val);

      if (
        /^(should|must)\s+be\s+null$/i.test(restLower) ||
        /^is\s+null$/i.test(restLower)
      ) {
        return !valPresent;
      }

      if (
        /^(should|must)\s+not\s+be\s+null$/i.test(restLower) ||
        /^is\s+not\s+null$/i.test(restLower) ||
        /^is\s+populated$/i.test(restLower) ||
        /^is\s+not\s+empty$/i.test(restLower)
      ) {
        return valPresent;
      }

      const inMatch = /\b(in|must\s+be\s+in)\s*\((?<vals>[^)]+)\)/i.exec(rest);
      if (inMatch?.groups?.vals) {
        const list = parseListWithRanges(inMatch.groups.vals);
        const sVal = String(val ?? "").trim();
        if (sVal === "") return true;
        return list.includes(sVal);
      }

      const gteMatch =
        /\bgreater\s+than\s+or\s+equal\s+to\s+(?<num>-?\d+(?:\.\d+)?)\b/i.exec(
          rest
        );
      if (gteMatch?.groups?.num) {
        const n = toNumber(val);
        const rhs = Number.parseFloat(gteMatch.groups.num);
        if (n === null) return !valPresent;
        return n >= rhs;
      }

      const gtMatch =
        /\bgreater\s+than\s+(?<num>-?\d+(?:\.\d+)?)\b/i.exec(rest);
      if (gtMatch?.groups?.num) {
        const n = toNumber(val);
        const rhs = Number.parseFloat(gtMatch.groups.num);
        if (n === null) return !valPresent;
        return n > rhs;
      }

      const lteNumMatch =
        /\bless\s+than\s+or\s+equal\s+to\s+(?<num>-?\d+(?:\.\d+)?)\b/i.exec(
          rest
        );
      if (lteNumMatch?.groups?.num) {
        const n = toNumber(val);
        const rhs = Number.parseFloat(lteNumMatch.groups.num);
        if (n === null) return !valPresent;
        return n <= rhs;
      }

      const lteFieldMatch =
        /\bless\s+than\s+or\s+equal\s+to\s+(?<other>[a-z0-9_]+)\b/i.exec(
          restLower
        );
      if (lteFieldMatch?.groups?.other) {
        const left = toNumber(val);
        const right = toNumber(getVal(lteFieldMatch.groups.other));
        if (left === null) return true;
        if (right === null) return true;
        return left <= right;
      }

      const ltNumMatch = /\bless\s+than\s+(?<num>-?\d+(?:\.\d+)?)\b/i.exec(rest);
      if (ltNumMatch?.groups?.num) {
        const n = toNumber(val);
        const rhs = Number.parseFloat(ltNumMatch.groups.num);
        if (n === null) return !valPresent;
        return n < rhs;
      }

      const ltFieldMatch =
        /\bless\s+than\s+(?!or\s+equal\s+to\s)(?<other>[a-z0-9_]+)\b/i.exec(
          restLower
        );
      if (ltFieldMatch?.groups?.other) {
        const left = toNumber(val);
        const right = toNumber(getVal(ltFieldMatch.groups.other));
        if (left === null) return true;
        if (right === null) return true;
        return left < right;
      }

      const neqMatch =
        /\bnot\s+equal\s+to\s+(?<other>[a-z0-9_]+)\b/i.exec(restLower);
      if (neqMatch?.groups?.other) {
        const otherVal = getVal(neqMatch.groups.other);
        const leftS = String(val ?? "").trim();
        const rightS = String(otherVal ?? "").trim();
        if (leftS === "" || rightS === "") return true;
        return leftS !== rightS;
      }

      const shouldBeInMatch =
        /\b(should|must)\s+be\s+in\s*\((?<vals>[^)]+)\)/i.exec(rest);
      if (shouldBeInMatch?.groups?.vals) {
        const list = parseListWithRanges(shouldBeInMatch.groups.vals);
        const sVal = String(val ?? "").trim();
        if (sVal === "") return true;
        return list.includes(sVal);
      }

      return null;
    };

    const condForEval = condRaw
      .replace(/\bwhen\s+[a-z0-9_]+\s+(?:not\s+)?in\s*\([^)]+\)/gi, "")
      .trim();
    const hasLogic =
      /\s+or\s+/i.test(condForEval) ||
      /\s+and\s+/i.test(condForEval) ||
      /greater\s+than|less\s+than|not\s+equal|\bin\s*\(/i.test(condForEval);
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
          errors.push({
            field,
            message: `${field} does not satisfy rule: ${condRaw}`,
          });
        }
        continue;
      }

      continue;
    }

    const requiresNotNull = /\b(should|must)\s+not\s+be\s+null\b/i.test(condRaw);
    const requiresNull =
      !requiresNotNull && /\b(should|must)\s+be\s+null\b/i.test(condRaw);

    if (requiresNotNull && !present) {
      errors.push({
        field,
        message: depField
          ? `${field} should not be null when ${depField} in (${depList.join(",")})`
          : `${field} should not be null`,
      });
      continue;
    }

    if (requiresNull && present) {
      errors.push({
        field,
        message: depField
          ? `${field} should be null when ${depField} in (${depList.join(",")})`
          : `${field} should be null`,
      });
      continue;
    }

    const mustInMatch = /\bmust\b[^()]*\bin\s*\((?<vals>[^)]+)\)/i.exec(condRaw);
    const plainInMatch = new RegExp(
      `\\b${String(target).replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\s+(should\\s+be\\s+)?in\\s*\\((?<vals>[^)]+)\\)`,
      "i"
    ).exec(condRaw);
    const listVals = mustInMatch?.groups?.vals || plainInMatch?.groups?.vals || null;
    if (listVals) {
      const list = parseListWithRanges(listVals);
      const val = String(v ?? "").trim();
      if (val && !list.includes(val)) {
        errors.push({
          field,
          message: `${field} value ${val} not in allowed list (${list.join(",")})`,
        });
      }
    }
  }
  return errors;
};

const evaluateLevel2Rules = (record, rulesObj) => {
  const errors = [];
  if (!record || !rulesObj || typeof rulesObj !== "object") return errors;

  const enabled = (field) => !!rulesObj?.[field]?.enabled;
  const cond = (field, fallback) => rulesObj?.[field]?.condition || fallback || "Validation 2 rule failed";

  const hasValue = (v) => {
    if (v === null || v === undefined) return false;
    if (typeof v === "string") return v.trim() !== "";
    return true;
  };

  const toStr = (v) => {
    if (v === null || v === undefined) return "";
    return String(v).trim();
  };

  const inList = (v, list) => {
    const s = toStr(v);
    if (!s) return false;
    return list.some((x) => toStr(x) === s);
  };

  const toNumber = (v) => {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    const s = toStr(v);
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  const isNanoSeconds = (v) => {
    const s = toStr(v);
    if (!s) return false;
    if (/^\d+$/.test(s)) return true;
    const t = Date.parse(s);
    return Number.isFinite(t);
  };

  const toTimeMs = (v) => {
    const s = toStr(v);
    if (!s) return null;
    if (/^\d+$/.test(s)) {
      const n = Number(s);
      if (!Number.isFinite(n)) return null;
      // If it's a very large integer, assume nano-ish and normalize to ms.
      if (s.length > 13) return Math.floor(n / 1e6);
      return n;
    }
    const t = Date.parse(s);
    return Number.isFinite(t) ? t : null;
  };

  const fail = (field, message) => {
    errors.push({ field, message: message || "Validation 2 rule failed" });
  };

  // =====================
  // ORDER rules (Level 2)
  // =====================

  if (enabled("orderId") && !hasValue(record.orderId)) {
    fail("orderId", cond("orderId", "orderId should not be null"));
  }

  if (enabled("orderIdVersion") && !hasValue(record.orderIdVersion)) {
    fail("orderIdVersion", cond("orderIdVersion", "orderIdVersion should not be null"));
  }

  if (enabled("parentOrderId")) {
    if (inList(record.orderParentChildType, ["C"]) && !hasValue(record.parentOrderId)) {
      fail("parentOrderId", cond("parentOrderId"));
    }
  }

  if (enabled("cancelreplaceOrderId")) {
    if (inList(record.orderAction, ["9", "10", "11", "12"]) && !hasValue(record.cancelreplaceOrderId)) {
      fail("cancelreplaceOrderId", cond("cancelreplaceOrderId"));
    }
  }

  if (enabled("linkedOrderId")) {
    // Note: "lookup/not empty" rules were not enforced by the legacy parser; keep minimal behavior.
    if (hasValue(record.orderLinkedTransactonId) && !hasValue(record.linkedOrderId)) {
      fail("linkedOrderId", cond("linkedOrderId"));
    }
  }

  if (enabled("linkOrderType")) {
    if (hasValue(record.linkedOrderId)) {
      if (!hasValue(record.linkOrderType)) {
        fail("linkOrderType", cond("linkOrderType"));
      } else if (!inList(record.linkOrderType, ["1", "2", "3", "4"])) {
        fail("linkOrderType", cond("linkOrderType"));
      }
    }
  }

  if (enabled("orderAction") && !hasValue(record.orderAction)) {
    fail("orderAction", cond("orderAction"));
  }

  if (enabled("orderStatus")) {
    if (!hasValue(record.orderStatus) || !inList(record.orderStatus, ["1", "2", "3", "4", "5", "6", "7", "8"])) {
      fail("orderStatus", cond("orderStatus"));
    }
  }

  if (enabled("orderCapacity")) {
    if (!hasValue(record.orderCapacity) || !inList(record.orderCapacity, ["1", "2", "3", "4", "5", "6"])) {
      fail("orderCapacity", cond("orderCapacity"));
    }
  }

  if (enabled("orderDestination")) {
    // Interpreting "routed to external destination" as Order_Action in (5,6)
    if (inList(record.orderAction, ["5", "6"]) && !hasValue(record.orderDestination)) {
      fail("orderDestination", cond("orderDestination"));
    }
  }

  if (enabled("orderClientRef")) {
    if (inList(record.orderCapacity, ["2", "4"]) && hasValue(record.orderClientRef)) {
      fail("orderClientRef", cond("orderClientRef"));
    } else if (inList(record.orderAction, ["14"]) && !hasValue(record.orderClientRef)) {
      fail("orderClientRef", cond("orderClientRef"));
    }
  }

  if (enabled("orderExecutingEntity") && !hasValue(record.orderExecutingEntity)) {
    fail("orderExecutingEntity", cond("orderExecutingEntity"));
  }

  if (enabled("orderBookingEntity") && !hasValue(record.orderBookingEntity)) {
    fail("orderBookingEntity", cond("orderBookingEntity"));
  }

  if (enabled("orderPositionAccount") && !hasValue(record.orderPositionAccount)) {
    fail("orderPositionAccount", cond("orderPositionAccount"));
  }

  if (enabled("orderSide")) {
    if (!hasValue(record.orderSide) || !inList(record.orderSide, ["1", "2", "3", "4", "5", "6"])) {
      fail("orderSide", cond("orderSide"));
    }
  }

  if (enabled("orderClientCapacity")) {
    if (hasValue(record.orderClientCapacity) && !inList(record.orderClientCapacity, ["1", "2", "3", "4", "5", "6"])) {
      fail("orderClientCapacity", cond("orderClientCapacity"));
    }
  }

  if (enabled("orderManualIndicator")) {
    if (!hasValue(record.orderManualIndicator) || !inList(record.orderManualIndicator, ["1", "2"])) {
      fail("orderManualIndicator", cond("orderManualIndicator"));
    }
  }

  if (enabled("orderRequestTime")) {
    if (inList(record.orderCapacity, ["1"]) && inList(record.orderAction, ["1", "9", "11"])) {
      if (!hasValue(record.orderRequestTime) || !isNanoSeconds(record.orderRequestTime)) {
        fail("orderRequestTime", cond("orderRequestTime"));
      }
    } else if (hasValue(record.orderRequestTime) && !isNanoSeconds(record.orderRequestTime)) {
      fail("orderRequestTime", cond("orderRequestTime"));
    }
  }

  if (enabled("orderEventTime")) {
    if (!hasValue(record.orderEventTime) || !isNanoSeconds(record.orderEventTime)) {
      fail("orderEventTime", cond("orderEventTime"));
    }
  }

  if (enabled("orderManualTimestamp")) {
    if (inList(record.orderManualIndicator, ["1"])) {
      if (!hasValue(record.orderManualTimestamp) || !isNanoSeconds(record.orderManualTimestamp)) {
        fail("orderManualTimestamp", cond("orderManualTimestamp"));
      }
    } else if (hasValue(record.orderManualTimestamp) && !isNanoSeconds(record.orderManualTimestamp)) {
      fail("orderManualTimestamp", cond("orderManualTimestamp"));
    }
  }

  if (enabled("orderPublishingTime")) {
    if (hasValue(record.orderPublishingTime) && !isNanoSeconds(record.orderPublishingTime)) {
      fail("orderPublishingTime", cond("orderPublishingTime"));
    }
  }

  if (enabled("orderQuantity")) {
    const q = toNumber(record.orderQuantity);
    if (q === null || q <= 0) {
      fail("orderQuantity", cond("orderQuantity"));
    }
  }

  if (enabled("orderPrice")) {
    const price = toNumber(record.orderPrice);
    if (!inList(record.orderType, ["1", "5"])) {
      if (price === null || price < 0) {
        fail("orderPrice", cond("orderPrice"));
      }
    } else if (price !== null && price < 0) {
      fail("orderPrice", cond("orderPrice"));
    }
  }

  if (enabled("orderType")) {
    if (!hasValue(record.orderType) || !inList(record.orderType, ["1", "2", "3", "4", "5", "6", "7"])) {
      fail("orderType", cond("orderType"));
    }
  }

  if (enabled("orderTimeInforce")) {
    if (!hasValue(record.orderTimeInforce) || !inList(record.orderTimeInforce, ["1", "2", "3", "4", "5", "6", "7", "8"])) {
      fail("orderTimeInforce", cond("orderTimeInforce"));
    }
  }

  if (enabled("orderExecutionInstructions")) {
    const n = toNumber(record.orderExecutionInstructions);
    if (n === null || n < 1 || n > 38) {
      fail("orderExecutionInstructions", cond("orderExecutionInstructions"));
    }
  }

  if (enabled("orderAttributes")) {
    const n = toNumber(record.orderAttributes);
    if (hasValue(record.orderAttributes) && (n === null || n < 1 || n > 15)) {
      fail("orderAttributes", cond("orderAttributes"));
    }
  }

  if (enabled("orderRestrictions")) {
    if (!hasValue(record.orderRestrictions) || !inList(record.orderRestrictions, ["1", "2", "3", "4", "5", "6", "7"])) {
      fail("orderRestrictions", cond("orderRestrictions"));
    }
  }

  if (enabled("orderAuctionIndicator")) {
    if (hasValue(record.orderAuctionIndicator) && !inList(record.orderAuctionIndicator, ["1", "2", "3"])) {
      fail("orderAuctionIndicator", cond("orderAuctionIndicator"));
    }
  }

  if (enabled("orderSwapIndicator")) {
    if (!hasValue(record.orderSwapIndicator) || !inList(record.orderSwapIndicator, ["1", "2"])) {
      fail("orderSwapIndicator", cond("orderSwapIndicator"));
    }
  }

  if (enabled("orderInstrumentId")) {
    if (!hasValue(record.orderOsi) && !hasValue(record.orderInstrumentId)) {
      fail("orderInstrumentId", cond("orderInstrumentId"));
    }
  }

  if (enabled("orderCurrencyId") && !hasValue(record.orderCurrencyId)) {
    fail("orderCurrencyId", cond("orderCurrencyId"));
  }

  if (enabled("orderFlowType")) {
    if (hasValue(record.orderFlowType) && !inList(record.orderFlowType, ["1", "2", "3", "4", "5"])) {
      fail("orderFlowType", cond("orderFlowType"));
    }
  }

  if (enabled("orderSymbol")) {
    if (!hasValue(record.orderInstrumentId) && !hasValue(record.orderSymbol)) {
      fail("orderSymbol", cond("orderSymbol"));
    }
  }

  if (enabled("orderInstrumentReference")) {
    if (!hasValue(record.orderInstrumentReference) || !inList(record.orderInstrumentReference, ["1", "2", "3", "4"])) {
      fail("orderInstrumentReference", cond("orderInstrumentReference"));
    }
  }

  if (enabled("orderInstrumentReferenceValue")) {
    if (hasValue(record.orderInstrumentReference) && !hasValue(record.orderInstrumentReferenceValue)) {
      fail("orderInstrumentReferenceValue", cond("orderInstrumentReferenceValue"));
    }
  }

  // Lifecycle rules not enforceable without historical context; enforce presence only.
  if (enabled("orderComplianceId") && !hasValue(record.orderComplianceId)) {
    fail("orderComplianceId", cond("orderComplianceId"));
  }

  if (enabled("orderEntityId") && !hasValue(record.orderEntityId)) {
    fail("orderEntityId", cond("orderEntityId"));
  }

  if (enabled("orderExecutingAccount")) {
    // "should be null OR must be present in lookup table".
    // This service currently cannot validate lookup membership in-memory.
    // We enforce only that if populated, it is a non-empty value.
    if (hasValue(record.orderExecutingAccount) === false) {
      // null is allowed
    }
  }

  if (enabled("orderClientOrderId")) {
    if (inList(record.orderAction, ["1", "2", "8", "9", "10"]) && !hasValue(record.orderClientOrderId)) {
      fail("orderClientOrderId", cond("orderClientOrderId"));
    }
  }

  if (enabled("orderRoutedOrderId")) {
    if (hasValue(record.orderDestination) && inList(record.orderExdestinationInstruction, ["Internal", "External"]) && !hasValue(record.orderRoutedOrderId)) {
      fail("orderRoutedOrderId", cond("orderRoutedOrderId"));
    }
  }

  if (enabled("orderAmendReason")) {
    if (hasValue(record.orderAmendReason) && !inList(record.orderAction, ["8", "9", "10"])) {
      fail("orderAmendReason", cond("orderAmendReason"));
    }
  }

  if (enabled("orderCancelRejectReason")) {
    if (hasValue(record.orderCancelRejectReason) && !inList(record.orderAction, ["7", "11", "12"])) {
      fail("orderCancelRejectReason", cond("orderCancelRejectReason"));
    }
  }

  if (enabled("orderBidSize")) {
    const n = toNumber(record.orderBidSize);
    if (hasValue(record.orderBidSize) && (n === null || n <= 0)) {
      fail("orderBidSize", cond("orderBidSize"));
    }
  }

  if (enabled("orderBidPrice")) {
    const n = toNumber(record.orderBidPrice);
    if (hasValue(record.orderBidPrice) && (n === null || n <= 0)) {
      fail("orderBidPrice", cond("orderBidPrice"));
    }
  }

  if (enabled("orderAskSize")) {
    const n = toNumber(record.orderAskSize);
    if (hasValue(record.orderAskSize) && (n === null || n <= 0)) {
      fail("orderAskSize", cond("orderAskSize"));
    }
  }

  if (enabled("orderAskPrice")) {
    const n = toNumber(record.orderAskPrice);
    if (hasValue(record.orderAskPrice) && (n === null || n <= 0)) {
      fail("orderAskPrice", cond("orderAskPrice"));
    }
  }

  if (enabled("orderBasketId")) {
    if (hasValue(record.orderBasketId) && toStr(record.orderBasketId) === toStr(record.orderId)) {
      fail("orderBasketId", cond("orderBasketId"));
    }
  }

  if (enabled("orderCumQty")) {
    const left = toNumber(record.orderCumQty);
    const right = toNumber(record.orderQuantity);
    if (left !== null && right !== null && left > right) {
      fail("orderCumQty", cond("orderCumQty"));
    }
  }

  if (enabled("orderLeavesQty")) {
    const left = toNumber(record.orderLeavesQty);
    const right = toNumber(record.orderQuantity);
    if (left !== null && right !== null && left > right) {
      fail("orderLeavesQty", cond("orderLeavesQty"));
    }
  }

  if (enabled("orderStopPrice")) {
    const n = toNumber(record.orderStopPrice);
    if (hasValue(record.orderStopPrice) && (n === null || n < 0)) {
      fail("orderStopPrice", cond("orderStopPrice"));
    }
  }

  if (enabled("orderDiscretionPrice")) {
    const n = toNumber(record.orderDiscretionPrice);
    if (hasValue(record.orderDiscretionPrice) && (n === null || n < 0)) {
      fail("orderDiscretionPrice", cond("orderDiscretionPrice"));
    }
  }

  if (enabled("orderNegotiatedIndicator")) {
    if (hasValue(record.orderNegotiatedIndicator) && !inList(record.orderNegotiatedIndicator, ["1", "2"])) {
      fail("orderNegotiatedIndicator", cond("orderNegotiatedIndicator"));
    }
  }

  if (enabled("orderActionInitiated")) {
    if (!hasValue(record.orderActionInitiated) || !inList(record.orderActionInitiated, ["1", "2", "3", "4"])) {
      fail("orderActionInitiated", cond("orderActionInitiated"));
    }
  }

  if (enabled("orderSecondaryOffering")) {
    if (hasValue(record.orderSecondaryOffering) && !inList(record.orderSecondaryOffering, ["2", "3", "4"])) {
      fail("orderSecondaryOffering", cond("orderSecondaryOffering"));
    }
  }

  if (enabled("orderStartTime")) {
    if (!hasValue(record.orderStartTime) || !isNanoSeconds(record.orderStartTime)) {
      fail("orderStartTime", cond("orderStartTime"));
    } else {
      const start = toTimeMs(record.orderStartTime);
      const evt = toTimeMs(record.orderEventTime);
      if (start !== null && evt !== null && start < evt) {
        fail("orderStartTime", cond("orderStartTime"));
      }
    }
  }

  if (enabled("orderTifExpiration")) {
    if (inList(record.orderTimeInforce, ["7"]) && !hasValue(record.orderTifExpiration)) {
      fail("orderTifExpiration", cond("orderTifExpiration"));
    }
  }

  if (enabled("orderParentChildType")) {
    if (!hasValue(record.orderParentChildType) || !inList(record.orderParentChildType, ["1", "2", "3"])) {
      fail("orderParentChildType", cond("orderParentChildType"));
    }
  }

  if (enabled("orderMinimumQty")) {
    const minQty = toNumber(record.orderMinimumQty);
    const qty = toNumber(record.orderQuantity);
    if (minQty !== null && qty !== null && minQty >= qty) {
      fail("orderMinimumQty", cond("orderMinimumQty"));
    }
  }

  if (enabled("orderTradingSession")) {
    if (!hasValue(record.orderTradingSession) || !inList(record.orderTradingSession, ["1", "2", "3", "4", "5", "6", "7", "8", "9"])) {
      fail("orderTradingSession", cond("orderTradingSession"));
    }
  }

  if (enabled("orderDisplayPrice")) {
    if (hasValue(record.orderDisplayPrice) && !inList(record.atsDisplayIndicator, ["1"])) {
      fail("orderDisplayPrice", cond("orderDisplayPrice"));
    }
  }

  if (enabled("atsDisplayIndicator")) {
    if (hasValue(record.atsDisplayIndicator) && !inList(record.atsDisplayIndicator, ["1", "2"])) {
      fail("atsDisplayIndicator", cond("atsDisplayIndicator"));
    }
  }

  if (enabled("orderNbboSource")) {
    if (hasValue(record.orderNbboTimestamp) && !hasValue(record.orderNbboSource)) {
      fail("orderNbboSource", cond("orderNbboSource"));
    }
  }

  if (enabled("orderNbboTimestamp")) {
    if (hasValue(record.orderNbboSource)) {
      if (!hasValue(record.orderNbboTimestamp) || !isNanoSeconds(record.orderNbboTimestamp)) {
        fail("orderNbboTimestamp", cond("orderNbboTimestamp"));
      }
    } else if (hasValue(record.orderNbboTimestamp) && !isNanoSeconds(record.orderNbboTimestamp)) {
      fail("orderNbboTimestamp", cond("orderNbboTimestamp"));
    }
  }

  if (enabled("orderSolicitationFlag")) {
    if (!hasValue(record.orderSolicitationFlag) || !inList(record.orderSolicitationFlag, ["1", "2"])) {
      fail("orderSolicitationFlag", cond("orderSolicitationFlag"));
    }
  }

  if (enabled("routeRejectedFlag")) {
    if (hasValue(record.routeRejectedFlag) && !inList(record.routeRejectedFlag, ["1", "2"])) {
      fail("routeRejectedFlag", cond("routeRejectedFlag"));
    }
  }

  // =====================
  // EXECUTION rules (Level 2)
  // =====================

  if (enabled("previousExecutionId")) {
    if (inList(record.executionAction, ["3", "4"]) && !hasValue(record.previousExecutionId)) {
      fail("previousExecutionId", cond("previousExecutionId"));
    }
  }

  if (enabled("executionEntityId") && !hasValue(record.executionEntityId)) {
    fail("executionEntityId", cond("executionEntityId"));
  }

  if (enabled("executionVersion")) {
    const n = toNumber(record.executionVersion);
    if (n === null || n < 0) {
      fail("executionVersion", cond("executionVersion"));
    }
  }

  if (enabled("externalExecutionId")) {
    if (hasValue(record.executionLastMarket) && inList(record.isMarketExecution, ["1"]) && !hasValue(record.externalExecutionId)) {
      fail("externalExecutionId", cond("externalExecutionId"));
    }
  }

  if (enabled("executionSide")) {
    if (!hasValue(record.executionSide) || !inList(record.executionSide, ["1", "2", "3", "4", "5", "6"])) {
      fail("executionSide", cond("executionSide"));
    }
  }

  if (enabled("executionPostingSide")) {
    if (!hasValue(record.executionPostingSide) || !inList(record.executionPostingSide, ["1", "2", "3", "4", "5", "6"])) {
      fail("executionPostingSide", cond("executionPostingSide"));
    }
  }

  if (enabled("executionBrokerCapacity")) {
    if (!hasValue(record.executionBrokerCapacity) || !inList(record.executionBrokerCapacity, ["1", "2", "3", "4"])) {
      fail("executionBrokerCapacity", cond("executionBrokerCapacity"));
    }
  }

  if (enabled("executionCapacity")) {
    if (!hasValue(record.executionCapacity) || !inList(record.executionCapacity, ["1", "2", "3", "4"])) {
      fail("executionCapacity", cond("executionCapacity"));
    }
  }

  if (enabled("executionEventTime")) {
    if (!hasValue(record.executionEventTime) || !isNanoSeconds(record.executionEventTime)) {
      fail("executionEventTime", cond("executionEventTime"));
    }
  }

  if (enabled("executionTime")) {
    if (!hasValue(record.executionTime) || !isNanoSeconds(record.executionTime)) {
      fail("executionTime", cond("executionTime"));
    }
  }

  if (enabled("executionManualIndicator")) {
    if (!hasValue(record.executionManualIndicator) || !inList(record.executionManualIndicator, ["1", "2"])) {
      fail("executionManualIndicator", cond("executionManualIndicator"));
    }
  }

  if (enabled("executionManualEventTime")) {
    if (inList(record.executionManualIndicator, ["1"])) {
      if (!hasValue(record.executionManualEventTime) || !isNanoSeconds(record.executionManualEventTime)) {
        fail("executionManualEventTime", cond("executionManualEventTime"));
      }
    } else if (hasValue(record.executionManualEventTime) && !isNanoSeconds(record.executionManualEventTime)) {
      fail("executionManualEventTime", cond("executionManualEventTime"));
    }
  }

  if (enabled("isMarketExecution")) {
    if (!hasValue(record.isMarketExecution) || !inList(record.isMarketExecution, ["1", "2"])) {
      fail("isMarketExecution", cond("isMarketExecution"));
    }
  }

  if (enabled("executionLastMarket")) {
    if (inList(record.isMarketExecution, ["1"]) && !hasValue(record.executionLastMarket)) {
      fail("executionLastMarket", cond("executionLastMarket"));
    }
  }

  if (enabled("executionAccount")) {
    // "should not be null and must be present in lookup table"
    if (!hasValue(record.executionAccount)) {
      fail("executionAccount", cond("executionAccount"));
    }
  }

  if (enabled("executionBookingAccount")) {
    // "should be null OR must be present in lookup table".
    // We only enforce that when populated, it's non-empty.
    // (Membership check needs DB lookup and is not handled here.)
    if (hasValue(record.executionBookingAccount) === false) {
      // null is allowed
    }
  }

  if (enabled("executionInstrumentReferenceValue")) {
    // Config condition references executionInstrumentReference list; enforce that.
    if (!inList(record.executionInstrumentReference, ["1", "2", "3", "4"])) {
      fail("executionInstrumentReferenceValue", cond("executionInstrumentReferenceValue"));
    }
  }

  if (enabled("executionLastPrice")) {
    const n = toNumber(record.executionLastPrice);
    if (n === null || n < 0) {
      fail("executionLastPrice", cond("executionLastPrice"));
    }
  }

  if (enabled("executionLastQuantity")) {
    const n = toNumber(record.executionLastQuantity);
    if (n === null || n <= 0) {
      fail("executionLastQuantity", cond("executionLastQuantity"));
    }
  }

  if (enabled("linkedExecutionId")) {
    if (hasValue(record.linkedExecutionId) && toStr(record.linkedExecutionId) === toStr(record.executionId)) {
      fail("linkedExecutionId", cond("linkedExecutionId"));
    }
  }

  if (enabled("executionTransactionType")) {
    if (!hasValue(record.executionTransactionType) || !inList(record.executionTransactionType, ["1", "2", "3", "4"])) {
      fail("executionTransactionType", cond("executionTransactionType"));
    }
  }

  if (enabled("executionBookingEligiblity")) {
    if (hasValue(record.executionBookingEligiblity) && !inList(record.executionBookingEligiblity, ["1", "2"])) {
      fail("executionBookingEligiblity", cond("executionBookingEligiblity"));
    }
  }

  if (enabled("executionSwapIndicator")) {
    // Condition text is: "executionSwapIndicator should not be null OR must be in (1,2)".
    // This effectively enforces only that it is populated.
    if (!hasValue(record.executionSwapIndicator)) {
      fail("executionSwapIndicator", cond("executionSwapIndicator"));
    }
  }

  return errors;
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
    if (batch.validation_1_status !== "passed") {
      console.log(
        `[Validation 2] Batch ${batchId} - validation_1_status is not 'passed', skipping validation_2`
      );
      return;
    }

    // Check if already validated
    if (batch.validation_2 !== null) {
      console.log(`[Validation 2] Batch ${batchId} already validated`);
      return;
    }

    // Route execution batches to execution validator
    if (batch.fileType === "execution") {
      return await processExecutionValidation2ForBatch(batchId, batch);
    }

    // Get client's validation_2 schema
    if (!batch.user.clientId) {
      console.log(`[Validation 2] User ${batch.userId} has no associated client`);
      await prisma.batch.update({
        where: { id: batchId },
        data: { validation_2: true, validation_2_status: "passed" },
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
        data: { validation_2: true, validation_2_status: "passed" },
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

    console.log(
      `[Validation 2] Validating ${orders.length} orders for batch ${batchId}`
    );

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
            ...ruleErrors.map((e) => ({ field: e.field, message: e.message })),
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
      if (
        !validationResult.success &&
        validationResult.errors &&
        validationResult.errors.length > 0
      ) {
        await prisma.validationError.createMany({
          data: validationResult.errors.map((error) => {
            // Determine validation code based on error type
            let validationCodeKey = "CTX_INVALID_COMBINATION"; // default

            if (error.message?.toLowerCase().includes("required")) {
              validationCodeKey = "REQ_MISSING_FIELD";
            } else if (
              error.message?.toLowerCase().includes("format") ||
              error.message?.toLowerCase().includes("invalid")
            ) {
              validationCodeKey = "FMT_INVALID_FORMAT";
            } else if (error.message?.toLowerCase().includes("duplicate")) {
              validationCodeKey = "DUP_DUPLICATE_RECORD";
            } else if (
              error.message?.toLowerCase().includes("range") ||
              error.message?.toLowerCase().includes("out of")
            ) {
              validationCodeKey = "RNG_VALUE_OUT_OF_RANGE";
            } else if (
              error.message?.toLowerCase().includes("enum") ||
              error.message?.toLowerCase().includes("allowed")
            ) {
              validationCodeKey = "REF_INVALID_ENUM";
            }

            const validationCodeObj = getValidationCode(validationCodeKey);

            return {
              validationId: validation.id,
              validationCode: validationCodeObj.code,
              validationLevel: 2, // Validation 2
              field: error.field || "unknown",
              message: error.message || "Validation 2 failed",
              code: error.code || "validation_2_error",
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

    const successCount = validationResults.filter((r) => r.success).length;
    const failCount = validationResults.filter((r) => !r.success).length;

    const allPassed = failCount === 0;
    const validationStatus = allPassed ? "passed" : "failed";

    // Mark batch as validated
    await prisma.batch.update({
      where: { id: batchId },
      data: {
        validation_2: allPassed,
        validation_2_status: validationStatus,
      },
    });

    await markPreviousValidationErrorsDedupedForOrderBatch(batchId, batch.user.id);

    console.log(
      `[Validation 2] Batch ${batchId} completed: ${successCount} passed, ${failCount} failed - Overall: ${allPassed ? "PASSED" : "FAILED"}`
    );

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
      await prisma.batch.update({
        where: { id: batchId },
        data: { validation_2: true, validation_2_status: "passed" },
      });
      return;
    }

    const client = await prisma.client.findUnique({
      where: { id: batch.user.clientId },
      select: { exe_validation_2: true },
    });

    if (!client || !client.exe_validation_2) {
      console.log(
        `[Validation 2] Client has no execution validation_2 schema configured`
      );
      await prisma.batch.update({
        where: { id: batchId },
        data: { validation_2: true, validation_2_status: "passed" },
      });
      return;
    }

    const effectiveExeSchema = buildEffectiveLevelSchemaPreferDefaultConditions(
      defaultValidation2ExecutionConditions,
      client.exe_validation_2
    );

    // Get all executions for this batch
    const executions = await prisma.execution.findMany({ where: { batchId } });
    console.log(
      `[Validation 2] Validating ${executions.length} executions for batch ${batchId}`
    );

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
          errors: [...(result.errors || []), ...ruleErrors],
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
            let validationCodeKey = "CTX_INVALID_COMBINATION";
            const msg = error.message?.toLowerCase() || "";
            if (msg.includes("required")) {
              validationCodeKey = "REQ_MISSING_FIELD";
            } else if (msg.includes("format") || msg.includes("invalid")) {
              validationCodeKey = "FMT_INVALID_FORMAT";
            } else if (msg.includes("duplicate")) {
              validationCodeKey = "DUP_DUPLICATE_RECORD";
            } else if (msg.includes("range") || msg.includes("out of")) {
              validationCodeKey = "RNG_VALUE_OUT_OF_RANGE";
            } else if (msg.includes("enum") || msg.includes("allowed")) {
              validationCodeKey = "REF_INVALID_ENUM";
            }

            const validationCodeObj = getValidationCode(validationCodeKey);

            return {
              validationId: validation.id,
              validationCode: validationCodeObj.code,
              validationLevel: 2, // Validation 2
              field: error.field || "unknown",
              message: error.message || "Validation 2 failed",
              code: error.code || "validation_2_error",
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
    const errorLog =
      failed.length > 0
        ? JSON.stringify({
            type: "execution_validation_2",
            failedExecutions: failed.slice(0, 100),
            totalFailed: failCount,
          })
        : null;

    const validationStatus = allPassed ? "passed" : "failed";
    await prisma.batch.update({
      where: { id: batchId },
      data: {
        validation_2: allPassed,
        validation_2_status: validationStatus,
        errorLog: errorLog ?? batch.errorLog,
      },
    });

    await markPreviousValidationErrorsDedupedForExecutionBatch(batchId, batch.user.id);
    console.log(
      `[Validation 2] Execution Batch ${batchId} completed: ${successCount} passed, ${failCount} failed - Overall: ${allPassed ? "PASSED" : "FAILED"}`
    );

    return {
      batchId,
      totalExecutions: executions.length,
      successCount,
      failCount,
    };
  } catch (error) {
    console.error(`[Validation 2] Error processing execution batch ${batchId}:`, error);
    throw error;
  }
};

module.exports = {
  evaluateLevel2Rules,
  processValidation2ForBatch,
  processExecutionValidation2ForBatch,
};
