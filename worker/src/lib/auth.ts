// Authentication utilities - JWT and PBKDF2 password hashing
import type { JwtPayload } from '../db/schema';

const JWT_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days
const PBKDF2_ITERATIONS = 100000;

// Generate a secure random token
export async function generateSecureToken(length: number = 32): Promise<string> {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// PBKDF2 password hashing
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  
  // Generate random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // Derive key using PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  
  // Combine salt and hash: salt(16 bytes) + hash(32 bytes) = 48 bytes
  const combined = new Uint8Array(48);
  combined.set(salt, 0);
  combined.set(new Uint8Array(derivedBits), 16);
  
  // Base64 encode
  return btoa(String.fromCharCode(...combined));
}

// Verify password against hash
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    
    // Decode base64 hash
    const combined = new Uint8Array(
      atob(hash).split('').map(c => c.charCodeAt(0))
    );
    
    // Extract salt (first 16 bytes) and stored hash (remaining 32 bytes)
    const salt = combined.slice(0, 16);
    const storedHash = combined.slice(16);
    
    // Derive key with same salt
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordData,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );
    
    const derivedHash = new Uint8Array(derivedBits);
    
    // Constant-time comparison
    if (derivedHash.length !== storedHash.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < derivedHash.length; i++) {
      result |= derivedHash[i] ^ storedHash[i];
    }
    
    return result === 0;
  } catch {
    return false;
  }
}

// JWT sign
export async function signJwt(payload: Omit<JwtPayload, 'iat' | 'exp'>, secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  const header = { alg: 'HS256', typ: 'JWT' };
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + JWT_EXPIRY_SECONDS
  };
  
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '');
  const encodedPayload = btoa(JSON.stringify(fullPayload)).replace(/=/g, '');
  
  const data = `${encodedHeader}.${encodedPayload}`;
  
  // Sign with HMAC-SHA256
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '');
  
  return `${data}.${encodedSignature}`;
}

// JWT verify
export async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  try {
    const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
    
    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      return null;
    }
    
    // Verify signature
    const data = `${encodedHeader}.${encodedPayload}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(data);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const expectedSignature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const expectedSignatureB64 = btoa(String.fromCharCode(...new Uint8Array(expectedSignature))).replace(/=/g, '');
    
    if (encodedSignature !== expectedSignatureB64) {
      return null;
    }
    
    // Decode and parse payload
    const payloadJson = atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson) as JwtPayload;
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
}

// Hash a token for storage (for password reset tokens)
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
}
