export interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export class LLMService {
    private mcpHost = process.env.MCP_HOST || 'http://mcp-server:8000';

    async generateResponse(history: Message[], userMessage: string, model: string = 'llama3'): Promise<string> {
        try {
            console.log(`Sending request to MCP Server at ${this.mcpHost} with model: ${model}...`);

            const response = await fetch(`${this.mcpHost}/prompt`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [
                        ...history,
                        { role: 'user', content: userMessage }
                    ],
                    model: model
                }),
            });

            if (!response.ok) {
                throw new Error(`MCP Server error: ${response.statusText}`);
            }

            const data = await response.json() as any;
            return data.content || 'Sorry, I could not generate a response.';
        } catch (error) {
            console.error('LLM Service Error:', error);
            return `Error connecting to MCP Server: ${error instanceof Error ? error.message : String(error)}. Please ensure MCP Server is running.`;
        }
    }
}

export const llmService = new LLMService();
