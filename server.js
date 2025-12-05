const app = require('./src/app');
const { initValidationCron } = require('./src/jobs/validationCron');

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  
  // Initialize validation cronjob if enabled
  if (process.env.CRON_ENABLED !== 'false') {
    initValidationCron();
  }
});
