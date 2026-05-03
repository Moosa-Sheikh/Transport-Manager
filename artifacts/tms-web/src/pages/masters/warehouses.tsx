import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListWarehouses,
  useCreateWarehouse,
  useUpdateWarehouse,
  useDeleteWarehouse,
  useListCities,
  getListWarehousesQueryKey,
} from "@workspace/api-client-react";
import MasterPage from "@/components/master-page";

interface WarehouseRow {
  id: number;
  name: string;
  cityId: number;
  cityName?: string | null;
  address?: string | null;
}

interface FormProps {
  editingItem: WarehouseRow | null;
  onClose: () => void;
  onSubmitted: () => void;
}

function WarehouseForm({ editingItem, onClose, onSubmitted }: FormProps) {
  const [name, setName] = useState(editingItem?.name ?? "");
  const [cityId, setCityId] = useState(editingItem ? String(editingItem.cityId) : "");
  const [address, setAddress] = useState(editingItem?.address ?? "");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const citiesQuery = useListCities({});

  const create = useCreateWarehouse({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListWarehousesQueryKey() });
        onSubmitted();
      },
    },
  });
  const update = useUpdateWarehouse({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListWarehousesQueryKey() });
        onSubmitted();
      },
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Warehouse name is required"); return; }
    if (!cityId) { setError("City is required"); return; }
    setError("");
    const data = { name: name.trim(), cityId: Number(cityId), address: address.trim() || null };
    try {
      if (editingItem) {
        await update.mutateAsync({ id: editingItem.id, data });
      } else {
        await create.mutateAsync({ data });
      }
    } catch (err: unknown) {
      const apiErr = err as { data?: { error?: string } };
      setError(apiErr.data?.error ?? "Failed to save warehouse");
    }
  };

  const isPending = create.isPending || update.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          autoFocus
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
        <select
          value={cityId}
          onChange={(e) => setCityId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        >
          <option value="">Select city</option>
          {citiesQuery.data?.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
        <textarea
          value={address ?? ""}
          onChange={(e) => setAddress(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>
      <div className="flex gap-3 pt-2">
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

export default function WarehousesPage() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const { data, isLoading } = useListWarehouses({ search: search || undefined });
  const deleteMutation = useDeleteWarehouse({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListWarehousesQueryKey() });
      },
    },
  });

  const rows: WarehouseRow[] = (data ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    cityId: d.cityId,
    cityName: d.cityName ?? "",
    address: d.address ?? "",
  }));

  return (
    <MasterPage
      title="Warehouses"
      data={rows}
      isLoading={isLoading}
      searchValue={search}
      onSearchChange={setSearch}
      columns={[
        { key: "name", label: "Warehouse" },
        { key: "cityName", label: "City" },
        { key: "address", label: "Address" },
      ]}
      renderForm={(opts) => (
        <WarehouseForm
          editingItem={opts.editingItem as WarehouseRow | null}
          onClose={opts.onClose}
          onSubmitted={opts.onSubmitted}
        />
      )}
      onDelete={async (id) => {
        await deleteMutation.mutateAsync({ id });
      }}
      isDeleting={deleteMutation.isPending}
    />
  );
}
