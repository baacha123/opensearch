const transformGnFacetParams = (options, queryString) => {
  // transform from GN encoded query string
  let result = {};
  if (queryString) {
    const queryParams = queryString.split('&');
    const mappedParams = queryParams.map(item => {
      const splitParam = item
        .split('/')
        .map(iter => iter.replaceAll('%20', ' '));
      return { [splitParam[0]]: splitParam[1] };
    });
    result = Object.assign({}, ...mappedParams);
  }
  return result;
};

const getPropertySummary = (options, openApiResponse, prop) => {
  return openApiResponse.aggregations[prop].buckets.map(item => ({
    '@count': item.doc_count,
    '@name': item.key,
    '@label': item.key
  }));
};

const toGeonetworkSearchResultObject = obj => {
  return {
    ...obj._source,
    abstract: obj._source.abstract,
    type: obj._source.distributionType,
    maintenanceAndUpdateFrequency_text: obj._source.status ?? [
      obj._source.status
    ],
    publicationDate: obj._source.publicationDate,
    status_text: obj._source.status ?? [obj._source.status],
    status: obj._source.status ?? [obj._source.status],
    standardName: obj._source.metadataStandardName,
    responsibleParty: obj._source.responsibleParty ?? [
      obj._source.responsibleParty
    ],
    'geonet:info': {
      id: obj._id,
      uuid: obj._id,
      changeDate: obj._source.modified
    }
  };
};

function toGeonetworkSearchResponse (options, openApiResponse) {
  const outObj = {
    '@from': '1',
    '@to': '10',
    '@selected': '0',
    '@maxPageSize': '100',
    summary: {
      '@count': openApiResponse.hits?.total.value || 0,
      agency: getPropertySummary(options, openApiResponse, 'agency'),
      agencyContactName: getPropertySummary(
        options,
        openApiResponse,
        'agencyContactName'
      ),
      types: getPropertySummary(options, openApiResponse, 'distributionType'),
      theme: getPropertySummary(options, openApiResponse, 'theme'),
      community: getPropertySummary(options, openApiResponse, 'community'),
      format: getPropertySummary(options, openApiResponse, 'format'),
      topics: getPropertySummary(options, openApiResponse, 'topics'),
      theme: getPropertySummary(options, openApiResponse, 'theme'),
      community: getPropertySummary(options, openApiResponse, 'community'),
      formats: getPropertySummary(options, openApiResponse, 'format'),
      status: getPropertySummary(options, openApiResponse, 'status'),
      metadataStandardName: getPropertySummary(
        options,
        openApiResponse,
        'metadataStandardName'
      ),
      responsibleParty: getPropertySummary(
        options,
        openApiResponse,
        'responsibleParty'
      )
    },
    metadata: openApiResponse.hits.hits.map(item =>
      toGeonetworkSearchResultObject(item)
    )
  };

  return outObj;
}

function toGeonetworkQSearchRecordResponse (options, openApiResponse) {
  // TODO: convert this static response to the openApiResponse
  const { gnQSearchRecordResponse } = options.deps;
  return gnQSearchRecordResponse;
}

function toGeonetworkAPIRecordResponse (options, openApiResponse) {
  // TODO: convert this static response to the openApiResponse
  const { gnApiRecordResponse } = options.deps;
  return gnApiRecordResponse;
}

function toGeonetworkSuggestResponse (options, queryTerm, openApiResponse) {
  return [queryTerm, openApiResponse.hits.hits.map(item => item._source.title)];
}

module.exports = {
  toGeonetworkSearchResponse,
  toGeonetworkQSearchRecordResponse,
  toGeonetworkAPIRecordResponse,
  toGeonetworkSuggestResponse,
  transformGnFacetParams
};
