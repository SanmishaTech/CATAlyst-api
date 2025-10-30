const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const express = require("express");

const router = express.Router();
//yash
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Catalyst API",
      version: "1.0.0",
      description: "A simple Node.js REST API.",
    },
    servers: [
      {
        url: "http://localhost:3000/api",
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "API Key",
          description: "Enter your API key (the 'Bearer ' prefix will be added automatically)",
        },
      },
    },
  },
  apis: ["./src/routes/*.js"],
};

const specs = swaggerJsdoc(options);

const swaggerUiOptions = {
  swaggerOptions: {
    filter: true, // Enable search/filter bar
    requestInterceptor: (req) => {
      // Ensure content-type is properly set for file uploads
      if (req.body instanceof FormData) {
        req.headers["Content-Type"] = "multipart/form-data";
      }
      return req;
    },
  },
};

router.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, swaggerUiOptions)
);

module.exports = router;
