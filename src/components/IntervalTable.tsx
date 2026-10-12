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
import { TelemetryRecord, StaffConfig } from '../types/telemetry';
import { processTelemetryRecord, formatDwellTime, formatIsoTime } from '../utils/aggregations';
import { ArrowUpDown, ChevronLeft, ChevronRight, Search, Clock, Camera, ShieldCheck, User, Baby } from 'lucide-react';

interface IntervalTableProps {
  telemetry: TelemetryRecord[];
  staffConfig: StaffConfig;
}

export const IntervalTable: React.FC<IntervalTableProps> = ({ telemetry, staffConfig }) => {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'timestamp', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedZone, setSelectedZone] = useState<string>('all');

  // Process raw records through staff filter logic
  const processedData = useMemo(() => {
    return telemetry
      .filter((rec) => selectedZone === 'all' || rec.zone_id === selectedZone)
      .map((rec) => processTelemetryRecord(rec, staffConfig));
  }, [telemetry, staffConfig, selectedZone]);

  const columns = useMemo<ColumnDef<ReturnType<typeof processTelemetryRecord>>[]>(
    () => [
      {
        accessorKey: 'timestamp',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-1 hover:text-white transition font-semibold"
          >
            Interval Timestamp
            <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: (info) => (
          <div className="font-mono text-xs text-slate-200 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            {formatIsoTime(info.getValue<string>())}
          </div>
        ),
      },
      {
        accessorKey: 'zone_id',
        header: 'Zone ID',
        cell: (info) => {
          const zone = info.getValue<string>();
          const colors: Record<string, string> = {
            'Zone-1': 'bg-blue-500/10 text-blue-300 border-blue-500/30',
            'Zone-2': 'bg-purple-500/10 text-purple-300 border-purple-500/30',
            'Zone-3': 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
            'Zone-4': 'bg-amber-500/10 text-amber-300 border-amber-500/30',
          };
          return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colors[zone] || 'bg-slate-800 text-slate-300'}`}>
              {zone}
            </span>
          );
        },
      },
      {
        accessorKey: 'camera_id',
        header: 'Camera Edge Node',
        cell: (info) => (
          <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
            <Camera className="w-3 h-3 text-slate-500" />
            {info.getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: 'live_headcount',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-1 hover:text-white transition font-semibold"
          >
            Headcount
            <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: (info) => {
          const row = info.row.original;
          const displayCount = staffConfig.enabled ? row.net_headcount : row.live_headcount;
          return (
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-sm text-white">{displayCount}</span>
              <span className="text-[11px] text-slate-500">
                {staffConfig.enabled ? `(Net, -${row.staff_deduction})` : '(Raw)'}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'avg_dwell_time_seconds',
        header: 'Avg Dwell Time',
        cell: (info) => (
          <span className="text-xs text-slate-300 font-medium">
            {formatDwellTime(info.getValue<number>())}
          </span>
        ),
      },
      {
        id: 'demographics',
        header: 'GPT-4V Demographic Estimate',
        cell: (info) => {
          const row = info.row.original;
          const adultM = staffConfig.enabled ? row.adjusted_adult_male : row.adult_male;
          const adultF = staffConfig.enabled ? row.adjusted_adult_female : row.adult_female;
          const kidM = staffConfig.enabled ? row.adjusted_kid_male : row.kid_male;
          const kidF = staffConfig.enabled ? row.adjusted_kid_female : row.kid_female;

          return (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/20 flex items-center gap-0.5">
                <User className="w-2.5 h-2.5" /> M: {adultM}
              </span>
              <span className="bg-pink-500/10 text-pink-300 px-1.5 py-0.5 rounded border border-pink-500/20 flex items-center gap-0.5">
                <User className="w-2.5 h-2.5" /> F: {adultF}
              </span>
              {(kidM > 0 || kidF > 0) && (
                <span className="bg-purple-500/10 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/20 flex items-center gap-0.5">
                  <Baby className="w-2.5 h-2.5" /> Kids: {kidM + kidF}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'confidence_score',
        header: 'AI Conf.',
        cell: (info) => {
          const score = info.getValue<number>();
          return (
            <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-0.5">
              <ShieldCheck className="w-3 h-3" />
              {(score * 100).toFixed(0)}%
            </span>
          );
        },
      }
    ],
    [staffConfig]
  );

  const table = useReactTable({
    data: processedData,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 15,
      },
    },
  });

  return (
    <div className="space-y-4">
      
      {/* Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search telemetry logs..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900/80 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Zone Filter */}
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-900/80 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Table Zones</option>
            <option value="Zone-1">Zone 1 (Main Display)</option>
            <option value="Zone-2">Zone 2 (Interactive Booth)</option>
            <option value="Zone-3">Zone 3 (VIP Lounge)</option>
            <option value="Zone-4">Zone 4 (Merch & Checkout)</option>
          </select>
        </div>

        <div className="text-xs text-slate-400">
          Showing <span className="text-white font-medium">{table.getRowModel().rows.length}</span> of{' '}
          <span className="text-white font-medium">{processedData.length}</span> 15-min intervals
        </div>
      </div>

      {/* TanStack Table Element */}
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
                  No 15-minute telemetry intervals match your criteria.
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

      {/* Pagination Controls */}
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
