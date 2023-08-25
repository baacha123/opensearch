/*
Write out a JSON that correlates to the OpenSearch Index Mapping for easy ingestion downstream
*/

class RegistryNotFoundError extends Error {
  constructor (message) {
    super(message);
    this.name = 'RegistryNotFoundError';
  }
}

class JSONCatalog {
  constructor (keyName) {
    this.keyName = keyName.replace('raw/', '').toLowerCase();
  }
  get augmentedKey () {
    return `augmented/${this.keyName.replace('raw/', '')}`;
  }
  get sourceKey () {
    return this.keyName;
  }
  get upstreamIdentifier () {
    return this.keyName.replace('.json', '').replace('raw/', '');
  }
}

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

async function putS3Object (options, catalogKey, augmentedJson) {
  const { JSON_CACHE_BUCKET, DB_HOST } = options.env;
  if (DB_HOST.toLowerCase() === 'localhost') {
    // write out to local directory instead of triggering downstream event
    const { fs, logger, path } = options.deps;
    const outPath = path.join(__dirname, '..', `/data/${catalogKey.keyName}`);
    fs.writeFileSync(outPath, JSON.stringify(augmentedJson));
    logger.info(`wrote augmented JSON to local directory: ${outPath}`);
  } else {
    // write the augmented JSON to target s3 location
    const { s3 } = options.deps;
    const params = {
      Bucket: JSON_CACHE_BUCKET,
      Key: catalogKey.augmentedKey,
      Body: JSON.stringify(augmentedJson)
    };
    await s3.putObject(params).promise();
  }
}

async function getRegistryRecord (options, catalogKey) {
  // get the corresponding registry record based on the file name (data gov id)
  // the datagov id needs to be extracted from the s3 key; ex. raw/01a37db7-82c2-42d8-bc71-b7e34b2db43f.json
  const { models } = options.deps;
  const dataGovId = catalogKey.upstreamIdentifier;
  return await models.Registry.findOne({
    attributes: ['registry_id', 'theme', 'community', 'title', 'agency'],
    where: {
      data_gov_dataset_id: dataGovId
    }
  });
}

function captureAugmentationError (options, augmentedJson, errorString) {
  // lets capture any errors processing this record in the output JSON
  augmentedJson.augmentationErrors
    ? augmentedJson.augmentationErrors.push(errorString)
    : (augmentedJson.augmentationErrors = [errorString]);
  return augmentedJson;
}

function identifyXMLFormat (options, sourceJson) {
  const XMLNS = {
    GMD: 'http://www.isotc211.org/2005/gmd',
    GMI: 'http://www.isotc211.org/2005/gmi',
    // GMI: 'http://standards.iso.org/iso/19115/-2/gmi/1.0'
    MDB1: 'http://standards.iso.org/iso/19115/-3/mdb/1.0',
    MDB2: 'http://standards.iso.org/iso/19115/-3/mdb/2.0'
  };

  const rootProperty = Object.entries(sourceJson)[0][0];
  const schema = rootProperty.split(':')[0];
  const nameSpaces = sourceJson[rootProperty]['$'];
  const rootNameSpace = nameSpaces[`xmlns:${schema}`];
  const baseProperties = { rootProperty, schema, rootNameSpace };
  switch (rootNameSpace) {
    case 'http://www.mozilla.org/newlayout/xml/parsererror.xml':
      throw new Error('Parse Error');

    case XMLNS.GMD:
      return {
        isoStandard: 'iso19139',
        ...baseProperties
      };

    case XMLNS.GMI:
      return {
        isoStandard: 'iso19115-2',
        ...baseProperties
      };

    case XMLNS.MDB1:
      return {
        isoStandard: 'iso19115-3:1.0',
        ...baseProperties
      };

    case XMLNS.MDB2:
      return {
        isoStandard: 'iso19115-3:2.0',
        ...baseProperties
      };

    case undefined:
      if (rootProperty === 'metadata') {
        return {
          isoStandard: 'csdgm',
          ...baseProperties
        };
      }
    // Fall through for error handling
    default:
      throw new Error(`Unknown XML metadata namespace ${rootProperty}`);
  }
}

