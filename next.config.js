const withPWA = require('next-pwa')({
    dest: 'public',
    disable: process.env.NODE_ENV === 'development', // prevent warning in dev
  });

  /** @type {import('next').NextConfig} */
  const nextConfig = {
    reactStrictMode: true,
    images: {
      domains: ['openweathermap.org'],
    },

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
  };

  module.exports = withPWA(nextConfig);
