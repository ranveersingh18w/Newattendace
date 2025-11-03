const BACKEND_URL = 'http://localhost:3000';

let apiClient = null;

let attendanceData = null;

let allRecords = [];

let sortedCourses = [];

let currentMonth = new Date();

let charts = { monthly: null, weekly: null, daily: null, subject: null, donut: null, comparison: null };

let selectedSubject = null;

let currentToken = null;

class ApiClient {

    constructor(token = null) {

        this.token = token;

    }

    async request(method, path, options = {}) {

        const headers = {

            'Content-Type': 'application/json',

            ...(options.headers || {})

        };

        const config = {

            method,

            headers,

            ...options

        };

        if (options.body) {

            config.body = JSON.stringify(options.body);

        }

        const response = await fetch(`${BACKEND_URL}${path}`, config);

        if (!response.ok) {

            const errorText = await response.text();

            throw new Error(errorText || `Request failed with status ${response.status}`);

        }

        return response.json();

    }

    async login(rollNumber, email, password) {

        const data = await this.request('POST', '/api/login', {

            body: { rollNumber, email, password }

        });

        if (!data.token) {

            throw new Error('No token received from API');

        }

        this.token = data.token;

        currentToken = data.token;

        return data.student;

    }

    async getAttendanceStats() {

        return this.request('GET', `/api/attendance/stats?token=${this.token}`);

    }

    async getAttendanceRecords(page = 1, limit = 100) {

        return this.request('GET', `/api/attendance/records?token=${this.token}&page=${page}&limit=${limit}`);

    }

    async getAllAttendanceRecords() {

        const records = [];

        let page = 1;

        let hasMore = true;

        while (hasMore && page <= 10) {  // Safety limit: max 10 pages

            try {
                const data = await this.getAttendanceRecords(page, 100);

                // Handle different response formats
                const pageRecords = data.records || data.data || [];
                if (Array.isArray(pageRecords)) {
                    records.push(...pageRecords);
                }

                hasMore = Boolean(data.pagination?.hasNextPage);
                page += 1;
            } catch (error) {
                console.error(`Error fetching page ${page}:`, error);
                break;  // Stop pagination on error
            }

        }

        return records;

    }

}

function saveCredentials(rollNumber, email, password) {

    localStorage.setItem('credentials', JSON.stringify({ rollNumber, email, password }));

}

function getCredentials() {

    const stored = localStorage.getItem('credentials');

    return stored ? JSON.parse(stored) : null;

}

function clearCredentials() {

    localStorage.removeItem('credentials');

}

function saveAuthToken(token, student) {

    localStorage.setItem('authToken', token);

    localStorage.setItem('studentData', JSON.stringify(student));

}

function getAuthToken() {

    return localStorage.getItem('authToken');

}

function getStoredStudentData() {

    const stored = localStorage.getItem('studentData');

    return stored ? JSON.parse(stored) : null;

}

async function handleLoginSubmit(event) {

    event.preventDefault();

    const rollNumber = document.getElementById('rollNumber').value.trim();

    const email = document.getElementById('email').value.trim();

    const password = document.getElementById('password').value;

    const loginBtn = document.getElementById('loginBtn');

    const loginText = document.getElementById('loginText');

    const loginSpinner = document.getElementById('loginSpinner');

    const loginError = document.getElementById('loginError');

    loginBtn.disabled = true;

    loginText.classList.add('hidden');

    loginSpinner.classList.remove('hidden');

    loginError.classList.add('hidden');

    try {

        apiClient = new ApiClient();

        const student = await apiClient.login(rollNumber, email, password);

        saveCredentials(rollNumber, email, password);

        saveAuthToken(apiClient.token, student);

        // Smooth transition to dashboard
        const loginScreen = document.getElementById('loginScreen');
        const dashboard = document.getElementById('dashboard');
        
        loginScreen.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        loginScreen.style.opacity = '0';
        loginScreen.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            loginScreen.classList.add('hidden');
            dashboard.classList.remove('hidden');
            dashboard.style.opacity = '0';
            dashboard.style.transition = 'opacity 0.5s ease';
            
            setTimeout(() => {
                dashboard.style.opacity = '1';
            }, 50);
        }, 300);

        await loadDashboard(student);

    } catch (error) {

        console.error('Login failed:', error);

        loginError.textContent = error.message || 'Login failed. Please check your credentials.';

        loginError.classList.remove('hidden');

        loginBtn.disabled = false;

        loginText.classList.remove('hidden');

        loginSpinner.classList.add('hidden');

    }

}

async function attemptAutoLogin() {

    const token = getAuthToken();

    const storedStudent = getStoredStudentData();

    const credentials = getCredentials();

    if (token && storedStudent) {

        try {

            apiClient = new ApiClient(token);

            currentToken = token;

            await apiClient.getAttendanceStats();

            document.getElementById('loginScreen').classList.add('hidden');

            document.getElementById('dashboard').classList.remove('hidden');

            await loadDashboard(storedStudent);

            return;

        } catch (error) {

            console.warn('Stored token invalid, falling back to manual login.', error);

            clearCredentials();

            localStorage.removeItem('authToken');

            localStorage.removeItem('studentData');

        }

    }

    document.getElementById('loginScreen').classList.remove('hidden');

    document.getElementById('dashboard').classList.add('hidden');

    if (credentials) {

        document.getElementById('rollNumber').value = credentials.rollNumber;

        document.getElementById('email').value = credentials.email;

    }

}

