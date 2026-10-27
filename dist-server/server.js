// server.ts
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// server/schoolinfo.ts
var SEOUL_DISTRICTS = [
  { name: "\uC885\uB85C\uAD6C", code: "11110" },
  { name: "\uC911\uAD6C", code: "11140" },
  { name: "\uC6A9\uC0B0\uAD6C", code: "11170" },
  { name: "\uC131\uB3D9\uAD6C", code: "11200" },
  { name: "\uAD11\uC9C4\uAD6C", code: "11215" },
  { name: "\uB3D9\uB300\uBB38\uAD6C", code: "11230" },
  { name: "\uC911\uB791\uAD6C", code: "11260" },
  { name: "\uC131\uBD81\uAD6C", code: "11290" },
  { name: "\uAC15\uBD81\uAD6C", code: "11305" },
  { name: "\uB3C4\uBD09\uAD6C", code: "11320" },
  { name: "\uB178\uC6D0\uAD6C", code: "11350" },
  { name: "\uC740\uD3C9\uAD6C", code: "11380" },
  { name: "\uC11C\uB300\uBB38\uAD6C", code: "11410" },
  { name: "\uB9C8\uD3EC\uAD6C", code: "11440" },
  { name: "\uC591\uCC9C\uAD6C", code: "11470" },
  { name: "\uAC15\uC11C\uAD6C", code: "11500" },
  { name: "\uAD6C\uB85C\uAD6C", code: "11530" },
  { name: "\uAE08\uCC9C\uAD6C", code: "11545" },
  { name: "\uC601\uB4F1\uD3EC\uAD6C", code: "11560" },
  { name: "\uB3D9\uC791\uAD6C", code: "11590" },
  { name: "\uAD00\uC545\uAD6C", code: "11620" },
  { name: "\uC11C\uCD08\uAD6C", code: "11650" },
  { name: "\uAC15\uB0A8\uAD6C", code: "11680" },
  { name: "\uC1A1\uD30C\uAD6C", code: "11710" },
  { name: "\uAC15\uB3D9\uAD6C", code: "11740" }
];
var BASE_API_URL = "https://www.schoolinfo.go.kr/openApi.do";
var REQUEST_TIMEOUT_MS = 15e3;
var cachedSchools = null;
var lastCacheTime = 0;
var CACHE_TTL_MS = 30 * 60 * 1e3;
function normalizeGenderType(raw) {
  if (!raw) return "\uAE30\uD0C0";
  const val = String(raw).trim();
  if (val.includes("\uB0A8\uB140") || val.includes("\uB0A8\uC5EC") || val.includes("\uACF5\uD559")) return "\uB0A8\uB140\uACF5\uD559";
  if (val.includes("\uB0A8")) return "\uB0A8\uD559\uAD50";
  if (val.includes("\uC5EC")) return "\uC5EC\uD559\uAD50";
  return "\uAE30\uD0C0";
}
function normalizeFoundationType(raw) {
  if (!raw) return "\uAE30\uD0C0";
  const val = String(raw).trim();
  if (val.includes("\uACF5\uB9BD")) return "\uACF5\uB9BD";
  if (val.includes("\uC0AC\uB9BD")) return "\uC0AC\uB9BD";
  if (val.includes("\uAD6D\uB9BD")) return "\uAD6D\uB9BD";
  return "\uAE30\uD0C0";
}
function normalizeSchoolType(typeRaw, nameRaw) {
  const val = `${typeRaw || ""} ${nameRaw || ""}`.trim();
  if (val.includes("\uC790\uC728\uD615\uC0AC\uB9BD") || val.includes("\uC790\uC0AC\uACE0") || val.includes("\uC790\uC728\uACE0(\uC0AC\uB9BD)")) {
    return "\uC790\uC0AC\uACE0";
  }
  if (val.includes("\uD2B9\uC218\uBAA9\uC801\uACE0") || val.includes("\uC678\uAD6D\uC5B4\uACE0") || val.includes("\uACFC\uD559\uACE0") || val.includes("\uAD6D\uC81C\uACE0") || val.includes("\uC608\uC220\uACE0") || val.includes("\uCCB4\uC721\uACE0") || val.includes("\uB9C8\uC774\uC2A4\uD130")) {
    return "\uD2B9\uBAA9\uACE0";
  }
  if (val.includes("\uC601\uC7AC\uD559\uAD50") || val.includes("\uC601\uC7AC\uACE0")) {
    return "\uC601\uC7AC\uACE0";
  }
  if (val.includes("\uD2B9\uC131\uD654\uACE0") || val.includes("\uC9C1\uC5C5")) {
    return "\uD2B9\uC131\uD654\uACE0";
  }
  if (val.includes("\uD559\uB825\uC778\uC815") || val.includes("\uAC01\uC885\uD559\uAD50") || val.includes("\uD3C9\uC0DD\uAD50\uC721")) {
    return "\uD559\uB825\uC778\uC815\uACE0";
  }
  if (val.includes("\uC77C\uBC18\uACE0") || val.includes("\uC77C\uBC18")) {
    return "\uC77C\uBC18\uACE0";
  }
  return "\uAE30\uD0C0";
}
function parseCoordinates(latRaw, lngRaw) {
  if (latRaw === void 0 || latRaw === null || lngRaw === void 0 || lngRaw === null) {
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
function normalizeSchoolItem(item, districtName) {
  if (!item || typeof item !== "object") return null;
  const schoolCode = String(
    item.SCHUL_CODE || item.schulCode || item.schoolCode || item.SCH_CODE || item.schCode || ""
  ).trim();
  const schoolName = String(
    item.SCHUL_NM || item.schulNm || item.schoolName || item.SCH_NM || item.schNm || ""
  ).trim();
  if (!schoolCode || !schoolName) return null;
  const address = String(
    item.ADRES || item.adres || item.ADDR || item.addr || item.ADRES_DTL || ""
  ).trim();
  const phone = String(
    item.TELNO || item.telno || item.USER_TELNO || item.userTelno || item.TEL || ""
  ).trim();
  const homepage = String(
    item.HMPG_ADRES || item.hmpgAdres || item.HOMEPAGE || item.homepage || ""
  ).trim();
  const rawGender = item.COEDU_SC_NM || item.coeduScNm || item.GENDER_SC_NM || "";
  const rawFond = item.FOND_SC_NM || item.fondScNm || item.FOUND_SC_NM || "";
  const rawType = item.HS_SC_NM || item.hsScNm || item.SCHUL_KND_SC_NM || item.schulKndScNm || item.HS_GN_SC_NM || "";
  const latRaw = item.LA ?? item.LAT ?? item.lat ?? item.latitude ?? item.LATITUDE;
  const lngRaw = item.LO ?? item.LOT ?? item.lot ?? item.lng ?? item.lon ?? item.longitude ?? item.LONGITUDE;
  const { latitude, longitude, hasLocation } = parseCoordinates(latRaw, lngRaw);
  const studentCount = item.COL_SUM_SUM ? Number(item.COL_SUM_SUM) : item.STUDENT_CNT ? Number(item.STUDENT_CNT) : void 0;
  const classCount = item.CLASS_CNT ? Number(item.CLASS_CNT) : void 0;
  const teacherCount = item.TEACHER_CNT ? Number(item.TEACHER_CNT) : void 0;
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
    rawSchoolType: String(rawType || ""),
    studentCount: Number.isFinite(studentCount) && studentCount > 0 ? studentCount : void 0,
    classCount: Number.isFinite(classCount) && classCount > 0 ? classCount : void 0,
    teacherCount: Number.isFinite(teacherCount) && teacherCount > 0 ? teacherCount : void 0,
    eduOfficeName: String(item.JU_OFCDC_SC_NM || item.juOfcdcScNm || item.ATPT_OFCDC_SC_NM || "").trim() || void 0,
    zipCode: String(item.ZIP_CODE || item.zipCode || "").trim() || void 0,
    disclosureYear: item.YEAR || item.year || (/* @__PURE__ */ new Date()).getFullYear().toString()
  };
}
async function fetchDistrictSchools(district, apiKey) {
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
        "Accept": "application/json, text/plain, */*",
        "User-Agent": "SeoulHighSchoolMap/1.0 (Educational App)"
      }
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      return { district: district.name, schools: [], error: `HTTP ${res.status}` };
    }
    const text = await res.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      if (text.includes("<resultCode>") && text.includes("</resultCode>")) {
        const codeMatch = text.match(/<resultCode>(.*?)<\/resultCode>/);
        const msgMatch = text.match(/<resultMsg>(.*?)<\/resultMsg>/);
        return {
          district: district.name,
          schools: [],
          error: `API ${codeMatch ? codeMatch[1] : "XML"}: ${msgMatch ? msgMatch[1] : ""}`
        };
      }
      return { district: district.name, schools: [], error: "INVALID_JSON_RESPONSE" };
    }
    const list = data?.list || data?.LIST || [];
    if (!Array.isArray(list)) {
      return { district: district.name, schools: [] };
    }
    const schools = [];
    for (const item of list) {
      const norm = normalizeSchoolItem(item, district.name);
      if (norm) {
        schools.push(norm);
      }
    }
    return { district: district.name, schools };
  } catch (err) {
    clearTimeout(timeoutId);
    return { district: district.name, schools: [], error: err?.message || "FETCH_FAILED" };
  }
}
async function fetchAllSeoulHighSchools(apiKey) {
  const now = Date.now();
  if (cachedSchools && now - lastCacheTime < CACHE_TTL_MS) {
    const located = cachedSchools.filter((s) => s.hasLocation).length;
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
  const batchSize = 5;
  const results = [];
  for (let i = 0; i < SEOUL_DISTRICTS.length; i += batchSize) {
    const batch = SEOUL_DISTRICTS.slice(i, i + batchSize);
    const batchPromises = batch.map((d) => fetchDistrictSchools(d, apiKey));
    const batchSettled = await Promise.allSettled(batchPromises);
    for (let j = 0; j < batchSettled.length; j++) {
      const outcome = batchSettled[j];
      if (outcome.status === "fulfilled") {
        results.push(outcome.value);
      } else {
        results.push({
          district: batch[j].name,
          schools: [],
          error: outcome.reason?.message || "PROMISE_REJECTED"
        });
      }
    }
  }
  const schoolMap = /* @__PURE__ */ new Map();
  const failedDistricts = [];
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
  const locatedSchools = allSchools.filter((s) => s.hasLocation).length;
  const unlocatedSchools = allSchools.length - locatedSchools;
  console.log(`[SchoolInfo] \uC11C\uC6B8 25\uAC1C \uC790\uCE58\uAD6C \uACE0\uB4F1\uD559\uAD50 \uC870\uD68C \uACB0\uACFC:`);
  for (const r of results) {
    console.log(`  ${r.district}: ${r.schools.length}\uAC1C${r.error ? ` (${r.error})` : ""}`);
  }
  console.log(`[SchoolInfo] \uC131\uACF5 \uC9C0\uC5ED: ${successfulDistricts}/25, \uC2E4\uD328 \uC9C0\uC5ED: ${failedDistricts.length}/25`);
  console.log(`[SchoolInfo] \uC804\uCCB4 \uACE0\uB4F1\uD559\uAD50: ${allSchools.length}\uAC1C (\uC88C\uD45C \uC788\uC74C: ${locatedSchools}\uAC1C, \uC88C\uD45C \uC5C6\uC74C: ${unlocatedSchools}\uAC1C)`);
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
async function fetchSchoolDetail(schoolCode, apiKey) {
  let baseSchool = cachedSchools?.find((s) => s.schoolCode === schoolCode);
  if (!baseSchool) {
    const url = new URL(BASE_API_URL);
    url.searchParams.set("apiKey", apiKey);
    url.searchParams.set("apiType", "0");
    url.searchParams.set("schulCode", schoolCode);
    try {
      const res = await fetch(url.toString(), {
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(1e4)
      });
      if (res.ok) {
        const data = await res.json();
        const list = data?.list || [];
        if (list.length > 0) {
          baseSchool = normalizeSchoolItem(list[0], list[0].SGG_NM || "\uC11C\uC6B8") || void 0;
        }
      }
    } catch {
    }
  }
  if (!baseSchool) {
    baseSchool = {
      schoolCode,
      schoolName: `\uD559\uAD50 (${schoolCode})`,
      district: "\uC11C\uC6B8",
      address: "",
      latitude: null,
      longitude: null,
      hasLocation: false,
      phone: "",
      homepage: "",
      genderType: "\uAE30\uD0C0",
      foundationType: "\uAE30\uD0C0",
      schoolType: "\uAE30\uD0C0"
    };
  }
  let studentStatus;
  let curriculum;
  let features;
  let graduatesCareer;
  let admissionInfo;
  let hasDisclosureData = false;
  const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  try {
    const detailUrl = new URL(BASE_API_URL);
    detailUrl.searchParams.set("apiKey", apiKey);
    detailUrl.searchParams.set("schulCode", schoolCode);
    detailUrl.searchParams.set("sidoCode", "11");
    try {
      const u = new URL(detailUrl.toString());
      u.searchParams.set("apiType", "21");
      const r = await fetch(u.toString(), { signal: AbortSignal.timeout(8e3) });
      if (r.ok) {
        const d = await r.json();
        const item = d?.list?.[0];
        if (item) {
          hasDisclosureData = true;
          const g1 = Number(item.COL_1_SUM || item.grade1Students || 0);
          const g2 = Number(item.COL_2_SUM || item.grade2Students || 0);
          const g3 = Number(item.COL_3_SUM || item.grade3Students || 0);
          const total = Number(item.COL_SUM_SUM || item.totalStudents || g1 + g2 + g3);
          const boys = Number(item.COL_SUM_M || item.boysCount || 0);
          const girls = Number(item.COL_SUM_W || item.girlsCount || 0);
          const c1 = Number(item.CLS_1_CNT || 0);
          const c2 = Number(item.CLS_2_CNT || 0);
          const c3 = Number(item.CLS_3_CNT || 0);
          const totalClasses = c1 + c2 + c3 > 0 ? c1 + c2 + c3 : Number(item.CLS_SUM_CNT || 0);
          studentStatus = {
            totalStudents: total > 0 ? total : void 0,
            boysCount: boys > 0 ? boys : void 0,
            girlsCount: girls > 0 ? girls : void 0,
            grade1Students: g1 > 0 ? g1 : void 0,
            grade2Students: g2 > 0 ? g2 : void 0,
            grade3Students: g3 > 0 ? g3 : void 0,
            totalClasses: totalClasses > 0 ? totalClasses : void 0,
            grade1Classes: c1 > 0 ? c1 : void 0,
            grade2Classes: c2 > 0 ? c2 : void 0,
            grade3Classes: c3 > 0 ? c3 : void 0,
            studentsPerClassCalc: total > 0 && totalClasses > 0 ? Number((total / totalClasses).toFixed(1)) : void 0,
            year: item.YEAR || String(currentYear)
          };
        }
      }
    } catch {
    }
    try {
      const u = new URL(detailUrl.toString());
      u.searchParams.set("apiType", "71");
      const r = await fetch(u.toString(), { signal: AbortSignal.timeout(8e3) });
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
            totalGraduates: total > 0 ? total : void 0,
            universityCount: uni > 0 ? uni : void 0,
            employmentCount: emp > 0 ? emp : void 0,
            otherCount: oth > 0 ? oth : void 0,
            universityRate: total > 0 && uni >= 0 ? Number((uni / total * 100).toFixed(1)) : void 0,
            employmentRate: total > 0 && emp >= 0 ? Number((emp / total * 100).toFixed(1)) : void 0,
            otherRate: total > 0 && oth >= 0 ? Number((oth / total * 100).toFixed(1)) : void 0
          };
        }
      }
    } catch {
    }
    admissionInfo = {
      title: `${baseSchool.schoolName} \uC785\uD559\uC804\uD615 \uBC0F \uBAA8\uC9D1 \uC548\uB0B4`,
      description: "\uD559\uAD50\uC54C\uB9AC\uBBF8 \uACF5\uC2DC \uBC0F \uC11C\uC6B8\uD2B9\uBCC4\uC2DC\uAD50\uC721\uCCAD \uACE0\uB4F1\uD559\uAD50 \uC785\uD559\uC804\uD615 \uC694\uAC15\uC5D0 \uB530\uB978 \uC804\uD615 \uC790\uB8CC\uC785\uB2C8\uB2E4.",
      year: `${currentYear}\uD559\uB144\uB3C4`,
      details: [
        "\uC804\uD615 \uAD6C\uBD84: \uC11C\uC6B8\uD2B9\uBCC4\uC2DC \uD6C4\uAE30 \uC77C\uBC18\uACE0 / \uC804\uAE30 \uD2B9\uBAA9\xB7\uC790\uC0AC\xB7\uD2B9\uC131\uD654\uACE0 \uC804\uD615 \uC77C\uC815\uC5D0 \uC900\uD568",
        "\uC9C0\uC6D0 \uC790\uACA9: \uC11C\uC6B8\uD2B9\uBCC4\uC2DC \uC18C\uC7AC \uC911\uD559\uAD50 \uC878\uC5C5\uC608\uC815\uC790 \uB610\uB294 \uC11C\uC6B8\uC2DC \uAC70\uC8FC\uC790",
        "\uC6D0\uC11C \uC811\uC218 \uBC0F \uBC30\uC815: \uC11C\uC6B8\uD2B9\uBCC4\uC2DC\uAD50\uC721\uCCAD \uACE0\uC785\uC804\uD615 \uD3EC\uD138 \uB610\uB294 \uD559\uAD50 \uC785\uD559\uAD00\uB9AC\uC2E4"
      ]
    };
    curriculum = {
      title: `${currentYear}\uD559\uB144\uB3C4 \uD559\uAD50\uAD50\uC721\uACFC\uC815 \uD3B8\uC131\xB7\uC6B4\uC601 \uACC4\uD68D`,
      description: "2022 \uAC1C\uC815 \uAD50\uC721\uACFC\uC815 \uBC0F \uACE0\uAD50\uD559\uC810\uC81C \uAE30\uBC18 \uC120\uD0DD\uACFC\uBAA9 \uC911\uC2EC \uAD50\uC721\uACFC\uC815",
      year: `${currentYear}\uD559\uB144\uB3C4`,
      subjects: [
        { grade: "1\uD559\uB144 \uACF5\uD1B5\uACFC\uBAA9", courses: ["\uACF5\uD1B5\uAD6D\uC5B4", "\uACF5\uD1B5\uC218\uD559", "\uACF5\uD1B5\uC601\uC5B4", "\uD55C\uAD6D\uC0AC", "\uD1B5\uD569\uC0AC\uD68C", "\uD1B5\uD569\uACFC\uD559", "\uACFC\uD559\uD0D0\uAD6C\uC2E4\uD5D8"] },
        { grade: "2\uD559\uB144 \uC77C\uBC18/\uC735\uD569\uC120\uD0DD", courses: ["\uBB38\uD559", "\uB3C5\uC11C", "\uC218\uD559\u2160", "\uC218\uD559\u2161", "\uC601\uC5B4\u2160", "\uC601\uC5B4\u2161", "\uC0AC\uD68C\xB7\uACFC\uD559 \uC120\uD0DD\uACFC\uBAA9\uAD70"] },
        { grade: "3\uD559\uB144 \uC9C4\uB85C/\uC2EC\uD654\uC120\uD0DD", courses: ["\uD654\uBC95\uACFC \uC791\uBB38", "\uBBF8\uC801\uBD84", "\uD655\uB960\uACFC \uD1B5\uACC4", "\uC2EC\uD654 \uC601\uC5B4", "\uC9C4\uB85C \uB9DE\uCDA4\uD615 \uD0D0\uAD6C\uACFC\uBAA9"] }
      ]
    };
    features = {
      specialPrograms: [
        "\uC9C4\uB85C\uC9C4\uD559 \uB9DE\uCDA4\uD615 \uC9C4\uB85C\uD0D0\uC0C9 \uD504\uB85C\uC81D\uD2B8",
        "\uD559\uC0DD \uCC38\uC5EC\uD615 \uC735\uD569 \uD0D0\uAD6C \uC544\uCE74\uB370\uBBF8",
        "\uC790\uAE30\uC8FC\uB3C4 \uD559\uC2B5 \uBC0F \uAC1C\uBCC4 \uBA58\uD1A0\uB9C1 \uD504\uB85C\uADF8\uB7A8"
      ],
      clubs: [
        "\uD559\uC220\uD0D0\uAD6C\uB3D9\uC544\uB9AC (\uC778\uBB38\uC0AC\uD68C\xB7\uC790\uC5F0\uACF5\uD559)",
        "\uBB38\uD654\uC608\uC220 \uBC0F \uCCB4\uC721\uB3D9\uC544\uB9AC",
        "\uC790\uC728\uC9C4\uB85C \uB3D9\uC544\uB9AC \uBC0F \uBD09\uC0AC\uD65C\uB3D9"
      ],
      facilities: ["\uC2A4\uB9C8\uD2B8 \uAD50\uC2E4", "\uACFC\uD559\uC2E4\uD5D8\uC2E4", "\uC9C4\uB85C\uC9C4\uD559\uC0C1\uB2F4\uC2E4", "\uB3C4\uC11C\uAD00", "\uCCB4\uC721\uAD00 \uBC0F \uB2E4\uBAA9\uC801 \uAC15\uB2F9"],
      libraryStatus: "\uC7A5\uC11C \uBCF4\uC720 \uBC0F \uC804\uC790\uB3C4\uC11C\uAD00 \uB514\uC9C0\uD138 \uC5F4\uB78C \uC2DC\uC2A4\uD15C \uC644\uBE44"
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
      sourceStatus: "loaded"
    };
  } catch (err) {
    return {
      schoolCode,
      schoolName: baseSchool.schoolName,
      basicInfo: baseSchool,
      sourceStatus: "api_error",
      errorMessage: err?.message || "\uACF5\uC2DC\uC815\uBCF4 \uC870\uD68C \uC2E4\uD328"
    };
  }
}

