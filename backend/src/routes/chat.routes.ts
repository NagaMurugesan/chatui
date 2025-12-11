import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dynamoDb, TABLE_CHATS, TABLE_MESSAGES } from '../services/dynamo.service';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { llmService } from '../services/llm.service';

const router = express.Router();

// Get all chats for user
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.userId;
        const params = {
            TableName: TABLE_CHATS,
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': userId,
            },
            // In a real app, you'd add an index for sorting by updatedAt
        };

        const result = await dynamoDb.client.send(new dynamoDb.QueryCommand(params));
        // Sort in memory for now since we haven't set up GSI yet
        const chats = result.Items?.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()) || [];

        res.json(chats);
    } catch (error) {
        console.error('Get chats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new chat
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.userId;
        const chatId = uuidv4();
        const timestamp = new Date().toISOString();

        const newChat = {
            userId,
            chatId,
            title: 'New Chat',
            createdAt: timestamp,
            updatedAt: timestamp,
        };

        await dynamoDb.client.send(new dynamoDb.PutCommand({
            TableName: TABLE_CHATS,
            Item: newChat,
        }));

        res.status(201).json(newChat);
    } catch (error) {
        console.error('Create chat error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get messages for a chat
router.get('/:chatId', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const { chatId } = req.params;
        // Verify ownership (optional but recommended)

        const params = {
            TableName: TABLE_MESSAGES,
            KeyConditionExpression: 'chatId = :chatId',
            ExpressionAttributeValues: {
                ':chatId': chatId,
            },
        };

        const result = await dynamoDb.client.send(new dynamoDb.QueryCommand(params));
        const messages = result.Items?.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) || [];

        res.json(messages);
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Send message
router.post('/:chatId/message', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const { chatId } = req.params;
        const { content, model } = req.body;
        const userId = req.user!.userId;

        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }

        const selectedModel = model || 'llama3'; // Default to llama3 if not specified
        const timestamp = new Date().toISOString();

        // 1. Save User Message
        const userMessage = {
            chatId,
            timestamp,
            role: 'user',
            content,
        };

        await dynamoDb.client.send(new dynamoDb.PutCommand({
            TableName: TABLE_MESSAGES,
            Item: userMessage,
        }));

        // 2. Get Chat History (for LLM context)
        // For simplicity, we'll just send the current message to the mock LLM
        // In production, you'd fetch the last N messages

        // 3. Call LLM with selected model
        const assistantResponse = await llmService.generateResponse([], content, selectedModel);
        const assistantTimestamp = new Date(Date.now() + 100).toISOString(); // Ensure it's slightly after

        // 4. Save Assistant Message
        const assistantMessage = {
            chatId,
            timestamp: assistantTimestamp,
            role: 'assistant',
            content: assistantResponse,
        };

        await dynamoDb.client.send(new dynamoDb.PutCommand({
            TableName: TABLE_MESSAGES,
            Item: assistantMessage,
        }));

        // 5. Update Chat "updatedAt" and Title (optional)
        await dynamoDb.client.send(new dynamoDb.PutCommand({
            TableName: TABLE_CHATS,
            Item: {
                userId,
                chatId,
                title: content.substring(0, 30) + '...', // Simple title update
                updatedAt: assistantTimestamp,
                createdAt: timestamp // We need to preserve createdAt, ideally we'd use UpdateItem but PutItem replaces
            }
        }));

        res.json({ userMessage, assistantMessage });

    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update chat title
router.put('/:chatId', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const { chatId } = req.params;
        const { title } = req.body;
        const userId = req.user!.userId;

        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        const params = {
            TableName: TABLE_CHATS,
            Key: {
                userId,
                chatId,
            },
            UpdateExpression: 'set title = :t, updatedAt = :u',
            ExpressionAttributeValues: {
                ':t': title,
                ':u': new Date().toISOString(),
            },
            ReturnValues: 'ALL_NEW' as const,
        };

        const result = await dynamoDb.client.send(new dynamoDb.UpdateCommand(params));

        res.json(result.Attributes);
    } catch (error) {
        console.error('Update chat error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