function buildXmlNameSpaceMapping (options, metadataType, sourceJson) {
  const { JSONPath } = options.deps;
  const { rootProperty, schema } = metadataType;
  // XML Namespaces used to build our local xpath queries
  const NAMESPACES_19115 = {
    GCO: 'http://www.isotc211.org/2005/gco',
    GMD: 'http://www.isotc211.org/2005/gmd',
    GMI: 'http://www.isotc211.org/2005/gmi',
    GML: 'http://www.opengis.net/gml/3.2',
    GMX: 'http://www.isotc211.org/2005/gmx'
  };

  const NAMESPACES_19115_3 = {
    MDB1: 'http://standards.iso.org/iso/19115/-3/mdb/1.0',
    MDB2: 'http://standards.iso.org/iso/19115/-3/mdb/2.0',
    CIT1: 'http://standards.iso.org/iso/19115/-3/cit/1.0',
    CIT2: 'http://standards.iso.org/iso/19115/-3/cit/2.0',
    GEX: 'http://standards.iso.org/iso/19115/-3/gex/1.0',
    GCO: 'http://standards.iso.org/iso/19115/-3/gco/1.0',
    MCC: 'http://standards.iso.org/iso/19115/-3/mcc/1.0',
    MRI: 'http://standards.iso.org/iso/19115/-3/mri/1.0',
    MRD: 'http://standards.iso.org/iso/19115/-3/mrd/1.0',
    MMI: 'http://standards.iso.org/iso/19115/-3/mmi/1.0'
  };

  // Per-standard namespaces
  const XPATH_NAMESPACES = {
    'http://www.isotc211.org/2005/gmd': {
      gmd: NAMESPACES_19115.GMD,
      gco: NAMESPACES_19115.GCO,
      gml: NAMESPACES_19115.GML,
      gmx: NAMESPACES_19115.GMX
    },
    'http://www.isotc211.org/2005/gmi': {
      gmi: NAMESPACES_19115.GMI,
      gmd: NAMESPACES_19115.GMD,
      gco: NAMESPACES_19115.GCO,
      gml: NAMESPACES_19115.GML,
      gmx: NAMESPACES_19115.GMX
    },
    'http://standards.iso.org/iso/19115/-3/mdb/1.0': {
      // Ref: https://schemas.isotc211.org/19115/-3/mdb/1.0/
      mdb: NAMESPACES_19115_3.MDB1,
      cit: NAMESPACES_19115_3.CIT1,
      gco: NAMESPACES_19115_3.GCO,
      mcc: NAMESPACES_19115_3.MCC,
      mri: NAMESPACES_19115_3.MRI,
      mrd: NAMESPACES_19115_3.MRD,
      mmi: NAMESPACES_19115_3.MMI,
      gex: NAMESPACES_19115_3.GEX,
      // gmd: NAMESPACES_19115.GMD,
      gml: NAMESPACES_19115.GML
      // gmx: NAMESPACES_19115.GMX
    },
    'http://standards.iso.org/iso/19115/-3/mdb/2.0': {
      // Ref: https://schemas.isotc211.org/19115/-3/mdb/2.0/
      mdb: NAMESPACES_19115_3.MDB2,
      cit: NAMESPACES_19115_3.CIT2,
      gco: NAMESPACES_19115_3.GCO,
      mcc: NAMESPACES_19115_3.MCC,
      mri: NAMESPACES_19115_3.MRI,
      mrd: NAMESPACES_19115_3.MRD,
      gex: NAMESPACES_19115_3.GEX,
      // gmd: NAMESPACES_19115.GMD,
      gml: NAMESPACES_19115.GML
      // gmx: NAMESPACES_19115.GMX
    }
  };
  // find the corresponding root namespaces
  const nsLookup = JSONPath({
    path: `$..${rootProperty}` + '..`$', // need to escape the $ here
    json: sourceJson,
    flatten: true
  })[0];
  // look for a property like this in nsLookup: 'xmlns:gmd': 'http://www.isotc211.org/2005/gmd'
  const filtered = Object.keys(nsLookup).filter(
    key => key.split(':')[1]?.toLowerCase() === schema
  )[0];
  // get the schema url
  const schemaUrl = nsLookup[filtered];
  // look up the corresponding schema namespace
  const schemaNamespaces = XPATH_NAMESPACES[schemaUrl];
  // need to return something like: { gmd: 'gmd:', gco: 'gco:', gml: 'gml:', gmx: 'gmx:' }
  const dynamicNameSpaceMapping = {};
  // build up our returned name space object
  for (const key in schemaNamespaces) {
    const url = schemaNamespaces[key];
    dynamicNameSpaceMapping[key] =
      Object.keys(nsLookup)
        .find(key => nsLookup[key] === url)
        ?.split(':')[1] + ':';
  }
  return dynamicNameSpaceMapping;
}