// Transform API response to internal format
function normalizeAttendanceData(apiResponse) {
    if (!apiResponse) return null;

    // If already normalized, return as-is
    if (apiResponse.overall && apiResponse.byCourse) {
        return apiResponse;
    }

    // API returns: overallAttendance, attendedClassesThisMonth, totalClassesThisMonth, monthlyAttendance, weeklyAttendance, totalEnrolledCourses, byCourse[]
    const byCourseArray = apiResponse.byCourse || [];
    
    // Calculate overall stats from byCourse array if needed
    let totalAttended = 0;
    let totalClasses = 0;
    
    byCourseArray.forEach(course => {
        totalAttended += course.attendedClasses || 0;
        totalClasses += course.totalClasses || 0;
    });

    const overallPercentage = totalClasses > 0 ? (totalAttended / totalClasses) * 100 : 0;

    return {
        overall: {
            percentage: apiResponse.overallAttendance !== undefined ? apiResponse.overallAttendance : overallPercentage,
            attendedClasses: totalAttended,
            totalClasses: totalClasses,
            monthlyPercentage: apiResponse.monthlyAttendance || 0,
            weeklyPercentage: apiResponse.weeklyAttendance || 0
        },
        byCourse: byCourseArray,
        monthlyAttended: apiResponse.attendedClassesThisMonth || 0,
        monthlyTotal: apiResponse.totalClassesThisMonth || 0,
        activeCourses: apiResponse.totalEnrolledCourses || byCourseArray.length,
        recentActivity: apiResponse.recentActivity || []
    };
}

async function loadDashboard(student) {

    const initials = student.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    document.getElementById('profileAvatar').textContent = initials;

    document.getElementById('studentName').textContent = student.name;

    document.getElementById('studentRoll').textContent = student.rollNumber;

    showLoadingSkeletons();

    try {

        const rawData = await apiClient.getAttendanceStats();
        attendanceData = normalizeAttendanceData(rawData);

        allRecords = await apiClient.getAllAttendanceRecords();

        try { renderOverviewCards(); } catch (e) { console.error('Error rendering overview cards:', e); }
        try { renderOverviewTab(); } catch (e) { console.error('Error rendering overview tab:', e); }
        try { renderSubjects(); } catch (e) { console.error('Error rendering subjects:', e); }
        try { renderCalendar(); } catch (e) { console.error('Error rendering calendar:', e); }
        try { renderRecentActivity(); } catch (e) { console.error('Error rendering recent activity:', e); }
        try { renderSubjectsByType(); } catch (e) { console.error('Error rendering subjects by type:', e); }
        try { renderProfile(); } catch (e) { console.error('Error rendering profile:', e); }
        try { renderCharts(); } catch (e) { console.error('Error rendering charts:', e); }
        try { renderRecords(); } catch (e) { console.error('Error rendering records:', e); }

    } catch (error) {

        console.error('Failed to load dashboard:', error);

        alert('Failed to load attendance data. Please try again.');

    }

}

function showLoadingSkeletons() {

    const container = document.getElementById('overviewCards');

    container.innerHTML = Array.from({ length: 4 }).map(() => `

        <div class="stat-card">

            <div class="skeleton h-8 w-32 mb-4"></div>

            <div class="skeleton h-12 w-24 mb-2"></div>

            <div class="skeleton h-4 w-40"></div>

        </div>

    `).join('');

}

function renderOverviewCards() {

    const { overall, byCourse } = attendanceData;

    const cards = [

        {

            title: 'Overall',

            value: `${overall.percentage.toFixed(1)}%`,

            subtitle: 'Total attendance',

            icon: 'fa-chart-pie',

            gradient: 'from-blue-500 to-blue-600',

            badge: 'bg-blue-50'

        },

        {

            title: 'Attended',

            value: overall.attendedClasses,

            subtitle: 'Classes present',

            icon: 'fa-check-circle',

            gradient: 'from-green-500 to-green-600',

            badge: 'bg-green-50'

        },

        {

            title: 'Total Classes',

            value: overall.totalClasses,

            subtitle: 'All courses',

            icon: 'fa-calendar',

            gradient: 'from-purple-500 to-purple-600',

            badge: 'bg-purple-50'

        },

        {

            title: 'Active Courses',

            value: byCourse.length,

            subtitle: 'Enrolled subjects',

            icon: 'fa-book',

            gradient: 'from-orange-500 to-orange-600',

            badge: 'bg-orange-50'

        }

    ];

    document.getElementById('overviewCards').innerHTML = cards.map((card, index) => `

        <div class="stat-card fade-in" style="animation-delay: ${index * 0.1}s">

            <div class="stat-icon ${card.badge}">

                <i class="fas ${card.icon} bg-gradient-to-br ${card.gradient} bg-clip-text text-transparent"></i>

            </div>

            <div class="text-sm text-gray-500 font-medium mb-1">${card.title}</div>

            <div class="text-3xl font-bold text-gray-800 mb-1">${card.value}</div>

            <div class="text-xs text-gray-600">${card.subtitle}</div>

        </div>

    `).join('');

}

function renderOverviewTab() {

    const { overall, byCourse } = attendanceData;

    const rtuCourses = byCourse.filter(course => course.classType === 'RTU_CLASSES');

    const labCourses = byCourse.filter(course => course.classType === 'LABS');

    const rtuTotals = rtuCourses.reduce((acc, course) => {

        acc.attended += course.attendedClasses;

        acc.total += course.totalClasses;

        return acc;

    }, { attended: 0, total: 0 });

    const labTotals = labCourses.reduce((acc, course) => {

        acc.attended += course.attendedClasses;

        acc.total += course.totalClasses;

        return acc;

    }, { attended: 0, total: 0 });

    const rtuPercent = rtuTotals.total ? (rtuTotals.attended / rtuTotals.total) * 100 : 0;

    const labPercent = labTotals.total ? (labTotals.attended / labTotals.total) * 100 : 0;

    document.getElementById('overviewStats').innerHTML = `

        <div class="space-y-3">

            <div class="flex justify-between items-center">

                <span class="text-gray-700 font-medium">Overall Attendance</span>

                <span class="text-2xl font-bold text-indigo-600">${overall.percentage.toFixed(1)}%</span>

            </div>

            <div class="progress-bar">

                <div class="progress-fill bg-gradient-to-r from-indigo-500 to-indigo-600" style="width: ${overall.percentage}%"></div>

            </div>

            <div class="text-xs text-gray-600">${overall.attendedClasses} / ${overall.totalClasses} classes</div>

        </div>

    `;

    document.getElementById('attendanceBreakdown').innerHTML = `

        <div class="space-y-2">

            <div>

                <div class="flex justify-between mb-1">

                    <span class="text-sm font-medium text-gray-700">RTU Classes</span>

                    <span class="text-sm font-bold text-green-600">${rtuPercent.toFixed(1)}%</span>

                </div>

                <div class="progress-bar">

                    <div class="progress-fill bg-gradient-to-r from-green-500 to-green-600" style="width: ${rtuPercent}%"></div>

                </div>

                <div class="text-xs text-gray-600">${rtuTotals.attended} / ${rtuTotals.total}</div>

            </div>

            <div>

                <div class="flex justify-between mb-1">

                    <span class="text-sm font-medium text-gray-700">Lab Classes</span>

                    <span class="text-sm font-bold text-blue-600">${labPercent.toFixed(1)}%</span>

                </div>

                <div class="progress-bar">

                    <div class="progress-fill bg-gradient-to-r from-blue-500 to-blue-600" style="width: ${labPercent}%"></div>

                </div>

                <div class="text-xs text-gray-600">${labTotals.attended} / ${labTotals.total}</div>

            </div>

        </div>

    `;

}

