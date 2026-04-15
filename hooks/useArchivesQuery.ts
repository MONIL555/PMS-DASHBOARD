import { useQuery } from '@tanstack/react-query';
import { fetchCancelledItems } from '@/utils/api';

interface UseArchivesQueryParams {
  page: number;
  search: string;
  type: string;
  sortBy: string;
  dateRange: string;
  customStartDate: string;
  customEndDate: string;
}

function deriveDates(dateRange: string, customStartDate: string, customEndDate: string) {
  let startDate: string | undefined;
  let endDate: string | undefined;
  const now = new Date();

  if (dateRange === '7days') {
    const d = new Date(); d.setDate(d.getDate() - 7); startDate = d.toISOString().split('T')[0];
  } else if (dateRange === '30days') {
    const d = new Date(); d.setDate(d.getDate() - 30); startDate = d.toISOString().split('T')[0];
  } else if (dateRange === 'thisMonth') {
    const d = new Date(now.getFullYear(), now.getMonth(), 1); startDate = d.toISOString().split('T')[0];
  } else if (dateRange === 'thisYear') {
    const d = new Date(now.getFullYear(), 0, 1); startDate = d.toISOString().split('T')[0];
  } else if (dateRange === 'custom') {
    startDate = customStartDate; endDate = customEndDate;
  }

  return { startDate, endDate };
}

const ITEMS_PER_PAGE = 20;

export function useArchivesQuery(params: UseArchivesQueryParams) {
  const { startDate, endDate } = deriveDates(params.dateRange, params.customStartDate, params.customEndDate);

  const query = useQuery({
    queryKey: ['archives', {
      page: params.page,
      search: params.search,
      type: params.type,
      sortBy: params.sortBy,
      dateRange: params.dateRange,
      customStartDate: params.customStartDate,
      customEndDate: params.customEndDate,
    }],
    queryFn: () => fetchCancelledItems({
      page: params.page,
      limit: ITEMS_PER_PAGE,
      search: params.search,
      type: params.type,
      sortBy: params.sortBy,
      startDate,
      endDate,
    }),
  });

  return {
    archives: query.data?.archives ?? [],
    totalItems: query.data?.totalItems ?? 0,
    statusCounts: query.data?.statusCounts ?? { Lead: 0, Quotation: 0, Project: 0, Ticket: 0 },
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
