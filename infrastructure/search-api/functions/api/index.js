const fs = require('fs');
const path = require('path');

const { logger } = require('@geoplatform/gp-lib');
const cors = require('cors');
const serverlessExpress = require('@vendia/serverless-express');
const express = require('express');
const openapi = require('express-openapi');
const morgan = require('morgan');
var { Client } = require('@opensearch-project/opensearch');
const AWS = require('aws-sdk'); // V2 SDK.
const { AwsSigv4Signer } = require('@opensearch-project/opensearch/aws');
const db = require('./utils/dbConnection');
const transformers = require('./utils/dataTransformers');

async function getOptions () {
  // Basic options
  const options = {
    deps: {
      Client,
      AwsSigv4Signer,
      AWS,
      transformers,
      logger
    },
    env: process.env
  };
  // Initialize OpenSearch Client
  const openSearchClient = await db.connect(options);
  // Add the initialized client to the dependencies
  options.deps.openSearchClient = openSearchClient;
  return options;
}

async function getApp () {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan('combined'));

  const docs = fs.readFileSync(path.resolve(__dirname, 'docs/api.yml'), 'utf8');

  app.get('/', express.static(path.join(__dirname, 'docs')));

  // error handling
  app.use((err, req, res, next) => {
    logger.error('Search API Error:', err);
    res
      .status(err.status || 500)
      .json({ message: err.apiResponseMessage || 'Internal Server Error' });
  });

  // init the openapi
  try {
    openapi.initialize({
      apiDoc: docs,
      app,
      paths: path.resolve(__dirname, 'routes')
    });
  } catch (err) {
    logger.error('openapi initialization error', JSON.stringify(err));
  }
  app.locals.options = await getOptions();
  return app;
}

async function runLocal () {
  logger.info('serving api via local development entrypoint...');
  require('dotenv').config();
  const app = await getApp();
  const port = process.env.PORT || 3000;
  app.listen(port);
  logger.info(`Server ready on port ${port} `);
}

let serverlessExpressInstance;

async function setup (event, context) {
  const app = await getApp();
  serverlessExpressInstance = serverlessExpress({ app });
  return serverlessExpressInstance(event, context);
}

function handler (event, context) {
  logger.info('serving api via lambda production entrypoint...');
  if (serverlessExpressInstance)
    return serverlessExpressInstance(event, context);

  return setup(event, context);
}

module.exports = {
  handler,
  runLocal
};
