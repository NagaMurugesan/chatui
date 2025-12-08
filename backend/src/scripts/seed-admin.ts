import { dynamoDb, TABLE_USERS } from "../services/dynamo.service";
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const seedAdmin = async () => {
    const email = 'admin@example.com';
    const password = 'admin';
    const firstName = 'Admin';
    const lastName = 'User';

    try {
        // Check if admin exists
        const getParams = {
            TableName: TABLE_USERS,
            Key: { email },
        };
        const existingUser = await dynamoDb.client.send(new dynamoDb.GetCommand(getParams));
        if (existingUser.Item) {
            console.log('Admin user already exists.');
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = uuidv4();

        const newUser = {
            userId,
            email,
            firstName,
            lastName,
            role: 'admin',
            authType: 'local',
            password: hashedPassword,
            createdAt: new Date().toISOString(),
        };

        await dynamoDb.client.send(new dynamoDb.PutCommand({
            TableName: TABLE_USERS,
            Item: newUser
        }));

        console.log(`Admin user created: ${email} / ${password}`);
    } catch (error) {
        console.error('Error seeding admin:', error);
    }
};

seedAdmin();
