const routes = [
    { path: '/', component: Vue.component('home-page') },
    { path: '/register', component: Vue.component('register-page') },
    { path: '/login', component: Vue.component('login-page') },
    { path: '/admin-dashboard', component: Vue.component('admin-dashboard') },
    { path: '/admin-parking-management', component: Vue.component('admin-parking-management') },
    { path: '/admin-customers-data', component: Vue.component('admin-customers-data') },
    { path: '/admin-parking-history', component: Vue.component('admin-parking-history') },
    { path: '/admin-transaction-history', component: Vue.component('admin-transaction-history') },

    { path: '/access-denied', component: Vue.component('access-denied') },

    // User side routes
    { path: '/user-dashboard', component: Vue.component('user-dashboard') },
    { path: '/user-parking-history', component: Vue.component('user-parking-history') },
    { path: '/user-parking-booking', component: Vue.component('user-parking-booking') },
    { path: '/user-transaction-history', component: Vue.component('user-transaction-history') }
];
window.router = new VueRouter({
  mode: 'history',
  routes
});
window.router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('auth_token');
  const role = localStorage.getItem('user_role');

  // Protect admin routes
  if (to.path.startsWith('/admin')) {
    if (!token || role !== 'admin') {
      return next('/access-denied');
    }
  }
  // Protect user routes
  if (to.path.startsWith('/user')) {
    if (!token || role !== 'user') {
      return next('/access-denied');
    }
  }
  next();
});