import { Loader2, ArrowLeft, Clock, Banknote, FileText } from "lucide-react";
import { Link } from "wouter";

function formatPKR(val: number) {
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
}

const statusColors: Record<string, string> = {
  Outstanding: "bg-red-100 text-red-800",
  Partial: "bg-blue-100 text-blue-800",
  Cleared: "bg-green-100 text-green-800",
  Pending: "bg-yellow-100 text-yellow-800",
};

interface Repayment {
  id: number;
  amount: string;
  paymentDate: string;
  notes?: string | null;
  createdAt?: string;
}

interface DueDetail {
  id: number;
  label: string;
  personId?: number;
  amount: string;
  amountReturned: string;
  balance: number;
  date: string;
  status: string;
  notes?: string | null;
  repayments: Repayment[];
}

interface DueDetailPageProps {
  title: string;
  backHref: string;
  isLoading: boolean;
  data?: DueDetail;
  reportLink?: { href: string; label: string; personIdParam?: string };
}

export default function DueDetailPage({ title, backHref, isLoading, data, reportLink }: DueDetailPageProps) {
  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
        Loading...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-gray-500">
        Record not found.
        <Link href={backHref} className="text-blue-600 hover:underline ml-2">Go back</Link>
      </div>
    );
  }

  const totalAmount = Number(data.amount);
  let runningBalance = totalAmount;
  const timelineEntries = data.repayments.map((r) => {
    runningBalance -= Number(r.amount);
    return { ...r, runningBalance };
  });

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={backHref} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{data.label}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium">Amount</p>
            <p className="text-lg font-bold text-gray-900">{formatPKR(totalAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium">Returned</p>
            <p className="text-lg font-bold text-green-700">{formatPKR(Number(data.amountReturned))}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium">Balance</p>
            <p className="text-lg font-bold text-red-700">{formatPKR(data.balance)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium">Status</p>
            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium mt-1 ${statusColors[data.status] ?? "bg-gray-100 text-gray-800"}`}>
              {data.status}
            </span>
          </div>
        </div>
        <div className="mt-4 flex gap-6 text-sm text-gray-600">
          <span>Date: <span className="font-medium text-gray-900">{data.date}</span></span>
          {data.notes && <span>Notes: <span className="font-medium text-gray-900">{data.notes}</span></span>}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-500" />
            Transaction Timeline
          </h3>
        </div>

        <div className="divide-y divide-gray-100">
          <div className="px-6 py-4 flex items-center justify-between bg-blue-50/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{data.date} — Original Amount</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-blue-700">{formatPKR(totalAmount)}</p>
              <p className="text-xs text-gray-500">Balance: {formatPKR(totalAmount)}</p>
            </div>
          </div>

          {timelineEntries.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No repayments recorded yet.</div>
          ) : (
            timelineEntries.map((r) => (
              <div key={r.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                    <Banknote className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{r.paymentDate} — Repayment</p>
                    {r.notes && <p className="text-xs text-gray-500 mt-0.5">{r.notes}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-700">-{formatPKR(Number(r.amount))}</p>
                  <p className="text-xs text-gray-500">Balance: {formatPKR(r.runningBalance)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {reportLink && (
        <div className="mt-6 text-center">
          <Link
            href={data.personId && reportLink.personIdParam
              ? `${reportLink.href}?${reportLink.personIdParam}=${data.personId}`
              : reportLink.href}
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            <FileText className="w-4 h-4" />
            {reportLink.label}
          </Link>
        </div>
      )}
    </div>
  );
}
