import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import dotenv from 'dotenv';

dotenv.config();

const isLocal = process.env.DYNAMODB_ENDPOINT ? true : false;

const clientConfig = {
    region: process.env.AWS_REGION || "us-east-1",
    endpoint: process.env.DYNAMODB_ENDPOINT || "http://localhost:8000",
    credentials: {
        accessKeyId: "local",
        secretAccessKey: "local",
    },
};

const client = new DynamoDBClient(clientConfig);
const docClient = DynamoDBDocumentClient.from(client);

export const TABLE_USERS = process.env.TABLE_USERS || "Users"; // For local auth
export const TABLE_CHATS = process.env.TABLE_CHATS || "ChatSessions";
export const TABLE_MESSAGES = process.env.TABLE_MESSAGES || "ChatMessages";
export const TABLE_SSO_CONFIG = process.env.TABLE_SSO_CONFIG || 'SSOConfig';
export const TABLE_SECRETS = process.env.TABLE_SECRETS || 'Secrets';

export const dynamoDb = {
    client: docClient,
    PutCommand,
    GetCommand,
    QueryCommand,
    ScanCommand,
    UpdateCommand,
    DeleteCommand
};
