const ExcelJS = require("exceljs");
const prisma = require("../config/db");
const fs = require("fs").promises;

const normalizeHeader = (h) =>
  (h ? String(h) : "").toLowerCase().replace(/[^a-z0-9]/g, "");

// Map normalized Excel headers to DB fields
const headerMapping = {
  // IDs and identifiers
  instrumentid: "instrumentId", // INSTRUMENT_ID
  symbol: "symbol", // SYMBOL
  description: "description", // DESCRIPTION
  cficode: "cfiCode", // CFI_CODE
  ticker: "ticker", // TICKER
  country: "country", // COUNTRY
  tradecurrency: "tradeCurrency", // TRADE_CURRENCY
  osisymbol: "osiSymbol", // OSI SYMBOL
  finraticker: "finraTicker", // FINRA TICKER
  typecode: "typeCode", // TYPECODE

  // Exercise type (cover correct and common misspelling)
  exercisetype: "exerciseType", // EXERCISE_TYPE
  excercisetype: "exerciseType", // EXCERCISE_TYPE (typo in sheet)

  // Prices and numerics
  strikeprice: "strikePrice", // STRIKEPRICE
  contractsize: "contractSize", // CONTRACTSIZE

  // Other strings
  placement: "placement", // PLACEMENT
  isin: "isin", // ISIN
  cusp: "cusp", // CUSP
  sedol: "sedol", // SEDOL
  bbgcodefigi: "bbgcodeFigi", // BBGCODE_FIGI
  ric: "ric", // RIC
  underlyingsymbol: "underlyingSymbol", // UNDERLYING SYMBOL

  // Dates
  expirationdate: "expirationDate", // EXPIRATIONDATE
  validfrom: "validFrom", // VALIDFROM
  validto: "validTo", // VALIDTO
  valiadto: "validTo", // VALIADTO (typo in sheet)

  // Boolean
  active: "active", // ACTIVE
};

const dateFields = new Set(["expirationDate", "validFrom", "validTo"]);
const decimalFields = new Set(["strikePrice"]);
const intFields = new Set(["contractSize"]);
const booleanFields = new Set(["active"]);

// Max lengths aligned with Prisma schema
const fieldMaxLengths = {
  instrumentId: 128,
  symbol: 128,
  description: 255,
  cfiCode: 32,
  ticker: 64,
  country: 64,
  tradeCurrency: 32,
  osiSymbol: 128,
  finraTicker: 128,
  typeCode: 64,
  exerciseType: 32,
  placement: 128,
  isin: 32,
  cusp: 32,
  sedol: 32,
  bbgcodeFigi: 64,
  ric: 64,
  underlyingSymbol: 128,
};

const parseBoolean = (v) => {
  if (v === null || v === undefined || v === "") return undefined;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (["true", "yes", "y", "1"].includes(s)) return true;
  if (["false", "no", "n", "0"].includes(s)) return false;
  return undefined;
};

const parseDate = (v) => {
  if (v === null || v === undefined || v === "") return undefined;
  if (v instanceof Date) {
    const y = v.getUTCFullYear();
    const m = v.getUTCMonth();
    const d = v.getUTCDate();
    if (y >= 0 && y < 100) return new Date(Date.UTC(2000 + y, m, d));
    return v;
  }
  if (typeof v === "number" && isFinite(v)) {
    const serial = v;
    const excelEpoch = Date.UTC(1899, 11, 30);
    const days = serial >= 60 ? serial - 1 : serial;
    return new Date(excelEpoch + days * 86400000);
  }
  const s = String(v).trim();
  const monthMap = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  };
  let m = s.match(/^(\d{1,2})[\s\/-]+([A-Za-z]{3}),?[\s\/-]+(\d{2})$/i);
  if (m) {
    const day = parseInt(m[1], 10);
    const mon = monthMap[m[2].toLowerCase()];
    const yy = parseInt(m[3], 10);
    if (mon !== undefined) return new Date(Date.UTC(2000 + yy, mon, day));
  }
  m = s.match(/^(\d{1,2})[\s\/-]+([A-Za-z]{3}),?[\s\/-]+(\d{4})$/i);
  if (m) {
    const day = parseInt(m[1], 10);
    const mon = monthMap[m[2].toLowerCase()];
    const yyyy = parseInt(m[3], 10);
    if (mon !== undefined) return new Date(Date.UTC(yyyy, mon, day));
  }
  m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const mon = parseInt(m[2], 10) - 1;
    const yy = parseInt(m[3], 10);
    if (mon >= 0 && mon <= 11) return new Date(Date.UTC(2000 + yy, mon, day));
  }
  m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const mon = parseInt(m[2], 10) - 1;
    const yyyy = parseInt(m[3], 10);
    if (mon >= 0 && mon <= 11) return new Date(Date.UTC(yyyy, mon, day));
  }
  const ms = Date.parse(s);
  if (!isNaN(ms)) {
    const d = new Date(ms);
    const y = d.getUTCFullYear();
    if (y >= 0 && y < 100)
      return new Date(Date.UTC(2000 + y, d.getUTCMonth(), d.getUTCDate()));
    return d;
  }
  return undefined;
};

