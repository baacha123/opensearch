module.exports = {
  get: async (req, res) => {
    const { openSearchClient, transformers } = req.app.locals.options.deps;

    const { toGeonetworkAPIRecordResponse } = transformers;

    // record detail, example request:
    // https://geonetwork.geoplatform.gov/geonetwork/srv/api/records/17f7efc0-8382-560e-888f-4d07bdd9b980/formatters/json?approved=true&root=div&view=advanced
    try {
      //   const response = await openSearchClient.get({
      //     index: 'gp-records',
      //     id: req.params.uuid
      //   });
      return res
        .status(200)
        .json(toGeonetworkAPIRecordResponse(req.app.locals.options, {}));
    } catch (e) {
      if (e.statusCode === 404) {
        return res
          .status(e.statusCode)
          .json({ error: 'No results found matching that ID. ' });
      }
      return res
        .status(e.statusCode || 500)
        .json({ error: e.message || JSON.stringify(e) });
    }
  }
};
