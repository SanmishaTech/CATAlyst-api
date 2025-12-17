const cron = require("node-cron");
const prisma = require("../config/db");
const {
  processValidation3ForBatch,
  processExecutionValidation3ForBatch,
} = require("../services/validationService");

let isRunning = false;

/**
 * Process all pending batches that need validation_3
 * Only processes batches where validation_2_status = 'passed' and validation_3 is null
 */
const processValidation3Queue = async () => {
  if (isRunning) {
    console.log("[Validation 3 Cron] Previous job still running, skipping...");
    return;
  }

  try {
    isRunning = true;
    console.log("[Validation 3 Cron] Starting validation_3 check...");

    const pendingBatches = await prisma.batch.findMany({
      where: {
        validation_2_status: "passed", // Level-2 passed
        validation_3: null, // not validated yet
      },
      include: {
        user: {
          select: {
            id: true,
            clientId: true,
          },
        },
      },
      orderBy: { id: "asc" },
      take: 10, // limit each run
    });

    if (pendingBatches.length === 0) {
      console.log("[Validation 3 Cron] No pending batches to validate");
      return;
    }

    console.log(
      `[Validation 3 Cron] Found ${pendingBatches.length} batches to validate`
    );

    for (const batch of pendingBatches) {
      try {
        if (batch.fileType === "execution") {
          await processExecutionValidation3ForBatch(batch.id, batch);
        } else {
          await processValidation3ForBatch(batch.id);
        }
      } catch (err) {
        console.error(
          `[Validation 3 Cron] Error validating batch ${batch.id}:`,
          err.message
        );
      }
    }

    console.log("[Validation 3 Cron] Validation_3 check completed");
  } catch (error) {
    console.error("[Validation 3 Cron] Error in validation_3 queue:", error);
  } finally {
    isRunning = false;
  }
};

/**
 * Initialize the validation_3 cron job.
 * Interval controlled by CRON_VALIDATION_3_INTERVAL_MINUTES (default 5)
 */
const initValidation3Cron = () => {
  const intervalMinutes =
    parseInt(process.env.CRON_VALIDATION_3_INTERVAL_MINUTES) || 5;
  let cronExpression;
  if (intervalMinutes <= 30) {
    cronExpression = `*/${intervalMinutes} * * * *`;
  } else {
    const hours = Math.ceil(intervalMinutes / 60);
    cronExpression = `0 */${hours} * * *`;
  }

  const job = cron.schedule(cronExpression, processValidation3Queue, {
    scheduled: true,
    timezone: "UTC",
  });

  console.log(
    `[Validation 3 Cron] Validation_3 cronjob initialized (runs every ${intervalMinutes} minutes)`
  );

  return job;
};

/**
 * Manual trigger for testing.
 */
const triggerValidation3 = async () => {
  console.log("[Validation 3 Cron] Manual trigger requested");
  await processValidation3Queue();
};

module.exports = {
  initValidation3Cron,
  triggerValidation3,
  processValidation3Queue,
};
