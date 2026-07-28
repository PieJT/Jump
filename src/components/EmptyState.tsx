import { SearchIcon } from "./Icons";

interface EmptyStateProps {
  title: string;
  subtitle: string;
}

export function EmptyState({ title, subtitle }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <SearchIcon strokeWidth={1.6} />
      <b>{title}</b>
      <span>{subtitle}</span>
    </div>
  );
}
