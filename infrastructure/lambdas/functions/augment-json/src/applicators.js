// a one size fits all JSON Path applicator.
// https://github.com/JSONPath-Plus/JSONPath#properties
function applyGeneric (options, augmentedJson, inputs, format) {
  const { JSONPath } = options.deps;
  const { sourceJson } = inputs;
  const { isoStandard } = format;
  const val = JSONPath({
    path: this[isoStandard],
    json: sourceJson,
    flatten: true
  });
  if (val.length === 0 && this.required) {
    throw `"${this.title}" is a required field name but not found in the metadata.`;
  }
  augmentedJson[this.augmentedProperty] = val[0];
  return augmentedJson;
}

function getBBoxSelection (options, sourceJson, path) {
  const { JSONPath } = options.deps;
  return parseFloat(
    JSONPath({
      path,
      json: sourceJson,
      flatten: true
    })[0]
  );
}

// a custom applicator
// https://www.elastic.co/guide/en/elasticsearch/reference/7.17/geo-shape.html#_envelope
function applyBoundingBox (options, augmentedJson, inputs, format) {
  const { sourceJson } = inputs;
  const { xmlNsMap, isoStandard } = format;
  const isoStandardPaths = {
    iso19139: `$..${xmlNsMap.gmd}identificationInfo..${xmlNsMap.gmd}MD_DataIdentification..${xmlNsMap.gmd}extent..${xmlNsMap.gmd}EX_Extent..${xmlNsMap.gmd}geographicElement..${xmlNsMap.gmd}EX_GeographicBoundingBox`,
    'iso19115-2': `$..${xmlNsMap.gmd}identificationInfo..${xmlNsMap.gmd}MD_DataIdentification..${xmlNsMap.gmd}extent..${xmlNsMap.gmd}EX_Extent..${xmlNsMap.gmd}geographicElement..${xmlNsMap.gmd}EX_GeographicBoundingBox`,
    'iso19115-3:1.0': `$..${xmlNsMap.mdb}identificationInfo..${xmlNsMap.mri}MD_DataIdentification..${xmlNsMap.mri}extent..${xmlNsMap.gex}EX_Extent..${xmlNsMap.gex}geographicElement..${xmlNsMap.gex}EX_GeographicBoundingBox`,
    'iso19115-3:2.0': `$..${xmlNsMap.mdb}identificationInfo..${xmlNsMap.mri}MD_DataIdentification..${xmlNsMap.mri}extent..${xmlNsMap.gex}EX_Extent..${xmlNsMap.gex}geographicElement..${xmlNsMap.gex}EX_GeographicBoundingBox`
  };

  const coordSelectors = {
    iso19139: [
      [
        getBBoxSelection(
          options,
          sourceJson,
          `${isoStandardPaths[isoStandard]}..${xmlNsMap.gmd}westBoundLongitude..${xmlNsMap.gco}Decimal`
        ),
        getBBoxSelection(
          options,
          sourceJson,
          `${isoStandardPaths[isoStandard]}..${xmlNsMap.gmd}northBoundLatitude..${xmlNsMap.gco}Decimal`
        )
      ],
      [
        getBBoxSelection(
          options,
          sourceJson,
          `${isoStandardPaths[isoStandard]}..${xmlNsMap.gmd}eastBoundLongitude..${xmlNsMap.gco}Decimal`
        ),
        getBBoxSelection(
          options,
          sourceJson,
          `${isoStandardPaths[isoStandard]}..${xmlNsMap.gmd}southBoundLatitude..${xmlNsMap.gco}Decimal`
        )
      ]
    ],
    'iso19115-2': [
      [
        getBBoxSelection(
          options,
          sourceJson,
          `${isoStandardPaths[isoStandard]}..${xmlNsMap.gmd}westBoundLongitude..${xmlNsMap.gco}Decimal`
        ),
        getBBoxSelection(
          options,
          sourceJson,
          `${isoStandardPaths[isoStandard]}..${xmlNsMap.gmd}northBoundLatitude..${xmlNsMap.gco}Decimal`
        )
      ],
      [
        getBBoxSelection(
          options,
          sourceJson,
          `${isoStandardPaths[isoStandard]}..${xmlNsMap.gmd}eastBoundLongitude..${xmlNsMap.gco}Decimal`
        ),
        getBBoxSelection(
          options,
          sourceJson,
          `${isoStandardPaths[isoStandard]}..${xmlNsMap.gmd}southBoundLatitude..${xmlNsMap.gco}Decimal`
        )
      ]
    ],
    'iso19115-3:1.0': [
      [
        getBBoxSelection(
          options,
          sourceJson,
          `${isoStandardPaths[isoStandard]}..${xmlNsMap.gex}westBoundLongitude..${xmlNsMap.gco}Decimal`
        ),
        getBBoxSelection(
          options,
          sourceJson,
          `${isoStandardPaths[isoStandard]}..${xmlNsMap.gex}northBoundLatitude..${xmlNsMap.gco}Decimal`
        )
      ],
      [
        getBBoxSelection(
          options,
          sourceJson,
          `${isoStandardPaths[isoStandard]}..${xmlNsMap.gex}eastBoundLongitude..${xmlNsMap.gco}Decimal`
        ),
        getBBoxSelection(
          options,
          sourceJson,
          `${isoStandardPaths[isoStandard]}..${xmlNsMap.gex}southBoundLatitude..${xmlNsMap.gco}Decimal`
        )
      ]
    ],
    'iso19115-3:2.0': [
      [
        getBBoxSelection(
          options,
          sourceJson,
          `${isoStandardPaths[isoStandard]}..${xmlNsMap.gex}westBoundLongitude..${xmlNsMap.gco}Decimal`
        ),
        getBBoxSelection(
          options,
          sourceJson,
          `${isoStandardPaths[isoStandard]}..${xmlNsMap.gex}northBoundLatitude..${xmlNsMap.gco}Decimal`
        )
      ],
      [
        getBBoxSelection(
          options,
          sourceJson,
          `${isoStandardPaths[isoStandard]}..${xmlNsMap.gex}eastBoundLongitude..${xmlNsMap.gco}Decimal`
        ),
        getBBoxSelection(
          options,
          sourceJson,
          `${isoStandardPaths[isoStandard]}..${xmlNsMap.gex}southBoundLatitude..${xmlNsMap.gco}Decimal`
        )
      ]
    ]
  };

  augmentedJson.boundingBox = {
    type: 'envelope',
    coordinates: coordSelectors[isoStandard]
  };
  return augmentedJson;
}

module.exports = {
  applyGeneric,
  applyBoundingBox
};
