import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/masshtab/dzen-rss")({
  server: {
    handlers: {
      GET: async () => {
        const { dzenFeedResponse } = await import("@/lib/dzen.server");
        return dzenFeedResponse("https://mat-labs.ru/masshtab/dzen-rss");
      },
    },
  },
});
