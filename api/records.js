import crypto from 'crypto';

const SIGNATURE_KEY = '6ECD762D4776742AFFB192CE8A148';
const API_BASE_URL = 'http://103.159.68.35:3536/api';

function generateSignature() {
    const timestamp = Date.now();
    const message = `${timestamp}`;
    const signature = crypto
        .createHmac('sha256', SIGNATURE_KEY)
        .update(message)
        .digest('hex');
    return `${timestamp}.${signature}`;
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { token, page = 1, limit = 100 } = req.query;

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const signature = generateSignature();

        const response = await fetch(
            `${API_BASE_URL}/student/dashboard/attendance/records?token=${token}&page=${page}&limit=${limit}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-App-Signature': signature
                }
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return res.status(response.status).json(errorData || { error: 'Failed to fetch records' });
        }

        const data = await response.json();
        
        // Cache for 5 minutes on Vercel
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.status(200).json(data);
    } catch (error) {
        console.error('Records error:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
}
