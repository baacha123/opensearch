const path = require('path');
const { gpUtils, logger } = require('@geoplatform/gp-lib');
const { JSONPath } = require('jsonpath-plus');

const applicators = require('./applicators');
const {
  captureAugmentationError,
  RegistryNotFoundError,
  applicatorRunner,
  identifyXMLFormat,
  buildXmlNameSpaceMapping,
  main
} = require('./main');

const s3Event = require(path.join(__dirname, '..', '/events/test-event.json'));

const sourceJson = require(path.join(
  __dirname,
  '..',
  '/data/iso-19115-19139.test.json'
));

const sourceJson_3 = require(path.join(
  __dirname,
  '..',
  '/data/iso-19115-3.test.json'
));

const JSON_CACHE_BUCKET = 'gp-sit-us-east-1-magic-json';

const jsonContents = {
  Body: JSON.stringify(sourceJson)
};

const s3 = {
  getObject: jest.fn(options => ({
    promise: () =>
      Promise.resolve({
        Body: jsonContents.Body
      })
  })),
  putObject: jest.fn(options => ({
    promise: () => Promise.resolve({})
  }))
};

const env = {
  JSON_CACHE_BUCKET,
  DB_HOST: 'test-db'
};

const registryRecord = {
  registry_id: 'test-registry-id',
  theme: 'test theme',
  community: 'test community',
  title: 'Test Record Title',
  agency: 'USGS'
};

const metadataType = {
  xmlNsMap: { gmd: 'gmd:', gco: 'gco:', gml: 'gml:', gmx: 'gmx:' },
  isoStandard: 'iso19139',
  rootNameSpace: 'http://www.isotc211.org/2005/gmd',
  schema: 'gmd',
  rootProperty: 'gmd:MD_Metadata'
};

const metadataType_3 = {
  xmlNsMap: {
    // gmd: 'gmd:',
    gex: 'gex:',
    gco: 'gco:',
    gml: 'gml:',
    // gmx: 'gmx:',
    cit: 'cit:',
    mcc: 'mcc:',
    mdb: 'mdb:',
    mrd: 'mrd:',
    mri: 'mri:',
    mmi: 'mmi:'
  },
  isoStandard: 'iso19115-3:1.0',
  rootNameSpace: 'http://standards.iso.org/iso/19115/-3/mdb/1.0',
  schema: 'mdb',
  rootProperty: 'mdb:MD_Metadata'
};

const models = {
  Registry: {
    findOne: jest.fn(() => Promise.resolve({ ...registryRecord }))
  }
};
const defaultParams = {
  env,
  event: s3Event,
  deps: {
    applicators,
    gpUtils,
    JSONPath,
    logger,
    s3,
    models
  }
};

