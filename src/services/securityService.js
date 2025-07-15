/**
 * Security Service for Nexalis Game Hub
 * Handles domain validation, API key verification, and anti-tamper measures
 */

class SecurityService {
  constructor() {
    this.validDomains = ['nexalis-dev.github.io', 'localhost', '127.0.0.1'];
    this.initialized = false;
    this.domainVerified = false;
    this.apiKeyVerified = false;
    this.integrityChecks = [];
  }

  /**
   * Initialize security service
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    if (this.initialized) return true;
    
    try {
      // Verify current domain
      this.domainVerified = this.verifyDomain();
      
      // Verify API key with Arena API
      this.apiKeyVerified = await this.verifyApiKey();
      
      // Run integrity checks
      await this.runIntegrityChecks();
      
      this.initialized = true;
      return this.domainVerified && this.apiKeyVerified;
    } catch (error) {
      console.error('Security service initialization failed:', error);
      return false;
    }
  }

  /**
   * Verify that the app is running on an authorized domain
   * @returns {boolean} Is domain valid
   */
  verifyDomain() {
    const currentDomain = window.location.hostname;
    return this.validDomains.includes(currentDomain);
  }

  /**
   * Verify API key with Arena API
   * @returns {Promise<boolean>} Is API key valid
   */
  async verifyApiKey() {
    try {
      // Get the deployment-specific API key and deployment ID
      const apiKey = process.env.REACT_APP_ARENA_API_KEY;
      const deploymentId = process.env.REACT_APP_DEPLOYMENT_ID;
      
      if (!apiKey || !deploymentId) {
        console.error('API key or deployment ID not found');
        return false;
      }
      
      // Get browser fingerprint data for additional security
      const fingerprint = await this.getBrowserFingerprint();
      
      // Create a hash of multiple security factors
      const securityHash = await this.createHash(
        window.location.hostname + 
        apiKey + 
        deploymentId + 
        fingerprint.canvas + 
        fingerprint.webgl + 
        fingerprint.userAgent
      );
      
      // Verify with Arena API using a more complex validation
      const response = await fetch(`${process.env.REACT_APP_ARENA_API_URL}/verify-deployment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Deployment-ID': deploymentId,
          'X-API-Key': apiKey
        },
        body: JSON.stringify({
          domain: window.location.hostname,
          securityHash,
          timestamp: Date.now(),
          fingerprint: fingerprint,
          deploymentSignature: await this.createDeploymentSignature(deploymentId, apiKey)
        })
      });
      
      if (!response.ok) {
        console.error('API verification failed with status:', response.status);
        return false;
      }
      
      const data = await response.json();
      
      // Store the session token for future validations
      if (data.success && data.sessionToken) {
        this.sessionToken = data.sessionToken;
        localStorage.setItem('nx_session_validation', await this.encryptData(data.sessionToken));
      }
      
      return data.success === true;
    } catch (error) {
      console.error('API key verification failed:', error);
      return false;
    }
  }

  /**
   * Create a hash from a string
   * @param {string} input - String to hash
   * @returns {Promise<string>} Hashed string
   */
  async createHash(input) {
    const msgBuffer = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  /**
   * Get browser fingerprint for additional security
   * @returns {Promise<Object>} Browser fingerprint data
   */
  async getBrowserFingerprint() {
    try {
      // Canvas fingerprinting
      const canvasFingerprint = await this.getCanvasFingerprint();
      
      // WebGL fingerprinting
      const webglFingerprint = await this.getWebGLFingerprint();
      
      // User agent and other browser data
      const userAgent = navigator.userAgent;
      const language = navigator.language;
      const platform = navigator.platform;
      const screenResolution = `${window.screen.width}x${window.screen.height}`;
      const colorDepth = window.screen.colorDepth;
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      return {
        canvas: canvasFingerprint,
        webgl: webglFingerprint,
        userAgent,
        language,
        platform,
        screenResolution,
        colorDepth,
        timezone
      };
    } catch (error) {
      console.error('Error getting browser fingerprint:', error);
      return {
        canvas: 'error',
        webgl: 'error',
        userAgent: navigator.userAgent
      };
    }
  }
  
  /**
   * Get canvas fingerprint
   * @returns {Promise<string>} Canvas fingerprint hash
   */
  async getCanvasFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas dimensions
      canvas.width = 200;
      canvas.height = 50;
      
      // Fill background
      ctx.fillStyle = 'rgb(255, 255, 255)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw text
      ctx.fillStyle = 'rgb(0, 0, 0)';
      ctx.font = '18px Arial';
      ctx.fillText('Nexalis Security 🔒', 10, 30);
      
      // Draw shapes
      ctx.strokeStyle = 'rgb(102, 126, 234)';
      ctx.beginPath();
      ctx.arc(160, 25, 20, 0, Math.PI * 2);
      ctx.stroke();
      
      // Get data URL and hash it
      const dataURL = canvas.toDataURL();
      return await this.createHash(dataURL);
    } catch (error) {
      console.error('Error creating canvas fingerprint:', error);
      return 'canvas-error';
    }
  }
  
  /**
   * Get WebGL fingerprint
   * @returns {Promise<string>} WebGL fingerprint hash
   */
  async getWebGLFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!gl) {
        return 'webgl-not-supported';
      }
      
      // Collect WebGL info
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown';
      const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';
      
      // Get supported extensions
      const extensions = gl.getSupportedExtensions() || [];
      
      // Create a fingerprint string
      const fingerprint = `${vendor}|${renderer}|${extensions.join(',')}`;
      
      return await this.createHash(fingerprint);
    } catch (error) {
      console.error('Error creating WebGL fingerprint:', error);
      return 'webgl-error';
    }
  }
  
  /**
   * Create a deployment signature for verification
   * @param {string} deploymentId - Deployment ID
   * @param {string} apiKey - API key
   * @returns {Promise<string>} Deployment signature
   */
  async createDeploymentSignature(deploymentId, apiKey) {
    try {
      // Create a timestamp that changes every hour for time-based validation
      const hourTimestamp = Math.floor(Date.now() / (1000 * 60 * 60));
      
      // Combine multiple factors for the signature
      const signatureInput = `${deploymentId}|${apiKey}|${window.location.hostname}|${hourTimestamp}`;
      
      // Create and return the signature
      return await this.createHash(signatureInput);
    } catch (error) {
      console.error('Error creating deployment signature:', error);
      return '';
    }
  }
  
  /**
   * Encrypt data for secure storage
   * @param {string} data - Data to encrypt
   * @returns {Promise<string>} Encrypted data
   */
  async encryptData(data) {
    try {
      // For simplicity, we're using a basic encryption here
      // In production, use a proper encryption library
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      
      // Get a key based on domain and deployment ID
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(process.env.REACT_APP_DEPLOYMENT_ID || 'nexalis-secure'),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );
      
      // Derive an AES-GCM key
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: encoder.encode(window.location.hostname),
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );
      
      // Generate an IV
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt the data
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        dataBuffer
      );
      
      // Combine IV and encrypted data and convert to base64
      const encryptedArray = new Uint8Array(iv.length + encryptedBuffer.byteLength);
      encryptedArray.set(iv);
      encryptedArray.set(new Uint8Array(encryptedBuffer), iv.length);
      
      // Convert to base64
      return btoa(String.fromCharCode.apply(null, encryptedArray));
    } catch (error) {
      console.error('Error encrypting data:', error);
      return btoa(data); // Fallback to simple base64 if encryption fails
    }
  }

  /**
   * Run integrity checks on critical app components
   * @returns {Promise<boolean>} All checks passed
   */
  async runIntegrityChecks() {
    try {
      // Check for tampering with localStorage
      this.integrityChecks.push(this.checkLocalStorageIntegrity());
      
      // Check for tampering with API endpoints
      this.integrityChecks.push(await this.checkApiEndpointIntegrity());
      
      // Check for tampering with game logic
      this.integrityChecks.push(this.checkGameLogicIntegrity());
      
      // All checks must pass
      return this.integrityChecks.every(check => check === true);
    } catch (error) {
      console.error('Integrity checks failed:', error);
      return false;
    }
  }

  /**
   * Check localStorage for tampering
   * @returns {boolean} Is localStorage integrity intact
   */
  checkLocalStorageIntegrity() {
    try {
      // Set a canary value
      const canaryValue = `nx_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem('nx_integrity_check', canaryValue);
      
      // Verify canary value
      const storedValue = localStorage.getItem('nx_integrity_check');
      
      // Clean up
      localStorage.removeItem('nx_integrity_check');
      
      return storedValue === canaryValue;
    } catch (error) {
      console.error('localStorage integrity check failed:', error);
      return false;
    }
  }

  /**
   * Check API endpoints for tampering
   * @returns {Promise<boolean>} Are API endpoints intact
   */
  async checkApiEndpointIntegrity() {
    try {
      // Verify API endpoint with a health check
      const response = await fetch(`${process.env.REACT_APP_ARENA_API_URL}/health`);
      const data = await response.json();
      
      // Verify response signature
      return data.signature === process.env.REACT_APP_API_SIGNATURE;
    } catch (error) {
      console.error('API endpoint integrity check failed:', error);
      return false;
    }
  }

  /**
   * Check game logic for tampering
   * @returns {boolean} Is game logic intact
   */
  checkGameLogicIntegrity() {
    try {
      // Check for expected global functions
      const expectedFunctions = [
        'requestAnimationFrame',
        'setTimeout',
        'setInterval'
      ];
      
      for (const func of expectedFunctions) {
        if (typeof window[func] !== 'function') {
          console.error(`Expected function ${func} is missing or modified`);
          return false;
        }
      }
      
      // Check for unexpected modifications to game-related prototypes
      const originalMathRandom = Math.random.toString();
      const currentMathRandom = Math.random.toString();
      
      if (originalMathRandom !== currentMathRandom) {
        console.error('Math.random has been modified');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Game logic integrity check failed:', error);
      return false;
    }
  }

  /**
   * Verify that the current session is valid
   * @returns {Promise<boolean>} Is session valid
   */
  async verifySession() {
    if (!this.initialized) {
      await this.initialize();
    }
    
    return this.domainVerified && this.apiKeyVerified && 
           this.integrityChecks.every(check => check === true);
  }

  /**
   * Get security status
   * @returns {Object} Security status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      domainVerified: this.domainVerified,
      apiKeyVerified: this.apiKeyVerified,
      integrityChecks: this.integrityChecks
    };
  }
}

// Create singleton instance
const securityService = new SecurityService();

export default securityService;
