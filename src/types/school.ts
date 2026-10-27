export type GenderType = '남학교' | '여학교' | '남녀공학' | '기타';
export type FoundationType = '공립' | '사립' | '국립' | '기타';
export type SchoolType = '일반고' | '자사고' | '특목고' | '영재고' | '특성화고' | '학력인정고' | '기타';

export interface School {
  schoolCode: string;
  schoolName: string;
  district: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  hasLocation: boolean;
  phone: string;
  homepage: string;
  genderType: GenderType;
  foundationType: FoundationType;
  schoolType: SchoolType;
  rawSchoolType?: string;
  studentCount?: number;
  classCount?: number;
  teacherCount?: number;
  disclosureYear?: string;
  eduOfficeName?: string;
  zipCode?: string;
}

export interface SchoolsApiResponse {
  success: boolean;
  totalSchools: number;
  locatedSchools: number;
  unlocatedSchools: number;
  totalDistricts: number;
  successfulDistricts: number;
  failedDistricts: string[];
  schools: School[];
  error?: string;
}

export interface SchoolDetailData {
  schoolCode: string;
  schoolName: string;
  basicInfo: School;
  studentStatus?: {
    totalStudents?: number;
    boysCount?: number;
    girlsCount?: number;
    grade1Students?: number;
    grade2Students?: number;
    grade3Students?: number;
    totalClasses?: number;
    grade1Classes?: number;
    grade2Classes?: number;
    grade3Classes?: number;
    studentsPerClassCalc?: number; // 공시자료 기준 계산값
    teacherCount?: number;
    year?: string;
  };
  admissionInfo?: {
    title?: string;
    description?: string;
    fileUrl?: string;
    fileType?: string;
    year?: string;
    details?: string[];
  };
  curriculum?: {
    title?: string;
    description?: string;
    fileUrl?: string;
    subjects?: { grade: string; courses: string[] }[];
    year?: string;
  };
  features?: {
    specialPrograms?: string[];
    clubs?: string[];
    afterSchool?: string[];
    facilities?: string[];
    libraryStatus?: string;
  };
  graduatesCareer?: {
    year?: string;
    universityRate?: number;
    employmentRate?: number;
    otherRate?: number;
    totalGraduates?: number;
    universityCount?: number;
    employmentCount?: number;
    otherCount?: number;
  };
  sourceStatus: 'loaded' | 'no_disclosure' | 'api_error';
  errorMessage?: string;
}
