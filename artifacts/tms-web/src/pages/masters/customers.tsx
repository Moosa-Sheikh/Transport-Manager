import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  getListCustomersQueryKey,
} from "@workspace/api-client-react";
import MasterPage from "@/components/master-page";

interface CustomerFormProps {
  editingItem: { id: number; name: string; companyName?: string | null; phone?: string | null } | null;
  onClose: () => void;
  onSubmitted: () => void;
}

function CustomerForm({ editingItem, onClose, onSubmitted }: CustomerFormProps) {
  const [name, setName] = useState(editingItem?.name ?? "");
  const [companyName, setCompanyName] = useState(editingItem?.companyName ?? "");
  const [phone, setPhone] = useState(editingItem?.phone ?? "");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const create = useCreateCustomer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
        onSubmitted();
      },
    },
  });

  const update = useUpdateCustomer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
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
    const data = { name: name.trim(), companyName: companyName.trim() || null, phone: phone.trim() || null };
    try {
      if (editingItem) {
        await update.mutateAsync({ id: editingItem.id, data });
      } else {
        await create.mutateAsync({ data });
      }
    } catch {
      setError("Failed to save customer");
    }
  };

  const isPending = create.isPending || update.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const { data, isLoading } = useListCustomers({ search: search || undefined });
  const deleteMutation = useDeleteCustomer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
      },
    },
  });

  return (
    <MasterPage
      title="Customers"
      data={data}
      isLoading={isLoading}
      searchValue={search}
      onSearchChange={setSearch}
      columns={[
        { key: "name", label: "Name" },
        { key: "companyName", label: "Company" },
        { key: "phone", label: "Phone" },
      ]}
      renderForm={(opts) => <CustomerForm {...opts} />}
      onDelete={async (id) => {
        await deleteMutation.mutateAsync({ id });
      }}
      isDeleting={deleteMutation.isPending}
    />
  );
}
