const createError = require("http-errors");
const ExcelJS = require("exceljs");
const prisma = require("../config/db");
const validateRequest = require("../utils/validateRequest");
const { z } = require("zod");

const getClients = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const active =
    req.query.active === "true"
      ? true
      : req.query.active === "false"
      ? false
      : undefined;
  const sortBy = req.query.sortBy || "id";
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";
  const exportToExcel = req.query.export === "true";

  const whereClause = {
    AND: [
      {
        OR: [
          { name: { contains: search } },
          { entityName: { contains: search } },
          { contactEmailId: { contains: search } },
        ],
      },
      active !== undefined ? { active } : {},
    ],
  };

  try {
    let clients = await prisma.client.findMany({
      select: {
        id: true,
        name: true,
        entityName: true,
        address: true,
        legalAddress: true,
        taxOrEinNumber: true,
        mpid: true,
        lei: true,
        catReporterImid: true,
        catSubmitterImid: true,
        contactPersonName: true,
        contactNumber: true,
        contactEmailId: true,
        serviceEmailId: true,
        catEnabled: true,
        sixZeroFiveEnabled: true,
        loprEnabled: true,
        supportEscalationContact: true,
        dataSpecificationModel: true,
        configurationPlaceholder: true,
        configurationPlaceholder1: true,
        configurationPlaceholder2: true,
        placeholderColumn1: true,
        placeholderColumn2: true,
        placeholderColumn3: true,
        placeholderColumn4: true,
        placeholderColumn5: true,
        placeholderColumn6: true,
        placeholderColumn7: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { users: true },
        },
      },
      where: whereClause,
      skip: exportToExcel ? undefined : skip,
      take: exportToExcel ? undefined : limit,
      orderBy: exportToExcel ? undefined : { [sortBy]: sortOrder },
    });

    if (exportToExcel) {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Clients");

      worksheet.columns = [
        { header: "ID", key: "id", width: 10 },
        { header: "Name", key: "name", width: 30 },
        { header: "Entity Name", key: "entityName", width: 30 },
        { header: "Contact Person", key: "contactPersonName", width: 25 },
        { header: "Contact Email", key: "contactEmailId", width: 30 },
        { header: "Contact Number", key: "contactNumber", width: 20 },
        { header: "Active", key: "active", width: 10 },
        { header: "Total Users", key: "userCount", width: 15 },
      ];

      clients.forEach((client) => {
        worksheet.addRow({
          id: client.id,
          name: client.name,
          entityName: client.entityName,
          contactPersonName: client.contactPersonName,
          contactEmailId: client.contactEmailId,
          contactNumber: client.contactNumber,
          active: client.active ? "Yes" : "No",
          userCount: client._count.users,
        });
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", "attachment; filename=clients.xlsx");

      await workbook.xlsx.write(res);
      return res.end();
    }

    const totalClients = await prisma.client.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalClients / limit);

    res.json({
      clients,
      page,
      totalPages,
      totalClients,
    });
  } catch (error) {
    next(error);
  }
};

const getClientById = async (req, res, next) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });
    if (!client) {
      return res.status(404).json({
        errors: { message: "Client not found." },
      });
    }
    res.json(client);
  } catch (error) {
    return res.status(500).json({
      errors: { message: "Failed to fetch client", details: error.message },
    });
  }
};

