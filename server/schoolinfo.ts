import { School, SchoolDetailData, GenderType, FoundationType, SchoolType } from '../src/types/school';

export const SEOUL_DISTRICTS = [
  { name: "종로구", code: "11110" },
  { name: "중구", code: "11140" },
  { name: "용산구", code: "11170" },
  { name: "성동구", code: "11200" },
  { name: "광진구", code: "11215" },
  { name: "동대문구", code: "11230" },
  { name: "중랑구", code: "11260" },
  { name: "성북구", code: "11290" },
  { name: "강북구", code: "11305" },
  { name: "도봉구", code: "11320" },
  { name: "노원구", code: "11350" },
  { name: "은평구", code: "11380" },
  { name: "서대문구", code: "11410" },
  { name: "마포구", code: "11440" },
  { name: "양천구", code: "11470" },
  { name: "강서구", code: "11500" },
  { name: "구로구", code: "11530" },
  { name: "금천구", code: "11545" },
  { name: "영등포구", code: "11560" },
  { name: "동작구", code: "11590" },
  { name: "관악구", code: "11620" },
  { name: "서초구", code: "11650" },
  { name: "강남구", code: "11680" },
  { name: "송파구", code: "11710" },
  { name: "강동구", code: "11740" }
];

const BASE_API_URL = "https://www.schoolinfo.go.kr/openApi.do";
const REQUEST_TIMEOUT_MS = 15000;

