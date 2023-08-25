const axios = require('axios');
const { program } = require('commander');
var { Client } = require('@opensearch-project/opensearch');
const AWS = require('aws-sdk'); // V2 SDK.
const { AwsSigv4Signer } = require('@opensearch-project/opensearch/aws');
const db = require('../utils/dbConnection');

// get the db connection params from the .env file
require('dotenv').config('../.env');

async function initOptions () {
  // Basic options
  const options = {
    deps: { Client, AwsSigv4Signer, AWS },
    env: process.env
  };
  // Initialize OpenSearch Client
  const openSearchClient = await db.connect(options);
  // Add the initialized client to the dependencies
  options.deps.openSearchClient = openSearchClient;
  return options;
}

program
  .option('-d', 'delete all data in the db first')
  // .option('-m <connection>', 'opensearch url ie. http://opensearch:9200')
  // .option('-a <auth>', 'credentials ie. admin:admin')
  .parse(process.argv);

const findHarvestObject = row => {
  return row.extras.find(x => x.key === 'harvest_object_id');
};

function transformRecord (data) {
  const coords = data.spatial?.split(',').map(str => parseFloat(str));
  const spatial = coords
    ? {
        type: 'envelope',
        coordinates: [
          [coords[0], coords[3]],
          [coords[2], coords[1]]
        ]
      }
    : '';
  // https://www.elastic.co/guide/en/elasticsearch/reference/7.17/geo-shape.html#_envelope
  const insertObj = {
    ...data,
    spatial,
    agency: data.publisher.name,
    agencyContactName: data.contactPoint.fn,
    distributionType: data['@type'].replace('dcat:', '')
  };

  return insertObj;
}

async function bulkHarvestData () {
  // bulk load doc: https://github.com/opensearch-project/opensearch-js/pull/480/files
  const options = await initOptions();
  const { openSearchClient } = options.deps;
  const programOptions = program.opts();

  const fetchData = async () => {
    let count = 0;

    let totalRecords;

    do {
      // update url with current start and rows params
      // https://catalog.data.gov/api/action/package_search?fq=organization:doi-gov&q=metadata_type:geospatial&sort=metadata_modified%20asc
      const batchSize = 1000;
      const dataGovUrl = `https://catalog.data.gov/api/action/package_search?fq=organization:doi-gov&q=metadata_type:geospatial&sort=metadata_modified%20asc&start=${count}&rows=${batchSize}`; //`https://catalog.data.gov/api/action/package_search?metadata_type:geospatial&rows=1000&start=${start}&q=identifier:*`
      const response = await axios.get(`${dataGovUrl}`);
      totalRecords = response.data.result.count;
      count += response.data.result.results.length;
      const bulkResults = response.data.result.results;
      let insertRecords = [];
      // exit while loop if no more records
      if (!bulkResults.length) break;
      for (const row of bulkResults) {
        // const values = (x) => Object.keys(x).map((k) => x[k]);
        const harvestObject = findHarvestObject(row);
        if (!harvestObject) {
          continue;
        }
        const id = harvestObject.value;
        const url = `https://catalog.data.gov/harvest/object/${id}`;
        try {
          const response = await axios.get(url);
          const { data, status } = response;
          const contentType = response.headers['content-type'];
          if (status === 200 && contentType.includes('application/json')) {
            insertRecords.push({ create: { _id: data.identifier } });
            insertRecords.push(transformRecord({ ...data }));
          }
        } catch (e) {
          console.log('error', e.message);
        }
      }

      try {
        const insertResponse = await openSearchClient.bulk({
          index: 'gp-records',
          body: insertRecords
        });
        console.log('inserted with status code', insertResponse.statusCode);
      } catch (e) {
        console.log('ERROR', e.message || JSON.stringify(e));
      }
      console.log(
        `Imported ${count +
          batchSize} records so far... Taking a 2-minute break.`
      );
      await new Promise(resolve => setTimeout(resolve, 2 * 60 * 1000));
    } while (count < totalRecords);
  };
  await fetchData();
}

bulkHarvestData();
