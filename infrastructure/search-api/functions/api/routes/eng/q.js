module.exports = {
  get: async (req, res) => {
    const { options } = req.app.locals;
    const { env, deps } = options;
    const { openSearchClient, transformers } = deps;

    const {
      toGeonetworkSearchResponse,
      toGeonetworkQSearchRecordResponse,
      transformGnFacetParams
    } = transformers;

    // uuid query
    // https://geonetwork.geoplatform.gov/geonetwork/srv/eng/q?uuid=ab5918b8-ca47-53eb-abbc-971084506531
    const facetParams = transformGnFacetParams(options, req.query['facet.q']);
    const queryParams = { ...facetParams, ...req.query };
    if (queryParams.uuid) {
      try {
        // const response = await openSearchClient.get({
        //   index: env.INDEX_NAME,
        //   id: req.query.uuid
        // });
        const geonetworkResponse = toGeonetworkQSearchRecordResponse(
          req.app.locals.options,
          {}
        );
        return res.status(200).json(geonetworkResponse);
      } catch (e) {
        if (e.statusCode === 404) {
          return res
            .status(e.statusCode)
            .json({ error: 'No results found matching that ID. ' });
        }
        return res
          .status(e.statusCode || 500)
          .json({ error: e.message } || JSON.stringify(e));
      }
    }

    let requestBody = {
      from: req.query.from || 0,
      size: req.query.pageSize || 10,
      query: {
        match: {}
      },
      // aggregations
      aggs: {
        agency: {
          terms: {
            field: 'agency'
          }
        },
        distributionType: {
          terms: {
            field: 'distributionType'
          }
        },
        agencyContactName: {
          terms: {
            field: 'agencyContactName'
          }
        },
        theme: {
          terms: {
            field: 'theme'
          }
        },
        community: {
          terms: {
            field: 'community'
          }
        },
        format: {
          terms: {
            field: 'format'
          }
        },
        status: {
          terms: {
            field: 'status'
          }
        },
        topics: {
          terms: {
            field: 'topics'
          }
        },
        metadataStandardName: {
          terms: {
            field: 'metadataStandardName'
          }
        },
        responsibleParty: {
          terms: {
            field: 'responsibleParty'
          }
        }
      }
    };
    // title
    if (queryParams.title) {
      requestBody.query.match.title = queryParams.title;
    }
    if (queryParams.orgName) {
      requestBody.query.match.agency = queryParams.orgName;
    }
    if (queryParams.topicCat) {
      requestBody.query.match.theme = queryParams.topicCat;
    }
    if (queryParams.type) {
      requestBody.query.match.distributionType = queryParams.type;
    }
    if (queryParams.format) {
      requestBody.query.match.format = queryParams.format;
    }
    if (queryParams.status) {
      requestBody.query.match.status = queryParams.status;
    }
    if (queryParams.geometry) {
      // query via provided Well-Known Text (WKT)
      requestBody.query = {
        bool: {
          must:
            Object.keys(requestBody.query.match).length === 0
              ? { match_all: {} }
              : {
                  match: { ...requestBody.query.match }
                },
          filter: {
            geo_shape: {
              boundingBox: {
                shape: queryParams.geometry,
                relation: 'intersects'
              }
            }
          }
        }
      };
      delete requestBody.query.match;
    }

    // default response returns all records
    // http://localhost:9000/eng/q?_content_type=json&fast=index&sortBy=relevancy&to=10
    if (
      requestBody.query.match &&
      Object.keys(requestBody.query.match).length === 0
    ) {
      delete requestBody.query.match;
      requestBody.query.match_all = {};
    }
    try {
      const response = await openSearchClient.search({
        index: env.OPENSEARCH_INDEX_NAME,
        body: requestBody
      });
      // transform to a GN response structure
      const geonetworkResponse = toGeonetworkSearchResponse(
        req.app.locals.options,
        response.body
      );
      return res.status(200).json(geonetworkResponse);
    } catch (e) {
      return res
        .status(e.statusCode || 500)
        .json({ error: e.message } || JSON.stringify(e));
    }
  }
};
