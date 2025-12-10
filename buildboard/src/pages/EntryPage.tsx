import { DailyEntryForm } from "@/components/forms/DailyEntryForm";

interface EntryPageProps {
  projectId: string;
}

export function EntryPage({ projectId }: EntryPageProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Daily Entry
        </h1>
        <p className="text-slate-500 mt-1">
          Enter your forecast or actuals for the day
        </p>
      </div>

      {/* Form */}
      <DailyEntryForm projectId={projectId} />
    </div>
  );
}
