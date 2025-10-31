// API Configuration
const API_BASE_URL = 'http://103.159.68.35:3536/api';
const SIGNATURE_KEY = '6ECD762D4776742AFFB192CE8A148';

// Crypto utilities for HMAC signature
async function generateSignature() {
    const timestamp = Date.now().toString();
    const encoder = new TextEncoder();
    const keyData = encoder.encode(SIGNATURE_KEY);
    const messageData = encoder.encode(timestamp);
    
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return `${timestamp}.${hashHex}`;
}

// API Client
class ApiClient {
    constructor() {
        this.token = null;
    }

    async request(method, path, options = {}) {
        const signature = await generateSignature();
        const headers = {
            'Accept': 'application/json',
            'X-App-Signature': signature,
            ...options.headers
        };

        if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
            headers['Content-Type'] = 'application/json';
        }

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const url = `${API_BASE_URL}${path}`;
        const config = {
            method,
            headers,
            ...options
        };

        if (options.body) {
            config.body = JSON.stringify(options.body);
        }

        const response = await fetch(url, config);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error (${response.status}): ${errorText}`);
        }

        return response.json();
    }

    async login(rollNumber, email, password) {
        const data = await this.request('POST', '/student/auth/login', {
            body: { rollNumber, email, password }
        });
        
        if (!data.token) {
            throw new Error('No token received from API');
        }
        
        this.token = data.token;
        return data.student;
    }

    async getAttendanceStats() {
        return this.request('GET', '/student/dashboard/attendance/stats');
    }

    async getAttendanceRecords(page = 1, limit = 100) {
        return this.request('GET', `/student/dashboard/attendance/records?page=${page}&limit=${limit}`);
    }

    async getAllAttendanceRecords() {
        const records = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const data = await this.getAttendanceRecords(page, 100);
            records.push(...(data.records || []));
            hasMore = data.pagination?.hasNextPage || false;
            page++;
        }

        return records;
    }
}

// UI State Management
const state = {
    client: new ApiClient(),
    student: null,
    stats: null,
    records: []
};

// DOM Elements
const elements = {
    loginScreen: document.getElementById('loginScreen'),
    dashboardScreen: document.getElementById('dashboardScreen'),
    loginForm: document.getElementById('loginForm'),
    loginError: document.getElementById('loginError'),
    loginBtn: document.getElementById('loginBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    studentName: document.getElementById('studentName'),
    studentRoll: document.getElementById('studentRoll'),
    overallPercentage: document.getElementById('overallPercentage'),
    classesAttended: document.getElementById('classesAttended'),
    totalClasses: document.getElementById('totalClasses'),
    activeCourses: document.getElementById('activeCourses'),
    rtuContent: document.getElementById('rtuContent'),
    labContent: document.getElementById('labContent'),
    recordsContent: document.getElementById('recordsContent'),
    recordsLoading: document.getElementById('recordsLoading')
};

// Event Handlers
elements.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const rollNumber = document.getElementById('rollNumber').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    elements.loginBtn.disabled = true;
    elements.loginBtn.textContent = 'Logging in...';
    elements.loginError.classList.add('hidden');
    
    try {
        const student = await state.client.login(rollNumber, email, password);
        state.student = student;
        
        // Store credentials in session
        sessionStorage.setItem('credentials', JSON.stringify({ rollNumber, email, password }));
        
        showDashboard();
        await loadDashboardData();
    } catch (error) {
        elements.loginError.textContent = error.message || 'Login failed. Please check your credentials.';
        elements.loginError.classList.remove('hidden');
    } finally {
        elements.loginBtn.disabled = false;
        elements.loginBtn.textContent = 'Login';
    }
});

elements.logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('credentials');
    state.client.token = null;
    state.student = null;
    state.stats = null;
    state.records = [];
    
    elements.loginScreen.classList.remove('hidden');
    elements.dashboardScreen.classList.add('hidden');
    elements.loginForm.reset();
});

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        
        // Update button states
        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.remove('tab-active');
            b.classList.add('text-gray-600', 'hover:text-gray-900');
        });
        btn.classList.add('tab-active');
        btn.classList.remove('text-gray-600', 'hover:text-gray-900');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        
        if (targetTab === 'rtu') {
            document.getElementById('rtuTab').classList.remove('hidden');
        } else if (targetTab === 'lab') {
            document.getElementById('labTab').classList.remove('hidden');
        } else if (targetTab === 'records') {
            document.getElementById('recordsTab').classList.remove('hidden');
            if (state.records.length === 0) {
                loadRecords();
            }
        }
    });
});

// UI Functions
function showDashboard() {
    elements.loginScreen.classList.add('hidden');
    elements.dashboardScreen.classList.remove('hidden');
    
    if (state.student) {
        elements.studentName.textContent = `Welcome, ${state.student.name || 'Student'}`;
        elements.studentRoll.textContent = state.student.rollNumber || '';
    }
}

async function loadDashboardData() {
    try {
        state.stats = await state.client.getAttendanceStats();
        renderOverview();
        renderPerformance();
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
        alert('Failed to load attendance data. Please try again.');
    }
}

function renderOverview() {
    const overall = state.stats?.overall || {};
    const courses = state.stats?.byCourse || [];
    
    elements.overallPercentage.textContent = `${(overall.percentage || 0).toFixed(1)}%`;
    elements.classesAttended.textContent = overall.attendedClasses || 0;
    elements.totalClasses.textContent = overall.totalClasses || 0;
    elements.activeCourses.textContent = courses.length || 0;
}

function renderPerformance() {
    const courses = state.stats?.byCourse || [];
    const rtuCourses = courses.filter(c => c.classType === 'RTU_CLASSES');
    const labCourses = courses.filter(c => c.classType === 'LABS');
    
    elements.rtuContent.innerHTML = renderCourseList(rtuCourses);
    elements.labContent.innerHTML = renderCourseList(labCourses);
}

function renderCourseList(courses) {
    if (courses.length === 0) {
        return '<p class="text-gray-600 text-center py-8">No courses available</p>';
    }
    
    // Sort by percentage descending
    courses.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
    
    return courses.map(course => {
        const percentage = course.percentage || 0;
        const attended = course.attendedClasses || 0;
        const total = course.totalClasses || 0;
        
        return `
            <div class="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                <div class="flex justify-between items-center mb-2">
                    <h4 class="font-medium text-gray-900">${course.courseName || 'Unknown Course'}</h4>
                    <span class="text-sm font-medium text-gray-700">${percentage.toFixed(1)}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                        class="bg-blue-600 h-2 rounded-full progress-bar"
                        style="width: ${Math.min(100, percentage)}%"
                    ></div>
                </div>
                <p class="text-xs text-gray-600">${attended}/${total} classes</p>
            </div>
        `;
    }).join('');
}

async function loadRecords() {
    elements.recordsLoading.classList.remove('hidden');
    elements.recordsContent.innerHTML = '';
    
    try {
        state.records = await state.client.getAllAttendanceRecords();
        
        // Sort by date descending (newest first)
        state.records.sort((a, b) => new Date(b.markedAt || b.date) - new Date(a.markedAt || a.date));
        
        renderRecords();
    } catch (error) {
        console.error('Failed to load records:', error);
        elements.recordsContent.innerHTML = `
            <tr><td colspan="5" class="text-center py-8 text-red-600">Failed to load records</td></tr>
        `;
    } finally {
        elements.recordsLoading.classList.add('hidden');
    }
}

function renderRecords() {
    if (state.records.length === 0) {
        elements.recordsContent.innerHTML = `
            <tr><td colspan="5" class="text-center py-8 text-gray-600">No records found</td></tr>
        `;
        return;
    }
    
    elements.recordsContent.innerHTML = state.records.map(record => {
        const date = new Date(record.date || record.markedAt);
        const markedAt = new Date(record.markedAt);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const timeStr = markedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        
        const status = record.status || 'UNKNOWN';
        const statusClass = status === 'PRESENT' ? 'status-present' : 'status-absent';
        const statusIcon = status === 'PRESENT' ? '✅' : '❌';
        
        const courseName = record.course?.name || record.courseName || 'Unknown';
        const teacher = record.teacher?.name || '-';
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm text-gray-900">${dateStr}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${timeStr}</td>
                <td class="px-4 py-3 text-sm text-gray-900">${courseName}</td>
                <td class="px-4 py-3">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">
                        ${statusIcon} ${status.charAt(0) + status.slice(1).toLowerCase()}
                    </span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">${teacher}</td>
            </tr>
        `;
    }).join('');
}

// Auto-login if credentials are stored
window.addEventListener('DOMContentLoaded', async () => {
    const stored = sessionStorage.getItem('credentials');
    if (stored) {
        try {
            const { rollNumber, email, password } = JSON.parse(stored);
            const student = await state.client.login(rollNumber, email, password);
            state.student = student;
            showDashboard();
            await loadDashboardData();
        } catch (error) {
            console.error('Auto-login failed:', error);
            sessionStorage.removeItem('credentials');
        }
    }
});
