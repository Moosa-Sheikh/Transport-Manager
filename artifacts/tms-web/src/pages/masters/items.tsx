import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListItems,
  useCreateItem,
  useUpdateItem,
  useDeleteItem,
  getListItemsQueryKey,
} from "@workspace/api-client-react";
import MasterPage from "@/components/master-page";

const UNIT_OPTIONS = ["Bag", "Ton", "CFT", "Piece", "Kg", "Bundle", "Cubic Meter", "Liter"];

interface ItemRow {
  id: number;
  name: string;
  unit: string;
  defaultRatePerRound?: string | null;
}

interface ItemFormProps {
  editingItem: ItemRow | null;
  onClose: () => void;
  onSubmitted: () => void;
}

function ItemForm({ editingItem, onClose, onSubmitted }: ItemFormProps) {
  const [name, setName] = useState(editingItem?.name ?? "");
  const [unit, setUnit] = useState(editingItem?.unit ?? "Bag");
  const [rate, setRate] = useState(editingItem?.defaultRatePerRound ?? "0");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const create = useCreateItem({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() });
        onSubmitted();
      },
    },
  });

  const update = useUpdateItem({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() });
        onSubmitted();
      },
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Item name is required");
      return;
    }
    const r = Number(rate);
    if (!Number.isFinite(r) || r < 0) {
      setError("Rate must be a non-negative number");
      return;
    }
    setError("");
    const data = { name: name.trim(), unit: unit || "Bag", defaultRatePerRound: rate || "0" };
    try {
      if (editingItem) {
        await update.mutateAsync({ id: editingItem.id, data });
      } else {
        await create.mutateAsync({ data });
      }
    } catch (err: unknown) {
      const apiErr = err as { data?: { error?: string } };
      setError(apiErr.data?.error ?? "Failed to save item");
    }
  };

  const isPending = create.isPending || update.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {UNIT_OPTIONS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Default Rate per Round (PKR)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">Used as default rate when this item is selected for a customer shifting trip.</p>
        </div>
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

export default function ItemsPage() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const { data, isLoading } = useListItems({ search: search || undefined });
  const deleteMutation = useDeleteItem({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() });
      },
    },
  });

  const rows: ItemRow[] = (data ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    unit: d.unit,
    defaultRatePerRound: d.defaultRatePerRound ?? "0",
  }));

  return (
    <MasterPage
      title="Items"
      data={rows}
      isLoading={isLoading}
      searchValue={search}
      onSearchChange={setSearch}
      columns={[
        { key: "name", label: "Item Name" },
        { key: "unit", label: "Unit" },
        { key: "defaultRatePerRound", label: "Default Rate/Round (PKR)" },
      ]}
      renderForm={(opts) => (
        <ItemForm
          editingItem={opts.editingItem as ItemRow | null}
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
