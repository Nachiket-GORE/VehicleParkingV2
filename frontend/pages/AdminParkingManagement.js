Vue.component('admin-parking-management', {
template: `
<div class="admin-parking-management">
    <admin-navbar></admin-navbar>
    <div class="container mt-5">
      <div class="row flex-column align-items-center">
        <!-- Create Lot Card -->
        <div class="col-12 mb-4 d-flex justify-content-center">
          <div class="card card-wide">
            <div class="card-body d-flex flex-column align-items-center">
              <h5 class="card-title text-center">Create Lot</h5>
              <button class="btn btn-primary mt-2" @click="showCreateLotModal = true">+ Create Lot</button>
            </div>
          </div>
        </div>
        <!-- Country Selection -->
        <div class="col-12 mb-4 d-flex justify-content-center" v-if="countries.length">
          <div class="card card-wide">
            <div class="card-body">
              <h5 class="card-title text-center">Countries</h5>
              <ul class="horizontal-list-group">
                <li v-for="country in countries" :key="country"
                    class="list-group-item"
                    :class="{active: selectedCountry === country}"
                    @click="selectCountry(country)">
                  <span>{{ country }}</span>
                  <span @click.stop="showCountryStats(country)" style="cursor:pointer;">
                    <i class="bi bi-bar-chart-fill text-primary ms-2"></i>
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <!-- Cities Card -->
        <div class="col-12 mb-4 d-flex justify-content-center" v-if="selectedCountry && cities.length">
          <div class="card card-wide">
            <div class="card-body">
              <h5 class="card-title text-center">Cities</h5>
              <ul class="horizontal-list-group">
                <li v-for="city in cities" :key="city"
                    class="list-group-item"
                    :class="{active: selectedCity === city}"
                    @click="selectCity(city)">
                  <span>{{ city }}</span>
                  <span @click.stop="showCityStats(city)" style="cursor:pointer;">
                    <i class="bi bi-bar-chart-fill text-primary ms-2"></i>
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <!-- Address Selection -->
        <div class="col-12 mb-4 d-flex justify-content-center" v-if="selectedCity && addresses.length">
          <div class="card card-wide">
            <div class="card-body">
              <h5 class="card-title text-center">Addresses</h5>
              <ul class="horizontal-list-group">
                <li v-for="address in addresses" :key="address"
                    class="list-group-item"
                    :class="{active: selectedAddress === address}">
                  <span @click="selectAddress(address)" style="cursor:pointer;">{{ address }}</span>
                  <span>
                    <i class="bi bi-pencil-square text-primary me-2" style="cursor:pointer;" @click.stop="editAddressPrompt(address)"></i>
                    <i class="bi bi-trash text-danger" style="cursor:pointer;" @click.stop="deleteAddressPrompt(address)"></i>
                    <i class="bi bi-bar-chart-fill text-primary ms-2" style="cursor:pointer;" @click.stop="showAddressStats(address)"></i>
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <!-- Slots -->
        <div class="col-12 mb-4 d-flex justify-content-center" v-if="selectedAddress && slots.length">
          <div class="card card-wide">
            <div class="card-body">
              <h5 class="card-title text-center">Slots</h5>
              <div class="d-flex flex-wrap justify-content-center gap-2">
                <div v-for="slot in slots" :key="slot.id"
                     class="rounded-circle d-flex align-items-center justify-content-center"
                     :class="{selected: selectedSlot && selectedSlot.id === slot.id}"
                     style="width: 50px; height: 50px; color: white; cursor: pointer;"
                     :style="{
                       background: slot.status === 'occupied' ? '#dc3545' : '#198754'
                     }"
                     @click="selectSlot(slot)">
                  {{ slot.number }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>      <!-- Modals remain unchanged -->
      <!-- Create Lot Modal -->
      <div v-if="showCreateLotModal" class="modal fade show d-block" tabindex="-1" style="background:rgba(0,0,0,0.5);">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Create Parking Lot</h5>
              <button type="button" class="btn-close" @click="showCreateLotModal = false"></button>
            </div>
            <div class="modal-body">
              <form @submit.prevent="createLot">
                <div v-if="lotError" class="alert alert-danger">{{ lotError }}</div>
                <div v-if="lotSuccess" class="alert alert-success">{{ lotSuccess }}</div>
                <div class="mb-2">
                  <label>Prime Location Name</label>
                  <input v-model="newLot.prime_location_name" class="form-control" required />
                </div>
                <div class="mb-2">
                  <label>Price (per hour)</label>
                  <input v-model="newLot.price" type="number" min="1" class="form-control" required />
                </div>
                <div class="mb-2">
                  <label>Country</label>
                  <input v-model="newLot.country" class="form-control" required />
                </div>
                <div class="mb-2">
                  <label>City</label>
                  <input v-model="newLot.city" class="form-control" required />
                </div>
                <div class="mb-2">
                  <label>Address</label>
                  <input v-model="newLot.address" class="form-control" required />
                </div>
                <div class="mb-2">
                  <label>Pincode</label>
                  <input v-model="newLot.pincode" type="number" class="form-control" required />
                </div>
                <div class="mb-2">
                  <label>Number of Spots</label>
                  <input v-model="newLot.number_of_spots" type="number" min="1" class="form-control" required />
                </div>
                <div class="modal-footer px-0">
                  <button class="btn btn-secondary" @click.prevent="showCreateLotModal = false">Cancel</button>
                  <button type="submit" class="btn btn-primary">Create</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      <!-- Slot Details Modal -->
      <div v-if="selectedSlot" class="modal fade show d-block" tabindex="-1" style="background:rgba(0,0,0,0.5);">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                Slot #{{ selectedSlot.number }} - {{ selectedSlot.status === 'occupied' ? 'Occupied' : 'Available' }}
              </h5>
              <button type="button" class="btn-close" @click="closeSlotDetails"></button>
            </div>
            <div class="modal-body">
              <div v-if="loadingSlotDetails">
                <div class="text-center">
                  <div class="spinner-border" role="status"></div>
                  <p>Loading booking details...</p>
                </div>
              </div>
              <div v-else-if="slotBookingDetails && slotBookingDetails.length">
                <div class="alert alert-danger">
                  <h6>Slot Booking History</h6>
                </div>
                <div v-for="(booking, idx) in todaysSlotBookings" :key="idx" class="mb-4 border-bottom pb-2">
                  <div class="row">
                    <div class="col-md-6">
                      <h6>Customer Information</h6>
                      <table class="table table-sm">
                        <tr><th>Name:</th><td>{{ booking.customer_name }}</td></tr>
                        <tr><th>Email:</th><td>{{ booking.customer_email }}</td></tr>
                        <tr><th>Country:</th><td>{{ booking.customer_country }}</td></tr>
                        <tr><th>City:</th><td>{{ booking.customer_city }}</td></tr>
                        <tr><th>Address:</th><td>{{ booking.customer_address }}</td></tr>
                      </table>
                    </div>
                    <div class="col-md-6">
                      <h6>Booking Information</h6>
                      <table class="table table-sm">
                        <tr><th>Vehicle No:</th><td>{{ booking.vehicle_no }}</td></tr>
                        <tr><th>Vehicle Type:</th><td>{{ booking.vehicle_type }}</td></tr>
                        <tr><th>Booked At:</th><td>{{ new Date(booking.booking_time).toLocaleString() }}</td></tr>
                        <tr><th>Duration:</th><td>{{ booking.duration_hours }} hours</td></tr>
                        <tr><th>Release Time:</th><td>{{ new Date(booking.release_time).toLocaleString() }}</td></tr>
                        <tr><th>Cost:</th><td>{{ booking.parking_cost }}</td></tr>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else>
                <div class="alert alert-success">
                  <h6>Slot is Available</h6>
                  <p>This slot is currently free and ready for booking.</p>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" @click="closeSlotDetails">Close</button>
            </div>
          </div>
        </div>
      </div>
      <!-- Stats Modal -->
      <div v-if="showStatsModal" class="modal fade show d-block" tabindex="-1" style="background:rgba(0,0,0,0.5);">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Stats for {{ statsCountry }}</h5>
              <button type="button" class="btn-close" @click="closeStatsModal"></button>
            </div>
            <div class="modal-body">
              <div v-if="statsLoading" class="text-center">
                <div class="spinner-border" role="status"></div>
                <p>Loading stats...</p>
              </div>
              <div v-else>
                <p><b>Total Cities:</b> {{ statsData.totalCities }}</p>
                <p><b>City-wise Revenue Contribution:</b></p>
                <canvas id="cityRevenueChart" height="120" v-if="statsData.cityRanking.length"></canvas>
                <div v-else class="text-muted">No revenue data available.</div>
                <hr>
                <h6>City Revenue Ranking</h6>
                <ol>
                  <li v-for="item in statsData.cityRanking" :key="item.city">
                    {{ item.city }}: ₹{{ item.revenue.toFixed(2) }}
                  </li>
                </ol>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" @click="closeStatsModal">Close</button>
            </div>
          </div>
        </div>
      </div>
      <!-- City Stats Modal -->
      <div v-if="showCityStatsModal" class="modal fade show d-block" tabindex="-1" style="background:rgba(0,0,0,0.5);">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Stats for {{ statsCity }}</h5>
              <button type="button" class="btn-close" @click="closeCityStatsModal"></button>
            </div>
            <div class="modal-body">
              <div v-if="cityStatsLoading" class="text-center">
                <div class="spinner-border" role="status"></div>
                <p>Loading stats...</p>
              </div>
              <div v-else>
                <p><b>Total Locations:</b> {{ cityStatsData.totalAddresses }}</p>
                <p><b>Address-wise Revenue Contribution:</b></p>
                <canvas id="addressRevenueChart" height="120" v-if="cityStatsData.addressRanking.length"></canvas>
                <div v-else class="text-muted">No revenue data available.</div>
                <hr>
                <h6>Address Revenue Ranking</h6>
                <ol>
                  <li v-for="item in cityStatsData.addressRanking" :key="item.address">
                    {{ item.address }}: ₹{{ item.revenue.toFixed(2) }}
                  </li>
                </ol>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" @click="closeCityStatsModal">Close</button>
            </div>
          </div>
        </div>
      </div>
      <!-- Address Stats Modal -->
      <div v-if="showAddressStatsModal" class="modal fade show d-block" tabindex="-1" style="background:rgba(0,0,0,0.5);">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Stats for {{ statsAddress }}</h5>
              <button type="button" class="btn-close" @click="closeAddressStatsModal"></button>
            </div>
            <div class="modal-body">
              <div v-if="addressStatsLoading" class="text-center">
                <div class="spinner-border" role="status"></div>
                <p>Loading stats...</p>
              </div>
              <div v-else>
                <p><b>Total Slots:</b> {{ addressStatsData.totalSlots }}</p>
                <p><b>Slot-wise Revenue Contribution:</b></p>
                <canvas id="slotRevenueChart" height="120" v-if="addressStatsData.slotRanking.length"></canvas>
                <div v-else class="text-muted">No revenue data available.</div>
                <hr>
                <h6>Slot Revenue Ranking</h6>
                <ol>
                  <li v-for="item in addressStatsData.slotRanking" :key="item.slot">
                    Slot #{{ item.slot }}: ₹{{ item.revenue.toFixed(2) }}
                  </li>
                </ol>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" @click="closeAddressStatsModal">Close</button>
            </div>
          </div>
        </div>
      </div>
      <!-- Edit Address Modal -->
      <div v-if="editAddressModal" class="modal fade show d-block" tabindex="-1" style="background:rgba(0,0,0,0.5);">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Edit Address/Lot</h5>
              <button type="button" class="btn-close" @click="editAddressModal = false"></button>
            </div>
            <div class="modal-body">
              <form @submit.prevent="saveAddressEdit">
                <div class="mb-2">
                  <label>Prime Location Name</label>
                  <input v-model="editLotForm.prime_location_name" class="form-control" required />
                </div>
                <div class="mb-2">
                  <label>Price (per hour)</label>
                  <input v-model="editLotForm.price" type="number" min="1" class="form-control" required />
                </div>
                
                
                <div class="mb-2">
                  <label>Address</label>
                  <input v-model="editLotForm.address" class="form-control" required />
                </div>
                <div class="mb-2">
                  <label>Pincode</label>
                  <input v-model="editLotForm.pincode" type="number" class="form-control" required />
                </div>
                <div class="mb-2">
                  <label>Number of Spots</label>
                  <input v-model="editLotForm.number_of_spots" type="number" min="1" class="form-control" required />
                </div>
                <div class="modal-footer px-0">
                  <button class="btn btn-success" type="submit">Save</button>
                  <button class="btn btn-secondary" @click="editAddressModal = false">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      <!-- Delete Address Modal -->
      <div v-if="deleteAddressModal" class="modal fade show d-block" tabindex="-1" style="background:rgba(0,0,0,0.5);">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Delete Address</h5>
              <button type="button" class="btn-close" @click="deleteAddressModal = false"></button>
            </div>
            <div class="modal-body">
              Are you sure you want to delete <b>{{ addressToDelete }}</b> and all its slots and reservations?
            </div>
            <div class="modal-footer">
              <button class="btn btn-danger" @click="confirmDeleteAddress">Delete</button>
              <button class="btn btn-secondary" @click="deleteAddressModal = false">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
`,

  data() {
    return {
      editAddressModal: false,
addressToEdit: null,
editLotForm: {
  prime_location_name: '',
  price: '',
  country: '',
  city: '',
  address: '',
  pincode: '',
  number_of_spots: ''
},
deleteAddressModal: false,
addressToDelete: null,
       showAddressStatsModal: false,
      statsAddress: '',
      addressStatsData: { totalSlots: 0, slotRevenue: {}, slotRanking: [] },
      addressStatsLoading: false,
      slotRevenueChart: null,
      showStatsModal: false,
      statsCountry: '',
      statsData: { totalCities: 0, cityRevenue: {}, cityRanking: [] },
      statsLoading: false,
      cityRevenueChart: null,
      selectedSlot: null,
      loadingSlotDetails: false,
      slotBookingDetails: null,
      slotDetailsError: null,
      showCreateLotModal: false,
      lotError: '',
      lotSuccess: '',
      newLot: {
        prime_location_name: '',
        price: '',
        country: '',
        city: '',
        address: '',
        pincode: '',
        number_of_spots: ''
      },
      countries: [],
      selectedCountry: null,
      cities: [],
      selectedCity: null,
      addresses: [],
      selectedAddress: null,
      slots: [],
      showCityStatsModal: false,
      statsCity: '',
      cityStatsData: { totalAddresses: 0, addressRevenue: {}, addressRanking: [] },
      cityStatsLoading: false,
      addressRevenueChart: null,
    }
  },
  methods: {
async editAddressPrompt(address) {
  const lot = await this.fetchLotByAddress(this.selectedCountry, this.selectedCity, address);
  if (!lot) return;
  this.addressToEdit = address;
  this.editLotForm = { ...lot }; // This must include 'id'
  this.editAddressModal = true;
},
async saveAddressEdit() {
  const res = await fetch('/api/admin/lot', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authentication-Token': localStorage.getItem('auth_token')
    },
    body: JSON.stringify(this.editLotForm) 
  });
  if (res.ok) {
    this.editAddressModal = false;
    await this.fetchAddresses(this.selectedCountry, this.selectedCity);
    await this.fetchSlots(this.selectedCountry, this.selectedCity, this.editLotForm.address);
  }
},
async fetchLotByAddress(country, city, address) {
  const res = await fetch(`/api/admin/lot?country=${encodeURIComponent(country)}&city=${encodeURIComponent(city)}&address=${encodeURIComponent(address)}`, {
    headers: { 'Authentication-Token': localStorage.getItem('auth_token') }
  });
  if (res.ok) return await res.json();
  return null;
},
deleteAddressPrompt(address) {
  this.addressToDelete = address;
  this.deleteAddressModal = true;
},
async confirmDeleteAddress() {
  const res = await fetch('/api/admin/lot', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authentication-Token': localStorage.getItem('auth_token')
    },
    body: JSON.stringify({
      country: this.selectedCountry,
      city: this.selectedCity,
      address: this.addressToDelete
    })
  });
  if (res.ok) {
    this.deleteAddressModal = false;
    await this.fetchAddresses(this.selectedCountry, this.selectedCity);
    this.selectedAddress = null;
    this.slots = [];
  }
},



    async showAddressStats(address) {
    this.statsAddress = address;
    this.showAddressStatsModal = true;
    this.addressStatsLoading = true;
    const res = await fetch(`/api/admin/address-stats?country=${encodeURIComponent(this.selectedCountry)}&city=${encodeURIComponent(this.selectedCity)}&address=${encodeURIComponent(address)}`, {
      headers: { 'Authentication-Token': localStorage.getItem('auth_token') }
    });
    if (res.ok) {
      const data = await res.json();
      this.addressStatsData = data;
    }
    this.addressStatsLoading = false;
  },
  closeAddressStatsModal() {
    this.showAddressStatsModal = false;
    if (this.slotRevenueChart) {
      this.slotRevenueChart.destroy();
      this.slotRevenueChart = null;
    }
  },
  renderSlotRevenueChart() {
    if (this.slotRevenueChart) this.slotRevenueChart.destroy();
    const ctx = document.getElementById('slotRevenueChart');
    if (!ctx) return;
    const labels = this.addressStatsData.slotRanking.map(item => `#${item.slot}`);
    const data = this.addressStatsData.slotRanking.map(item => item.revenue);
    function getColor(i, total) {
      return `hsl(${(i * 360 / total)}, 70%, 50%)`;
    }
    const backgroundColors = labels.map((_, i) => getColor(i, labels.length));
    this.slotRevenueChart = new Chart(ctx.getContext('2d'), {
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
  },
    async showCountryStats(country) {
      this.statsCountry = country;
      this.showStatsModal = true;
      this.statsLoading = true;
      const res = await fetch(`/api/admin/country-stats?country=${encodeURIComponent(country)}`, {
        headers: { 'Authentication-Token': localStorage.getItem('auth_token') }
      });
      if (res.ok) {
        const data = await res.json();
        this.statsData = data;
      }
      this.statsLoading = false;
    },
    closeStatsModal() {
      this.showStatsModal = false;
      if (this.cityRevenueChart) {
        this.cityRevenueChart.destroy();
        this.cityRevenueChart = null;
      }
    },
    async showCityStats(city) {
    this.statsCity = city;
    this.showCityStatsModal = true;
    this.cityStatsLoading = true;
    const res = await fetch(`/api/admin/city-stats?country=${encodeURIComponent(this.selectedCountry)}&city=${encodeURIComponent(city)}`, {
      headers: { 'Authentication-Token': localStorage.getItem('auth_token') }
    });
    if (res.ok) {
      const data = await res.json();
      this.cityStatsData = data;
    }
    this.cityStatsLoading = false;
  },
  closeCityStatsModal() {
    this.showCityStatsModal = false;
    if (this.addressRevenueChart) {
      this.addressRevenueChart.destroy();
      this.addressRevenueChart = null;
    }
  },
    renderAddressRevenueChart() {
    if (this.addressRevenueChart) this.addressRevenueChart.destroy();
      const ctx = document.getElementById('addressRevenueChart');
      console.log('Canvas:', ctx);
      if (!ctx) return;
      const labels = this.cityStatsData.addressRanking.map(item => item.address);
      const data = this.cityStatsData.addressRanking.map(item => item.revenue);
      console.log('Chart labels:', labels, 'Chart data:', data);
    function getColor(i, total) {
      return `hsl(${(i * 360 / total)}, 70%, 50%)`;
    }
    const backgroundColors = labels.map((_, i) => getColor(i, labels.length));
    this.addressRevenueChart = new Chart(ctx.getContext('2d'), {
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
  },
    
renderCityRevenueChart() {
  if (this.cityRevenueChart) this.cityRevenueChart.destroy();
  const ctx = document.getElementById('cityRevenueChart');
  console.log('Canvas:', ctx);
  if (!ctx) return;
  const labels = this.statsData.cityRanking.map(item => item.city);
  const data = this.statsData.cityRanking.map(item => item.revenue);

  function getColor(i, total) {
    return `hsl(${(i * 360 / total)}, 70%, 50%)`;
  }
  const backgroundColors = labels.map((_, i) => getColor(i, labels.length));

  console.log('Chart labels:', labels, 'Chart data:', data, 'Colors:', backgroundColors);

  this.cityRevenueChart = new Chart(ctx.getContext('2d'), {
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
},
    async selectSlot(slot) {
      this.selectedSlot = slot;
      this.slotBookingDetails = null;
      this.slotDetailsError = null;
      await this.fetchSlotBookingDetails(slot.id);
    },
    async fetchSlotBookingDetails(spotId) {
      this.loadingSlotDetails = true;
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(`/api/admin/slot/${spotId}/booking-details`, {
          headers: { 'Authentication-Token': token }
        });
        if (res.ok) {
          this.slotBookingDetails = await res.json();
        } else {
          const error = await res.json();
          this.slotDetailsError = error.message || 'Failed to load booking details';
        }
      } catch (error) {
        this.slotDetailsError = 'Error fetching booking details';
      } finally {
        this.loadingSlotDetails = false;
      }
    },
    async fetchCountries() {
      const res = await fetch('/api/parking-lot/countries');
      if (res.ok) {
        this.countries = await res.json();
      }
    },
    selectCountry(country) {
      this.selectedCountry = country;
      this.selectedCity = null;
      this.selectedAddress = null;
      this.selectedSlot = null;
      this.cities = [];
      this.addresses = [];
      this.slots = [];
      this.fetchCities(country);
    },
    async fetchCities(country) {
      const res = await fetch(`/api/parking-lot/cities?country=${encodeURIComponent(country)}`);
      if (res.ok) {
        this.cities = await res.json();
      }
    },
    selectCity(city) {
      this.selectedCity = city;
      this.selectedAddress = null;
      this.selectedSlot = null;
      this.addresses = [];
      this.slots = [];
      this.fetchAddresses(this.selectedCountry, city);
    },
    async fetchAddresses(country, city) {
      const res = await fetch(`/api/parking-lot/addresses?country=${encodeURIComponent(country)}&city=${encodeURIComponent(city)}`);
      if (res.ok) {
        this.addresses = await res.json();
      }
    },
    selectAddress(address) {
      this.selectedAddress = address;
      this.selectedSlot = null;
      this.slots = [];
      this.fetchSlots(this.selectedCountry, this.selectedCity, address);
    },
    async fetchSlots(country, city, address) {
      const res = await fetch(`/api/parking-lot/slots?country=${encodeURIComponent(country)}&city=${encodeURIComponent(city)}&address=${encodeURIComponent(address)}`);
      if (res.ok) {
        this.slots = await res.json();
      }
    },
    async createLot() {
        this.lotError = '';
        this.lotSuccess = '';
        try {
          const res = await fetch('/api/parking-lot', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authentication-Token': localStorage.getItem('auth_token') // <-- Add this line
            },
            body: JSON.stringify(this.newLot)
          });
          const data = await res.json();
          if (res.status === 201) {
            this.lotSuccess = data.message;
            this.showCreateLotModal = false;     
            const { country, city, address } = this.newLot;
          this.newLot = {
            prime_location_name: '',
            price: '',
            country: '',
            city: '',
            address: '',
            pincode: '',
            number_of_spots: ''
          };
          await this.fetchCountries();
          this.selectedCountry = country;
          await this.fetchCities(country);
          this.selectedCity = city;
          await this.fetchAddresses(country, city);
          this.selectedAddress = address;
          await this.fetchSlots(country, city, address);
        } else {
          this.lotError = data.message || 'Failed to create parking lot';
        }
      } catch (e) {
        this.lotError = 'Server error';
      }
    },
    closeSlotDetails() {
      this.selectedSlot = null;
      this.slotBookingDetails = null;
      this.slotDetailsError = null;
    }
  },
watch: {
  showStatsModal(val) {
    if (val) {
      this.$nextTick(() => {
        this.renderCityRevenueChart();
      });
    }
  },
  showCityStatsModal(val) {
    if (val) {
      this.$nextTick(() => {
        this.renderAddressRevenueChart();
      });
    }
  },
  'statsData.cityRanking': {
    handler(newVal) {
      if (this.showStatsModal && newVal.length) {
        this.$nextTick(() => {
          this.renderCityRevenueChart();
        });
      }
    },
    deep: true
  },
  'cityStatsData.addressRanking': {
    handler(newVal) {
      if (this.showCityStatsModal && newVal.length) {
        this.$nextTick(() => {
          this.renderAddressRevenueChart();
        });
      }
    },
    deep: true
  },
    showAddressStatsModal(val) {
    if (val) {
      this.$nextTick(() => {
        this.renderSlotRevenueChart();
      });
    }
  },
  'addressStatsData.slotRanking': {
    handler(newVal) {
      if (this.showAddressStatsModal && newVal.length) {
        this.$nextTick(() => {
          this.renderSlotRevenueChart();
        });
      }
    },
    deep: true
  },
},
computed: {
  todaysSlotBookings() {
    if (!this.slotBookingDetails) return [];
    const today = new Date();
    return this.slotBookingDetails.filter(booking => {
      const bookingDate = new Date(booking.booking_time);
      return bookingDate.getFullYear() === today.getFullYear() &&
             bookingDate.getMonth() === today.getMonth() &&
             bookingDate.getDate() === today.getDate();
    });
  }
},
  mounted() {
    this.fetchCountries();
  }
});