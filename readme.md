Project Overview - Gravity Chat
High-Level Architecture
This is a full-stack web application designed to mimic a chat interface (like ChatGPT). It consists of three main parts:

Frontend: An Angular Single Page Application (SPA).
Backend: A Node.js/Express REST API.
Database: DynamoDB (running locally via Docker for development).
The entire stack is orchestrated using Docker Compose for easy local development.

Directory Structure
Root Directory
docker-compose.yml
: Defines the services (frontend, backend, dynamodb-local, dynamodb-admin) and how they connect.
backend/: Contains the server-side code.
frontend/: Contains the client-side code.
Backend (/backend)
Built with Node.js, Express, and TypeScript.

src/index.ts: The entry point. Sets up the Express server, middleware (CORS, JSON parsing), and connects routes.
src/routes/: Defines the API endpoints.
auth.routes.ts: Handles Login, Register, Forgot Password, and Reset Password.
chat.routes.ts: Handles fetching chats, messages, and sending new messages.
src/services/: Contains business logic and external integrations.
dynamo.service.ts: Manages the connection to DynamoDB. It adapts to use the local container in dev and AWS in production.
llm.service.ts: Abstraction for the LLM (Large Language Model). Currently acts as a mock, but designed to be swapped with OpenAI or AWS Bedrock.
src/middleware/:
auth.middleware.ts: Verifies JWT tokens to protect private routes.
src/scripts/:
init-db.ts: A utility script to create the necessary DynamoDB tables when starting fresh locally.
Frontend (/frontend)
Built with Angular 17+ and TailwindCSS.

src/app/components/: The UI building blocks.
login/: Handles user authentication (Login/Register/Forgot Password toggle).
reset-password/: The dedicated page for resetting the password via a token.
chat-window/: The main container. Orchestrates the Sidebar and Message area. Handles the logic for sending messages.
sidebar/: Displays the list of past chat sessions.
message-bubble/: Renders a single message (styled differently for User vs Assistant).
src/app/services/: Handles communication with the Backend.
auth.service.ts: Manages login state, stores JWT tokens in LocalStorage, and calls Auth APIs.
chat.service.ts: Calls Chat APIs to fetch history and send messages.
src/app/app.routes.ts: Defines the navigation rules (e.g., redirect to Login if not authenticated).
src/app/app.config.ts: Global configuration (providers like HttpClient).
Database
DynamoDB Local: A Docker container that emulates AWS DynamoDB.
Tables:
Users: Stores user credentials (hashed passwords).
ChatSessions: Stores metadata about chats (title, timestamps).
ChatMessages: Stores the actual message history.
Data Flow
User Interaction: User types a message in ChatWindowComponent.
Frontend Service: ChatService sends a POST request to the Backend.
API Route: chat.routes.ts receives the request and validates the User's Token.
Database Save: The User's message is saved to DynamoDB (ChatMessages table).
LLM Processing: The LLMService generates a response (mocked for now).
Response: The Assistant's response is saved to DynamoDB and sent back to the Frontend.
UI Update: The Frontend receives the response and pushes it to the messages array, updating the view.