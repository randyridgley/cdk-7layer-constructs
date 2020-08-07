import type { CloudFormationCustomResourceEvent, CloudFormationCustomResourceCreateEvent } from 'aws-lambda';
import { Glue } from 'aws-sdk';

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

const onCreate = async (event: CloudFormationCustomResourceCreateEvent): Promise<void> => {
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
            ...table,
            Parameters: {
                ...table.Parameters,
            },            
        },
      };

      await glue.updateTable(paramsUpdate).promise();
    }
  } catch (e) {
    console.log(`[INFO] ${JSON.stringify(e)}`);
  }
  console.log(`Updated Glue Classification for table ${props.tableName}`);
};

export const handler = async (event: CloudFormationCustomResourceEvent): Promise<void> => {
  const requestType = event.RequestType;

  switch (requestType) {
    case 'Create':
      return onCreate(event as CloudFormationCustomResourceCreateEvent);
    case 'Update':
      return;
    case 'Delete':
      return;
    default:
      throw new Error(`Invalid request type: ${requestType}`);
  }
};