function applicatorRunner (options, sourceJson, registryRecord, metadataType) {
  // build out and return the transformed augmented json
  const { applicators } = options.deps;
  const { xmlNsMap } = metadataType;
  const inputs = { sourceJson, registryRecord };

  const applicatorsArray = [
    {
      fn: applicators.applyGeneric,
      title: 'Publication Date',
      required: false,
      augmentedProperty: 'publicationDate',
      // selectors
      iso19139: `$..${xmlNsMap.gmd}identificationInfo..${xmlNsMap.gmd}MD_DataIdentification..${xmlNsMap.gmd}citation..${xmlNsMap.gmd}CI_Citation..${xmlNsMap.gmd}date..${xmlNsMap.gmd}CI_Date..${xmlNsMap.gmd}date..${xmlNsMap.gco}Date`,
      'iso19115-2': `$..${xmlNsMap.gmd}identificationInfo..${xmlNsMap.gmd}MD_DataIdentification..${xmlNsMap.gmd}citation..${xmlNsMap.gmd}CI_Citation..${xmlNsMap.gmd}date..${xmlNsMap.gmd}CI_Date..${xmlNsMap.gmd}date..${xmlNsMap.gco}Date`,
      'iso19115-3:1.0': `$..${xmlNsMap.mdb}identificationInfo..${xmlNsMap.mri}MD_DataIdentification..${xmlNsMap.mri}citation..${xmlNsMap.cit}CI_Citation..${xmlNsMap.cit}date..${xmlNsMap.cit}CI_Date..${xmlNsMap.cit}date..${xmlNsMap.gco}DateTime`,
      'iso19115-3:2.0': `$..${xmlNsMap.mdb}identificationInfo..${xmlNsMap.mri}MD_DataIdentification..${xmlNsMap.mri}citation..${xmlNsMap.cit}CI_Citation..${xmlNsMap.cit}date..${xmlNsMap.cit}CI_Date..${xmlNsMap.cit}date..${xmlNsMap.gco}DateTime`
    },

    {
      fn: applicators.applyGeneric,
      title: 'Responsible Party',
      required: false,
      augmentedProperty: 'responsibleParty',
      // selectors
      iso19139: `$..${xmlNsMap.gmd}contact..${xmlNsMap.gmd}CI_ResponsibleParty..${xmlNsMap.gmd}organisationName..${xmlNsMap.gco}CharacterString`,
      'iso19115-2': `$..${xmlNsMap.gmd}dateStamp..${xmlNsMap.gco}Date`,
      'iso19115-3:1.0': `$..${xmlNsMap.mdb}contact..${xmlNsMap.cit}CI_Responsibility..${xmlNsMap.cit}party..${xmlNsMap.cit}CI_Organisation..${xmlNsMap.cit}name..${xmlNsMap.gco}CharacterString`,
      'iso19115-3:2.0': `$..${xmlNsMap.mdb}contact..${xmlNsMap.cit}CI_Responsibility..${xmlNsMap.cit}party..${xmlNsMap.cit}CI_Organisation..${xmlNsMap.cit}name..${xmlNsMap.gco}CharacterString`
    },

    {
      fn: applicators.applyGeneric,
      title: 'Metadata Standard Name',
      required: false,
      augmentedProperty: 'metadataStandardName',
      // selectors
      iso19139: `$..${xmlNsMap.gmd}metadataStandardName..${xmlNsMap.gco}CharacterString`,
      'iso19115-2': `$..${xmlNsMap.gmd}metadataStandardName..${xmlNsMap.gco}CharacterString`,
      'iso19115-3:1.0': `$..${xmlNsMap.mdb}metadataStandard..${xmlNsMap.cit}CI_Citation..${xmlNsMap.cit}title..${xmlNsMap.gco}CharacterString`,
      'iso19115-3:2.0': `$..${xmlNsMap.mdb}metadataStandard..${xmlNsMap.cit}CI_Citation..${xmlNsMap.cit}title..${xmlNsMap.gco}CharacterString`
    },

    {
      // use a non-generic function since this one is a bit more complex, requiring multiple selectors
      fn: applicators.applyBoundingBox,
      title: 'Bounding Box',
      required: false,
      augmentedProperty: 'boundingBox',
      //pass in the metadata type to handle selectors in the function
      metadataType
    },

    {
      fn: applicators.applyGeneric,
      title: 'Title',
      required: true,
      augmentedProperty: 'title',
      // selectors
      iso19139: `$..${xmlNsMap.gmd}identificationInfo..${xmlNsMap.gmd}MD_DataIdentification..${xmlNsMap.gmd}citation..${xmlNsMap.gmd}CI_Citation..${xmlNsMap.gmd}title..${xmlNsMap.gco}CharacterString`,
      'iso19115-2': `$..${xmlNsMap.gmd}identificationInfo..${xmlNsMap.gmd}MD_DataIdentification..${xmlNsMap.gmd}citation..${xmlNsMap.gmd}CI_Citation..${xmlNsMap.gmd}title..${xmlNsMap.gco}CharacterString`,
      'iso19115-3:1.0': `$..${xmlNsMap.mdb}identificationInfo..${xmlNsMap.mri}MD_DataIdentification..${xmlNsMap.mri}citation..${xmlNsMap.cit}CI_Citation..${xmlNsMap.cit}title..${xmlNsMap.gco}CharacterString`,
      'iso19115-3:2.0': `$..${xmlNsMap.mdb}identificationInfo..${xmlNsMap.mri}MD_DataIdentification..${xmlNsMap.mri}citation..${xmlNsMap.cit}CI_Citation..${xmlNsMap.cit}title..${xmlNsMap.gco}CharacterString`
    },

    {
      fn: applicators.applyGeneric,
      title: 'Format',
      required: false,
      augmentedProperty: 'format',
      // selectors
      iso19139: `$..${xmlNsMap.gmd}distributionInfo..${xmlNsMap.gmd}MD_Distribution..${xmlNsMap.gmd}distributionFormat..${xmlNsMap.gmd}MD_Format..${xmlNsMap.gmd}name..${xmlNsMap.gco}CharacterString`,
      'iso19115-2': `$..${xmlNsMap.gmd}distributionInfo..${xmlNsMap.gmd}MD_Distribution..${xmlNsMap.gmd}distributionFormat..${xmlNsMap.gmd}MD_Format..${xmlNsMap.gmd}name..${xmlNsMap.gco}CharacterString`,
      'iso19115-3:1.0': `$..${xmlNsMap.mdb}distributionInfo..${xmlNsMap.mrd}MD_Distribution..${xmlNsMap.mrd}distributionFormat..${xmlNsMap.mrd}MD_Format..${xmlNsMap.mrd}formatSpecificationCitation..${xmlNsMap.cit}CI_Citation..${xmlNsMap.cit}title..${xmlNsMap.gco}CharacterString`,
      'iso19115-3:2.0': `$..${xmlNsMap.mdb}distributionInfo..${xmlNsMap.mrd}MD_Distribution..${xmlNsMap.mrd}distributionFormat..${xmlNsMap.mrd}MD_Format..${xmlNsMap.mrd}formatSpecificationCitation..${xmlNsMap.cit}CI_Citation..${xmlNsMap.cit}title..${xmlNsMap.gco}CharacterString`
    },

    {
      fn: applicators.applyGeneric,
      title: 'Distribution Type',
      required: false,
      augmentedProperty: 'distributionType',
      // selectors
      iso19139: `$..${xmlNsMap.gmd}hierarchyLevel..${xmlNsMap.gmd}MD_ScopeCode.._`,
      'iso19115-2': `$..${xmlNsMap.gmd}hierarchyLevel..${xmlNsMap.gmd}MD_ScopeCode.._`,
      'iso19115-3:1.0': `$..${xmlNsMap.mdb}metadataScope..${xmlNsMap.mdb}MD_MetadataScope..${xmlNsMap.mdb}resourceScope..${xmlNsMap.mcc}MD_ScopeCode..'_'`,
      'iso19115-3:2.0': `$..${xmlNsMap.mdb}metadataScope..${xmlNsMap.mdb}MD_MetadataScope..${xmlNsMap.mdb}resourceScope..${xmlNsMap.mcc}MD_ScopeCode..'_'`
    },

    {
      fn: applicators.applyGeneric,
      title: 'Maintenance and Update Frequency',
      required: false,
      augmentedProperty: 'maintenanceAndUpdateFrequency',
      // selectors
      iso19139: `$..${xmlNsMap.gmd}identificationInfo..${xmlNsMap.gmd}MD_DataIdentification..${xmlNsMap.gmd}resourceMaintenance..${xmlNsMap.gmd}MD_MaintenanceInformation..${xmlNsMap.gmd}maintenanceAndUpdateFrequency..${xmlNsMap.gmd}MD_MaintenanceFrequencyCode..'_'`,
      'iso19115-2': `$..${xmlNsMap.gmd}identificationInfo..${xmlNsMap.gmd}MD_DataIdentification..${xmlNsMap.gmd}resourceMaintenance..${xmlNsMap.gmd}MD_MaintenanceInformation..${xmlNsMap.gmd}maintenanceAndUpdateFrequency..${xmlNsMap.gmd}MD_MaintenanceFrequencyCode..'_'`,
      'iso19115-3:1.0': `$..${xmlNsMap.mmi}maintenanceAndUpdateFrequency..${xmlNsMap.mmi}MD_MaintenanceFrequencyCode..'_'`,
      'iso19115-3:2.0': `$..${xmlNsMap.mmi}maintenanceAndUpdateFrequency..${xmlNsMap.mmi}MD_MaintenanceFrequencyCode..'_'`
    },

    {
      fn: applicators.applyGeneric,
      title: 'Agency Contact Name',
      required: false,
      augmentedProperty: 'agencyContactName',
      // selectors
      iso19139: `$..${xmlNsMap.gmd}contact..${xmlNsMap.gmd}CI_ResponsibleParty..${xmlNsMap.gmd}individualName..${xmlNsMap.gco}CharacterString`,
      'iso19115-2': `$..${xmlNsMap.gmd}contact..${xmlNsMap.gmd}CI_ResponsibleParty..${xmlNsMap.gmd}individualName..${xmlNsMap.gco}CharacterString`,
      'iso19115-3:1.0': `$..${xmlNsMap.cit}CI_Responsibility..${xmlNsMap.cit}party..${xmlNsMap.cit}CI_Organisation..${xmlNsMap.cit}CI_Individual...${xmlNsMap.cit}name...${xmlNsMap.gco}CharacterString`,
      'iso19115-3:2.0': `$..${xmlNsMap.cit}CI_Responsibility..${xmlNsMap.cit}party..${xmlNsMap.cit}CI_Organisation..${xmlNsMap.cit}CI_Individual...${xmlNsMap.cit}name...${xmlNsMap.gco}CharacterString`
    },

    {
      fn: applicators.applyGeneric,
      title: 'Abstract',
      required: true,
      augmentedProperty: 'abstract',
      // selectors
      iso19139: `$..${xmlNsMap.gmd}identificationInfo..${xmlNsMap.gmd}MD_DataIdentification..${xmlNsMap.gmd}abstract..${xmlNsMap.gco}CharacterString`,
      'iso19115-2': `$..${xmlNsMap.gmd}identificationInfo..${xmlNsMap.gmd}MD_DataIdentification..${xmlNsMap.gmd}abstract..${xmlNsMap.gco}CharacterString`,
      'iso19115-3:1.0': `$..${xmlNsMap.mri}MD_DataIdentification..${xmlNsMap.mri}abstract..${xmlNsMap.gco}CharacterString`,
      'iso19115-3:2.0': `$..${xmlNsMap.mri}MD_DataIdentification..${xmlNsMap.mri}abstract..${xmlNsMap.gco}CharacterString`
    },

    {
      fn: applicators.applyGeneric,
      title: 'Status',
      required: false,
      augmentedProperty: 'status',
      // selectors
      iso19139: `$..${xmlNsMap.gmd}identificationInfo..${xmlNsMap.gmd}MD_DataIdentification..${xmlNsMap.gmd}status..${xmlNsMap.gmd}MD_ProgressCode..'_'`,
      'iso19115-2': `$..${xmlNsMap.gmd}identificationInfo..${xmlNsMap.gmd}MD_DataIdentification..${xmlNsMap.gmd}status..${xmlNsMap.gmd}MD_ProgressCode..'_'`,
      'iso19115-3:1.0': `$..${xmlNsMap.mri}MD_DataIdentification..${xmlNsMap.mri}status..${xmlNsMap.mcc}MD_ProgressCode..'_'`,
      'iso19115-3:2.0': `$..${xmlNsMap.mri}MD_DataIdentification..${xmlNsMap.mri}status..${xmlNsMap.mcc}MD_ProgressCode..'_'`
    },

    // some simple inline functions to apply registry record attributes
    {
      fn: (options, augmentedJson, inputs, format) => {
        augmentedJson.registryId = inputs.registryRecord.registry_id;
        return augmentedJson;
      },
      required: true,
      title: 'Registry ID'
    },

    {
      fn: (options, augmentedJson, inputs, format) => {
        augmentedJson.theme = inputs.registryRecord.theme;
        return augmentedJson;
      },
      required: false,
      title: 'Theme'
    },

    {
      fn: (options, augmentedJson, inputs, format) => {
        augmentedJson.community = inputs.registryRecord.community;
        return augmentedJson;
      },
      required: false,
      title: 'Community'
    }
  ];

  let transformed = {};

  for (const applicator of applicatorsArray) {
    try {
      // call the applicator function. In the function, this == applicator object
      transformed = applicator.fn.bind(applicator)(
        options,
        transformed,
        inputs,
        metadataType
      );
    } catch (e) {
      if (applicator.required) {
        throw e;
      }
      // capture the error in output object
      transformed = captureAugmentationError(
        options,
        transformed,
        `${applicator.title}: ${e.message}`
      );
    }
  }
  return transformed;
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
    ['JSON_CACHE_BUCKET'],
    p => `Invalid options.env payload; missing property (${p})`
  );
  //validate deps
  gpUtils.validate(
    deps,
    ['logger', 's3', 'JSONPath'],
    p => `Invalid dependencies payload; missing dependency (${p})`
  );

  const sourceBucket = event.Records[0].s3.bucket.name;
  const keyName = event.Records[0].s3.object.key;
  const jsonCatalogKey = new JSONCatalog(keyName); // -csdgm or -dcat then throw
  const sourceJson = await getS3Object(options, keyName, sourceBucket);
  let metadataType = identifyXMLFormat(options, sourceJson);
  // add 'xmlNsMap' key to the metadataType object
  metadataType.xmlNsMap = buildXmlNameSpaceMapping(
    options,
    metadataType,
    sourceJson
  );
  if (jsonCatalogKey.keyName.includes('csdgm')) {
    throw new Error(
      'CSDGM metadata detected in key name, skipping augmentation.'
    );
  }
  const registryRecord = await getRegistryRecord(options, jsonCatalogKey);
  if (registryRecord === null) {
    throw new RegistryNotFoundError(`registry record not found for ${keyName}`);
  }
  const augmentedJson = applicatorRunner(
    options,
    sourceJson,
    registryRecord,
    metadataType
  );
  // dump results to s3
  await putS3Object(options, jsonCatalogKey, augmentedJson);
  return 'Success';
}

module.exports = {
  main,
  getS3Object,
  putS3Object,
  getRegistryRecord,
  captureAugmentationError,
  identifyXMLFormat,
  buildXmlNameSpaceMapping,
  applicatorRunner
};
