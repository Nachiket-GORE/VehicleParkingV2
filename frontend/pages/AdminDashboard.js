Vue.component('admin-dashboard', {
template: `
  <div>
    <admin-navbar></admin-navbar>
    <div class="container mt-5">
      <h2>Admin Dashboard</h2>

      <!-- Row 1: Monthly Revenue Chart (big, centered) -->
      <div class="dashboard-row single justify-center">
        <div class="dashboard-chart-card big center">
          <div class="card mb-4">
            <div class="card-header">
              <b>Monthly Revenue Trend</b>
            </div>
            <div class="card-body">
              <canvas id="monthlyRevenueChart" height="120" v-if="monthlyRevenue.months.length"></canvas>
              <div v-else class="text-muted">No monthly revenue data available.</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Row 2: Donut & Pie Chart (side by side, same size) -->
      <div class="dashboard-row charts-row">
        <div class="dashboard-chart-card equal">
          <div class="card mb-4">
            <div class="card-header">
              <b>Booking Status Distribution</b>
            </div>
            <div class="card-body">
              <canvas id="allStatusDonutChart" height="120" v-if="allStatus.labels.length"></canvas>
              <div v-else class="text-muted">No status data available.</div>
            </div>
          </div>
        </div>
        <div class="dashboard-chart-card equal">
          <div class="card mb-4">
            <div class="card-header">
              <b>Country Revenue Distribution</b>
            </div>
            <div class="card-body">
              <p><b>Total Countries:</b> {{ countryRanking.length }}</p>
              <canvas id="countryRevenueChart" height="120" v-if="countryRanking.length"></canvas>
              <div v-else class="text-muted">No revenue data available.</div>
              <hr>
              <h6>Country Revenue Ranking</h6>
              <ol>
                <li v-for="item in countryRanking" :key="item.country">
                  {{ item.country }}: ₹{{ item.revenue.toFixed(2) }}
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <!-- Row 3: Best Customers Table (85% width, centered) -->
      <div class="dashboard-row single justify-center">
        <div class="dashboard-table-card center">
          <div class="card mb-4">
            <div class="card-header">
              <b>Best Customers</b>
            </div>
            <div class="card-body">
              <div class="mb-2">
                <div class="btn-group">
                  <button type="button" class="btn btn-outline-primary"
                    :class="{active: customerFilter === 'spends'}"
                    @click="customerFilter = 'spends'">
                    Rank by Spends
                  </button>
                  <button type="button" class="btn btn-outline-primary"
                    :class="{active: customerFilter === 'bookings'}"
                    @click="customerFilter = 'bookings'">
                    Rank by Bookings
                  </button>
                </div>
              </div>
              <table class="table table-bordered table-striped">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Total Bookings</th>
                    <th>Total Spend (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="customer in filteredCustomers" :key="customer.email">
                    <td>{{ customer.rank }}</td>
                    <td>{{ customer.name }}</td>
                    <td>{{ customer.email }}</td>
                    <td>{{ customer.total_bookings }}</td>
                    <td>{{ customer.total_spend.toFixed(2) }}</td>
                  </tr>
                </tbody>
              </table>
              <div v-if="!filteredCustomers.length" class="text-muted">No customer data available.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
`,


  data() {
    return {
      countryRevenue: {},
      countryRanking: [],
      countryRevenueChart: null,
      monthlyRevenue: { months: [], revenues: [] },
      monthlyRevenueChart: null,
      bestCustomers: [],
      customerFilter: 'spends', 
       allStatus: { labels: [], counts: [] },
      allStatusDonutChart: null,
    }
  },
  computed: {
    filteredCustomers() {
      let sorted = [...this.bestCustomers];
      if (this.customerFilter === 'spends') {
        sorted.sort((a, b) => b.total_spend - a.total_spend);
      } else {
        sorted.sort((a, b) => b.total_bookings - a.total_bookings);
      }
      return sorted.map((c, i) => ({ ...c, rank: i + 1 }));
    }
  },
  mounted() {
    this.fetchCountryRevenue();
  this.fetchMonthlyRevenue();
  this.fetchBestCustomers();
  this.fetchAllStatus(); 
  },
  methods: {
    async fetchAllStatus() {
      const res = await fetch('/api/admin/all-bookings-status', {
        headers: { 'Authentication-Token': localStorage.getItem('auth_token') }
      });
      if (res.ok) {
        this.allStatus = await res.json();
        this.$nextTick(() => this.renderAllStatusDonutChart());
      }
    },
    renderAllStatusDonutChart() {
      if (this.allStatusDonutChart) this.allStatusDonutChart.destroy();
      const ctx = document.getElementById('allStatusDonutChart');
      if (!ctx) return;
      const colors = this.allStatus.labels.map((_, i, arr) =>
        `hsl(${(i * 360 / arr.length)}, 70%, 60%)`
      );
      this.allStatusDonutChart = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: this.allStatus.labels,
          datasets: [{
            data: this.allStatus.counts,
            backgroundColor: colors
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    },
    async fetchBestCustomers() {
      const res = await fetch('/api/admin/best-customers');
      if (res.ok) {
        this.bestCustomers = await res.json();
      }
    },
    async fetchMonthlyRevenue() {
      const res = await fetch('/api/admin/monthly-revenue');
      if (res.ok) {
        const data = await res.json();
        this.monthlyRevenue = data;
        this.$nextTick(() => this.renderMonthlyRevenueChart());
      }
    },
    renderMonthlyRevenueChart() {
      if (this.monthlyRevenueChart) this.monthlyRevenueChart.destroy();
      const ctx = document.getElementById('monthlyRevenueChart');
      if (!ctx) return;
      this.monthlyRevenueChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
          labels: this.monthlyRevenue.months,
          datasets: [{
            label: 'Revenue',
            data: this.monthlyRevenue.revenues,
            backgroundColor: '#0d6efd'
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    },
    async fetchCountryRevenue() {
      const res = await fetch('/api/admin/global-country-revenue');
      if (res.ok) {
        const data = await res.json();
        this.countryRevenue = data.countryRevenue;
        this.countryRanking = data.countryRanking;
        this.$nextTick(() => this.renderCountryRevenueChart());
      }
    },
    renderCountryRevenueChart() {
      if (this.countryRevenueChart) this.countryRevenueChart.destroy();
      const ctx = document.getElementById('countryRevenueChart');
      if (!ctx) return;
      const labels = this.countryRanking.map(item => item.country);
      const data = this.countryRanking.map(item => item.revenue);
      function getColor(i, total) {
        return `hsl(${(i * 360 / total)}, 70%, 50%)`;
      }
      const backgroundColors = labels.map((_, i) => getColor(i, labels.length));
      this.countryRevenueChart = new Chart(ctx.getContext('2d'), {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: backgroundColors
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    }
  },
  watch: {
    countryRanking(newVal) {
      if (newVal.length) {
        this.$nextTick(() => this.renderCountryRevenueChart());
      }
    },
    'monthlyRevenue.months'(newVal) {
      if (newVal.length) {
        this.$nextTick(() => this.renderMonthlyRevenueChart());
      }
   
    }
  }
});