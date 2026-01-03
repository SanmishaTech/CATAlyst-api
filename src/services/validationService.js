const level1Validation = require("./validationLevel1Service");
const level2Validation = require("./validationLevel2Service");
const level3Validation = require("./validationLevel3Service");

module.exports = {
  validateOrder: level1Validation.validateOrder,
  validateExecution: level1Validation.validateExecution,
  processBatchValidation: level1Validation.processBatchValidation,
  processExecutionBatchValidation: level1Validation.processExecutionBatchValidation,
  processValidation2ForBatch: level2Validation.processValidation2ForBatch,
  processExecutionValidation2ForBatch:
    level2Validation.processExecutionValidation2ForBatch,
  processValidation3ForBatch: level3Validation.processValidation3ForBatch,
  processExecutionValidation3ForBatch:
    level3Validation.processExecutionValidation3ForBatch,
};
