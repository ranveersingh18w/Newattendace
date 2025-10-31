// API Configuration// API Configuration// API Configuration - Now using secure backend proxy

const API_BASE_URL = '/api';

const API_BASE_URL = '/api';const API_BASE_URL = '/api'; // Serverless functions will handle API calls

// API Client

class ApiClient {

    constructor() {

        this.token = null;// Helper function to calculate classes needed for 75%// API Client - Refactored to use backend proxy

    }

function calculate75Status(attended, total) {class ApiClient {

    async request(method, path, options = {}) {

        const headers = {    const current = total > 0 ? (attended / total) * 100 : 0;    constructor() {

            'Accept': 'application/json',

            ...options.headers    const target = 75;        this.token = null;

        };

        }

        if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {

            headers['Content-Type'] = 'application/json';    if (current >= target) {

        }

        // Can miss classes    async request(method, path, options = {}) {

        if (this.token) {

            headers['Authorization'] = `Bearer ${this.token}`;        let canMiss = 0;        const headers = {

        }

        while (((attended / (total + canMiss + 1)) * 100) >= target) {            'Accept': 'application/json',

        const url = `${API_BASE_URL}${path}`;

        const config = {            canMiss++;            ...options.headers

            method,

            headers,        }        };

            ...options

        };        return { above75: true, value: canMiss, label: "Can Miss", desc: "absences allowed" };



        if (options.body) {    } else {        if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {

            config.body = JSON.stringify(options.body);

        }        // Need to attend            headers['Content-Type'] = 'application/json';



        try {        const needed = Math.ceil((target * total - attended) / (100 - target));        }

            const response = await fetch(url, config);

                    return { above75: false, value: Math.max(0, needed), label: "Need", desc: "to reach 75%" };

            if (!response.ok) {

                let errorMessage = `Request failed with status ${response.status}`;    }        if (this.token) {

                try {

                    const errorData = await response.json();}            headers['Authorization'] = `Bearer ${this.token}`;

                    errorMessage = errorData.error || errorData.message || errorMessage;

                } catch (jsonError) {        }

                    try {

                        errorMessage = await response.text() || errorMessage;// API Client

                    } catch (textError) {

                        // Use default error messageclass ApiClient {        const url = `${API_BASE_URL}${path}`;

                    }

                }    constructor() {        const config = {

                throw new Error(errorMessage);

            }        this.token = null;            method,



            return response.json();    }            headers,

        } catch (error) {

            // Re-throw with a cleaner message            ...options

            throw new Error(error.message || 'Network request failed');

        }    async request(method, path, options = {}) {        };

    }

        const headers = { 'Accept': 'application/json', ...options.headers };

    async login(rollNumber, email, password) {

        const data = await this.request('POST', '/login', {                if (options.body) {

            body: { rollNumber, email, password }

        });        if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {            config.body = JSON.stringify(options.body);

        

        if (!data.token) {            headers['Content-Type'] = 'application/json';        }

            throw new Error('No token received from API');

        }        }

        

        this.token = data.token;                try {

        return data.student;

    }        if (this.token) {            const response = await fetch(url, config);



    async getStats() {            headers['Authorization'] = `Bearer ${this.token}`;            

        return this.request('GET', '/stats');

    }        }            if (!response.ok) {



    async getRecords(page = 1, limit = 100) {                let errorMessage = `Request failed with status ${response.status}`;

        return this.request('GET', `/records?page=${page}&limit=${limit}`);

    }        const response = await fetch(`${API_BASE_URL}${path}`, {                try {



    async getAllRecords() {            method,                    const errorData = await response.json();

        const records = [];

        let page = 1;            headers,                    errorMessage = errorData.error || errorData.message || errorMessage;

        let hasMore = true;

            ...(options.body && { body: JSON.stringify(options.body) })                } catch (jsonError) {

        while (hasMore && page < 10) {

            const data = await this.getRecords(page, 100);        });                    try {

            records.push(...(data.records || []));

            hasMore = data.pagination?.hasNextPage || false;                        errorMessage = await response.text() || errorMessage;

            page++;

        }        if (!response.ok) {                    } catch (textError) {



        return records;            let errorMessage = `Error ${response.status}`;                        // Use default error message

    }

}            try {                    }



// State Management                const data = await response.json();                }

const state = {

    client: new ApiClient(),                errorMessage = data.error || data.message || errorMessage;                throw new Error(errorMessage);

    student: null,

    stats: null,            } catch {}            }

    records: []

};            throw new Error(errorMessage);



// DOM Elements        }            return response.json();

const elements = {

    loginScreen: document.getElementById('loginScreen'),        } catch (error) {

    dashboardScreen: document.getElementById('dashboardScreen'),

    loginForm: document.getElementById('loginForm'),        return response.json();            // Re-throw with a cleaner message

    loginError: document.getElementById('loginError'),

    loginBtn: document.getElementById('loginBtn'),    }            throw new Error(error.message || 'Network request failed');

    logoutBtn: document.getElementById('logoutBtn'),

    studentName: document.getElementById('studentName'),        }

    studentRoll: document.getElementById('studentRoll'),

    overallPercentage: document.getElementById('overallPercentage'),    async login(rollNumber, email, password) {    }

    classesAttended: document.getElementById('classesAttended'),

    totalClasses: document.getElementById('totalClasses'),        const data = await this.request('POST', '/login', {

    activeCourses: document.getElementById('activeCourses'),

    rtuContent: document.getElementById('rtuContent'),            body: { rollNumber, email, password }    async login(rollNumber, email, password) {

    labContent: document.getElementById('labContent'),

    recordsContent: document.getElementById('recordsContent'),        });        const data = await this.request('POST', '/login', {

    recordsLoading: document.getElementById('recordsLoading')

};        this.token = data.token;            body: { rollNumber, email, password }



// Helper function to get element by ID        return data.student;        });

const $ = (id) => document.getElementById(id);

    }        

// Event: Login Form Submit

elements.loginForm.addEventListener('submit', async (e) => {        if (!data.token) {

    e.preventDefault();

        async getStats() {            throw new Error('No token received from API');

    const rollNumber = document.getElementById('rollNumber').value.trim();

    const email = document.getElementById('email').value.trim();        return this.request('GET', '/stats');        }

    const password = document.getElementById('password').value;

        }        

    elements.loginBtn.disabled = true;

    elements.loginBtn.textContent = 'Logging in...';        this.token = data.token;

    elements.loginError.classList.add('hidden');

        async getRecords(page = 1, limit = 100) {        return data.student;

    try {

        console.log('Attempting login with:', { rollNumber, email });        return this.request('GET', `/records?page=${page}&limit=${limit}`);    }

        const student = await state.client.login(rollNumber, email, password);

        state.student = student;    }

        

        // Store credentials in session    async getAttendanceStats() {

        sessionStorage.setItem('credentials', JSON.stringify({ rollNumber, email, password }));

            async getAllRecords() {        return this.request('GET', '/stats');

        showDashboard();

        await loadDashboardData();        const all = [];    }

    } catch (error) {

        console.error('Login error:', error);        let page = 1;

        const errorMessage = error.message || 'Login failed. Please check your credentials.';

        elements.loginError.textContent = errorMessage;        let hasMore = true;    async getAttendanceRecords(page = 1, limit = 100) {

        elements.loginError.classList.remove('hidden');

    } finally {        return this.request('GET', `/records?page=${page}&limit=${limit}`);

        elements.loginBtn.disabled = false;

        elements.loginBtn.textContent = 'Login';        while (hasMore && page < 10) {    }

    }

});            const data = await this.getRecords(page, 100);



// Event: Logout Button            all.push(...(data.records || []));    async getAllAttendanceRecords() {

elements.logoutBtn.addEventListener('click', () => {

    sessionStorage.removeItem('credentials');            hasMore = data.pagination?.hasNextPage || false;        const records = [];

    state.client.token = null;

    state.student = null;            page++;        let page = 1;

    state.stats = null;

    state.records = [];        }        let hasMore = true;

    

    elements.loginScreen.classList.remove('hidden');

    elements.dashboardScreen.classList.add('hidden');

    elements.loginForm.reset();        return all;        while (hasMore) {

});

    }            const data = await this.getAttendanceRecords(page, 100);

// Event: Tab Switching

document.querySelectorAll('.tab-btn').forEach(btn => {}            records.push(...(data.records || []));

    btn.addEventListener('click', () => {

        const targetTab = btn.dataset.tab;            hasMore = data.pagination?.hasNextPage || false;

        

        // Update button states// State            page++;

        document.querySelectorAll('.tab-btn').forEach(b => {

            b.classList.remove('tab-active');const state = {        }

            b.classList.add('text-gray-600', 'hover:text-gray-900');

        });    client: new ApiClient(),

        btn.classList.add('tab-active');

        btn.classList.remove('text-gray-600', 'hover:text-gray-900');    student: null,        return records;

        

        // Update tab content    stats: null,    }

        document.querySelectorAll('.tab-content').forEach(content => {

            content.classList.add('hidden');    records: [],}

        });

            chart: null

        if (targetTab === 'rtu') {

            document.getElementById('rtuTab').classList.remove('hidden');};// UI State Management

        } else if (targetTab === 'lab') {

            document.getElementById('labTab').classList.remove('hidden');const state = {

        } else if (targetTab === 'records') {

            document.getElementById('recordsTab').classList.remove('hidden');// DOM    client: new ApiClient(),

            if (state.records.length === 0) {

                loadRecords();const $ = (id) => document.getElementById(id);    student: null,

            }

        }    stats: null,

    });

});// Event: Login    records: []



// UI Functions$('loginForm').addEventListener('submit', async (e) => {};

function showDashboard() {

    elements.loginScreen.classList.add('hidden');    e.preventDefault();

    elements.dashboardScreen.classList.remove('hidden');

        // DOM Elements

    if (state.student) {

        elements.studentName.textContent = `Welcome, ${state.student.name || 'Student'}`;    const btn = $('loginBtn');const elements = {

        elements.studentRoll.textContent = state.student.rollNumber || '';

            const error = $('loginError');    loginScreen: document.getElementById('loginScreen'),

        // Update profile avatar if element exists

        const avatar = $('profileAvatar');    const rollNumber = $('rollNumber').value.trim();    dashboardScreen: document.getElementById('dashboardScreen'),

        if (avatar) {

            avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(state.student.name || 'S')}&background=667eea&color=fff&size=128`;    const email = $('email').value.trim();    loginForm: document.getElementById('loginForm'),

        }

    }    const password = $('password').value;    loginError: document.getElementById('loginError'),

}

        loginBtn: document.getElementById('loginBtn'),

async function loadDashboardData() {

    try {    btn.disabled = true;    logoutBtn: document.getElementById('logoutBtn'),

        state.stats = await state.client.getStats();

        renderOverview();    btn.textContent = 'Logging in...';    studentName: document.getElementById('studentName'),

        renderPerformance();

    } catch (error) {    error.classList.add('hidden');    studentRoll: document.getElementById('studentRoll'),

        console.error('Failed to load dashboard data:', error);

        alert('Failed to load attendance data. Please try again.');        overallPercentage: document.getElementById('overallPercentage'),

    }

}    try {    classesAttended: document.getElementById('classesAttended'),



function renderOverview() {        state.student = await state.client.login(rollNumber, email, password);    totalClasses: document.getElementById('totalClasses'),

    const overall = state.stats?.overall || {};

    const courses = state.stats?.byCourse || [];        sessionStorage.setItem('credentials', JSON.stringify({ rollNumber, email, password }));    activeCourses: document.getElementById('activeCourses'),

    

    elements.overallPercentage.textContent = `${(overall.percentage || 0).toFixed(1)}%`;            rtuContent: document.getElementById('rtuContent'),

    elements.classesAttended.textContent = overall.attendedClasses || 0;

    elements.totalClasses.textContent = overall.totalClasses || 0;        showDashboard();    labContent: document.getElementById('labContent'),

    elements.activeCourses.textContent = courses.length || 0;

}        await loadData();    recordsContent: document.getElementById('recordsContent'),



function renderPerformance() {    } catch (err) {    recordsLoading: document.getElementById('recordsLoading')

    const courses = state.stats?.byCourse || [];

    const rtuCourses = courses.filter(c => c.classType === 'RTU_CLASSES');        error.textContent = err.message || 'Login failed';};

    const labCourses = courses.filter(c => c.classType === 'LABS');

            error.classList.remove('hidden');

    elements.rtuContent.innerHTML = renderCourseList(rtuCourses);

    elements.labContent.innerHTML = renderCourseList(labCourses);    } finally {// Event Handlers

}

        btn.disabled = false;elements.loginForm.addEventListener('submit', async (e) => {

function renderCourseList(courses) {

    if (courses.length === 0) {        btn.textContent = 'Login';    e.preventDefault();

        return '<p class="text-gray-600 text-center py-8">No courses available</p>';

    }    }    

    

    // Sort by percentage descending});    const rollNumber = document.getElementById('rollNumber').value.trim();

    courses.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));

        const email = document.getElementById('email').value.trim();

    return courses.map(course => {

        const percentage = course.percentage || 0;// Event: Logout    const password = document.getElementById('password').value;

        const attended = course.attendedClasses || 0;

        const total = course.totalClasses || 0;$('logoutBtn').addEventListener('click', () => {    

        

        const progressColor = percentage >= 75 ? 'bg-green-600' : percentage >= 65 ? 'bg-yellow-500' : 'bg-red-600';    sessionStorage.clear();    elements.loginBtn.disabled = true;

        

        return `    localStorage.clear();    elements.loginBtn.textContent = 'Logging in...';

            <div class="border-b border-gray-100 last:border-0 pb-4 last:pb-0">

                <div class="flex justify-between items-center mb-2">    location.reload();    elements.loginError.classList.add('hidden');

                    <h4 class="font-medium text-gray-900">${course.courseName || 'Unknown Course'}</h4>

                    <span class="text-sm font-medium ${percentage >= 75 ? 'text-green-600' : 'text-red-600'}">${percentage.toFixed(1)}%</span>});    

                </div>

                <div class="w-full bg-gray-200 rounded-full h-2 mb-2">    try {

                    <div 

                        class="${progressColor} h-2 rounded-full progress-bar"// Event: Tabs        console.log('Attempting login with:', { rollNumber, email });

                        style="width: ${Math.min(100, percentage)}%"

                    ></div>document.querySelectorAll('.tab-btn').forEach(btn => {        const student = await state.client.login(rollNumber, email, password);

                </div>

                <p class="text-xs text-gray-600">${attended}/${total} classes</p>    btn.addEventListener('click', () => {        state.student = student;

            </div>

        `;        const tab = btn.dataset.tab;        

    }).join('');

}                // Store credentials in session



async function loadRecords() {        document.querySelectorAll('.tab-btn').forEach(b => {        sessionStorage.setItem('credentials', JSON.stringify({ rollNumber, email, password }));

    elements.recordsLoading.classList.remove('hidden');

    elements.recordsContent.innerHTML = '';            b.classList.remove('tab-active');        

    

    try {            b.classList.add('text-gray-600');        showDashboard();

        state.records = await state.client.getAllRecords();

                });        await loadDashboardData();

        // Sort by date descending (newest first)

        state.records.sort((a, b) => new Date(b.markedAt || b.date) - new Date(a.markedAt || a.date));        btn.classList.add('tab-active');    } catch (error) {

        

        renderRecords();        btn.classList.remove('text-gray-600');        console.error('Login error:', error);

    } catch (error) {

        console.error('Failed to load records:', error);                const errorMessage = error.message || 'Login failed. Please check your credentials.';

        elements.recordsContent.innerHTML = `

            <tr><td colspan="5" class="text-center py-8 text-red-600">Failed to load records</td></tr>        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));        elements.loginError.textContent = errorMessage;

        `;

    } finally {        $(`${tab}Tab`).classList.remove('hidden');        elements.loginError.classList.remove('hidden');

        elements.recordsLoading.classList.add('hidden');

    }            } finally {

}

        if (tab === 'records' && state.records.length === 0) {        elements.loginBtn.disabled = false;

function renderRecords() {

    if (state.records.length === 0) {            loadRecords();        elements.loginBtn.textContent = 'Login';

        elements.recordsContent.innerHTML = `

            <tr><td colspan="5" class="text-center py-8 text-gray-600 text-sm">No records found</td></tr>        }    }

        `;

        return;    });});

    }

    });

    elements.recordsContent.innerHTML = state.records.map(record => {

        const date = new Date(record.date || record.markedAt);elements.logoutBtn.addEventListener('click', () => {

        const markedAt = new Date(record.markedAt);

        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });// Show Dashboard    sessionStorage.removeItem('credentials');

        const timeStr = markedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        function showDashboard() {    state.client.token = null;

        const status = record.status || 'UNKNOWN';

        const statusClass = status === 'PRESENT' ? 'status-present' : 'status-absent';    $('loginScreen').classList.add('hidden');    state.student = null;

        const statusIcon = status === 'PRESENT' ? '✅' : '❌';

            $('dashboardScreen').classList.remove('hidden');    state.stats = null;

        const courseName = record.course?.name || record.courseName || 'Unknown';

        const teacher = record.teacher?.name || '-';        state.records = [];

        

        return `    if (state.student) {    

            <tr class="hover:bg-gray-50">

                <td class="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 whitespace-nowrap">${dateStr}</td>        $('studentName').textContent = `Welcome, ${state.student.name || 'Student'}`;    elements.loginScreen.classList.remove('hidden');

                <td class="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 whitespace-nowrap">${timeStr}</td>

                <td class="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">        $('studentRoll').textContent = state.student.rollNumber || '';    elements.dashboardScreen.classList.add('hidden');

                    <div class="max-w-xs truncate" title="${courseName}">${courseName}</div>

                </td>        $('profileAvatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(state.student.name || 'S')}&background=667eea&color=fff&size=128`;    elements.loginForm.reset();

                <td class="px-2 sm:px-4 py-2 sm:py-3">

                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusClass} whitespace-nowrap">    }});

                        ${statusIcon} ${status.charAt(0) + status.slice(1).toLowerCase()}

                    </span>}

                </td>

                <td class="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 hidden sm:table-cell">${teacher}</td>// Tab switching

            </tr>

        `;// Load All Datadocument.querySelectorAll('.tab-btn').forEach(btn => {

    }).join('');

}async function loadData() {    btn.addEventListener('click', () => {



// Auto-login if credentials are stored    try {        const targetTab = btn.dataset.tab;

window.addEventListener('DOMContentLoaded', async () => {

    const stored = sessionStorage.getItem('credentials');        // Load stats and records in parallel        

    if (stored) {

        try {        [state.stats, state.records] = await Promise.all([        // Update button states

            const { rollNumber, email, password } = JSON.parse(stored);

            const student = await state.client.login(rollNumber, email, password);            state.client.getStats(),        document.querySelectorAll('.tab-btn').forEach(b => {

            state.student = student;

            showDashboard();            state.client.getAllRecords()            b.classList.remove('tab-active');

            await loadDashboardData();

        } catch (error) {        ]);            b.classList.add('text-gray-600', 'hover:text-gray-900');

            console.error('Auto-login failed:', error);

            sessionStorage.removeItem('credentials');                });

        }

    }        // Cache in localStorage        btn.classList.add('tab-active');

});

        localStorage.setItem('stats', JSON.stringify(state.stats));        btn.classList.remove('text-gray-600', 'hover:text-gray-900');

        localStorage.setItem('records', JSON.stringify(state.records));        

                // Update tab content

        renderAll();        document.querySelectorAll('.tab-content').forEach(content => {

    } catch (error) {            content.classList.add('hidden');

        console.error('Load error:', error);        });

        alert('Failed to load attendance data: ' + error.message);        

    }        if (targetTab === 'rtu') {

}            document.getElementById('rtuTab').classList.remove('hidden');

        } else if (targetTab === 'lab') {

// Render Everything            document.getElementById('labTab').classList.remove('hidden');

function renderAll() {        } else if (targetTab === 'records') {

    renderOverview();            document.getElementById('recordsTab').classList.remove('hidden');

    renderCourses();            if (state.records.length === 0) {

    renderChart();                loadRecords();

    renderCalendar();            }

}        }

    });

// Render Overview Cards});

function renderOverview() {

    const overall = state.stats?.overall || {};// UI Functions

    const percentage = overall.percentage || 0;function showDashboard() {

    const attended = overall.attendedClasses || 0;    elements.loginScreen.classList.add('hidden');

    const total = overall.totalClasses || 0;    elements.dashboardScreen.classList.remove('hidden');

        

    $('overallPercentage').textContent = `${percentage.toFixed(1)}%`;    if (state.student) {

    $('classesAttended').textContent = attended;        elements.studentName.textContent = `Welcome, ${state.student.name || 'Student'}`;

    $('totalClasses').textContent = total;        elements.studentRoll.textContent = state.student.rollNumber || '';

        }

    const status = calculate75Status(attended, total);}

    $('attendanceStatus').textContent = status.value;

    $('statusLabel').textContent = status.label;async function loadDashboardData() {

    $('statusDescription').textContent = status.desc;    try {

}        state.stats = await state.client.getAttendanceStats();

        renderOverview();

// Render Courses        renderPerformance();

function renderCourses() {    } catch (error) {

    const courses = state.stats?.byCourse || [];        console.error('Failed to load dashboard data:', error);

    const rtu = courses.filter(c => c.classType === 'RTU_CLASSES');        alert('Failed to load attendance data. Please try again.');

    const lab = courses.filter(c => c.classType === 'LABS');    }

    }

    $('rtuContent').innerHTML = renderCourseList(rtu);

    $('labContent').innerHTML = renderCourseList(lab);function renderOverview() {

}    const overall = state.stats?.overall || {};

    const courses = state.stats?.byCourse || [];

function renderCourseList(courses) {    

    if (courses.length === 0) {    elements.overallPercentage.textContent = `${(overall.percentage || 0).toFixed(1)}%`;

        return '<p class="text-gray-600 text-center py-8">No courses</p>';    elements.classesAttended.textContent = overall.attendedClasses || 0;

    }    elements.totalClasses.textContent = overall.totalClasses || 0;

        elements.activeCourses.textContent = courses.length || 0;

    return courses.map(c => {}

        const pct = c.percentage || 0;

        const att = c.attendedClasses || 0;function renderPerformance() {

        const tot = c.totalClasses || 0;    const courses = state.stats?.byCourse || [];

        const status = calculate75Status(att, tot);    const rtuCourses = courses.filter(c => c.classType === 'RTU_CLASSES');

            const labCourses = courses.filter(c => c.classType === 'LABS');

        const color = pct >= 75 ? 'bg-green-500' : pct >= 65 ? 'bg-yellow-500' : 'bg-red-500';    

            elements.rtuContent.innerHTML = renderCourseList(rtuCourses);

        return `    elements.labContent.innerHTML = renderCourseList(labCourses);

            <div class="border-b border-gray-100 last:border-0 pb-4 last:pb-0">}

                <div class="flex justify-between items-center mb-2">

                    <h4 class="font-medium text-gray-900">${c.courseName || 'Unknown'}</h4>function renderCourseList(courses) {

                    <span class="text-sm font-bold ${pct >= 75 ? 'text-green-600' : 'text-red-600'}">${pct.toFixed(1)}%</span>    if (courses.length === 0) {

                </div>        return '<p class="text-gray-600 text-center py-8">No courses available</p>';

                <div class="w-full bg-gray-200 rounded-full h-3 mb-2">    }

                    <div class="${color} h-3 rounded-full transition-all" style="width: ${Math.min(100, pct)}%"></div>    

                </div>    // Sort by percentage descending

                <div class="flex justify-between items-center text-xs text-gray-600">    courses.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));

                    <span>${att}/${tot} classes</span>    

                    <span class="${status.above75 ? 'text-green-600' : 'text-orange-600'} font-medium">    return courses.map(course => {

                        ${status.value} ${status.desc}        const percentage = course.percentage || 0;

                    </span>        const attended = course.attendedClasses || 0;

                </div>        const total = course.totalClasses || 0;

            </div>        

        `;        return `

    }).join('');            <div class="border-b border-gray-100 last:border-0 pb-4 last:pb-0">

}                <div class="flex justify-between items-center mb-2">

