import type { NextConfig } from "next";
import { withWhopAppConfig } from "@whop/react/next.config";

const nextConfig: NextConfig = {
  serverExternalPackages: ["ws"],
};

export default withWhopAppConfig(nextConfig);
