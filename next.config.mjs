/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: '**', // allows any hostname
        },
      ],
    },
  };
  
  export default nextConfig;
  