# Running Locally

Docker is required

## 1. Run OpenSearch locally

See the (geoplatform-lab)[https://github.com/GeoPlatform/geoplatform-lab] repo for standing up a local OpenSearch and Dashboard instance.

## 2. Create the Index

The _opensearch_ stack contains a _index-config_ directory that has the index mapping configuration . The index mapping file (example gp-records-v1.json) contains fields to capture geospatial data (geo_shape) and the search_as_you_type field for suggestions. To create this index, you can issue a CURL command to the opensearch container:

```sh
curl -X PUT -H "Content-Type: application/json" -H "Cache-Control: no-cache"  -d @gp-records-v1.json http://localhost:9200/gp-records-v1
```

## 3. Bulk load DCAT records

To load DCAT records into the opensearch index:

  1. `cd functions/api && npm -i`
  2. **Rename sample.env to .env**
  3. `npm run dataharvest:sit`

## 4. Run the Express API locally

In the `functions/api` directory, run `npm run localServer` then navigate to http://localhost:9000/ to review the available endpoints.

## 5. Run geoplatform_portal locally

Before starting the app, change the `geonetApiUrl` env variable to http://localhost:9000