const createClient = async (req, res, next) => {
  const schema = z.object({
    // Login credentials (required)
    email: z
      .string()
      .email("Invalid email format.")
      .min(1, "Email is required for login."),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters.")
      .max(100, "Password must not exceed 100 characters."),
    // Client business information
    name: z
      .string()
      .min(1, "Name is required.")
      .max(100, "Name must not exceed 100 characters."),
    entityName: z.string().optional(),
    address: z.string().optional(),
    legalAddress: z.string().optional(),
    taxOrEinNumber: z.string().optional(),
    mpid: z.string().optional(),
    lei: z.string().optional(),
    catReporterImid: z.string().optional(),
    catSubmitterImid: z.string().optional(),
    contactPersonName: z.string().optional(),
    contactNumber: z.string().optional(),
    contactEmailId: z.string().email("Invalid email format.").optional().or(z.literal("")),
    serviceEmailId: z.string().email("Invalid email format.").optional().or(z.literal("")),
    catEnabled: z.boolean().optional(),
    sixZeroFiveEnabled: z.boolean().optional(),
    loprEnabled: z.boolean().optional(),
    supportEscalationContact: z.string().email("Invalid email format.").optional().or(z.literal("")),
    dataSpecificationModel: z.string().optional(),
    configurationPlaceholder: z.string().optional(),
    configurationPlaceholder1: z.string().optional(),
    configurationPlaceholder2: z.string().optional(),
    placeholderColumn1: z.string().optional(),
    placeholderColumn2: z.string().optional(),
    placeholderColumn3: z.string().optional(),
    placeholderColumn4: z.string().optional(),
    placeholderColumn5: z.string().optional(),
    placeholderColumn6: z.string().optional(),
    placeholderColumn7: z.string().optional(),
    active: z.boolean().optional(),
  });

  const validationErrors = await validateRequest(schema, req.body, res);

  try {
    const { email, password, ...clientData } = req.body;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        errors: { email: "Email already exists." },
      });
    }

    // Create client and user in a transaction
    const bcrypt = require("bcrypt");
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      // Create the client
      const client = await tx.client.create({
        data: clientData,
      });

      // Create the user with login credentials
      const user = await tx.user.create({
        data: {
          name: clientData.name,
          email: email,
          password: hashedPassword,
          role: "client",
          clientId: client.id,
          active: true,
        },
      });

      return { client, user };
    });

    // Return client data with user info (excluding password)
    res.status(201).json({
      ...result.client,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateClient = async (req, res, next) => {
  const schema = z.object({
    name: z
      .string()
      .min(1, "Name is required.")
      .max(100, "Name must not exceed 100 characters.")
      .optional(),
    entityName: z.string().optional(),
    address: z.string().optional(),
    legalAddress: z.string().optional(),
    taxOrEinNumber: z.string().optional(),
    mpid: z.string().optional(),
    lei: z.string().optional(),
    catReporterImid: z.string().optional(),
    catSubmitterImid: z.string().optional(),
    contactPersonName: z.string().optional(),
    contactNumber: z.string().optional(),
    contactEmailId: z.string().email("Invalid email format.").optional().or(z.literal("")),
    serviceEmailId: z.string().email("Invalid email format.").optional().or(z.literal("")),
    catEnabled: z.boolean().optional(),
    sixZeroFiveEnabled: z.boolean().optional(),
    loprEnabled: z.boolean().optional(),
    supportEscalationContact: z.string().email("Invalid email format.").optional().or(z.literal("")),
    dataSpecificationModel: z.string().optional(),
    configurationPlaceholder: z.string().optional(),
    configurationPlaceholder1: z.string().optional(),
    configurationPlaceholder2: z.string().optional(),
    placeholderColumn1: z.string().optional(),
    placeholderColumn2: z.string().optional(),
    placeholderColumn3: z.string().optional(),
    placeholderColumn4: z.string().optional(),
    placeholderColumn5: z.string().optional(),
    placeholderColumn6: z.string().optional(),
    placeholderColumn7: z.string().optional(),
    active: z.boolean().optional(),
  });

  const validationErrors = await validateRequest(schema, req.body, res);

  try {
    const updatedClient = await prisma.client.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json(updatedClient);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        errors: { message: "Client not found" },
      });
    }
    next(error);
  }
};

const deleteClient = async (req, res, next) => {
  try {
    await prisma.client.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: "Client deleted" });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        errors: { message: "Client not found" },
      });
    }
    next(error);
  }
};

const setActiveStatus = async (req, res, next) => {
  const schema = z.object({
    active: z.boolean({
      required_error: "Active status is required.",
      invalid_type_error: "Active status must be a boolean.",
    }),
  });

  const validationErrors = await validateRequest(schema, req.body, res);

  try {
    const updatedClient = await prisma.client.update({
      where: { id: parseInt(req.params.id) },
      data: { active: req.body.active },
    });
    res.json(updatedClient);
  } catch (error) {
    next(error);
  }
};

const getValidationSchema = async (req, res, next) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: parseInt(req.params.id) },
      select: { validation_1: true },
    });
    
    if (!client) {
      return res.status(404).json({
        errors: { message: "Client not found." },
      });
    }
    
    res.json({
      schema: client.validation_1 || null,
    });
  } catch (error) {
    next(error);
  }
};

