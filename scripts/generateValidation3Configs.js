const fs = require('fs');
const path = require('path');

/**
 * Utility to convert a snake_case or SCREAMING_SNAKE_CASE field name
 * (e.g. Order_Client_Ref) to camelCase (orderClientRef)
 */
function toCamelCase(str) {
  return str
    .toLowerCase()
    .split('_')
    .map((word, idx) => (idx === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join('');
}

// Parse markdown table into array of { type: 'order' | 'execution', fieldName, condition }
function parseMarkdownTables(mdContent) {
  const lines = mdContent.split(/\r?\n/);
  const records = [];
  let currentType = null;
  let inTable = false;

  for (const line of lines) {
    if (line.startsWith('## Order Object')) {
      currentType = 'order';
      inTable = false;
      continue;
    }
    if (line.startsWith('## Execution Object')) {
      currentType = 'execution';
      inTable = false;
      continue;
    }

    // Detect header row start of table (starts with | Field Name)
    if (currentType && line.trim().startsWith('| Field Name')) {
      inTable = true;
      continue;
    }

    // Skip separator row (|----)
    if (inTable && /^\|[-\s]+\|/.test(line.trim())) {
      continue;
    }

    if (inTable) {
      if (!line.trim().startsWith('|')) {
        // End of table when we stop seeing pipe lines
        inTable = false;
        continue;
      }
      const cols = line.split('|').map((c) => c.trim());
      const fieldName = cols[1];
      const condition = cols[2] || '-';
      records.push({ type: currentType, fieldName, condition });
    }
  }
  return records;
}

function generateConfigObject(records, objType) {
  return records
    .filter((r) => r.type === objType && r.condition && r.condition !== '-' && r.condition.length > 0)
    .reduce((acc, rec) => {
      const camelName = toCamelCase(rec.fieldName);
      acc[camelName] = {
        enabled: true,
        condition: rec.condition,
        required: true, // reference data checks are required
      };
      return acc;
    }, {});
}

function main() {
  const mdPath = path.resolve(__dirname, '../../docs/object_mapping.md');
  if (!fs.existsSync(mdPath)) {
    console.error('Markdown file not found:', mdPath);
    process.exit(1);
  }
  const mdContent = fs.readFileSync(mdPath, 'utf-8');
  const records = parseMarkdownTables(mdContent);

  const orderConfig = generateConfigObject(records, 'order');
  const executionConfig = generateConfigObject(records, 'execution');

  const banner = (
    type
  ) => `/**\n * Auto-generated Validation 3 ${type} Conditions Configuration\n * Run scripts/generateValidation3Configs.js to update.\n * Do not edit manually.\n */\n`;

  const orderConfigPath = path.resolve(__dirname, '../src/config/validation3OrderConditions.js');
  const executionConfigPath = path.resolve(__dirname, '../src/config/validation3ExecutionConditions.js');

  fs.writeFileSync(
    orderConfigPath,
    banner('Order') + '\nmodule.exports = ' + JSON.stringify(orderConfig, null, 2) + ';\n'
  );
  fs.writeFileSync(
    executionConfigPath,
    banner('Execution') + '\nmodule.exports = ' + JSON.stringify(executionConfig, null, 2) + ';\n'
  );

  console.log('Generated:');
  console.log('-', orderConfigPath);
  console.log('-', executionConfigPath);
}

if (require.main === module) {
  main();
}
