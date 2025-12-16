const app = require('./src/app');
const { initValidationCron } = require('./src/jobs/validationCron');
const { initValidation2Cron } = require('./src/jobs/validation2Cron');

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
});
