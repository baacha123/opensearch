# OpenSearch

this stack captures opensearch infrastructure

This project creates the following resources:
 * CPU, Memory and Login alarms
 * RecordSetGroup
 * OpenSearchDomain
 
## Install dependencies

```bash
npm i
```

## Deploy/remove resources

```bash
sls deploy --verbose -s <stage> --aws-profile <profile>
sls remove --verbose -s <stage> --aws-profile <profile>
```
## Environment Variables

See `environment.yml` for stage variables.

  | Name | Description | Example |
  |---|---|---|
  | STACK_NAME_PREFIX | stack name prefix |  "" |
  | DEPLOYMENT_BUCKET_PREFIX | deployment bucket prefix |  ${self:custom.namespaceShort} |
  | EBS_IOPS | EBS IOPS option value |  3000 |
  | EBS_VOLUME_SIZE | EBS volume size option |  100 |
  | EBS_VOLUME_TYPE | EBS volume type option |  gp3 |
  | OPENSEARCH_HOSTNAME | opensearch custom endpoint hostname |  ${self:provider.stage}-${self:service}.geoplatform.info |
  | CERTIFICATE_ARN | opensearch custom certificate arn |  certificate arn |
  | DEDICATED_MASTER_COUNT | cluster dedicated mater count |  3 |
  | DEDICATED_MASTER_TYPE | cluster dedicated master type |  t3.small.search |
  | INSTANCE_COUNT | cluster instance count |  2 |
  | INSTANCE_TYPE | cluster instance type |  t3.small.search |
  | WARM_ENABLED | cluster warm enablemant |  false |


# Post Deployment Setup
1. The index will need to be create in initial deployment of the opensearch service; example with authorization:
    ```
    curl -X PUT -H "Content-Type: application/json" -H "Cache-Control: no-cache" --user <user>:<pass> -d @index-config/gp-records-v1.json https://sit-opensearch.geoplatform.info/gp-records-v1
    ```
    or for local instance (no auth required):
    ```
    curl -X PUT -H "Content-Type: application/json" -H "Cache-Control: no-cache" -d @index-config/gp-records-v1.json http://localhost:9200/gp-records-v1
    ```
2. A role mapping needs to be created in the AWS OpenSearch service for the lambda role. See these provided links for more info:
 - Programmatically create the role mapping: https://opensearch.org/docs/2.9/security/access-control/api/#create-role-mapping
 
   There is a sample *role-mapping.json* in the index-config folder that should be POSTable to the opensearch endpoint. 
 - Create the role mapping through the OpenSearch Dashboard: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/search-example.html#search-example-perms-fgac