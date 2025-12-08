import { CreateTableCommand } from "@aws-sdk/client-dynamodb";
import { dynamoDb, TABLE_CHATS, TABLE_MESSAGES, TABLE_USERS, TABLE_SSO_CONFIG, TABLE_SECRETS } from "../services/dynamo.service";

const createTable = async (tableName: string, keySchema: any[], attributeDefinitions: any[]) => {
    try {
        const command = new CreateTableCommand({
            TableName: tableName,
            KeySchema: keySchema,
            AttributeDefinitions: attributeDefinitions,
            ProvisionedThroughput: {
                ReadCapacityUnits: 5,
                WriteCapacityUnits: 5,
            },
        });
        await dynamoDb.client.send(command);
        console.log(`Table ${tableName} created successfully.`);
    } catch (error: any) {
        if (error.name === "ResourceInUseException") {
            console.log(`Table ${tableName} already exists.`);
        } else {
            console.error(`Error creating table ${tableName}:`, error);
        }
    }
};

const initDb = async () => {
    console.log("Initializing DynamoDB Tables...");

    // Users Table
    await createTable(
        TABLE_USERS,
        [{ AttributeName: "email", KeyType: "HASH" }],
        [{ AttributeName: "email", AttributeType: "S" }]
    );

    // Chats Table
    await createTable(
        TABLE_CHATS,
        [
            { AttributeName: "userId", KeyType: "HASH" },
            { AttributeName: "chatId", KeyType: "RANGE" }
        ],
        [
            { AttributeName: "userId", AttributeType: "S" },
            { AttributeName: "chatId", AttributeType: "S" }
        ]
    );

    // Messages Table
    await createTable(
        TABLE_MESSAGES,
        [
            { AttributeName: "chatId", KeyType: "HASH" },
            { AttributeName: "timestamp", KeyType: "RANGE" }
        ],
        [
            { AttributeName: "chatId", AttributeType: "S" },
            { AttributeName: "timestamp", AttributeType: "S" }
        ]
    );

    // SSO Config Table
    await createTable(
        TABLE_SSO_CONFIG,
        [{ AttributeName: "id", KeyType: "HASH" }],
        [{ AttributeName: "id", AttributeType: "S" }]
    );

    // Secrets Table
    await createTable(
        TABLE_SECRETS,
        [{ AttributeName: "name", KeyType: "HASH" }],
        [{ AttributeName: "name", AttributeType: "S" }]
    );

    console.log("Initialization complete.");
};

initDb();
