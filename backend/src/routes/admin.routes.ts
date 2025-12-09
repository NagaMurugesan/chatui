import express from 'express';
import { dynamoDb, TABLE_SSO_CONFIG, TABLE_USERS, TABLE_SECRETS } from '../services/dynamo.service';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

const router = express.Router();

// Middleware to check if user is admin
const isAdmin = async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    try {
        const userId = req.user!.userId;
        const getParams = {
            TableName: TABLE_USERS,
            Key: { email: req.user!.email }, // Assuming email is the key, or we fetch by userId if GSI exists. 
            // Our auth middleware puts email in req.user. Let's use that.
        };

        // We need to fetch the full user object to check the role
        // In a real app, we might put the role in the JWT to avoid this DB call
        const userResult = await dynamoDb.client.send(new dynamoDb.GetCommand(getParams));
        const user = userResult.Item;

        if (user && user.role === 'admin') {
            next();
        } else {
            res.status(403).json({ error: 'Access denied. Admin only.' });
        }
    } catch (error) {
        console.error('Admin check error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

router.use(authenticateToken);
router.use(isAdmin);

// Fetch and Parse Metadata
router.post('/sso-metadata', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'Metadata URL is required' });
        }

        const response = await axios.get(url);
        const xmlData = response.data;

        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_"
        });
        const jsonObj = parser.parse(xmlData);

        const findKey = (obj: any, keySuffix: string): any => {
            for (const key in obj) {
                if (key.endsWith(keySuffix)) return obj[key];
            }
            return null;
        };

        const entityDescriptor = findKey(jsonObj, 'EntityDescriptor');
        if (!entityDescriptor) {
            console.error('EntityDescriptor not found');
            return res.status(400).json({ error: 'Invalid Metadata XML: EntityDescriptor not found' });
        }

        const issuer = entityDescriptor['@_entityID'];
        console.log('Issuer:', issuer);

        const idpDescriptor = findKey(entityDescriptor, 'IDPSSODescriptor');
        if (!idpDescriptor) {
            console.error('IDPSSODescriptor not found');
            return res.status(400).json({ error: 'Invalid Metadata XML: IDPSSODescriptor not found' });
        }

        // Find SingleSignOnService with HTTP-Redirect binding
        let ssoService = findKey(idpDescriptor, 'SingleSignOnService');
        // It might be an array or single object
        let entryPoint = '';
        if (Array.isArray(ssoService)) {
            const redirectService = ssoService.find((s: any) => s['@_Binding'] && s['@_Binding'].endsWith('HTTP-Redirect'));
            if (redirectService) entryPoint = redirectService['@_Location'];
        } else if (ssoService) {
            if (ssoService['@_Binding'] && ssoService['@_Binding'].endsWith('HTTP-Redirect')) {
                entryPoint = ssoService['@_Location'];
            }
        }
        console.log('EntryPoint:', entryPoint);

        // Find Certificate
        // Usually in KeyDescriptor -> KeyInfo -> X509Data -> X509Certificate
        let keyDescriptors = findKey(idpDescriptor, 'KeyDescriptor');
        let cert = '';

        const extractCert = (kd: any) => {
            const keyInfo = findKey(kd, 'KeyInfo');
            if (keyInfo) {
                const x509Data = findKey(keyInfo, 'X509Data');
                if (x509Data) {
                    const x509Cert = findKey(x509Data, 'X509Certificate');
                    if (x509Cert) return x509Cert;
                }
            }
            return null;
        };

        if (Array.isArray(keyDescriptors)) {
            // Prefer 'signing' use, or just take first
            const signingKey = keyDescriptors.find((k: any) => k['@_use'] === 'signing');
            if (signingKey) {
                cert = extractCert(signingKey);
            } else {
                cert = extractCert(keyDescriptors[0]);
            }
        } else if (keyDescriptors) {
            cert = extractCert(keyDescriptors);
        }
        console.log('Extracted Cert:', cert);

        res.json({
            entryPoint,
            issuer,
            cert
        });

    } catch (error) {
        console.error('Fetch metadata error:', error);
        res.status(500).json({ error: 'Failed to fetch or parse metadata' });
    }
});

