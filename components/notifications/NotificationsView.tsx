"use client";

import { useState } from "react";
import { listNotifications } from "@/lib/api/notifications";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { PageHeader } from "@/components/ui/PageHeader";
import { NotificationForm } from "./NotificationForm";
import { NotificationHistory } from "./NotificationHistory";

const PAGE_SIZE = 10;

export function NotificationsView() {
  const [page, setPage] = useState(1);
  const history = useApiQuery((signal) => listNotifications({ page, page_size: PAGE_SIZE }, signal), [page]);

  return (
    <>
      <PageHeader title="Notifications" description="Send push notifications to Scritto installations and review past sends." />
      <div className="grid items-start gap-6 xl:grid-cols-5">
        <div className="xl:col-span-2">
          <NotificationForm
            onSent={() => {
              if (page === 1) history.refetch();
              else setPage(1);
            }}
          />
        </div>
        <div className="xl:col-span-3">
          <NotificationHistory query={history} onPageChange={setPage} />
        </div>
      </div>
    </>
  );
}
