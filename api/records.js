// Serverless function to get attendance records
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid authorization token' });
        }
        
        const token = authHeader.substring(7);
        const { page = '1', limit = '100' } = req.query;
        
        const signature = generateSignature();
        
        const response = await fetch(
            `${API_BASE_URL}/student/dashboard/attendance/records?page=${page}&limit=${limit}`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'X-App-Signature': signature
                }
            }
        );
        
        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ 
                error: `Failed to fetch records: ${errorText}` 
            });
        }
        
        const data = await response.json();
        return res.status(200).json(data);
        
    } catch (error) {
        console.error('Records error:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
};
