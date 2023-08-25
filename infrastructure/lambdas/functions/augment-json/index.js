const fs = require('fs');
const path = require('path');
const { JSONPath } = require('jsonpath-plus');
const AWS = require('aws-sdk');
// from gp-core-lambda-layer
const { Sequelize } = require('sequelize');
const { gpUtils, logger, logicModels } = require('@geoplatform/gp-lib');

const applicators = require('./src/applicators');
const { main } = require('./src/main');

const s3 = new AWS.S3();
const secretsmanager = new AWS.SecretsManager();

async function getDatabaseCredentials (options) {
  const { MAGIC_DB_SECRET } = options.env;
  const { secretsmanager } = options.deps;
  const config = await secretsmanager
    .getSecretValue({ SecretId: MAGIC_DB_SECRET })
    .promise();
  return JSON.parse(config.SecretString);
}

async function getModels (options, credentials) {
  const { Sequelize } = options.deps;
  const { DB_NAME, DB_HOST, SEQUELIZE_LOGGING } = options.env;
  const { username: db_username, password: db_password } = credentials;
  const dbConnection = `postgres://${db_username}:${db_password}@${DB_HOST}/${DB_NAME}`;
  const sequelize = new Sequelize(dbConnection, {
    logging: SEQUELIZE_LOGGING === 'enable'
  });
  await sequelize.authenticate();
  return logicModels.initialize(sequelize);
}

exports.handler = async (event, context) => {
  const env = process.env;
  env.SOURCE_LAMBDA = context.functionName;
  try {
    logger.log('Event:', JSON.stringify(event, null, 2));
    logger.log('Context:', JSON.stringify(context, null, 2));
    logger.log('process.env: ', env);
    const options = {
      env,
      event,
      deps: {
        applicators,
        fs,
        gpUtils,
        JSONPath,
        logger,
        path,
        s3,
        Sequelize,
        secretsmanager
      }
    };
    const dbCredentials = await getDatabaseCredentials(options);
    options.deps.models = await getModels(options, dbCredentials);
    const result = await main(options);
    logger.log(`Lambda result: ${result}`);
    return result;
  } catch (e) {
    logger.error(`error augmenting JSON, ${e}`);
  }
};
