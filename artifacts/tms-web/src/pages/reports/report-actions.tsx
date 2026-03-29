import { Download, Printer } from "lucide-react";

interface Props {
  csvUrl: string;
  title: string;
}

export default function ReportActions({ csvUrl, title }: Props) {
  const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = `${baseUrl}/api${csvUrl}`;
    link.setAttribute("download", `${title}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex items-center gap-2 print:hidden">
      <button
        onClick={handleDownload}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Download className="w-4 h-4" />
        CSV
      </button>
      <button
        onClick={() => window.print()}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Printer className="w-4 h-4" />
        Print
      </button>
    </div>
  );
}
