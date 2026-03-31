import { describe, it, expect } from 'vitest';
import { invokeLLM } from './_core/llm';

describe('OpenAI Integration', () => {
  it('should successfully call OpenAI API with valid credentials', async () => {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant.'
        },
        {
          role: 'user',
          content: 'Say "test successful" if you receive this message.'
        }
      ]
    });

    expect(response).toBeDefined();
    expect(response.choices).toBeDefined();
    expect(response.choices.length).toBeGreaterThan(0);
    expect(response.choices[0].message).toBeDefined();
    expect(response.choices[0].message.content).toBeDefined();
    expect(typeof response.choices[0].message.content).toBe('string');
  }, { timeout: 30000 });
});
