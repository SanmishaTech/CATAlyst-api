const cron = require("node-cron");
const prisma = require("../config/db");
const { processBatchValidation } = require("../services/validationService");

let isRunning = false;

/**
 * Process all pending batches that need validation
 */
const processValidationQueue = async () => {
  if (isRunning) {
    console.log("[Validation Cron] Previous job still running, skipping...");
    return;
  }

  try {
    isRunning = true;
    console.log("[Validation Cron] Starting validation check...");

    // Find all batches that need validation (validation_1 = null)
    const pendingBatches = await prisma.batch.findMany({
      where: {
        validation_1: null,
      },
      orderBy: {
        id: "asc", // Process in order by ID
      },
      take: 10, // Process max 10 batches per run to avoid overload
    });

    if (pendingBatches.length === 0) {
      console.log("[Validation Cron] No pending batches to validate");
      return;
    }

    console.log(`[Validation Cron] Found ${pendingBatches.length} batches to validate`);

    // Process each batch sequentially
    for (const batch of pendingBatches) {
      try {
        await processBatchValidation(batch.id);
      } catch (error) {
        console.error(`[Validation Cron] Error validating batch ${batch.id}:`, error.message);
        // Continue with next batch even if one fails
      }
    }

    console.log("[Validation Cron] Validation check completed");
  } catch (error) {
    console.error("[Validation Cron] Error in validation queue:", error);
  } finally {
    isRunning = false;
  }
};

/**
 * Initialize the validation cron job
 * Runs every 1 minute
 */
const initValidationCron = () => {
  // Run every 1 minute: "* * * * *"
  const job = cron.schedule("* * * * *", processValidationQueue, {
    scheduled: true,
    timezone: "UTC",
  });

  console.log("[Validation Cron] Validation cronjob initialized (runs every 1 minute)");

  return job;
};

/**
 * Manually trigger validation (useful for testing)
 */
const triggerValidation = async () => {
  console.log("[Validation Cron] Manual trigger requested");
  await processValidationQueue();
};

module.exports = {
  initValidationCron,
  triggerValidation,
  processValidationQueue,
};
