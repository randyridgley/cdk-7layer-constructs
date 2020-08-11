import {
  CloudFormationCustomResourceCreateEvent,
  CloudFormationCustomResourceDeleteEvent,
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceResponse,
  CloudFormationCustomResourceUpdateEvent,
} from 'aws-lambda';
import { Glue } from 'aws-sdk';

interface GlueClassificationProps {
  tableName: string;
  databaseName: string;
  dataFormat: string;
}

const getProperties = (props: CloudFormationCustomResourceEvent['ResourceProperties']): GlueClassificationProps => ({
  tableName: props.TableName,
  databaseName: props.DatabaseName,
  dataFormat: props.DataFormat
});

export const onCreate = async (event: CloudFormationCustomResourceCreateEvent): Promise<CloudFormationCustomResourceResponse> => {
    const glue = new Glue();
    const databaseTableName = event.ResourceProperties.DatabaseName + '-' + event.ResourceProperties.TableName
    try {
      const props = getProperties(event.ResourceProperties);      
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
        console.log(`Updated Glue Classification for table ${props.tableName}.${props.tableName}`);
      }
    } catch (err) {
        console.error(err);
    }

    const result: CloudFormationCustomResourceResponse  = {
      Status: 'SUCCESS',
      PhysicalResourceId: databaseTableName,
      Reason: 'Successfully updated Glue Table Classification',
      StackId: event.StackId,
      RequestId: event.RequestId,
      LogicalResourceId: event.LogicalResourceId,
    };
    console.log(JSON.stringify(result));
    return result;
};

// no-op
export const onUpdate = async (event: CloudFormationCustomResourceUpdateEvent): Promise<CloudFormationCustomResourceResponse> => {
    return {
        Status: 'SUCCESS',
        Reason: 'no-op',
        RequestId: event.RequestId,
        StackId: event.StackId,
        LogicalResourceId: event.LogicalResourceId,
        PhysicalResourceId: event.PhysicalResourceId,
    };
};

// no-op
export const onDelete = async (event: CloudFormationCustomResourceDeleteEvent): Promise<CloudFormationCustomResourceResponse> => {
    return {
        Status: 'SUCCESS',
        Reason: 'no-op',
        RequestId: event.RequestId,
        StackId: event.StackId,
        LogicalResourceId: event.LogicalResourceId,
        PhysicalResourceId: event.PhysicalResourceId,
    };
};

export const handler = (event: CloudFormationCustomResourceEvent): Promise<CloudFormationCustomResourceResponse> => {
    console.log(JSON.stringify(event));
    try {
        switch (event.RequestType) {
            case 'Create':
                return onCreate(event as CloudFormationCustomResourceCreateEvent);
            case 'Update':
                return onUpdate(event as CloudFormationCustomResourceUpdateEvent);
            case 'Delete':
                return onDelete(event as CloudFormationCustomResourceDeleteEvent);
            default:
                return Promise.reject(`Unknown event type in event ${event}`);
        }
    } catch (err) {
        console.error(err);
        return Promise.reject('Failed');
    }
};