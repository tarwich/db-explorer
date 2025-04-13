import { useQuery } from '@tanstack/react-query';
import { boot } from './actions/boot';

export default function Boot() {
  useQuery({
    queryKey: ['boot'],
    queryFn: () => boot(),
    staleTime: Infinity,
  });

  return null;
}
