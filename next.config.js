/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        remotePatterns: [
            // 1. Autorización para Cloud (Producción)
            {
                protocol: 'https',
                hostname: 'jhduncasbfiikrtxirun.supabase.co',
                pathname: '/storage/v1/object/public/**',
            },
            // 2. Autorización para Local (Desarrollo)
            {
                protocol: 'http',
                hostname: '192.168.0.20',
                port: '54321',
                pathname: '/storage/v1/object/public/**',
            },
        ],
    },
};

module.exports = nextConfig;
