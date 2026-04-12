import { describe, it, expect } from 'vitest';
import { sanitizePromptOrKeywords } from './sanitizer';

describe('Adobe Stock Compliance Sanitizer', () => {
  it('should strip technical suffixes from titles', () => {
    expect(sanitizePromptOrKeywords("Pizza Dough Stretching Video Clip")).toBe("Pizza Dough Stretching");
    expect(sanitizePromptOrKeywords("Nature Scene Footage")).toBe("Nature Scene");
    expect(sanitizePromptOrKeywords("Modern Architecture Motion Footage")).toBe("Modern Architecture");
  });

  it('should strip technical specs like 4K and UHD', () => {
    expect(sanitizePromptOrKeywords("Golden hour landscape 4K")).toBe("Golden hour landscape");
    expect(sanitizePromptOrKeywords("UHD forest background")).toBe("forest background");
    expect(sanitizePromptOrKeywords("8K resolution texture")).toBe("resolution texture");
  });

  it('should strip promotional language', () => {
    expect(sanitizePromptOrKeywords("Stunning amazing cinematic sunset")).toBe("sunset");
    expect(sanitizePromptOrKeywords("Exclusive masterpiece artwork")).toBe("artwork");
  });

  it('should perform smart swaps for IP-risky terms', () => {
    expect(sanitizePromptOrKeywords("Artisan Charcuterie Board")).toBe("Artisan gourmet meat and cheese platter");
    expect(sanitizePromptOrKeywords("Moka Pot on stove")).toBe("stovetop espresso maker on stove");
  });

  it('should clean up extra spaces after stripping', () => {
    expect(sanitizePromptOrKeywords("  Video   Clip   of   Nature   ")).toBe("of Nature");
  });
});
