const cron = require("node-cron");
const prisma = require("../config/db");
const { CatEvent } = require("../constants/catEnums");

let isRunning = false;

// Process pending OrderBusinessClassification records and create OrderCatEvent when criteria match
const processOrderCatEventQueue = async () => {
  if (isRunning) {
    console.log("[OrderCatEvent Cron] Previous job still running, skipping...");
    return;
  }

  isRunning = true;
  try {
    console.log("[OrderCatEvent Cron] Starting scan...");

    const take = parseInt(process.env.CRON_ORDER_CAT_EVENT_BATCH) || 100;

    // Find candidate classifications with no existing events, matching any of the 3 rules
    const classifications = await prisma.orderBusinessClassification.findMany({
      where: {
        OR: [
          // MEOA-specific conditions to include in scan
          {
            businessClassification: "Client Type",
            businessGroup: "US Broker Dealer - FINRA Member",
          },
          {
            businessClassification: "Order Edge",
            businessGroup: "Client Facing",
          },
          // 1) Client Type AND (businessGroup IS NULL OR US Broker Dealer - Non FINRA Member)
          {
            businessClassification: "Client Type",
            OR: [
              { businessGroup: null },
              { businessGroup: "US Broker Dealer - Non FINRA Member" },
            ],
          },
          // 2) Order Edge AND Client Facing
          {
            businessClassification: "Order Edge",
            OR: [
              { businessGroup: "Client Facing" },
              { businessGroup: "Principal" },
            ],
          },
          // 3) Representative Order (any group)
          {
            businessClassification: "Representative Order",
          },
        ],
        orderCatEvents: { none: {} },
      },
      select: {
        id: true,
        uniqueID: true,
        orderId: true,
        businessClassification: true,
        businessGroup: true,
        order: {
          select: {
            id: true,
            uniqueID: true,
            orderIdInstance: true,
          },
        },
      },
      take,
      orderBy: { id: "asc" },
    });

    if (!classifications.length) {
      console.log("[OrderCatEvent Cron] No eligible classifications found");
      return;
    }

    let createdCount = 0;

    for (const cls of classifications) {
      try {
        const order = cls.order;
        if (!order) {
          continue;
        }

        // Guard again idempotently in case of race
        const exists = await prisma.orderCatEvent.findFirst({
          where: { orderBusinessClassificationId: cls.id },
          select: { id: true },
        });
        if (exists) continue;

        // Decide CAT event: if MEOA conditions match -> MEOA (2), else MENO (1)
        const isMEOA =
          (cls.businessClassification === "Client Type" &&
            cls.businessGroup === "US Broker Dealer - FINRA Member") ||
          (cls.businessClassification === "Order Edge" &&
            cls.businessGroup === "Client Facing");
        const catEvent =
          (isMEOA ? CatEvent?.[2] : CatEvent?.[1]) ||
          process.env.DEFAULT_ORDER_CAT_EVENT ||
          (isMEOA ? "MEOA" : "MENO");

        await prisma.orderCatEvent.create({
          data: {
            orderBusinessClassificationId: cls.id,
            uniqueID: order.uniqueID || cls.uniqueID,
            orderRefId: order.id,
            orderIdInstance: order.orderIdInstance || 0,
            catEvent,
          },
        });

        createdCount += 1;
      } catch (err) {
        console.error(
          "[OrderCatEvent Cron] Error processing classification",
          cls?.id,
          err?.message
        );
      }
    }

    console.log(
      `[OrderCatEvent Cron] Completed. Created ${createdCount} order cat events`
    );
  } catch (err) {
    console.error("[OrderCatEvent Cron] Error in queue:", err);
  } finally {
    isRunning = false;
  }
};

const initOrderCatEventCron = () => {
  const intervalMinutes =
    parseInt(process.env.CRON_ORDER_CAT_EVENT_MINUTES) || 1;
  let cronExpression;
  if (intervalMinutes <= 30) {
    cronExpression = `*/${intervalMinutes} * * * *`;
  } else {
    const hours = Math.ceil(intervalMinutes / 60);
    cronExpression = `0 */${hours} * * *`;
  }

  const job = cron.schedule(cronExpression, processOrderCatEventQueue, {
    scheduled: true,
    timezone: "UTC",
  });

  console.log(
    `[OrderCatEvent Cron] Initialized (runs every ${intervalMinutes} minutes)`
  );
  return job;
};

const triggerOrderCatEvent = async () => {
  console.log("[OrderCatEvent Cron] Manual trigger requested");
  await processOrderCatEventQueue();
};

module.exports = {
  initOrderCatEventCron,
  triggerOrderCatEvent,
  processOrderCatEventQueue,
};
