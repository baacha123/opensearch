const AWS = require('aws-sdk');
const s3 = new AWS.S3();

// from gp-core-lambda-layer
const { gpUtils, logger } = require('@geoplatform/gp-lib');
const xml2js = require('xml2js');
const xpath = require('xpath');

const { main } = require('./src/main');

exports.handler = async (event, context) => {
  const env = process.env;
  env.SOURCE_LAMBDA = context.functionName;
  try {
    logger.log('Event:', JSON.stringify(event, null, 2));
    logger.log('Context:', JSON.stringify(context, null, 2));
    logger.log('process.env: ', env);

    const result = await main({
      env,
      event,
      deps: {
        gpUtils,
        logger,
        s3,
        xml2js,
        xpath
      }
    });
    logger.log(`Lambda result: ${result}`);
    return result;
  } catch (e) {
    logger.error(`error converting to JSON, ${e}`);
  }
};
