export interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export class LLMService {
    private ollamaHost = process.env.OLLAMA_HOST || 'http://host.docker.internal:11434';
    private model = process.env.OLLAMA_MODEL || 'llama3';

    async generateResponse(history: Message[], userMessage: string): Promise<string> {
        try {
            console.log(`Sending request to Ollama (${this.model}) at ${this.ollamaHost}...`);

            const response = await fetch(`${this.ollamaHost}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        ...history, // In a real app, you might want to limit history context window
                        { role: 'user', content: userMessage }
                    ],
                    stream: false // We are using non-streaming for now to fit the current architecture
                }),
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.statusText}`);
            }

            const data = await response.json() as any;
            return data.message?.content || 'Sorry, I could not generate a response.';
        } catch (error) {
            console.error('LLM Service Error:', error);
            return `Error connecting to Ollama: ${error instanceof Error ? error.message : String(error)}. Please ensure Ollama is running.`;
        }
    }
}

export const llmService = new LLMService();
