module.exports = {
  'AWS::CloudWatch::Alarm': {
    destination: 'Alarms',
    allowSuffix: true
  },
  'AWS::Logs::MetricFilter': {
    destination: 'Filters',
    allowSuffix: true
  },
  'AWS::Logs::SubscriptionFilter': {
    destination: 'Filters',
    allowSuffix: true
  },
  'AWS::ApiGateway::Resource': {
    destination: 'API'
  },
  'AWS::ApiGateway::RestApi': {
    destination: 'API'
  },
  'AWS::ApiGateway::Method': {
    destination: 'APIMethods'
  },
  'AWS::Lambda::Version': {
    destination: 'Versions'
  },
  'AWS::Lambda::Permission': {
    destination: 'Permissions'
  },
  'AWS::SNS::Subscription': {
    destination: 'Subscriptions'
  },
  'AWS::SNS::TopicPolicy': {
    destination: 'Policies'
  },
  'AWS::S3::BucketPolicy': {
    destination: 'Policies'
  },
  'AWS::SQS::QueuePolicy': {
    destination: 'Policies'
  },
  'AWS::Logs::LogGroup': {
    destination: 'LogGroups'
  },
  'AWS::IAM::Role': {
    destination: 'IAMRoles'
  }
};
