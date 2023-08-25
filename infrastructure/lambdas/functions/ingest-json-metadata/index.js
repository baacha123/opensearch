const AWS = require('aws-sdk'); // V2 SDK.
var { Client } = require('@opensearch-project/opensearch');
const { AwsSigv4Signer } = require('@opensearch-project/opensearch/aws');
// from gp-core-lambda-layer
const { gpUtils, logger } = require('@geoplatform/gp-lib');

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

async function initOpenSearchClient (options) {
  const { Client, AwsSigv4Signer, AWS } = options.deps;
  const { OPENSEARCH_AWS_REGION, OPENSEARCH_NODE } = options.env;
  // const { username: db_username, password: db_password } = credentials;
  return new Client({
    ...AwsSigv4Signer({
      region: OPENSEARCH_AWS_REGION ?? 'us-east-1',
      service: 'es', // or aoss for serverless
      // Must return a Promise that resolve to an AWS.Credentials object.
      // This function is used to acquire the credentials when the client start and
      // when the credentials are expired.
      // The Client will refresh the Credentials only when they are expired.
      // With AWS SDK V2, Credentials.refreshPromise is used when available to refresh the credentials.

      // Example with AWS SDK V2:
      getCredentials: () =>
        new Promise((resolve, reject) => {
          // Any other method to acquire a new Credentials object can be used.
          AWS.config.getCredentials((err, credentials) => {
            if (err) {
              reject(err);
            } else {
              resolve(credentials);
            }
          });
        })
    }),
    node: OPENSEARCH_NODE
  });
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
        AWS,
        AwsSigv4Signer,
        Client,
        gpUtils,
        logger,
        s3,
        secretsmanager
      }
    };
    options.deps.openSearchClient = await initOpenSearchClient(options);
    const result = await main(options);
    logger.log(`Lambda result: ${result}`);
    return result;
  } catch (e) {
    logger.error(`error ingesting object to OpenSearch, ${e}`);
  }
};
