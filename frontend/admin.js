import { adminLogin, getAdminAnalytics, getAdminTable } from './src/api.js';

const app = {
    // State
    activeSection: 'analytics',
    tables: ['discord_users', 'clearance_generations', 'page_visits'],

    // DOM Elements
    loginScreen: document.getElementById('loginScreen'),
    loginForm: document.getElementById('adminLoginForm'),
    loginError: document.getElementById('loginError'),
    adminPanel: document.getElementById('adminPanel'),

    // Initialization
    init() {
        this.loginForm.addEventListener('submit', this.handleLogin.bind(this));
    },

    // Methods
    async handleLogin(e) {
        e.preventDefault();
        const password = document.getElementById('adminPassword').value;
        const result = await adminLogin(password);

        if (result.success) {
            this.loginScreen.style.display = 'none';
            this.adminPanel.classList.remove('hidden');
            this.render();
        } else {
            this.loginError.textContent = result.error || 'Login failed.';
            this.loginError.classList.remove('hidden');
        }
    },

    render() {
        this.adminPanel.innerHTML = `
            <div class="admin-main-content">
                <div class="admin-nav"></div>
                <div class="admin-content-area"></div>
            </div>
        `;
        this.renderSidebar();
        this.renderContent();
    },

    renderSidebar() {
        const navContainer = this.adminPanel.querySelector('.admin-nav');
        navContainer.innerHTML = `
            <h2>Menu</h2>
            ${['analytics', 'tables'].map(section => `
                <button class="nav-btn ${this.activeSection === section ? 'active' : ''}" data-section="${section}">
                    ${section.charAt(0).toUpperCase() + section.slice(1)}
                </button>
            `).join('')}
        `;

        navContainer.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.activeSection = e.target.dataset.section;
                this.render();
            });
        });
    },

    async renderContent() {
        const contentArea = this.adminPanel.querySelector('.admin-content-area');
        contentArea.innerHTML = `<h1>Loading...</h1>`;

        if (this.activeSection === 'analytics') {
            const data = await getAdminAnalytics();
            contentArea.innerHTML = `
                <h1>Analytics</h1>
                <div class="analytics-grid">
                    <div class="analytics-card">
                        <div class="analytics-label">Total Visits</div>
                        <div class="analytics-value">${data.totalVisits || 0}</div>
                    </div>
                    <div class="analytics-card">
                        <div class="analytics-label">Clearances Generated</div>
                        <div class="analytics-value">${data.clearancesGenerated || 0}</div>
                    </div>
                </div>
            `;
        }

        if (this.activeSection === 'tables') {
            contentArea.innerHTML = `
                <h1>Data Tables</h1>
                <div class="table-nav">
                    ${this.tables.map(table => `<button class="table-nav-btn" data-table="${table}">${table.replace('_', ' ')}</button>`).join('')}
                </div>
                <div class="table-container"></div>
            `;

            contentArea.querySelectorAll('.table-nav-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const tableName = e.target.dataset.table;
                    this.renderTable(tableName);
                });
            });
            // Load the first table by default
            this.renderTable(this.tables[0]);
        }
    },

    async renderTable(tableName) {
        const tableContainer = this.adminPanel.querySelector('.table-container');
        tableContainer.innerHTML = `<p>Loading ${tableName}...</p>`;
        const data = await getAdminTable(tableName);

        if (!data || data.length === 0) {
            tableContainer.innerHTML = '<p>No data to display.</p>';
            return;
        }

        const headers = Object.keys(data[0]);
        const table = document.createElement('table');
        table.className = 'data-table';

        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
        });

        const tbody = table.createTBody();
        data.forEach(rowData => {
            const row = tbody.insertRow();
            headers.forEach(header => {
                const cell = row.insertCell();
                let value = rowData[header];
                if (typeof value === 'object' && value !== null) {
                    value = JSON.stringify(value);
                }
                cell.textContent = value;
            });
        });

        tableContainer.innerHTML = '';
        tableContainer.appendChild(table);
    }
};

app.init();