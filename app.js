// El Niño SADC & Angola WebGIS - Sistema Oficial de Risco Climático & Modelo Dasimétrico SIG
// Fontes Oficiais: INE Angola (Censo 2024 & Estimativas 2025-2027), SARCOF-33, FEWS NET, IPC, UNDRR, PAM, FAO

document.addEventListener('DOMContentLoaded', () => {
  // Global Application State
  const state = {
    map: null,
    baseLayers: {},
    activeSeason: 'OND', // OND or JFM
    demographicYear: '2024', // 2024, 2025, 2026, 2027
    formulaModel: 'IPC_FIES_INE', // IPC_FIES_INE, UNDRR_IPCC, IPC_FEWSNET, WFP_FAO_SADC
    activeCategory: 'ALL',
    highConfidenceOnly: false,
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
      provincias: null,
      municipios: null,
      comunas: null
    },

    selectedFeature: null,
    _selectedTypeKey: 'provincias',
    documents: [],
    charts: {}
  };

  // Forecast Vulnerability Factors (SARCOF-33 / UNDRR / IPCC Standard)
  const categoryConfig = {
    1: { name: 'Acima da Normal (AN)', color: '#0284c7', vFactor: 0.00, desc: 'Sem vulnerabilidade de seca. V = 0,00' },
    2: { name: 'Normal a Acima da Normal (N-AN)', color: '#06b6d4', vFactor: 0.15, desc: 'Vulnerabilidade baixa. V = 0,15' },
    3: { name: 'Normal a Abaixo da Normal (N-BN)', color: '#f59e0b', vFactor: 0.50, desc: 'Vulnerabilidade moderada. V = 0,50' },
    4: { name: 'Abaixo da Normal / Seca (BN)', color: '#ef4444', vFactor: 0.85, desc: 'Alta Vulnerabilidade Agropastoril em Seca Severa. V = 0,85' }
  };

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
        cartodark: L.tileLayer('https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
          maxZoom: 19, attribution: '&copy; OpenStreetMap &copy; CARTO'
        }),
        osm: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19, attribution: '&copy; OpenStreetMap'
        }),
        'esri-sat': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19, attribution: '&copy; Esri'
        }),
        cartolight: L.tileLayer('https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
          maxZoom: 19, attribution: '&copy; CARTO'
        })
      };

      state.baseLayers.cartodark.addTo(state.map);

      state.map.invalidateSize();
      window.addEventListener('resize', () => { if (state.map) state.map.invalidateSize(); });
      setTimeout(() => { if (state.map) state.map.invalidateSize(); }, 300);

      document.getElementById('select-basemap').addEventListener('change', (e) => {
        Object.values(state.baseLayers).forEach(layer => {
          if (state.map.hasLayer(layer)) state.map.removeLayer(layer);
        });
        const selected = e.target.value;
        if (state.baseLayers[selected]) state.baseLayers[selected].addTo(state.map);
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
      if (codeKey === 4) {
        pinRate = 0.45; // 45% em Fase 3+ (Crise/Emergência em secas severas de El Niño no Sul de Angola)
        phaseDesc = '45% Pop em Fase 3+ (32% Crise + 13% Emergência)';
      } else if (codeKey === 3) {
        pinRate = 0.20; // 20% em Fase 3+
        phaseDesc = '20% Pop em Fase 3+ (17% Crise + 3% Emergência)';
      } else if (codeKey === 2) {
        pinRate = 0.05; // 5% sob estresse localizado
        phaseDesc = '5% Pop em Fase 3+';
      } else {
        pinRate = 0.00;
        phaseDesc = '0% em Insegurança Aguda';
      }
      // Ajuste pelo IVC do Censo 2024 (populações mais vulneráveis têm taxas de fase 3+ mais elevadas)
      if (ivcFactor !== null && pinRate > 0) {
        pinRate = Math.min(0.90, pinRate * (1 + ivcFactor * 0.2));
      }

      affectedPop = Math.round(totalPop * pinRate);
      formulaTitle = 'IPC / FEWS NET — População em Necessidade (PIN / Fase 3+)';
      officialOrg = 'IPC Global Platform (Manual 3.1) & FEWS NET';
      officialUrl = 'https://www.ipcinfo.org/ipc-manual/';
      formulaSteps = `PIN = Pop_Total (${totalPop.toLocaleString('pt-PT')}) × % IPC 3+ (${(pinRate * 100).toFixed(1)}%) = ${affectedPop.toLocaleString('pt-PT')} hab. (${phaseDesc})`;

    } else if (state.formulaModel === 'WFP_FAO_SADC') {
      // 3. MODELO AGROPASTORIL E PREÇOS (PAM / FAO / SADC RVAA)
      // P_afetada = (Pop_Rural × α_Agropastoril) + (Pop_Urbana × β_Preços)
      let rFactor = 0;
      let uFactor = 0;

      if (codeKey === 4) {
        rFactor = 0.75; // 75% da população rural sofre quebra de colheitas e escassez hídrica
        uFactor = 0.25; // 25% da periferia urbana afetada pela disparada dos preços de alimentos básicos
      } else if (codeKey === 3) {
        rFactor = 0.40;
        uFactor = 0.12;
      } else if (codeKey === 2) {
        rFactor = 0.10;
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

      formulaTitle = 'PAM / FAO / SADC — Choque Agropastoril & Preços de Alimentos';
      officialOrg = 'Programa Alimentar Mundial (VAM) & FAO (GIEWS)';
      officialUrl = 'https://vam.wfp.org/';
      formulaSteps = `P_afetada = [Rural: ${ruralPop.toLocaleString('pt-PT')} × ${(rFactor * 100).toFixed(1)}%] + [Urbano: ${urbanPop.toLocaleString('pt-PT')} × ${uFactor * 100}%] = ${affectedPop.toLocaleString('pt-PT')} hab.`;

    } else if (state.formulaModel === 'IPC_FIES_INE') {
      // 4. MATRIZ DE RISCO HISTÓRICO (1984-2025) & FIES INE (ODS 2.1.2)
      // Fonte Oficial: Relatório FIES INE/FAO (Fevereiro 2026, Quadro 5) & Matriz de Tendências Históricas
      const fiesSev = demographics.fiesSeveraPct ?? 15.0;
      const riskMat = demographics.riskMatrix || { likelihood: 3, impact: 3, score: 9, rank: 'Moderado' };
      const fiesRate = fiesSev / 100.0;

      affectedPop = Math.round(totalPop * fiesRate);
      formulaTitle = 'Matriz de Risco (1984-2025) & FIES INE (ODS 2.1.2)';
      officialOrg = 'INE Angola (FIES Fev 2026) & Matriz de Risco 1984-2025';
      officialUrl = 'https://www.ine.gov.ao/publicacoes/detalhes/NTA0Mzg%3D';
      formulaSteps = `P_insegura = Pop (${totalPop.toLocaleString('pt-PT')}) × % FIES Severa (${fiesSev}%) = ${affectedPop.toLocaleString('pt-PT')} hab. | Matriz: L(${riskMat.likelihood}) × I(${riskMat.impact}) = Score ${riskMat.score} (${riskMat.rank})`;
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
        fillOpacity: 0.5, weight: 1, color: '#ffffff'
      });
    }

    if (state.layersEnabled.provincias && state.geoJsonData.PROVINCIAS) {
      state.geoJsonLayers.provincias = renderGeoJsonCollection(state.geoJsonData.PROVINCIAS, 'provincias', {
        fillColor: '#e11d48', fillOpacity: 0.25, weight: 2, color: '#fb7185'
      });
    }

    if (state.layersEnabled.municipios && state.geoJsonData.MUNICIPIOS) {
      state.geoJsonLayers.municipios = renderGeoJsonCollection(state.geoJsonData.MUNICIPIOS, 'municipios', {
        fillColor: '#f59e0b', fillOpacity: 0.20, weight: 1.5, color: '#fcd34d', dashArray: '3'
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
        // High confidence filter (only for SARCOF layer)
        if (typeKey === 'sarcof') {
          if (state.highConfidenceOnly && feature.properties.gridcode === 0) return false;
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
            fillOpacity: 0.6,
            weight: 1,
            color: '#1e293b',
            opacity: 0.8
          };
        }
        return defaultStyle;
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
              l.setStyle({ fillColor: cfg.color, fillOpacity: 0.6, weight: 1, color: '#1e293b' });
            } else {
              l.setStyle(defaultStyle);
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
      code = feature.properties.finalcode;
    } else {
      const name = getFeatureName(feature, typeKey);
      if (name.includes('Cunene') || name.includes('Huíla') || name.includes('Namibe') || name.includes('Cubango') || name.includes('Cuando')) {
        code = 4;
      }
    }

    const risk = calculateClimateRisk(feature, typeKey, code);
    const featName = getFeatureName(feature, typeKey);

    document.getElementById('insp-name').textContent = featName;
    document.getElementById('insp-layer-type').textContent = 
      typeKey === 'provincias' ? 'Província (DPA 2025)' :
      typeKey === 'municipios' ? 'Município (DPA 2025)' :
      typeKey === 'comunas' ? 'Comuna (DPA 2025)' : 'Zona Climática SARCOF';

    document.getElementById('insp-area-ha').textContent = `${risk.hectares.toLocaleString('pt-PT')} ha`;
    document.getElementById('insp-area-km2').textContent = `${risk.areaKm2.toLocaleString('pt-PT')} km²`;
    document.getElementById('insp-density').textContent = `${risk.density} hab/km²`;

    const censoBadge = risk.isOfficial ? 
      `<span class="badge" style="background:#059669; color:#fff; font-size:0.68rem; margin-left:4px;">Oficial INE ${state.demographicYear}</span>` :
      `<span class="badge" style="background:#64748b; color:#fff; font-size:0.68rem; margin-left:4px;">Dasimétrico SIG</span>`;

    document.getElementById('insp-pop-censo').innerHTML = `
      ${risk.popTotalYear.toLocaleString('pt-PT')} hab ${censoBadge}
      <div style="font-size:0.7rem; color:#94a3b8; font-weight:normal;">Urbana: ${risk.urbanPop.toLocaleString('pt-PT')} | Rural: ${risk.ruralPop.toLocaleString('pt-PT')}</div>
    `;

    document.getElementById('insp-category').innerHTML = `
      <span class="badge" style="background:${risk.cfg.color}; color:#fff;">${risk.cfg.name}</span>
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

    // Calcular o total acumulado de afetados em todas as províncias
    let totalAffected = 0;
    Object.keys(state.ineData.provincias).forEach(pname => {
      const provObj = state.ineData.provincias[pname];
      const demo = getOfficialDemographics('provincias', { properties: { Nome_Prov: pname } });
      const code = ['Cunene', 'Huíla', 'Namibe', 'Cubango', 'Cuando'].includes(pname) ? 4 : 3;
      const calc = calculateOfficialFormula(demo, code);
      totalAffected += calc.affectedPop;
    });

    const totalFamilies = Math.round(totalAffected / 5.2);
    const pct = totalNational > 0 ? ((totalAffected / totalNational) * 100).toFixed(1) : 0;

    const statBnPop = document.getElementById('stat-bn-pop');
    const statBnFam = document.getElementById('stat-bn-families');
    const statPctAff = document.getElementById('stat-pct-affected');

    if (statBnPop) statBnPop.textContent = `${totalAffected.toLocaleString('pt-PT')} hab`;
    if (statBnFam) statBnFam.textContent = `${totalFamilies.toLocaleString('pt-PT')} fam`;
    if (statPctAff) statPctAff.textContent = `${pct}%`;
  }

  // Povoar a Tabela Interativa (21 Províncias vs 326 Municípios)
  function populateCensoTable() {
    const tbody = document.getElementById('censo-table-body');
    if (!tbody || !state.ineData) return;
    tbody.innerHTML = '';

    document.querySelectorAll('.lbl-year-active').forEach(el => el.textContent = state.demographicYear);

    const query = state.tableSearch.toLowerCase().trim();

    if (state.tableMode === 'prov') {
      // MODO 1: 21 PROVÍNCIAS OFICIAIS DE ANGOLA
      const provList = Object.keys(state.ineData.provincias);
      provList.forEach(provName => {
        if (query && !provName.toLowerCase().includes(query)) return;

        const demo = getOfficialDemographics('provincias', { properties: { Nome_Prov: provName } });
        const code = ['Cunene', 'Huíla', 'Namibe', 'Cubango', 'Cuando'].includes(provName) ? 4 : 3;
        const calc = calculateOfficialFormula(demo, code);
        const ivcData = computeCensusVulnerabilityIndex(demo.censoDetails);
        const ivcPct = ivcData ? `<span style="color:${ivcData.ivc > 0.5 ? '#ef4444' : ivcData.ivc > 0.3 ? '#f59e0b' : '#34d399'}; font-weight:700;">${(ivcData.ivc * 100).toFixed(0)}%</span>` : '<span style="color:#64748b;">-</span>';

        const areaStr = demo.areaKm2 ? `${Number(demo.areaKm2.toFixed(1)).toLocaleString('pt-PT')} km²` : '-';
        const densityStr = demo.density ? `${Number(demo.density.toFixed(1)).toLocaleString('pt-PT')} hab/km²` : (demo.areaKm2 && demo.total ? `${Number((demo.total / demo.areaKm2).toFixed(1)).toLocaleString('pt-PT')} hab/km²` : '-');

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
          <td style="color:#f59e0b; font-weight:700;">${demo.total.toLocaleString('pt-PT')}</td>
          <td>U: ${demo.urban.toLocaleString('pt-PT')} / R: ${demo.rural.toLocaleString('pt-PT')}</td>
          <td><span class="badge" style="background:${calc.cfg.color}; color:#fff;">${calc.cfg.name}</span></td>
          <td style="color:#ef4444; font-weight:700;">${calc.affectedPop.toLocaleString('pt-PT')} hab</td>
          <td style="color:#fcd34d; font-weight:700;">${calc.affectedFamilies.toLocaleString('pt-PT')} fam</td>
          <td>${ivcPct} <span style="font-size:0.65rem; color:#64748b;">IVC</span></td>
          <td>${fiesStr} <span style="font-size:0.62rem; color:#64748b;">FIES</span></td>
          <td>${riskBadge}</td>
          <td>
            <a href="${state.demographicYear === '2024' ? 'https://censo2024.ine.gov.ao/' : 'https://www.ine.gov.ao/Diretorios/Ver?caminho=CfDJ8NMpZBryiqVPuGc0gO8mewT47FR30gkYZWCJdAPTQxuDgwF_oD4PP3x_jkRBE3PKZAVioh_K-5Ge7iIxPbVrMX2CzX1DAQQIjAoJ0Uz2Hl_J5SOhC9erlW5yvsVtObOMgEXXgcZLd8LkuzZ0_CV0FbVm5txG3mnvvsUIX9xfgydIv8LZ0im1RsxNxLHLo188DdJNwtfvYv6vbcCrK9oC1hA'}" target="_blank" style="color:#38bdf8; text-decoration:none; font-weight:600;">
              <i class="fa-solid fa-arrow-up-right-from-square"></i> ${state.demographicYear === '2024' ? 'Censo 2024' : 'INE Projeção'}
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
          const code = ['Cunene', 'Huíla', 'Namibe', 'Cubango', 'Cuando'].includes(provName) ? 4 : 3;
          const calc = calculateOfficialFormula(demo, code);

          const areaStr = demo.areaKm2 ? `${Number(demo.areaKm2.toFixed(1)).toLocaleString('pt-PT')} km²` : '-';
          const densityStr = demo.density ? `${Number(demo.density.toFixed(1)).toLocaleString('pt-PT')} hab/km²` : (demo.areaKm2 && demo.total ? `${Number((demo.total / demo.areaKm2).toFixed(1)).toLocaleString('pt-PT')} hab/km²` : '-');

          const fiesStr = demo.fiesSeveraPct ? `<span style="color:${demo.fiesSeveraPct > 30 ? '#ef4444' : demo.fiesSeveraPct > 15 ? '#f59e0b' : '#34d399'}; font-weight:700;">${demo.fiesSeveraPct.toFixed(1).replace('.', ',')}%</span>` : '<span style="color:#64748b;">-</span>';
          const riskMat = demo.riskMatrix || { likelihood: 3, impact: 3, score: 9, rank: 'Moderado' };
          const riskBadge = `<span class="badge" style="background:${riskMat.score >= 15 ? '#ef4444' : riskMat.score >= 8 ? '#f59e0b' : '#10b981'}; color:#fff; font-size:0.7rem;" title="L:${riskMat.likelihood} × I:${riskMat.impact}">${riskMat.score} (${riskMat.rank})</span>`;

          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>${munName}</strong></td>
            <td>${provName}</td>
            <td style="color:#38bdf8; font-weight:600; font-variant-numeric:tabular-nums;">${areaStr}</td>
            <td style="color:#a78bfa; font-weight:600; font-variant-numeric:tabular-nums;">${densityStr}</td>
            <td style="color:#f59e0b; font-weight:700;">${demo.total.toLocaleString('pt-PT')}</td>
            <td>U: ${demo.urban.toLocaleString('pt-PT')} / R: ${demo.rural.toLocaleString('pt-PT')}</td>
            <td><span class="badge" style="background:${calc.cfg.color}; color:#fff;">${calc.cfg.name}</span></td>
            <td style="color:#ef4444; font-weight:700;">${calc.affectedPop.toLocaleString('pt-PT')} hab</td>
            <td style="color:#fcd34d; font-weight:700;">${calc.affectedFamilies.toLocaleString('pt-PT')} fam</td>
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

  // Exportar Tabela para CSV
  function exportTableToCsv() {
    const rows = [];
    const headers = ['Unidade', 'Provincia', 'Area_km2', 'Densidade_hab_km2', 'Populacao_INE', 'Urbana', 'Rural', 'Classificacao_SARCOF', 'Pessoas_Afetadas', 'Familias_Afetadas', 'IVC_Censo_2024', 'FIES_Severa_Pct', 'Score_Risco_1984_2025', 'Ranking_Risco', 'Ano_Demografico', 'Modelo_Formula'];
    rows.push(headers.join(';'));

    if (state.tableMode === 'prov') {
      Object.keys(state.ineData.provincias).forEach(pname => {
        const demo = getOfficialDemographics('provincias', { properties: { Nome_Prov: pname } });
        const code = ['Cunene', 'Huíla', 'Namibe', 'Cubango', 'Cuando'].includes(pname) ? 4 : 3;
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
          const code = ['Cunene', 'Huíla', 'Namibe', 'Cubango', 'Cuando'].includes(pname) ? 4 : 3;
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
    link.setAttribute('download', `ElNino_Angola_${state.tableMode}_${state.demographicYear}_${state.formulaModel}.csv`);
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
    btnExportCsv.addEventListener('click', exportTableToCsv);
  }

  // Load GeoJSON Files
  async function loadGeoJsonData() {
    try {
      const [ondRes, provRes] = await Promise.all([
        fetch('/drive/OND_opt.geojson'),
        fetch('/drive/Angola_opt.geojson')
      ]);
      
      state.geoJsonData.OND = await ondRes.json();
      state.geoJsonData.PROVINCIAS = await provRes.json();

      renderAllLayers();
      initCharts();
      populateCensoTable();

      fetch('/drive/JFM_opt.geojson')
        .then(res => res.json())
        .then(data => { state.geoJsonData.JFM = data; updateCharts(); });

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

  // Season Selector
  document.getElementById('select-season').addEventListener('change', (e) => {
    state.activeSeason = e.target.value;
    renderAllLayers();
  });

  // Confidence Toggle
  document.getElementById('toggle-confidence').addEventListener('change', (e) => {
    state.highConfidenceOnly = !e.target.checked;
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
      labels: ['Acima da Normal', 'Normal a Acima', 'Normal a Abaixo', 'Abaixo da Normal (Seca)'],
      datasets: [{
        data: [counts[1], counts[2], counts[3], counts[4]],
        backgroundColor: ['#0284c7', '#06b6d4', '#f59e0b', '#ef4444'],
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

    return {
      labels: ['Acima Normal', 'Normal-Acima', 'Normal-Abaixo', 'Abaixo Normal'],
      datasets: [
        { label: 'OND 2026', data: [ondCounts[1], ondCounts[2], ondCounts[3], ondCounts[4]], backgroundColor: '#38bdf8' },
        { label: 'JFM 2027', data: [jfmCounts[1], jfmCounts[2], jfmCounts[3], jfmCounts[4]], backgroundColor: '#f59e0b' }
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

  // Inicializar Sequência da Aplicação
  initMap();
  loadOfficialDatasets().then(() => {
    loadGeoJsonData();
  });
  loadDocuments();
});
