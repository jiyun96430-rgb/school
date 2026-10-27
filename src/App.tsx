import React, { useState, useEffect, useMemo, useRef } from 'react';
import { School, SchoolsApiResponse } from './types/school';
import { Header } from './components/Header';
import { FilterBar, FilterState } from './components/FilterBar';
import { SchoolCard } from './components/SchoolCard';
import { SchoolMap } from './components/SchoolMap';
import { SchoolDetailModal } from './components/SchoolDetailModal';
import { SchoolCompareModal } from './components/SchoolCompareModal';
import {
  KeyRound,
  AlertCircle,
  RefreshCw,
  Search,
  MapPinOff,
  Map as MapIcon,
  List as ListIcon,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

const INITIAL_FILTERS: FilterState = {
  district: '전체',
  schoolType: '전체',
  genderType: '전체',
  foundationType: '전체',
  searchQuery: '',
  favoritesOnly: false,
  withLocationOnly: false
};

const FAVORITES_STORAGE_KEY = 'seoul_highschools_favorites_v1';

export const App: React.FC = () => {
  // School Data States
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiKeyMissing, setApiKeyMissing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [failedDistricts, setFailedDistricts] = useState<string[]>([]);

  // Filter States
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

  // Interaction States
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [detailModalSchool, setDetailModalSchool] = useState<School | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [compareSchools, setCompareSchools] = useState<School[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Mobile View Tab ('map' | 'list')
  const [mobileTab, setMobileTab] = useState<'map' | 'list'>('map');

  // Favorites (localStorage)
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const schoolListRef = useRef<HTMLDivElement>(null);

  // Save favorites to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    } catch (e) {
      console.warn('Failed to save favorites to localStorage:', e);
    }
  }, [favorites]);

  // Load school data from server
  const fetchSchools = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setApiKeyMissing(false);
    setFailedDistricts([]);

    try {
      const res = await fetch('/api/schools');

      if (res.status === 503) {
        // Section 6 ③: SCHOOLINFO_API_KEY_MISSING
        setApiKeyMissing(true);
        setSchools([]);
        return;
      }

      if (!res.ok) {
        throw new Error(`서버 응답 오류 (HTTP ${res.status})`);
      }

      const data: SchoolsApiResponse = await res.json();

      if (data.error === 'SCHOOLINFO_API_KEY_MISSING') {
        setApiKeyMissing(true);
        setSchools([]);
        return;
      }

      setSchools(data.schools || []);
      setFailedDistricts(data.failedDistricts || []);
    } catch (err: any) {
      console.error('[App] fetchSchools error:', err);
      setErrorMessage(err?.message || '학교알리미 연결에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  // Filter logic
  const filteredSchools = useMemo(() => {
    return schools.filter((school) => {
      // 1. District filter
      if (filters.district !== '전체' && school.district !== filters.district) {
        return false;
      }

      // 2. School type filter
      if (filters.schoolType !== '전체' && school.schoolType !== filters.schoolType) {
        return false;
      }

      // 3. Gender filter
      if (filters.genderType !== '전체' && school.genderType !== filters.genderType) {
        return false;
      }

      // 4. Foundation filter
      if (filters.foundationType !== '전체' && school.foundationType !== filters.foundationType) {
        return false;
      }

      // 5. Search query
      if (filters.searchQuery.trim() !== '') {
        const query = filters.searchQuery.trim().toLowerCase();
        const nameMatch = school.schoolName.toLowerCase().includes(query);
        const districtMatch = school.district.toLowerCase().includes(query);
        const addressMatch = school.address.toLowerCase().includes(query);
        if (!nameMatch && !districtMatch && !addressMatch) {
          return false;
        }
      }

      // 6. Favorites only
      if (filters.favoritesOnly && !favorites.includes(school.schoolCode)) {
        return false;
      }

      // 7. Location only
      if (filters.withLocationOnly && !school.hasLocation) {
        return false;
      }

      return true;
    });
  }, [schools, filters, favorites]);

  // Toast notification helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3200);
  };

  // Card click handler
  const handleSelectSchoolFromCard = (school: School) => {
    setSelectedSchool(school);

    if (!school.hasLocation) {
      // Section 25: Alert if no location coordinates
      showToast('이 학교는 위치정보가 없어 지도에 표시되지 않습니다.');
    } else {
      // Switch to map view on mobile if clicked
      if (window.innerWidth < 768) {
        setMobileTab('map');
      }
    }

    setDetailModalSchool(school);
    setIsDetailOpen(true);
  };

  // Marker click handler from Map
  const handleSelectSchoolFromMap = (school: School) => {
    setSelectedSchool(school);
    setDetailModalSchool(school);
    setIsDetailOpen(true);

    // Scroll to the card in list
    const cardEl = document.getElementById(`school-card-${school.schoolCode}`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  // Toggle favorite
  const handleToggleFavorite = (school: School, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFavorites((prev) => {
      const exists = prev.includes(school.schoolCode);
      if (exists) {
        showToast(`'${school.schoolName}' 관심학교 등록이 해제되었습니다.`);
        return prev.filter((id) => id !== school.schoolCode);
      } else {
        showToast(`'${school.schoolName}' 관심학교에 추가되었습니다.`);
        return [...prev, school.schoolCode];
      }
    });
  };

  // Toggle compare
  const handleToggleCompare = (school: School, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCompareSchools((prev) => {
      const exists = prev.some((s) => s.schoolCode === school.schoolCode);
      if (exists) {
        showToast(`'${school.schoolName}' 비교함에서 제외되었습니다.`);
        return prev.filter((s) => s.schoolCode !== school.schoolCode);
      } else {
        if (prev.length >= 4) {
          showToast('비교함에는 최대 4개 학교까지만 추가할 수 있습니다.');
          return prev;
        }
        showToast(`'${school.schoolName}' 비교함에 추가되었습니다. (현재 ${prev.length + 1}/4)`);
        return [...prev, school];
      }
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 text-slate-800">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/90 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs sm:text-sm font-semibold flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <AlertCircle className="w-4 h-4 text-blue-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <Header
        totalSchools={schools.length}
        isLoading={isLoading}
        apiKeyMissing={apiKeyMissing}
        failedDistricts={failedDistricts}
        compareCount={compareSchools.length}
        favoritesCount={favorites.length}
        onOpenCompare={() => setIsCompareOpen(true)}
        onToggleFavoritesOnly={() =>
          setFilters((prev) => ({ ...prev, favoritesOnly: !prev.favoritesOnly }))
        }
        isFavoritesOnly={filters.favoritesOnly}
        onRefreshData={fetchSchools}
      />

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(INITIAL_FILTERS)}
        allSchools={schools}
        filteredCount={filteredSchools.length}
      />

      {/* Mobile Tab Switcher */}
      <div className="md:hidden flex border-b border-slate-200 bg-white">
        <button
          onClick={() => setMobileTab('map')}
          className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition ${
            mobileTab === 'map'
              ? 'border-blue-600 text-blue-600 bg-blue-50/30'
              : 'border-transparent text-slate-500'
          }`}
        >
          <MapIcon className="w-4 h-4" />
          <span>지도 화면</span>
        </button>
        <button
          onClick={() => setMobileTab('list')}
          className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition ${
            mobileTab === 'list'
              ? 'border-blue-600 text-blue-600 bg-blue-50/30'
              : 'border-transparent text-slate-500'
          }`}
        >
          <ListIcon className="w-4 h-4" />
          <span>학교 목록 ({filteredSchools.length})</span>
        </button>
      </div>

      {/* Main Body (Left: School List ~35%, Right: Leaflet Map ~65%) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left: School List Panel */}
        <aside
          ref={schoolListRef}
          className={`w-full md:w-[35%] lg:w-[32%] xl:w-[30%] h-full flex flex-col bg-slate-50 border-r border-slate-200 overflow-y-auto ${
            mobileTab === 'map' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Section 6 ③: 학교알리미 인증키 미설정 안내 */}
          {apiKeyMissing && (
            <div className="m-4 p-5 bg-white rounded-2xl border border-amber-200 shadow-sm space-y-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base mb-1">
                  학교알리미 인증키 설정 필요
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  학교알리미 인증키(<strong>SCHOOLINFO_API_KEY</strong>)가 설정되지 않았습니다.
                  AI Studio의 Settings &gt; Secrets(또는 배포 사이트의 환경변수)에 키를 추가하면 학교 목록이 나타납니다.
                </p>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-[11px] text-amber-900 space-y-1">
                <div className="font-bold">안내사항:</div>
                <div>• 환경변수명: <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">SCHOOLINFO_API_KEY</code></div>
                <div>• 지도는 키 없이도 OpenStreetMap 타일 및 서울 구 경계가 정상 작동합니다.</div>
              </div>

              <button
                onClick={fetchSchools}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                인증키 설정 후 다시 확인
              </button>
            </div>
          )}

          {/* Loading State */}
          {!apiKeyMissing && isLoading && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-3">
              <RefreshCw className="w-7 h-7 text-blue-600 animate-spin" />
              <div className="font-bold text-sm text-slate-800">서울 고등학교 조회 중</div>
              <p className="text-xs text-slate-500 max-w-xs">
                서울 25개 자치구의 고등학교 공시정보를 학교알리미 Open API에서 실시간으로 불러오고 있습니다.
              </p>
            </div>
          )}

          {/* Full API Error State */}
          {!apiKeyMissing && !isLoading && errorMessage && schools.length === 0 && (
            <div className="m-4 p-5 bg-white rounded-2xl border border-red-200 shadow-sm space-y-3 text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
              <h3 className="font-extrabold text-slate-900 text-base">학교알리미 연결 실패</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{errorMessage}</p>
              <button
                onClick={fetchSchools}
                className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                다시 시도
              </button>
            </div>
          )}

          {/* Section 6 ⑦: Empty Filtered Results */}
          {!apiKeyMissing && !isLoading && schools.length > 0 && filteredSchools.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-3">
              <Search className="w-8 h-8 text-slate-300" />
              <div className="font-bold text-sm text-slate-800">조건에 맞는 학교가 없습니다</div>
              <p className="text-xs text-slate-500 max-w-xs">
                설정한 필터 조건이나 검색어에 해당하는 학교가 없습니다. 필터를 줄이거나 초기화해 보세요.
              </p>
              <button
                onClick={() => setFilters(INITIAL_FILTERS)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                필터 전체 초기화
              </button>
            </div>
          )}

          {/* Normal School List Cards */}
          {!apiKeyMissing && !isLoading && filteredSchools.length > 0 && (
            <div className="p-3.5 space-y-2.5">
              <div className="text-[11px] font-semibold text-slate-500 px-1 flex items-center justify-between">
                <span>학교를 선택하면 지도 위치 및 상세 공시정보를 확인합니다</span>
                <span className="text-blue-600 font-bold">{filteredSchools.length}개교</span>
              </div>

              {filteredSchools.map((school) => (
                <div key={school.schoolCode} id={`school-card-${school.schoolCode}`}>
                  <SchoolCard
                    school={school}
                    isSelected={selectedSchool?.schoolCode === school.schoolCode}
                    isFavorite={favorites.includes(school.schoolCode)}
                    isInCompare={compareSchools.some((s) => s.schoolCode === school.schoolCode)}
                    onSelect={handleSelectSchoolFromCard}
                    onToggleFavorite={handleToggleFavorite}
                    onToggleCompare={handleToggleCompare}
                  />
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* Right: Leaflet Map Panel (~65% or full on mobile) */}
        <main
          className={`w-full md:w-[65%] lg:w-[68%] xl:w-[70%] h-full relative ${
            mobileTab === 'list' ? 'hidden md:block' : 'block'
          }`}
        >
          <SchoolMap
            schools={filteredSchools}
            selectedSchool={selectedSchool}
            onSelectSchool={handleSelectSchoolFromMap}
            selectedDistrict={filters.district}
          />
        </main>
      </div>

      {/* School Detail Modal */}
      {detailModalSchool && (
        <SchoolDetailModal
          school={detailModalSchool}
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          isFavorite={favorites.includes(detailModalSchool.schoolCode)}
          isInCompare={compareSchools.some((s) => s.schoolCode === detailModalSchool.schoolCode)}
          onToggleFavorite={handleToggleFavorite}
          onToggleCompare={handleToggleCompare}
        />
      )}

      {/* School Compare Modal */}
      <SchoolCompareModal
        schools={compareSchools}
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        onRemoveSchool={(code) =>
          setCompareSchools((prev) => prev.filter((s) => s.schoolCode !== code))
        }
        onClearAll={() => setCompareSchools([])}
        onSelectSchool={(school) => {
          setSelectedSchool(school);
          setDetailModalSchool(school);
          setIsDetailOpen(true);
        }}
      />
    </div>
  );
};

export default App;