                    <h4 class="font-medium text-gray-900">${course.courseName || 'Unknown Course'}</h4>

// Render Chart                    <span class="text-sm font-medium text-gray-700">${percentage.toFixed(1)}%</span>

function renderChart() {                </div>

    const courses = (state.stats?.byCourse || [])                <div class="w-full bg-gray-200 rounded-full h-2 mb-2">

        .sort((a, b) => (b.totalClasses || 0) - (a.totalClasses || 0))                    <div 

        .slice(0, 8);                        class="bg-blue-600 h-2 rounded-full progress-bar"

                            style="width: ${Math.min(100, percentage)}%"

    const ctx = $('attendanceChart');                    ></div>

    if (!ctx) return;                </div>

                    <p class="text-xs text-gray-600">${attended}/${total} classes</p>

    if (state.chart) state.chart.destroy();            </div>

            `;

    state.chart = new Chart(ctx, {    }).join('');

        type: 'bar',}

        data: {

            labels: courses.map(c => {async function loadRecords() {

                const name = c.courseName || c.courseCode || '?';    elements.recordsLoading.classList.remove('hidden');

                return name.length > 15 ? name.substring(0, 15) + '...' : name;    elements.recordsContent.innerHTML = '';

            }),    

            datasets: [{    try {

                label: 'Attended',        state.records = await state.client.getAllAttendanceRecords();

                data: courses.map(c => c.attendedClasses || 0),        

                backgroundColor: 'rgba(16, 185, 129, 0.8)'        // Sort by date descending (newest first)

            }, {        state.records.sort((a, b) => new Date(b.markedAt || b.date) - new Date(a.markedAt || a.date));

                label: 'Missed',        

                data: courses.map(c => (c.totalClasses || 0) - (c.attendedClasses || 0)),        renderRecords();

                backgroundColor: 'rgba(239, 68, 68, 0.8)'    } catch (error) {

            }]        console.error('Failed to load records:', error);

        },        elements.recordsContent.innerHTML = `

        options: {            <tr><td colspan="5" class="text-center py-8 text-red-600">Failed to load records</td></tr>

            responsive: true,        `;

            maintainAspectRatio: false,    } finally {

            plugins: { legend: { position: 'top' } },        elements.recordsLoading.classList.add('hidden');

            scales: {    }

                x: { stacked: true },}

                y: { stacked: true, beginAtZero: true }

            }function renderRecords() {

        }    if (state.records.length === 0) {

    });        elements.recordsContent.innerHTML = `

}            <tr><td colspan="5" class="text-center py-8 text-gray-600 text-sm">No records found</td></tr>

        `;

// Render Calendar        return;

function renderCalendar() {    }

    const now = new Date();    

    const year = now.getFullYear();    elements.recordsContent.innerHTML = state.records.map(record => {

    const month = now.getMonth();        const date = new Date(record.date || record.markedAt);

            const markedAt = new Date(record.markedAt);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                       'July', 'August', 'September', 'October', 'November', 'December'];        const timeStr = markedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    $('calendarTitle').textContent = `${monthNames[month]} ${year}`;        

            const status = record.status || 'UNKNOWN';

    const firstDay = new Date(year, month, 1).getDay();        const statusClass = status === 'PRESENT' ? 'status-present' : 'status-absent';

    const daysInMonth = new Date(year, month + 1, 0).getDate();        const statusIcon = status === 'PRESENT' ? '✅' : '❌';

            

    // Build attendance map        const courseName = record.course?.name || record.courseName || 'Unknown';

    const map = {};        const teacher = record.teacher?.name || '-';

    state.records.forEach(r => {        

        const d = new Date(r.date || r.markedAt);        return `

        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;            <tr class="hover:bg-gray-50">

        if (!map[key]) map[key] = { p: 0, a: 0 };                <td class="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 whitespace-nowrap">${dateStr}</td>

        if (r.status === 'PRESENT') map[key].p++;                <td class="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 whitespace-nowrap">${timeStr}</td>

        else map[key].a++;                <td class="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">

    });                    <div class="max-w-xs truncate" title="${courseName}">${courseName}</div>

                    </td>

    let html = '';                <td class="px-2 sm:px-4 py-2 sm:py-3">

                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusClass} whitespace-nowrap">

    // Empty cells                        ${statusIcon} ${status.charAt(0) + status.slice(1).toLowerCase()}

    for (let i = 0; i < firstDay; i++) {                    </span>

        html += '<div class="calendar-day bg-gray-50"></div>';                </td>

    }                <td class="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 hidden sm:table-cell">${teacher}</td>

                </tr>

    // Days        `;

    for (let day = 1; day <= daysInMonth; day++) {    }).join('');

        const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;}

        const att = map[key];

        const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();// Auto-login if credentials are stored

        window.addEventListener('DOMContentLoaded', async () => {

        let cls = 'calendar-day bg-white rounded p-2 text-center cursor-pointer';    const stored = sessionStorage.getItem('credentials');

        if (isToday) cls += ' today';    if (stored) {

        if (att && att.p > att.a) cls += ' present';        try {

        else if (att && att.a > 0) cls += ' absent';            const { rollNumber, email, password } = JSON.parse(stored);

                    const student = await state.client.login(rollNumber, email, password);

        html += `<div class="${cls}">${day}</div>`;            state.student = student;

    }            showDashboard();

                await loadDashboardData();

    $('calendarDays').innerHTML = html;        } catch (error) {

}            console.error('Auto-login failed:', error);

            sessionStorage.removeItem('credentials');

// Load Records for table        }

async function loadRecords() {    }

    if (state.records.length === 0) {});

        try {
            state.records = await state.client.getAllRecords();
            localStorage.setItem('records', JSON.stringify(state.records));
        } catch (error) {
            $('recordsContent').innerHTML = `<tr><td colspan="5" class="text-center py-8 text-red-600">Error: ${error.message}</td></tr>`;
            $('recordsLoading').classList.add('hidden');
            return;
        }
    }
    
    $('recordsLoading').classList.add('hidden');
    
    if (state.records.length === 0) {
        $('recordsContent').innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-600">No records</td></tr>';
        return;
    }
    
    const sorted = [...state.records].sort((a, b) => 
        new Date(b.markedAt || b.date) - new Date(a.markedAt || a.date)
    );
    
    $('recordsContent').innerHTML = sorted.map(r => {
        const date = new Date(r.date || r.markedAt);
        const time = new Date(r.markedAt);
        const status = r.status || 'UNKNOWN';
        const statusCls = status === 'PRESENT' ? 'status-present' : 'status-absent';
        const icon = status === 'PRESENT' ? '✅' : '❌';
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm whitespace-nowrap">${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                <td class="px-4 py-3 text-sm whitespace-nowrap">${time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                <td class="px-4 py-3 text-sm">${r.course?.name || r.courseName || '?'}</td>
                <td class="px-4 py-3">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusCls}">
                        ${icon} ${status.charAt(0) + status.slice(1).toLowerCase()}
                    </span>
                </td>
                <td class="px-4 py-3 text-sm hidden sm:table-cell">${r.teacher?.name || '-'}</td>
            </tr>
        `;
    }).join('');
}

// Auto-login
window.addEventListener('DOMContentLoaded', async () => {
    // Try to load from cache first
    const cachedStats = localStorage.getItem('stats');
    const cachedRecords = localStorage.getItem('records');
    
    if (cachedStats) state.stats = JSON.parse(cachedStats);
    if (cachedRecords) state.records = JSON.parse(cachedRecords);
    
    const stored = sessionStorage.getItem('credentials');
    if (stored) {
        try {
            const { rollNumber, email, password } = JSON.parse(stored);
            state.student = await state.client.login(rollNumber, email, password);
            showDashboard();
            
            // Render cached data immediately
            if (state.stats) renderAll();
            
            // Fetch fresh data in background
            loadData();
        } catch (error) {
            console.error('Auto-login failed:', error);
            sessionStorage.removeItem('credentials');
        }
    }
});
