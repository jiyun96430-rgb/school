import React, { useState } from 'react';
import { Map, Scale, Star, Info, RefreshCw, AlertCircle, ChevronDown, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  totalSchools: number;
  isLoading: boolean;
  apiKeyMissing: boolean;
  failedDistricts: string[];
  compareCount: number;
  favoritesCount: number;
  onOpenCompare: () => void;
  onToggleFavoritesOnly: () => void;
  isFavoritesOnly: boolean;
  onRefreshData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalSchools,
  isLoading,
  apiKeyMissing,
  failedDistricts,
  compareCount,
  favoritesCount,
  onOpenCompare,
  onToggleFavoritesOnly,
  isFavoritesOnly,
  onRefreshData
}) => {
  const [showFailedDropdown, setShowFailedDropdown] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Status title based on Section 13
  const renderStatusBadge = () => {
    if (apiKeyMissing) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          학교알리미 인증키 설정 필요
        </span>
      );
    }

    if (isLoading) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
          서울 고등학교 조회 중…
        </span>
      );
    }

    if (failedDistricts.length > 0) {
      return (
        <div className="relative inline-block">
          <button
            onClick={() => setShowFailedDropdown((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100 transition cursor-pointer"
          >
            <AlertCircle className="w-3.5 h-3.5 text-orange-600" />
            <span>서울 고등학교 {totalSchools}개교 · 일부 지역 조회 실패</span>
            <ChevronDown className="w-3 h-3 text-orange-600" />
          </button>

          {showFailedDropdown && (
            <div className="absolute left-0 mt-1 z-50 w-56 p-2.5 bg-white rounded-lg shadow-xl border border-slate-200 text-xs text-slate-700">
              <div className="font-bold text-slate-900 mb-1">조회 실패 자치구:</div>
              <div className="text-red-600">{failedDistricts.join(', ')}</div>
              <button
                onClick={() => {
                  setShowFailedDropdown(false);
                  onRefreshData();
                }}
                className="mt-2 w-full py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded text-[11px] transition"
              >
                다시 시도
              </button>
            </div>
          )}
        </div>
      );
    }

    if (totalSchools > 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          서울 고등학교 {totalSchools}개교
        </span>
      );
    }

    return null;
  };

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 py-2.5 sm:px-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Logo & App Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <Map className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                  서울 고교 지도
                </h1>
                {renderStatusBadge()}
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                지도에서 찾고, 공시정보로 비교하는 서울 고등학교 안내
              </p>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Compare Drawer Trigger */}
            <button
              onClick={onOpenCompare}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                compareCount > 0
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>비교함</span>
              {compareCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-white text-blue-700 font-extrabold text-[10px] flex items-center justify-center">
                  {compareCount}
                </span>
              )}
            </button>

            {/* Favorites Filter Toggle */}
            <button
              onClick={onToggleFavoritesOnly}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isFavoritesOnly
                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${isFavoritesOnly ? 'fill-white' : 'text-amber-500'}`} />
              <span>관심학교</span>
              {favoritesCount > 0 && (
                <span className={`w-4 h-4 rounded-full font-extrabold text-[10px] flex items-center justify-center ${isFavoritesOnly ? 'bg-white text-amber-700' : 'bg-amber-100 text-amber-800'}`}>
                  {favoritesCount}
                </span>
              )}
            </button>

            {/* About / Attribution Modal Trigger */}
            <button
              onClick={() => setShowAboutModal(true)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition cursor-pointer"
              title="데이터 출처 및 안내"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* About Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl p-5 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600" />
                서울 고교 지도 안내 및 데이터 출처
              </h3>
              <button
                onClick={() => setShowAboutModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <div>
                <strong className="text-slate-900 block mb-0.5">1. 학교 공시데이터:</strong>
                교육부 및 한국교육학술정보원(KERIS) 학교알리미(SchoolInfo) Open API의 공식 공시 데이터를 실시간 조회하여 제공합니다.
              </div>

              <div>
                <strong className="text-slate-900 block mb-0.5">2. 지도 및 타일:</strong>
                Leaflet 오픈소스 라이브러리와 OpenStreetMap(OSM) 표준 타일을 사용합니다.<br />
                &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="text-blue-600 underline">OpenStreetMap</a> contributors.
              </div>

              <div>
                <strong className="text-slate-900 block mb-0.5">3. 서울 자치구 및 교육지원청 경계:</strong>
                통계청 센서스용 행정구역경계(southkorea/seoul-maps, Apache License 2.0) 및 서울특별시 교육지원청 관할 구역 데이터를 기반으로 제작되었습니다.
              </div>

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-blue-900">
                본 서비스는 중학생, 학부모, 진로진학상담교사를 위한 교육용 비영리 공공 탐색 웹앱입니다.
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowAboutModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
