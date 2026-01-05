const app = require('./src/app');
const { initValidationCron } = require('./src/jobs/validationCron');
const { initValidation2Cron } = require('./src/jobs/validation2Cron');
const { initValidation3Cron } = require('./src/jobs/validation3Cron');
const { initBusinessClassificationCron } = require('./src/jobs/businessClassificationCron');
const { initOrderCatEventCron } = require('./src/jobs/orderCatEventCron');

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  
  // Initialize validation cronjob if enabled
  if (process.env.CRON_ENABLED !== 'false') {
    initValidationCron();
  }
  
  // Initialize validation_2 cronjob if enabled
  if (process.env.CRON_VALIDATION_2_ENABLED !== 'false') {
    initValidation2Cron();
  }

  // Initialize validation_3 cronjob if enabled
  if (process.env.CRON_VALIDATION_3_ENABLED !== 'false') {
    initValidation3Cron();
  }

  // Initialize business classification cronjob if enabled
  if (process.env.CRON_BUSINESS_CLASSIFICATION_ENABLED !== 'false') {
    initBusinessClassificationCron();
  }

  // Initialize order CAT event cronjob if enabled
  if (process.env.CRON_ORDER_CAT_EVENT_ENABLED !== 'false') {
    initOrderCatEventCron();
  }
});
