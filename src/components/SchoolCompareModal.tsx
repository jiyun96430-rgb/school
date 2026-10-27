import React from 'react';
import { School } from '../types/school';
import { SCHOOL_TYPE_COLORS } from './SchoolMap';
import { X, Scale, Users, Building, Phone, MapPin, Trash2 } from 'lucide-react';

interface SchoolCompareModalProps {
  schools: School[];
  isOpen: boolean;
  onClose: () => void;
  onRemoveSchool: (schoolCode: string) => void;
  onClearAll: () => void;
  onSelectSchool: (school: School) => void;
}

export const SchoolCompareModal: React.FC<SchoolCompareModalProps> = ({
  schools,
  isOpen,
  onClose,
  onRemoveSchool,
  onClearAll,
  onSelectSchool
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                학교 비교함 ({schools.length}/4)
              </h2>
              <p className="text-xs text-slate-500">
                선택한 학교들의 기본 및 공시 정보를 한눈에 비교합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {schools.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-xs text-slate-500 hover:text-red-600 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-red-200 hover:bg-red-50 transition cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                전체 비우기
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {schools.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Scale className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
              <p className="text-sm font-semibold text-slate-700">비교할 학교가 선택되지 않았습니다.</p>
              <p className="text-xs text-slate-500 mt-1">
                학교 목록 카드나 상세정보에서 [비교함에 추가] 아이콘을 눌러보세요 (최대 4개).
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs min-w-[650px]">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="p-3 bg-slate-50 font-bold text-slate-600 w-36 rounded-tl-lg">
                      비교 항목
                    </th>
                    {schools.map((school) => {
                      const typeConfig = SCHOOL_TYPE_COLORS[school.schoolType] || SCHOOL_TYPE_COLORS['기타'];
                      return (
                        <th key={school.schoolCode} className="p-3 bg-slate-50/50 min-w-[200px]">
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-2xs"
                              style={{ backgroundColor: typeConfig.bg }}
                            >
                              {school.schoolType}
                            </span>
                            <button
                              onClick={() => onRemoveSchool(school.schoolCode)}
                              title="비교함에서 삭제"
                              className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div
                            onClick={() => {
                              onClose();
                              onSelectSchool(school);
                            }}
                            className="font-bold text-sm text-slate-900 hover:text-blue-600 cursor-pointer truncate"
                          >
                            {school.schoolName}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {/* 자치구 */}
                  <tr>
                    <td className="p-3 font-semibold text-slate-500 bg-slate-50/50">지역 (구)</td>
                    {schools.map((s) => (
                      <td key={s.schoolCode} className="p-3 font-medium">
                        {s.district}
                      </td>
                    ))}
                  </tr>

                  {/* 남녀 구분 */}
                  <tr>
                    <td className="p-3 font-semibold text-slate-500 bg-slate-50/50">남녀 구분</td>
                    {schools.map((s) => (
                      <td key={s.schoolCode} className="p-3 font-medium">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                          {s.genderType}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* 설립 구분 */}
                  <tr>
                    <td className="p-3 font-semibold text-slate-500 bg-slate-50/50">설립 구분</td>
                    {schools.map((s) => (
                      <td key={s.schoolCode} className="p-3 font-medium">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                          {s.foundationType}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* 관할 교육지원청 */}
                  <tr>
                    <td className="p-3 font-semibold text-slate-500 bg-slate-50/50">관할 교육지원청</td>
                    {schools.map((s) => (
                      <td key={s.schoolCode} className="p-3">
                        {s.eduOfficeName || '서울특별시교육청'}
                      </td>
                    ))}
                  </tr>

                  {/* 학생 수 */}
                  <tr>
                    <td className="p-3 font-semibold text-slate-500 bg-slate-50/50">총 학생 수</td>
                    {schools.map((s) => (
                      <td key={s.schoolCode} className="p-3 font-bold text-blue-700">
                        {s.studentCount ? `${s.studentCount.toLocaleString()}명` : '공시자료 확인'}
                      </td>
                    ))}
                  </tr>

                  {/* 학급 수 */}
                  <tr>
                    <td className="p-3 font-semibold text-slate-500 bg-slate-50/50">총 학급 수</td>
                    {schools.map((s) => (
                      <td key={s.schoolCode} className="p-3 font-medium">
                        {s.classCount ? `${s.classCount}학급` : '공시자료 확인'}
                      </td>
                    ))}
                  </tr>

                  {/* 학급당 학생 수 */}
                  <tr>
                    <td className="p-3 font-semibold text-slate-500 bg-slate-50/50">학급당 학생 수</td>
                    {schools.map((s) => (
                      <td key={s.schoolCode} className="p-3 font-bold text-slate-900">
                        {s.studentCount && s.classCount ? (
                          <div>
                            <span>{(s.studentCount / s.classCount).toFixed(1)}명</span>
                            <span className="text-[10px] text-slate-400 block font-normal">공시자료 기준</span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* 교원 수 */}
                  <tr>
                    <td className="p-3 font-semibold text-slate-500 bg-slate-50/50">교원 수</td>
                    {schools.map((s) => (
                      <td key={s.schoolCode} className="p-3 font-medium">
                        {s.teacherCount ? `${s.teacherCount}명` : '공시자료 확인'}
                      </td>
                    ))}
                  </tr>

                  {/* 전화번호 */}
                  <tr>
                    <td className="p-3 font-semibold text-slate-500 bg-slate-50/50">전화번호</td>
                    {schools.map((s) => (
                      <td key={s.schoolCode} className="p-3">
                        {s.phone || '-'}
                      </td>
                    ))}
                  </tr>

                  {/* 주소 */}
                  <tr>
                    <td className="p-3 font-semibold text-slate-500 bg-slate-50/50">주소</td>
                    {schools.map((s) => (
                      <td key={s.schoolCode} className="p-3 text-[11px] text-slate-600">
                        {s.address || '-'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition cursor-pointer"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};
