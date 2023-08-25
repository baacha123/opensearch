# GeoPlatform Infrastructure

GeoPlatform infrastructure resources. This package includes a networked VPC which serves as the foundation for most other modules.

## Prerequisites

To deploy these modules you must have an [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html) profile configured.
Serverless is used to deploy each project and can be installed globally `npm i -g serverless`

## Fixing failed deployments

Sometimes you might incorrectly configure a resource which causes your initial stack deployment to fail leaving the CloudFormation stack in the `ROLLBACK_COMPLETE` state. To resolve this, fix the configuration issue, delete the CF stack (`aws cloudformation delete-stack --stack-name <stack-name>`), then run the deploy command again using the `--force` flag.

## Deploying

Run `npm install` within each directory to install any serverless dependencies.

Run `sls deploy -v -s <stage>` within each directory to deploy any infrastructure changes.

Before deploying the `s3` module, you will have to manually create a deployment bucket (see `s3/README.md`). Once the `s3` module is deployed, it will create deployment buckets for all other modules.

Since some modules output resources that other modules depend on, modules should be deployed in the following order (reverse the order when removing resources):

### Deployment order (sit)

- s3
    - After s3, GPLib can be deployed. Migrations have been moved to GPLib and are dependent on s3 resources created in this stack.
- kms
- secrets
- iam
- ecr
- vpc
- sns
- sqs
- events
- acm
- acm-fargate
- ec2
- rds
- efs
- elasticsearch
- kb
- stac
- fargate
- api-gateway
- dynamodb
- tilegarden-serverless/tileService (external)
- tilegarden-serverless/precacher (external)
- lambdas
- public-api
- event-bus-rules
- magic-import
- geonetwork
- geoserver
- mongo-backup
- terriamap-configuration (external; terriamap container must be present in ECR)
- codepipeline (GitHub Personal Access Token musst be set in Secrets Manager)
- geoplatform_portal (external)

### Deployment order (stg/prd)

- s3
- kms
- secrets
- ecr
- vpc
- sns
- sqs
- events
- ec2
- rds
- efs
- kb
- stac
- fargate
- api-gateway
- dynamodb
- tilegarden-serverless/tileService (external)
- tilegarden-serverless/precacher (external)
- gp-core-lambda-layer (only STG; shared w/PRD)
- lambdas
- public-api
- internal-api
- stac-fastapi (external; build container)
- stac-api
- stac-import (build container)
- event-bus-rules
- magic-import (build container)
- geonetwork
- geoserver
- data-hosting
- terriamap-configuration (external; terriamap container must be present in ECR)
- codepipeline (GitHub Personal Access Token must be set in Secrets Manager)
- geoplatform_portal (external)