const updateValidationSchema = async (req, res, next) => {
  const schema = z.object({
    schema: z.record(z.any()),
  });

  const validationErrors = await validateRequest(schema, req.body, res);

  try {
    const updatedClient = await prisma.client.update({
      where: { id: parseInt(req.params.id) },
      data: { validation_1: req.body.schema },
    });
    
    // Record history
    try {
      await prisma.validationSchemaHistory.create({
        data: {
          clientId: parseInt(req.params.id),
          validationType: 1,
          fileType: 'ORDER',
          schema: JSON.stringify(req.body.schema),
          changedBy: req.user ? req.user.id : null,
        },
      });
    } catch (histError) {
      console.error('[ValidationSchemaHistory] Error inserting', histError);
    }

    res.json({
      message: "Validation schema updated successfully",
      schema: updatedClient.validation_1,
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        errors: { message: "Client not found" },
      });
    }
    next(error);
  }
};

// Get validation schema history
const getValidationSchemaHistory = async (req, res, next) => {
  const clientId = parseInt(req.params.id);
  const type = req.query.type ? parseInt(req.query.type) : undefined; // 1|2|3 or undefined for all
  const fileType = req.query.fileType ? String(req.query.fileType) : undefined; // 'ORDER' | 'EXECUTION' | undefined
  try {
    const history = await prisma.validationSchemaHistory.findMany({
      where: {
        clientId,
        ...(type ? { validationType: type } : {}),
        ...(fileType ? { fileType } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        validationType: true,
        schema: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
    res.json({ history });
  } catch (error) {
    next(error);
  }
};

const getExecutionValidationSchema = async (req, res, next) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: parseInt(req.params.id) },
      select: { exe_validation_1: true },
    });
    
    if (!client) {
      return res.status(404).json({
        errors: { message: "Client not found." },
      });
    }
    
    res.json({
      schema: client.exe_validation_1 || null,
    });
  } catch (error) {
    next(error);
  }
};

const updateExecutionValidationSchema = async (req, res, next) => {
  const schema = z.object({
    schema: z.record(z.any()),
  });

  const validationErrors = await validateRequest(schema, req.body, res);

  try {
    const updatedClient = await prisma.client.update({
      where: { id: parseInt(req.params.id) },
      data: { exe_validation_1: req.body.schema },
    });
    
    // Record history
    try {
      await prisma.validationSchemaHistory.create({
        data: {
          clientId: parseInt(req.params.id),
          validationType: 2,
          fileType: 'EXECUTION',
          schema: JSON.stringify(req.body.schema),
          changedBy: req.user ? req.user.id : null,
        },
      });
    } catch (histError) {
      console.error('[ValidationSchemaHistory] Error inserting', histError);
    }

    res.json({
      message: "Execution validation schema updated successfully",
      schema: updatedClient.exe_validation_1,
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        errors: { message: "Client not found" },
      });
    }
    next(error);
  }
};

// Get single validation schema history record by ID
const getValidationSchemaHistoryById = async (req, res, next) => {
  const clientId = parseInt(req.params.id);
  const historyId = parseInt(req.params.historyId);
  try {
    const record = await prisma.validationSchemaHistory.findFirst({
      where: {
        id: historyId,
        clientId,
      },
      select: {
        id: true,
        validationType: true,
        schema: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!record) {
      return res.status(404).json({ errors: { message: "History record not found" } });
    }

    res.json(record);
  } catch (error) {
    next(error);
  }
};

// Get validation_2 schema for orders
const getValidation2Schema = async (req, res, next) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: parseInt(req.params.id) },
      select: { validation_2: true },
    });
    
    if (!client) {
      return res.status(404).json({
        errors: { message: "Client not found." },
      });
    }
    
    res.json({
      schema: client.validation_2 || null,
    });
  } catch (error) {
    next(error);
  }
};

// Update validation_2 schema for orders
const updateValidation2Schema = async (req, res, next) => {
  const schema = z.object({
    schema: z.record(z.any()),
  });

  const validationErrors = await validateRequest(schema, req.body, res);

  try {
    const updatedClient = await prisma.client.update({
      where: { id: parseInt(req.params.id) },
      data: { validation_2: req.body.schema },
    });
    
    // Record history
    try {
      await prisma.validationSchemaHistory.create({
        data: {
          clientId: parseInt(req.params.id),
          validationType: 2,
          fileType: 'ORDER',
          schema: JSON.stringify(req.body.schema),
          changedBy: req.user ? req.user.id : null,
        },
      });
    } catch (histError) {
      console.error('[ValidationSchemaHistory] Error inserting', histError);
    }

    res.json({
      message: "Validation 2 schema updated successfully",
      schema: updatedClient.validation_2,
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        errors: { message: "Client not found" },
      });
    }
    next(error);
  }
};

