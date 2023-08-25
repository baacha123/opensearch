async function getS3Object (options, keyName, sourceBucket) {
  // read the event JSON object from source s3 bucket
  const { s3 } = options.deps;
  const params = {
    Bucket: sourceBucket,
    Key: keyName
  };
  const data = await s3.getObject(params).promise();
  return JSON.parse(data.Body.toString('utf-8'));
}

async function ingestMetadataIntoOpenSearch (options, sourceJson) {
  // write the source JSON metadata record to opensearch index
  const { OPENSEARCH_INDEX_NAME } = options.env;
  const { openSearchClient } = options.deps;
  // https://github.com/opensearch-project/opensearch-js/blob/main/USER_GUIDE.md#add-a-document-to-the-index
  const response = await openSearchClient.index({
    id: sourceJson['registryId'], // 1:1 with registry table
    index: OPENSEARCH_INDEX_NAME,
    body: sourceJson,
    refresh: true
  });
  return response.statusCode;
}

/* 
entrypoint
*/
async function main (options) {
  const { deps, env, event } = options;
  const { gpUtils } = deps;

  // Validate options payload.
  gpUtils.validate(
    env,
    ['OPENSEARCH_INDEX_NAME'],
    p => `Invalid options.env payload; missing property (${p})`
  );
  //validate deps
  gpUtils.validate(
    deps,
    ['logger', 's3', 'openSearchClient'],
    p => `Invalid dependencies payload; missing dependency (${p})`
  );

  const sourceBucket = event.Records[0].s3.bucket.name;
  const keyName = event.Records[0].s3.object.key;
  const sourceJson = await getS3Object(options, keyName, sourceBucket);
  // Load object to OpenSearch Index
  await ingestMetadataIntoOpenSearch(options, sourceJson);
  return 'Success';
}

module.exports = {
  main,
  getS3Object,
  ingestMetadataIntoOpenSearch
};
