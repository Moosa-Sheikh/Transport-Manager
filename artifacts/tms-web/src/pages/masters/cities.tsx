import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListCities,
  useCreateCity,
  useUpdateCity,
  useDeleteCity,
  getListCitiesQueryKey,
} from "@workspace/api-client-react";
import MasterPage from "@/components/master-page";

interface CityFormProps {
  editingItem: { id: number; name: string } | null;
  onClose: () => void;
  onSubmitted: () => void;
}

function CityForm({ editingItem, onClose, onSubmitted }: CityFormProps) {
  const [name, setName] = useState(editingItem?.name ?? "");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const create = useCreateCity({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCitiesQueryKey() });
        onSubmitted();
      },
    },
  });

  const update = useUpdateCity({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCitiesQueryKey() });
        onSubmitted();
      },
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("City name is required");
      return;
    }
    setError("");
    try {
      if (editingItem) {
        await update.mutateAsync({ id: editingItem.id, data: { name: name.trim() } });
      } else {
        await create.mutateAsync({ data: { name: name.trim() } });
      }
    } catch (err: unknown) {
      const apiErr = err as { data?: { error?: string } };
      setError(apiErr.data?.error ?? "Failed to save city");
    }
  };

  const isPending = create.isPending || update.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="max-w-sm">
        <label className="block text-sm font-medium text-gray-700 mb-1">City Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          autoFocus
        />
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

export default function CitiesPage() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const { data, isLoading } = useListCities({ search: search || undefined });
  const deleteMutation = useDeleteCity({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCitiesQueryKey() });
      },
    },
  });

  return (
    <MasterPage
      title="Cities"
      data={data}
      isLoading={isLoading}
      searchValue={search}
      onSearchChange={setSearch}
      columns={[{ key: "name", label: "City Name" }]}
      renderForm={(opts) => <CityForm {...opts} />}
      onDelete={async (id) => {
        await deleteMutation.mutateAsync({ id });
      }}
      isDeleting={deleteMutation.isPending}
    />
  );
}
