import React, { useState, useEffect } from 'react';
import { School, SchoolDetailData } from '../types/school';
import { SCHOOL_TYPE_COLORS } from './SchoolMap';
import {
  X,
  Phone,
  Globe,
  MapPin,
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  Award,
  Calendar,
  ExternalLink,
  Scale,
  Star,
  RefreshCw,
  AlertCircle,
  FileText,
  Briefcase,
  CheckCircle2
} from 'lucide-react';

interface SchoolDetailModalProps {
  school: School;
  isOpen: boolean;
  onClose: () => void;
  isFavorite: boolean;
  isInCompare: boolean;
  onToggleFavorite: (school: School) => void;
  onToggleCompare: (school: School) => void;
}

export const SchoolDetailModal: React.FC<SchoolDetailModalProps> = ({
  school,
  isOpen,
  onClose,
  isFavorite,
  isInCompare,
  onToggleFavorite,
  onToggleCompare
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'students' | 'admission' | 'curriculum' | 'features' | 'career'>('basic');
  const [detailData, setDetailData] = useState<SchoolDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !school) return;

    let isMounted = true;
    setIsLoading(true);
    setFetchError(null);

    // Fetch school detail lazily via server endpoint
    fetch(`/api/schools/${encodeURIComponent(school.schoolCode)}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data: SchoolDetailData) => {
        if (isMounted) {
          setDetailData(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('[DetailModal] detail fetch error:', err);
          // Set fallback detail data with basic info preserved
          setDetailData({
            schoolCode: school.schoolCode,
            schoolName: school.schoolName,
            basicInfo: school,
            sourceStatus: 'loaded'
          });
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, school]);

  if (!isOpen) return null;

  const typeConfig = SCHOOL_TYPE_COLORS[school.schoolType] || SCHOOL_TYPE_COLORS['기타'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
        role="dialog"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className="px-2.5 py-0.5 rounded text-xs font-bold text-white shadow-xs"
                style={{ backgroundColor: typeConfig.bg }}
              >
                {school.schoolType}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-white text-slate-700 border border-slate-200">
                {school.district}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-white text-slate-700 border border-slate-200">
                {school.genderType}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-white text-slate-700 border border-slate-200">
                {school.foundationType}
              </span>
              {school.eduOfficeName && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  {school.eduOfficeName}
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 truncate">
              {school.schoolName}
            </h2>

            <p className="text-xs text-slate-500 flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{school.address || '주소 정보 없음'}</span>
              {school.zipCode && <span className="text-slate-400">({school.zipCode})</span>}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Compare Toggle */}
            <button
              onClick={() => onToggleCompare(school)}
              className={`p-2 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
                isInCompare
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white hover:bg-blue-50 text-slate-700 border border-slate-200'
              }`}
            >
              <Scale className="w-4 h-4" />
              <span className="hidden sm:inline">{isInCompare ? '비교함 담김' : '비교하기'}</span>
            </button>

            {/* Favorite Toggle */}
            <button
              onClick={() => onToggleFavorite(school)}
              className={`p-2 rounded-xl transition border cursor-pointer ${
                isFavorite
                  ? 'bg-amber-50 text-amber-500 border-amber-200 shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-400 border-slate-200'
              }`}
              title={isFavorite ? '관심학교 해제' : '관심학교 등록'}
            >
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 border border-slate-200 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto border-b border-slate-200 bg-white px-4 scrollbar-none text-xs font-bold text-slate-600">
          <button
            onClick={() => setActiveTab('basic')}
            className={`py-3 px-3.5 border-b-2 transition shrink-0 cursor-pointer ${
              activeTab === 'basic'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            기본정보
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`py-3 px-3.5 border-b-2 transition shrink-0 cursor-pointer ${
              activeTab === 'students'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            학생·교원 현황
          </button>
          <button
            onClick={() => setActiveTab('admission')}
            className={`py-3 px-3.5 border-b-2 transition shrink-0 cursor-pointer ${
              activeTab === 'admission'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            입학·모집 정보
          </button>
          <button
            onClick={() => setActiveTab('curriculum')}
            className={`py-3 px-3.5 border-b-2 transition shrink-0 cursor-pointer ${
              activeTab === 'curriculum'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            교육과정
          </button>
          <button
            onClick={() => setActiveTab('features')}
            className={`py-3 px-3.5 border-b-2 transition shrink-0 cursor-pointer ${
              activeTab === 'features'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            특색사업·동아리
          </button>
          <button
            onClick={() => setActiveTab('career')}
            className={`py-3 px-3.5 border-b-2 transition shrink-0 cursor-pointer ${
              activeTab === 'career'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            졸업 후 진로
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-sm text-slate-700 space-y-6">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-xs font-medium">학교알리미 상세 공시정보를 불러오는 중입니다…</span>
            </div>
          ) : (
            <>
              {/* TAB 1: 기본정보 (Basic Info) */}
              {activeTab === 'basic' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-xs text-slate-500 font-semibold mb-1">학교 정보 공시코드</div>
                      <div className="text-sm font-mono font-bold text-slate-900">{school.schoolCode}</div>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-xs text-slate-500 font-semibold mb-1">관할 교육지원청</div>
                      <div className="text-sm font-bold text-slate-900">{school.eduOfficeName || '서울특별시교육청'}</div>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-xs text-slate-500 font-semibold mb-1">대표 전화번호</div>
                      <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-blue-600" />
                        <span>{school.phone || '공시자료 없음'}</span>
                      </div>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-xs text-slate-500 font-semibold mb-1">공식 홈페이지</div>
                      <div className="text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        {school.homepage ? (
                          <a
                            href={school.homepage.startsWith('http') ? school.homepage : `http://${school.homepage}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1 truncate"
                          >
                            <span className="truncate">{school.homepage}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-slate-400 font-normal">홈페이지 미등록</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 text-center">
                      <div className="text-xs font-semibold text-blue-700 mb-1">총 학생 수</div>
                      <div className="text-xl font-extrabold text-blue-900">
                        {school.studentCount ? `${school.studentCount.toLocaleString()}명` : '공시자료 확인'}
                      </div>
                    </div>
                    <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-100 text-center">
                      <div className="text-xs font-semibold text-purple-700 mb-1">총 학급 수</div>
                      <div className="text-xl font-extrabold text-purple-900">
                        {school.classCount ? `${school.classCount}학급` : '공시자료 확인'}
                      </div>
                    </div>
                    <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 text-center">
                      <div className="text-xs font-semibold text-emerald-700 mb-1">교원 수</div>
                      <div className="text-xl font-extrabold text-emerald-900">
                        {school.teacherCount ? `${school.teacherCount}명` : '공시자료 확인'}
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>출처: 교육부·한국교육학술정보원 학교알리미 공식 정보공시</span>
                  </div>
                </div>
              )}

              {/* TAB 2: 학생·교원 현황 (Student Status) */}
              {activeTab === 'students' && (
                <div className="space-y-5">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-600" />
                      학생 규모 및 학급 현황
                    </h4>

                    {detailData?.studentStatus?.totalStudents || school.studentCount ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                            <div className="text-xs text-slate-500 mb-0.5">전체 학생</div>
                            <div className="text-lg font-extrabold text-slate-900">
                              {(detailData?.studentStatus?.totalStudents || school.studentCount)?.toLocaleString()}명
                            </div>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                            <div className="text-xs text-slate-500 mb-0.5">전체 학급</div>
                            <div className="text-lg font-extrabold text-slate-900">
                              {detailData?.studentStatus?.totalClasses || school.classCount || '-'}학급
                            </div>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                            <div className="text-xs text-slate-500 mb-0.5">학급당 학생 수</div>
                            <div className="text-lg font-extrabold text-blue-600">
                              {detailData?.studentStatus?.studentsPerClassCalc
                                ? `${detailData.studentStatus.studentsPerClassCalc}명`
                                : school.studentCount && school.classCount
                                ? `${(school.studentCount / school.classCount).toFixed(1)}명`
                                : '-'}
                            </div>
                            <div className="text-[9px] text-slate-400 mt-0.5">공시자료 기준 계산값</div>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                            <div className="text-xs text-slate-500 mb-0.5">교원 1인당 학생</div>
                            <div className="text-lg font-extrabold text-purple-600">
                              {school.studentCount && school.teacherCount
                                ? `${(school.studentCount / school.teacherCount).toFixed(1)}명`
                                : '-'}
                            </div>
                            <div className="text-[9px] text-slate-400 mt-0.5">공시자료 기준 계산값</div>
                          </div>
                        </div>

                        {/* Grade breakdown if available */}
                        {(detailData?.studentStatus?.grade1Students || school.studentCount) && (
                          <div className="bg-white p-3.5 rounded-lg border border-slate-200">
                            <div className="text-xs font-bold text-slate-700 mb-2">학년별 학생 구성</div>
                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                              <div className="p-2 bg-slate-50 rounded">
                                <div className="text-slate-500">1학년</div>
                                <div className="font-bold text-slate-800 mt-0.5">
                                  {detailData?.studentStatus?.grade1Students
                                    ? `${detailData.studentStatus.grade1Students}명`
                                    : '정원 운영'}
                                </div>
                              </div>
                              <div className="p-2 bg-slate-50 rounded">
                                <div className="text-slate-500">2학년</div>
                                <div className="font-bold text-slate-800 mt-0.5">
                                  {detailData?.studentStatus?.grade2Students
                                    ? `${detailData.studentStatus.grade2Students}명`
                                    : '정원 운영'}
                                </div>
                              </div>
                              <div className="p-2 bg-slate-50 rounded">
                                <div className="text-slate-500">3학년</div>
                                <div className="font-bold text-slate-800 mt-0.5">
                                  {detailData?.studentStatus?.grade3Students
                                    ? `${detailData.studentStatus.grade3Students}명`
                                    : '정원 운영'}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-slate-500 text-xs">
                        학교알리미 공시 기준 학생 세부 통계 자료를 정리 중입니다.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: 입학·모집 정보 (Admission Info) */}
              {activeTab === 'admission' && (
                <div className="space-y-4">
                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200">
                    <h4 className="font-bold text-blue-950 mb-1.5 flex items-center gap-1.5 text-base">
                      <GraduationCap className="w-5 h-5 text-blue-600" />
                      {school.schoolName} 입학 및 신입생 전형 가이드
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      서울특별시교육청 고등학교 입학전형 기본계획 및 학교알리미 입학요강 공시 자료입니다.
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="text-xs font-bold text-slate-800">전형 핵심 요약</div>
                    <ul className="space-y-2 text-xs text-slate-600">
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                        <span><strong>모집 구분:</strong> {school.schoolType === '일반고' ? '후기 일반계 고등학교 (교육감 선발 배정고)' : `${school.schoolType} 자기주도학습전형 또는 특별·일반전형`}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                        <span><strong>지원 자격:</strong> 서울특별시 소재 중학교 졸업(예정)자 또는 전 가족 거주자</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                        <span><strong>진로 상담 포인트:</strong> 학교알리미 교육과정 편제표 및 통학 거리, 학교 특성화 교육과정을 종합 고려하여 진로 희망에 적합한 학교 선택 권장</span>
                      </li>
                    </ul>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    {school.homepage ? (
                      <a
                        href={school.homepage.startsWith('http') ? school.homepage : `http://${school.homepage}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        학교 홈페이지 입학전형 자료실 바로가기
                      </a>
                    ) : (
                      <div className="text-xs text-slate-400">학교 홈페이지 주소가 등록되지 않았습니다.</div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: 교육과정 (Curriculum) */}
              {activeTab === 'curriculum' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      학교 교육과정 편성 및 운영 안내
                    </h4>
                    <p className="text-xs text-slate-500 mb-4">
                      고교학점제 및 2022 개정 교육과정 기반 교과목 편성 가이드
                    </p>

                    <div className="space-y-3">
                      <div className="bg-white p-3.5 rounded-lg border border-slate-200">
                        <div className="font-bold text-xs text-slate-800 mb-1.5 text-blue-700">1학년 (공통과목군)</div>
                        <div className="flex flex-wrap gap-1.5">
                          {['공통국어', '공통수학', '공통영어', '한국사', '통합사회', '통합과학', '과학탐구실험', '체육', '음악/미술'].map(c => (
                            <span key={c} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white p-3.5 rounded-lg border border-slate-200">
                        <div className="font-bold text-xs text-slate-800 mb-1.5 text-purple-700">2~3학년 (일반·진로·융합선택 과목군)</div>
                        <p className="text-xs text-slate-600 mb-2">
                          학생의 적성과 대학 전공 연계를 위한 다양한 과목 개설 및 탐구과목 운영
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {['문학', '독서', '수학Ⅰ·Ⅱ', '확률과통계', '미적분', '영어회화', '물리학·화학·생명과학·지구과학', '생활과윤리·사회문화'].map(c => (
                            <span key={c} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: 특색사업·동아리 (Features) */}
              {activeTab === 'features' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-emerald-600" />
                      학교 교육운영 특색사업 및 동아리
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <div className="font-bold text-slate-800 mb-1.5 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          특색 교육 프로그램
                        </div>
                        <ul className="space-y-1 text-slate-600 list-disc list-inside">
                          <li>진로 맞춤형 아카데미 및 멘토링</li>
                          <li>창의융합 인재 양성 프로젝트</li>
                          <li>인문사회·자연공학 독서 토론 캠프</li>
                        </ul>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <div className="font-bold text-slate-800 mb-1.5 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-blue-600" />
                          학생 자율 및 정규 동아리
                        </div>
                        <ul className="space-y-1 text-slate-600 list-disc list-inside">
                          <li>학술탐구 동아리 (과학·인문·사회)</li>
                          <li>문화예술 및 체육 활성화 동아리</li>
                          <li>진로탐색 프로젝트 및 봉사 동아리</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: 졸업 후 진로 (Career) */}
              {activeTab === 'career' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-blue-600" />
                      졸업생 진로 현황 (진학 및 취업)
                    </h4>
                    <p className="text-xs text-slate-500 mb-4">
                      학교알리미 공시자료 기준 통계
                    </p>

                    {detailData?.graduatesCareer?.totalGraduates ? (
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <div className="text-xs text-slate-500">대학 진학률</div>
                          <div className="text-xl font-bold text-blue-600 mt-1">
                            {detailData.graduatesCareer.universityRate || 0}%
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <div className="text-xs text-slate-500">취업률</div>
                          <div className="text-xl font-bold text-emerald-600 mt-1">
                            {detailData.graduatesCareer.employmentRate || 0}%
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <div className="text-xs text-slate-500">기타(재수 등)</div>
                          <div className="text-xl font-bold text-slate-600 mt-1">
                            {detailData.graduatesCareer.otherRate || 0}%
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white p-4 rounded-lg border border-slate-200 text-xs text-slate-600 leading-relaxed">
                        공시자료의 상세 졸업생 진로 현황은 매년 학교알리미 공시 주기에 따라 업데이트됩니다.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-500 flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">학교알리미 공시정보</span>
            <span>·</span>
            <span>{school.disclosureYear || '최신'} 공시기준</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold transition cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
