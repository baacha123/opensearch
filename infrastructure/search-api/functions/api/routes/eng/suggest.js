module.exports = {
  get: async (req, res) => {
    const { env, deps } = req.app.locals.options;
    const { openSearchClient, transformers } = deps;

    const { toGeonetworkSuggestResponse } = transformers;

    // use the search_as_you_type mapping:
    // https://opensearch.org/docs/latest/field-types/supported-field-types/search-as-you-type/
    let requestBody = {
      query: {
        multi_match: {
          query: '',
          type: 'bool_prefix',
          fields: ['search_text', 'search_text._2gram', 'search_text._3gram']
        }
      }
    };

    // title
    if (req.query.q) {
      const queryTerm = req.query.q;
      requestBody.query.multi_match.query = queryTerm;

      try {
        const response = await openSearchClient.search({
          index: env.OPENSEARCH_INDEX_NAME,
          body: requestBody
        });
        // transform to a GN response structure
        const geonetworkResponse = toGeonetworkSuggestResponse(
          req.app.locals.options,
          queryTerm,
          response.body
        );
        return res.status(200).json(geonetworkResponse);
      } catch (e) {
        return res
          .status(e.statusCode || 500)
          .json({ error: e.message } || JSON.stringify(e));
      }
    }
  }
};
