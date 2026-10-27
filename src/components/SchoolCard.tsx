import React from 'react';
import { School } from '../types/school';
import { SCHOOL_TYPE_COLORS } from './SchoolMap';
import { Star, MapPinOff, ArrowRight, Scale, Users, BookOpen } from 'lucide-react';

interface SchoolCardProps {
  school: School;
  isSelected: boolean;
  isFavorite: boolean;
  isInCompare: boolean;
  onSelect: (school: School) => void;
  onToggleFavorite: (school: School, e: React.MouseEvent) => void;
  onToggleCompare: (school: School, e: React.MouseEvent) => void;
}

export const SchoolCard: React.FC<SchoolCardProps> = ({
  school,
  isSelected,
  isFavorite,
  isInCompare,
  onSelect,
  onToggleFavorite,
  onToggleCompare
}) => {
  const typeConfig = SCHOOL_TYPE_COLORS[school.schoolType] || SCHOOL_TYPE_COLORS['기타'];

  return (
    <div
      onClick={() => onSelect(school)}
      className={`group relative p-3.5 rounded-xl border transition-all duration-150 cursor-pointer text-left bg-white ${
        isSelected
          ? 'border-blue-600 bg-blue-50/40 shadow-md ring-2 ring-blue-500/20'
          : 'border-slate-200 hover:border-blue-300 hover:shadow-sm'
      }`}
    >
      {/* Badges Bar */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* School Type */}
          <span
            className="px-2 py-0.5 rounded text-[11px] font-bold text-white tracking-wide"
            style={{ backgroundColor: typeConfig.bg }}
          >
            {school.schoolType}
          </span>

          {/* District */}
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
            {school.district}
          </span>

          {/* Gender */}
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
            {school.genderType}
          </span>

          {/* Foundation */}
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
            {school.foundationType}
          </span>

          {/* Unlocated badge */}
          {!school.hasLocation && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
              <MapPinOff className="w-2.5 h-2.5" />
              위치정보 없음
            </span>
          )}
        </div>

        {/* Action icons (Star & Compare) */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            title={isInCompare ? '비교함에서 제거' : '비교함에 추가 (최대 4개)'}
            onClick={(e) => onToggleCompare(school, e)}
            className={`p-1.5 rounded-md transition cursor-pointer ${
              isInCompare
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            title={isFavorite ? '관심학교 해제' : '관심학교 등록'}
            onClick={(e) => onToggleFavorite(school, e)}
            className={`p-1.5 rounded-md transition cursor-pointer ${
              isFavorite
                ? 'text-amber-500 fill-amber-500 hover:bg-amber-50'
                : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* School Name */}
      <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition flex items-center justify-between">
        <span className="truncate">{school.schoolName}</span>
        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition shrink-0 ml-1.5" />
      </h3>

      {/* Address */}
      {school.address && (
        <p className="text-xs text-slate-500 truncate mt-1">
          {school.address}
        </p>
      )}

      {/* Metrics or Status (Section 26) */}
      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
        {school.studentCount ? (
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-slate-700 font-semibold">
              <Users className="w-3 h-3 text-blue-500" />
              총 학생: {school.studentCount.toLocaleString()}명
            </span>
            {school.classCount && (
              <span className="text-slate-500">
                학급당: {(school.studentCount / school.classCount).toFixed(1)}명
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>상세정보 확인</span>
          </div>
        )}

        <span className="text-[11px] text-blue-600 font-semibold group-hover:underline">
          공시정보 보기
        </span>
      </div>
    </div>
  );
};
