import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnDef,
  flexRender,
  SortingState
} from '@tanstack/react-table';
import { SummaryRecord, StaffConfig } from '../types/telemetry';
import { processSummaryRecord, formatDwellTime } from '../utils/aggregations';
import { Calendar, Clock, ArrowUpDown, ChevronLeft, ChevronRight, TrendingUp, Users } from 'lucide-react';

interface SummaryTableProps {
  summaries: SummaryRecord[];
  staffConfig: StaffConfig;
}

export const SummaryTable: React.FC<SummaryTableProps> = ({ summaries, staffConfig }) => {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date_str', desc: true }]);

  const processedData = useMemo(() => {
    return summaries.map((s) => processSummaryRecord(s, staffConfig));
  }, [summaries, staffConfig]);

  const columns = useMemo<ColumnDef<ReturnType<typeof processSummaryRecord>>[]>(
    () => [
      {
        accessorKey: 'date_str',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-1 hover:text-white transition font-semibold"
          >
            Event Day / Date
            <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: (info) => (
          <div className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            {info.getValue<string>()}
          </div>
        ),
      },
      {
        accessorKey: 'window_block',
        header: 'Shift Block',
        cell: (info) => {
          const val = info.getValue<string>() || '';
          const isShift1 = val.includes('Shift 1');
          return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
              isShift1
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
            }`}>
              <Clock className="w-3 h-3" />
              {val}
            </span>
          );
        },
      },
      {
        accessorKey: 'zone_id',
        header: 'Zone ID',
        cell: (info) => (
          <span className="font-semibold text-xs text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            {info.getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: 'total_intervals',
        header: 'Completed Intervals',
        cell: (info) => (
          <span className="text-xs text-slate-400 font-mono">
            {info.getValue<number>()} x 15-min
          </span>
        ),
      },
      {
        accessorKey: 'avg_headcount',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-1 hover:text-white transition font-semibold"
          >
            Avg Headcount
            <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: (info) => {
          const row = info.row.original;
          const displayAvg = staffConfig.enabled ? row.net_avg_headcount : row.avg_headcount;
          return (
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-sm text-indigo-300">{displayAvg}</span>
              <span className="text-[11px] text-slate-400">visitors/interval</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'total_raw_headcount',
        header: 'Total Traffic Volume',
        cell: (info) => {
          const row = info.row.original;
          const displayTotal = staffConfig.enabled ? row.net_total_headcount : row.total_raw_headcount;
          return (
            <div className="font-semibold text-xs text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {displayTotal} total detections
            </div>
          );
        },
      },
      {
        accessorKey: 'avg_dwell_time_seconds',
        header: 'Avg Zone Dwell Time',
        cell: (info) => (
          <span className="text-xs text-amber-300 font-mono">
            {formatDwellTime(info.getValue<number>())}
          </span>
        ),
      },
      {
        id: 'demographic_totals',
        header: 'Demographics Aggregated',
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="text-[11px] text-slate-300 space-x-2 font-mono">
              <span>Adult M: <strong>{row.total_adult_male}</strong></span>
              <span>F: <strong>{row.total_adult_female}</strong></span>
              <span>Kids: <strong>{row.total_kid_male + row.total_kid_female}</strong></span>
            </div>
          );
        },
      },
    ],
    [staffConfig]
  );

  const table = useReactTable({
    data: processedData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 12 },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            6-Hour Half-Day Aggregated Summaries
          </h3>
          <p className="text-xs text-slate-400">Calculated over 4-hour/6-hour operational blocks (Morning vs Afternoon/Evening)</p>
        </div>
        <div className="text-xs text-slate-400">
          Showing <span className="text-white font-medium">{processedData.length}</span> summary blocks
        </div>
      </div>

      <div className="glass-panel rounded-xl border border-slate-800 overflow-x-auto shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-900/90 text-slate-300 text-xs uppercase tracking-wider border-b border-slate-800">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3.5 font-semibold">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                  No 6-hour summary data available.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-slate-400">
          Page <span className="font-semibold text-white">{table.getState().pagination.pageIndex + 1}</span> of{' '}
          <span className="font-semibold text-white">{table.getPageCount()}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};
