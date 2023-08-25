async function connect (options) {
  const { Client, AwsSigv4Signer, AWS } = options.deps;

  const {
    OPENSEARCH_HOST,
    OPENSEARCH_PORT,
    OPENSEARCH_PROTOCOL,
    OPENSEARCH_AUTH,
    OPENSEARCH_AWS_REGION
  } = options.env;
  if (OPENSEARCH_HOST.toLowerCase() === 'localhost') {
    const localNode =
      OPENSEARCH_PROTOCOL +
      '://' +
      OPENSEARCH_AUTH +
      '@' +
      OPENSEARCH_HOST +
      ':' +
      OPENSEARCH_PORT;
    return new Client({ node: localNode });
  } else {
    // see https://opensearch.org/docs/2.3/clients/javascript/index/#authenticating-with-amazon-opensearch-service--aws-sigv4
    const prodNode = `${OPENSEARCH_PROTOCOL}://${OPENSEARCH_HOST}:${OPENSEARCH_PORT}`;
    return new Client({
      ...AwsSigv4Signer({
        region: OPENSEARCH_AWS_REGION,
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
      node: prodNode
    });
  }
}

module.exports = {
  connect
};
