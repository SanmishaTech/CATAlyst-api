const prisma = require("../config/db");

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

module.exports = {
  markPreviousValidationErrorsDedupedForOrderBatch,
  markPreviousValidationErrorsDedupedForExecutionBatch,
};
