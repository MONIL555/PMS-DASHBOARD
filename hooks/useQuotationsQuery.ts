import { useQuery } from '@tanstack/react-query';
import { fetchQuotations } from '@/utils/api';

interface UseQuotationsQueryParams {
  page: number;
  search: string;
  status: string;
  sortBy: string;
  commRange: string;
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

function deriveCommRange(commRange: string) {
  let minComm: number | undefined;
  let maxComm: number | undefined;

  if (commRange === '0-25k') { minComm = 0; maxComm = 25000; }
  else if (commRange === '25k-50k') { minComm = 25000; maxComm = 50000; }
  else if (commRange === '50k-100k') { minComm = 50000; maxComm = 100000; }
  else if (commRange === '100k-500k') { minComm = 100000; maxComm = 500000; }
  else if (commRange === '500k+') { minComm = 500000; }

  return { minComm, maxComm };
}

const ITEMS_PER_PAGE = 20;

export function useQuotationsQuery(params: UseQuotationsQueryParams) {
  const { startDate, endDate } = deriveDates(params.dateRange, params.customStartDate, params.customEndDate);
  const { minComm, maxComm } = deriveCommRange(params.commRange);

  const query = useQuery({
    queryKey: ['quotations', {
      page: params.page,
      search: params.search,
      status: params.status,
      sortBy: params.sortBy,
      commRange: params.commRange,
      dateRange: params.dateRange,
      customStartDate: params.customStartDate,
      customEndDate: params.customEndDate,
    }],
    queryFn: () => fetchQuotations({
      page: params.page,
      limit: ITEMS_PER_PAGE,
      search: params.search,
      status: params.status,
      sortBy: params.sortBy,
      minComm,
      maxComm,
      startDate,
      endDate,
    }),
  });

  return {
    quotations: query.data?.quotations ?? [],
    totalItems: query.data?.totalItems ?? 0,
    statusCounts: query.data?.statusCounts ?? { Sent: 0, 'Follow-up': 0, Approved: 0, Rejected: 0, Converted: 0 },
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
