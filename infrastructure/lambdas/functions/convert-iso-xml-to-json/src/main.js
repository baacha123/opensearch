async function getS3Object (options, keyName, sourceBucket) {
  // read the event XML from source s3 bucket
  const { s3 } = options.deps;
  const params = {
    Bucket: sourceBucket,
    Key: keyName
  };
  const data = await s3.getObject(params).promise();
  return data.Body.toString('utf-8');
}

async function putS3Object (options, keyName, serializedJson) {
  // write the converted JSON to target s3 location
  const { JSON_CACHE_BUCKET } = options.env;
  const { s3 } = options.deps;
  const params = {
    Bucket: JSON_CACHE_BUCKET,
    Key: `raw/${keyName.replace('.xml', '.json')}`,
    Body: serializedJson
  };
  await s3.putObject(params).promise();
}

async function transformXmlToJsonString (options, xmlString) {
  // convert the xml to json
  const { xml2js } = options.deps;
  const jsonData = await xml2js.parseStringPromise(xmlString);
  return JSON.stringify(jsonData);
}

async function main (options) {
  const { deps, env, event } = options;
  const { gpUtils, logger } = deps;

  // Validate options payload.
  gpUtils.validate(
    env,
    ['DATA_GOV_CACHE_BUCKET', 'JSON_CACHE_BUCKET'],
    p => `Invalid options.env payload; missing property (${p})`
  );
  //validate deps
  gpUtils.validate(
    deps,
    ['xml2js', 'logger', 'xml2js', 's3'],
    p => `Invalid dependencies payload; missing dependency (${p})`
  );

  try {
    const sourceBucket = event.Records[0].s3.bucket.name;
    const keyName = event.Records[0].s3.object.key;
    // skip any key that is not at root of bucket
    if (keyName.indexOf('/') === -1) {
      const xmlString = await getS3Object(options, keyName, sourceBucket);
      const jsonSerialized = await transformXmlToJsonString(options, xmlString);
      await putS3Object(options, keyName, jsonSerialized);
      return 'Success';
    } else {
      logger.info(
        `XML not at root of bucket; skipping conversion to JSON. Key is ${keyName}.`
      );
    }
  } catch (e) {
    logger.error('Error: ', e);
  }
}

module.exports = {
  main,
  getS3Object,
  putS3Object,
  transformXmlToJsonString
};