function renderSubjects() {

    const container = document.getElementById('subjectsList');

    sortedCourses = [...attendanceData.byCourse].sort((a, b) => b.percentage - a.percentage);

    container.innerHTML = sortedCourses.map((course, index) => {

        const isLab = course.classType === 'LABS';

        const percentage = course.percentage.toFixed(1);

        const gradient = course.percentage >= 75

            ? 'from-green-500 to-green-600'

            : course.percentage >= 60

                ? 'from-yellow-500 to-yellow-600'

                : 'from-red-500 to-red-600';

        return `

            <div class="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition slide-in subject-card" data-course-index="${index}" style="animation-delay: ${index * 0.05}s">

                <div class="flex items-start justify-between mb-4">

                    <div class="flex-1">

                        <div class="flex items-center gap-2 mb-2">

                            <h4 class="font-bold text-gray-800">${course.courseName}</h4>

                            <span class="badge ${isLab ? 'badge-warning' : 'badge-success'}">

                                <i class="fas ${isLab ? 'fa-flask' : 'fa-book'}"></i>

                                ${isLab ? 'Lab' : 'RTU'}

                            </span>

                        </div>

                        <div class="text-sm text-gray-600">

                            <i class="fas fa-user-graduate mr-1"></i>${course.sectionName}

                        </div>

                    </div>

                    <div class="text-right">

                        <div class="text-3xl font-bold bg-gradient-to-br ${gradient} bg-clip-text text-transparent">${percentage}%</div>

                        <div class="text-sm text-gray-600">${course.attendedClasses}/${course.totalClasses}</div>

                    </div>

                </div>

                <div class="progress-bar mb-3">

                    <div class="progress-fill bg-gradient-to-r ${gradient}" style="width: ${course.percentage}%"></div>

                </div>

                <div class="flex items-center justify-between text-sm">

                    <span class="text-gray-600">

                        <i class="fas fa-calendar-check mr-1"></i>

                        Present: <strong>${course.attendedClasses}</strong>

                    </span>

                    <span class="text-gray-600">

                        <i class="fas fa-calendar-times mr-1"></i>

                        Absent: <strong>${course.totalClasses - course.attendedClasses}</strong>

                    </span>

                    <span class="text-gray-500 text-xs">

                        <i class="fas fa-arrow-right mr-1"></i>Click to see details

                    </span>

                </div>

            </div>

        `;

    }).join('');

    container.querySelectorAll('.subject-card').forEach(card => {

        card.addEventListener('click', () => {

            const index = Number(card.dataset.courseIndex);

            openSubjectModal(index);

        });

    });

}

function openSubjectModal(courseIndex) {

    selectedSubject = sortedCourses[courseIndex];

    if (!selectedSubject) {

        return;

    }

    const { courseName, sectionName, classType, attendedClasses, totalClasses, percentage } = selectedSubject;

    document.getElementById('modalTitle').textContent = courseName;

    document.getElementById('modalSubtitle').textContent = `${sectionName || 'N/A'} • ${classType === 'LABS' ? 'Lab' : 'RTU'} Class`;

    document.getElementById('modalOverall').textContent = `${percentage.toFixed(1)}%`;

    document.getElementById('modalAttended').textContent = `${attendedClasses} of ${totalClasses} classes`;

    document.getElementById('modalPresent').textContent = attendedClasses;

    document.getElementById('modalTotal').textContent = totalClasses;

    const subjectRecords = allRecords.filter(record => record.course?.name === courseName);

    updateModalStats(subjectRecords);

    renderModalRecords(subjectRecords);

    document.getElementById('subjectModal').classList.remove('hidden');

}

function updateModalStats(records) {

    const presentCount = records.filter(record => record.status === 'PRESENT').length;

    const absentCount = records.filter(record => record.status === 'ABSENT').length;

    const totalCount = records.length;

    const rate = totalCount ? ((presentCount / totalCount) * 100).toFixed(1) : '0.0';

    document.getElementById('statsPresent').textContent = presentCount;

    document.getElementById('statsAbsent').textContent = absentCount;

    document.getElementById('statsTotal').textContent = totalCount;

    document.getElementById('statsRate').textContent = `${rate}%`;

}

function renderModalRecords(records) {

    const tbody = document.getElementById('modalRecordsBody');

    const sorted = [...records].sort((a, b) => new Date(b.markedAt) - new Date(a.markedAt));

    tbody.innerHTML = sorted.map(record => {

        const date = new Date(record.markedAt);

        const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        const isPresent = record.status === 'PRESENT';

        return `

            <tr class="border-b border-gray-200 hover:bg-gray-50 transition">

                <td class="p-3">${dateStr}</td>

                <td class="p-3">

                    <span class="badge ${isPresent ? 'badge-success' : 'badge-danger'}">

                        <i class="fas ${isPresent ? 'fa-check-circle' : 'fa-times-circle'}"></i>

                        ${isPresent ? 'Present' : 'Absent'}

                    </span>

                </td>

                <td class="p-3 text-sm">${timeStr}</td>

                <td class="p-3 text-sm">${record.teacher?.name || 'N/A'}</td>

                <td class="p-3 text-sm">${record.semester?.name || 'N/A'}</td>

                <td class="p-3 text-sm">${record.section?.name || 'N/A'}</td>

            </tr>

        `;

    }).join('');

}

