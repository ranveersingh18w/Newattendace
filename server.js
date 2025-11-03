const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Serve static files
app.use(express.static('.'));

const API_BASE_URL = 'http://103.159.68.35:3536/api';
const SIGNATURE_KEY = '6ECD762D4776742AFFB192CE8A148';

// Function to generate signature (NOT NEEDED for login, but kept for backward compatibility)
function generateSignature() {
    const timestamp = Date.now().toString();
    const hmac = crypto.createHmac('sha256', SIGNATURE_KEY);
    hmac.update(timestamp);
    const hash = hmac.digest('hex');
    return `${timestamp}.${hash}`;
}

// ✅ FIXED Login endpoint - NO SIGNATURE NEEDED!
app.post('/api/login', async (req, res) => {
    try {
        const { rollNumber, email, password } = req.body;

        // Login API does NOT use signature - just send rollNumber, email, password
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };

        console.log('🔐 Attempting login with:', { rollNumber, email });

        const response = await axios.post(`${API_BASE_URL}/student/auth/login`, {
            rollNumber,
            email,
            password
        }, { headers });

        console.log('✅ Login successful!');
        res.json(response.data);
    } catch (error) {
        console.error('❌ Login error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: error.response?.data?.message || error.message
        });
    }
});

// Get student profile
app.get('/api/profile', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ error: 'Token required' });
        }

        const headers = {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        const response = await axios.get(`${API_BASE_URL}/student/dashboard/profile`, { headers });
        res.json(response.data);
    } catch (error) {
        console.error('Profile error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: error.response?.data?.message || error.message
        });
    }
});

// Get student profile (alternative path without query params - uses header auth)
app.get('/api/student/dashboard/profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(400).json({ error: 'Token required in Authorization header' });
        }

        const headers = {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        console.log('📋 Fetching profile from API...');
        const response = await axios.get(`${API_BASE_URL}/student/dashboard/profile`, { headers });
        console.log('✅ Profile data retrieved');
        res.json(response.data);
    } catch (error) {
        console.error('❌ Profile fetch error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: error.response?.data?.message || error.message
        });
    }
});

// Get attendance stats (combined: overall + by course)
app.get('/api/attendance/stats', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ error: 'Token required' });
        }

        const headers = {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        // Fetch overall stats
        console.log('📊 Fetching overall stats...');
        const statsResponse = await axios.get(`${API_BASE_URL}/student/dashboard/stats`, { headers });
        
        // Fetch by-course breakdown
        console.log('📚 Fetching by-course breakdown...');
        const byCoursesResponse = await axios.get(
            `${API_BASE_URL}/student/dashboard/attendance/stats?sectionView=all-active`,
            { headers }
        );

        // Combine responses
        const combinedData = {
            ...statsResponse.data,
            byCourse: byCoursesResponse.data.byCourse || byCoursesResponse.data
        };

        console.log('✅ Combined attendance data prepared');
        res.json(combinedData);
    } catch (error) {
        console.error('Stats error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: error.response?.data?.message || error.message
        });
    }
});

// Get attendance by course
app.get('/api/attendance/bycourse', async (req, res) => {
    try {
        const { token, sectionView = 'all-active' } = req.query;

        if (!token) {
            return res.status(400).json({ error: 'Token required' });
        }

        const headers = {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        const response = await axios.get(
            `${API_BASE_URL}/student/dashboard/attendance/stats?sectionView=${sectionView}`,
            { headers }
        );
        res.json(response.data);
    } catch (error) {
        console.error('By-course error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: error.response?.data?.message || error.message
        });
    }
});

// Get attendance records
app.get('/api/attendance/records', async (req, res) => {
    try {
        const { token, page = 1, limit = 100 } = req.query;

        if (!token) {
            return res.status(400).json({ error: 'Token required' });
        }

        const headers = {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        const response = await axios.get(
            `${API_BASE_URL}/student/dashboard/attendance/records?page=${page}&limit=${limit}`,
            { headers }
        );
        res.json(response.data);
    } catch (error) {
        console.error('Records error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: error.response?.data?.message || error.message
        });
    }
});

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Export for Vercel serverless
module.exports = app;

// Only listen if not in Vercel environment
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🚀 Backend server running on http://localhost:${PORT}`);
        console.log(`📡 API Base: ${API_BASE_URL}`);
        console.log(`🌐 Frontend: http://localhost:${PORT}`);
    });
}
