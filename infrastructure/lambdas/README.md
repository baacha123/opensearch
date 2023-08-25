# lambdas

Standalone lambda resources.

This project creates the following resources:
 * Lambdas


## Install dependencies

```bash
npm i
```


## Deploy/remove resources

See `environment.yml` for stage variables.

```bash
sls deploy -v -s <stage> --aws-profile <profile>
sls remove -v -s <stage> --aws-profile <profile>
```

## Update GP-Lib

To update the GP-Lib tagged version update the version number in *lambdas/package.json* and *gp-core-lambda-layers/layers/gp-core/nodejs/package.json*. Then run npm install in both locations so it updates package-lock.json.

```
"@GeoPlatform/gp-lib": "github:GeoPlatform/GP-Lib#v1.0.24"
```

You will also need to update the `GP_CORE_LAYER_VERSION` env variable:
 - `sls` deploy the *gp-core-lambda-layers* stack. It will return something like this:
 ```yml
 layers:
  GPCore: arn:aws:lambda:us-east-1:998343784597:layer:GPCore:282
  ```
The tailing number, 282 in this case, is the value to set for `GP_CORE_LAYER_VERSION`. You can also retrieve this number in the AWS Console. 
## Environment Variables

| Name | Description | Example |
|---|---|---|
| AUDIT_SOURCE_DATASET_ENABLED | Flag determining if the scheduled cron is enabled for the AuditSourceDataset lambda | e.g. true |
| AWS_ACCOUNT_ID | The AWS account id for the environment | e.g. 998343784597 |
| STACK_NAME_PREFIX | The prefix of the stack if applicable. | e.g. "" |
| AUDIT_EMAIL_FROM | The from address for the audit email | e.g. 'GeoPlatform Notice <no-reply@geoplatform.info>' |
| AUDIT_EMAIL_LIST | The email list to send the audit email to | e.g. 'metadata-audit-report@xentity.com' |
| AUDIT_EXTRA_FIELDS | Appears to do nothing | e.g. false |
| AUDIT_REPORT_FUNCTION | The messaging function to use to send email (duplicate of MESSAGING_FUNCTION) | e.g. ${self:provider.stage}-Messaging |
| AUTHENTICATION_URL | The authentication URL to use | e.g. 'https://stg-accounts.geoplatform.gov/auth/token' |
| CATALOG_BASE_URL | The base url for data.gov catalog | e.g. 'https://catalog.data.gov/dataset/' |
| CATALOG_API_URL | The catalog API of data.gov | e.g. 'https://catalog.data.gov/api/3/action/package_show?id=' |
| CATALOG_API_PACKAGE_SEARCH_URL | Package search API of data.gov | e.g. 'https://catalog.data.gov/api/3/action/package_search?rows=1&q=name:' |
| CATALOG_API_ROOT | The root of the catalog API of data.gov | e.g. 'https://catalog.data.gov/api/3/action' |
| DEPLOYMENT_BUCKET_PREFIX | The prefix of the deployment bucket | e.g. ${self:custom.namespaceShort} |
| EXTRACT_METADATA_FROM_DATA_GOV_ENABLED | Flag determining if the scheduled cron is enabled for the ExtractMetadataFromDataGov lambda | e.g. true |
| GEONETWORK_API | The endpoint for GeoNetowrk API | e.g. https://${self:provider.stage}-geonetwork.geoplatform.info/geonetwork/srv |
| GEOPLATFORM_PORTAL_HOSTNAME | Hostname of GeoPlatform portal | e.g. ${self:provider.stage}.geoplatform.info |
| GEOSERVER_BASE_URL | Geoserver base URL | e.g. https://${self:provider.stage}-geoserver.geoplatform.info |
| GP_DATASET_BASE_URL | Geoplatform dataset base URL | e.g. 'http://www.geoplatform.gov/id/dataset/' |
| GP_DATASETS_BASE_URL | Geoplatform datasets base URL | e.g. 'https://www.geoplatform.gov/resources/datasets' |
| HARVEST_BASE_URL | Data.gov harvest base URL | e.g. https://catalog.data.gov/harvest/object/' |
| HARVEST_BUCKET | The name of the harvest bucket | e.g. ${self:custom.environment.DEPLOYMENT_BUCKET_PREFIX}-${self:provider.stage}-${self:provider.region}-magic-fgdc |
| HARVEST_DB_NAME | The harvest DB name | e.g. 'magic_harvest' |
| HARVEST_QUERY_URL | The harvest query URL parameters | e.g. 'datasets?q="Metadata Record in Data.gov Catalog"&size=2000' |
| HARVEST_TYPE | Appears to do nothing  | e.g. 'regp' |
| MAXIMUM_MESSAGE_SIZE | Limits the sqs message size in DetectNGDAChanges, ExtractNGDAData, PopulateTilegardenConfig & WaveMagicWand | e.g. 4096 |
| MESSAGING_FUNCTION | The messaging function to use to send email | e.g. ${self:provider.stage}-Messaging |
| MESSAGING_BUCKET | The bucket used by the messaging function for attachments, templates & etc | e.g. ${self:custom.environment.DEPLOYMENT_BUCKET_PREFIX}-${self:provider.stage}-${self:provider.region}-messaging-bucket |
| NGDA_HARVEST_DB_NAME | The harvest DB name (duplicate of HARVEST_DB_NAME) | e.g. 'magic_harvest' |
| NUMBER_OF_LAMBDA_VERSIONS_TO_RETAIN | The number of lambda versions to retain | e.g. 3 |
| PROCESS_SERVICES_BUCKET | The bucket used by the ProcessServicesBroker lambda to store populate_services_routing.json | e.g. ${self:custom.environment.DEPLOYMENT_BUCKET_PREFIX}-${self:provider.stage}-${self:provider.region}-process-services |
| PROCESS_SERVICES_ROUTING | The populate_services_routing.json file | e.g. 'populate_services_routing.json' |
| REGPADMIN | The secret for regp admin credentials | e.g. ${self:provider.stage}/geoplatform/admin-credentials |
| REGP_BASE_URL | RegP's base URL | e.g. 'https://ual.geoplatform.gov/api' |
| REGP_URL | RegP's staginv URL | e.g. 'https://stg-ual.geoplatform.gov/api' |
| REPORT_BUCKET | The name of the report bucket | e.g. ${self:custom.environment.DEPLOYMENT_BUCKET_PREFIX}-${self:provider.stage}-${self:provider.region}-report-bucket |
| SPATIAL_ARTIFACT_BUCKET | The name of the spatial artifact bucket | e.g. ${self:custom.environment.DEPLOYMENT_BUCKET_PREFIX}-${self:provider.stage}-${self:provider.region}-geoplatform-archive |
| TERRIAMAP_CATALOG_BUCKET | The name of the terriamap catalog where configurations are stored | e.g. ${self:custom.environment.DEPLOYMENT_BUCKET_PREFIX}-${self:provider.stage}-${self:provider.region}-terriamap-catalog |
| TILEGARDEN_CONFIG_BUCKET | The name of the tilegarden bucket where configurations are stored | e.g. ${self:custom.environment.DEPLOYMENT_BUCKET_PREFIX}-${self:provider.stage}-tileservice-configurations |
| TILEGARDEN_DB_NAME | The name of the tilegarden database |  e.g. 'tilegarden' |
| TILEGARDEN_PRECACHING_ENABLED | Flag determining if precaching is enabled |  e.g. "true" |
| TILEGARDEN_URL | The base URL for tilegarden |  e.g. https://${self:provider.stage}-tileservice.geoplatform.info |
| UPDATE_LMT_NGDA_ENABLED | Flag determining if the scheduled cron is enabled for the AuditSourceDataset lambda |  e.g. true |
| s3Sync | The list of directoryes to sync to s3 buckets |  e.g. - bucketName: ${self:custom.environment.DEPLOYMENT_BUCKET_PREFIX}-${self:provider.stage}-${self:provider.region}-messaging-bucket
                                                                     bucketPrefix: templates
                                                                     localDir: functions/detect-metadata-modified-date-v2/src/templates/build/
                                                                     # This is important -- many stacks might be copying templates; don't delete things that aren't yours!
                                                                     deleteRemoved: false  |
|   |   |   |

## References

 * https://www.serverless.com/framework/docs/providers/aws/events/schedule/
 * https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html
