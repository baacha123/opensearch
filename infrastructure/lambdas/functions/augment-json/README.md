# augment-json

Augments data.gov converted JSON for ingesting into OpenSearch. The output JSON should mirror the structure of the OpenSearch index mapping:
https://github.com/GeoPlatform/GeoPlatform/blob/develop/infrastructure/search-api/docker/gp-records.json


https://wiki.esipfed.org/MD_Metadata

## Quick Start

This lambda is invoked by s3 createObject events in the S3BucketJSONCache bucket

### To run locally
In the *functions.yml*, change the reference to your localhost for the `DB_HOST` variable. Then run:
```
> serverless invoke local --function AugmentJson --aws-profile sit --stage sit --path functions/augment-json/events/eventS3.json
```
The output augmented JSON will be written to the *data* directory. 

### To test locally:
```
> npx jest functions/augment-json/src/main.test.js
```