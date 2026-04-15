import { useQuery } from '@tanstack/react-query';
import { fetchLeads } from '@/utils/api';

interface UseLeadsQueryParams {
  page: number;
  search: string;
  status: string;
  assignedUser: string;
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

export function useLeadsQuery(params: UseLeadsQueryParams) {
  const { startDate, endDate } = deriveDates(params.dateRange, params.customStartDate, params.customEndDate);

  const query = useQuery({
    queryKey: ['leads', {
      page: params.page,
      search: params.search,
      status: params.status,
      assignedUser: params.assignedUser,
      sortBy: params.sortBy,
      dateRange: params.dateRange,
      customStartDate: params.customStartDate,
      customEndDate: params.customEndDate,
    }],
    queryFn: () => fetchLeads({
      page: params.page,
      limit: ITEMS_PER_PAGE,
      search: params.search,
      status: params.status,
      assignedUser: params.assignedUser !== 'All' ? params.assignedUser : undefined,
      sortBy: params.sortBy,
      startDate,
      endDate,
    }),
  });

  return {
    leads: query.data?.leads ?? [],
    totalItems: query.data?.totalItems ?? 0,
    statusCounts: query.data?.statusCounts ?? { New: 0, 'In Progress': 0, Converted: 0, Cancelled: 0 },
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
