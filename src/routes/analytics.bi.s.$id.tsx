import { createFileRoute, notFound } from "@tanstack/react-router";
import BiSharedPage from "@/pages/analytics/BiSharedPage";
import { SHARE_URL } from "@/components/bi/shareApi";

export const Route = createFileRoute("/analytics/bi/s/$id")({
  loader: async ({ params }) => {
    if (!/^[A-Za-z0-9_-]{8,16}$/.test(params.id)) throw notFound();
    let status = 0;
    try {
      const res = await fetch(`${SHARE_URL}/?action=exists&id=${params.id}`);
      status = res.status;
    } catch {
      status = 0;
    }
    if (status === 404 || status === 410) throw notFound();
  },
  component: BiSharedPage,
});