// Strict MM/DD/YYYY (strings), plus Excel Date/serials
const parseDateMMDDYYYY = (v) => {
  if (v === null || v === undefined || v === "") return undefined;
  if (v instanceof Date) {
    const y = v.getUTCFullYear();
    const m = v.getUTCMonth();
    const d = v.getUTCDate();
    if (y >= 0 && y < 100) return new Date(Date.UTC(2000 + y, m, d));
    return v;
  }
  if (typeof v === "number" && isFinite(v)) {
    const serial = v;
    const excelEpoch = Date.UTC(1899, 11, 30);
    const days = serial >= 60 ? serial - 1 : serial;
    return new Date(excelEpoch + days * 86400000);
  }
  const s = String(v).trim();
  const m = s.match(
    /^([0][1-9]|1[0-2]|[1-9])\/([0][1-9]|[12][0-9]|3[01]|[1-9])\/(\d{4})$/
  );
  if (m) {
    const month = parseInt(m[1], 10) - 1;
    const day = parseInt(m[2], 10);
    const year = parseInt(m[3], 10);
    if (month >= 0 && month <= 11) return new Date(Date.UTC(year, month, day));
  }
  return undefined;
};

// Strict timestamp YYYY-MM-DD HH:MM:SS (or 'T' separator), plus Excel Date/serials
const parseDateTimestamp = (v) => {
  if (v === null || v === undefined || v === "") return undefined;
  if (v instanceof Date) return v;
  if (typeof v === "number" && isFinite(v)) {
    const serial = v;
    const excelEpoch = Date.UTC(1899, 11, 30);
    const days = serial >= 60 ? serial - 1 : serial;
    return new Date(excelEpoch + days * 86400000);
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);
  if (m) {
    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    const day = parseInt(m[3], 10);
    const hh = parseInt(m[4], 10);
    const mm = parseInt(m[5], 10);
    const ss = parseInt(m[6], 10);
    if (month >= 0 && month <= 11)
      return new Date(Date.UTC(year, month, day, hh, mm, ss));
  }
  return undefined;
};

const parseDecimal = (v) => {
  if (v === null || v === undefined || v === "") return undefined;
  if (typeof v === "number") return v;
  const n = Number(String(v).trim());
  return isNaN(n) ? undefined : n;
};

const parseIntSafe = (v) => {
  if (v === null || v === undefined || v === "") return undefined;
  if (typeof v === "number") return Math.trunc(v);
  const n = parseInt(String(v).trim(), 10);
  return isNaN(n) ? undefined : n;
};

async function uploadInstrumentsMapping(req, res, next) {
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
      if (headerMapping[h]) colToField[idx + 1] = headerMapping[h];
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

        if (booleanFields.has(field)) {
          const parsed = parseBoolean(raw);
          const present = !(raw === null || raw === undefined || raw === "");
          if (present && parsed === undefined) {
            errors.push({
              row: rowNumber,
              field,
              message: `Invalid boolean for ${field}: '${raw}'`,
            });
            return;
          }
          if (parsed !== undefined) rec[field] = parsed;
          return;
        }

        if (dateFields.has(field)) {
          const parsed =
            field === "expirationDate"
              ? parseDateTimestamp(raw)
              : parseDateMMDDYYYY(raw);
          const present = !(raw === null || raw === undefined || raw === "");
          if (present && parsed === undefined) {
            const fmt =
              field === "expirationDate" ? "YYYY-MM-DD HH:MM:SS" : "MM/DD/YYYY";
            errors.push({
              row: rowNumber,
              field,
              message: `Invalid date for ${field}: '${raw}' (expected ${fmt})`,
            });
            return;
          }
          if (parsed !== undefined) {
            rec[field] = parsed;
          }
          return;
        }

        if (decimalFields.has(field)) {
          const parsed = parseDecimal(raw);
          const present = !(raw === null || raw === undefined || raw === "");
          if (present && parsed === undefined) {
            errors.push({
              row: rowNumber,
              field,
              message: `Invalid decimal for ${field}: '${raw}'`,
            });
            return;
          }
          if (parsed !== undefined) rec[field] = parsed;
          return;
        }

        if (intFields.has(field)) {
          const parsed = parseIntSafe(raw);
          const present = !(raw === null || raw === undefined || raw === "");
          if (present && parsed === undefined) {
            errors.push({
              row: rowNumber,
              field,
              message: `Invalid integer for ${field}: '${raw}'`,
            });
            return;
          }
          if (parsed !== undefined) rec[field] = parsed;
          return;
        }

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

      // Only push non-empty rows
      const keys = Object.keys(rec).filter((k) => k !== "clientRefId");
      const isEmpty = keys.every(
        (k) => rec[k] === undefined || rec[k] === null || rec[k] === ""
      );
      if (!isEmpty) records.push(rec);
    });

    if (errors.length > 0) {
      // eslint-disable-next-line no-console
      console.error("Instruments Mapping import validation errors:", errors);
      return res.status(400).json({
        errors: {
          message: "Validation failed for one or more rows",
          details: errors,
        },
      });
    }

    let inserted = 0;
    if (records.length > 0) {
      const result = await prisma.$transaction(async (tx) => {
        const r = await tx.instrumentsMapping.createMany({ data: records });
        return r;
      });
      inserted = result.count || 0;
    }

    return res.status(201).json({
      message: "Instruments Mapping records imported successfully",
      total: records.length,
      inserted,
      failed: Math.max(0, records.length - inserted),
      errors: [],
    });
  } catch (err) {
    return next(err);
  } finally {
    if (filePath) await fs.unlink(filePath).catch(() => {});
  }
}

module.exports = { uploadInstrumentsMapping };
