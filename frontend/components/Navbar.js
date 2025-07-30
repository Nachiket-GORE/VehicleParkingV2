Vue.component('admin-navbar', {
  template: `
    <nav class="navbar navbar-expand-lg admin-navbar">
      <div class="container-fluid">
        <a class="navbar-brand" href="#">Admin Panel</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#adminNavbar" aria-controls="adminNavbar" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="adminNavbar">
          <ul class="navbar-nav mx-auto mb-2 mb-lg-0">
            <li class="nav-item">
              <router-link class="nav-link" to="/admin-dashboard" active-class="active">Stats</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/admin-parking-management" active-class="active">Parking Management</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/admin-customers-data" active-class="active">Customers</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/admin-parking-history" active-class="active">Parking History</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/admin-transaction-history" active-class="active">Transaction History</router-link>
            </li>
          </ul>
          <span class="me-3" style="cursor:pointer;" @click="showProfileModal = true">
            <i class="bi bi-person-circle" style="font-size: 2rem;"></i>
          </span>
          <button class="btn btn-outline-light" @click="logout">Logout</button>
        </div>
      </div>
      <!-- Profile Modal -->
      <div v-if="showProfileModal" class="modal fade show d-block" tabindex="-1" style="background:rgba(0,0,0,0.5);">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">My Profile</h5>
              <button type="button" class="btn-close" @click="closeProfile"></button>
            </div>
            <div class="modal-body" v-if="!editMode">
              <div v-if="profile.user_profile">
                <img :src="profile.user_profile" alt="User Photo" class="img-thumbnail mb-2" style="max-width:120px;">
              </div>
              <p><b>Name:</b> {{ profile.full_name }}</p>
              <p><b>Email:</b> {{ profile.email }}</p>
              <p><b>Country:</b> {{ profile.country }}</p>
              <p><b>City:</b> {{ profile.city }}</p>
              <p><b>Address:</b> {{ profile.address }}</p>
              <p><b>Pincode:</b> {{ profile.pincode }}</p>
              <p><b>Account Created:</b> {{ new Date(profile.date_of_Account_creation).toLocaleDateString() }}</p>
              <button class="btn btn-primary me-2" @click="editMode = true">Edit</button>
            </div>
            <!-- Edit Profile Form -->
            <div class="modal-body" v-if="editMode">
              <form @submit.prevent="saveProfile">
                <div class="mb-2">
                  <label>Name</label>
                  <input v-model="editProfile.full_name" class="form-control" required>
                </div>
                <div class="mb-2">
                  <label>Country</label>
                  <input v-model="editProfile.country" class="form-control">
                </div>
                <div class="mb-2">
                  <label>City</label>
                  <input v-model="editProfile.city" class="form-control">
                </div>
                <div class="mb-2">
                  <label>Address</label>
                  <input v-model="editProfile.address" class="form-control">
                </div>
                <div class="mb-2">
                  <label>Pincode</label>
                  <input v-model="editProfile.pincode" class="form-control">
                </div>
                <div class="mb-2">
                  <label>Profile Photo</label>
                  <input type="file" class="form-control" @change="onFileChange">
                </div>
                <button class="btn btn-success me-2" type="submit">Save</button>
                <button class="btn btn-secondary" @click="editMode = false">Cancel</button>
              </form>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" @click="closeProfile">Close</button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  `,

  data() {
    return {
      showProfileModal: false,
      editMode: false,
      profile: {},
      editProfile: {}
    }
  },
  methods: {
     onFileChange(e) {
    const file = e.target.files[0];
    if (!file) {
      this.editProfile.user_profile = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      this.editProfile.user_profile = event.target.result; // base64 string
    };
    reader.readAsDataURL(file);
  },
    logout() {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_role');
      this.$router.push('/');
    },
    closeProfile() {
      this.showProfileModal = false;
      this.editMode = false;
    },
    async fetchProfile() {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/user/profile/me', {
        headers: { 'Authentication-Token': token }
      });
      if (res.ok) {
        this.profile = await res.json();
        this.editProfile = Object.assign({}, this.profile);
      }
    },
    async saveProfile() {
    const token = localStorage.getItem('auth_token');
    const res = await fetch('/api/user/profile/me', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authentication-Token': token
      },
      body: JSON.stringify(this.editProfile)
    });
    if (res.ok) {
      this.editMode = false;
      await this.fetchProfile();
    }
  }
  },
  watch: {
    showProfileModal(val) {
      if (val) this.fetchProfile();
    }
  }
});
Vue.component('user-navbar', {
  template: `
    <nav class="navbar navbar-expand-lg user-navbar">
      <div class="container-fluid">
        <a class="navbar-brand" href="#">User Panel</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#userNavbar" aria-controls="userNavbar" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="userNavbar">
          <ul class="navbar-nav mx-auto mb-2 mb-lg-0">
            <li class="nav-item">
              <router-link class="nav-link" to="/user-dashboard" active-class="active">Stats</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/user-parking-booking" active-class="active">Book Parking</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/user-parking-history" active-class="active">Parking History</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/user-transaction-history" active-class="active">Transaction History</router-link>
            </li>
          </ul>
          <span class="me-3" style="cursor:pointer;" @click="showProfileModal = true">
            <i class="bi bi-person-circle" style="font-size: 2rem;"></i>
          </span>
          <button class="btn btn-outline-light" @click="logout">Logout</button>
        </div>
      </div>
      <!-- Profile Modal -->
      <div v-if="showProfileModal" class="modal fade show d-block" tabindex="-1" style="background:rgba(0,0,0,0.5);">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">My Profile</h5>
              <button type="button" class="btn-close" @click="closeProfile"></button>
            </div>
            <div class="modal-body" v-if="!editMode">
              <div v-if="profile.user_profile">
                <img :src="profile.user_profile" alt="User Photo" class="img-thumbnail mb-2" style="max-width:120px;">
              </div>
              <p><b>Name:</b> {{ profile.full_name }}</p>
              <p><b>Email:</b> {{ profile.email }}</p>
              <p><b>Country:</b> {{ profile.country }}</p>
              <p><b>City:</b> {{ profile.city }}</p>
              <p><b>Address:</b> {{ profile.address }}</p>
              <p><b>Pincode:</b> {{ profile.pincode }}</p>
              <p><b>Account Created:</b> {{ new Date(profile.date_of_Account_creation).toLocaleDateString() }}</p>
              <button class="btn btn-primary me-2" @click="editMode = true">Edit</button>
            </div>
            <!-- Edit Profile Form -->
            <div class="modal-body" v-if="editMode">
              <form @submit.prevent="saveProfile">
                <div class="mb-2">
                  <label>Name</label>
                  <input v-model="editProfile.full_name" class="form-control" required>
                </div>
                <div class="mb-2">
                  <label>Country</label>
                  <input v-model="editProfile.country" class="form-control">
                </div>
                <div class="mb-2">
                  <label>City</label>
                  <input v-model="editProfile.city" class="form-control">
                </div>
                <div class="mb-2">
                  <label>Address</label>
                  <input v-model="editProfile.address" class="form-control">
                </div>
                <div class="mb-2">
                  <label>Pincode</label>
                  <input v-model="editProfile.pincode" class="form-control">
                </div>
                <div class="mb-2">
                  <label>Profile Photo</label>
                  <input type="file" class="form-control" @change="onFileChange">
                </div>
                <button class="btn btn-success me-2" type="submit">Save</button>
                <button class="btn btn-secondary" @click="editMode = false">Cancel</button>
              </form>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" @click="closeProfile">Close</button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  `,
 
  data() {
    return {
      showProfileModal: false,
      editMode: false,
      profile: {},
      editProfile: {}
    }
  },
  methods: {
    onFileChange(e) {
    const file = e.target.files[0];
    if (!file) {
      this.editProfile.user_profile = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      this.editProfile.user_profile = event.target.result;
    };
    reader.readAsDataURL(file);
  },
    logout() {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_role');
      this.$router.push('/');
    },
    closeProfile() {
      this.showProfileModal = false;
      this.editMode = false;
    },
    async fetchProfile() {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/user/profile/me', {
        headers: { 'Authentication-Token': token }
      });
      if (res.ok) {
        this.profile = await res.json();
        this.editProfile = Object.assign({}, this.profile);
      }
    },
    async saveProfile() {
    const token = localStorage.getItem('auth_token');
    const res = await fetch('/api/user/profile/me', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authentication-Token': token
      },
      body: JSON.stringify(this.editProfile)
    });
    if (res.ok) {
      this.editMode = false;
      await this.fetchProfile();
    }
  }
},
  watch: {
    showProfileModal(val) {
      if (val) this.fetchProfile();
    }
  }
});