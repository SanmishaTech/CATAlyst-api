const cron = require("node-cron");
const prisma = require("../config/db");
const { processValidation2ForBatch } = require("../services/validationService");

let isRunning = false;

/**
 * Process all pending batches that need validation_2
 * Only processes batches where validation_1 = true and validation_2 = null
 */
const processValidation2Queue = async () => {
  if (isRunning) {
    console.log("[Validation 2 Cron] Previous job still running, skipping...");
    return;
  }

  try {
    isRunning = true;
    console.log("[Validation 2 Cron] Starting validation_2 check...");

    // Find all batches that passed validation_1 and need validation_2
    const pendingBatches = await prisma.batch.findMany({
      where: {
        validation_1_status: 'passed', // Only process batches with validation_1_status = 'passed'
        validation_2: null, // Not yet validated with validation_2
      },
      include: {
        user: {
          select: {
            id: true,
            clientId: true,
          },
        },
      },
      orderBy: {
        id: "asc", // Process in order by ID
      },
      take: 10, // Process max 10 batches per run to avoid overload
    });

    if (pendingBatches.length === 0) {
      console.log("[Validation 2 Cron] No pending batches to validate");
      return;
    }

    console.log(`[Validation 2 Cron] Found ${pendingBatches.length} batches to validate`);

    // Process each batch sequentially
    for (const batch of pendingBatches) {
      try {
        await processValidation2ForBatch(batch.id);
      } catch (error) {
        console.error(`[Validation 2 Cron] Error validating batch ${batch.id}:`, error.message);
        // Continue with next batch even if one fails
      }
    }

    console.log("[Validation 2 Cron] Validation_2 check completed");
  } catch (error) {
    console.error("[Validation 2 Cron] Error in validation_2 queue:", error);
  } finally {
    isRunning = false;
  }
};

/**
 * Initialize the validation_2 cron job
 * Runs at interval specified by CRON_VALIDATION_2_INTERVAL_MINUTES env variable (default: 5 minutes)
 */
const initValidation2Cron = () => {
  const intervalMinutes = parseInt(process.env.CRON_VALIDATION_2_INTERVAL_MINUTES) || 5;
  
  // Build cron expression based on interval
  // For intervals <= 30 minutes, use: */N * * * * (every N minutes)
  // For intervals > 30 minutes, use: 0 */N * * * (every N hours)
  let cronExpression;
  if (intervalMinutes <= 30) {
    cronExpression = `*/${intervalMinutes} * * * *`;
  } else {
    const hours = Math.ceil(intervalMinutes / 60);
    cronExpression = `0 */${hours} * * *`;
  }
  
  const job = cron.schedule(cronExpression, processValidation2Queue, {
    scheduled: true,
    timezone: "UTC",
  });

  console.log(`[Validation 2 Cron] Validation_2 cronjob initialized (runs every ${intervalMinutes} minutes)`);

  return job;
};

/**
 * Manually trigger validation_2 (useful for testing)
 */
const triggerValidation2 = async () => {
  console.log("[Validation 2 Cron] Manual trigger requested");
  await processValidation2Queue();
};

module.exports = {
  initValidation2Cron,
  triggerValidation2,
  processValidation2Queue,
};
