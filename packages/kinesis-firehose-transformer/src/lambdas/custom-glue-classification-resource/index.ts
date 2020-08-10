import type { CloudFormationCustomResourceEvent, CloudFormationCustomResourceCreateEvent, Context } from 'aws-lambda';
import { Glue } from 'aws-sdk';
import * as https from 'https';
import { parse as parseURL } from 'url';

interface GlueClassificationProps {
  tableName: string;
  databaseName: string;
  dataFormat: string;
}

const glue = new Glue();

const getProperties = (props: CloudFormationCustomResourceEvent['ResourceProperties']): GlueClassificationProps => ({
  tableName: props.TableName,
  databaseName: props.DatabaseName,
  dataFormat: props.DataFormat
});

const getSuccessResponse = (event: CloudFormationCustomResourceEvent) => ({
  Status: 'SUCCESS',
  PhysicalResourceId: event.ResourceProperties.Key,
  StackId: event.StackId,
  RequestId: event.RequestId,
  LogicalResourceId: event.LogicalResourceId,
});

const getErrorResponse = (e: Error, event: CloudFormationCustomResourceEvent) => ({
  Status: 'FAILED',
  Reason: e.toString(),
  PhysicalResourceId: event.ResourceProperties.Key,
  StackId: event.StackId,
  RequestId: event.RequestId,
  LogicalResourceId: event.LogicalResourceId,
});

const sendResponse = async (response: any, urlString: string) => {
  console.log(`Sending response to ${urlString}`);
  const responseBody = JSON.stringify(response);
  const url = parseURL(urlString);
  const options = {
      headers: {
          'Content-Type': '',
          'Content-Length': responseBody.length,
      },
      hostname: url.hostname,
      method: 'PUT',
      port: url.port || 443,
      path: url.path,
      rejectUnauthorized: true,
  };

  return new Promise((resolve, reject) => {
      const request = https.request(options, (response) => {
          response.on('end', resolve);
      });
      request.on('error', reject);

      request.write(responseBody);
      request.end();
  });
}

const onCreate = async (event: CloudFormationCustomResourceCreateEvent) => {
  const props = getProperties(event.ResourceProperties);

  try {
    const paramsGet = {
      DatabaseName: props.databaseName,
      Name: props.tableName,
    };
    const table = (await glue.getTable(paramsGet).promise()).Table;

    if(table) {
      if(table.Parameters === undefined) {
        table.Parameters = {}  
      }
      table.Parameters.classification = props.dataFormat

      const paramsUpdate = {
        DatabaseName: props.databaseName,
        TableInput: {
            Name: table.Name,
            StorageDescriptor: table.StorageDescriptor,
            Parameters: {
                ...table.Parameters,
            },
            PartitionKeys: table.PartitionKeys,
        }
      };

      await glue.updateTable(paramsUpdate).promise();
      console.log(`Updated Glue Classification for table ${props.tableName}`);
    }
    return getSuccessResponse(event);
  } catch (e) {
    console.log(`[INFO] ${JSON.stringify(e)}`);
    return getErrorResponse(e, event);
  }
};

export const handler = async (event: CloudFormationCustomResourceEvent, context: Context) => {
  console.log(`Called with assumed role ${context.identity}`);
  const requestType = event.RequestType;

  switch (requestType) {
    case 'Create':
      const result = onCreate(event as CloudFormationCustomResourceCreateEvent);
      try {
        await sendResponse(result, event.ResponseURL);
      } catch (e) {
          console.error(`FAILED sending response to ${event.ResponseURL}`, result);
          throw e;
      }
    break;      
    case 'Update':
    case 'Delete':
      await sendResponse(getSuccessResponse(event), event.ResponseURL);
      return;
    default:
      throw new Error(`Invalid request type: ${requestType}`);
  }
};