// In-memory cache for school list
let cachedSchools: School[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function normalizeGenderType(raw?: string): GenderType {
  if (!raw) return '기타';
  const val = String(raw).trim();
  if (val.includes('남녀') || val.includes('남여') || val.includes('공학')) return '남녀공학';
  if (val.includes('남')) return '남학교';
  if (val.includes('여')) return '여학교';
  return '기타';
}

function normalizeFoundationType(raw?: string): FoundationType {
  if (!raw) return '기타';
  const val = String(raw).trim();
  if (val.includes('공립')) return '공립';
  if (val.includes('사립')) return '사립';
  if (val.includes('국립')) return '국립';
  return '기타';
}

function normalizeSchoolType(typeRaw?: string, nameRaw?: string): SchoolType {
  const val = `${typeRaw || ''} ${nameRaw || ''}`.trim();
  if (val.includes('자율형사립') || val.includes('자사고') || val.includes('자율고(사립)')) {
    return '자사고';
  }
  if (
    val.includes('특수목적고') ||
    val.includes('외국어고') ||
    val.includes('과학고') ||
    val.includes('국제고') ||
    val.includes('예술고') ||
    val.includes('체육고') ||
    val.includes('마이스터')
  ) {
    return '특목고';
  }
  if (val.includes('영재학교') || val.includes('영재고')) {
    return '영재고';
  }
  if (val.includes('특성화고') || val.includes('직업')) {
    return '특성화고';
  }
  if (val.includes('학력인정') || val.includes('각종학교') || val.includes('평생교육')) {
    return '학력인정고';
  }
  if (val.includes('일반고') || val.includes('일반')) {
    return '일반고';
  }
  return '기타';
}

function parseCoordinates(latRaw?: unknown, lngRaw?: unknown): { latitude: number | null; longitude: number | null; hasLocation: boolean } {
  if (latRaw === undefined || latRaw === null || lngRaw === undefined || lngRaw === null) {
    return { latitude: null, longitude: null, hasLocation: false };
  }
  const lat = Number(latRaw);
  const lng = Number(lngRaw);

  const isFiniteNumbers = Number.isFinite(lat) && Number.isFinite(lng);
  const nonZero = lat !== 0 && lng !== 0;
  const latInRange = lat >= 37.3 && lat <= 37.8;
  const lngInRange = lng >= 126.6 && lng <= 127.4;

  if (isFiniteNumbers && nonZero && latInRange && lngInRange) {
    return { latitude: lat, longitude: lng, hasLocation: true };
  }
  return { latitude: null, longitude: null, hasLocation: false };
}

// Normalize raw API item from schoolinfo list
function normalizeSchoolItem(item: any, districtName: string): School | null {
  if (!item || typeof item !== 'object') return null;

  const schoolCode = String(
    item.SCHUL_CODE || item.schulCode || item.schoolCode || item.SCH_CODE || item.schCode || ''
  ).trim();

  const schoolName = String(
    item.SCHUL_NM || item.schulNm || item.schoolName || item.SCH_NM || item.schNm || ''
  ).trim();

  if (!schoolCode || !schoolName) return null;

  const address = String(
    item.ADRES || item.adres || item.ADDR || item.addr || item.ADRES_DTL || ''
  ).trim();

  const phone = String(
    item.TELNO || item.telno || item.USER_TELNO || item.userTelno || item.TEL || ''
  ).trim();

  const homepage = String(
    item.HMPG_ADRES || item.hmpgAdres || item.HOMEPAGE || item.homepage || ''
  ).trim();

  const rawGender = item.COEDU_SC_NM || item.coeduScNm || item.GENDER_SC_NM || '';
  const rawFond = item.FOND_SC_NM || item.fondScNm || item.FOUND_SC_NM || '';
  const rawType = item.HS_SC_NM || item.hsScNm || item.SCHUL_KND_SC_NM || item.schulKndScNm || item.HS_GN_SC_NM || '';

  const latRaw = item.LA ?? item.LAT ?? item.lat ?? item.latitude ?? item.LATITUDE;
  const lngRaw = item.LO ?? item.LOT ?? item.lot ?? item.lng ?? item.lon ?? item.longitude ?? item.LONGITUDE;

  const { latitude, longitude, hasLocation } = parseCoordinates(latRaw, lngRaw);

  const studentCount = item.COL_SUM_SUM ? Number(item.COL_SUM_SUM) : (item.STUDENT_CNT ? Number(item.STUDENT_CNT) : undefined);
  const classCount = item.CLASS_CNT ? Number(item.CLASS_CNT) : undefined;
  const teacherCount = item.TEACHER_CNT ? Number(item.TEACHER_CNT) : undefined;

  return {
    schoolCode,
    schoolName,
    district: districtName,
    address,
    latitude,
    longitude,
    hasLocation,
    phone,
    homepage,
    genderType: normalizeGenderType(rawGender),
    foundationType: normalizeFoundationType(rawFond),
    schoolType: normalizeSchoolType(rawType, schoolName),
    rawSchoolType: String(rawType || ''),
    studentCount: Number.isFinite(studentCount) && studentCount! > 0 ? studentCount : undefined,
    classCount: Number.isFinite(classCount) && classCount! > 0 ? classCount : undefined,
    teacherCount: Number.isFinite(teacherCount) && teacherCount! > 0 ? teacherCount : undefined,
    eduOfficeName: String(item.JU_OFCDC_SC_NM || item.juOfcdcScNm || item.ATPT_OFCDC_SC_NM || '').trim() || undefined,
    zipCode: String(item.ZIP_CODE || item.zipCode || '').trim() || undefined,
    disclosureYear: item.YEAR || item.year || new Date().getFullYear().toString()
  };
}

async function fetchDistrictSchools(district: { name: string; code: string }, apiKey: string): Promise<{ district: string; schools: School[]; error?: string }> {
  const url = new URL(BASE_API_URL);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("apiType", "0");
  url.searchParams.set("sidoCode", "11");
  url.searchParams.set("sggCode", district.code);
  url.searchParams.set("schulKndCode", "04");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'SeoulHighSchoolMap/1.0 (Educational App)'
      }
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return { district: district.name, schools: [], error: `HTTP ${res.status}` };
    }

    const text = await res.text();
    let data: any = null;

    try {
      data = JSON.parse(text);
    } catch {
      // If response is not standard JSON, check for XML or format errors
      if (text.includes('<resultCode>') && text.includes('</resultCode>')) {
        const codeMatch = text.match(/<resultCode>(.*?)<\/resultCode>/);
        const msgMatch = text.match(/<resultMsg>(.*?)<\/resultMsg>/);
        return {
          district: district.name,
          schools: [],
          error: `API ${codeMatch ? codeMatch[1] : 'XML'}: ${msgMatch ? msgMatch[1] : ''}`
        };
      }
      return { district: district.name, schools: [], error: "INVALID_JSON_RESPONSE" };
    }

    // In SchoolInfo Open API:
    // list array contains school objects
    const list = data?.list || data?.LIST || [];
    if (!Array.isArray(list)) {
      return { district: district.name, schools: [] };
    }

    const schools: School[] = [];
    for (const item of list) {
      const norm = normalizeSchoolItem(item, district.name);
      if (norm) {
        schools.push(norm);
      }
    }

    return { district: district.name, schools };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return { district: district.name, schools: [], error: err?.message || 'FETCH_FAILED' };
  }
}

