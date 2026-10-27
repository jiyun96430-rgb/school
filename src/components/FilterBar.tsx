import React from 'react';
import { School, SchoolType, GenderType, FoundationType } from '../types/school';
import { Search, RotateCcw, Filter, X, Building, Check } from 'lucide-react';
import { SEOUL_DISTRICTS } from '../../server/schoolinfo';

export interface FilterState {
  district: string;
  schoolType: SchoolType | '전체';
  genderType: GenderType | '전체';
  foundationType: FoundationType | '전체';
  searchQuery: string;
  favoritesOnly: boolean;
  withLocationOnly: boolean;
}

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onReset: () => void;
  allSchools: School[];
  filteredCount: number;
}

const SCHOOL_TYPES: (SchoolType | '전체')[] = [
  '전체',
  '일반고',
  '자사고',
  '특목고',
  '영재고',
  '특성화고',
  '학력인정고',
  '기타'
];

const GENDER_TYPES: (GenderType | '전체')[] = ['전체', '남학교', '여학교', '남녀공학'];

const FOUNDATION_TYPES: (FoundationType | '전체')[] = ['전체', '공립', '사립', '국립'];

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onChange,
  onReset,
  allSchools,
  filteredCount
}) => {
  // Dynamically calculate district counts from current data (Section 21)
  const districtCounts = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const d of SEOUL_DISTRICTS) {
      map.set(d.name, 0);
    }
    for (const s of allSchools) {
      const count = map.get(s.district) || 0;
      map.set(s.district, count + 1);
    }
    return map;
  }, [allSchools]);

  // Check if any filter is active
  const hasActiveFilters =
    filters.district !== '전체' ||
    filters.schoolType !== '전체' ||
    filters.genderType !== '전체' ||
    filters.foundationType !== '전체' ||
    filters.searchQuery.trim() !== '' ||
    filters.favoritesOnly ||
    filters.withLocationOnly;

  return (
    <div className="bg-white border-b border-slate-200 shadow-xs px-4 py-3 space-y-3">
      {/* Top Filter Row: Search & Select Dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 items-center">
        {/* Search Input */}
        <div className="relative md:col-span-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onChange({ ...filters, searchQuery: e.target.value })}
            placeholder="학교명 검색 (예: 경기고)"
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
          {filters.searchQuery && (
            <button
              onClick={() => onChange({ ...filters, searchQuery: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* District Select with Dynamic Counts (Section 21) */}
        <div>
          <select
            value={filters.district}
            onChange={(e) => onChange({ ...filters, district: e.target.value })}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          >
            <option value="전체">지역: 서울 전체 ({allSchools.length}개교)</option>
            {SEOUL_DISTRICTS.map((d) => {
              const count = districtCounts.get(d.name) || 0;
              return (
                <option key={d.code} value={d.name}>
                  {d.name} ({count}개교)
                </option>
              );
            })}
          </select>
        </div>

        {/* School Type Select (Section 22) */}
        <div>
          <select
            value={filters.schoolType}
            onChange={(e) => onChange({ ...filters, schoolType: e.target.value as SchoolType | '전체' })}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          >
            {SCHOOL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t === '전체' ? '유형: 전체 고교' : `유형: ${t}`}
              </option>
            ))}
          </select>
        </div>

        {/* Gender Select (Section 23) */}
        <div>
          <select
            value={filters.genderType}
            onChange={(e) => onChange({ ...filters, genderType: e.target.value as GenderType | '전체' })}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          >
            {GENDER_TYPES.map((g) => (
              <option key={g} value={g}>
                {g === '전체' ? '성별: 남녀 전체' : `성별: ${g}`}
              </option>
            ))}
          </select>
        </div>

        {/* Foundation Select (Section 23) */}
        <div>
          <select
            value={filters.foundationType}
            onChange={(e) => onChange({ ...filters, foundationType: e.target.value as FoundationType | '전체' })}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          >
            {FOUNDATION_TYPES.map((f) => (
              <option key={f} value={f}>
                {f === '전체' ? '설립: 설립 전체' : `설립: ${f}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Applied Filters Tags & Status Summary Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-bold text-slate-900">
            조건에 맞는 학교 <span className="text-blue-600">{filteredCount}</span>개
          </span>

          {/* Active condition pills */}
          {filters.district !== '전체' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-medium border border-blue-200">
              {filters.district}
              <button onClick={() => onChange({ ...filters, district: '전체' })} className="hover:text-blue-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.schoolType !== '전체' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[11px] font-medium border border-purple-200">
              {filters.schoolType}
              <button onClick={() => onChange({ ...filters, schoolType: '전체' })} className="hover:text-purple-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.genderType !== '전체' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
              {filters.genderType}
              <button onClick={() => onChange({ ...filters, genderType: '전체' })} className="hover:text-slate-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.foundationType !== '전체' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
              {filters.foundationType}
              <button onClick={() => onChange({ ...filters, foundationType: '전체' })} className="hover:text-slate-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.favoritesOnly && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-medium border border-amber-200">
              관심학교만
              <button onClick={() => onChange({ ...filters, favoritesOnly: false })} className="hover:text-amber-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>

        {/* Reset button */}
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-red-600 transition px-2 py-1 rounded hover:bg-slate-50 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            필터 초기화
          </button>
        )}
      </div>
    </div>
  );
};
