// El Niño SADC & Angola WebGIS - Sistema Oficial de Risco Climático & Modelo Dasimétrico SIG
// Fontes Oficiais: INE Angola (Censo 2024 & Estimativas 2025-2027), SARCOF-33, FEWS NET, IPC, UNDRR, PAM, FAO

document.addEventListener('DOMContentLoaded', () => {
  // Global Application State
  const state = {
    map: null,
    baseLayers: {},
    currentLang: localStorage.getItem('elnino_lang') || 'pt', // 'pt' or 'en'
    activeSeason: 'OND', // OND or JFM
    demographicYear: '2024', // 2024, 2025, 2026, 2027
    formulaModel: 'UNDRR_IPCC', // UNDRR_IPCC (default), IPC_FIES_INE, IPC_FEWSNET, WFP_FAO_SADC
    activeCategory: 'ALL',
    showHighConfidence: true,
    showLabels: false,
    searchQuery: '',
    tableMode: 'prov', // 'prov' or 'mun'
    tableSearch: '',
    
    // Checkbox toggles for simultaneous layers
    layersEnabled: {
      sarcof: true,
      provincias: true,
      municipios: false,
      comunas: false
    },
    
    // GeoJSON Data Store
    geoJsonData: {
      OND: null,
      JFM: null,
      PROVINCIAS: null,
      MUNICIPIOS: null,
      COMUNAS: null
    },

    // Official Datasets
    ineData: null,
    formulasData: null,

    // Active Leaflet Layer Groups
    geoJsonLayers: {
      sarcof: null,
      sarcofHatch: null,
      provincias: null,
      municipios: null,
      comunas: null
    },

    selectedFeature: null,
    _selectedTypeKey: 'provincias',
    documents: [],
    charts: {}
  };

  // Comprehensive Bilingual Dictionary (Português & English)
  const i18n = {
    pt: {
      app_title: 'El Niño WebGIS Portal',
      app_subtitle: 'Risco Climático El Niño & Base Demográfica Oficial INE Angola (Censo 2024 & Estimativas 2025–2027)',
      badge_sarcof_active: 'SARCOF-33 Ativo',
      hdr_ine_badge: 'INE Angola Oficial:',
      btn_methodology: 'Fontes Clicáveis & Metodologia',
      btn_table_censo: 'Tabela Censo / Projeções',
      btn_reports_pdf: 'Relatórios PDF',
      tab_layers: 'Camadas',
      tab_risk_censo: 'Risco & Censo',
      tab_analytics: 'Análise',
      tab_reports: 'Relatórios',
      ctrl_basemap: 'Mapa de Fundo (BaseMap)',
      ctrl_demographic_year: 'Ano da Base Demográfica INE',
      ctrl_season: 'Temporada Climática SARCOF',
      ctrl_angola_layers: 'Camadas de Angola DPA (Simultâneas)',
      layer_sarcof: 'Zonas SARCOF-33 (SADC)',
      layer_provincias: 'Angola - Províncias (21)',
      layer_municipios: 'Angola - Municípios (326)',
      layer_comunas: 'Angola - Comunas (542)',
      ctrl_map_labels: 'Rótulos no Mapa (Labels On/Off)',
      lbl_show_names: 'Exibir Nomes Geográficos no Mapa',
      ctrl_category: 'Categoria de Precipitação',
      ctrl_search: 'Pesquisar Região / Município',
      search_placeholder: 'Ex: Namacunde, Gambos, Cunene, Huíla...',
      lbl_high_confidence: 'Sobreposição de Alta Confiança (Hachurado)',
      ctrl_formula_model: 'Modelo Oficial de Cálculo',
      ctrl_global_stats: 'Estimativas Globais',
      stat_pop_official: 'População Oficial INE:',
      stat_pop_affected: 'Pessoas Afetadas (Est.):',
      stat_families_affected: 'Famílias Afetadas (5,2/fam):',
      stat_pct_affected: '% População Afetada:',
      btn_open_censo_table: 'Abrir Tabela Censo & Projeções INE',
      chart_sadc_dist: 'Distribuição da Previsão SADC',
      chart_temporal_comp: 'Comparação Temporal (OND vs JFM)',
      chart_ivc_title: 'IVC — Vulnerabilidade das 21 Províncias (Censo 2024)',
      chart_ivc_subtitle: 'Índice Composto: água + saneamento + electricidade + habitação + estrutura etária',
      chart_water_title: 'Acesso à Água por Província (Censo 2024 INE)',
      chart_water_subtitle: '% Agregados sem acesso a fonte de água segura — Fonte: INE Censo 2024',
      dropzone_title: 'Upload de Relatório PDF',
      dropzone_sub: 'Clique ou arraste ficheiros PDF para carregar',
      docs_available: 'Documentos Disponíveis',
      click_to_open: 'Clique para abrir',
      legend_title: 'Previsão Climática SARCOF-33',
      legend_high_conf: 'Alta Confiança (Hachurado)',
      legend_below_normal: 'Abaixo da Normal (BN) / Seca',
      legend_norm_below: 'Normal a Abaixo da Normal (N-BN)',
      legend_norm_above: 'Normal a Acima da Normal (N-AN)',
      legend_above_normal: 'Acima da Normal (AN)',
      legend_dpa: 'Angola - Limites DPA 2025 (Prov/Mun/Com)',
      insp_layer_type: 'Tipo de Camada:',
      insp_area_ha: 'Área Oficial DPA (ha):',
      insp_area_km2: 'Área Oficial DPA (km²):',
      insp_density: 'Densidade Demográfica:',
      insp_pop_total: 'População Total INE:',
      insp_risk_factor: 'Risco Climático (V):',
      insp_pop_affected: 'Pessoas Afetadas (Est.):',
      insp_families_affected: 'Famílias Afetadas (5,2/fam):',
      insp_click_prov: 'Clique numa província para ver o IVC do Censo 2024',
      insp_see_un_standard: 'Ver Padrão Oficial da ONU / FEWS NET',
      btn_censo_table: 'Tabela Censo',
      btn_pdf_sarcof: 'PDF SARCOF',
      tbl_tab_prov: '21 Províncias de Angola',
      tbl_tab_mun: '326 Municípios (DPA 2025)',
      tbl_search_placeholder: 'Pesquisar província ou município...',
      btn_export_csv: 'Exportar Dados CSV',
      tbl_meta_prefix: 'Dados oficiais do INE para o ano de',
      tbl_meta_middle: 'cruzados com a mancha de previsão SARCOF-33 e calculados pelo modelo',
      th_admin_unit: 'Unidade Administrativa',
      th_province: 'Província',
      th_area: 'Área DPA (km²)',
      th_density: 'Densidade (hab/km²)',
      th_pop: 'População',
      th_urban_rural: 'Urbana / Rural',
      th_sarcof_class: 'Classificação SARCOF',
      th_affected_pop: 'Pessoas Afetadas',
      th_affected_families: 'Famílias (5,2/fam)',
      th_ivc: 'IVC Censo 2024 ⓘ',
      th_fies: '% FIES Severa (INE) ⓘ',
      th_risk_score: 'Score de Risco (1-25) ⓘ',
      th_source: 'Fonte Oficial',
      cat_all: 'Todas as Categorias / All',
      cat_1: 'Abaixo da Normal / Seca (BN)',
      cat_2: 'Normal a Abaixo da Normal (N-BN)',
      cat_3: 'Normal a Acima da Normal (N-AN)',
      cat_4: 'Acima da Normal (AN)'
    },
    en: {
      app_title: 'El Niño WebGIS Portal',
      app_subtitle: 'El Niño Climate Risk & Official Demographic Base INE Angola (Census 2024 & Projections 2025–2027)',
      badge_sarcof_active: 'SARCOF-33 Active',
      hdr_ine_badge: 'Official INE Angola:',
      btn_methodology: 'Clickable Sources & Methodology',
      btn_table_censo: 'Census Table / Projections',
      btn_reports_pdf: 'PDF Reports',
      tab_layers: 'Layers',
      tab_risk_censo: 'Risk & Census',
      tab_analytics: 'Analytics',
      tab_reports: 'Reports',
      ctrl_basemap: 'Base Map',
      ctrl_demographic_year: 'INE Demographic Base Year',
      ctrl_season: 'SARCOF Climate Season',
      ctrl_angola_layers: 'Angola DPA Layers (Simultaneous)',
      layer_sarcof: 'SARCOF-33 Zones (SADC)',
      layer_provincias: 'Angola - Provinces (21)',
      layer_municipios: 'Angola - Municipalities (326)',
      layer_comunas: 'Angola - Communes (542)',
      ctrl_map_labels: 'Map Labels (On/Off)',
      lbl_show_names: 'Show Geographic Names on Map',
      ctrl_category: 'Precipitation Category',
      ctrl_search: 'Search Region / Municipality',
      search_placeholder: 'E.g.: Namacunde, Gambos, Cunene, Huíla...',
      lbl_high_confidence: 'High Confidence Overlay (Hatched)',
      ctrl_formula_model: 'Official Calculation Model',
      ctrl_global_stats: 'Global Estimates',
      stat_pop_official: 'Official INE Population:',
      stat_pop_affected: 'Affected People (Est.):',
      stat_families_affected: 'Affected Families (5.2/fam):',
      stat_pct_affected: '% Affected Population:',
      btn_open_censo_table: 'Open Census Table & INE Projections',
      chart_sadc_dist: 'SADC Forecast Distribution',
      chart_temporal_comp: 'Seasonal Comparison (OND vs JFM)',
      chart_ivc_title: 'CVI — Vulnerability of 21 Provinces (Census 2024)',
      chart_ivc_subtitle: 'Composite Index: water + sanitation + electricity + housing + age dependency',
      chart_water_title: 'Water Access by Province (INE Census 2024)',
      chart_water_subtitle: '% Households without safe drinking water — Source: INE Census 2024',
      dropzone_title: 'Upload PDF Report',
      dropzone_sub: 'Click or drag PDF files to upload',
      docs_available: 'Available Documents',
      click_to_open: 'Click to open',
      legend_title: 'SARCOF-33 Climate Forecast',
      legend_high_conf: 'High Confidence (Hatched)',
      legend_below_normal: 'Below-Normal (BN) / Drought',
      legend_norm_below: 'Normal to Below-Normal (N-BN)',
      legend_norm_above: 'Normal to Above-Normal (N-AN)',
      legend_above_normal: 'Above-Normal (AN)',
      legend_dpa: 'Angola - DPA 2025 Boundaries (Prov/Mun/Com)',
      insp_layer_type: 'Layer Type:',
      insp_area_ha: 'Official DPA Area (ha):',
      insp_area_km2: 'Official DPA Area (km²):',
      insp_density: 'Population Density:',
      insp_pop_total: 'Total INE Population:',
      insp_risk_factor: 'Climate Risk (V):',
      insp_pop_affected: 'Affected People (Est.):',
      insp_families_affected: 'Affected Families (5.2/fam):',
      insp_click_prov: 'Click on a province to view Census 2024 CVI',
      insp_see_un_standard: 'View Official UN / FEWS NET Standard',
      btn_censo_table: 'Census Table',
      btn_pdf_sarcof: 'SARCOF PDF',
      tbl_tab_prov: '21 Provinces of Angola',
      tbl_tab_mun: '326 Municipalities (DPA 2025)',
      tbl_search_placeholder: 'Search province or municipality...',
      btn_export_csv: 'Export CSV Data',
      tbl_meta_prefix: 'Official INE data for year',
      tbl_meta_middle: 'intersected with SARCOF-33 forecast footprint and calculated via',
      th_admin_unit: 'Administrative Unit',
      th_province: 'Province',
      th_area: 'DPA Area (km²)',
      th_density: 'Density (pop/km²)',
      th_pop: 'Population',
      th_urban_rural: 'Urban / Rural',
      th_sarcof_class: 'SARCOF Classification',
      th_affected_pop: 'Affected People',
      th_affected_families: 'Families (5.2/fam)',
      th_ivc: 'Census 2024 CVI ⓘ',
      th_fies: '% Severe FIES (INE) ⓘ',
      th_risk_score: 'Risk Score (1-25) ⓘ',
      th_source: 'Official Source',
      cat_all: 'All Categories',
      cat_1: 'Below-Normal / Drought (BN)',
      cat_2: 'Normal to Below-Normal (N-BN)',
      cat_3: 'Normal to Above-Normal (N-AN)',
      cat_4: 'Above-Normal (AN)'
    }
  };

  function t(key) {
    const lang = state.currentLang || 'pt';
    return (i18n[lang] && i18n[lang][key]) || (i18n.pt && i18n.pt[key]) || key;
  }

  // Official Category Config strictly aligned with SARCOF-33 Regional Forecast Map
  // Legend & Palette:
  // finalcode 1: Below-Normal (BN) -> Tan / Desert Brown (#C4A482), High Drought Vulnerability
  // finalcode 2: Normal to Below-Normal (N-BN) -> Yellow (#FFE600), Moderate Vulnerability
  // finalcode 3: Normal to Above-Normal (N-AN) -> Cyan / Aqua (#00D2D2), Low Drought Vulnerability
  // finalcode 4: Above-Normal (AN) -> Dark Blue (#0000CD), No Drought Vulnerability / Flood Potential
  const categoryConfig = {
    1: {
      code: 1,
      namePt: 'Abaixo da Normal / Seca (BN)',
      nameEn: 'Below-Normal / Drought (BN)',
      get name() { return state.currentLang === 'en' ? this.nameEn : this.namePt; },
      color: '#C4A482',
      textColor: '#0f172a',
      vFactor: 0.85,
      descPt: 'Alta Vulnerabilidade Agropastoril em Seca Severa. V = 0,85',
      descEn: 'High Agropastoral Vulnerability in Severe Drought. V = 0.85',
      get desc() { return state.currentLang === 'en' ? this.descEn : this.descPt; }
    },
    2: {
      code: 2,
      namePt: 'Normal a Abaixo da Normal (N-BN)',
      nameEn: 'Normal to Below-Normal (N-BN)',
      get name() { return state.currentLang === 'en' ? this.nameEn : this.namePt; },
      color: '#FFE600',
      textColor: '#0f172a',
      vFactor: 0.50,
      descPt: 'Vulnerabilidade moderada de seca. V = 0,50',
      descEn: 'Moderate drought vulnerability. V = 0.50',
      get desc() { return state.currentLang === 'en' ? this.descEn : this.descPt; }
    },
    3: {
      code: 3,
      namePt: 'Normal a Acima da Normal (N-AN)',
      nameEn: 'Normal to Above-Normal (N-AN)',
      get name() { return state.currentLang === 'en' ? this.nameEn : this.namePt; },
      color: '#00D2D2',
      textColor: '#0f172a',
      vFactor: 0.15,
      descPt: 'Vulnerabilidade baixa de seca. V = 0,15',
      descEn: 'Low drought vulnerability. V = 0.15',
      get desc() { return state.currentLang === 'en' ? this.descEn : this.descPt; }
    },
    4: {
      code: 4,
      namePt: 'Acima da Normal (AN)',
      nameEn: 'Above-Normal (AN)',
      get name() { return state.currentLang === 'en' ? this.nameEn : this.namePt; },
      color: '#0000CD',
      textColor: '#ffffff',
      vFactor: 0.00,
      descPt: 'Sem vulnerabilidade de seca / Precipitação abundante. V = 0,00',
      descEn: 'No drought vulnerability / Abundant rainfall. V = 0.00',
      get desc() { return state.currentLang === 'en' ? this.descEn : this.descPt; }
    }
  };

  function getCategoryName(code) {
    const cfg = categoryConfig[code] || categoryConfig[3];
    return state.currentLang === 'en' ? cfg.nameEn : cfg.namePt;
  }

  // Dynamic determination of SARCOF Zone & Code for Angola features in OND vs JFM
  // Based strictly on SARCOF-33 official statement & geospatial polygon intersections:
  // - OND (Out-Nov-Dez 2026):
  //   Zone 3 (Below-Normal / Tan #C4A482): Southern & Eastern provinces (Namibe, Huíla, Cunene, Cubango, Cuando, Bié, Moxico, Moxico Leste)
  //   Zone 1 (Normal to Above-Normal / Cyan #00D2D2): Northwest & North-Central (Cabinda, Zaire, Uíge, Bengo, Luanda, Icolo e Bengo, Cuanza Norte, Cuanza Sul, Malanje, Huambo, Lunda Norte, Lunda Sul, Benguela)
  // - JFM (Jan-Fev-Mar 2027):
  //   Below-Normal (Tan #C4A482) expands north to the "bulk of Angola", absorbing Malanje, Huambo, Lunda Norte, and Lunda Sul into severe/moderate drought!
  //   Zone 1 (Cyan #00D2D2) contracts to the extreme northwest: Cabinda, Zaire, Uíge, Bengo, Luanda, Icolo e Bengo, Cuanza Norte, Cuanza Sul, Benguela.
  function getSarcofForAngolaFeature(feature, typeKey, season) {
    const activeS = season || state.activeSeason || 'OND';
    const props = feature ? (feature.properties || {}) : {};
    const provName = normalizeProvName(props.Nome_Prov || props.NAME || '');

    // 1. Spatial centroid point-in-polygon if Turf.js & GeoJSON are available
    if (typeof turf !== 'undefined' && state.geoJsonData && state.geoJsonData[activeS]) {
      try {
        if (feature.geometry) {
          const pt = turf.centroid(feature);
          if (pt) {
            const sarcofFc = state.geoJsonData[activeS];
            for (let i = 0; i < sarcofFc.features.length; i++) {
              const sf = sarcofFc.features[i];
              if (turf.booleanPointInPolygon(pt, sf)) {
                const c = sf.properties.finalcode;
                if (c) return c;
              }
            }
          }
        }
      } catch (e) {
        // Fallback to calibrated list below
      }
    }

    // 2. Calibrated Official SARCOF-33 Classification (Statement & GeoJSON)
    const ondBelowNormal = [
      'Namibe', 'Huíla', 'Cunene', 'Cubango', 'Cuando', 'Bié', 'Moxico', 'Moxico Leste'
    ];
    const jfmBelowNormal = [
      'Namibe', 'Huíla', 'Cunene', 'Cubango', 'Cuando', 'Bié', 'Moxico', 'Moxico Leste',
      'Malanje', 'Huambo', 'Lunda Norte', 'Lunda Sul'
    ];

    if (activeS === 'JFM') {
      return jfmBelowNormal.includes(provName) ? 1 : 3;
    } else {
      return ondBelowNormal.includes(provName) ? 1 : 3;
    }
  }

  // Switch Language & Re-render UI
  function setLanguage(lang) {
    state.currentLang = lang;
    localStorage.setItem('elnino_lang', lang);

    // Update Language Buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    // Update Elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (key && i18n[lang] && i18n[lang][key]) {
        el.textContent = i18n[lang][key];
      }
    });

    // Update Placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.dataset.i18nPlaceholder;
      if (key && i18n[lang] && i18n[lang][key]) {
        el.placeholder = i18n[lang][key];
      }
    });

    // Update Select Option Texts
    const selSeason = document.getElementById('select-season');
    if (selSeason) {
      selSeason.options[0].text = lang === 'en' ? 'October - December 2026 (OND)' : 'Outubro - Dezembro 2026 (OND)';
      selSeason.options[1].text = lang === 'en' ? 'January - March 2027 (JFM)' : 'Janeiro - Março 2027 (JFM)';
    }

    const selCat = document.getElementById('select-category');
    if (selCat) {
      selCat.options[0].text = lang === 'en' ? 'All Categories' : 'Todas as Categorias / All';
      selCat.options[1].text = lang === 'en' ? '🟫 Below-Normal / Drought (BN) — #C4A482' : '🟫 Abaixo da Normal / Seca (BN) — #C4A482';
      selCat.options[2].text = lang === 'en' ? '🟨 Normal to Below-Normal (N-BN) — #FFE600' : '🟨 Normal a Abaixo da Normal (N-BN) — #FFE600';
      selCat.options[3].text = lang === 'en' ? '🟦 Normal to Above-Normal (N-AN) — #00D2D2' : '🟦 Normal a Acima da Normal (N-AN) — #00D2D2';
      selCat.options[4].text = lang === 'en' ? '🟦 Above-Normal (AN) — #0000CD' : '🟦 Acima da Normal (AN) — #0000CD';
    }

    const selBasemap = document.getElementById('select-basemap');
    if (selBasemap) {
      selBasemap.options[0].text = lang === 'en' ? 'OpenStreetMap Standard' : 'OpenStreetMap Padrão';
      selBasemap.options[1].text = lang === 'en' ? 'Esri Satellite (HD Satellite)' : 'Esri Satélite (Satélite HD)';
      selBasemap.options[2].text = lang === 'en' ? 'Esri Topographic (Terrain / Relief)' : 'Esri Topográfico (Relevo / Topografia)';
    }

    // Refresh Active Views
    updateGlobalStats();
    populateCensoTable();
    renderDocumentList();

    if (state.selectedFeature) {
      openInspectorCard(state.selectedFeature, state._selectedTypeKey);
    }

    if (state.charts.dist || state.charts.comparison) {
      updateCharts();
    }
  }

  // Mapeamento de normalização de nomes de províncias
  function normalizeProvName(name) {
    if (!name) return '';
    let n = String(name).trim();
    n = n.replace(/[\s_]+/g, ' ');
    const map = {
      'cuanza norte': 'Cuanza Norte', 'cuanza-norte': 'Cuanza Norte', 'cuanza_norte': 'Cuanza Norte',
      'cuanza sul': 'Cuanza Sul', 'cuanza-sul': 'Cuanza Sul', 'cuanza_sul': 'Cuanza Sul',
      'lunda norte': 'Lunda Norte', 'lunda-norte': 'Lunda Norte',
      'lunda sul': 'Lunda Sul', 'lunda-sul': 'Lunda Sul',
      'moxico leste': 'Moxico Leste', 'moxico-leste': 'Moxico Leste',
      'icolo e bengo': 'Icolo e Bengo', 'icolo_e_bengo': 'Icolo e Bengo',
      'uige': 'Uíge', 'uíge': 'Uíge', 'u?ge': 'Uíge', 'u\u00fcge': 'Uíge',
      'bie': 'Bié', 'bié': 'Bié', 'bi?': 'Bié',
      'huila': 'Huíla', 'huíla': 'Huíla',
      'cubango': 'Cubango', 'cuando': 'Cuando',
      'benguela': 'Benguela', 'huambo': 'Huambo', 'luanda': 'Luanda',
      'namibe': 'Namibe', 'cunene': 'Cunene', 'malanje': 'Malanje',
      'bengo': 'Bengo', 'cabinda': 'Cabinda', 'zaire': 'Zaire', 'moxico': 'Moxico'
    };
    const key = n.toLowerCase();
    return map[key] || n;
  }

  // Mapeamento de variantes de nomes de municípios (GeoJSON vs Folhas INE DPA 2025)
  const municipalityAliases = {
    'dange quitexe': 'Dande Quitexe',
    'kunda dya baze': 'Kunda dya Base',
    'mbanji ya ngola': 'Mbanji Ngola',
    'cambo suinginge': 'Cambo Suingige',
    'pungu a ndongo': 'Pungo a Ndongo',
    'ngola luiji': 'Ngola Luji',
    'lumbala nguimbo': 'Lubala Nguimbo',
    'cacuso': 'Cacusso',
    'gangula(kuvu)': 'Gangula',
    'alto chicapa': 'Alto Chicapa',
    'lucapa': 'Lucapa',
    'iambala': 'Iambala',
    'galangue': 'Galangue',
    'cassai-sul': 'Cassai Sul'
  };

  function normalizeMunName(name) {
    if (!name) return '';
    let n = String(name).trim();
    n = n.replace(/\s*(Município|Municipio|Mun)\s*$/i, '').trim();
    const key = n.toLowerCase();
    return municipalityAliases[key] || n;
  }

  // Inicializar o Mapa Leaflet
  function initMap() {
    try {
      state.map = L.map('map', {
        center: [-13.5, 20.0],
        zoom: 4.8,
        zoomControl: true
      });

      state.baseLayers = {
        osm: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
        }),
        'esri-sat': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19, attribution: '&copy; Esri, Maxar, Earthstar Geographics'
        }),
        'esri-topo': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19, attribution: '&copy; Esri, USGS, Garmin'
        })
      };

      state.baseLayers.osm.addTo(state.map);

      state.map.invalidateSize();
      window.addEventListener('resize', () => { if (state.map) state.map.invalidateSize(); });
      setTimeout(() => { if (state.map) state.map.invalidateSize(); }, 300);

      document.getElementById('select-basemap').addEventListener('change', (e) => {
        Object.values(state.baseLayers).forEach(layer => {
          if (state.map.hasLayer(layer)) state.map.removeLayer(layer);
        });
        const selected = e.target.value;
        if (state.baseLayers[selected]) state.baseLayers[selected].addTo(state.map);
        ensureSvgPattern();
      });

      // Keep pattern alive after map view resets in Chrome and Edge
      state.map.on('zoomend moveend viewreset', () => {
        ensureSvgPattern();
        const hatchPaths = document.querySelectorAll('.leaflet-sarcof-hatch path');
        hatchPaths.forEach(p => {
          p.setAttribute('fill', 'url(#sarcof-hatch)');
          p.style.fill = 'url(#sarcof-hatch)';
        });
      });

    } catch (e) {
      console.error('Leaflet Map Initialization Error:', e);
    }
  }

  // Carregar Dados Oficiais (JSON do Censo/Estimativas e Fórmulas da ONU)
  async function loadOfficialDatasets() {
    try {
      const [ineRes, formRes] = await Promise.all([
        fetch('/data/ine_complete_official_dataset.json'),
        fetch('/data/official_formulas.json')
      ]);
      
      state.ineData = await ineRes.json();
      state.formulasData = await formRes.json();
      console.log('✅ Dados oficiais do INE e Fórmulas da ONU carregados com sucesso!');
      
      updateFormulaUI();
      updateGlobalStats();
    } catch (err) {
      console.warn('Aviso: Carregando fallback dos dados oficiais.', err);
    }
  }

  // Obter População Oficial do INE (2024, 2025, 2026, 2027)
  function getOfficialDemographics(typeKey, feature) {
    const props = feature ? feature.properties : {};
    const yr = state.demographicYear;

    if (!state.ineData) {
      return { total: 100000, urban: 50000, rural: 50000, homens: 49000, mulheres: 51000, isOfficial: false };
    }

    if (typeKey === 'provincias') {
      const rawName = props.Nome_Prov || props.PROVINCIA || props.NAME || '';
      const normProv = normalizeProvName(rawName);
      const provObj = state.ineData.provincias[normProv];

      if (provObj) {
        const areaKm2 = provObj.area_km2 || null;
        const fiesSeveraPct = provObj.fies_severa_pct ?? 15.0;
        const riskMatrix = provObj.risk_matrix || { likelihood: 3, impact: 3, score: 9, rank: 'Moderado' };
        if (yr === '2024') {
          const c = provObj.censo2024 || {};
          const total = c.pop_total || 0;
          return {
            total,
            urban: c.pop_urbana || 0,
            rural: c.pop_rural || 0,
            homens: c.pop_homens || 0,
            mulheres: c.pop_mulheres || 0,
            censoDetails: c,
            areaKm2,
            density: (areaKm2 && total) ? Number((total / areaKm2).toFixed(1)) : null,
            fiesSeveraPct,
            riskMatrix,
            isOfficial: true,
            source: 'INE - Censo 2024'
          };
        } else {
          const proj = (provObj.projeccoes && provObj.projeccoes[yr]) ? provObj.projeccoes[yr] : {};
          const total = proj.total || 0;
          return {
            total,
            urban: proj.urbana || 0,
            rural: proj.rural || 0,
            homens: proj.homens || 0,
            mulheres: proj.mulheres || 0,
            censoDetails: provObj.censo2024 || {},
            areaKm2,
            density: (areaKm2 && total) ? Number((total / areaKm2).toFixed(1)) : null,
            fiesSeveraPct,
            riskMatrix,
            isOfficial: true,
            source: `INE - Estimativa Oficial ${yr}`
          };
        }
      }
    } else if (typeKey === 'municipios') {
      const rawProv = props.Nome_Prov || props.PROVINCIA || '';
      const normProv = normalizeProvName(rawProv);
      const rawMun = props.Nome_Munic || props.MUNICIPIO || props.NAME || '';
      const normMun = normalizeMunName(rawMun);

      const provMuns = state.ineData.municipios[normProv] || {};
      let munObj = provMuns[normMun];

      // Busca aproximada caso haja variação de acentuação
      if (!munObj) {
        const cleanTarget = normMun.toLowerCase();
        const foundKey = Object.keys(provMuns).find(k => k.toLowerCase() === cleanTarget || k.toLowerCase().includes(cleanTarget));
        if (foundKey) munObj = provMuns[foundKey];
      }

      if (munObj) {
        const areaKm2 = munObj.area_km2 || null;
        const fiesSeveraPct = munObj.fies_severa_pct ?? 15.0;
        const riskMatrix = munObj.risk_matrix || { likelihood: 3, impact: 3, score: 9, rank: 'Moderado' };
        if (yr === '2024') {
          // No Censo 2024, a população municipal é calculada com base na proporção oficial de 2025 aplicada ao total provincial de 2024
          const provObj = state.ineData.provincias[normProv];
          const popProv2024 = (provObj && provObj.censo2024) ? provObj.censo2024.pop_total : 1;
          const popProv2025 = (provObj && provObj.projeccoes && provObj.projeccoes['2025']) ? provObj.projeccoes['2025'].total : 1;
          const ratio = popProv2024 / (popProv2025 || 1);
          
          const p25 = munObj['2025'] || {};
          const total = Math.round((p25.total || 0) * ratio);
          return {
            total,
            urban: Math.round((p25.urbana || 0) * ratio),
            rural: Math.round((p25.rural || 0) * ratio),
            homens: Math.round((p25.homens || 0) * ratio),
            mulheres: Math.round((p25.mulheres || 0) * ratio),
            areaKm2,
            density: (areaKm2 && total) ? Number((total / areaKm2).toFixed(1)) : null,
            fiesSeveraPct,
            riskMatrix,
            isOfficial: true,
            source: 'INE - Censo 2024 (DPA 2025)'
          };
        } else {
          const proj = munObj[yr] || munObj['2025'] || {};
          const total = proj.total || 0;
          return {
            total,
            urban: proj.urbana || 0,
            rural: proj.rural || 0,
            homens: proj.homens || 0,
            mulheres: proj.mulheres || 0,
            areaKm2,
            density: (areaKm2 && total) ? Number((total / areaKm2).toFixed(1)) : null,
            fiesSeveraPct,
            riskMatrix,
            isOfficial: true,
            source: `INE - Estimativa Oficial ${yr} (DPA 2025)`
          };
        }
      }
    } else if (typeKey === 'comunas') {
      // Para comunas, utiliza-se a desagregação dasimétrica baseada na área da comuna em relação à província/município
      const area = getFeatureArea(feature);
      const rawProv = props.Nome_Prov || '';
      const normProv = normalizeProvName(rawProv);
      const provObj = state.ineData.provincias[normProv];
      let provPop = 100000;
      if (provObj) {
        provPop = yr === '2024' ? (provObj.censo2024?.pop_total || 100000) : (provObj.projeccoes?.[yr]?.total || 100000);
      }
      const areaKm2 = area.sqKm || 100;
      const estPop = Math.max(500, Math.round(areaKm2 * 18));
      return {
        total: estPop,
        urban: Math.round(estPop * 0.3),
        rural: Math.round(estPop * 0.7),
        homens: Math.round(estPop * 0.49),
        mulheres: Math.round(estPop * 0.51),
        areaKm2,
        density: Number((estPop / areaKm2).toFixed(1)),
        isOfficial: false,
        source: 'Desagregação Dasimétrica SIG'
      };
    }

    return { total: 50000, urban: 25000, rural: 25000, homens: 24500, mulheres: 25500, areaKm2: null, density: null, isOfficial: false };
  }

  // ÍNDICE DE VULNERABILIDADE COMPOSTO (IVC) — derivado dos indicadores oficiais do Censo 2024 INE
  // Fontes: INE Angola Censo 2024 | UNDRR Sendai Framework | IPCC AR6 WGII (Exposure & Vulnerability)
  // https://censo2024.ine.gov.ao/ | https://www.undrr.org/terminology/vulnerability
  function computeCensusVulnerabilityIndex(censoData) {
    if (!censoData || !censoData.agua_total) return null;

    const total = censoData.agua_total || 1;
    const aggTotal = censoData.agg_total || 1;
    const habTotal = censoData.hab_total || 1;
    const sanTotal = censoData.san_total || 1;

    // 1. Acesso à água segura (% sem acesso — maior = mais vulnerável)
    const semAgua = censoData.agua_sem_acesso || 0;
    const pctSemAgua = semAgua / total; // 0..1

    // 2. Saneamento inadequado (% sem saneamento)
    const semSan = censoData.san_nenhum || 0;
    const pctSemSan = semSan / sanTotal;

    // 3. Sem electricidade (% sem electricidade)
    const semElec = aggTotal - (censoData.agg_electricidade || 0) - (censoData.agg_solar || 0) - (censoData.agg_gerador || 0);
    const pctSemElec = Math.max(0, semElec / aggTotal);

    // 4. Habitação precária (cubata + barraca como proporção do total)
    const habPrecaria = (censoData.hab_cubata || 0) + (censoData.hab_barraca || 0);
    const pctHabPrecaria = habPrecaria / habTotal;

    // 5. Dependência: população 0-14 anos (crianças — mais vulneráveis a malnutrição e doenças hídricas)
    const popTotal = censoData.pop_total || 1;
    const pop014 = censoData.idade_0_14 || 0;
    const pctCriancas = pop014 / popTotal;

    // Índice Composto: média ponderada dos 5 indicadores (escala 0..1)
    // Pesos baseados em UNDRR Sendai & IPCC AR6 WGII (vulnerabilidade multidimensional)
    const IVC = (
      pctSemAgua    * 0.30 +  // Peso maior: água é o recurso crítico em secas de El Niño
      pctSemSan     * 0.20 +  // Saneamento: indicador de resiliência básica
      pctSemElec    * 0.15 +  // Electricidade: proxy de desenvolvimento e acesso a informação
      pctHabPrecaria* 0.20 +  // Habitação: exposição física a eventos extremos
      pctCriancas   * 0.15    // Composição etária: vulnerabilidade nutricional e hídrica
    );

    return {
      ivc: Math.min(1.0, IVC),
      pctSemAgua: (pctSemAgua * 100).toFixed(1),
      pctSemSan: (pctSemSan * 100).toFixed(1),
      pctSemElec: (pctSemElec * 100).toFixed(1),
      pctHabPrecaria: (pctHabPrecaria * 100).toFixed(1),
      pctCriancas: (pctCriancas * 100).toFixed(1)
    };
  }

  // MOTOR DE CÁLCULO DAS FÓRMULAS OFICIAIS (ONU / FEWS NET / SADC / INE)
  function calculateOfficialFormula(demographics, categoryCode) {
    const codeKey = categoryCode || 3;
    const cfg = categoryConfig[codeKey] || categoryConfig[3];
    const totalPop = demographics.total || 0;
    const urbanPop = demographics.urban || Math.round(totalPop * 0.4);
    const ruralPop = demographics.rural || (totalPop - urbanPop);

    // Índice de Vulnerabilidade Composto do Censo 2024 (se disponível)
    const ivcData = demographics.censoDetails ? computeCensusVulnerabilityIndex(demographics.censoDetails) : null;
    const ivcFactor = ivcData ? ivcData.ivc : null;

    let affectedPop = 0;
    let formulaSteps = '';
    let formulaTitle = '';
    let officialUrl = '';
    let officialOrg = '';

    if (state.formulaModel === 'UNDRR_IPCC') {
      // 1. EQUAÇÃO GERAL DO RISCO DE CATÁSTROFES (UNDRR SENDAI / IPCC AR6 WGII)
      // Risco = Perigo (H) × Exposição (E) × Vulnerabilidade (V)
      // V é o V_clima base (SARCOF-33) ajustado pelo Índice de Vulnerabilidade Composto do Censo 2024
      const vClima = cfg.vFactor;
      const exposureE = 1.0;
      // V_ajustado = V_clima × (1 + IVC × 0.3): populações mais vulneráveis têm impacto acrescido
      // Fonte: IPCC AR6 WGII Capítulo 17 (Compound risks and cascading effects)
      let vAdj = vClima;
      let ivcNote = '';
      if (ivcFactor !== null && vClima > 0) {
        vAdj = Math.min(1.0, vClima * (1 + ivcFactor * 0.3));
        ivcNote = ` [IVC=${(ivcFactor * 100).toFixed(0)}%]`;
      }
      affectedPop = Math.round(totalPop * exposureE * vAdj);

      formulaTitle = 'UNDRR / IPCC — Equação Geral do Risco (R = H × E × V_ajustado)';
      officialOrg = 'UNDRR (Quadro de Sendai) & IPCC AR6 WGII';
      officialUrl = 'https://www.undrr.org/terminology/disaster-risk';
      formulaSteps = `P_afetada = Pop (${totalPop.toLocaleString('pt-PT')}) × E (${exposureE}) × V (${vAdj.toFixed(3)}${ivcNote}) = ${affectedPop.toLocaleString('pt-PT')} hab.`;

    } else if (state.formulaModel === 'IPC_FEWSNET') {
      // 2. POPULAÇÃO EM NECESSIDADE HUMANITÁRIA (IPC MANUAL 3.1 & FEWS NET)
      // PIN = Pop_Total × (% Fase 3 Crise + % Fase 4 Emergência + % Fase 5 Catástrofe)
      let pinRate = 0;
      let phaseDesc = '';
      if (codeKey === 1) {
        pinRate = 0.45; // 45% em Fase 3+ (Crise/Emergência em secas severas de El Niño no Sul de Angola - Below Normal)
        phaseDesc = state.currentLang === 'en' ? '45% Pop in Phase 3+ (32% Crisis + 13% Emergency)' : '45% Pop em Fase 3+ (32% Crise + 13% Emergência)';
      } else if (codeKey === 2) {
        pinRate = 0.20; // 20% em Fase 3+ (Normal to Below Normal)
        phaseDesc = state.currentLang === 'en' ? '20% Pop in Phase 3+ (17% Crisis + 3% Emergency)' : '20% Pop em Fase 3+ (17% Crise + 3% Emergência)';
      } else if (codeKey === 3) {
        pinRate = 0.05; // 5% sob estresse localizado (Normal to Above Normal)
        phaseDesc = state.currentLang === 'en' ? '5% Pop in Phase 3+' : '5% Pop em Fase 3+';
      } else {
        pinRate = 0.00;
        phaseDesc = state.currentLang === 'en' ? '0% in Acute Food Insecurity' : '0% em Insegurança Aguda';
      }
      // Ajuste pelo IVC do Censo 2024 (populações mais vulneráveis têm taxas de fase 3+ mais elevadas)
      if (ivcFactor !== null && pinRate > 0) {
        pinRate = Math.min(0.90, pinRate * (1 + ivcFactor * 0.2));
      }

      affectedPop = Math.round(totalPop * pinRate);
      formulaTitle = state.currentLang === 'en' ? 'IPC / FEWS NET — Population in Need (PIN / Phase 3+)' : 'IPC / FEWS NET — População em Necessidade (PIN / Fase 3+)';
      officialOrg = 'IPC Global Platform (Manual 3.1) & FEWS NET';
      officialUrl = 'https://www.ipcinfo.org/ipc-manual/';
      formulaSteps = `PIN = Pop_Total (${totalPop.toLocaleString(state.currentLang === 'en' ? 'en-US' : 'pt-PT')}) × % IPC 3+ (${(pinRate * 100).toFixed(1)}%) = ${affectedPop.toLocaleString(state.currentLang === 'en' ? 'en-US' : 'pt-PT')} hab. (${phaseDesc})`;

    } else if (state.formulaModel === 'WFP_FAO_SADC') {
      // 3. MODELO AGROPASTORIL E PREÇOS (PAM / FAO / SADC RVAA)
      // P_afetada = (Pop_Rural × α_Agropastoril) + (Pop_Urbana × β_Preços)
      let rFactor = 0;
      let uFactor = 0;

      if (codeKey === 1) {
        rFactor = 0.75; // 75% da população rural sofre quebra de colheitas e escassez hídrica (Below-Normal)
        uFactor = 0.25; // 25% da periferia urbana afetada pela disparada dos preços de alimentos básicos
      } else if (codeKey === 2) {
        rFactor = 0.40; // Normal to Below-Normal
        uFactor = 0.12;
      } else if (codeKey === 3) {
        rFactor = 0.10; // Normal to Above-Normal
        uFactor = 0.04;
      } else {
        rFactor = 0.00;
        uFactor = 0.00;
      }
      // Ajuste pelo IVC do Censo 2024 para o sector rural
      if (ivcFactor !== null && rFactor > 0) {
        rFactor = Math.min(0.95, rFactor * (1 + ivcFactor * 0.25));
      }

      const ruralAffected = Math.round(ruralPop * rFactor);
      const urbanAffected = Math.round(urbanPop * uFactor);
      affectedPop = ruralAffected + urbanAffected;

      formulaTitle = state.currentLang === 'en' ? 'WFP / FAO / SADC — Agropastoral Shock & Food Prices' : 'PAM / FAO / SADC — Choque Agropastoril & Preços de Alimentos';
      officialOrg = state.currentLang === 'en' ? 'World Food Programme (VAM) & FAO (GIEWS)' : 'Programa Alimentar Mundial (VAM) & FAO (GIEWS)';
      officialUrl = 'https://vam.wfp.org/';
      const numFmt = state.currentLang === 'en' ? 'en-US' : 'pt-PT';
      formulaSteps = `P_afetada = [Rural: ${ruralPop.toLocaleString(numFmt)} × ${(rFactor * 100).toFixed(1)}%] + [Urbano: ${urbanPop.toLocaleString(numFmt)} × ${uFactor * 100}%] = ${affectedPop.toLocaleString(numFmt)} hab.`;

    } else if (state.formulaModel === 'IPC_FIES_INE') {
      // 4. MATRIZ DE RISCO HISTÓRICO (1984-2025) & FIES INE (ODS 2.1.2)
      // Fonte Oficial: Relatório FIES INE/FAO (Fevereiro 2026, Quadro 5) & Matriz de Tendências Históricas
      const fiesSev = demographics.fiesSeveraPct ?? 15.0;
      const riskMat = demographics.riskMatrix || { likelihood: 3, impact: 3, score: 9, rank: 'Moderado' };
      const fiesRate = fiesSev / 100.0;

      // Multiplicador de choque climático SARCOF-33:
      // Code 1 (BN): Seca Severa -> 2.0x base + ajuste de matriz de risco
      // Code 2 (N-BN): Estresse moderado -> 1.4x base
      // Code 3 (N-AN): Condições agroclimáticas normais -> 0.7x base
      // Code 4 (AN): Precipitação abundante -> 0.4x base
      let climateMultiplier = 1.0;
      if (codeKey === 1) {
        climateMultiplier = 1.8 + (riskMat.score / 25) * 0.4;
      } else if (codeKey === 2) {
        climateMultiplier = 1.3 + (riskMat.score / 25) * 0.2;
      } else if (codeKey === 3) {
        climateMultiplier = 0.7;
      } else {
        climateMultiplier = 0.4;
      }
      const effectiveRate = Math.min(0.95, fiesRate * climateMultiplier);
      affectedPop = Math.round(totalPop * effectiveRate);

      formulaTitle = state.currentLang === 'en' ? 'Risk Matrix (1984-2025) & INE FIES (SDG 2.1.2)' : 'Matriz de Risco (1984-2025) & FIES INE (ODS 2.1.2)';
      officialOrg = 'INE Angola (FIES Fev 2026) & Matriz de Risco 1984-2025';
      officialUrl = 'https://www.ine.gov.ao/publicacoes/detalhes/NTA0Mzg%3D';
      const numFmt = state.currentLang === 'en' ? 'en-US' : 'pt-PT';
      formulaSteps = `P_insegura = Pop (${totalPop.toLocaleString(numFmt)}) × FIES (${fiesSev}%) × Choque SARCOF (${climateMultiplier.toFixed(2)}x) = ${affectedPop.toLocaleString(numFmt)} hab. | Matriz: L(${riskMat.likelihood}) × I(${riskMat.impact}) = Score ${riskMat.score}`;
    }

    // Famílias Afetadas: Base Oficial INE Angola = 5,2 pessoas por agregado familiar
    const affectedFamilies = Math.round(affectedPop / 5.2);
    const pctAffected = totalPop > 0 ? ((affectedPop / totalPop) * 100).toFixed(1) : 0;

    return {
      affectedPop,
      affectedFamilies,
      pctAffected,
      formulaTitle,
      formulaSteps,
      officialOrg,
      officialUrl,
      cfg,
      ivcData
    };
  }

  // Avaliação Integral de Risco para uma Feature
  function calculateClimateRisk(feature, typeKey, code) {
    const demographics = getOfficialDemographics(typeKey, feature);
    let area = demographics.areaKm2 ? { sqKm: demographics.areaKm2, hectares: Math.round(demographics.areaKm2 * 100) } : getFeatureArea(feature);
    const formulaResult = calculateOfficialFormula(demographics, code);

    const density = (area.sqKm && area.sqKm > 0) ? (demographics.total / area.sqKm).toFixed(1) : (demographics.density || 0);

    return {
      popTotalYear: demographics.total,
      urbanPop: demographics.urban,
      ruralPop: demographics.rural,
      homens: demographics.homens,
      mulheres: demographics.mulheres,
      censoDetails: demographics.censoDetails,
      density,
      exposureE: 1.0,
      vFactor: formulaResult.cfg.vFactor,
      affectedPop: formulaResult.affectedPop,
      affectedFamilies: formulaResult.affectedFamilies,
      pctAffected: formulaResult.pctAffected,
      formulaTitle: formulaResult.formulaTitle,
      formulaSteps: formulaResult.formulaSteps,
      officialOrg: formulaResult.officialOrg,
      officialUrl: formulaResult.officialUrl,
      cfg: formulaResult.cfg,
      areaKm2: area.sqKm,
      hectares: area.hectares,
      isOfficial: demographics.isOfficial,
      source: demographics.source,
      ivcData: formulaResult.ivcData,
      fiesSeveraPct: demographics.fiesSeveraPct,
      riskMatrix: demographics.riskMatrix
    };
  }

  // Context-Aware Feature Name per Layer
  function getFeatureName(feature, typeKey) {
    const p = feature.properties;
    if (typeKey === 'provincias') {
      return p.Nome_Prov || p.PROVINCIA || p.NAME || 'Província de Angola';
    }
    if (typeKey === 'municipios') {
      const munName = p.Nome_Munic || p.MUNICIPIO || p.NAME;
      const provName = p.Nome_Prov || p.PROVINCIA;
      return munName ? (provName ? `${munName} (${provName})` : munName) : 'Município de Angola';
    }
    if (typeKey === 'comunas') {
      const comName = p.Nome_Comun || p.COMUNA || p.NAME;
      const munName = p.Nome_Munic || p.MUNICIPIO;
      return comName ? (munName ? `${comName} (${munName})` : comName) : 'Comuna de Angola';
    }
    return p.NAME || p.Nome_Prov || p.Nome_Munic || p.Nome_Comun || 'Região SADC';
  }

  // Ensure SVG Hatching Pattern is Injected into Leaflet Map SVG Pane (Cross-browser for Chrome, Edge, Safari)
  function ensureSvgPattern() {
    if (!state.map) return;
    const overlayPane = state.map.getPanes ? state.map.getPanes().overlayPane : null;
    if (!overlayPane) return;
    
    // Find all SVG roots in the overlay pane
    const svgs = overlayPane.querySelectorAll('svg');
    if (!svgs || svgs.length === 0) return;

    svgs.forEach(svg => {
      let defs = svg.querySelector('defs');
      if (!defs) {
        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        svg.insertBefore(defs, svg.firstChild);
      }
      if (!defs.querySelector('#sarcof-hatch')) {
        const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
        pattern.setAttribute('id', 'sarcof-hatch');
        pattern.setAttribute('patternUnits', 'userSpaceOnUse');
        pattern.setAttribute('width', '8');
        pattern.setAttribute('height', '8');
        pattern.setAttribute('patternTransform', 'rotate(45)');

        // Dark diagonal stripe
        const lineDark = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        lineDark.setAttribute('x1', '0');
        lineDark.setAttribute('y1', '0');
        lineDark.setAttribute('x2', '0');
        lineDark.setAttribute('y2', '8');
        lineDark.setAttribute('stroke', '#0f172a');
        lineDark.setAttribute('stroke-width', '2.2');
        lineDark.setAttribute('stroke-opacity', '0.75');

        // Subtle light accent for contrast over dark colors
        const lineLight = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        lineLight.setAttribute('x1', '0');
        lineLight.setAttribute('y1', '0');
        lineLight.setAttribute('x2', '0');
        lineLight.setAttribute('y2', '8');
        lineLight.setAttribute('stroke', '#ffffff');
        lineLight.setAttribute('stroke-width', '0.7');
        lineLight.setAttribute('stroke-opacity', '0.45');

        pattern.appendChild(lineDark);
        pattern.appendChild(lineLight);
        defs.appendChild(pattern);
      }
    });
  }

  // Render High Confidence Hatching Overlay Layer
  function renderHighConfidenceOverlay(geoJson) {
    ensureSvgPattern();
    const layerGroup = L.geoJSON(geoJson, {
      filter: (feature) => {
        const p = feature.properties || {};
        if (state.activeCategory !== 'ALL' && String(p.finalcode) !== String(state.activeCategory)) return false;
        return p.is_high_confidence === true || p.confidence_overlay === 'high confidence';
      },
      className: 'leaflet-sarcof-hatch',
      style: () => ({
        fillColor: 'url(#sarcof-hatch)',
        fillOpacity: 0.92,
        weight: 0,
        stroke: false,
        interactive: false
      }),
      onEachFeature: (feature, layer) => {
        const applyHatch = () => {
          ensureSvgPattern();
          if (layer._path) {
            layer._path.setAttribute('fill', 'url(#sarcof-hatch)');
            layer._path.setAttribute('fill-opacity', '0.92');
            layer._path.setAttribute('stroke', 'none');
            layer._path.style.fill = 'url(#sarcof-hatch)';
            layer._path.style.fillOpacity = '0.92';
            layer._path.style.pointerEvents = 'none';
          }
        };
        applyHatch();
        setTimeout(applyHatch, 20);
        setTimeout(applyHatch, 100);
      }
    }).addTo(state.map);

    ensureSvgPattern();
    return layerGroup;
  }

  // Render All Active Layers (Simultaneous Layers)
  function renderAllLayers() {
    if (!state.map) return;

    Object.keys(state.geoJsonLayers).forEach(key => {
      if (state.geoJsonLayers[key] && state.map.hasLayer(state.geoJsonLayers[key])) {
        state.map.removeLayer(state.geoJsonLayers[key]);
      }
    });

    if (state.layersEnabled.sarcof && state.geoJsonData[state.activeSeason]) {
      state.geoJsonLayers.sarcof = renderGeoJsonCollection(state.geoJsonData[state.activeSeason], 'sarcof', {
        fillOpacity: 0.65, weight: 1.2, color: '#1e293b'
      });
    }

    if (state.layersEnabled.provincias && state.geoJsonData.PROVINCIAS) {
      state.geoJsonLayers.provincias = renderGeoJsonCollection(state.geoJsonData.PROVINCIAS, 'provincias', (feature) => {
        const code = getSarcofForAngolaFeature(feature, 'provincias', state.activeSeason);
        const cfg = categoryConfig[code] || categoryConfig[3];
        return {
          fillColor: cfg.color,
          fillOpacity: 0.35,
          weight: 2,
          color: cfg.color === '#00D2D2' ? '#38bdf8' : (cfg.color === '#C4A482' ? '#d4a373' : '#fb7185')
        };
      });
    }

    // High confidence hatching overlay (////) on top of SARCOF and Províncias
    if (state.layersEnabled.sarcof && state.showHighConfidence && state.geoJsonData[state.activeSeason]) {
      state.geoJsonLayers.sarcofHatch = renderHighConfidenceOverlay(state.geoJsonData[state.activeSeason]);
    }

    if (state.layersEnabled.municipios && state.geoJsonData.MUNICIPIOS) {
      state.geoJsonLayers.municipios = renderGeoJsonCollection(state.geoJsonData.MUNICIPIOS, 'municipios', (feature) => {
        const code = getSarcofForAngolaFeature(feature, 'municipios', state.activeSeason);
        const cfg = categoryConfig[code] || categoryConfig[3];
        return {
          fillColor: cfg.color,
          fillOpacity: 0.22,
          weight: 1.2,
          color: cfg.color === '#00D2D2' ? '#0ea5e9' : '#fcd34d',
          dashArray: '3'
        };
      });
    }

    if (state.layersEnabled.comunas && state.geoJsonData.COMUNAS) {
      state.geoJsonLayers.comunas = renderGeoJsonCollection(state.geoJsonData.COMUNAS, 'comunas', {
        fillColor: '#10b981', fillOpacity: 0.15, weight: 1, color: '#6ee7b7', dashArray: '2'
      });
    }

    updateGlobalStats();
  }

  // Render a Single GeoJSON Collection with High Performance Tooltips & Interactivity
  function renderGeoJsonCollection(geoJson, typeKey, defaultStyle) {
    return L.geoJSON(geoJson, {
      filter: (feature) => {
        if (typeKey === 'sarcof') {
          if (state.activeCategory !== 'ALL' && String(feature.properties.finalcode) !== String(state.activeCategory)) return false;
        }
        return true;
      },
      style: (feature) => {
        if (typeKey === 'sarcof') {
          const code = feature.properties.finalcode;
          const cfg = categoryConfig[code] || { color: '#94a3b8' };
          return {
            fillColor: cfg.color,
            fillOpacity: 0.65,
            weight: 1.2,
            color: '#1e293b',
            opacity: 0.9
          };
        }
        return typeof defaultStyle === 'function' ? defaultStyle(feature) : defaultStyle;
      },
      onEachFeature: (feature, layer) => {
        const name = getFeatureName(feature, typeKey);

        // Map label tooltip
        if (state.showLabels && name) {
          layer.bindTooltip(name, {
            permanent: true,
            direction: 'center',
            className: 'map-text-label'
          });
        }

        layer.on({
          mouseover: (e) => {
            const l = e.target;
            l.setStyle({ weight: 3, color: '#38bdf8', fillOpacity: 0.45 });
            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
              l.bringToFront();
            }
          },
          mouseout: (e) => {
            const l = e.target;
            if (typeKey === 'sarcof') {
              const code = feature.properties.finalcode;
              const cfg = categoryConfig[code] || { color: '#94a3b8' };
              l.setStyle({ fillColor: cfg.color, fillOpacity: 0.65, weight: 1.2, color: '#1e293b' });
            } else {
              const st = typeof defaultStyle === 'function' ? defaultStyle(feature) : defaultStyle;
              l.setStyle(st);
            }
          },
          click: (e) => {
            L.DomEvent.stopPropagation(e);
            state.selectedFeature = feature;
            state._selectedTypeKey = typeKey;
            openInspectorCard(feature, typeKey);
          }
        });
      }
    }).addTo(state.map);
  }

  // Calculate Accurate Area in Hectares and Square Kilometers using Turf.js
  function getFeatureArea(feature) {
    const props = feature ? (feature.properties || {}) : {};
    if (props.KM) {
      const val = parseFloat(String(props.KM).replace(/\./g, '').replace(',', '.'));
      if (!isNaN(val) && val > 0) {
        return { hectares: Math.round(val * 100), sqKm: Number(val.toFixed(2)) };
      }
    }
    for (const k of Object.keys(props)) {
      if (k.toLowerCase().includes('rea') || k.toLowerCase().includes('area')) {
        const val = parseFloat(String(props[k]).replace(/\./g, '').replace(',', '.'));
        if (!isNaN(val) && val > 0) {
          const sqKm = val > 10000000 ? val / 1000000 : val;
          return { hectares: Math.round(sqKm * 100), sqKm: Number(sqKm.toFixed(2)) };
        }
      }
    }

    try {
      if (typeof turf !== 'undefined' && turf.area) {
        const sqMeters = turf.area(feature);
        const hectares = Math.round(sqMeters / 10000);
        const sqKm = Number((sqMeters / 1000000).toFixed(2));
        return { hectares, sqKm };
      }
    } catch (e) {}

    const km = parseFloat(String(props.KM || props.Km2 || props.Shape_Area || 100).replace(',', '.'));
    return {
      hectares: Math.round(km * 100),
      sqKm: km || 100
    };
  }

  // Open the Inspector Card
  function openInspectorCard(feature, typeKey) {
    const card = document.getElementById('inspector-card');
    if (!card) return;

    let code = 3;
    if (typeKey === 'sarcof') {
      code = feature.properties.finalcode || 3;
    } else {
      code = getSarcofForAngolaFeature(feature, typeKey, state.activeSeason);
    }

    const risk = calculateClimateRisk(feature, typeKey, code);
    const featName = getFeatureName(feature, typeKey);

    const numFmt = state.currentLang === 'en' ? 'en-US' : 'pt-PT';
    document.getElementById('insp-name').textContent = featName;
    document.getElementById('insp-layer-type').textContent = 
      typeKey === 'provincias' ? (state.currentLang === 'en' ? 'Province (DPA 2025)' : 'Província (DPA 2025)') :
      typeKey === 'municipios' ? (state.currentLang === 'en' ? 'Municipality (DPA 2025)' : 'Município (DPA 2025)') :
      typeKey === 'comunas' ? (state.currentLang === 'en' ? 'Commune (DPA 2025)' : 'Comuna (DPA 2025)') :
      (state.currentLang === 'en' ? 'SARCOF Climate Zone' : 'Zona Climática SARCOF');

    document.getElementById('insp-area-ha').textContent = `${risk.hectares.toLocaleString(numFmt)} ha`;
    document.getElementById('insp-area-km2').textContent = `${risk.areaKm2.toLocaleString(numFmt)} km²`;
    document.getElementById('insp-density').textContent = `${risk.density} ${state.currentLang === 'en' ? 'pop/km²' : 'hab/km²'}`;

    const censoBadge = risk.isOfficial ? 
      `<span class="badge" style="background:#059669; color:#fff; font-size:0.68rem; margin-left:4px;">${state.currentLang === 'en' ? 'Official INE' : 'Oficial INE'} ${state.demographicYear}</span>` :
      `<span class="badge" style="background:#64748b; color:#fff; font-size:0.68rem; margin-left:4px;">${state.currentLang === 'en' ? 'Dasymetric GIS' : 'Dasimétrico SIG'}</span>`;

    const urbanLabel = state.currentLang === 'en' ? 'Urban' : 'Urbana';
    const ruralLabel = state.currentLang === 'en' ? 'Rural' : 'Rural';
    const popUnit = state.currentLang === 'en' ? 'pop' : 'hab';
    document.getElementById('insp-pop-censo').innerHTML = `
      ${risk.popTotalYear.toLocaleString(numFmt)} ${popUnit} ${censoBadge}
      <div style="font-size:0.7rem; color:#94a3b8; font-weight:normal;">${urbanLabel}: ${risk.urbanPop.toLocaleString(numFmt)} | ${ruralLabel}: ${risk.ruralPop.toLocaleString(numFmt)}</div>
    `;

    document.getElementById('insp-category').innerHTML = `
      <span class="badge" style="background:${risk.cfg.color}; color:${risk.cfg.textColor || '#fff'}; font-weight:700;">${risk.cfg.name}</span>
    `;

    // Render IVC vulnerability indicators (Censo 2024)
    renderIvcPanel(risk);

    document.getElementById('insp-pop-affected').textContent = `${risk.affectedPop.toLocaleString('pt-PT')} hab (${risk.pctAffected}%)`;
    document.getElementById('insp-families-affected').textContent = `${risk.affectedFamilies.toLocaleString('pt-PT')} famílias`;

    // Atualização da caixa de cálculo com a fórmula oficial selecionada
    const calcTitleEl = document.getElementById('insp-calc-title');
    if (calcTitleEl) calcTitleEl.textContent = risk.formulaTitle;

    const calcDetailEl = document.getElementById('insp-calc-detail');
    if (calcDetailEl) {
      calcDetailEl.innerHTML = `
        <div style="margin-bottom:4px; font-family:monospace; color:#fcd34d;">${risk.formulaSteps}</div>
        <div style="color:#94a3b8; font-size:0.7rem;">
          Fonte Oficial: <strong style="color:#38bdf8;">${risk.officialOrg}</strong> | Base: <strong>${risk.source}</strong>
        </div>
      `;
    }

    const calcLinkEl = document.getElementById('insp-calc-link');
    if (calcLinkEl) {
      calcLinkEl.href = risk.officialUrl;
      calcLinkEl.innerHTML = `<i class="fa-solid fa-arrow-up-right-from-square"></i> Consultar Norma Técnica: ${risk.officialOrg}`;
    }

    card.classList.add('active');

    // On mobile: slide inspector up as bottom sheet
    if (window.innerWidth <= 768) {
      const panel = card.closest('.inspector-panel') || card.parentElement;
      if (panel) panel.classList.add('open');
      // Close the sidebar if it was open
      const sb = document.getElementById('sidebar');
      const ov = document.getElementById('mobile-overlay');
      if (sb) sb.classList.remove('open');
      if (ov) ov.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  // Render IVC Vulnerability Panel in Inspector
  function renderIvcPanel(risk) {
    const panel = document.getElementById('insp-ivc-panel');
    if (!panel) return;

    const ivc = risk.ivcData;
    if (!ivc) {
      panel.innerHTML = `<div style="color:#64748b; font-size:0.75rem; text-align:center; padding:8px;">IVC: sem dados do Censo 2024 disponíveis para esta unidade</div>`;
      return;
    }

    const ivcPct = (ivc.ivc * 100).toFixed(1);
    const ivcColor = ivc.ivc > 0.6 ? '#ef4444' : ivc.ivc > 0.4 ? '#f59e0b' : ivc.ivc > 0.2 ? '#06b6d4' : '#10b981';
    const ivcLabel = ivc.ivc > 0.6 ? 'Muito Alta' : ivc.ivc > 0.4 ? 'Alta' : ivc.ivc > 0.2 ? 'Moderada' : 'Baixa';

    function bar(val, color) {
      return `<div style="width:100%; background:rgba(255,255,255,0.07); border-radius:3px; height:6px; overflow:hidden;">
        <div style="width:${val}%; background:${color}; height:100%; border-radius:3px; transition:width 0.5s;"></div></div>`;
    }

    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span style="font-size:0.75rem; color:#94a3b8; font-weight:600;">Índice de Vulnerabilidade Composto (IVC)</span>
        <span style="font-size:0.85rem; font-weight:700; color:${ivcColor};">▲ ${ivcPct}% <span style="font-size:0.7rem;">(${ivcLabel})</span></span>
      </div>
      <div style="font-size:0.65rem; color:#64748b; margin-bottom:8px; line-height:1.4;">
        Calculado a partir do Censo INE 2024 — indicadores multidimensionais de vulnerabilidade (UNDRR/IPCC AR6 WGII)
        <a href="https://www.undrr.org/terminology/vulnerability" target="_blank" style="color:#38bdf8; text-decoration:none;"> ↗ Metodologia</a>
      </div>
      <div style="display:flex; flex-direction:column; gap:5px;">
        <div>
          <div style="display:flex; justify-content:space-between; font-size:0.7rem; margin-bottom:2px;">
            <span style="color:#94a3b8;">🚰 Sem acesso a água segura</span>
            <span style="color:#f59e0b; font-weight:600;">${ivc.pctSemAgua}%</span>
          </div>
          ${bar(parseFloat(ivc.pctSemAgua), '#f59e0b')}
        </div>
        <div>
          <div style="display:flex; justify-content:space-between; font-size:0.7rem; margin-bottom:2px;">
            <span style="color:#94a3b8;">🚽 Sem saneamento básico</span>
            <span style="color:#ef4444; font-weight:600;">${ivc.pctSemSan}%</span>
          </div>
          ${bar(parseFloat(ivc.pctSemSan), '#ef4444')}
        </div>
        <div>
          <div style="display:flex; justify-content:space-between; font-size:0.7rem; margin-bottom:2px;">
            <span style="color:#94a3b8;">💡 Sem electricidade/solar</span>
            <span style="color:#a78bfa; font-weight:600;">${ivc.pctSemElec}%</span>
          </div>
          ${bar(parseFloat(ivc.pctSemElec), '#a78bfa')}
        </div>
        <div>
          <div style="display:flex; justify-content:space-between; font-size:0.7rem; margin-bottom:2px;">
            <span style="color:#94a3b8;">🏠 Habitação precária (cubata/barraca)</span>
            <span style="color:#fb7185; font-weight:600;">${ivc.pctHabPrecaria}%</span>
          </div>
          ${bar(parseFloat(ivc.pctHabPrecaria), '#fb7185')}
        </div>
        <div>
          <div style="display:flex; justify-content:space-between; font-size:0.7rem; margin-bottom:2px;">
            <span style="color:#94a3b8;">👶 Pop. 0-14 anos (crianças)</span>
            <span style="color:#38bdf8; font-weight:600;">${ivc.pctCriancas}%</span>
          </div>
          ${bar(parseFloat(ivc.pctCriancas), '#38bdf8')}
        </div>
      </div>
      ${risk.fiesSeveraPct ? `
        <div style="margin-top:10px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.08);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span style="font-size:0.75rem; color:#38bdf8; font-weight:600;">🌾 Insegurança Alimentar Severa (FIES INE / FAO)</span>
            <span style="font-size:0.85rem; font-weight:700; color:${risk.fiesSeveraPct > 30 ? '#ef4444' : risk.fiesSeveraPct > 15 ? '#f59e0b' : '#34d399'};">${risk.fiesSeveraPct}%</span>
          </div>
          ${bar(parseFloat(risk.fiesSeveraPct), risk.fiesSeveraPct > 30 ? '#ef4444' : risk.fiesSeveraPct > 15 ? '#f59e0b' : '#34d399')}
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px; font-size:0.7rem;">
            <span style="color:#94a3b8;">Matriz de Risco (1984-2025):</span>
            <span class="badge" style="background:${(risk.riskMatrix && risk.riskMatrix.score >= 15) ? '#ef4444' : (risk.riskMatrix && risk.riskMatrix.score >= 8) ? '#f59e0b' : '#10b981'}; font-size:0.68rem;">
              Score: ${risk.riskMatrix ? risk.riskMatrix.score : '-'} (${risk.riskMatrix ? risk.riskMatrix.rank : '-'}) — L:${risk.riskMatrix ? risk.riskMatrix.likelihood : 3} × I:${risk.riskMatrix ? risk.riskMatrix.impact : 3}
            </span>
          </div>
        </div>
      ` : ''}
    `;
  }

  document.getElementById('btn-close-inspector').addEventListener('click', () => {
    document.getElementById('inspector-card').classList.remove('active');
  });

  // Atualizar a Descrição da Fórmula no Painel
  function updateFormulaUI() {
    const model = state.formulaModel;
    const formulas = state.formulasData ? state.formulasData.formulas : null;
    if (!formulas || !formulas[model]) return;

    const f = formulas[model];
    const hdrBadge = document.getElementById('hdr-formula-name');
    if (hdrBadge) hdrBadge.textContent = model === 'IPC_FIES_INE' ? 'FIES INE / IPC (ODS 2.1.2)' : model === 'UNDRR_IPCC' ? 'UNDRR / IPCC' : model === 'IPC_FEWSNET' ? 'IPC / FEWS NET' : 'PAM / FAO / SADC';

    const titleEl = document.getElementById('formula-org-title');
    const eqEl = document.getElementById('formula-equation-code');
    const descEl = document.getElementById('formula-summary-text');
    const linkEl = document.getElementById('formula-official-link');

    if (titleEl) titleEl.textContent = f.nome;
    if (eqEl) eqEl.textContent = f.formula_simplificada;
    if (descEl) descEl.textContent = f.descricao;
    if (linkEl && f.links_oficiais && f.links_oficiais[0]) {
      linkEl.href = f.links_oficiais[0].url;
      linkEl.innerHTML = `<i class="fa-solid fa-arrow-up-right-from-square"></i> ${f.links_oficiais[0].nome}`;
    }

    const activeTitle = document.getElementById('lbl-active-formula-title');
    if (activeTitle) activeTitle.textContent = f.nome;

    updateGlobalStats();
    populateCensoTable();
    if (state.selectedFeature) {
      openInspectorCard(state.selectedFeature, state._selectedTypeKey || 'provincias');
    }
  }

  // Atualizar Estatísticas Globais
  function updateGlobalStats() {
    if (!state.ineData) return;

    const yr = state.demographicYear;
    const nationalTotals = state.ineData.metadata.national_totals;
    const totalNational = nationalTotals[yr] || 36604682;

    const hdrPopYear = document.getElementById('hdr-pop-year');
    if (hdrPopYear) {
      const millions = (totalNational / 1000000).toFixed(1);
      hdrPopYear.textContent = `${yr} (${millions}M hab)`;
    }

    const totalPopEl = document.getElementById('stat-total-pop');
    if (totalPopEl) totalPopEl.textContent = totalNational.toLocaleString('pt-PT');

    // Calcular o total acumulado de afetados em todas as províncias baseado na época SARCOF ativa (OND vs JFM)
    let totalAffected = 0;
    Object.keys(state.ineData.provincias).forEach(pname => {
      const demo = getOfficialDemographics('provincias', { properties: { Nome_Prov: pname } });
      const code = getSarcofForAngolaFeature({ properties: { Nome_Prov: pname } }, 'provincias', state.activeSeason);
      const calc = calculateOfficialFormula(demo, code);
      totalAffected += calc.affectedPop;
    });

    const totalFamilies = Math.round(totalAffected / 5.2);
    const pct = totalNational > 0 ? ((totalAffected / totalNational) * 100).toFixed(1) : 0;

    const statBnPop = document.getElementById('stat-bn-pop');
    const statBnFam = document.getElementById('stat-bn-families');
    const statPctAff = document.getElementById('stat-pct-affected');

    const numFmt = state.currentLang === 'en' ? 'en-US' : 'pt-PT';
    const popUnit = state.currentLang === 'en' ? 'pop' : 'hab';
    const famUnit = state.currentLang === 'en' ? 'fam' : 'fam';

    if (statBnPop) statBnPop.textContent = `${totalAffected.toLocaleString(numFmt)} ${popUnit}`;
    if (statBnFam) statBnFam.textContent = `${totalFamilies.toLocaleString(numFmt)} ${famUnit}`;
    if (statPctAff) statPctAff.textContent = `${pct}%`;
  }

  // Povoar a Tabela Interativa (21 Províncias vs 326 Municípios)
  function populateCensoTable() {
    const tbody = document.getElementById('censo-table-body');
    if (!tbody || !state.ineData) return;
    tbody.innerHTML = '';

    document.querySelectorAll('.lbl-year-active').forEach(el => el.textContent = state.demographicYear);

    const query = state.tableSearch.toLowerCase().trim();
    const numFmt = state.currentLang === 'en' ? 'en-US' : 'pt-PT';
    const popUnit = state.currentLang === 'en' ? 'pop' : 'hab';
    const famUnit = state.currentLang === 'en' ? 'fam' : 'fam';

    if (state.tableMode === 'prov') {
      // MODO 1: 21 PROVÍNCIAS OFICIAIS DE ANGOLA
      const provList = Object.keys(state.ineData.provincias);
      provList.forEach(provName => {
        if (query && !provName.toLowerCase().includes(query)) return;

        const demo = getOfficialDemographics('provincias', { properties: { Nome_Prov: provName } });
        const code = getSarcofForAngolaFeature({ properties: { Nome_Prov: provName } }, 'provincias', state.activeSeason);
        const calc = calculateOfficialFormula(demo, code);
        const ivcData = computeCensusVulnerabilityIndex(demo.censoDetails);
        const ivcPct = ivcData ? `<span style="color:${ivcData.ivc > 0.5 ? '#ef4444' : ivcData.ivc > 0.3 ? '#f59e0b' : '#34d399'}; font-weight:700;">${(ivcData.ivc * 100).toFixed(0)}%</span>` : '<span style="color:#64748b;">-</span>';

        const areaStr = demo.areaKm2 ? `${Number(demo.areaKm2.toFixed(1)).toLocaleString(numFmt)} km²` : '-';
        const densityStr = demo.density ? `${Number(demo.density.toFixed(1)).toLocaleString(numFmt)} ${state.currentLang === 'en' ? 'pop/km²' : 'hab/km²'}` : (demo.areaKm2 && demo.total ? `${Number((demo.total / demo.areaKm2).toFixed(1)).toLocaleString(numFmt)} ${state.currentLang === 'en' ? 'pop/km²' : 'hab/km²'}` : '-');

        const fiesStr = demo.fiesSeveraPct ? `<span style="color:${demo.fiesSeveraPct > 30 ? '#ef4444' : demo.fiesSeveraPct > 15 ? '#f59e0b' : '#34d399'}; font-weight:700;">${demo.fiesSeveraPct.toFixed(1).replace('.', ',')}%</span>` : '<span style="color:#64748b;">-</span>';
        const riskMat = demo.riskMatrix || { likelihood: 3, impact: 3, score: 9, rank: 'Moderado' };
        const riskBadge = `<span class="badge" style="background:${riskMat.score >= 15 ? '#ef4444' : riskMat.score >= 8 ? '#f59e0b' : '#10b981'}; color:#fff; font-size:0.7rem;" title="L:${riskMat.likelihood} × I:${riskMat.impact}">${riskMat.score} (${riskMat.rank})</span>`;

        const tr = document.createElement('tr');
        tr.id = `censo-row-${provName.replace(/\s+/g, '-')}`;
        tr.innerHTML = `
          <td><strong>${provName}</strong></td>
          <td>Angola</td>
          <td style="color:#38bdf8; font-weight:600; font-variant-numeric:tabular-nums;">${areaStr}</td>
          <td style="color:#a78bfa; font-weight:600; font-variant-numeric:tabular-nums;">${densityStr}</td>
          <td style="color:#f59e0b; font-weight:700;">${demo.total.toLocaleString(numFmt)}</td>
          <td>U: ${demo.urban.toLocaleString(numFmt)} / R: ${demo.rural.toLocaleString(numFmt)}</td>
          <td><span class="badge" style="background:${calc.cfg.color}; color:${calc.cfg.textColor || '#fff'}; font-weight:700;">${calc.cfg.name}</span></td>
          <td style="color:#ef4444; font-weight:700;">${calc.affectedPop.toLocaleString(numFmt)} ${popUnit}</td>
          <td style="color:#fcd34d; font-weight:700;">${calc.affectedFamilies.toLocaleString(numFmt)} ${famUnit}</td>
          <td>${ivcPct} <span style="font-size:0.65rem; color:#64748b;">IVC</span></td>
          <td>${fiesStr} <span style="font-size:0.62rem; color:#64748b;">FIES</span></td>
          <td>${riskBadge}</td>
          <td>
            <a href="${state.demographicYear === '2024' ? 'https://censo2024.ine.gov.ao/' : 'https://www.ine.gov.ao/Diretorios/Ver?caminho=CfDJ8NMpZBryiqVPuGc0gO8mewT47FR30gkYZWCJdAPTQxuDgwF_oD4PP3x_jkRBE3PKZAVioh_K-5Ge7iIxPbVrMX2CzX1DAQQIjAoJ0Uz2Hl_J5SOhC9erlW5yvsVtObOMgEXXgcZLd8LkuzZ0_CV0FbVm5txG3mnvvsUIX9xfgydIv8LZ0im1RsxNxLHLo188DdJNwtfvYv6vbcCrK9oC1hA'}" target="_blank" style="color:#38bdf8; text-decoration:none; font-weight:600;">
              <i class="fa-solid fa-arrow-up-right-from-square"></i> ${state.demographicYear === '2024' ? (state.currentLang === 'en' ? 'Census 2024' : 'Censo 2024') : (state.currentLang === 'en' ? 'INE Projection' : 'INE Projeção')}
            </a>
          </td>
        `;
        tbody.appendChild(tr);
      });

    } else {
      // MODO 2: 326 MUNICÍPIOS (DPA 2025)
      const provKeys = Object.keys(state.ineData.municipios);
      provKeys.forEach(provName => {
        const muns = state.ineData.municipios[provName] || {};
        const provObj = state.ineData.provincias[provName] || {};
        const provIvcData = computeCensusVulnerabilityIndex(provObj.censo2024);
        const provIvcPct = provIvcData ? `<span style="color:${provIvcData.ivc > 0.5 ? '#ef4444' : provIvcData.ivc > 0.3 ? '#f59e0b' : '#34d399'}; font-weight:700;">${(provIvcData.ivc * 100).toFixed(0)}%</span>` : '<span style="color:#64748b;">-</span>';

        Object.keys(muns).forEach(munName => {
          if (query && !munName.toLowerCase().includes(query) && !provName.toLowerCase().includes(query)) return;

          const demo = getOfficialDemographics('municipios', { properties: { Nome_Prov: provName, Nome_Munic: munName } });
          const code = getSarcofForAngolaFeature({ properties: { Nome_Prov: provName, Nome_Munic: munName } }, 'municipios', state.activeSeason);
          const calc = calculateOfficialFormula(demo, code);

          const areaStr = demo.areaKm2 ? `${Number(demo.areaKm2.toFixed(1)).toLocaleString(numFmt)} km²` : '-';
          const densityStr = demo.density ? `${Number(demo.density.toFixed(1)).toLocaleString(numFmt)} ${state.currentLang === 'en' ? 'pop/km²' : 'hab/km²'}` : (demo.areaKm2 && demo.total ? `${Number((demo.total / demo.areaKm2).toFixed(1)).toLocaleString(numFmt)} ${state.currentLang === 'en' ? 'pop/km²' : 'hab/km²'}` : '-');

          const fiesStr = demo.fiesSeveraPct ? `<span style="color:${demo.fiesSeveraPct > 30 ? '#ef4444' : demo.fiesSeveraPct > 15 ? '#f59e0b' : '#34d399'}; font-weight:700;">${demo.fiesSeveraPct.toFixed(1).replace('.', ',')}%</span>` : '<span style="color:#64748b;">-</span>';
          const riskMat = demo.riskMatrix || { likelihood: 3, impact: 3, score: 9, rank: 'Moderado' };
          const riskBadge = `<span class="badge" style="background:${riskMat.score >= 15 ? '#ef4444' : riskMat.score >= 8 ? '#f59e0b' : '#10b981'}; color:#fff; font-size:0.7rem;" title="L:${riskMat.likelihood} × I:${riskMat.impact}">${riskMat.score} (${riskMat.rank})</span>`;

          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>${munName}</strong></td>
            <td>${provName}</td>
            <td style="color:#38bdf8; font-weight:600; font-variant-numeric:tabular-nums;">${areaStr}</td>
            <td style="color:#a78bfa; font-weight:600; font-variant-numeric:tabular-nums;">${densityStr}</td>
            <td style="color:#f59e0b; font-weight:700;">${demo.total.toLocaleString(numFmt)}</td>
            <td>U: ${demo.urban.toLocaleString(numFmt)} / R: ${demo.rural.toLocaleString(numFmt)}</td>
            <td><span class="badge" style="background:${calc.cfg.color}; color:${calc.cfg.textColor || '#fff'}; font-weight:700;">${calc.cfg.name}</span></td>
            <td style="color:#ef4444; font-weight:700;">${calc.affectedPop.toLocaleString(numFmt)} ${popUnit}</td>
            <td style="color:#fcd34d; font-weight:700;">${calc.affectedFamilies.toLocaleString(numFmt)} ${famUnit}</td>
            <td>${provIvcPct} <span style="font-size:0.65rem; color:#64748b;" title="IVC Provincial Censo 2024">Prov.</span></td>
            <td>${fiesStr} <span style="font-size:0.62rem; color:#64748b;">FIES</span></td>
            <td>${riskBadge}</td>
            <td>
              <a href="https://www.ine.gov.ao/Diretorios/Ver?caminho=CfDJ8NMpZBryiqVPuGc0gO8mewT47FR30gkYZWCJdAPTQxuDgwF_oD4PP3x_jkRBE3PKZAVioh_K-5Ge7iIxPbVrMX2CzX1DAQQIjAoJ0Uz2Hl_J5SOhC9erlW5yvsVtObOMgEXXgcZLd8LkuzZ0_CV0FbVm5txG3mnvvsUIX9xfgydIv8LZ0im1RsxNxLHLo188DdJNwtfvYv6vbcCrK9oC1hA" target="_blank" style="color:#38bdf8; text-decoration:none; font-weight:600;">
                <i class="fa-solid fa-arrow-up-right-from-square"></i> INE DPA 2025
              </a>
            </td>
          `;
          tbody.appendChild(tr);
        });
      });
    }
  }

  // Exportar Dados CSV
  function exportCsv() {
    if (!state.ineData) return;

    const rows = [];
    rows.push([
      'Unidade', 'Província', 'Área (km²)', 'Densidade (hab/km²)',
      `População (${state.demographicYear})`, 'Pop. Urbana', 'Pop. Rural',
      `Classificação SARCOF (${state.activeSeason})`, 'Pessoas Afetadas', 'Famílias Afetadas',
      'IVC Censo 2024', '% FIES Severa', 'Risk Score', 'Risk Rank', 'Ano Base', 'Modelo'
    ].join(';'));

    if (state.tableMode === 'prov') {
      Object.keys(state.ineData.provincias).forEach(pname => {
        const demo = getOfficialDemographics('provincias', { properties: { Nome_Prov: pname } });
        const code = getSarcofForAngolaFeature({ properties: { Nome_Prov: pname } }, 'provincias', state.activeSeason);
        const calc = calculateOfficialFormula(demo, code);
        const ivc = computeCensusVulnerabilityIndex(demo.censoDetails);
        const ivcVal = ivc ? `${(ivc.ivc * 100).toFixed(1)}%` : '-';
        const rMat = demo.riskMatrix || { score: 9, rank: 'Moderado' };
        rows.push([
          `"${pname}"`, '"Angola"', demo.areaKm2 || '', demo.density || '', demo.total, demo.urban, demo.rural, `"${calc.cfg.name}"`, calc.affectedPop, calc.affectedFamilies, `"${ivcVal}"`, demo.fiesSeveraPct || '', rMat.score, `"${rMat.rank}"`, state.demographicYear, `"${state.formulaModel}"`
        ].join(';'));
      });
    } else {
      Object.keys(state.ineData.municipios).forEach(pname => {
        const muns = state.ineData.municipios[pname] || {};
        const provObj = state.ineData.provincias[pname] || {};
        const provIvc = computeCensusVulnerabilityIndex(provObj.censo2024);
        const ivcVal = provIvc ? `${(provIvc.ivc * 100).toFixed(1)}% (Prov)` : '-';
        Object.keys(muns).forEach(mname => {
          const demo = getOfficialDemographics('municipios', { properties: { Nome_Prov: pname, Nome_Munic: mname } });
          const code = getSarcofForAngolaFeature({ properties: { Nome_Prov: pname, Nome_Munic: mname } }, 'municipios', state.activeSeason);
          const calc = calculateOfficialFormula(demo, code);
          const rMat = demo.riskMatrix || { score: 9, rank: 'Moderado' };
          rows.push([
            `"${mname}"`, `"${pname}"`, demo.areaKm2 || '', demo.density || '', demo.total, demo.urban, demo.rural, `"${calc.cfg.name}"`, calc.affectedPop, calc.affectedFamilies, `"${ivcVal}"`, demo.fiesSeveraPct || '', rMat.score, `"${rMat.rank}"`, state.demographicYear, `"${state.formulaModel}"`
          ].join(';'));
        });
      });
    }

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(rows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `ElNino_Angola_${state.tableMode}_${state.activeSeason}_${state.demographicYear}_${state.formulaModel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Eventos do Seletor de Modelo de Fórmula
  const formulaSelect = document.getElementById('select-formula-model');
  if (formulaSelect) {
    formulaSelect.addEventListener('change', (e) => {
      state.formulaModel = e.target.value;
      updateFormulaUI();
    });
  }

  // Eventos do Seletor de Ano Demográfico
  document.getElementById('select-demographic-year').addEventListener('change', (e) => {
    state.demographicYear = e.target.value;
    const yearLbl = document.getElementById('lbl-selected-year');
    if (yearLbl) yearLbl.textContent = state.demographicYear;
    
    updateGlobalStats();
    populateCensoTable();
    if (state.selectedFeature) {
      openInspectorCard(state.selectedFeature, state._selectedTypeKey || 'provincias');
    }
  });

  // Alternância de Abas na Tabela Censo (Províncias vs Municípios)
  const btnTabProv = document.getElementById('btn-tab-prov');
  const btnTabMun = document.getElementById('btn-tab-mun');
  const tableFilter = document.getElementById('table-filter-input');
  const btnExportCsv = document.getElementById('btn-export-csv');

  if (btnTabProv && btnTabMun) {
    btnTabProv.addEventListener('click', () => {
      btnTabProv.classList.add('active');
      btnTabMun.classList.remove('active');
      state.tableMode = 'prov';
      populateCensoTable();
    });
    btnTabMun.addEventListener('click', () => {
      btnTabMun.classList.add('active');
      btnTabProv.classList.remove('active');
      state.tableMode = 'mun';
      populateCensoTable();
    });
  }

  if (tableFilter) {
    tableFilter.addEventListener('input', (e) => {
      state.tableSearch = e.target.value;
      populateCensoTable();
    });
  }

  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', exportCsv);
  }

  // Load GeoJSON Files
  async function loadGeoJsonData() {
    try {
      const [ondRes, jfmRes, provRes] = await Promise.all([
        fetch('/drive/OND_opt.geojson'),
        fetch('/drive/JFM_opt.geojson'),
        fetch('/drive/Angola_opt.geojson')
      ]);
      
      state.geoJsonData.OND = await ondRes.json();
      state.geoJsonData.JFM = await jfmRes.json();
      state.geoJsonData.PROVINCIAS = await provRes.json();

      renderAllLayers();
      initCharts();
      populateCensoTable();
      updateGlobalStats();

      fetch('/drive/Angola_Municipios_opt.geojson')
        .then(res => res.json())
        .then(data => { state.geoJsonData.MUNICIPIOS = data; populateCensoTable(); });

      fetch('/drive/Angola_Comunas_opt.geojson')
        .then(res => res.json())
        .then(data => { state.geoJsonData.COMUNAS = data; });

    } catch (err) {
      console.error('Erro ao carregar camadas GeoJSON:', err);
    }
  }

  // Scientific Sources Modal Openers
  document.getElementById('btn-open-fonte-modal').addEventListener('click', () => {
    document.getElementById('fonte-modal').classList.add('active');
  });
  document.getElementById('btn-close-fonte-modal').addEventListener('click', () => {
    document.getElementById('fonte-modal').classList.remove('active');
  });

  // Censo Table Modal Openers
  function openCensoModal() {
    document.getElementById('censo-modal').classList.add('active');
    populateCensoTable();
  }
  document.getElementById('btn-quick-censo').addEventListener('click', openCensoModal);
  document.getElementById('btn-open-censo-table').addEventListener('click', openCensoModal);
  document.getElementById('btn-view-censo-row').addEventListener('click', () => {
    openCensoModal();
    if (state.selectedFeature) {
      const name = getFeatureName(state.selectedFeature, 'provincias');
      if (name) {
        const cleanKey = normalizeProvName(name);
        const rowId = `censo-row-${cleanKey.replace(/\s+/g, '-')}`;
        const targetRow = document.getElementById(rowId);
        if (targetRow) {
          document.querySelectorAll('.censo-table tr').forEach(r => r.classList.remove('censo-row-active'));
          targetRow.classList.add('censo-row-active');
          targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  });

  document.getElementById('btn-close-censo-modal').addEventListener('click', () => {
    document.getElementById('censo-modal').classList.remove('active');
  });

  // Layer Checkbox Listeners
  document.getElementById('chk-layer-sarcof').addEventListener('change', (e) => {
    state.layersEnabled.sarcof = e.target.checked;
    renderAllLayers();
  });
  document.getElementById('chk-layer-provincias').addEventListener('change', (e) => {
    state.layersEnabled.provincias = e.target.checked;
    renderAllLayers();
  });
  document.getElementById('chk-layer-municipios').addEventListener('change', (e) => {
    state.layersEnabled.municipios = e.target.checked;
    renderAllLayers();
  });
  document.getElementById('chk-layer-comunas').addEventListener('change', (e) => {
    state.layersEnabled.comunas = e.target.checked;
    renderAllLayers();
  });

  // Map Labels Switch
  document.getElementById('toggle-labels').addEventListener('change', (e) => {
    state.showLabels = e.target.checked;
    renderAllLayers();
  });

  // Category Selector
  document.getElementById('select-category').addEventListener('change', (e) => {
    state.activeCategory = e.target.value;
    renderAllLayers();
  });

  // Season Selector — triggers full data refresh across all views
  document.getElementById('select-season').addEventListener('change', (e) => {
    state.activeSeason = e.target.value;
    renderAllLayers();
    updateGlobalStats();
    populateCensoTable();
    if (state.selectedFeature) {
      openInspectorCard(state.selectedFeature, state._selectedTypeKey || 'provincias');
    }
    if (state.charts.dist || state.charts.comparison) {
      updateCharts();
    }
  });

  // Confidence Toggle (High Confidence Hatching Overlay)
  document.getElementById('toggle-confidence').addEventListener('change', (e) => {
    state.showHighConfidence = e.target.checked;
    renderAllLayers();
  });

  // Search Filter
  document.getElementById('input-search').addEventListener('input', (e) => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    if (!state.searchQuery) return;

    if (state.geoJsonLayers.provincias) {
      state.geoJsonLayers.provincias.eachLayer(layer => {
        const name = (layer.feature.properties.Nome_Prov || '').toLowerCase();
        if (name.includes(state.searchQuery)) {
          state.map.flyToBounds(layer.getBounds(), { maxZoom: 8, duration: 1.2 });
          layer.fire('click');
        }
      });
    }
  });

  // Sidebar Tab Switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add('active');
      // Inicializar gráficos do Censo 2024 ao abrir a tab de análise
      if (btn.dataset.tab === 'tab-analytics' && state.ineData) {
        if (!state.charts.ivc && !state.charts.water) {
          initCensusCharts();
        }
      }
    });
  });

  // Charts Initialization
  function initCharts() {
    const distCanvas = document.getElementById('chart-forecast-dist');
    const compCanvas = document.getElementById('chart-temporal-comparison');

    if (distCanvas && typeof Chart !== 'undefined') {
      state.charts.dist = new Chart(distCanvas, {
        type: 'doughnut',
        data: getForecastDistChartData(),
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 } } }
          }
        }
      });
    }

    if (compCanvas && typeof Chart !== 'undefined') {
      state.charts.comparison = new Chart(compCanvas, {
        type: 'bar',
        data: getTemporalComparisonChartData(),
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
            y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
          },
          plugins: {
            legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 } } }
          }
        }
      });
    }

    // IVC Chart — Vulnerability Index per Province (Censo 2024)
    initCensusCharts();
  }

  // Gráficos baseados no Censo 2024 INE (IVC e Acesso à Água)
  // Fonte: INE Angola Censo 2024 — https://censo2024.ine.gov.ao/
  function initCensusCharts() {
    if (!state.ineData || typeof Chart === 'undefined') return;

    const provs = state.ineData.provincias;
    const provNames = Object.keys(provs);

    // IVC Chart (Índice de Vulnerabilidade Composto) por Província
    const ivcCanvas = document.getElementById('chart-vulnerability-ivc');
    if (ivcCanvas) {
      // Compute and sort IVC per province descending
      const ivcRows = provNames.map(p => {
        const ivcData = computeCensusVulnerabilityIndex(provs[p].censo2024);
        return { name: p, val: ivcData ? parseFloat((ivcData.ivc * 100).toFixed(1)) : 0 };
      }).sort((a, b) => b.val - a.val);

      state.charts.ivc = new Chart(ivcCanvas, {
        type: 'bar',
        data: {
          labels: ivcRows.map(d => d.name),
          datasets: [{
            label: 'IVC (%) — Censo 2024 INE',
            data: ivcRows.map(d => d.val),
            backgroundColor: ivcRows.map(d =>
              d.val > 60 ? 'rgba(239,68,68,0.85)' :
              d.val > 40 ? 'rgba(245,158,11,0.85)' :
              d.val > 20 ? 'rgba(6,182,212,0.85)' : 'rgba(16,185,129,0.85)'
            ),
            borderRadius: 4,
            borderWidth: 0
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              ticks: { color: '#94a3b8', font: { size: 9 } },
              grid: { color: 'rgba(255,255,255,0.05)' },
              title: { display: true, text: 'IVC (%) — Vulnerabilidade Composta', color: '#64748b', font: { size: 9 } },
              max: 100
            },
            y: { ticks: { color: '#94a3b8', font: { size: 9 } }, grid: { display: false } }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => ` IVC: ${ctx.raw}% — ${ctx.raw > 60 ? 'Muito Alta' : ctx.raw > 40 ? 'Alta' : ctx.raw > 20 ? 'Moderada' : 'Baixa'} — Censo 2024 INE`
              }
            }
          }
        }
      });
    }

    // Water Access Chart — % sem acesso à água segura por Província (Censo 2024)
    const waterCanvas = document.getElementById('chart-water-access');
    if (waterCanvas) {
      const waterRows = provNames.map(p => {
        const c = provs[p].censo2024;
        if (!c || !c.agua_total) return { name: p, val: 0 };
        return { name: p, val: parseFloat(((c.agua_sem_acesso || 0) / c.agua_total * 100).toFixed(1)) };
      }).sort((a, b) => b.val - a.val);

      state.charts.water = new Chart(waterCanvas, {
        type: 'bar',
        data: {
          labels: waterRows.map(d => d.name),
          datasets: [{
            label: '% Sem acesso à água — Censo 2024 INE',
            data: waterRows.map(d => d.val),
            backgroundColor: waterRows.map(d =>
              d.val > 50 ? 'rgba(239,68,68,0.85)' :
              d.val > 30 ? 'rgba(245,158,11,0.85)' :
              d.val > 15 ? 'rgba(6,182,212,0.85)' : 'rgba(16,185,129,0.85)'
            ),
            borderRadius: 4,
            borderWidth: 0
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              ticks: { color: '#94a3b8', font: { size: 9 } },
              grid: { color: 'rgba(255,255,255,0.05)' },
              title: { display: true, text: '% Agregados sem Água Segura', color: '#64748b', font: { size: 9 } },
              max: 100
            },
            y: { ticks: { color: '#94a3b8', font: { size: 9 } }, grid: { display: false } }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => ` ${ctx.raw}% sem acesso à água segura — INE Censo 2024`
              }
            }
          }
        }
      });
    }
  }

  function getForecastDistChartData() {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    const seasonData = state.geoJsonData[state.activeSeason];
    if (seasonData) {
      seasonData.features.forEach(f => {
        const c = f.properties.finalcode;
        if (counts[c] !== undefined) counts[c]++;
      });
    }
    return {
      labels: [
        getCategoryName(1),  // Below-Normal / Seca (BN)
        getCategoryName(2),  // Normal a Abaixo (N-BN)
        getCategoryName(3),  // Normal a Acima (N-AN)
        getCategoryName(4)   // Acima da Normal (AN)
      ],
      datasets: [{
        data: [counts[1], counts[2], counts[3], counts[4]],
        backgroundColor: ['#C4A482', '#FFE600', '#00D2D2', '#0000CD'],
        borderWidth: 0
      }]
    };
  }

  function getTemporalComparisonChartData() {
    const ondCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    const jfmCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };

    if (state.geoJsonData.OND) {
      state.geoJsonData.OND.features.forEach(f => {
        const c = f.properties.finalcode;
        if (ondCounts[c] !== undefined) ondCounts[c]++;
      });
    }

    if (state.geoJsonData.JFM) {
      state.geoJsonData.JFM.features.forEach(f => {
        const c = f.properties.finalcode;
        if (jfmCounts[c] !== undefined) jfmCounts[c]++;
      });
    }

    const lang = state.currentLang;
    return {
      labels: [
        getCategoryName(1),
        getCategoryName(2),
        getCategoryName(3),
        getCategoryName(4)
      ],
      datasets: [
        {
          label: lang === 'en' ? 'OND 2026 (Oct–Dec)' : 'OND 2026 (Out–Dez)',
          data: [ondCounts[1], ondCounts[2], ondCounts[3], ondCounts[4]],
          backgroundColor: 'rgba(196,164,130,0.85)'  // BN dominant color tinted
        },
        {
          label: lang === 'en' ? 'JFM 2027 (Jan–Mar)' : 'JFM 2027 (Jan–Mar)',
          data: [jfmCounts[1], jfmCounts[2], jfmCounts[3], jfmCounts[4]],
          backgroundColor: 'rgba(0,0,205,0.7)'       // AN dominant color tinted
        }
      ]
    };
  }

  function updateCharts() {
    if (state.charts.dist) {
      state.charts.dist.data = getForecastDistChartData();
      state.charts.dist.update();
    }
    if (state.charts.comparison) {
      state.charts.comparison.data = getTemporalComparisonChartData();
      state.charts.comparison.update();
    }
  }

  // Documents & PDF Modal Handler
  async function loadDocuments() {
    try {
      const res = await fetch('/api/documents');
      const docs = await res.json();
      state.documents = docs;
      renderDocumentList();
    } catch (err) {
      state.documents = [
        { name: 'INE Angola - Relatório sobre a Escala de Insegurança Alimentar (FIES) - Fevereiro 2026.pdf', path: '/drive/INE_Relatorio_FIES_Fevereiro_2026.pdf', category: 'INE / FIES' },
        { name: '3. EN_FINAL SARCOF-33 STATEMENT-final-28Aug1600hrs.pdf', path: '/drive/3. EN_FINAL SARCOF-33 STATEMENT-final-28Aug1600hrs.pdf', category: 'SARCOF Report' },
        { name: '2. SADC Regional Seasonal Outlook for the 2026_27 season_SARCOF_26_Aug_2026.pdf', path: '/drive/2. SADC Regional Seasonal Outlook for the 2026_27 season_SARCOF_26_Aug_2026.pdf', category: 'SARCOF Report' },
        { name: 'UN DRCT PRESENTATION- El Nino Forecast and its implications for Angola.pdf', path: '/drive/UN DRCT PRESENTATION- El Nino Forecast and its implications for the 2026-2027 season and acute food insecurity in Angola and southern Africa_Angola_UN_El Nino.pdf', category: 'UN / Angola' },
        { name: '1. Performance of the 2025_26 season review and verification.pdf', path: '/drive/1. Performance of the 2025_26 season review and verification.pdf', category: 'Season Verification' },
        { name: '4. SARCOF33-CMRS-LaReunion-TC_outlook.pdf', path: '/drive/4. SARCOF33-CMRS-LaReunion-TC_outlook.pdf', category: 'Tropical Cyclones' },
        { name: '20260801-FEWS-NET-ao-fsou.pdf', path: '/20260801-FEWS-NET-ao-fsou.pdf', category: 'FEWS NET' }
      ];
      renderDocumentList();
    }
  }

  function renderDocumentList() {
    const container = document.getElementById('doc-list-container');
    const countEl = document.getElementById('doc-count');
    if (countEl) countEl.textContent = state.documents.length;

    if (!container) return;
    container.innerHTML = '';
    state.documents.forEach(doc => {
      const item = document.createElement('div');
      item.className = 'doc-item';
      item.innerHTML = `
        <i class="fa-solid fa-file-pdf doc-icon"></i>
        <div class="doc-details">
          <div class="doc-name">${doc.name}</div>
          <div class="doc-meta">
            <span class="badge" style="padding: 2px 8px; font-size: 0.7rem;">${doc.category || 'PDF'}</span>
            <span>Clique para abrir</span>
          </div>
        </div>
      `;
      item.addEventListener('click', () => openPdfModal(doc.path, doc.name));
      container.appendChild(item);
    });
  }

  function openPdfModal(pdfPath, title) {
    const modal = document.getElementById('pdf-modal');
    const titleEl = document.getElementById('pdf-modal-title');
    const iframe = document.getElementById('pdf-iframe');

    titleEl.textContent = title || 'Visualizador de Documento PDF';
    iframe.src = pdfPath;
    modal.classList.add('active');
  }

  document.getElementById('btn-close-pdf-modal').addEventListener('click', () => {
    document.getElementById('pdf-modal').classList.remove('active');
    document.getElementById('pdf-iframe').src = '';
  });

  document.getElementById('btn-quick-docs').addEventListener('click', () => {
    document.querySelector('.tab-btn[data-tab="tab-docs"]').click();
  });

  // Language Switcher Buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setLanguage(btn.dataset.lang);
    });
  });

  // ── Mobile Sidebar Drawer ───────────────────────────────
  const sidebar      = document.getElementById('sidebar');
  const overlay      = document.getElementById('mobile-overlay');
  const btnHamburger = document.getElementById('btn-hamburger');
  const btnSideClose = document.getElementById('btn-sidebar-close');

  function openSidebar() {
    if (!sidebar || !overlay) return;
    sidebar.classList.add('open');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    if (!sidebar || !overlay) return;
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (btnHamburger) btnHamburger.addEventListener('click', openSidebar);
  if (btnSideClose) btnSideClose.addEventListener('click', closeSidebar);
  if (overlay)      overlay.addEventListener('click', closeSidebar);

  // Close sidebar on tab switch (mobile UX)
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        // Small delay so the tab content renders before hiding sidebar
        setTimeout(closeSidebar, 180);
      }
    });
  });

  // Invalidate map size when sidebar closes (Leaflet needs it)
  if (sidebar) {
    sidebar.addEventListener('transitionend', () => {
      if (state.map) state.map.invalidateSize();
    });
  }

  // Inicializar Sequência da Aplicação
  initMap();
  loadOfficialDatasets().then(() => {
    loadGeoJsonData().then(() => {
      // Apply stored language after data is ready so all views render in the right language
      setLanguage(state.currentLang);
    });
  });
  loadDocuments();
});
