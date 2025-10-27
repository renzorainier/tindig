const withPWA = require('next-pwa')({
  dest: 'public',
  //
  // THIS IS THE FIX:
  // It disables PWA unless you are in a "production" environment.
  //
  disable: process.env.NODE_ENV !== 'production',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['openweathermap.org'],
  },

  // Your webpack config for sounds is still here, but
  // I have commented it out. It was causing crashes before.
  // Let's keep it off until the app loads.
  /*
  webpack: (config, { isServer }) => {
    config.module.rules.push({
      test: /\.(wav|mp3|ogg|mp4)$/,
      use: [
        {
          loader: 'file-loader',
          options: {
            publicPath: '/_next/static/sounds/',
            outputPath: 'static/sounds/',
            name: '[name].[ext]',
            esModule: false,
          },
        },
      ],
    });

    return config;
  },
  */
};

module.exports = withPWA(nextConfig);
