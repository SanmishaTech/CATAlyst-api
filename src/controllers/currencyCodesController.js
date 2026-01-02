const ExcelJS = require("exceljs");
const prisma = require("../config/db");
const fs = require("fs").promises;

const normalizeHeader = (h) =>
  (h ? String(h) : "").toLowerCase().replace(/[^a-z0-9]/g, "");

const headerMapping = {
  clientid: "clientId",
  country: "country",
  currency: "currency",
  code: "code",
  currencycode: "code",
};

const fieldMaxLengths = {
  clientId: 128,
  country: 128,
  currency: 128,
  code: 16,
};

const isEmptyRecord = (obj) => {
  const keys = Object.keys(obj).filter((k) => k !== "clientRefId");
  return keys.every(
    (k) => obj[k] === undefined || obj[k] === null || obj[k] === ""
  );
};

async function uploadCurrencyCodes(req, res, next) {
  const clientId = parseInt(req.params.id);
  let filePath;
  try {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return res.status(404).json({ errors: { message: "Client not found." } });
    }

    if (!req.file) {
      return res.status(400).json({
        errors: { message: "No file uploaded. Use field name 'file'." },
      });
    }

    filePath = req.file.path;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      return res
        .status(400)
        .json({ errors: { message: "Excel file is empty or invalid." } });
    }

    const headers = [];
    worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell) => {
      headers.push(normalizeHeader(cell.value));
    });

    const colToField = {};
    headers.forEach((h, idx) => {
      if (headerMapping[h]) {
        colToField[idx + 1] = headerMapping[h];
      }
    });

    const records = [];
    const errors = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const rec = { clientRefId: clientId };

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const field = colToField[colNumber];
        if (!field) return;
        const raw = cell.value;

        if (raw !== null && raw !== undefined && raw !== "") {
          const str = String(raw);
          const max = fieldMaxLengths[field];
          if (max && str.length > max) {
            errors.push({
              row: rowNumber,
              field,
              message: `Value too long for ${field} (max ${max}): length ${str.length}`,
            });
            return;
          }
          rec[field] = str;
        }
      });

      if (!isEmptyRecord(rec)) {
        records.push(rec);
      }
    });

    if (errors.length > 0) {
      // eslint-disable-next-line no-console
      console.error("Currency Codes import validation errors:", errors);
      return res.status(400).json({
        errors: {
          message: "Validation failed for one or more rows",
          details: errors,
        },
      });
    }

    let inserted = 0;
    if (records.length > 0) {
      const result = await prisma.currencyCode.createMany({ data: records });
      inserted = result.count || 0;
    }

    return res.status(201).json({
      message: "CurrencyCode records imported successfully",
      total: records.length,
      inserted,
      failed: Math.max(0, records.length - inserted),
      errors,
    });
  } catch (err) {
    return next(err);
  } finally {
    if (filePath) {
      await fs.unlink(filePath).catch(() => {});
    }
  }
}

module.exports = {
  uploadCurrencyCodes,
};
