const withPWA = require('next-pwa')({
  disable: process.env.NODE_ENV !== 'production',
  // dest: 'public',
  // //
  // THIS IS THE FIX:
  // It disables PWA unless you are in a "production" environment.
  //

});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,



};

module.exports = withPWA(nextConfig);
