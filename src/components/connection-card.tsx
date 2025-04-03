import { DatabaseConnection } from '@/types/connections';
import { TrashIcon } from '@heroicons/react/24/outline';

interface ConnectionCardProps {
  connection: DatabaseConnection;
  onDelete: (id: string) => void;
  onSelect: (connection: DatabaseConnection) => void;
}

const TYPE_COLOR = 'bg-blue-100 text-blue-800';

export function ConnectionCard({
  connection,
  onDelete,
  onSelect,
}: ConnectionCardProps) {
  return (
    <div
      className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer"
      onClick={() => onSelect(connection)}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-gray-900">{connection.name}</h3>
          <span
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${TYPE_COLOR}`}
          >
            {connection.type}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(connection.id);
          }}
          className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
      <div className="mt-2 text-sm text-gray-600">
        {connection.host && (
          <p>
            {connection.host}
            {connection.port ? `:${connection.port}` : ''}
          </p>
        )}
        {connection.database && (
          <p className="truncate">{connection.database}</p>
        )}
      </div>
    </div>
  );
}
