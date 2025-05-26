/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
    // `remotePatterns` allows you to define external image domains that are allowed to be optimized
    // Each entry is an object with details about how the image should be matched
      remotePatterns: [
        {
          protocol: "https",            // Allow images served over HTTPS
          hostname: "randomuser.me",    // Allow images from this specific domain
        },
      ],
    },
  
    // `experimental` allows you to enable and configure experimental features in Next.js
    experimental: {
      serverActions: {
        // This option sets the maximum size for request bodies sent to server actions
      // It's useful when you're sending forms or uploading files
        bodySizeLimit: "5mb",       // Set body size limit to 5 megabytes
      },
    },
  };
  
  export default nextConfig;

//   images.remotePatterns: Enables remote images from
//   https://randomuser.me so that the next/image component can optimize and serve them safely.

// experimental.serverActions.bodySizeLimit: Sets the maximum size of incoming request bodies for
// server actions to 5 MB, useful for forms or file uploads.