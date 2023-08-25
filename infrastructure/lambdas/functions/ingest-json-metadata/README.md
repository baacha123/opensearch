# ingest-json-metadata

Ingests JSON Metadata object into OpenSearch

## Quick Start

This lambda is invoked by s3 createObject events,  ingesting the event object into OpenSearch. 

To run locally:
```
> serverless invoke local -f IngestJsonMetadata --path functions/ingest-json-metadata/events/eventS3.json
```

To test locally:
```
> npx jest functions/ingest-json-metadata/src/main.test.js
```