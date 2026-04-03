import { useParams } from "wouter";
import { useGetDriverLoanHistory } from "@workspace/api-client-react";
import DueDetailPage from "./due-detail";

export default function DriverLoanDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const query = useGetDriverLoanHistory(id, { query: { enabled: id > 0 } });

  return (
    <DueDetailPage
      title="Driver Loan Detail"
      backHref="/dues/drivers"
      isLoading={query.isLoading}
      data={query.data}
    />
  );
}
