import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { dynamoDb, TABLE_USERS, TABLE_SSO_CONFIG } from '../services/dynamo.service';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

// Register
router.post('/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;
        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({ error: 'All fields are required' });
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

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = uuidv4();

        const putParams = {
            TableName: TABLE_USERS,
            Item: {
                email,
                userId,
                password: hashedPassword,
                firstName,
                lastName,
                createdAt: new Date().toISOString(),
            },
        };

        await dynamoDb.client.send(new dynamoDb.PutCommand(putParams));

        res.status(201).json({ message: 'User registered successfully', userId });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const getParams = {
            TableName: TABLE_USERS,
            Key: { email },
        };
        const userResult = await dynamoDb.client.send(new dynamoDb.GetCommand(getParams));
        const user = userResult.Item;

        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        if (user.authType === 'sso') {
            return res.status(400).json({ error: 'Please use SSO login' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            {
                userId: user.userId,
                email: user.email,
                role: user.role || 'user'
            },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            token,
            userId: user.userId,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role || 'user'
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Check if user exists
        const getParams = {
            TableName: TABLE_USERS,
            Key: { email },
        };
        const userResult = await dynamoDb.client.send(new dynamoDb.GetCommand(getParams));
        if (!userResult.Item) {
            // Don't reveal if user exists
            return res.json({ message: 'If your email is registered, you will receive a reset link.' });
        }

        // Generate reset token (valid for 15 mins)
        const resetToken = jwt.sign({ email, type: 'reset' }, JWT_SECRET, { expiresIn: '15m' });

        // In a real app, send email. Here, log it.
        const resetLink = `http://localhost:4200/reset-password?token=${resetToken}`;
        console.log('================================================');
        console.log(`PASSWORD RESET LINK FOR ${email}:`);
        console.log(resetLink);
        console.log('================================================');

        res.json({ message: 'If your email is registered, you will receive a reset link.' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }

        // Verify token
        let decoded: any;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        if (decoded.type !== 'reset') {
            return res.status(400).json({ error: 'Invalid token type' });
        }

        const email = decoded.email;
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password in DynamoDB
        // We need to fetch the item first to preserve other fields (like userId, createdAt)
        // Or use UpdateItem if we want to be more efficient, but PutItem is easier with the current setup if we read first.
        // Let's use UpdateItem to be safe and efficient.

        const updateParams = {
            TableName: TABLE_USERS,
            Key: { email },
            UpdateExpression: 'set password = :p',
            ExpressionAttributeValues: {
                ':p': hashedPassword,
            },
        };

        await dynamoDb.client.send(new dynamoDb.UpdateCommand(updateParams));

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update Profile
router.put('/profile', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) return res.sendStatus(401);

        const user: any = jwt.verify(token, JWT_SECRET);
        const { firstName, lastName } = req.body;

        if (!firstName || !lastName) {
            return res.status(400).json({ error: 'First name and last name are required' });
        }

        const updateParams = {
            TableName: TABLE_USERS,
            Key: { email: user.email },
            UpdateExpression: 'set firstName = :f, lastName = :l',
            ExpressionAttributeValues: {
                ':f': firstName,
                ':l': lastName,
            },
            ReturnValues: 'ALL_NEW' as const,
        };

        const result = await dynamoDb.client.send(new dynamoDb.UpdateCommand(updateParams));
        const updatedUser = result.Attributes;

        res.json({
            message: 'Profile updated successfully',
            name: `${updatedUser?.firstName} ${updatedUser?.lastName}`
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Change Password
router.put('/change-password', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) return res.sendStatus(401);

        const user: any = jwt.verify(token, JWT_SECRET);
        const { newPassword } = req.body;

        if (!newPassword) {
            return res.status(400).json({ error: 'New password is required' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const updateParams = {
            TableName: TABLE_USERS,
            Key: { email: user.email },
            UpdateExpression: 'set password = :p',
            ExpressionAttributeValues: {
                ':p': hashedPassword,
            },
        };

        await dynamoDb.client.send(new dynamoDb.UpdateCommand(updateParams));

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

import { SAML } from '@node-saml/node-saml';

// Helper to get SAML instance with active config
const getSaml = async () => {
    const params = {
        TableName: TABLE_SSO_CONFIG,
        FilterExpression: 'isActive = :active',
        ExpressionAttributeValues: { ':active': true }
    };

    const result = await dynamoDb.client.send(new dynamoDb.ScanCommand(params));
    const config = result.Items ? result.Items[0] : null;

    if (!config) {
        throw new Error('No active SSO configuration found');
    }

    console.log('getSaml: Using config:', {
        id: config.id,
        issuer: config.issuer,
        entryPoint: config.entryPoint,
        certLength: config.cert ? config.cert.length : 0
    });

    if (!config.cert) {
        throw new Error('Active SSO configuration is missing certificate');
    }

    // Fix for local docker environment: Replace internal hostname with localhost for browser redirect
    // This ensures the 'Destination' attribute in the SAML request matches the browser URL
    const entryPoint = config.entryPoint.replace('keycloak:8080', 'localhost:8080');

    return new SAML({
        callbackUrl: 'http://localhost:3000/auth/sso/callback',
        entryPoint: entryPoint,
        issuer: 'gravity-chat', // SP Entity ID
        idpCert: config.cert, // IdP Public Key
        wantAssertionsSigned: false, // For dev/keycloak
        authnRequestBinding: 'HTTP-Redirect',
        signatureAlgorithm: 'sha256',
        digestAlgorithm: 'sha256'
    } as any);
};

// SSO Login - Initiate SAML Flow
router.post('/sso/login', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required for SSO login' });
        }

        // 1. Validate User Exists and is SSO
        const getParams = {
            TableName: TABLE_USERS,
            Key: { email }
        };
        const userResult = await dynamoDb.client.send(new dynamoDb.GetCommand(getParams));
        const user = userResult.Item;

        if (!user) {
            return res.status(404).json({ error: 'User not found. Please contact your administrator.' });
        }

        if (user.authType !== 'sso') {
            return res.status(400).json({ error: 'This account is configured for password login. Please use the "Login" tab.' });
        }

        // 2. Get SAML URL
        const saml = await getSaml();
        const loginUrl = await saml.getAuthorizeUrlAsync("", "", {});

        console.log('SSO Login Request Body:', req.body);
        console.log('Generated SSO URL:', loginUrl);

        res.json({ ssoUrl: loginUrl });
    } catch (error: any) {
        console.error('SSO login error:', error);
        if (error.message === 'SSO not configured') {
            return res.status(400).json({ error: 'SSO is not configured by admin' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// SSO Callback
router.post('/sso/callback', async (req, res) => {
    try {
        const saml = await getSaml();
        const { profile } = await saml.validatePostResponseAsync(req.body);

        // Okta usually returns email in nameID or attributes
        const email = profile?.nameID || profile?.email;

        if (!email) {
            return res.status(400).json({ error: 'No email found in SAML response' });
        }

        const getParams = {
            TableName: TABLE_USERS,
            Key: { email },
        };
        const userResult = await dynamoDb.client.send(new dynamoDb.GetCommand(getParams));
        const user = userResult.Item;

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.authType !== 'sso') {
            return res.status(400).json({ error: 'Please use local login' });
        }

        const token = jwt.sign(
            {
                userId: user.userId,
                email: user.email,
                role: user.role || 'user'
            },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        // For a real SAML flow, this endpoint is usually hit by the browser via POST.
        // We need to redirect back to the frontend with the token.
        // However, our current frontend implementation expects a JSON response because it's handling the flow differently?
        // Wait, standard SAML flow:
        // 1. Frontend calls /sso/login -> gets URL -> redirects.
        // 2. User logs in at IdP.
        // 3. IdP POSTs to /sso/callback.
        // 4. Backend validates and redirects to Frontend with token.

        // Let's adjust to redirect to frontend with token in query param
        res.redirect(`http://localhost:4200/login?token=${token}&userId=${user.userId}&name=${encodeURIComponent(user.firstName + ' ' + user.lastName)}&role=${user.role || 'user'}`);

    } catch (error) {
        console.error('SSO callback error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
