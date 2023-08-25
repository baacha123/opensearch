# convert-iso-xml-to-json

Converts ISO XML to JSON

## Quick Start

This lambda is invoked by s3 createObject events, converting an ISO XML to a JSON object and writing to the specified s3 bucket. 

To run locally:
```
> serverless invoke local -f ConvertIsoXmlToJson --path functions/convert-iso-xml-to-json/events/eventS3.json
```

To test locally:
```
> npx jest functions/convert-iso-xml-to-json/src/main.test.js
```