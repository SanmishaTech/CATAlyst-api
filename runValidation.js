require('dotenv').config();
const { triggerValidation } = require('./src/jobs/validationCron');

// Run validation immediately
triggerValidation()
  .then(() => {
    console.log('[Validation] Manual validation completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[Validation] Error running manual validation:', error);
    process.exit(1);
  });
