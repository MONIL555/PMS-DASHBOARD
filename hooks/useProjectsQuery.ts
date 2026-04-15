import { useQuery } from '@tanstack/react-query';
import { fetchProjects } from '@/utils/api';

interface UseProjectsQueryParams {
  page: number;
  search: string;
  phase: string;
  pipeline: string;
  person: string;
  priority: string;
  overdue: boolean;
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

export function useProjectsQuery(params: UseProjectsQueryParams) {
  const { startDate, endDate } = deriveDates(params.dateRange, params.customStartDate, params.customEndDate);

  const query = useQuery({
    queryKey: ['projects', {
      page: params.page,
      search: params.search,
      phase: params.phase,
      pipeline: params.pipeline,
      person: params.person,
      priority: params.priority,
      overdue: params.overdue,
      sortBy: params.sortBy,
      dateRange: params.dateRange,
      customStartDate: params.customStartDate,
      customEndDate: params.customEndDate,
    }],
    queryFn: () => fetchProjects({
      page: params.page,
      limit: ITEMS_PER_PAGE,
      search: params.search,
      phase: params.phase,
      pipeline: params.pipeline,
      person: params.person,
      priority: params.priority,
      overdue: params.overdue ? 'true' : undefined,
      sortBy: params.sortBy,
      startDate,
      endDate,
    }),
  });

  return {
    projects: query.data?.projects ?? [],
    totalItems: query.data?.totalItems ?? 0,
    statusCounts: query.data?.statusCounts ?? { Active: 0, 'On Hold': 0, Closed: 0, phaseCounts: { UAT: 0, Deployment: 0, Delivery: 0, GoLive: 0 } },
    assignedPersons: query.data?.assignedPersons ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
