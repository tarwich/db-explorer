import { DatabaseConnection } from '@/types/connections';
import { PencilIcon } from '@heroicons/react/24/outline';

export interface ConnectionCardProps {
  connection: DatabaseConnection;
  isActive?: boolean;
  onEdit: (connection: DatabaseConnection) => void;
  onSelect: (connection: DatabaseConnection) => void;
}

export function ConnectionCard({
  connection,
  isActive = false,
  onEdit,
  onSelect,
}: ConnectionCardProps) {
  return (
    <div
      className={`
        relative rounded-lg border p-4 cursor-pointer
        hover:border-blue-500 hover:shadow-sm
        ${isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
      `}
      onClick={() => onSelect(connection)}
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {connection.name}
          </h3>
          <p className="mt-1 text-sm text-gray-500">{connection.host}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(connection);
          }}
          className="p-2 text-gray-400 hover:text-gray-600"
        >
          <PencilIcon className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-4">
        <p className="text-sm text-gray-500">Database: {connection.database}</p>
        <p className="text-sm text-gray-500">User: {connection.username}</p>
      </div>
    </div>
  );
}
