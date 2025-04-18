import { useQuery } from '@tanstack/react-query';
import { boot } from './api/boot';

export default function Boot() {
  useQuery({
    queryKey: ['boot'],
    queryFn: () => boot(),
    staleTime: Infinity,
  });

  return null;
}
