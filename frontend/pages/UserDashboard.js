Vue.component('user-dashboard', {
  template: `
    <div>
      <user-navbar></user-navbar>
      <div class="container-fluid user-dashboard-main dashboard-charts-container">
        <h2 class="dashboard-heading mb-4">User Dashboard</h2>
        <!-- Row 1: Monthly Spends/Bookings Chart -->
        <div class="row mb-4">
          <div class="col-md-12">
            <div class="card shadow-sm p-3 mb-3 monthly-chart-container">
              <h5 class="card-title mb-3">Monthly Spends / Bookings</h5>
              <div class="btn-group mb-2">
                <button type="button" class="btn btn-outline-primary"
                  :class="{active: chartMode === 'spend'}"
                  @click="chartMode = 'spend'">Spends</button>
                <button type="button" class="btn btn-outline-primary"
                  :class="{active: chartMode === 'bookings'}"
                  @click="chartMode = 'bookings'">Bookings</button>
              </div>
              <canvas id="userMonthlySpendChart" height="120" v-if="monthlyChartData.months.length"></canvas>
              <div v-else class="text-muted">No data available.</div>
            </div>
          </div>
        </div>
        <!-- Row 2: Donut and Pie Charts -->
        <div class="row mb-4">
          <div class="col-md-6">
            <div class="card shadow-sm p-3 mb-3">
              <h5 class="card-title mb-3">Status Distribution</h5>
              <canvas id="userStatusDonutChart" height="120" v-if="statusChartData.labels.length"></canvas>
              <div v-else class="text-muted">No status data available.</div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card shadow-sm p-3 mb-3">
              <h5 class="card-title mb-3">Bookings by Location</h5>
              <canvas id="userBookingsLocationChart" height="120" v-if="bookingsByLocation.labels.length"></canvas>
              <div v-else class="text-muted">No location data available.</div>
            </div>
          </div>
        </div>
        <!-- Row 3: Vehicle Type Chart -->
        <div class="row mb-4">
          <div class="col-md-12">
            <div class="card shadow-sm p-3 mb-3 vehicle-chart-container">
              <h5 class="card-title mb-3">Bookings by Vehicle Type</h5>
              <canvas id="userBookingsVehicleTypeChart" height="120" v-if="bookingsByVehicleType.labels.length"></canvas>
              <div v-else class="text-muted">No vehicle type data available.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      bookingsByVehicleType: { labels: [], counts: [] },
      bookingsByVehicleTypeChart: null,
      chartMode: 'spend',
      monthlySpend: { months: [], spends: [] },
      monthlyBookings: { months: [], bookings: [] },
      monthlySpendChart: null,
      bookingsByLocation: { labels: [], counts: [] },
      bookingsByLocationChart: null,
      statusChartData: { labels: [], counts: [] },
      statusDonutChart: null
    }
  },
  computed: {
    monthlyChartData() {
      if (this.chartMode === 'spend') {
        return {
          months: this.monthlySpend.months,
          data: this.monthlySpend.spends,
          label: 'My Spend (₹)',
          color: '#198754'
        };
      } else {
        return {
          months: this.monthlyBookings.months,
          data: this.monthlyBookings.bookings,
          label: 'My Bookings',
          color: '#0d6efd'
        };
      }
    }
  },
  watch: {
    chartMode() {
      this.$nextTick(() => this.renderMonthlySpendChart());
    }
  },
  mounted() {
    this.fetchBookingsByVehicleType();
    this.fetchMonthlySpend();
    this.fetchMonthlyBookings();
    this.fetchBookingsByLocation();
    this.fetchStatusDistribution();
  },
  methods: {
    async fetchBookingsByVehicleType() {
      const res = await fetch('/api/user/bookings-by-vehicle-type', {
        headers: { 'Authentication-Token': localStorage.getItem('auth_token') }
      });
      if (res.ok) {
        const data = await res.json();
        this.bookingsByVehicleType = data;
        this.$nextTick(() => this.renderBookingsByVehicleTypeChart());
      }
    },
    renderBookingsByVehicleTypeChart() {
    if (this.bookingsByVehicleTypeChart) this.bookingsByVehicleTypeChart.destroy();
    const ctx = document.getElementById('userBookingsVehicleTypeChart');
    if (!ctx) return;
    const colors = this.bookingsByVehicleType.labels.map((_, i, arr) =>
      `hsl(${(i * 360 / arr.length)}, 70%, 60%)`
    );
    this.bookingsByVehicleTypeChart = new Chart(ctx.getContext('2d'), {
      type: 'bar',
      data: {
        labels: this.bookingsByVehicleType.labels,
        datasets: [{
          label: 'Bookings',
          data: this.bookingsByVehicleType.counts,
          backgroundColor: colors
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { beginAtZero: true }
        }
      }
    });
  },
    async fetchMonthlySpend() {
      const res = await fetch('/api/user/monthly-spend', {
        headers: { 'Authentication-Token': localStorage.getItem('auth_token') }
      });
      if (res.ok) {
        const data = await res.json();
        this.monthlySpend = data;
        this.$nextTick(() => this.renderMonthlySpendChart());
      }
    },
    async fetchMonthlyBookings() {
      const res = await fetch('/api/user/monthly-bookings', {
        headers: { 'Authentication-Token': localStorage.getItem('auth_token') }
      });
      if (res.ok) {
        const data = await res.json();
        this.monthlyBookings = data;
        this.$nextTick(() => this.renderMonthlySpendChart());
      }
    },
    renderMonthlySpendChart() {
      if (this.monthlySpendChart) this.monthlySpendChart.destroy();
      const ctx = document.getElementById('userMonthlySpendChart');
      if (!ctx) return;
      this.monthlySpendChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
          labels: this.monthlyChartData.months,
          datasets: [{
            label: this.monthlyChartData.label,
            data: this.monthlyChartData.data,
            backgroundColor: this.monthlyChartData.color
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
    async fetchBookingsByLocation() {
      const res = await fetch('/api/user/bookings-by-location', {
        headers: { 'Authentication-Token': localStorage.getItem('auth_token') }
      });
      if (res.ok) {
        const data = await res.json();
        this.bookingsByLocation = data;
        this.$nextTick(() => this.renderBookingsByLocationChart());
      }
    },
    renderBookingsByLocationChart() {
      if (this.bookingsByLocationChart) this.bookingsByLocationChart.destroy();
      const ctx = document.getElementById('userBookingsLocationChart');
      if (!ctx) return;
      const colors = this.bookingsByLocation.labels.map((_, i, arr) =>
        `hsl(${(i * 360 / arr.length)}, 70%, 60%)`
      );
      this.bookingsByLocationChart = new Chart(ctx.getContext('2d'), {
        type: 'pie',
        data: {
          labels: this.bookingsByLocation.labels,
          datasets: [{
            data: this.bookingsByLocation.counts,
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
    async fetchStatusDistribution() {
      const res = await fetch('/api/user/bookings-status-distribution', {
        headers: { 'Authentication-Token': localStorage.getItem('auth_token') }
      });
      if (res.ok) {
        const data = await res.json();
        this.statusChartData = data;
        this.$nextTick(() => this.renderStatusDonutChart());
      }
    },
    renderStatusDonutChart() {
      if (this.statusDonutChart) this.statusDonutChart.destroy();
      const ctx = document.getElementById('userStatusDonutChart');
      if (!ctx) return;
      const colors = this.statusChartData.labels.map((_, i, arr) =>
        `hsl(${(i * 360 / arr.length)}, 70%, 60%)`
      );
      this.statusDonutChart = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: this.statusChartData.labels,
          datasets: [{
            data: this.statusChartData.counts,
            backgroundColor: colors
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'bottom' }
          },
          cutout: '70%'
        }
      });
    }
  }
});
