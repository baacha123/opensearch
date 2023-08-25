const fs = require('fs');
const xpath = require('xpath');
const xml2js = require('xml2js');
const path = require('path');
const { getS3Object, transformXmlToJsonString } = require('./main');

const s3Event = require(path.join(__dirname, '..', '/events/eventS3.json'));

const DATA_GOV_CACHE_BUCKET = 'gp-sit-data-gov-cache';
const JSON_CACHE_BUCKET = 'gp-sit-us-east-1-magic-json';

const logger = {
  debug: jest.fn(),
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

const xmlContents = {
  Body: fs.readFileSync(
    path.join(__dirname, '..', '/data/example-metadata.test.xml'),
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
        Body: xmlContents.Body
      })
  })),
  putObject: jest.fn(options => ({
    promise: () => Promise.resolve({})
  }))
};

const sqs = {
  sendMessage: jest.fn(options => ({
    promise: () => Promise.resolve()
  }))
};

const env = {
  DATA_GOV_CACHE_BUCKET,
  JSON_CACHE_BUCKET
};

const defaultParams = {
  env,
  event: s3Event,
  deps: {
    logger,
    s3,
    xml2js,
    xpath
  }
};

describe('convert-xml-to-json', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should get xml string from s3 event', async () => {
    const result = await getS3Object(defaultParams);
    expect(s3.getObject).toHaveBeenCalled();
    expect(result).toEqual(xmlContents.Body);
  });

  it('should convert xml to JSON', async () => {
    const result = await transformXmlToJsonString(
      defaultParams,
      xmlContents.Body
    );
    expect(result).toContain('{"gmi:MI_Metadata"');
  });
});
