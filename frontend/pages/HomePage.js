Vue.component('home-page', {
  template: `
    <div class="home-bg">
      <div class="container py-5">
        <div class="row justify-content-center mb-5">
          <div class="col-md-8 text-center">
            <h1 class="home-title mb-3">Welcome to Vehicle Parking App</h1>
          </div>
        </div>
        <div class="row justify-content-center mb-5">
          <div class="col-md-4 mb-3">
            <div class="card home-card text-center shadow-sm">
              <div class="card-body d-flex flex-column align-items-center justify-content-center">
                <i class="bi bi-person-circle home-card-icon mb-3"></i>
                <h4 class="mb-2">Login</h4>
                <p class="mb-3">Already have an account? Sign in to manage your parking and bookings.</p>
                <router-link class="btn btn-primary w-75" to="/login">Login</router-link>
              </div>
            </div>
          </div>
          <div class="col-md-4 mb-3">
            <div class="card home-card text-center shadow-sm">
              <div class="card-body d-flex flex-column align-items-center justify-content-center">
                <i class="bi bi-person-circle home-card-icon mb-3"></i>
                <h4 class="mb-2">Register</h4>
                <p class="mb-3">New here? Create your account and start booking your parking slots.</p>
                <router-link class="btn btn-primary w-75" to="/register">Register</router-link>
              </div>
            </div>
          </div>
          
        
      </div>
    </div>
  `
});