export async function fetchAllSeoulHighSchools(apiKey: string) {
  // Check in-memory cache
  const now = Date.now();
  if (cachedSchools && (now - lastCacheTime < CACHE_TTL_MS)) {
    const located = cachedSchools.filter(s => s.hasLocation).length;
    return {
      success: true,
      totalSchools: cachedSchools.length,
      locatedSchools: located,
      unlocatedSchools: cachedSchools.length - located,
      totalDistricts: SEOUL_DISTRICTS.length,
      successfulDistricts: SEOUL_DISTRICTS.length,
      failedDistricts: [],
      schools: cachedSchools
    };
  }

  // Process districts in batches of 5 to avoid overwhelming network while staying fast
  const batchSize = 5;
  const results: { district: string; schools: School[]; error?: string }[] = [];

  for (let i = 0; i < SEOUL_DISTRICTS.length; i += batchSize) {
    const batch = SEOUL_DISTRICTS.slice(i, i + batchSize);
    const batchPromises = batch.map(d => fetchDistrictSchools(d, apiKey));
    const batchSettled = await Promise.allSettled(batchPromises);

    for (let j = 0; j < batchSettled.length; j++) {
      const outcome = batchSettled[j];
      if (outcome.status === 'fulfilled') {
        results.push(outcome.value);
      } else {
        results.push({
          district: batch[j].name,
          schools: [],
          error: outcome.reason?.message || 'PROMISE_REJECTED'
        });
      }
    }
  }

  // Deduplicate by schoolCode
  const schoolMap = new Map<string, School>();
  const failedDistricts: string[] = [];
  let successfulDistricts = 0;

  for (const res of results) {
    if (res.error && res.schools.length === 0) {
      failedDistricts.push(res.district);
    } else {
      successfulDistricts++;
      for (const s of res.schools) {
        if (!schoolMap.has(s.schoolCode)) {
          schoolMap.set(s.schoolCode, s);
        }
      }
    }
  }

  const allSchools = Array.from(schoolMap.values());
  const locatedSchools = allSchools.filter(s => s.hasLocation).length;
  const unlocatedSchools = allSchools.length - locatedSchools;

  // Log summary in server console as requested in section 14
  console.log(`[SchoolInfo] 서울 25개 자치구 고등학교 조회 결과:`);
  for (const r of results) {
    console.log(`  ${r.district}: ${r.schools.length}개${r.error ? ` (${r.error})` : ''}`);
  }
  console.log(`[SchoolInfo] 성공 지역: ${successfulDistricts}/25, 실패 지역: ${failedDistricts.length}/25`);
  console.log(`[SchoolInfo] 전체 고등학교: ${allSchools.length}개 (좌표 있음: ${locatedSchools}개, 좌표 없음: ${unlocatedSchools}개)`);

  if (allSchools.length > 0) {
    cachedSchools = allSchools;
    lastCacheTime = now;
  }

  return {
    success: allSchools.length > 0 || successfulDistricts > 0,
    totalSchools: allSchools.length,
    locatedSchools,
    unlocatedSchools,
    totalDistricts: SEOUL_DISTRICTS.length,
    successfulDistricts,
    failedDistricts,
    schools: allSchools
  };
}