function closeSubjectModal() {

    document.getElementById('subjectModal').classList.add('hidden');

    selectedSubject = null;

}

function applyModalFilters() {

    if (!selectedSubject) {

        return;

    }

    const fromDate = document.getElementById('filterFromDate').value;

    const toDate = document.getElementById('filterToDate').value;

    const status = document.getElementById('filterStatus').value;

    let records = allRecords.filter(record => record.course?.name === selectedSubject.courseName);

    if (fromDate) {

        const from = new Date(fromDate);

        records = records.filter(record => new Date(record.markedAt) >= from);

    }

    if (toDate) {

        const to = new Date(toDate);

        records = records.filter(record => new Date(record.markedAt) <= to);

    }

    if (status) {

        records = records.filter(record => record.status === status);

    }

    updateModalStats(records);

    renderModalRecords(records);

}

function clearModalFilters() {

    document.getElementById('filterFromDate').value = '';

    document.getElementById('filterToDate').value = '';

    document.getElementById('filterStatus').value = '';

    if (selectedSubject) {

        const records = allRecords.filter(record => record.course?.name === selectedSubject.courseName);

        updateModalStats(records);

        renderModalRecords(records);

    }

}

function renderCalendar() {

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    document.getElementById('calendarMonth').textContent = `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // Get records by date
    const recordsByDate = {};
    allRecords.forEach(record => {
        const date = new Date(record.markedAt);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        if (!recordsByDate[key]) recordsByDate[key] = [];
        recordsByDate[key].push(record);
    });

    // Get first day of month and days in month
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'p-2 text-center text-gray-400';
        grid.appendChild(emptyCell);
    }

    // Add actual days
    for (let day = 1; day <= daysInMonth; day++) {
        const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayRecords = recordsByDate[key] || [];
        
        const present = dayRecords.filter(r => r.status === 'PRESENT').length;
        const absent = dayRecords.filter(r => r.status === 'ABSENT').length;
        const total = present + absent;

        const today = new Date();
        const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;

        let bgColor = 'bg-white';
        if (total > 0) {
            const percent = (present / total) * 100;
            if (percent >= 75) bgColor = 'bg-gradient-to-br from-green-100 to-green-200';
            else if (percent >= 50) bgColor = 'bg-gradient-to-br from-yellow-100 to-yellow-200';
            else bgColor = 'bg-gradient-to-br from-red-100 to-red-200';
        }

        const dayCell = document.createElement('div');
        dayCell.className = `p-2 text-center rounded-lg cursor-pointer border-2 transition transform hover:scale-110 hover:shadow-xl ${bgColor} ${isToday ? 'border-purple-500 font-bold ring-2 ring-purple-300' : 'border-gray-200'} hover:shadow-md`;
        dayCell.innerHTML = `<div class="text-sm font-bold text-gray-800">${day}</div><div class="text-xs text-gray-600">${total > 0 ? `${present}/${total}` : '-'}</div>`;
        dayCell.onclick = () => showDayPopup(day, month, year, dayRecords);
        grid.appendChild(dayCell);
    }
}

function changeMonth(delta) {

    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1);

    renderCalendar();

}

function closeDayPopup() {
    document.getElementById('dayPopup').classList.add('hidden');
}

function showDayPopup(day, month, year, dayRecords) {

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('popupDate').textContent = `${monthNames[month]} ${day}, ${year}`;

    let html = '';
    if (dayRecords && dayRecords.length > 0) {
        dayRecords.forEach(record => {
            const statusClass = record.status === 'PRESENT' ? 'bg-green-100 border-green-400 text-green-800' : 'bg-red-100 border-red-400 text-red-800';
            const statusIcon = record.status === 'PRESENT' ? '✓' : '✗';
            html += `
                <div class="border-l-4 p-3 rounded ${statusClass}">
                    <div class="font-semibold">${record.course?.name || 'Unknown Course'}</div>
                    <div class="text-xs mt-1">Time: ${new Date(record.markedAt).toLocaleTimeString()}</div>
                    <div class="text-sm font-bold mt-2">${statusIcon} ${record.status}</div>
                </div>
            `;
        });
    } else {
        html = '<div class="text-center text-gray-600 py-8">No classes on this day</div>';
    }

    document.getElementById('popupContent').innerHTML = html;
    document.getElementById('dayPopup').classList.remove('hidden');
}

function closeDayPopup() {

    document.getElementById('dayPopup').classList.add('hidden');

    document.getElementById('dayPopupContent').innerHTML = '';

}

function renderRecentActivity() {

    const container = document.getElementById('recentActivityList');

    const recent = [...allRecords].sort((a, b) => new Date(b.markedAt) - new Date(a.markedAt)).slice(0, 10);

    container.innerHTML = recent.map(record => {

        const date = new Date(record.markedAt);

        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        const isPresent = record.status === 'PRESENT';

        return `

            <div class="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition border-l-4 ${isPresent ? 'border-green-500' : 'border-red-500'}">

                <div class="flex items-center justify-between mb-2">

                    <div>

                        <h4 class="font-bold text-gray-800">${record.course?.name || 'N/A'}</h4>

                        <p class="text-sm text-gray-600"><i class="fas fa-calendar mr-1"></i>${dateStr} at ${timeStr}</p>

                    </div>

                    <span class="badge ${isPresent ? 'badge-success' : 'badge-danger'}">

                        <i class="fas ${isPresent ? 'fa-check-circle' : 'fa-times-circle'}"></i>

                        ${isPresent ? 'Present' : 'Absent'}

                    </span>

                </div>

                <div class="text-xs text-gray-600 flex items-center gap-3">

                    <span><i class="fas fa-user mr-1"></i>${record.teacher?.name || 'N/A'}</span>

                    <span><i class="fas fa-graduation-cap mr-1"></i>${record.semester?.name || 'N/A'}</span>

                </div>

            </div>

        `;

    }).join('');

}

let currentWeekStart = new Date();
currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());

function renderCharts() {
    updateOverallStats();
    renderMonthlyChart();
    renderWeeklyChart();
    renderDailyChart();
    renderSubjectChart();
    renderDonutChart();
    renderComparisonChart();
    renderMonthlySummary();
    renderSubjectDetails();
}

function updateOverallStats() {
    if (!attendanceData) return;
    const { overall } = attendanceData;
    document.getElementById('overallAttendance').textContent = `${overall.percentage?.toFixed(1) || 0}%`;
    document.getElementById('totalClasses').textContent = overall.totalClasses || 0;
    document.getElementById('totalPresent').textContent = overall.attendedClasses || 0;
    document.getElementById('totalAbsent').textContent = (overall.totalClasses - overall.attendedClasses) || 0;
}

function switchAnalyticsTab(tabName) {
    document.querySelectorAll('.analytics-tab').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.analytics-view').forEach(view => view.classList.add('hidden'));
    
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}View`).classList.remove('hidden');
    
    setTimeout(() => {
        Object.values(charts).forEach(chart => {
            if (chart) chart.resize();
        });
    }, 150);
}

