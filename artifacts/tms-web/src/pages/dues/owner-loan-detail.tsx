import { useParams } from "wouter";
import { useGetOwnerLoanHistory } from "@workspace/api-client-react";
import DueDetailPage from "./due-detail";

export default function OwnerLoanDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const query = useGetOwnerLoanHistory(id || 0);

  return (
    <DueDetailPage
      title="Owner Loan Detail"
      backHref="/dues/owner"
      isLoading={query.isLoading}
      data={query.data}
    />
  );
}
