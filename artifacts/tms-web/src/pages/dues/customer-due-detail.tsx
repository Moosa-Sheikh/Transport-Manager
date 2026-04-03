import { useParams } from "wouter";
import { useGetCustomerDueHistory } from "@workspace/api-client-react";
import DueDetailPage from "./due-detail";

export default function CustomerDueDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const query = useGetCustomerDueHistory(id, { query: { enabled: id > 0 } });

  return (
    <DueDetailPage
      title="Customer Due Detail"
      backHref="/dues/customers"
      isLoading={query.isLoading}
      data={query.data}
      reportLink={{ href: "/reports/customers", label: "View Full Customer Report", personIdParam: "customer_id" }}
    />
  );
}