function renderMonthlySummary() {
    if (!allRecords || allRecords.length === 0) {
        document.getElementById('monthlySummary').innerHTML = '<p class="text-gray-500 text-center py-8">No data available</p>';
        return;
    }
    
    const container = document.getElementById('monthlySummary');
    
    // Calculate from allRecords
    const monthData = {};
    allRecords.forEach(record => {
        const date = new Date(record.markedAt);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthData[key]) monthData[key] = { total: 0, present: 0 };
        monthData[key].total++;
        if (record.status === 'PRESENT') monthData[key].present++;
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const sorted = Object.entries(monthData).sort().reverse();
    
    const summary = sorted.map(([key, data]) => {
        const [year, month] = key.split('-');
        const monthName = `${monthNames[parseInt(month) - 1]} ${year}`;
        const percentage = ((data.present / data.total) * 100).toFixed(1);
        const color = percentage >= 75 ? 'green' : percentage >= 60 ? 'yellow' : 'red';
        const colorClass = color === 'green' ? 'bg-green-100 border-green-400' : color === 'yellow' ? 'bg-yellow-100 border-yellow-400' : 'bg-red-100 border-red-400';
        
        return `
            <div class="border-l-4 ${colorClass} p-3 rounded transition hover:shadow-md">
                <div class="font-semibold text-gray-800">${monthName}</div>
                <div class="text-xs text-gray-600 mt-1">${data.present}/${data.total} classes</div>
                <div class="text-sm font-bold mt-1">${percentage}%</div>
            </div>
        `;
    }).join('');
    container.innerHTML = summary;
}

function renderSubjectDetails() {
    if (!allRecords || allRecords.length === 0) {
        document.getElementById('subjectDetails').innerHTML = '<p class="text-gray-500 text-center py-8">No courses available</p>';
        return;
    }
    
    const container = document.getElementById('subjectDetails');
    
    // Calculate from allRecords
    const courseMap = {};
    allRecords.forEach(record => {
        const key = record.course?.name || 'Unknown';
        if (!courseMap[key]) {
            courseMap[key] = { name: key, type: record.course?.classType || 'RTU_CLASSES', total: 0, present: 0 };
        }
        courseMap[key].total++;
        if (record.status === 'PRESENT') courseMap[key].present++;
    });
    
    const sorted = Object.values(courseMap)
        .map(c => ({ ...c, percent: c.total ? ((c.present / c.total) * 100).toFixed(1) : 0 }))
        .sort((a, b) => b.percent - a.percent);
    
    const details = sorted.map(course => {
        const percentage = parseFloat(course.percent);
        const color = percentage >= 75 ? 'green' : percentage >= 60 ? 'yellow' : 'red';
        const colorClass = color === 'green' ? 'bg-green-50 border-green-200' : color === 'yellow' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';
        const icon = color === 'green' ? '✓' : color === 'yellow' ? '⚠' : '✗';
        
        return `
            <div class="border-l-4 border-${color}-400 p-4 rounded ${colorClass} transition hover:shadow-md">
                <div class="flex items-start justify-between mb-2">
                    <span class="font-semibold text-gray-800">${course.name}</span>
                    <span class="text-lg font-bold text-${color}-600">${icon}</span>
                </div>
                <div class="grid grid-cols-3 gap-2 text-xs text-gray-600 mt-2">
                    <div><span class="font-semibold">${course.percent}%</span></div>
                    <div><span>${course.present}/${course.total}</span></div>
                    <div><span>${course.type === 'RTU_CLASSES' ? '🎓 RTU' : '🔬 Lab'}</span></div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = details;
}

function changeWeek(delta) {
    currentWeekStart.setDate(currentWeekStart.getDate() + (delta * 7));
    renderWeeklyChart();
    renderWeeklyStats();
}

function renderWeeklyStats() {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const weekRecords = allRecords.filter(record => {
        const recordDate = new Date(record.markedAt);
        return recordDate >= currentWeekStart && recordDate <= weekEnd;
    });
    
    const stats = {
        total: weekRecords.length,
        present: weekRecords.filter(r => r.status === 'PRESENT').length,
        absent: weekRecords.filter(r => r.status === 'ABSENT').length,
        percentage: weekRecords.length ? ((weekRecords.filter(r => r.status === 'PRESENT').length / weekRecords.length) * 100).toFixed(1) : 0
    };
    
    const container = document.getElementById('weeklyStats');
    container.innerHTML = `
        <div class="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
            <div class="text-2xl font-bold text-blue-600">${stats.total}</div>
            <div class="text-xs text-gray-600 mt-1">Total Classes</div>
        </div>
        <div class="bg-green-50 rounded-lg p-4 text-center border border-green-200">
            <div class="text-2xl font-bold text-green-600">${stats.present}</div>
            <div class="text-xs text-gray-600 mt-1">Present</div>
        </div>
        <div class="bg-red-50 rounded-lg p-4 text-center border border-red-200">
            <div class="text-2xl font-bold text-red-600">${stats.absent}</div>
            <div class="text-xs text-gray-600 mt-1">Absent</div>
        </div>
        <div class="bg-purple-50 rounded-lg p-4 text-center border border-purple-200">
            <div class="text-2xl font-bold text-purple-600">${stats.percentage}%</div>
            <div class="text-xs text-gray-600 mt-1">Attendance Rate</div>
        </div>
    `;
    
    const weekEnd2 = new Date(currentWeekStart);
    weekEnd2.setDate(weekEnd2.getDate() + 6);
    const rangeStr = `${currentWeekStart.toLocaleDateString()} - ${weekEnd2.toLocaleDateString()}`;
    document.getElementById('weekRange').textContent = rangeStr;
}

function renderWeeklyChart() {
    const canvas = document.getElementById('weeklyChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayData = {};
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(currentWeekStart);
        date.setDate(date.getDate() + i);
        const dayKey = date.toISOString().split('T')[0];
        dayData[dayKey] = { present: 0, total: 0 };
    }
    
    allRecords.forEach(record => {
        const recordDate = new Date(record.markedAt).toISOString().split('T')[0];
        if (dayData[recordDate]) {
            dayData[recordDate].total++;
            if (record.status === 'PRESENT') dayData[recordDate].present++;
        }
    });
    
    const labels = [];
    const presentData = [];
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(currentWeekStart);
        date.setDate(date.getDate() + i);
        const dayKey = date.toISOString().split('T')[0];
        labels.push(days[date.getDay()]);
        presentData.push(dayData[dayKey].total ? ((dayData[dayKey].present / dayData[dayKey].total) * 100) : 0);
    }
    
    if (charts.weekly) charts.weekly.destroy();
    
    charts.weekly = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Attendance %',
                data: presentData,
                backgroundColor: 'rgba(99, 102, 241, 0.8)',
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, max: 100, ticks: { callback: value => `${value}%` } }
            }
        }
    });
}

function renderDailyChart() {
    const canvas = document.getElementById('dailyChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayStats = { 0: { present: 0, total: 0 }, 1: { present: 0, total: 0 }, 2: { present: 0, total: 0 }, 3: { present: 0, total: 0 }, 4: { present: 0, total: 0 }, 5: { present: 0, total: 0 }, 6: { present: 0, total: 0 } };
    
    allRecords.forEach(record => {
        const dayOfWeek = new Date(record.markedAt).getDay();
        dayStats[dayOfWeek].total++;
        if (record.status === 'PRESENT') dayStats[dayOfWeek].present++;
    });
    
    const dayPercentages = Object.values(dayStats).map(stat => stat.total ? ((stat.present / stat.total) * 100) : 0);
    
    if (charts.daily) charts.daily.destroy();
    
    charts.daily = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: days,
            datasets: [{
                label: 'Average Attendance %',
                data: dayPercentages,
                backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(99, 102, 241, 0.8)', 'rgba(139, 92, 246, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(239, 68, 68, 0.8)', 'rgba(59, 130, 246, 0.8)', 'rgba(249, 115, 22, 0.8)']
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true, max: 100, ticks: { callback: value => `${value}%` } } }
        }
    });
}



function renderMonthlyChart() {
    const canvas = document.getElementById('monthlyChart');

    if (!canvas) {

        return;

    }

    const ctx = canvas.getContext('2d');

    // Calculate from allRecords
    const monthData = {};
    allRecords.forEach(record => {
        const date = new Date(record.markedAt);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthData[key]) monthData[key] = { total: 0, present: 0 };
        monthData[key].total++;
        if (record.status === 'PRESENT') monthData[key].present++;
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const sorted = Object.entries(monthData).sort();
    const labels = sorted.map(([key]) => {
        const [year, month] = key.split('-');
        return `${monthNames[parseInt(month) - 1]} '${year.slice(2)}`;
    });
    const values = sorted.map(([_, data]) => data.total ? ((data.present / data.total) * 100) : 0);

    if (charts.monthly) {

        charts.monthly.destroy();

    }

    charts.monthly = new Chart(ctx, {

        type: 'line',

        data: {

            labels,

            datasets: [

                {

                    label: 'Attendance %',

                    data: values,

                    borderColor: 'rgb(99, 102, 241)',

                    backgroundColor: 'rgba(99, 102, 241, 0.1)',

                    tension: 0.4,

                    fill: true

                }

            ]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: { legend: { display: false } },

            scales: {

                y: {

                    beginAtZero: true,

                    max: 100,

                    ticks: {

                        callback: value => `${value}%`

                    }

                }

            }

        }

    });

}

function renderSubjectChart() {

    const canvas = document.getElementById('subjectChart');

    if (!canvas) {

        return;

    }

    const ctx = canvas.getContext('2d');

    // Calculate from allRecords
    const courseMap = {};
    allRecords.forEach(record => {
        const key = record.course?.name || 'Unknown';
        if (!courseMap[key]) {
            courseMap[key] = { name: key, total: 0, present: 0 };
        }
        courseMap[key].total++;
        if (record.status === 'PRESENT') courseMap[key].present++;
    });

    const sorted = Object.values(courseMap)
        .map(c => ({ ...c, percent: c.total ? ((c.present / c.total) * 100) : 0 }))
        .sort((a, b) => b.percent - a.percent)
        .slice(0, 10);

    const labels = sorted.map(course => course.name.length > 20 ? `${course.name.slice(0, 20)}...` : course.name);

    const values = sorted.map(course => course.percent);

    if (charts.subject) {

        charts.subject.destroy();

    }

    charts.subject = new Chart(ctx, {

        type: 'bar',

        data: {

            labels,

            datasets: [

                {

                    label: 'Attendance %',

                    data: values,

                    backgroundColor: values.map(value => {

                        if (value >= 75) return 'rgba(16, 185, 129, 0.8)';

                        if (value >= 60) return 'rgba(245, 158, 11, 0.8)';

                        return 'rgba(239, 68, 68, 0.8)';

                    })

                }

            ]

        },

        options: {

            indexAxis: 'y',

            responsive: true,

            maintainAspectRatio: false,

            plugins: { legend: { display: false } },

            scales: {

                x: {

                    beginAtZero: true,

                    max: 100,

                    ticks: {

                        callback: value => `${value}%`

                    }

                }

            }

        }

    });

}

function renderDonutChart() {

    const canvas = document.getElementById('donutChart');

    if (!canvas) {

        return;

    }

    const ctx = canvas.getContext('2d');

    // Calculate from allRecords
    const present = allRecords.filter(r => r.status === 'PRESENT').length;
    const absent = allRecords.length - present;

    if (charts.donut) {

        charts.donut.destroy();

    }

    charts.donut = new Chart(ctx, {

        type: 'doughnut',

        data: {

            labels: ['Present', 'Absent'],

            datasets: [

                {

                    data: [present, absent],

                    backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(239, 68, 68, 0.8)'],

                    borderWidth: 0

                }

            ]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: { legend: { position: 'bottom' } }

        }

    });

}

function renderComparisonChart() {

    const canvas = document.getElementById('comparisonChart');

    if (!canvas) {

        return;

    }

    const ctx = canvas.getContext('2d');

    // Calculate from allRecords
    const rtuRecords = allRecords.filter(r => r.course?.classType === 'RTU_CLASSES');
    const labRecords = allRecords.filter(r => r.course?.classType === 'LABS');
    
    const rtuPercent = rtuRecords.length ? ((rtuRecords.filter(r => r.status === 'PRESENT').length / rtuRecords.length) * 100) : 0;
    const labPercent = labRecords.length ? ((labRecords.filter(r => r.status === 'PRESENT').length / labRecords.length) * 100) : 0;

    const data = [rtuPercent, labPercent];

    if (charts.comparison) {

        charts.comparison.destroy();

    }

    charts.comparison = new Chart(ctx, {

        type: 'bar',

        data: {

            labels: ['RTU Classes', 'Lab Classes'],

            datasets: [

                {

                    label: 'Attendance %',

                    data,

                    backgroundColor: ['rgba(99, 102, 241, 0.8)', 'rgba(139, 92, 246, 0.8)']

                }

            ]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: { legend: { display: false } },

            scales: {

                y: {

                    beginAtZero: true,

                    max: 100,

                    ticks: {

                        callback: value => `${value}%`

                    }

                }

            }

        }

    });

}

function renderSubjectsByType() {
    if (!allRecords || allRecords.length === 0) return;
    
    // Group by course and type
    const courseMap = {};
    allRecords.forEach(record => {
        const key = record.course?.name || 'Unknown';
        if (!courseMap[key]) {
            // Determine if Lab based on name containing "Lab" or classType
            const courseName = record.course?.name || '';
            const isLab = courseName.toLowerCase().includes('lab') || record.course?.classType === 'LABS';
            courseMap[key] = {
                name: key,
                type: isLab ? 'LABS' : 'RTU_CLASSES',
                present: 0,
                total: 0
            };
        }
        courseMap[key].total++;
        if (record.status === 'PRESENT') courseMap[key].present++;
    });
    
    // Separate by type
    const rtuSubjects = Object.values(courseMap).filter(c => c.type === 'RTU_CLASSES');
    const labSubjects = Object.values(courseMap).filter(c => c.type === 'LABS');
    
    // Sort by attendance %
    const sortByAttendance = (a, b) => {
        const percentA = (a.present / a.total) * 100;
        const percentB = (b.present / b.total) * 100;
        return percentB - percentA;
    };
    
    rtuSubjects.sort(sortByAttendance);
    labSubjects.sort(sortByAttendance);
    
    // Render RTU
    const rtuContainer = document.getElementById('rtuSubjectsList');
    rtuContainer.innerHTML = rtuSubjects.map((course, idx) => {
        const percent = ((course.present / course.total) * 100).toFixed(1);
        const status = percent >= 75 ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-400 text-green-800' : percent >= 60 ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-400 text-yellow-800' : 'bg-gradient-to-r from-red-50 to-red-100 border-red-400 text-red-800';
        return `
            <div class="border-l-4 p-4 rounded-lg ${status} transition hover:shadow-xl transform hover:-translate-y-1 animate-fadeIn" style="animation-delay: ${idx * 0.05}s">
                <div class="flex items-center justify-between mb-2">
                    <div class="font-bold text-lg">🎓 ${course.name}</div>
                    <div class="text-2xl font-black">${percent}%</div>
                </div>
                <div class="text-sm mt-2 flex justify-between">
                    <span class="font-semibold">${course.present}/${course.total} classes</span>
                    <span class="px-2 py-1 rounded-full bg-white text-xs font-bold">RTU</span>
                </div>
            </div>
        `;
    }).join('') || '<p class="text-gray-500 text-center py-8">No RTU classes</p>';
    
    // Render Labs
    const labContainer = document.getElementById('labSubjectsList');
    labContainer.innerHTML = labSubjects.map((course, idx) => {
        const percent = ((course.present / course.total) * 100).toFixed(1);
        const status = percent >= 75 ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-400 text-green-800' : percent >= 60 ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-400 text-yellow-800' : 'bg-gradient-to-r from-red-50 to-red-100 border-red-400 text-red-800';
        return `
            <div class="border-l-4 p-4 rounded-lg ${status} transition hover:shadow-xl transform hover:-translate-y-1 animate-fadeIn" style="animation-delay: ${idx * 0.05}s">
                <div class="flex items-center justify-between mb-2">
                    <div class="font-bold text-lg">🔬 ${course.name}</div>
                    <div class="text-2xl font-black">${percent}%</div>
                </div>
                <div class="text-sm mt-2 flex justify-between">
                    <span class="font-semibold">${course.present}/${course.total} classes</span>
                    <span class="px-2 py-1 rounded-full bg-white text-xs font-bold">LAB</span>
                </div>
            </div>
        `;
    }).join('') || '<p class="text-gray-500 text-center py-8">No Lab classes</p>';
}

function renderProfile() {
    // Get student data from localStorage
    const student = JSON.parse(localStorage.getItem('studentData')) || {};
    const token = localStorage.getItem('authToken');
    
    // Calculate statistics from allRecords
    const totalPresent = allRecords.filter(r => r.status === 'PRESENT').length;
    const totalAbsent = allRecords.filter(r => r.status === 'ABSENT').length;
    const totalClasses = allRecords.length;
    const attendancePercent = totalClasses ? ((totalPresent / totalClasses) * 100).toFixed(1) : 0;
    
    // Extract initials
    const name = student.name || 'Student';
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
    
    // Get first semester (assuming first record's semester)
    const firstRecord = allRecords[0];
    const semester = firstRecord?.semester?.name || 'N/A';
    
    // Update profile elements
    document.getElementById('profileName').textContent = name;
    document.getElementById('profileDept').textContent = student.department?.name || 'Department';
    document.getElementById('profileRoll').textContent = `Roll: ${student.rollNumber || 'N/A'}`;
    
    // Update profile photo or initials
    const photoElement = document.getElementById('profileInitials');
    if (student.profilePhoto) {
        photoElement.innerHTML = `<img src="${student.profilePhoto}" alt="${name}" class="w-full h-full object-cover rounded-full">`;
    } else {
        photoElement.textContent = initials;
    }
    
    document.getElementById('infoName').textContent = name;
    document.getElementById('infoRoll').textContent = student.rollNumber || 'N/A';
    document.getElementById('infoEmail').textContent = student.email || 'N/A';
    document.getElementById('infoDept').textContent = student.department?.name || 'N/A';
    document.getElementById('infoBatch').textContent = student.batch || 'N/A';
    document.getElementById('infoSemester').textContent = semester;
    
    document.getElementById('profileStatus').textContent = student.status || 'ACTIVE';
    document.getElementById('profileAttendance').textContent = `${attendancePercent}%`;
    document.getElementById('profileClasses').textContent = totalClasses;
    
    // Fetch profile details from API if token exists
    if (token) {
        fetchProfileFromAPI(token, student);
    }
}

async function fetchProfileFromAPI(token, studentData) {
    try {
        const response = await fetch('/api/student/dashboard/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        
        const profileData = await response.json();
        
        // Update profile with API data
        if (profileData.cgpa) {
            document.getElementById('infoCGPA').textContent = profileData.cgpa.toFixed(2);
        }
        if (profileData.totalCredits) {
            document.getElementById('infoCredits').textContent = profileData.totalCredits;
        }
        if (profileData.major) {
            document.getElementById('infoMajor').textContent = profileData.major;
        }
        if (profileData.semester) {
            document.getElementById('infoSemester').textContent = profileData.semester;
        }
        
        // Log successful fetch
        console.log('✅ Profile API data loaded:', profileData);
        
    } catch (error) {
        console.log('📌 Profile API not available, using local data:', error.message);
        // Fallback to local data - already populated above
    }
}

function renderRecords() {

    const container = document.getElementById('recordsList');

    document.getElementById('totalRecords').textContent = allRecords.length;

    const sorted = [...allRecords].sort((a, b) => new Date(b.markedAt) - new Date(a.markedAt));

    container.innerHTML = sorted.map(record => {

        const date = new Date(record.markedAt);

        const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        const isPresent = record.status === 'PRESENT';

        return `

            <div class="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition border-l-4 ${isPresent ? 'border-green-500' : 'border-red-500'}">

                <div class="flex items-start justify-between mb-2">

                    <div class="flex-1">

                        <div class="font-semibold text-gray-800 mb-1">${dateStr}</div>

                        <div class="text-sm text-gray-600"><i class="fas fa-clock mr-1"></i>${timeStr}</div>

                    </div>

                    <span class="badge ${isPresent ? 'badge-success' : 'badge-danger'}">

                        <i class="fas ${isPresent ? 'fa-check-circle' : 'fa-times-circle'}"></i>

                        ${isPresent ? 'Present' : 'Absent'}

                    </span>

                </div>

                <div class="text-sm text-gray-600 space-y-1">

                    <div><i class="fas fa-book mr-2"></i>${record.course?.name || 'N/A'}</div>

                    <div><i class="fas fa-user mr-2"></i>${record.teacher?.name || 'N/A'}</div>

                    <div><i class="fas fa-graduation-cap mr-2"></i>${record.semester?.name || 'N/A'} · ${record.section?.name || 'N/A'}</div>

                </div>

            </div>

        `;

    }).join('');

}

function switchTab(tabName, evt) {

    const eventObj = evt || window.event;

    const buttons = document.querySelectorAll('.tab-button');

    buttons.forEach(button => button.classList.remove('active'));

    if (eventObj && eventObj.currentTarget) {

        eventObj.currentTarget.classList.add('active');

    } else if (eventObj && eventObj.target) {

        eventObj.target.classList.add('active');

    } else {

        const button = Array.from(buttons).find(btn => btn.getAttribute('onclick')?.includes(`switchTab('${tabName}')`));

        if (button) {

            button.classList.add('active');

        }

    }

    document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));

    const tabContent = document.getElementById(`${tabName}Tab`);

    if (tabContent) {

        tabContent.classList.remove('hidden');

    }

    if (tabName === 'charts') {

        setTimeout(() => {

            Object.values(charts).forEach(chart => {

                if (chart) {

                    chart.resize();

                }

            });

        }, 150);

    }

    closeDayPopup();

    closeSubjectModal();

}

function logout() {

    clearCredentials();

    localStorage.removeItem('authToken');

    localStorage.removeItem('studentData');

    window.location.reload();

}

document.addEventListener('click', event => {

    const modal = document.getElementById('subjectModal');

    if (event.target === modal) {

        closeSubjectModal();

    }

    const popup = document.getElementById('dayPopup');

    if (event.target === popup) {

        closeDayPopup();

    }

});

document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('loginForm');

    if (loginForm) {

        loginForm.addEventListener('submit', handleLoginSubmit);

    }

    attemptAutoLogin();

});
