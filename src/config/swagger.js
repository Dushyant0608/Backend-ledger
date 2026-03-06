const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Backend Ledger API",
      version: "1.0.0",
      description: "API documentation for Backend Ledger system"
    },
    servers: [
        {
          url: "http://localhost:3000/api",
          description: "Local server"
        },
        {
          url: "https://backend-ledger.onrender.com/api",
          description: "Production server"
        }
      ],
    components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT"
          }
        }
      }
  },
  apis: ["./src/routes/*.js"]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;