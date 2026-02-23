// HTML sanitization for WYSIWYG editor output
// Runs in Worker before storing in D1 - never trust client-provided HTML

interface SanitizeOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  allowedStyles?: string[];
}

const DEFAULT_ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'strike', 'del',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'code', 'pre',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'td', 'th',
  'div', 'span', 'hr'
];

const DEFAULT_ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  '*': ['class', 'id'],
  'a': ['href', 'title', 'target'],
  'img': ['src', 'alt', 'title', 'width', 'height'],
  'table': ['border', 'cellpadding', 'cellspacing'],
  'td': ['colspan', 'rowspan'],
  'th': ['colspan', 'rowspan']
};

const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'];

function isValidUrl(url: string): boolean {
  try {
    // Allow relative URLs (starting with /)
    if (url.startsWith('/') && !url.startsWith('//')) {
      return true;
    }
    
    const parsed = new URL(url);
    return ALLOWED_PROTOCOLS.includes(parsed.protocol);
  } catch {
    return false;
  }
}

function sanitizeAttribute(tag: string, attr: string, value: string): string | null {
  // Check if attribute is allowed for this tag
  const allowedForTag = DEFAULT_ALLOWED_ATTRIBUTES[tag] || [];
  const allowedForAll = DEFAULT_ALLOWED_ATTRIBUTES['*'] || [];
  
  if (!allowedForTag.includes(attr) && !allowedForAll.includes(attr)) {
    return null;
  }
  
  // Special handling for href and src attributes
  if (attr === 'href' || attr === 'src') {
    if (!isValidUrl(value)) {
      return null;
    }
    
    // For links, add rel="noopener noreferrer" for external links
    if (attr === 'href' && !value.startsWith('/') && !value.startsWith('#')) {
      return value;
    }
  }
  
  // Escape quotes in attribute values
  return value.replace(/"/g, '&quot;');
}

export function sanitizeHtml(html: string, options?: SanitizeOptions): string {
  const allowedTags = options?.allowedTags || DEFAULT_ALLOWED_TAGS;
  
  // Use a simple regex-based approach for Cloudflare Workers
  // (DOMPurify is not available in Workers runtime)
  
  // First, remove script and style tags with their contents
  let sanitized = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Parse and sanitize HTML
  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g;
  
  sanitized = sanitized.replace(tagRegex, (match, tagName) => {
    const lowerTagName = tagName.toLowerCase();
    
    // Check if tag is allowed
    if (!allowedTags.includes(lowerTagName)) {
      return '';
    }
    
    // Self-closing tags
    if (match.endsWith('/>')) {
      const attrs = match.slice(match.indexOf(' ') || 0, -2);
      const sanitizedAttrs = sanitizeAttributes(lowerTagName, attrs);
      return `<${lowerTagName}${sanitizedAttrs} />`;
    }
    
    // Opening tags
    if (!match.startsWith('</')) {
      const attrsStart = match.indexOf(' ');
      if (attrsStart === -1) {
        return `<${lowerTagName}>`;
      }
      const attrs = match.slice(attrsStart, -1);
      const sanitizedAttrs = sanitizeAttributes(lowerTagName, attrs);
      return `<${lowerTagName}${sanitizedAttrs}>`;
    }
    
    // Closing tags
    return `</${lowerTagName}>`;
  });
  
  // Remove event handlers (onclick, onload, etc.)
  sanitized = sanitized.replace(/\s+on\w+="[^"]*"/gi, '');
  sanitized = sanitized.replace(/\s+on\w+='[^']*'/gi, '');
  sanitized = sanitized.replace(/\s+on\w+=[^\s>]+/gi, '');
  
  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Remove data: URLs (except for images)
  sanitized = sanitized.replace(/data:(?!image\/[a-z]+;)/gi, '');
  
  // Clean up multiple spaces
  sanitized = sanitized.replace(/\s+/g, ' ');
  
  return sanitized.trim();
}

function sanitizeAttributes(tag: string, attrs: string): string {
  if (!attrs.trim()) {
    return '';
  }
  
  const result: string[] = [];
  
  // Match attributes: attr="value" or attr='value' or attr=value or attr
  const attrRegex = /([a-zA-Z][a-zA-Z0-9-]*)=(?:("[^"]*")|('[^']*')|([^\s>]+))|([a-zA-Z][a-zA-Z0-9-]*)/g;
  let match;
  
  while ((match = attrRegex.exec(attrs)) !== null) {
    const attrName = match[1] || match[5];
    let attrValue = match[2] || match[3] || match[4] || '';
    
    // Remove quotes from value
    if (attrValue) {
      attrValue = attrValue.replace(/^["']|["']$/g, '');
    }
    
    const sanitizedValue = sanitizeAttribute(tag, attrName, attrValue);
    
    if (sanitizedValue !== null) {
      result.push(` ${attrName}="${sanitizedValue}"`);
    }
  }
  
  return result.join('');
}

// Escape HTML entities for plain text display
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Truncate HTML content to a specific length while preserving tags
export function truncateHtml(html: string, maxLength: number): string {
  // Remove HTML tags for length calculation
  const textOnly = html.replace(/<[^>]+>/g, '');
  
  if (textOnly.length <= maxLength) {
    return html;
  }
  
  // Simple truncation - just return plain text truncated
  // For more sophisticated truncation with tag preservation,
  // a proper HTML parser would be needed
  const truncated = textOnly.slice(0, maxLength).trim();
  return escapeHtml(truncated) + '...';
}

// Extract plain text from HTML
export function extractText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
