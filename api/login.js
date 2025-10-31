// Serverless function to handle login and hide API credentials
const crypto = require('crypto');

const API_BASE_URL = 'http://103.159.68.35:3536/api';
const SIGNATURE_KEY = '6ECD762D4776742AFFB192CE8A148';

function generateSignature() {
    const timestamp = Date.now().toString();
    const hmac = crypto.createHmac('sha256', SIGNATURE_KEY);
    hmac.update(timestamp);
    const hashHex = hmac.digest('hex');
    return `${timestamp}.${hashHex}`;
}

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { rollNumber, email, password } = req.body;
        
        if (!rollNumber || !email || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const signature = generateSignature();
        
        const response = await fetch(`${API_BASE_URL}/student/auth/login`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-App-Signature': signature
            },
            body: JSON.stringify({ rollNumber, email, password })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ 
                error: `Authentication failed: ${errorText}` 
            });
        }
        
        const data = await response.json();
        return res.status(200).json(data);
        
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
};