// Get execution validation_2 schema
const getExecutionValidation2Schema = async (req, res, next) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: parseInt(req.params.id) },
      select: { exe_validation_2: true },
    });
    
    if (!client) {
      return res.status(404).json({
        errors: { message: "Client not found." },
      });
    }
    
    res.json({
      schema: client.exe_validation_2 || null,
    });
  } catch (error) {
    next(error);
  }
};

// ================= Level 3 validation schema handlers =================

// Get validation_3 schema for orders
const getValidation3Schema = async (req, res, next) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: parseInt(req.params.id) },
      select: { validation_3: true },
    });

    if (!client) {
      return res.status(404).json({ errors: { message: "Client not found." } });
    }

    res.json({ schema: client.validation_3 || null });
  } catch (error) {
    next(error);
  }
};

// Update validation_3 schema for orders
const updateValidation3Schema = async (req, res, next) => {
  const schema = z.object({ schema: z.record(z.any()) });
  await validateRequest(schema, req.body, res);

  try {
    const updatedClient = await prisma.client.update({
      where: { id: parseInt(req.params.id) },
      data: { validation_3: req.body.schema },
    });

    // Record history
    try {
      await prisma.validationSchemaHistory.create({
        data: {
          clientId: parseInt(req.params.id),
          validationType: 3,
          fileType: 'ORDER',
          schema: JSON.stringify(req.body.schema),
          changedBy: req.user ? req.user.id : null,
        },
      });
    } catch (histError) {
      console.error('[ValidationSchemaHistory] Error inserting', histError);
    }

    res.json({
      message: "Validation 3 schema updated successfully",
      schema: updatedClient.validation_3,
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ errors: { message: "Client not found" } });
    }
    next(error);
  }
};

// Get execution validation_3 schema
const getExecutionValidation3Schema = async (req, res, next) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: parseInt(req.params.id) },
      select: { exe_validation_3: true },
    });

    if (!client) {
      return res.status(404).json({ errors: { message: "Client not found." } });
    }

    res.json({ schema: client.exe_validation_3 || null });
  } catch (error) {
    next(error);
  }
};

// Update execution validation_3 schema
const updateExecutionValidation3Schema = async (req, res, next) => {
  const schema = z.object({ schema: z.record(z.any()) });
  await validateRequest(schema, req.body, res);

  try {
    const updatedClient = await prisma.client.update({
      where: { id: parseInt(req.params.id) },
      data: { exe_validation_3: req.body.schema },
    });

    // Record history
    try {
      await prisma.validationSchemaHistory.create({
        data: {
          clientId: parseInt(req.params.id),
          validationType: 3,
          fileType: 'EXECUTION',
          schema: JSON.stringify(req.body.schema),
          changedBy: req.user ? req.user.id : null,
        },
      });
    } catch (histError) {
      console.error('[ValidationSchemaHistory] Error inserting', histError);
    }

    res.json({
      message: "Execution validation 3 schema updated successfully",
      schema: updatedClient.exe_validation_3,
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ errors: { message: "Client not found" } });
    }
    next(error);
  }
};

// ================= Existing code =================

// Update execution validation_2 schema
const updateExecutionValidation2Schema = async (req, res, next) => {
  const schema = z.object({
    schema: z.record(z.any()),
  });

  const validationErrors = await validateRequest(schema, req.body, res);

  try {
    const updatedClient = await prisma.client.update({
      where: { id: parseInt(req.params.id) },
      data: { exe_validation_2: req.body.schema },
    });
    
    // Record history
    try {
      await prisma.validationSchemaHistory.create({
        data: {
          clientId: parseInt(req.params.id),
          validationType: 2,
          fileType: 'EXECUTION',
          schema: JSON.stringify(req.body.schema),
          changedBy: req.user ? req.user.id : null,
        },
      });
    } catch (histError) {
      console.error('[ValidationSchemaHistory] Error inserting', histError);
    }

    res.json({
      message: "Execution validation 2 schema updated successfully",
      schema: updatedClient.exe_validation_2,
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        errors: { message: "Client not found" },
      });
    }
    next(error);
  }
};

module.exports = {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  setActiveStatus,
  getValidationSchema,
  updateValidationSchema,
  getValidationSchemaHistory,
  getExecutionValidationSchema,
  updateExecutionValidationSchema,
  getValidationSchemaHistoryById,
  getValidation2Schema,
  updateValidation2Schema,
  getExecutionValidation2Schema,
  updateExecutionValidation2Schema,
  // level 3 handlers
  getValidation3Schema,
  updateValidation3Schema,
  getExecutionValidation3Schema,
  updateExecutionValidation3Schema,
};
