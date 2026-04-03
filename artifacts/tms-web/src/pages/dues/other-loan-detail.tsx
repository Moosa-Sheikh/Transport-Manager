import { useParams } from "wouter";
import { useGetOtherLoanHistory } from "@workspace/api-client-react";
import DueDetailPage from "./due-detail";

export default function OtherLoanDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const query = useGetOtherLoanHistory(id || 0);

  return (
    <DueDetailPage
      title="Other Loan Detail"
      backHref="/dues/others"
      isLoading={query.isLoading}
      data={query.data}
    />
  );
}
