import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import { School, SchoolType } from '../types/school';
import { TILE_CONFIG } from '../map/tileConfig';
import { Layers, RefreshCw, AlertTriangle, ChevronDown, ChevronUp, MapPin, Eye, EyeOff } from 'lucide-react';

interface SchoolMapProps {
  schools: School[];
  selectedSchool: School | null;
  onSelectSchool: (school: School) => void;
  selectedDistrict: string;
}

const SEOUL_BOUNDS: L.LatLngBoundsLiteral = [
  [37.413, 126.734], // SouthWest
  [37.715, 127.269]  // NorthEast
];

const MAX_SEOUL_BOUNDS: L.LatLngBoundsLiteral = [
  [37.25, 126.55],
  [37.85, 127.45]
];

export const SCHOOL_TYPE_COLORS: Record<SchoolType, { bg: string; text: string; label: string }> = {
  일반고: { bg: '#2563eb', text: '#ffffff', label: '일반고' },
  자사고: { bg: '#7c3aed', text: '#ffffff', label: '자사고' },
  특목고: { bg: '#059669', text: '#ffffff', label: '특목고' },
  영재고: { bg: '#d97706', text: '#ffffff', label: '영재고' },
  특성화고: { bg: '#ea580c', text: '#ffffff', label: '특성화고' },
  학력인정고: { bg: '#0d9488', text: '#ffffff', label: '학력인정고' },
  기타: { bg: '#64748b', text: '#ffffff', label: '기타' }
};

function getGenderSymbol(genderType: string): string {
  if (genderType === '남학교') return '남';
  if (genderType === '여학교') return '여';
  if (genderType === '남녀공학') return '공';
  return '고';
}

