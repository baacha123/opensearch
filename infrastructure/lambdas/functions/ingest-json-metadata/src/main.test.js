const fs = require('fs');
const path = require('path');
const { gpUtils, logger } = require('@geoplatform/gp-lib');
const { getS3Object, ingestMetadataIntoOpenSearch } = require('./main');

const secretsmanager = () => Promise.resolve();

const s3Event = require(path.join(__dirname, '..', '/events/eventS3.json'));

const DATA_GOV_CACHE_BUCKET = 'gp-sit-data-gov-cache';
const JSON_CACHE_BUCKET = 'gp-sit-us-east-1-magic-json';

const jsonContents = {
  Body: fs.readFileSync(
    path.join(__dirname, '..', '/data/example-metadata.test.json'),
    {
      encoding: 'utf8',
      flag: 'r'
    }
  )
};

const s3 = {
  getObject: jest.fn(options => ({
    promise: () =>
      Promise.resolve({
        Body: jsonContents.Body
      })
  }))
};

const env = {
  DATA_GOV_CACHE_BUCKET,
  JSON_CACHE_BUCKET
};

const openSearchClient = {
  index: () =>
    Promise.resolve({
      body: {
        _index: 'gp-records-v1',
        _id: '1e538563-1087-4e8c-9e88-228c4938b4b2',
        _version: 1,
        result: 'created',
        forced_refresh: true,
        _shards: { total: 2, successful: 1, failed: 0 },
        _seq_no: 0,
        _primary_term: 1
      },
      statusCode: 201,
      headers: {},
      meta: {}
    })
};

const defaultParams = {
  env,
  event: s3Event,
  deps: {
    gpUtils,
    logger,
    s3,
    secretsmanager,
    openSearchClient
  }
};

describe('ingests-object-into-opensearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should get xml string from s3 event', async () => {
    const result = await getS3Object(defaultParams);
    expect(s3.getObject).toHaveBeenCalled();
    expect(result).toEqual(JSON.parse(jsonContents.Body));
  });

  it('should ingest data into OpenSearch', async () => {
    const result = await ingestMetadataIntoOpenSearch(
      defaultParams,
      jsonContents.Body
    );
    expect(result).toEqual(201);
  });
});
