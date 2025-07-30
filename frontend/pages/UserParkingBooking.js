Vue.component('user-parking-booking', {
  template: `
    <div class="user-parking-booking">
      <user-navbar></user-navbar>
      <div class="container mt-5">
        <h2 class="mb-4 text-center">User Parking Booking</h2>
        <div v-if="countries.length === 0">
          <div class="alert alert-info">No countries found or loading...</div>
        </div>
        <!-- Wide cards and horizontal selection -->
        <div class="d-flex flex-wrap justify-content-center gap-4">
          <!-- Countries -->
          <div class="card card-wide" v-if="countries.length > 0">
            <div class="card-body">
              <h5 class="card-title text-center">Countries</h5>
              <ul class="horizontal-list-group">
                <li v-for="country in countries" :key="country"
                    class="list-group-item"
                    :class="{active: selectedCountry === country}"
                    @click="selectCountry(country)">
                  {{ country }}
                </li>
              </ul>
            </div>
          </div>
          <!-- Cities -->
          <div class="card card-wide" v-if="selectedCountry && cities.length > 0">
            <div class="card-body">
              <h5 class="card-title text-center">Cities</h5>
              <ul class="horizontal-list-group">
                <li v-for="city in cities" :key="city"
                    class="list-group-item"
                    :class="{active: selectedCity === city}"
                    @click="selectCity(city)">
                  {{ city }}
                </li>
              </ul>
            </div>
          </div>
          <!-- Addresses -->
          <div class="card card-wide" v-if="selectedCity && addresses.length > 0">
            <div class="card-body">
              <h5 class="card-title text-center">Addresses</h5>
              <ul class="horizontal-list-group">
                <li v-for="address in addresses" :key="address"
                    class="list-group-item"
                    :class="{active: selectedAddress === address}"
                    @click="selectAddress(address)">
                  {{ address }}
                </li>
              </ul>
            </div>
          </div>
          <!-- Slots -->
          <div class="card card-wide" v-if="selectedAddress && slots.length > 0">
            <div class="card-body">
              <h5 class="card-title text-center">Slots</h5>
              <div class="d-flex flex-wrap justify-content-center gap-2">
                <div v-for="slot in slots" :key="slot.id"
                  class="rounded-circle d-flex align-items-center justify-content-center position-relative"
                  :style="{
                    width: '50px',
                    height: '50px',
                    background: isSlotOccupiedNow(slot.id) ? '#dc3545' : '#198754',
                    color: 'white',
                    border: '2px solid #ccc',
                    cursor: 'pointer'
                  }"
                  @click="openBooking(slot)">
                  {{ slot.number }}
                  <!-- Tooltip logic unchanged -->

                  <!-- Tooltip that appears on hover -->
                  <div v-if="hoveredSlot === slot.id" class="position-absolute"
                    :style="{
                      bottom: '60px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      padding: '5px 10px',
                      borderRadius: '4px',
                      background: slotAvailable ? '#198754' : '#dc3545',
                      color: 'white',
                      whiteSpace: 'nowrap',
                      zIndex: 1000
                    }">
                    {{ slotAvailable ? 'Available' : 'Unavailable' }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- Booking Modal (unchanged) -->
        <div v-if="showBookingModal" class="modal fade show d-block" tabindex="-1" style="background:rgba(0,0,0,0.5);">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Book Slot #{{ bookingSlot.number }}</h5>
                <button type="button" class="btn-close" @click="closeBooking"></button>
              </div>
              <div class="modal-body">
                <form @submit.prevent="bookSlot">
                  <div v-if="bookingError" class="alert alert-danger">{{ bookingError }}</div>
                  <div v-if="bookingSuccess" class="alert alert-success">{{ bookingSuccess }}</div>
                  <div class="mb-2">
                    <label>Booking Start Time</label>
                    <input v-model="bookingForm.booking_time" type="datetime-local" class="form-control" required />
                  </div>
                  <div class="mb-2">
                    <label>Duration (hours)</label>
                    <input v-model.number="bookingForm.duration_hours" type="number" min="1" class="form-control" required />
                  </div>
                  <div class="mb-2">
                    <label>Vehicle Number</label>
                    <input v-model="bookingForm.vehicle_no" class="form-control" required />
                  </div>
                  <div class="mb-2">
                    <label>Vehicle Type</label>
                    <input v-model="bookingForm.vehicle_type" class="form-control" required />
                  </div>
                  <div class="modal-footer px-0">
                    <button class="btn btn-secondary" @click.prevent="closeBooking">Cancel</button>
                    <button type="submit" class="btn btn-primary">Book</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,


  data() {
    return {
      hoveredSlot: null,
      slotAvailable: true,
      reservations: [],
      currentTime: new Date(),
      countries: [],
      selectedCountry: null,
      cities: [],
      selectedCity: null,
      addresses: [],
      selectedAddress: null,
      slots: [],
      selectedSlot: null,
      showBookingModal: false,
      bookingSlot: {},
      bookingForm: {
        booking_time: '',
        duration_hours: 1,
        vehicle_no: '',
        vehicle_type: ''
      },
      bookingError: '',
      bookingSuccess: '',
      debug: {
        lastCheck: null,
        occupiedSlots: []
      }
    }
  },
  methods: {
    async fetchCountries() {
      const res = await fetch('/api/parking-lot/countries');
      if (res.ok) {
        this.countries = await res.json();
      }
    },
    async fetchCities(country) {
      const res = await fetch(`/api/parking-lot/cities?country=${encodeURIComponent(country)}`);
      if (res.ok) {
        this.cities = await res.json();
      }
    },
    async fetchAddresses(country, city) {
      const res = await fetch(`/api/parking-lot/addresses?country=${encodeURIComponent(country)}&city=${encodeURIComponent(city)}`);
      if (res.ok) {
        this.addresses = await res.json();
      }
    },
    async fetchReservations(country, city, address) {
      const res = await fetch(
        `/api/parking/all-reservations?country=${encodeURIComponent(country)}&city=${encodeURIComponent(city)}&address=${encodeURIComponent(address)}`
      );
      if (res.ok) {
        this.reservations = await res.json();
        console.log('Fetched ALL reservations:', this.reservations);
        // Debug logging
        if (this.reservations.length > 0) {
          this.reservations.forEach(res => {
            const start = new Date(res.booking_time);
            const end = new Date(res.release_time);
            const now = new Date();
            console.log(`Slot ${res.spot_id}: ${start.toISOString()} to ${end.toISOString()}`);
            console.log(`Is current time in range? ${start <= now && end >= now}`);
          });
        } else {
          console.log('No active reservations found for this location');
        }
      } else {
        this.reservations = [];
        console.error('Failed to fetch reservations:', res.status, res.statusText);
      }
    },
    isSlotOccupiedNow(slotId) {
      const slot = this.slots.find(s => s.id === slotId);
      if (slot && slot.status === 'occupied') {
        return true;
      }
      const nowUTC = new Date(new Date().toISOString());
      const occupiedSlots = [];
      const result = this.reservations.some(res => {
        const bookingStart = new Date(res.booking_time);
        const bookingEnd = new Date(res.release_time);
        if (res.spot_id === slotId) {
          console.log(`Comparing times for slot ${slotId}:`);
          console.log(`Current time (UTC): ${nowUTC.toISOString()}`);
          console.log(`Booking: ${bookingStart.toISOString()} to ${bookingEnd.toISOString()}`);
          console.log(`Is in range? ${bookingStart <= nowUTC && bookingEnd >= nowUTC}`);
        }
        const isOccupied = res.spot_id === slotId &&
          bookingStart <= nowUTC &&
          bookingEnd >= nowUTC;
        if (isOccupied) {
          occupiedSlots.push({
            slotId,
            currentTime: nowUTC.toISOString(),
            booking: {
              start: bookingStart.toISOString(),
              end: bookingEnd.toISOString()
            }
          });
        }
        return isOccupied;
      });
      this.debug = {
        lastCheck: nowUTC.toISOString(),
        occupiedSlots
      };
      if (occupiedSlots.length > 0) {
        console.log('Found occupied slots:', occupiedSlots);
      }
      return result;
    },
    async checkSlotAvailability(slotId) {
      this.hoveredSlot = slotId;
      this.slotAvailable = !this.isSlotOccupiedNow(slotId);
    },
    hideTooltip() {
      this.hoveredSlot = null;
    },
    async checkAndOpenBooking(slot) {
      await this.checkSlotAvailability(slot.id);
      if (this.slotAvailable) {
        this.openBooking(slot);
      }
    },
    openBooking(slot) {
      this.bookingSlot = slot;
      this.showBookingModal = true;
      const now = new Date();
      now.setMinutes(now.getMinutes() + 10);
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      this.bookingForm = {
        booking_time: `${year}-${month}-${day}T${hours}:${minutes}`,
        duration_hours: 1,
        vehicle_no: '',
        vehicle_type: ''
      };
    },
    async fetchSlots(country, city, address, booking_time = null, duration_hours = null) {
      let url = `/api/parking-lot/slots?country=${encodeURIComponent(country)}&city=${encodeURIComponent(city)}&address=${encodeURIComponent(address)}`;
      if (booking_time && duration_hours) {
        url += `&booking_time=${encodeURIComponent(booking_time)}&duration_hours=${encodeURIComponent(duration_hours)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        this.slots = await res.json();
        console.log('Fetched slots:', this.slots);
        await this.fetchReservations(country, city, address);
      }
    },
    selectCountry(country) {
      this.selectedCountry = country;
      this.selectedCity = null;
      this.selectedAddress = null;
      this.cities = [];
      this.addresses = [];
      this.slots = [];
      this.fetchCities(country);
    },
    selectCity(city) {
      this.selectedCity = city;
      this.selectedAddress = null;
      this.addresses = [];
      this.slots = [];
      this.fetchAddresses(this.selectedCountry, city);
    },
    selectAddress(address) {
      this.selectedAddress = address;
      this.slots = [];
      this.fetchSlots(this.selectedCountry, this.selectedCity, address);
      this.fetchReservations(this.selectedCountry, this.selectedCity, address);
    },
    closeBooking() {
      this.showBookingModal = false;
      this.bookingSlot = {};
      this.bookingForm = {
        booking_time: '',
        duration_hours: 1,
        vehicle_no: '',
        vehicle_type: ''
      };
      this.bookingError = '';
      this.bookingSuccess = '';
    },
    async bookSlot() {
  this.bookingError = '';
  this.bookingSuccess = '';
  try {
    const slotId = this.bookingSlot.id;
    const bookingStart = new Date(this.bookingForm.booking_time);
    const duration = Number(this.bookingForm.duration_hours);
    const bookingEnd = new Date(bookingStart.getTime() + duration * 60 * 60 * 1000);

    const overlapping = this.reservations.some(res => {
      if (res.spot_id !== slotId) return false;
      const resStart = new Date(res.booking_time);
      const resEnd = new Date(res.release_time);
      return bookingStart < resEnd && bookingEnd > resStart;
    });

    if (overlapping) {
      this.bookingError = 'Slot unavailable for selected time. Please choose a different time.';
      return;
    }

    const token = localStorage.getItem('auth_token');
    const bookingTimeUTC = bookingStart.toISOString();
    const res = await fetch('/api/parking/book', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authentication-Token': token
      },
      body: JSON.stringify({
        lot_id: this.bookingSlot.lot_id,
        spot_id: slotId,
        country: this.selectedCountry,
        city: this.selectedCity,
        address: this.selectedAddress,
        booking_time: bookingTimeUTC,
        duration_hours: this.bookingForm.duration_hours,
        vehicle_no: this.bookingForm.vehicle_no,
        vehicle_type: this.bookingForm.vehicle_type
      })
    });
    const contentType = res.headers.get('content-type');
    let data = {};
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      this.bookingError = 'Unexpected server response: ' + text.slice(0, 100);
      return;
    }
    if (res.status === 201) {
      this.bookingSuccess = data.message || 'Slot booked successfully!';
      await this.fetchSlots(this.selectedCountry, this.selectedCity, this.selectedAddress);
      await this.fetchReservations(this.selectedCountry, this.selectedCity, this.selectedAddress);
    } else {
      this.bookingError = (data && data.message) || 'Failed to book slot';
    }
  } catch (e) {
    this.bookingError = 'Server error: ' + (e.message || e);
    console.error(e);
  }}
  },
  mounted() {
    this.fetchCountries();
    this.reservationInterval = setInterval(() => {
    if (this.selectedCountry && this.selectedCity && this.selectedAddress) {
      this.fetchSlots(this.selectedCountry, this.selectedCity, this.selectedAddress);
    }
  }, 60000); 

  this.slotStatusInterval = setInterval(() => {
    this.currentTime = new Date();
  }, 1000); 

  this.debugInterval = setInterval(() => {
    if (this.debug.occupiedSlots.length > 0) {
      console.log('Current occupied slots:', this.debug.occupiedSlots);
    }
  }, 10000);
},
beforeDestroy() {
  clearInterval(this.reservationInterval);
  clearInterval(this.slotStatusInterval);
  clearInterval(this.debugInterval);
}
});