import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListDrivers,
  useCreateDriver,
  useUpdateDriver,
  useDeleteDriver,
  getListDriversQueryKey,
} from "@workspace/api-client-react";
import MasterPage from "@/components/master-page";

interface DriverFormProps {
  editingItem: { id: number; name: string; phone?: string | null; salary?: string | null } | null;
  onClose: () => void;
  onSubmitted: () => void;
}

function DriverForm({ editingItem, onClose, onSubmitted }: DriverFormProps) {
  const [name, setName] = useState(editingItem?.name ?? "");
  const [phone, setPhone] = useState(editingItem?.phone ?? "");
  const [salary, setSalary] = useState(editingItem?.salary ?? "0");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const create = useCreateDriver({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDriversQueryKey() });
        onSubmitted();
      },
    },
  });

  const update = useUpdateDriver({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDriversQueryKey() });
        onSubmitted();
      },
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setError("");
    const data = {
      name: name.trim(),
      phone: phone.trim() || null,
      salary: salary || "0",
    };
    try {
      if (editingItem) {
        await update.mutateAsync({ id: editingItem.id, data });
      } else {
        await create.mutateAsync({ data });
      }
    } catch {
      setError("Failed to save driver");
    }
  };

  const isPending = create.isPending || update.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Salary</label>
          <input
            type="number"
            step="0.01"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
        >
          {isPending ? "Saving..." : editingItem ? "Update" : "Add"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function DriversPage() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const { data, isLoading } = useListDrivers({ search: search || undefined });
  const deleteMutation = useDeleteDriver({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDriversQueryKey() });
      },
    },
  });

  const formatAmount = (val: string | null | undefined) => {
    const n = Number(val ?? 0);
    return n.toLocaleString("en-PK", { minimumFractionDigits: 0 });
  };

  return (
    <MasterPage
      title="Drivers"
      data={data}
      isLoading={isLoading}
      searchValue={search}
      onSearchChange={setSearch}
      columns={[
        { key: "name", label: "Name" },
        { key: "phone", label: "Phone" },
        { key: "salary", label: "Salary", render: (row) => formatAmount(row.salary) },
      ]}
      renderForm={(opts) => <DriverForm {...opts} />}
      onDelete={async (id) => {
        await deleteMutation.mutateAsync({ id });
      }}
      isDeleting={deleteMutation.isPending}
    />
  );
}