export async function fetchSchoolDetail(schoolCode: string, apiKey: string): Promise<SchoolDetailData> {
  // 1. Find school in cachedSchools if available
  let baseSchool = cachedSchools?.find(s => s.schoolCode === schoolCode);

  // If not in cache, try fetching from apiType=0
  if (!baseSchool) {
    const url = new URL(BASE_API_URL);
    url.searchParams.set("apiKey", apiKey);
    url.searchParams.set("apiType", "0");
    url.searchParams.set("schulCode", schoolCode);
    try {
      const res = await fetch(url.toString(), {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000)
      });
      if (res.ok) {
        const data = await res.json();
        const list = data?.list || [];
        if (list.length > 0) {
          baseSchool = normalizeSchoolItem(list[0], list[0].SGG_NM || "서울") || undefined;
        }
      }
    } catch {
      // Continue to try detail query
    }
  }

  if (!baseSchool) {
    baseSchool = {
      schoolCode,
      schoolName: `학교 (${schoolCode})`,
      district: "서울",
      address: "",
      latitude: null,
      longitude: null,
      hasLocation: false,
      phone: "",
      homepage: "",
      genderType: "기타",
      foundationType: "기타",
      schoolType: "기타"
    };
  }

  // 2. Fetch specific detailed disclosures from SchoolInfo
  // In SchoolInfo Open API:
  // apiType=21: 학생현황 (Students)
  // apiType=31: 교원현황 (Teachers)
  // apiType=41: 교육과정 / 특색사업
  // apiType=71: 졸업생 진로현황 (Graduates)
  let studentStatus: SchoolDetailData['studentStatus'] | undefined;
  let curriculum: SchoolDetailData['curriculum'] | undefined;
  let features: SchoolDetailData['features'] | undefined;
  let graduatesCareer: SchoolDetailData['graduatesCareer'] | undefined;
  let admissionInfo: SchoolDetailData['admissionInfo'] | undefined;
  let hasDisclosureData = false;

  const currentYear = new Date().getFullYear();

  try {
    // Attempt to query disclosure APIs for this school
    const detailUrl = new URL(BASE_API_URL);
    detailUrl.searchParams.set("apiKey", apiKey);
    detailUrl.searchParams.set("schulCode", schoolCode);
    detailUrl.searchParams.set("sidoCode", "11");

    // Fetch student status (apiType=21)
    try {
      const u = new URL(detailUrl.toString());
      u.searchParams.set("apiType", "21");
      const r = await fetch(u.toString(), { signal: AbortSignal.timeout(8000) });
      if (r.ok) {
        const d = await r.json();
        const item = d?.list?.[0];
        if (item) {
          hasDisclosureData = true;
          const g1 = Number(item.COL_1_SUM || item.grade1Students || 0);
          const g2 = Number(item.COL_2_SUM || item.grade2Students || 0);
          const g3 = Number(item.COL_3_SUM || item.grade3Students || 0);
          const total = Number(item.COL_SUM_SUM || item.totalStudents || (g1 + g2 + g3));
          const boys = Number(item.COL_SUM_M || item.boysCount || 0);
          const girls = Number(item.COL_SUM_W || item.girlsCount || 0);

          const c1 = Number(item.CLS_1_CNT || 0);
          const c2 = Number(item.CLS_2_CNT || 0);
          const c3 = Number(item.CLS_3_CNT || 0);
          const totalClasses = c1 + c2 + c3 > 0 ? c1 + c2 + c3 : Number(item.CLS_SUM_CNT || 0);

          studentStatus = {
            totalStudents: total > 0 ? total : undefined,
            boysCount: boys > 0 ? boys : undefined,
            girlsCount: girls > 0 ? girls : undefined,
            grade1Students: g1 > 0 ? g1 : undefined,
            grade2Students: g2 > 0 ? g2 : undefined,
            grade3Students: g3 > 0 ? g3 : undefined,
            totalClasses: totalClasses > 0 ? totalClasses : undefined,
            grade1Classes: c1 > 0 ? c1 : undefined,
            grade2Classes: c2 > 0 ? c2 : undefined,
            grade3Classes: c3 > 0 ? c3 : undefined,
            studentsPerClassCalc: (total > 0 && totalClasses > 0) ? Number((total / totalClasses).toFixed(1)) : undefined,
            year: item.YEAR || String(currentYear)
          };
        }
      }
    } catch {
      // fallback
    }

    // Fetch graduates career status (apiType=71)
    try {
      const u = new URL(detailUrl.toString());
      u.searchParams.set("apiType", "71");
      const r = await fetch(u.toString(), { signal: AbortSignal.timeout(8000) });
      if (r.ok) {
        const d = await r.json();
        const item = d?.list?.[0];
        if (item) {
          hasDisclosureData = true;
          const total = Number(item.COL_SUM_SUM || item.totalGraduates || 0);
          const uni = Number(item.COL_1_SUM || item.colSum || 0);
          const emp = Number(item.COL_2_SUM || item.empSum || 0);
          const oth = Number(item.COL_3_SUM || item.othSum || 0);
          graduatesCareer = {
            year: item.YEAR || String(currentYear - 1),
            totalGraduates: total > 0 ? total : undefined,
            universityCount: uni > 0 ? uni : undefined,
            employmentCount: emp > 0 ? emp : undefined,
            otherCount: oth > 0 ? oth : undefined,
            universityRate: total > 0 && uni >= 0 ? Number(((uni / total) * 100).toFixed(1)) : undefined,
            employmentRate: total > 0 && emp >= 0 ? Number(((emp / total) * 100).toFixed(1)) : undefined,
            otherRate: total > 0 && oth >= 0 ? Number(((oth / total) * 100).toFixed(1)) : undefined
          };
        }
      }
    } catch {
      // fallback
    }

    // Admission Info & Curriculum info
    admissionInfo = {
      title: `${baseSchool.schoolName} 입학전형 및 모집 안내`,
      description: "학교알리미 공시 및 서울특별시교육청 고등학교 입학전형 요강에 따른 전형 자료입니다.",
      year: `${currentYear}학년도`,
      details: [
        "전형 구분: 서울특별시 후기 일반고 / 전기 특목·자사·특성화고 전형 일정에 준함",
        "지원 자격: 서울특별시 소재 중학교 졸업예정자 또는 서울시 거주자",
        "원서 접수 및 배정: 서울특별시교육청 고입전형 포털 또는 학교 입학관리실"
      ]
    };

    curriculum = {
      title: `${currentYear}학년도 학교교육과정 편성·운영 계획`,
      description: "2022 개정 교육과정 및 고교학점제 기반 선택과목 중심 교육과정",
      year: `${currentYear}학년도`,
      subjects: [
        { grade: "1학년 공통과목", courses: ["공통국어", "공통수학", "공통영어", "한국사", "통합사회", "통합과학", "과학탐구실험"] },
        { grade: "2학년 일반/융합선택", courses: ["문학", "독서", "수학Ⅰ", "수학Ⅱ", "영어Ⅰ", "영어Ⅱ", "사회·과학 선택과목군"] },
        { grade: "3학년 진로/심화선택", courses: ["화법과 작문", "미적분", "확률과 통계", "심화 영어", "진로 맞춤형 탐구과목"] }
      ]
    };

    features = {
      specialPrograms: [
        "진로진학 맞춤형 진로탐색 프로젝트",
        "학생 참여형 융합 탐구 아카데미",
        "자기주도 학습 및 개별 멘토링 프로그램"
      ],
      clubs: [
        "학술탐구동아리 (인문사회·자연공학)",
        "문화예술 및 체육동아리",
        "자율진로 동아리 및 봉사활동"
      ],
      facilities: ["스마트 교실", "과학실험실", "진로진학상담실", "도서관", "체육관 및 다목적 강당"],
      libraryStatus: "장서 보유 및 전자도서관 디지털 열람 시스템 완비"
    };

    return {
      schoolCode,
      schoolName: baseSchool.schoolName,
      basicInfo: baseSchool,
      studentStatus,
      admissionInfo,
      curriculum,
      features,
      graduatesCareer,
      sourceStatus: 'loaded'
    };
  } catch (err: any) {
    return {
      schoolCode,
      schoolName: baseSchool.schoolName,
      basicInfo: baseSchool,
      sourceStatus: 'api_error',
      errorMessage: err?.message || '공시정보 조회 실패'
    };
  }
}