describe('augment-json', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should capture augmentation errors', () => {
    const errString1 = 'Community: error';
    const resultJson1 = captureAugmentationError(defaultParams, {}, errString1);
    expect(resultJson1.augmentationErrors).toEqual(['Community: error']);

    const errString2 = 'Theme: error';
    const resultJson2 = captureAugmentationError(
      defaultParams,
      resultJson1,
      errString2
    );
    expect(resultJson2.augmentationErrors).toEqual([
      'Community: error',
      'Theme: error'
    ]);
  });

  it('gets correct xlmns mapping for iso 19115', () => {
    let result = identifyXMLFormat(defaultParams, sourceJson);
    expect(result).toEqual({
      isoStandard: 'iso19139',
      rootNameSpace: 'http://www.isotc211.org/2005/gmd',
      schema: 'gmd',
      rootProperty: 'gmd:MD_Metadata'
    });
    result.xmlNsMap = buildXmlNameSpaceMapping(
      defaultParams,
      metadataType,
      sourceJson
    );
    expect(result.xmlNsMap).toEqual({
      gmd: 'gmd:',
      gco: 'gco:',
      gml: 'gml:',
      gmx: 'gmx:'
    });
  });

  it('gets correct xlmns mapping for iso 19115-3', () => {
    const { isoStandard, rootNameSpace, schema, rootProperty } = metadataType_3;
    let result = identifyXMLFormat(defaultParams, sourceJson_3);
    expect(result).toEqual({
      isoStandard,
      rootNameSpace,
      schema,
      rootProperty
    });
    result.xmlNsMap = buildXmlNameSpaceMapping(
      defaultParams,
      metadataType_3,
      sourceJson_3
    );
    expect(result.xmlNsMap).toEqual(metadataType_3.xmlNsMap);
  });

  it('correctly applies iso-19115-19139 properties to output augmented json', () => {
    const result = applicatorRunner(
      defaultParams,
      sourceJson,
      registryRecord,
      metadataType
    );
    expect(result.community).toEqual('test community');
    expect(result.theme).toEqual('test theme');
    expect(result.registryId).toEqual('test-registry-id');
    expect(result.status).toEqual('completed');
    expect(result.abstract).toContain(
      'These data were collected under a cooperative agreement'
    );
    expect(result.agencyContactName).toEqual('Aaron Turecek');
    expect(result.maintenanceAndUpdateFrequency).toEqual('notPlanned');
    expect(result.distributionType).toEqual('dataset');
    expect(result.format).toEqual('SHP');
    expect(result.title).toContain(
      'Survey lines along which interferometric sonar'
    );
    expect(result.boundingBox).toEqual({
      coordinates: [
        [-70.678892, 41.692125],
        [-70.616102, 41.661905]
      ],
      type: 'envelope'
    });
    expect(result.metadataStandardName).toEqual(
      'ISO 19115 Geographic Information - Metadata'
    );
    expect(result.publicationDate).toEqual('2012-01-01');
    expect(result.responsibleParty).toEqual('U.S. Geological Survey');
    expect(result).not.toHaveProperty('augmentationErrors');
  });

  it('correctly applies iso-19115-3 properties to output augmented json', () => {
    const result = applicatorRunner(
      defaultParams,
      sourceJson_3,
      registryRecord,
      metadataType_3
    );
    expect(result.community).toEqual('test community');
    expect(result.theme).toEqual('test theme');
    expect(result.registryId).toEqual('test-registry-id');
    expect(result.status).toEqual('completed');
    expect(result.abstract).toContain(
      'These data were collected under a cooperative agreement'
    );
    expect(result.agencyContactName).toEqual('Aaron Turecek');
    expect(result.maintenanceAndUpdateFrequency).toEqual('notPlanned');
    expect(result.distributionType).toEqual('dataset');
    expect(result.format).toEqual('SHP');
    expect(result.title).toContain(
      'Survey lines along which interferometric sonar'
    );
    expect(result.boundingBox).toEqual({
      coordinates: [
        [-70.678892, 41.692125],
        [-70.616102, 41.661905]
      ],
      type: 'envelope'
    });
    expect(result.metadataStandardName).toEqual(
      'ISO 19115 Geographic Information - Metadata'
    );
    expect(result.publicationDate).toEqual('2012-01-01T00:00:00');
    expect(result.responsibleParty).toEqual('U.S. Geological Survey');
    expect(result).not.toHaveProperty('augmentationErrors');
  });

  it('calls s3 methods', async () => {
    await main(defaultParams);
    expect(s3.getObject).toHaveBeenCalled();

    const s3PutBody = {
      maintenanceAndUpdateFrequency: 'notPlanned',
      metadataStandardName: 'ISO 19115 Geographic Information - Metadata',
      publicationDate: '2021-11-16',
      registryId: 'test-registry-id',
      responsibleParty: 'U.S. Geological Survey',
      status: 'completed',
      theme: 'test theme',
      title:
        'Survey lines along which interferometric sonar data were collected by the USGS within Red Brook Harbor, MA, 2009 (RB_BathyBackscatterTrackline.shp)'
    };
    const s3PutParams = {
      Bucket: JSON_CACHE_BUCKET,
      Key: `augmented/test-data-gov-id.json`
    };

    expect(s3.putObject).toHaveBeenCalledWith({
      ...s3PutParams,
      Body: expect.stringContaining(s3PutBody.title)
    });
  });

  it('correctly throws error on no registry record', async () => {
    defaultParams.deps.models.Registry.findOne = jest.fn(() =>
      Promise.resolve(null)
    );
    await expect(() => main(defaultParams)).rejects.toThrowError(
      RegistryNotFoundError
    );
  });

  it('correctly throws error on CSDGM key', async () => {
    defaultParams.event.Records[0].s3.object.key =
      'raw/test-data-gov-id-CSDGM.json';
    await expect(() => main(defaultParams)).rejects.toThrowError();
  });
});