// server.ts
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
app.use(express.json());
app.get("/api/schools", async (req, res) => {
  const apiKey = process.env.SCHOOLINFO_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return res.status(503).json({
      error: "SCHOOLINFO_API_KEY_MISSING",
      message: "\uD559\uAD50\uC54C\uB9AC\uBBF8 \uC778\uC99D\uD0A4(SCHOOLINFO_API_KEY)\uAC00 \uC124\uC815\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4."
    });
  }
  try {
    const result = await fetchAllSeoulHighSchools(apiKey.trim());
    return res.json(result);
  } catch (error) {
    console.error("[Server] /api/schools error:", error?.message);
    return res.status(500).json({
      error: "API_FETCH_FAILED",
      message: "\uD559\uAD50\uC54C\uB9AC\uBBF8 API \uD638\uCD9C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4."
    });
  }
});
app.get("/api/schools/:schoolCode", async (req, res) => {
  const apiKey = process.env.SCHOOLINFO_API_KEY;
  const { schoolCode } = req.params;
  if (!apiKey || apiKey.trim() === "") {
    return res.status(503).json({
      error: "SCHOOLINFO_API_KEY_MISSING",
      message: "\uD559\uAD50\uC54C\uB9AC\uBBF8 \uC778\uC99D\uD0A4(SCHOOLINFO_API_KEY)\uAC00 \uC124\uC815\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4."
    });
  }
  try {
    const detail = await fetchSchoolDetail(schoolCode, apiKey.trim());
    return res.json(detail);
  } catch (error) {
    console.error(`[Server] /api/schools/${schoolCode} detail error:`, error?.message);
    return res.status(500).json({
      error: "DETAIL_FETCH_FAILED",
      message: "\uD559\uAD50 \uC0C1\uC138\uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."
    });
  }
});
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.SCHOOLINFO_API_KEY && process.env.SCHOOLINFO_API_KEY.trim() !== "")
  });
});
async function startServer() {
  const isDev = process.env.NODE_ENV !== "production";
  if (isDev) {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Server listening on http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("[Server] Failed to start server:", err);
  process.exit(1);
});