function getFoundationClass(fondType: string): string {
  if (fondType === '사립') return 'marker-badge-private';
  if (fondType === '국립') return 'marker-badge-national';
  return 'marker-badge-public';
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const SchoolMap: React.FC<SchoolMapProps> = ({
  schools,
  selectedSchool,
  onSelectSchool,
  selectedDistrict
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const markerMapRef = useRef<Map<string, L.Marker>>(new Map());
  const selectedMarkerRef = useRef<L.Marker | null>(null);
  const districtLayerRef = useRef<L.GeoJSON | null>(null);
  const eduOfficeLayerRef = useRef<L.GeoJSON | null>(null);
  const districtPolygonsMapRef = useRef<Map<string, L.LatLngBounds>>(new Map());

  // UI States
  const [mapReady, setMapReady] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [showDistrictBorder, setShowDistrictBorder] = useState(true);
  const [showEduOfficeBorder, setShowEduOfficeBorder] = useState(true);
  const [geoJsonError, setGeoJsonError] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState(true);

  // 1. Initialize Map once
  useEffect(() => {
    if (!containerRef.current || mapInstanceRef.current) return;

    // Create Map
    const map = L.map(containerRef.current, {
      center: [37.5665, 126.9780],
      zoom: 11,
      minZoom: 9,
      maxZoom: 18,
      maxBounds: MAX_SEOUL_BOUNDS,
      maxBoundsViscosity: 0.8,
      attributionControl: true
    });

    // Custom panes for strict layer ordering (boundaries below markers)
    const boundaryPane = map.createPane('boundaryPane');
    boundaryPane.style.zIndex = '350';
    boundaryPane.style.pointerEvents = 'none';

    // Add OpenStreetMap Tile Layer
    const tileLayer = L.tileLayer(TILE_CONFIG.url, {
      attribution: TILE_CONFIG.attribution,
      maxZoom: TILE_CONFIG.maxZoom
    });

    let consecutiveErrors = 0;
    let hasLoadedAny = false;

    tileLayer.on('tileload', () => {
      hasLoadedAny = true;
      consecutiveErrors = 0;
      setTileError(false);
    });

    tileLayer.on('tileerror', () => {
      consecutiveErrors++;
      if (consecutiveErrors >= 4 && !hasLoadedAny) {
        setTileError(true);
      }
    });

    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;

    // Cluster group
    const clusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 36,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let sizeClass = 'school-cluster-small';
        let diameter = 32;

        if (count > 20) {
          sizeClass = 'school-cluster-large';
          diameter = 42;
        } else if (count > 8) {
          sizeClass = 'school-cluster-medium';
          diameter = 36;
        }

        return L.divIcon({
          html: `<span>${count}</span>`,
          className: sizeClass,
          iconSize: L.point(diameter, diameter)
        });
      }
    });

    map.addLayer(clusterGroup);
    clusterGroupRef.current = clusterGroup;

    // Initial fitBounds to Seoul
    map.fitBounds(SEOUL_BOUNDS, { padding: [16, 16] });

    mapInstanceRef.current = map;
    setMapReady(true);

    // ResizeObserver to handle container resize & tab switches
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    ro.observe(containerRef.current);

    // Async boundary loader (non-blocking)
    loadGeoJsonBoundaries(map, boundaryPane);

    // Cleanup
    return () => {
      ro.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Load GeoJSON Boundaries with safe fallback & validation
  const loadGeoJsonBoundaries = async (map: L.Map, boundaryPane: HTMLElement) => {
    const urls = ['/data/seoul-gu.geojson', 'https://highmap.labbitory.com/data/seoul-gu.geojson'];
    let validData: any = null;

    for (const url of urls) {
      try {
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) continue;
        const text = await res.text();
        const json = JSON.parse(text);

        // Validation per section 18
        if (
          json &&
          json.type === 'FeatureCollection' &&
          Array.isArray(json.features)
        ) {
          const districtFeatures = json.features.filter(
            (f: any) => f.properties?.kind === 'district'
          );
          if (districtFeatures.length === 25) {
            validData = json;
            break;
          }
        }
      } catch {
        // try next url
      }
    }

    if (!validData) {
      setGeoJsonError('구 경계 데이터를 불러오지 못했습니다');
      return;
    }

    try {
      // 1. District polygons (kind === "district")
      const districtFeatures = validData.features.filter(
        (f: any) => f.properties?.kind === 'district'
      );

      const districtLayer = L.geoJSON({ type: 'FeatureCollection', features: districtFeatures } as any, {
        pane: 'boundaryPane',
        style: () => ({
          color: '#64748b',
          weight: 1.2,
          opacity: 0.7,
          fillColor: '#3b82f6',
          fillOpacity: 0.03,
          dashArray: '2, 3'
        }),
        onEachFeature: (feature, layer) => {
          const guName = feature.properties?.name || '';
          if (guName && (layer as any).getBounds) {
            const bounds = (layer as any).getBounds();
            districtPolygonsMapRef.current.set(guName, bounds);
            const center = bounds.getCenter();

            const tooltip = L.tooltip({
              permanent: true,
              direction: 'center',
              className: 'gu-label-tooltip',
              interactive: false,
              pane: 'boundaryPane'
            })
              .setContent(escapeHtml(guName))
              .setLatLng(center);

            tooltip.addTo(map);
          }
        }
      });

      // 2. EduOffice boundaries (kind === "eduOffice")
      const eduFeatures = validData.features.filter(
        (f: any) => f.properties?.kind === 'eduOffice'
      );

      const eduOfficeLayer = L.geoJSON({ type: 'FeatureCollection', features: eduFeatures } as any, {
        pane: 'boundaryPane',
        style: () => ({
          color: '#1e3a8a',
          weight: 2.8,
          opacity: 0.85,
          fillOpacity: 0
        })
      });

      districtLayer.addTo(map);
      eduOfficeLayer.addTo(map);

      districtLayerRef.current = districtLayer;
      eduOfficeLayerRef.current = eduOfficeLayer;
    } catch (e) {
      console.warn('[Map] Boundary render notice:', e);
    }
  };

  // 3. Toggle Boundaries visibility
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (districtLayerRef.current) {
      if (showDistrictBorder) {
        if (!mapInstanceRef.current.hasLayer(districtLayerRef.current)) {
          mapInstanceRef.current.addLayer(districtLayerRef.current);
        }
      } else {
        if (mapInstanceRef.current.hasLayer(districtLayerRef.current)) {
          mapInstanceRef.current.removeLayer(districtLayerRef.current);
        }
      }
    }
  }, [showDistrictBorder]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (eduOfficeLayerRef.current) {
      if (showEduOfficeBorder) {
        if (!mapInstanceRef.current.hasLayer(eduOfficeLayerRef.current)) {
          mapInstanceRef.current.addLayer(eduOfficeLayerRef.current);
        }
      } else {
        if (mapInstanceRef.current.hasLayer(eduOfficeLayerRef.current)) {
          mapInstanceRef.current.removeLayer(eduOfficeLayerRef.current);
        }
      }
    }
  }, [showEduOfficeBorder]);

  // 4. Update Markers when schools change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const cluster = clusterGroupRef.current;
    if (!map || !cluster) return;

    cluster.clearLayers();
    markerMapRef.current.clear();
    selectedMarkerRef.current = null;

    const markersToAdd: L.Marker[] = [];
    const locatedSchools = schools.filter(s => s.hasLocation && s.latitude && s.longitude);

    for (const school of locatedSchools) {
      const typeConfig = SCHOOL_TYPE_COLORS[school.schoolType] || SCHOOL_TYPE_COLORS['기타'];
      const genderSymbol = getGenderSymbol(school.genderType);
      const fondClass = getFoundationClass(school.foundationType);

      // Create Custom divIcon
      const icon = L.divIcon({
        className: 'custom-school-icon-wrapper',
        html: `
          <div class="custom-school-marker ${fondClass}" style="background-color: ${typeConfig.bg}; width: 26px; height: 26px;" title="${escapeHtml(school.schoolName)}">
            ${escapeHtml(genderSymbol)}
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        popupAnchor: [0, -14]
      });

      const marker = L.marker([school.latitude!, school.longitude!], {
        icon,
        title: school.schoolName
      });

      // Construct Popup content safely with DOM
      const popupDiv = document.createElement('div');
      popupDiv.className = 'p-1 text-slate-800 text-xs min-w-[200px] max-w-[260px]';

      const badgesDiv = document.createElement('div');
      badgesDiv.className = 'flex flex-wrap gap-1 mb-1.5';
      badgesDiv.innerHTML = `
        <span class="px-1.5 py-0.5 rounded text-[10px] font-bold text-white" style="background-color: ${typeConfig.bg}">${escapeHtml(school.schoolType)}</span>
        <span class="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-semibold">${escapeHtml(school.genderType)}</span>
        <span class="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-semibold">${escapeHtml(school.foundationType)}</span>
        <span class="px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 font-semibold">${escapeHtml(school.district)}</span>
      `;
      popupDiv.appendChild(badgesDiv);

      const titleEl = document.createElement('h4');
      titleEl.className = 'font-bold text-sm text-slate-900 mb-1';
      titleEl.textContent = school.schoolName;
      popupDiv.appendChild(titleEl);

      if (school.address) {
        const addrEl = document.createElement('p');
        addrEl.className = 'text-slate-500 text-[11px] leading-tight mb-2 flex items-start gap-1';
        addrEl.innerHTML = `<svg class="w-3 h-3 text-slate-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg><span>${escapeHtml(school.address)}</span>`;
        popupDiv.appendChild(addrEl);
      }

      const btn = document.createElement('button');
      btn.className = 'w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-xs transition flex items-center justify-center gap-1 cursor-pointer';
      btn.textContent = '상세정보 보기';
      btn.onclick = () => {
        onSelectSchool(school);
      };
      popupDiv.appendChild(btn);

      marker.bindPopup(popupDiv);

      // Marker click event
      marker.on('click', () => {
        onSelectSchool(school);
      });

      markersToAdd.push(marker);
      markerMapRef.current.set(school.schoolCode, marker);
    }

    // Add all markers in bulk
    cluster.addLayers(markersToAdd);
  }, [schools, onSelectSchool]);

  // 5. Move map when selected district changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!selectedDistrict || selectedDistrict === '전체') {
      map.fitBounds(SEOUL_BOUNDS, { padding: [16, 16], maxZoom: 13 });
      return;
    }

    // Check if district polygon bounds exist
    const guBounds = districtPolygonsMapRef.current.get(selectedDistrict);
    if (guBounds) {
      map.fitBounds(guBounds, { padding: [24, 24], maxZoom: 14 });
    } else {
      // Fallback: fit to located schools in this district
      const districtSchools = schools.filter(
        s => s.district === selectedDistrict && s.hasLocation && s.latitude && s.longitude
      );
      if (districtSchools.length > 0) {
        const bounds = L.latLngBounds(districtSchools.map(s => [s.latitude!, s.longitude!]));
        map.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 });
      }
    }
  }, [selectedDistrict, schools]);

  // 6. Highlight selected school marker and zoom to it
  useEffect(() => {
    const map = mapInstanceRef.current;
    const cluster = clusterGroupRef.current;
    if (!map || !cluster) return;

    // Reset previous selected marker highlight
    if (selectedMarkerRef.current) {
      const prevEl = selectedMarkerRef.current.getElement()?.querySelector('.custom-school-marker');
      if (prevEl) {
        prevEl.classList.remove('is-selected');
      }
      selectedMarkerRef.current.setZIndexOffset(0);
      selectedMarkerRef.current = null;
    }

    if (!selectedSchool || !selectedSchool.hasLocation) return;

    const marker = markerMapRef.current.get(selectedSchool.schoolCode);
    if (!marker) return;

    // Use zoomToShowLayer to uncluster if needed
    cluster.zoomToShowLayer(marker, () => {
      selectedMarkerRef.current = marker;
      marker.setZIndexOffset(1000);
      const el = marker.getElement()?.querySelector('.custom-school-marker');
      if (el) {
        el.classList.add('is-selected');
      }
      marker.openPopup();
    });
  }, [selectedSchool]);

  const handleRetryTile = useCallback(() => {
    if (tileLayerRef.current) {
      tileLayerRef.current.redraw();
      setTileError(false);
    }
  }, []);

  const handleResetView = useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.fitBounds(SEOUL_BOUNDS, { padding: [16, 16] });
    }
  }, []);

  return (
    <div className="relative w-full h-full min-h-[380px] bg-slate-100 overflow-hidden flex flex-col">
      {/* 6절 ①: 지도 준비 중 표시 */}
      {!mapReady && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-100/90 backdrop-blur-xs">
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-md border border-slate-200 text-sm font-medium text-slate-700">
            <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
            <span>지도를 준비하고 있습니다…</span>
          </div>
        </div>
      )}

      {/* 6절 ②: 배경지도 타일 로딩 실패 안내 띠 */}
      {tileError && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-3 text-xs md:text-sm font-medium border border-amber-600">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>배경지도를 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.</span>
          <button
            onClick={handleRetryTile}
            className="px-2.5 py-1 bg-white text-amber-900 rounded font-bold hover:bg-amber-100 transition shrink-0 cursor-pointer"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Map Action Controls (Top Right) */}
      <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2">
        {/* Reset View Button */}
        <button
          onClick={handleResetView}
          title="서울 전체 보기"
          className="px-3 py-1.5 bg-white/95 hover:bg-white text-slate-700 hover:text-blue-600 rounded-lg shadow-sm border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
        >
          <MapPin className="w-3.5 h-3.5 text-blue-600" />
          <span>서울 전체</span>
        </button>

        {/* Boundary Toggles */}
        <div className="bg-white/95 backdrop-blur-xs p-2 rounded-lg shadow-sm border border-slate-200 text-xs flex flex-col gap-1.5">
          <div className="font-semibold text-slate-500 text-[10px] px-1 uppercase tracking-wider">
            경계 레이어
          </div>
          <button
            onClick={() => setShowDistrictBorder(prev => !prev)}
            className={`flex items-center justify-between gap-3 px-2 py-1 rounded transition text-xs font-medium cursor-pointer ${
              showDistrictBorder ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-slate-400 inline-block border-t border-dashed border-slate-600"></span>
              25개 자치구
            </span>
            {showDistrictBorder ? <Eye className="w-3.5 h-3.5 text-blue-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          <button
            onClick={() => setShowEduOfficeBorder(prev => !prev)}
            className={`flex items-center justify-between gap-3 px-2 py-1 rounded transition text-xs font-medium cursor-pointer ${
              showEduOfficeBorder ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-1 bg-blue-900 inline-block rounded-xs"></span>
              11개 교육지원청
            </span>
            {showEduOfficeBorder ? <Eye className="w-3.5 h-3.5 text-blue-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {geoJsonError && (
            <div className="text-[10px] text-amber-600 px-1 pt-0.5">
              {geoJsonError}
            </div>
          )}
        </div>
      </div>

      {/* Legend Component (Bottom Left to never block bottom-right OSM attribution) */}
      <div className="absolute bottom-6 left-3 z-20 max-w-[280px]">
        <div className="bg-white/95 backdrop-blur-xs rounded-lg shadow-md border border-slate-200 overflow-hidden text-xs">
          <button
            onClick={() => setLegendOpen(prev => !prev)}
            className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-slate-700 font-semibold text-xs border-b border-slate-200 transition cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              지도 범례 (마커 안내)
            </span>
            {legendOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronUp className="w-3.5 h-3.5 text-slate-500" />}
          </button>

          {legendOpen && (
            <div className="p-3 space-y-2.5">
              {/* School Types */}
              <div>
                <div className="text-[10px] font-bold text-slate-500 mb-1">학교 유형 (마커 색상)</div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  {Object.entries(SCHOOL_TYPE_COLORS).map(([type, cfg]) => (
                    <div key={type} className="flex items-center gap-1.5">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: cfg.bg }}
                      />
                      <span className="text-slate-700 truncate">{cfg.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gender Symbols */}
              <div className="pt-1.5 border-t border-slate-100">
                <div className="text-[10px] font-bold text-slate-500 mb-1">성별 구분 (마커 내부 문자)</div>
                <div className="flex items-center gap-3 text-[11px] text-slate-700">
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-slate-600 text-white font-bold text-[9px] flex items-center justify-center">남</span>
                    남학교
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-slate-600 text-white font-bold text-[9px] flex items-center justify-center">여</span>
                    여학교
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-slate-600 text-white font-bold text-[9px] flex items-center justify-center">공</span>
                    남녀공학
                  </span>
                </div>
              </div>

              {/* Foundation Borders */}
              <div className="pt-1.5 border-t border-slate-100">
                <div className="text-[10px] font-bold text-slate-500 mb-1">설립 구분 (테두리 양식)</div>
                <div className="flex items-center gap-3 text-[11px] text-slate-700">
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-blue-600 border border-white flex items-center justify-center text-[9px] text-white">공</span>
                    공립
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-purple-600 border border-dashed border-white flex items-center justify-center text-[9px] text-white">사</span>
                    사립
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-emerald-600 ring-2 ring-amber-300 flex items-center justify-center text-[9px] text-white">국</span>
                    국립
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Leaflet Map Div */}
      <div ref={containerRef} className="w-full h-full flex-1" />
    </div>
  );
};