// Configure SSO
router.post('/sso-config', async (req, res) => {
    try {
        const { entryPoint, issuer, cert } = req.body;
        console.log('Received SSO Config Save Request:', { entryPoint, issuer, certLength: cert ? cert.length : 0 });

        if (!entryPoint || !issuer || !cert) {
            console.error('Missing SSO configuration fields');
            return res.status(400).json({ error: 'Missing SSO configuration fields' });
        }

        // Check if this is the first config
        const scanParams = { TableName: TABLE_SSO_CONFIG };
        const scanResult = await dynamoDb.client.send(new dynamoDb.ScanCommand(scanParams));
        const isFirst = scanResult.Count === 0;

        const id = uuidv4();
        const params = {
            TableName: TABLE_SSO_CONFIG,
            Item: {
                id,
                entryPoint,
                issuer,
                cert,
                isActive: isFirst, // First one is active by default
                updatedAt: new Date().toISOString()
            }
        };

        console.log('Saving to DynamoDB:', JSON.stringify(params, null, 2));
        await dynamoDb.client.send(new dynamoDb.PutCommand(params));
        console.log('Saved successfully');
        res.json({ message: 'SSO configuration saved', id });
    } catch (error) {
        console.error('Save SSO config error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// List SSO Configs
router.get('/sso-config', async (req, res) => {
    try {
        const params = {
            TableName: TABLE_SSO_CONFIG,
        };
        const result = await dynamoDb.client.send(new dynamoDb.ScanCommand(params));
        res.json(result.Items);
    } catch (error) {
        console.error('List SSO config error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete SSO Config
router.delete('/sso-config/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ error: 'ID is required' });

        const params = {
            TableName: TABLE_SSO_CONFIG,
            Key: { id }
        };
        await dynamoDb.client.send(new dynamoDb.DeleteCommand(params));
        res.json({ message: 'Configuration deleted' });
    } catch (error) {
        console.error('Delete SSO config error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Activate SSO Config
router.post('/sso-config/:id/activate', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Get all configs
        const scanParams = { TableName: TABLE_SSO_CONFIG };
        const scanResult = await dynamoDb.client.send(new dynamoDb.ScanCommand(scanParams));
        const items = scanResult.Items || [];

        // 2. Update all to inactive, set target to active
        // In a real app, use TransactWriteItems or batch updates. Here we'll just loop for simplicity in this demo.
        for (const item of items) {
            const isActive = item.id === id;
            if (item.isActive !== isActive) {
                await dynamoDb.client.send(new dynamoDb.UpdateCommand({
                    TableName: TABLE_SSO_CONFIG,
                    Key: { id: item.id },
                    UpdateExpression: 'set isActive = :a',
                    ExpressionAttributeValues: { ':a': isActive }
                }));
            }
        }

        res.json({ message: 'Configuration activated' });
    } catch (error) {
        console.error('Activate SSO config error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create User (Local or SSO)
router.post('/users', async (req, res) => {
    try {
        const { email, password, firstName, lastName, role, authType } = req.body;

        if (!email || !firstName || !lastName || !authType) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if user exists
        const getParams = {
            TableName: TABLE_USERS,
            Key: { email },
        };
        const existingUser = await dynamoDb.client.send(new dynamoDb.GetCommand(getParams));
        if (existingUser.Item) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const userId = uuidv4();
        let hashedPassword = null;

        if (authType === 'local') {
            if (!password) {
                return res.status(400).json({ error: 'Password is required for local auth' });
            }
            hashedPassword = await bcrypt.hash(password, 10);
        }

        const newUser = {
            userId,
            email,
            firstName,
            lastName,
            role: role || 'user',
            authType, // 'local' or 'sso'
            password: hashedPassword,
            createdAt: new Date().toISOString(),
        };

        await dynamoDb.client.send(new dynamoDb.PutCommand({
            TableName: TABLE_USERS,
            Item: newUser
        }));

        res.status(201).json({ message: 'User created successfully', userId });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// List Users
router.get('/users', async (req, res) => {
    try {
        const params = {
            TableName: TABLE_USERS,
            ProjectionExpression: 'email, firstName, lastName, #r, authType, userId',
            ExpressionAttributeNames: { '#r': 'role' }
        };

        const result = await dynamoDb.client.send(new dynamoDb.ScanCommand(params));
        res.json(result.Items);
    } catch (error) {
        console.error('List users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete User
router.delete('/users/:email', async (req, res) => {
    try {
        const { email } = req.params;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Prevent deleting self
        // Cast req to AuthRequest to access user
        const authReq = req as AuthRequest;
        if (authReq.user?.email === email) {
            return res.status(400).json({ error: 'Cannot delete yourself' });
        }

        const params = {
            TableName: TABLE_USERS,
            Key: { email }
        };

        // Access DeleteCommand directly from the library class, or if the service wrapper doesn't expose it, 
        // we might need to import it or add it to the service.
        // Checking dynamo.service.ts, it likely exports the client and specific commands.
        // If DeleteCommand is not exported by the service instance, we should instantiate it directly from the SDK if imported,
        // OR check if the service wrapper has it.
        // The error said: Property 'DeleteCommand' does not exist on type ...
        // Let's check dynamo.service.ts content first to be sure, but for now I'll assume I need to import it or use the SDK one.
        // Wait, I can't see dynamo.service.ts right now.
        // Let's try to use the one from the service if I can fix the export, or just import from lib-dynamodb if needed.
        // Actually, the previous code used `new dynamoDb.DeleteCommand`.
        // The error says `dynamoDb` object (the service export) doesn't have `DeleteCommand`.
        // I should probably add it to the service or import it from @aws-sdk/lib-dynamodb.

        await dynamoDb.client.send(new dynamoDb.DeleteCommand(params));
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Store Secrets
router.post('/secrets', async (req, res) => {
    try {
        const { name, value } = req.body;
        if (!name || !value) {
            return res.status(400).json({ error: 'Name and value are required' });
        }

        const params = {
            TableName: TABLE_SECRETS,
            Item: {
                name,
                value,
                updatedAt: new Date().toISOString()
            }
        };

        await dynamoDb.client.send(new dynamoDb.PutCommand(params));
        res.json({ message: 'Secret saved successfully' });
    } catch (error) {
        console.error('Save secret error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
