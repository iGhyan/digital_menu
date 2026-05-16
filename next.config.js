/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow loading GLB from S3 presigned URLs and CloudFront
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Required for WebXR in iframes / cross-origin
          { key: 'Cross-Origin-Opener-Policy',   value: 'same-origin-allow-popups' },
          { key: 'Cross-Origin-Embedder-Policy',  value: 'credentialless' },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.s3.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '*.cloudfront.net',
      },
    ],
  },
  // Transpile three.js (ESM)
  transpilePackages: ['three'],
};

module.exports = nextConfig;
