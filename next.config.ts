module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "market-knayf-app-bucket.s3.us-east-1.amazonaws.com",
        pathname: "**",
      },
    ],
  },
  async headers() {
    return [
      {
        // Apple requires the association file to be served as JSON, and it
        // deliberately has no file extension — so nothing infers the type for
        // it and a static handler would fall back to octet-stream, which iOS
        // rejects without explanation. assetlinks.json needs no such help; its
        // extension already says what it is.
        source: "/.well-known/apple-app-site-association",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
    ];
  },
};
