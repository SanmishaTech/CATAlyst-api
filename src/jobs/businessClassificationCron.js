const cron = require("node-cron");
const prisma = require("../config/db");
const {
  classifyOrdersForBatch,
  classifyExecutionsForBatch,
} = require("../services/businessClassificationService");

let isRunning = false;

/**
 * Process all batches that have passed Validation 3 and need business classification refresh.
 * Criteria:
 *  - validation_3_status = 'passed'
 *  - validation_3 = true (completed)
 *  - classification pending or just needs refresh (we run idempotently)
 */
const processBusinessClassificationQueue = async () => {
  if (isRunning) {
    console.log("[Business Classification Cron] Previous job still running, skipping...");
    return;
  }

  try {
    isRunning = true;
    console.log("[Business Classification Cron] Starting classification refresh...");

    const pendingBatches = await prisma.batch.findMany({
      where: {
        validation_3_status: "passed",
        validation_3: true,
      },
      select: { id: true, fileType: true },
      orderBy: { id: "asc" },
      take: 10,
    });

    if (!pendingBatches.length) {
      console.log("[Business Classification Cron] No eligible batches found");
      return;
    }

    for (const batch of pendingBatches) {
      try {
        if (batch.fileType === "execution") {
          await classifyExecutionsForBatch(batch.id);
        } else {
          await classifyOrdersForBatch(batch.id);
        }
        console.log(`[Business Classification Cron] Classified batch ${batch.id} (${batch.fileType || 'order'})`);
      } catch (err) {
        console.error(`[Business Classification Cron] Error classifying batch ${batch.id}:`, err.message);
      }
    }

    console.log("[Business Classification Cron] Classification refresh completed");
  } catch (err) {
    console.error("[Business Classification Cron] Error in queue:", err);
  } finally {
    isRunning = false;
  }
};

/**
 * Initialize business classification cron
 * Interval controlled by CRON_BUSINESS_CLASSIFICATION_MINUTES (default 10 minutes)
 */
const initBusinessClassificationCron = () => {
  const intervalMinutes = parseInt(process.env.CRON_BUSINESS_CLASSIFICATION_MINUTES) || 10;
  let cronExpression;
  if (intervalMinutes <= 30) {
    cronExpression = `*/${intervalMinutes} * * * *`;
  } else {
    const hours = Math.ceil(intervalMinutes / 60);
    cronExpression = `0 */${hours} * * *`;
  }

  const job = cron.schedule(cronExpression, processBusinessClassificationQueue, {
    scheduled: true,
    timezone: "UTC",
  });

  console.log(
    `[Business Classification Cron] Initialized (runs every ${intervalMinutes} minutes)`
  );

  return job;
};

/**
 * Manual trigger (useful for testing)
 */
const triggerBusinessClassification = async () => {
  console.log("[Business Classification Cron] Manual trigger requested");
  await processBusinessClassificationQueue();
};

module.exports = {
  initBusinessClassificationCron,
  triggerBusinessClassification,
  processBusinessClassificationQueue,
};
