Vue.component('admin-customers-data', {
  template: `
    <div>
      <admin-navbar></admin-navbar>
      <div class="container mt-5">
        <h2>Customers</h2>
        <table class="table table-bordered table-striped">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Email</th>
              <th>Country</th>
              <th>City</th>
              <th>Date Joined</th>
              <th>Total Bookings</th>
              <th>Total Spend (₹)</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(customer, idx) in customers" :key="customer.id">
              <td>{{ idx + 1 }}</td>
              <td>{{ customer.full_name }}</td>
              <td>{{ customer.email }}</td>
              <td>{{ customer.country }}</td>
              <td>{{ customer.city }}</td>
              <td>{{ customer.date_of_Account_creation }}</td>
              <td>{{ customer.total_bookings }}</td>
              <td>₹{{ customer.total_spend.toFixed(2) }}</td>
              <td>
                <button class="btn btn-sm btn-primary" @click="viewCustomer(customer)">View</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Modal for customer details and charts -->
      <div class="modal fade" tabindex="-1" :class="{show: showModal}" style="display: block;" v-if="showModal">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">{{ selectedCustomer.full_name }}'s Details</h5>
              <button type="button" class="btn-close" @click="closeModal"></button>
            </div>
            <div class="modal-body">
              <!-- Info Card -->
              <div class="modal-info-card">
                <img v-if="selectedCustomer.user_profile" :src="selectedCustomer.user_profile" alt="Profile">
                <div class="modal-info-details">
                  <div><b>Name:</b> {{ selectedCustomer.full_name }}</div>
                  <div><b>Email:</b> {{ selectedCustomer.email }}</div>
                  <div><b>Country:</b> {{ selectedCustomer.country }}</div>
                  <div><b>City:</b> {{ selectedCustomer.city }}</div>
                  <div><b>Address:</b> {{ selectedCustomer.address }}</div>
                  <div><b>Pincode:</b> {{ selectedCustomer.pincode }}</div>
                  <div><b>Date Joined:</b> {{ selectedCustomer.date_of_Account_creation }}</div>
                  <div><b>Total Bookings:</b> {{ selectedCustomer.total_bookings }}</div>
                  <div><b>Total Spend:</b> ₹{{ selectedCustomer.total_spend.toFixed(2) }}</div>
                </div>
              </div>

              <!-- Monthly Spend (Row 1, full width) -->
              <div class="modal-charts-row single">
                <div class="modal-chart-card">
                  <h6>Monthly Spend</h6>
                  <canvas id="modalMonthlySpendChart" height="80"></canvas>
                </div>
              </div>

              <!-- Pie & Donut (Row 2, side by side) -->
              <div class="modal-charts-row">
                <div class="modal-chart-card">
                  <h6>Bookings by Location</h6>
                  <canvas id="modalBookingsLocationChart" height="80"></canvas>
                </div>
                <div class="modal-chart-card">
                  <h6>Booking Status Distribution</h6>
                  <canvas id="modalBookingsStatusChart" height="80"></canvas>
                </div>
              </div>

              <!-- Vehicle Bar Chart (Row 3, full width) -->
              <div class="modal-charts-row single">
                <div class="modal-chart-card">
                  <h6>Bookings by Vehicle Type</h6>
                  <canvas id="modalBookingsVehicleTypeChart" height="80"></canvas>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" @click="closeModal">Close</button>
            </div>
          </div>
        </div>
      </div>
      <div v-if="showModal" class="modal-backdrop fade show"></div>
    </div>
  `,
  data() {
    return {
      customers: [],
      showModal: false,
      selectedCustomer: {},
      modalCharts: {
        monthlySpend: null,
        bookingsLocation: null,
        bookingsVehicleType: null,
        bookingsStatus: null
      }
    }
  },
  mounted() {
    this.fetchCustomers();
  },
  methods: {
    async fetchCustomers() {
      const res = await fetch('/api/admin/customers', {
        headers: { 'Authentication-Token': localStorage.getItem('auth_token') }
      });
      if (res.ok) {
        this.customers = await res.json();
      }
    },
    async viewCustomer(customer) {
      this.selectedCustomer = customer;
      this.showModal = true;
      await this.fetchAndRenderCustomerCharts(customer.email);
    },
    closeModal() {
      this.showModal = false;
      this.selectedCustomer = {};
      Object.values(this.modalCharts).forEach(chart => {
        if (chart) chart.destroy();
      });
      this.modalCharts = {
        monthlySpend: null,
        bookingsLocation: null,
        bookingsVehicleType: null,
        bookingsStatus: null
      };
    },
    async fetchAndRenderCustomerCharts(email) {
      // Fetch all chart data
      const [statusRes, spendRes, locRes, vehRes] = await Promise.all([
        fetch(`/api/admin/customer-bookings-status?email=${encodeURIComponent(email)}`, {
          headers: { 'Authentication-Token': localStorage.getItem('auth_token') }
        }),
        fetch(`/api/admin/customer-monthly-spend?email=${encodeURIComponent(email)}`, {
          headers: { 'Authentication-Token': localStorage.getItem('auth_token') }
        }),
        fetch(`/api/admin/customer-bookings-by-location?email=${encodeURIComponent(email)}`, {
          headers: { 'Authentication-Token': localStorage.getItem('auth_token') }
        }),
        fetch(`/api/admin/customer-bookings-by-vehicle-type?email=${encodeURIComponent(email)}`, {
          headers: { 'Authentication-Token': localStorage.getItem('auth_token') }
        })
      ]);
      const statusData = statusRes.ok ? await statusRes.json() : { labels: [], counts: [] };
      const spendData = spendRes.ok ? await spendRes.json() : { months: [], spends: [] };
      const locData = locRes.ok ? await locRes.json() : { labels: [], counts: [] };
      const vehData = vehRes.ok ? await vehRes.json() : { labels: [], counts: [] };

      this.$nextTick(() => {
        // Monthly Spend Chart
        if (this.modalCharts.monthlySpend) this.modalCharts.monthlySpend.destroy();
        const ctx1 = document.getElementById('modalMonthlySpendChart');
        if (ctx1) {
          this.modalCharts.monthlySpend = new Chart(ctx1.getContext('2d'), {
            type: 'bar',
            data: {
              // Show last 12 months (pad with zeros if needed)
              labels: spendData.months.slice(-8),
              datasets: [{
                label: 'Spend (₹)',
                data: spendData.spends.slice(-8),
                backgroundColor: '#198754',
                borderRadius: 8,
                barPercentage: 0.7,
                categoryPercentage: 0.6
              }]
            },
            options: {
              responsive: true,
              animation: {
                duration: 1200,
                easing: 'easeOutBounce'
              },
              plugins: {
                legend: { display: false },
                tooltip: { enabled: true }
              },
              
              scales: {
                x: {
                  title: { display: false, text: 'Month' },
                  ticks: {
                    autoSkip: false,
                    maxRotation: 45,
                    minRotation: 30,
                    font: { size: 12 }
                  },
                  grid: { display: false }
                },
                y: {
                  beginAtZero: true,
                  title: { display: true, text: 'Spend (₹)' },
                  ticks: {
                    stepSize: 50,
                    
                  },
                  grid: { display: true }
                }
              }
              
            }
          });
        }

        // Bookings by Location Chart
        if (this.modalCharts.bookingsLocation) this.modalCharts.bookingsLocation.destroy();
        const ctx2 = document.getElementById('modalBookingsLocationChart');
        if (ctx2) {
          const colors = locData.labels.map((_, i, arr) =>
            `hsl(${(i * 360 / arr.length)}, 70%, 60%)`
          );
          this.modalCharts.bookingsLocation = new Chart(ctx2.getContext('2d'), {
            type: 'pie',
            data: {
              labels: locData.labels,
              datasets: [{
                data: locData.counts,
                backgroundColor: colors
              }]
            },
            options: {
              responsive: true,
              plugins: { legend: { position: 'bottom' } }
            }
          });
        }

        // Bookings by Vehicle Type Chart
        if (this.modalCharts.bookingsVehicleType) this.modalCharts.bookingsVehicleType.destroy();
        const ctx3 = document.getElementById('modalBookingsVehicleTypeChart');
        if (ctx3) {
          const colors = vehData.labels.map((_, i, arr) =>
            `hsl(${(i * 360 / arr.length)}, 70%, 60%)`
          );
          this.modalCharts.bookingsVehicleType = new Chart(ctx3.getContext('2d'), {
            type: 'bar',
            data: {
              labels: vehData.labels,
              datasets: [{
                label: 'Bookings',
                data: vehData.counts,
                backgroundColor: colors,
                borderRadius: 8,
                barPercentage: 0.7,
                categoryPercentage: 0.6
              }]
            },
            options: {
              indexAxis: 'y',
              responsive: true,
              animation: {
                duration: 1200,
                easing: 'easeOutBounce'
              },
              plugins: {
                legend: { display: false },
                tooltip: { enabled: true }
              },
              scales: {
                x: {
                  beginAtZero: true,
                  title: { display: true, text: 'Bookings' }
                },
                y: {
                  title: { display: true, text: 'Vehicle Type' }
                }
              }
            }
          });
        }

        // Booking Status Donut Chart
        if (this.modalCharts.bookingsStatus) this.modalCharts.bookingsStatus.destroy();
        const ctx4 = document.getElementById('modalBookingsStatusChart');
        if (ctx4) {
          const colors = statusData.labels.map((_, i, arr) =>
            `hsl(${(i * 360 / arr.length)}, 70%, 60%)`
          );
          this.modalCharts.bookingsStatus = new Chart(ctx4.getContext('2d'), {
            type: 'doughnut',
            data: {
              labels: statusData.labels,
              datasets: [{
                data: statusData.counts,
                backgroundColor: colors
              }]
            },
            options: {
              responsive: true,
              plugins: { legend: { position: 'bottom' } }
            }
          });
        }
      });
    }
  }
});