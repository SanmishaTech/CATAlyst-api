const express = require("express");

const router = express.Router();
const clientController = require("../controllers/clientController");
const auth = require("../middleware/auth");
const acl = require("../middleware/acl");

/**
 * @swagger
 * tags:
 *   name: Clients
 *   description: Client management endpoints (Admin only)
 */

/**
 * @swagger
 * /clients:
 *   get:
 *     summary: Get all clients
 *     tags: [Clients]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of clients per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for client name or email
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Active status of the client
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: id
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *       - in: query
 *         name: export
 *         schema:
 *           type: boolean
 *         description: Export client data to Excel
 *     responses:
 *       200:
 *         description: List of all clients
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get("/", auth, clientController.getClients);

/**
 * @swagger
 * /clients:
 *   post:
 *     summary: Create a new client
 *     tags: [Clients]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 description: Client company name (also used as the user's display name)
 *               entityName:
 *                 type: string
 *               address:
 *                 type: string
 *               legalAddress:
 *                 type: string
 *               taxOrEinNumber:
 *                 type: string
 *               mpid:
 *                 type: string
 *               lei:
 *                 type: string
 *               catReporterImid:
 *                 type: string
 *               catSubmitterImid:
 *                 type: string
 *               contactPersonName:
 *                 type: string
 *               contactNumber:
 *                 type: string
 *               contactEmailId:
 *                 type: string
 *                 format: email
 *               serviceEmailId:
 *                 type: string
 *                 format: email
 *               catEnabled:
 *                 type: boolean
 *               sixZeroFiveEnabled:
 *                 type: boolean
 *               loprEnabled:
 *                 type: boolean
 *               supportEscalationContact:
 *                 type: string
 *                 format: email
 *               dataSpecificationModel:
 *                 type: string
 *               configurationPlaceholder:
 *                 type: string
 *               configurationPlaceholder1:
 *                 type: string
 *               configurationPlaceholder2:
 *                 type: string
 *               placeholderColumn1:
 *                 type: string
 *               placeholderColumn2:
 *                 type: string
 *               placeholderColumn3:
 *                 type: string
 *               placeholderColumn4:
 *                 type: string
 *               placeholderColumn5:
 *                 type: string
 *               placeholderColumn6:
 *                 type: string
 *               placeholderColumn7:
 *                 type: string
 *               active:
 *                 type: boolean
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Login email for the client user (must be unique)
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 description: Login password for the client user (min 6 characters)
 *     responses:
 *       201:
 *         description: Client created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post("/", auth, clientController.createClient);

/**
 * @swagger
 * /clients/{id}:
 *   get:
 *     summary: Get client by ID
 *     tags: [Clients]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Client ID
 *     responses:
 *       200:
 *         description: Client data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Client not found
 */
router.get("/:id", auth, clientController.getClientById);

/**
 * @swagger
 * /clients/{id}:
 *   put:
 *     summary: Update client by ID
 *     tags: [Clients]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Client ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               entityName:
 *                 type: string
 *               address:
 *                 type: string
 *               legalAddress:
 *                 type: string
 *               taxOrEinNumber:
 *                 type: string
 *               mpid:
 *                 type: string
 *               lei:
 *                 type: string
 *               catReporterImid:
 *                 type: string
 *               catSubmitterImid:
 *                 type: string
 *               contactPersonName:
 *                 type: string
 *               contactNumber:
 *                 type: string
 *               contactEmailId:
 *                 type: string
 *                 format: email
 *               serviceEmailId:
 *                 type: string
 *                 format: email
 *               catEnabled:
 *                 type: boolean
 *               sixZeroFiveEnabled:
 *                 type: boolean
 *               loprEnabled:
 *                 type: boolean
 *               supportEscalationContact:
 *                 type: string
 *                 format: email
 *               dataSpecificationModel:
 *                 type: string
 *               configurationPlaceholder:
 *                 type: string
 *               configurationPlaceholder1:
 *                 type: string
 *               configurationPlaceholder2:
 *                 type: string
 *               placeholderColumn1:
 *                 type: string
 *               placeholderColumn2:
 *                 type: string
 *               placeholderColumn3:
 *                 type: string
 *               placeholderColumn4:
 *                 type: string
 *               placeholderColumn5:
 *                 type: string
 *               placeholderColumn6:
 *                 type: string
 *               placeholderColumn7:
 *                 type: string
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Client updated
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Client not found
 */
router.put("/:id", auth, clientController.updateClient);

/**
 * @swagger
 * /clients/{id}:
 *   delete:
 *     summary: Delete client by ID
 *     tags: [Clients]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Client ID
 *     responses:
 *       200:
 *         description: Client deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Client not found
 */
router.delete("/:id", auth, clientController.deleteClient);

/**
 * @swagger
 * /clients/{id}/status:
 *   patch:
 *     summary: Set client active status
 *     tags: [Clients]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Client ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Client status updated
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Client not found
 */
router.patch("/:id/status", auth, clientController.setActiveStatus);

/**
 * @swagger
 * /clients/{id}/validation-schema:
 *   get:
 *     summary: Get client validation schema
 *     tags: [Clients]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Client ID
 *     responses:
 *       200:
 *         description: Validation schema retrieved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Client not found
 */
router.get("/:id/validation-schema", auth, clientController.getValidationSchema);

/**
 * @swagger
 * /clients/{id}/validation-schema:
 *   put:
 *     summary: Update client validation schema
 *     tags: [Clients]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Client ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               schema:
 *                 type: object
 *                 description: Validation schema JSON object
 *     responses:
 *       200:
 *         description: Validation schema updated
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Client not found
 */
router.put("/:id/validation-schema", auth, clientController.updateValidationSchema);

/**
 * @swagger
 * /clients/{id}/execution-validation-schema:
 *   get:
 *     summary: Get client execution validation schema
 *     tags: [Clients]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Client ID
 *     responses:
 *       200:
 *         description: Execution validation schema retrieved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Client not found
 */
router.get("/:id/execution-validation-schema", auth, clientController.getExecutionValidationSchema);

/**
 * @swagger
 * /clients/{id}/execution-validation-schema:
 *   put:
 *     summary: Update client execution validation schema
 *     tags: [Clients]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Client ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               schema:
 *                 type: object
 *                 description: Execution validation schema JSON object
 *     responses:
 *       200:
 *         description: Execution validation schema updated
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Client not found
 */
router.put("/:id/execution-validation-schema", auth, clientController.updateExecutionValidationSchema);

module.exports = router;
