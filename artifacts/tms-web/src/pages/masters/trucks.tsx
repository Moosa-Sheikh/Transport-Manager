import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListTrucks,
  useCreateTruck,
  useUpdateTruck,
  useDeleteTruck,
  getListTrucksQueryKey,
} from "@workspace/api-client-react";
import MasterPage from "@/components/master-page";

interface TruckFormProps {
  editingItem: { id: number; truckNumber: string; ownerType: string; model?: string | null } | null;
  onClose: () => void;
  onSubmitted: () => void;
}

function TruckForm({ editingItem, onClose, onSubmitted }: TruckFormProps) {
  const [truckNumber, setTruckNumber] = useState(editingItem?.truckNumber ?? "");
  const [ownerType, setOwnerType] = useState<"Owned" | "Rented">(
    (editingItem?.ownerType as "Owned" | "Rented") ?? "Owned",
  );
  const [model, setModel] = useState(editingItem?.model ?? "");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const create = useCreateTruck({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTrucksQueryKey() });
        onSubmitted();
      },
    },
  });

  const update = useUpdateTruck({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTrucksQueryKey() });
        onSubmitted();
      },
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!truckNumber.trim()) {
      setError("Truck number is required");
      return;
    }
    setError("");
    const data = {
      truckNumber: truckNumber.trim(),
      ownerType,
      model: model.trim() || null,
    };
    try {
      if (editingItem) {
        await update.mutateAsync({ id: editingItem.id, data });
      } else {
        await create.mutateAsync({ data });
      }
    } catch (err: unknown) {
      const apiErr = err as { data?: { error?: string } };
      setError(apiErr.data?.error ?? "Failed to save truck");
    }
  };

  const isPending = create.isPending || update.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Truck Number *</label>
          <input
            type="text"
            value={truckNumber}
            onChange={(e) => setTruckNumber(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Owner Type *</label>
          <select
            value={ownerType}
            onChange={(e) => setOwnerType(e.target.value as "Owned" | "Rented")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value="Owned">Owned</option>
            <option value="Rented">Rented</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
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

export default function TrucksPage() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const { data, isLoading } = useListTrucks({ search: search || undefined });
  const deleteMutation = useDeleteTruck({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTrucksQueryKey() });
      },
    },
  });

  return (
    <MasterPage
      title="Trucks"
      data={data}
      isLoading={isLoading}
      searchValue={search}
      onSearchChange={setSearch}
      columns={[
        { key: "truckNumber", label: "Truck Number" },
        {
          key: "ownerType",
          label: "Owner Type",
          render: (row) => (
            <span
              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                row.ownerType === "Owned"
                  ? "bg-green-50 text-green-700"
                  : "bg-orange-50 text-orange-700"
              }`}
            >
              {row.ownerType}
            </span>
          ),
        },
        { key: "model", label: "Model" },
      ]}
      renderForm={(opts) => <TruckForm {...opts} />}
      onDelete={async (id) => {
        await deleteMutation.mutateAsync({ id });
      }}
      isDeleting={deleteMutation.isPending}
    />
  );
}
