// El Niño SADC & Angola - Sistema Oficial de Risco Climático & Modelo Dasimétrico
// Fontes Oficiais: INE Angola (Censo 2024 & Estimativas 2025-2027), SARCOF-33, FEWS NET, IPC, UNDRR, PAM, FAO

document.addEventListener('DOMContentLoaded', () => {
  // Global Application State
  const state = {
    map: null,
    baseLayers: {},
    currentLang: localStorage.getItem('elnino_lang') || 'pt', // 'pt' or 'en'
    activeSeason: 'OND', // OND or JFM
    demographicYear: '2024', // 2024, 2025, 2026, 2027
    formulaModel: 'UNDRR_IPCC', // UNDRR_IPCC (default), IPC_FIES_INE, IPC_FEWSNET, WFP_FAO_SADC, CUSTOM
    customFormula: JSON.parse(localStorage.getItem('elnino_custom_formula') || 'null') || {
      name: 'Fórmula Personalizada',
      officialUrl: 'https://censo2024.ine.gov.ao/',
      officialOrg: 'Utilizador / Parâmetros Customizados',
      weights: {
        v_clima: 50,
        fies_severa: 30,
        sem_agua: 20,
        sem_san: 0,
        sem_elec: 0,
        hab_precaria: 0,
        criancas_014: 0,
        risk_score: 0
      }
    },
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

    lastActiveBasemap: 'osm',
    labelDensity: 'smart', // 'smart', 'prov_only', 'all'
    mapTheme: {
      palette: 'fews_alert', // 'fews_alert', 'dpa_atlas', 'sarcof_classic', 'risk_undrr', 'custom'
      provBorderColor: '#0f172a',
      provBorderWeight: 3.5,
      provFillOpacity: 0.45,
      customProvFill: '#ea580c',
      munBorderColor: '#475569',
      munBorderWeight: 1.2,
      munBorderStyle: 'solid',
      munFillOpacity: 0.20,
      customMunFill: '#334155',
      sadcOpacity: 0.25,
      canvasBg: '#090d16'
    },

    // Active Leaflet Layer Groups
    geoJsonLayers: {
      sarcof: null,
      sarcofHatch: null,
      provincias: null,
      municipios: null,
      comunas: null,
      provBorders: null
    },

    selectedFeature: null,
    _selectedTypeKey: 'provincias',
    documents: [],
    charts: {}
  };

  // Comprehensive Bilingual Dictionary (Português & English)
  const i18n = {
    pt: {
      app_title: 'El Niño Angola Portal',
      app_subtitle: 'Risco Climático El Niño & Base Demográfica Oficial INE Angola (Censo 2024 & Estimativas 2025–2027)',
      badge_sarcof_active: 'SARCOF-33 Ativo',
      badge_online_users: 'online',
      hdr_ine_badge: 'INE Angola Oficial:',
      btn_methodology: 'Fontes Clicáveis & Metodologia',
      btn_table_censo: 'Tabela Censo / Projeções',
      btn_reports_pdf: 'Relatórios PDF',
      tab_layers: 'Camadas',
      tab_risk_censo: 'Risco & Censo',
      tab_analytics: 'Análise',
      tab_reports: 'Relatórios',
      ctrl_basemap: 'Mapa de Fundo (BaseMap)',
      ctrl_map_style: 'Estilo & Cores do Mapa',
      lbl_map_palette: 'Paleta Temática de Cores:',
      lbl_prov_borders: 'Províncias (Limites Principais)',
      lbl_mun_borders: 'Municípios (Limites Internos)',
      lbl_sadc_underlay: 'Camada SADC Regional (Fundo)',
      lbl_canvas_bg: 'Fundo no Modo Apenas Shapes:',
      lbl_label_mode: 'Densidade dos Rótulos (Sem Confusão):',
      btn_center_angola: 'Centrar Angola',
      btn_toggle_shapes: 'Apenas Shapes',
      btn_reset_style: 'Restaurar Padrão',
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
      th_ivc: 'Carência Água (ODS 6.1) ⓘ',
      th_fies: '% FIES Severa (INE) ⓘ',
      th_risk_score: 'Score de Risco (1-25) ⓘ',
      th_source: 'Fonte Oficial',
      cat_all: 'Todas as Categorias / All',
      cat_1: 'Abaixo da Normal / Seca (BN)',
      cat_2: 'Normal a Abaixo da Normal (N-BN)',
      cat_3: 'Normal a Acima da Normal (N-AN)',
      cat_4: 'Acima da Normal (AN)',
      btn_custom_formula: 'Configurar Fórmula Personalizada',
      custom_modal_title: 'Construtor de Fórmula Personalizada',
      custom_modal_desc_title: 'Construa a sua própria fórmula com os dados oficiais do sistema',
      custom_modal_desc_body: 'Defina a ponderação (%) das variáveis oficiais disponíveis no sistema. Os cálculos são executados em tempo real sobre a população oficial do INE para todas as 21 províncias e 326 municípios.',
      custom_formula_name_label: 'Nome da Fórmula:',
      custom_formula_link_label: 'Link / Fonte Oficial da Metodologia:',
      custom_variables_title: 'Ponderação das Variáveis Oficiais Disponíveis',
      var_v_clima: 'Anomalia Climática SARCOF-33 (V_clima)',
      var_fies: 'Insegurança Alimentar Severa FIES INE/FAO (ODS 2.1.2)',
      var_water: 'Sem Acesso a Água Potável/Segura (Censo INE 2024 / ODS 6.1)',
      var_san: 'Sem Saneamento Básico Adequado (Censo INE 2024 / ODS 6.2)',
      var_elec: 'Sem Eletricidade ou Energia Solar (Censo INE 2024 / ODS 7.1)',
      var_hab: 'Habitação Precária: Cubata/Barraca (Censo INE 2024 / ODS 11.1)',
      var_children: 'População Infantil 0-14 Anos (Censo INE 2024)',
      var_risk: 'Matriz de Risco Histórico 1984-2025 (1-25)',
      custom_formula_preview_title: 'Equação Matemática Resultante:',
      btn_reset_defaults: 'Repor Padrões',
      btn_apply_formula: 'Aplicar Fórmula e Calcular',
      btn_export_excel: 'Exportar Excel',
      btn_export_excel_advanced: 'Exportar Excel (Filtros)',
      export_modal_title: 'Exportar População de Angola em Excel (.xlsx / .csv)',
      export_modal_subtitle: 'Selecione Províncias, Municípios e Filtros Personalizados (Base Oficial INE: Censo 2024 & Estimativas 2025–2027)',
      export_geo_title: '1. Seleção Geográfica (Províncias e Municípios)',
      export_mode_prov_title: 'Apenas Totais Provinciais',
      export_mode_prov_desc: 'Baixa a população agregada das províncias selecionadas.',
      export_mode_both_title: 'Províncias e Municípios Respetivos',
      export_mode_both_desc: 'Baixa a população da província e de cada município respetivamente.',
      export_lbl_provinces: 'Províncias:',
      export_lbl_mun: 'Municípios',
      btn_select_all: 'Todas',
      btn_clear: 'Limpar',
      export_search_prov: 'Pesquisar província...',
      export_search_mun: 'Pesquisar município...',
      export_filters_title: '2. Filtros Adicionais & Dados a Incluir',
      export_lbl_year: 'Ano da População / Projeção Oficial:',
      export_lbl_risk: 'Filtro por Risco El Niño (Matriz 1–25):',
      export_lbl_fies: 'Insegurança Alimentar FIES Severa (INE / FAO):',
      export_lbl_columns: 'Colunas / Variáveis a Exportar:',
      btn_all: 'Todas',
      btn_standard: 'Padrão',
      col_pop_total: 'População Total',
      col_urban_rural: 'Urbana & Rural',
      col_gender: 'Homens & Mulheres',
      col_area_density: 'Área (km²) & Densidade',
      col_affected: 'Pessoas & Famílias Afetadas',
      col_sarcof: 'Zona Climática SARCOF',
      col_risk: 'Score & Rank de Risco',
      col_fies: '% FIES Severa (ODS 2.1)',
      col_water: 'Carência Água (ODS 6.1)',
      col_source: 'Fonte & Metadados INE',
      export_sheets_title: 'Abas Geradas no Livro Excel (.xlsx):',
      export_sheet_1: '"Resumo Províncias": Totais e indicadores provinciais oficiais.',
      export_sheet_2: '"Detalhamento Municípios": Todos os municípios selecionados por província.',
      export_sheet_3: '"Consolidado Geral": Tabela unificada para tabelas dinâmicas.',
      export_stat_provinces: 'Províncias Selecionadas:',
      export_stat_mun: 'Municípios Selecionados:',
      export_stat_total_pop: 'População Total Coberta:',
      export_stat_records: 'Registos a Exportar:',
      btn_download_csv: 'Baixar CSV',
      btn_download_excel: 'Baixar em Excel (.xlsx)',
      opt_all_risks: 'Todos os Níveis de Risco (Baixo, Moderado, Alto, Crítico)',
      opt_risk_high: 'Apenas Risco Alto e Crítico (Score ≥ 15)',
      opt_risk_mod_high: 'Risco Moderado a Crítico (Score ≥ 8)',
      opt_risk_low: 'Apenas Risco Baixo (Score < 8)',
      opt_all_fies: 'Todas as faixas FIES',
      opt_fies_high: 'Crítica / Severa Alta (> 30% da população)',
      opt_fies_med: 'Moderada a Severa (> 15% da população)'
    },
    en: {
      app_title: 'El Niño Angola Portal',
      app_subtitle: 'El Niño Climate Risk & Official Demographic Base INE Angola (Census 2024 & Projections 2025–2027)',
      badge_sarcof_active: 'SARCOF-33 Active',
      badge_online_users: 'online',
      hdr_ine_badge: 'Official INE Angola:',
      btn_methodology: 'Clickable Sources & Methodology',
      btn_table_censo: 'Census Table / Projections',
      btn_reports_pdf: 'PDF Reports',
      tab_layers: 'Layers',
      tab_risk_censo: 'Risk & Census',
      tab_analytics: 'Analytics',
      tab_reports: 'Reports',
      ctrl_basemap: 'Base Map',
      ctrl_map_style: 'Map Style & Colors',
      lbl_map_palette: 'Thematic Color Palette:',
      lbl_prov_borders: 'Provinces (Main Boundaries)',
      lbl_mun_borders: 'Municipalities (Internal Limits)',
      lbl_sadc_underlay: 'SADC Regional Layer (Background)',
      lbl_canvas_bg: 'Background in Shapes-Only Mode:',
      lbl_label_mode: 'Label Density (Anti-Clutter):',
      btn_center_angola: 'Center Angola',
      btn_toggle_shapes: 'Shapes Only',
      btn_reset_style: 'Reset Default',
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
      chart_ivc_title: 'Living Conditions & Vulnerability (Census 2024)',
      chart_ivc_subtitle: 'INE Census 2024 indicators: water, sanitation, electricity, housing, age dependency',
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
      insp_click_prov: 'Click on a province to view Census 2024 SDG Indicators',
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
      th_ivc: 'Water Deficit (SDG 6.1) ⓘ',
      th_fies: '% Severe FIES (INE) ⓘ',
      th_risk_score: 'Risk Score (1-25) ⓘ',
      th_source: 'Official Source',
      cat_all: 'All Categories',
      cat_1: 'Below-Normal / Drought (BN)',
      cat_2: 'Normal to Below-Normal (N-BN)',
      cat_3: 'Normal to Above-Normal (N-AN)',
      cat_4: 'Above-Normal (AN)',
      btn_custom_formula: 'Configure Custom Formula',
      custom_modal_title: 'Custom Formula Builder',
      custom_modal_desc_title: 'Build your own formula using official system data',
      custom_modal_desc_body: 'Define the percentage weights for official variables available in the system. Calculations execute in real-time on official INE population for all 21 provinces and 326 municipalities.',
      custom_formula_name_label: 'Formula Name:',
      custom_formula_link_label: 'Official Methodology Link / Source:',
      custom_variables_title: 'Weighting of Available Official Variables',
      var_v_clima: 'SARCOF-33 Climate Anomaly (V_clima)',
      var_fies: 'Severe Food Insecurity FIES INE/FAO (SDG 2.1.2)',
      var_water: 'Without Safe Water Access (INE Census 2024 / SDG 6.1)',
      var_san: 'Without Adequate Sanitation (INE Census 2024 / SDG 6.2)',
      var_elec: 'Without Electricity or Solar (INE Census 2024 / SDG 7.1)',
      var_hab: 'Precarious Housing: Hut/Shack (INE Census 2024 / SDG 11.1)',
      var_children: 'Children 0-14 Years (INE Census 2024)',
      custom_formula_preview_title: 'Resulting Mathematical Equation:',
      btn_reset_defaults: 'Reset Defaults',
      btn_apply_formula: 'Apply Formula & Calculate',
      btn_export_excel: 'Export Excel',
      btn_export_excel_advanced: 'Export Excel (Filters)',
      export_modal_title: 'Export Angola Population to Excel (.xlsx / .csv)',
      export_modal_subtitle: 'Select Provinces, Municipalities and Custom Filters (Official INE Base: Census 2024 & Projections 2025–2027)',
      export_geo_title: '1. Geographic Selection (Provinces & Municipalities)',
      export_mode_prov_title: 'Province Totals Only',
      export_mode_prov_desc: 'Exports aggregated population for selected provinces.',
      export_mode_both_title: 'Provinces & Respective Municipalities',
      export_mode_both_desc: 'Exports breakdown by province and each respective municipality.',
      export_lbl_provinces: 'Provinces:',
      export_lbl_mun: 'Municipalities',
      btn_select_all: 'All',
      btn_clear: 'Clear',
      export_search_prov: 'Search province...',
      export_search_mun: 'Search municipality...',
      export_filters_title: '2. Additional Filters & Columns to Include',
      export_lbl_year: 'Population Year / Official Projection:',
      export_lbl_risk: 'Filter by El Niño Risk (Matrix 1–25):',
      export_lbl_fies: 'Severe Food Insecurity FIES (INE / FAO):',
      export_lbl_columns: 'Columns / Variables to Export:',
      btn_all: 'All',
      btn_standard: 'Default',
      col_pop_total: 'Total Population',
      col_urban_rural: 'Urban & Rural',
      col_gender: 'Men & Women',
      col_area_density: 'Area (km²) & Density',
      col_affected: 'Affected People & Families',
      col_sarcof: 'SARCOF Climate Zone',
      col_risk: 'Risk Score & Rank',
      col_fies: '% Severe FIES (SDG 2.1)',
      col_water: 'Water Deficit (SDG 6.1)',
      col_source: 'Official INE Source & Metadata',
      export_sheets_title: 'Worksheets Generated in Excel Workbook (.xlsx):',
      export_sheet_1: '"Resumo Províncias": Official provincial totals and indicators.',
      export_sheet_2: '"Detalhamento Municípios": All selected municipalities per province.',
      export_sheet_3: '"Consolidado Geral": Unified table for Excel pivot tables.',
      export_stat_provinces: 'Selected Provinces:',
      export_stat_mun: 'Selected Municipalities:',
      export_stat_total_pop: 'Total Population Covered:',
      export_stat_records: 'Records to Export:',
      btn_download_csv: 'Download CSV',
      btn_download_excel: 'Download Excel (.xlsx)',
      opt_all_risks: 'All Risk Levels (Low, Moderate, High, Critical)',
      opt_risk_high: 'High & Critical Risk Only (Score ≥ 15)',
      opt_risk_mod_high: 'Moderate to Critical Risk (Score ≥ 8)',
      opt_risk_low: 'Low Risk Only (Score < 8)',
      opt_all_fies: 'All FIES Ranges',
      opt_fies_high: 'Critical / High Severity (> 30% of population)',
      opt_fies_med: 'Moderate to Severe (> 15% of population)'
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

  // Definições Oficiais da Matriz de Risco Histórico de Secas em Angola (1984-2025)
  // Base: Análise climatológica de 41 anos (INAMET / SADC SARCOF / FEWS NET) & Avaliação de Vulnerabilidade (SADC RVAA / Protecção Civil)
  const riskMatrixDefinitions = {
    likelihood: {
      1: {
        pt: 'Muito Improvável',
        en: 'Very Unlikely',
        freqPt: '< 5% dos anos (< 2 secas em 41 anos)',
        freqEn: '< 5% of years (< 2 droughts in 41 yrs)',
        descPt: 'Regime pluvial estável e hiper-húmido; secas severas quase ausentes no histórico 1984-2025.',
        descEn: 'Stable hyper-humid rainfall regime; severe droughts virtually absent in 1984-2025 record.'
      },
      2: {
        pt: 'Improvável',
        en: 'Unlikely',
        freqPt: '5% a 15% dos anos (2 a 6 secas em 41 anos)',
        freqEn: '5% to 15% of years (2 to 6 droughts in 41 yrs)',
        descPt: 'Secas raras e isoladas (ex.: Cabinda, Zaire, Uíge, Luanda, Bengo, Cuanza Norte).',
        descEn: 'Rare and isolated droughts (e.g. Cabinda, Zaire, Uige, Luanda, Bengo, Cuanza Norte).'
      },
      3: {
        pt: 'Moderadamente Provável',
        en: 'Moderately Likely',
        freqPt: '15% a 30% dos anos (7 a 12 secas em 41 anos)',
        freqEn: '15% to 30% of years (7 to 12 droughts in 41 yrs)',
        descPt: 'Secas cíclicas associadas a episódios moderados de El Niño no Planalto Central e Leste (ex.: Cuanza Sul, Malanje, Bié, Huambo, Moxico, Lunda Sul/Norte).',
        descEn: 'Cyclical droughts associated with moderate El Niño in Central/Eastern plateaus (e.g. Cuanza Sul, Malanje, Bie, Huambo, Moxico).'
      },
      4: {
        pt: 'Provável',
        en: 'Likely',
        freqPt: '30% a 50% dos anos (13 a 20 secas em 41 anos)',
        freqEn: '30% to 50% of years (13 to 20 droughts in 41 yrs)',
        descPt: 'Zona de transição semiárida com défices pluviométricos e estiagens frequentes (ex.: Benguela, Huíla).',
        descEn: 'Semi-arid transition zone with frequent rainfall deficits and dry spells (e.g. Benguela, Huila).'
      },
      5: {
        pt: 'Muito Provável / Recorrente',
        en: 'Very Likely / Recurrent',
        freqPt: '> 50% dos anos (> 20 secas em 41 anos)',
        freqEn: '> 50% of years (> 20 droughts in 41 yrs)',
        descPt: 'Corredor árido/semiárido do Sul de Angola sob impacto crónico e recorrente de secas de El Niño (ex.: Cunene, Namibe, Cuando, Cubango).',
        descEn: 'Arid/semi-arid Southern corridor under chronic, recurrent El Niño drought (e.g. Cunene, Namibe, Cuando, Cubango).'
      }
    },
    impact: {
      1: {
        pt: 'Negligenciável',
        en: 'Negligible',
        descPt: 'Impacto residual; agricultura e subsistência sem perdas apreciáveis.',
        descEn: 'Residual impact; agriculture and livelihoods without appreciable loss.'
      },
      2: {
        pt: 'Baixo',
        en: 'Low',
        descPt: 'Perdas agrícolas ligeiras, compensadas por comércio ou fontes alternativas locais (ex.: Uíge).',
        descEn: 'Minor agricultural losses, offset by trade or alternative sources (e.g. Uige).'
      },
      3: {
        pt: 'Moderado',
        en: 'Moderate',
        descPt: 'Quebra de 20% a 35% na colheita agropastoril e pressão inflacionária nos alimentos básicos (ex.: Luanda, Bengo, Cuanza Sul, Malanje, Moxico).',
        descEn: '20% to 35% agropastoral harvest loss and food price inflation (e.g. Luanda, Bengo, Cuanza Sul, Malanje, Moxico).'
      },
      4: {
        pt: 'Significativo / Severo',
        en: 'Significant / Severe',
        descPt: 'Quebra > 40% na produção agrícola, perda de pastagens/mortalidade de gado, esgotamento precoce de celeiros e necessidade urgente de assistência humanitária (ex.: Cunene, Huíla, Namibe, Cuando, Cubango, Huambo, Lunda Norte).',
        descEn: 'Harvest loss > 40%, severe pasture/water deficit, livestock losses, urgent humanitarian assistance needed (e.g. Cunene, Huila, Namibe, Cuando, Cubango).'
      },
      5: {
        pt: 'Crítico / Catastrófico',
        en: 'Critical / Catastrophic',
        descPt: 'Colapso dos meios de subsistência, perda massiva de rebanhos e desnutrição aguda severa generalizada.',
        descEn: 'Livelihood collapse, massive livestock mortality, and widespread severe acute malnutrition.'
      }
    }
  };

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
    if (selBasemap && selBasemap.options.length >= 4) {
      selBasemap.options[0].text = lang === 'en' ? 'No Base Map (Shapes Only / Clean)' : 'Sem Mapa Base (Apenas Shapes / Fundo Limpo)';
      selBasemap.options[1].text = lang === 'en' ? 'OpenStreetMap Standard' : 'OpenStreetMap Padrão';
      selBasemap.options[2].text = lang === 'en' ? 'Esri Satellite (HD Satellite)' : 'Esri Satélite (Satélite HD)';
      selBasemap.options[3].text = lang === 'en' ? 'Esri Topographic (Terrain / Relief)' : 'Esri Topográfico (Relevo / Topografia)';
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

    // Preserve and ensure online users counter is properly displayed after language change
    if (typeof window._refreshOnlineCountDisplay === 'function') {
      window._refreshOnlineCountDisplay();
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

  // Pre-configured DPA Atlas Colors (distinct per province for maximum cartographic clarity)
  const dpaAtlasProvinceColors = {
    'Bengo': '#10b981',
    'Benguela': '#0284c7',
    'Bié': '#ec4899',
    'Cabinda': '#06b6d4',
    'Cuando': '#d97706',
    'Cubango': '#15803d',
    'Cuanza Norte': '#8b5cf6',
    'Cuanza Sul': '#3b82f6',
    'Cunene': '#e11d48',
    'Huambo': '#7c3aed',
    'Huíla': '#ea580c',
    'Icolo e Bengo': '#14b8a6',
    'Luanda': '#2563eb',
    'Lunda Norte': '#6366f1',
    'Lunda Sul': '#a855f7',
    'Malanje': '#eab308',
    'Moxico': '#f59e0b',
    'Moxico Leste': '#f97316',
    'Namibe': '#0369a1',
    'Uíge': '#059669',
    'Zaire': '#0891b2'
  };

  // Dynamic feature color determination based on active theme & hierarchy
  function getFeatureColor(feature, typeKey) {
    const theme = state.mapTheme || {};
    const palette = theme.palette || 'fews_alert';
    const props = feature ? (feature.properties || {}) : {};
    const provName = normalizeProvName(props.Nome_Prov || props.NAME || props.PROVINCIA || '');

    if (palette === 'custom') {
      return typeKey === 'provincias' ? (theme.customProvFill || '#ea580c') : (theme.customMunFill || '#334155');
    }

    if (palette === 'dpa_atlas') {
      return dpaAtlasProvinceColors[provName] || '#64748b';
    }

    if (palette === 'risk_undrr') {
      const pData = state.ineData && state.ineData.provincias ? state.ineData.provincias[provName] : null;
      const score = pData && pData.matriz_risco ? pData.matriz_risco.score : 10;
      if (score >= 18) return '#e11d48'; // Crítico
      if (score >= 12) return '#ea580c'; // Alto
      if (score >= 6) return '#eab308';  // Moderado
      return '#10b981'; // Baixo
    }

    if (palette === 'fews_alert') {
      // Drought alert zone (Namibe, Huíla, Cunene, Cubango, Cuando, Bié, Moxico, Moxico Leste)
      const isBelowNormal = getSarcofForAngolaFeature(feature, typeKey, state.activeSeason) === 1;
      return isBelowNormal ? '#f97316' : '#06b6d4';
    }

    // Default 'sarcof_classic'
    const code = getSarcofForAngolaFeature(feature, typeKey, state.activeSeason);
    const cfg = categoryConfig[code] || categoryConfig[3];
    return cfg.color;
  }

  // Canvas background helper for pure shapes mode
  function applyCanvasBackground(bgHex) {
    const mapEl = document.getElementById('map');
    if (!mapEl) return;
    mapEl.classList.remove('canvas-dark', 'canvas-slate', 'canvas-light');
    if (bgHex === '#f8fafc') {
      mapEl.classList.add('canvas-light');
    } else if (bgHex === '#1e293b') {
      mapEl.classList.add('canvas-slate');
    } else {
      mapEl.classList.add('canvas-dark');
    }
  }

  // Inicializar o Mapa Leaflet
  function initMap() {
    try {
      // Centered directly on Angola (lat: -12.35, lon: 17.55, zoom: 5.8)
      state.map = L.map('map', {
        center: [-12.35, 17.55],
        zoom: 5.8,
        zoomControl: true
      });

      // Strict Map Panes Hierarchy: SADC on bottom (390), Angola layers on top
      if (!state.map.getPane('sadcPane')) {
        state.map.createPane('sadcPane');
        state.map.getPane('sadcPane').style.zIndex = 390;
      }
      if (!state.map.getPane('sadcHatchPane')) {
        state.map.createPane('sadcHatchPane');
        state.map.getPane('sadcHatchPane').style.zIndex = 400;
      }
      if (!state.map.getPane('angolaProvinciasPane')) {
        state.map.createPane('angolaProvinciasPane');
        state.map.getPane('angolaProvinciasPane').style.zIndex = 420;
      }
      if (!state.map.getPane('angolaMunicipiosPane')) {
        state.map.createPane('angolaMunicipiosPane');
        state.map.getPane('angolaMunicipiosPane').style.zIndex = 440;
      }
      if (!state.map.getPane('angolaComunasPane')) {
        state.map.createPane('angolaComunasPane');
        state.map.getPane('angolaComunasPane').style.zIndex = 450;
      }
      if (!state.map.getPane('angolaProvBordersPane')) {
        state.map.createPane('angolaProvBordersPane');
        state.map.getPane('angolaProvBordersPane').style.zIndex = 460;
        state.map.getPane('angolaProvBordersPane').style.pointerEvents = 'none';
      }
      if (!state.map.getPane('hatchPane')) {
        state.map.createPane('hatchPane');
        state.map.getPane('hatchPane').style.zIndex = 470;
        state.map.getPane('hatchPane').style.pointerEvents = 'none';
      }
      if (!state.map.getPane('labelsPane')) {
        state.map.createPane('labelsPane');
        state.map.getPane('labelsPane').style.zIndex = 490;
        state.map.getPane('labelsPane').style.pointerEvents = 'none';
      }

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

      // Basemap & Pure Shape Handler
      function applyBasemapSelection(selected) {
        Object.values(state.baseLayers).forEach(layer => {
          if (state.map.hasLayer(layer)) state.map.removeLayer(layer);
        });
        const mapEl = document.getElementById('map');
        const toggleBtn = document.getElementById('btn-toggle-shapes');
        const toggleLbl = document.getElementById('lbl-btn-toggle-shapes');

        if (selected === 'none') {
          mapEl.classList.add('map-shapes-only');
          applyCanvasBackground(state.mapTheme.canvasBg || '#090d16');
          if (toggleBtn) toggleBtn.classList.add('active');
          if (toggleLbl) toggleLbl.textContent = state.currentLang === 'en' ? 'Show BaseMap' : 'Ver Mapa Base';
        } else {
          mapEl.classList.remove('map-shapes-only', 'canvas-dark', 'canvas-slate', 'canvas-light');
          if (state.baseLayers[selected]) state.baseLayers[selected].addTo(state.map);
          state.lastActiveBasemap = selected;
          if (toggleBtn) toggleBtn.classList.remove('active');
          if (toggleLbl) toggleLbl.textContent = state.currentLang === 'en' ? 'Shapes Only' : 'Apenas Shapes';
        }
        ensureSvgPattern();
      }

      document.getElementById('select-basemap').addEventListener('change', (e) => {
        applyBasemapSelection(e.target.value);
      });

      // Floating toolbar: Centrar Angola Button
      const btnCenterAngola = document.getElementById('btn-center-angola');
      if (btnCenterAngola) {
        btnCenterAngola.addEventListener('click', () => {
          state.map.flyTo([-12.35, 17.55], 5.8, { duration: 0.8 });
        });
      }

      // Floating toolbar: Alternar Apenas Shapes
      const btnToggleShapes = document.getElementById('btn-toggle-shapes');
      if (btnToggleShapes) {
        btnToggleShapes.addEventListener('click', () => {
          const selBasemap = document.getElementById('select-basemap');
          const isNone = selBasemap.value === 'none';
          const target = isNone ? (state.lastActiveBasemap || 'osm') : 'none';
          selBasemap.value = target;
          applyBasemapSelection(target);
        });
      }

      // Floating toolbar: Cores & Estilo Quick Button
      const btnQuickStyle = document.getElementById('btn-open-style-quick');
      if (btnQuickStyle) {
        btnQuickStyle.addEventListener('click', () => {
          const tabBtn = document.querySelector('.tab-btn[data-tab="tab-layers"]');
          if (tabBtn) tabBtn.click();
          const panel = document.getElementById('map-theme-panel');
          if (panel) {
            panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
            panel.style.boxShadow = '0 0 18px rgba(56, 189, 248, 0.7)';
            setTimeout(() => { panel.style.boxShadow = ''; }, 1600);
          }
        });
      }

      // Dynamic Zoom Management for Clean Anti-Clutter Labels
      function updateMapZoomClasses() {
        if (!state.map) return;
        const z = state.map.getZoom();
        const mapEl = document.getElementById('map');
        if (!mapEl) return;
        if (z < 7.0) {
          mapEl.classList.add('leaflet-zoom-low');
          mapEl.classList.remove('leaflet-zoom-high');
        } else {
          mapEl.classList.remove('leaflet-zoom-low');
          mapEl.classList.add('leaflet-zoom-high');
        }
      }
      state.map.on('zoomend', updateMapZoomClasses);
      updateMapZoomClasses();

      // Keep pattern alive after map view resets in Chrome and Edge
      state.map.on('zoomend moveend viewreset layeradd', () => {
        ensureSvgPattern();
        const hatchPaths = document.querySelectorAll('path.leaflet-sarcof-hatch, .leaflet-sarcof-hatch');
        hatchPaths.forEach(p => {
          p.setAttribute('fill', 'url(#sarcof-hatch)');
          p.style.setProperty('fill', 'url(#sarcof-hatch)', 'important');
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

  // INDICADORES DE CONDIÇÕES DE VIDA & ODS (CENSO 2024 INE / ONU)
  // Fontes Oficiais: INE Angola Censo 2024 | Metadados ODS da ONU (ODS 6.1.1, 6.2.1, 7.1.1, 11.1.1)
  // https://censo2024.ine.gov.ao/ | https://unstats.un.org/sdgs/
  function getCensusLivelihoodIndicators(censoData) {
    if (!censoData || !censoData.agua_total) return null;

    const total = censoData.agua_total || 1;
    const aggTotal = censoData.agg_total || 1;
    const habTotal = censoData.hab_total || 1;
    const sanTotal = censoData.san_total || 1;

    // 1. Acesso à água potável/segura (% sem acesso - ODS 6.1.1)
    const semAgua = censoData.agua_sem_acesso || 0;
    const pctSemAgua = (semAgua / total) * 100;

    // 2. Saneamento básico (% sem saneamento - ODS 6.2.1)
    const semSan = censoData.san_nenhum || 0;
    const pctSemSan = (semSan / sanTotal) * 100;

    // 3. Eletricidade (% sem eletricidade/solar - ODS 7.1.1)
    const semElec = aggTotal - (censoData.agg_electricidade || 0) - (censoData.agg_solar || 0) - (censoData.agg_gerador || 0);
    const pctSemElec = Math.max(0, (semElec / aggTotal) * 100);

    // 4. Habitação precária (% cubata + barraca - ODS 11.1.1)
    const habPrecaria = (censoData.hab_cubata || 0) + (censoData.hab_barraca || 0);
    const pctHabPrecaria = (habPrecaria / habTotal) * 100;

    // 5. Demografia: crianças 0-14 anos (% dependência etária)
    const popTotal = censoData.pop_total || 1;
    const pop014 = censoData.idade_0_14 || 0;
    const pctCriancas = (pop014 / popTotal) * 100;

    return {
      pctSemAgua: pctSemAgua.toFixed(1),
      pctSemSan: pctSemSan.toFixed(1),
      pctSemElec: pctSemElec.toFixed(1),
      pctHabPrecaria: pctHabPrecaria.toFixed(1),
      pctCriancas: pctCriancas.toFixed(1)
    };
  }

  // Alias para retrocompatibilidade
  const computeCensusVulnerabilityIndex = getCensusLivelihoodIndicators;

  // MOTOR DE CÁLCULO DAS FÓRMULAS OFICIAIS (ONU / FEWS NET / SADC / INE / CUSTOM)
  // Normas estritas e aprovadas internacionalmente pelas Nações Unidas e governamentais
  function calculateOfficialFormula(demographics, categoryCode) {
    const codeKey = categoryCode || 3;
    const cfg = categoryConfig[codeKey] || categoryConfig[3];
    const totalPop = demographics.total || 0;
    const urbanPop = demographics.urban || Math.round(totalPop * 0.4);
    const ruralPop = demographics.rural || (totalPop - urbanPop);

    // Indicadores descritivos de Condições de Vida do Censo INE 2024
    const livelihoodData = demographics.censoDetails ? getCensusLivelihoodIndicators(demographics.censoDetails) : null;

    let affectedPop = 0;
    let formulaSteps = '';
    let formulaTitle = '';
    let officialUrl = '';
    let officialOrg = '';

    if (state.formulaModel === 'UNDRR_IPCC') {
      // 1. EQUAÇÃO GERAL DO RISCO DE CATÁSTROFES (UNDRR SENDAI / IPCC AR6 WGII)
      // Risco = Perigo (H) × Exposição (E) × Vulnerabilidade (V)
      // Padrão Puro UNDRR / Sendai Framework 2015-2030 sem multiplicadores arbitrários
      const vClima = cfg.vFactor;
      const exposureE = 1.0;
      affectedPop = Math.round(totalPop * exposureE * vClima);

      formulaTitle = state.currentLang === 'en' ? 'UNDRR / IPCC — Disaster Risk Equation (R = H × E × V)' : 'UNDRR / IPCC — Equação Geral do Risco (R = H × E × V)';
      officialOrg = 'UNDRR (Quadro de Sendai) & IPCC AR6 WGII';
      officialUrl = 'https://www.undrr.org/terminology/disaster-risk';
      const numFmt = state.currentLang === 'en' ? 'en-US' : 'pt-PT';
      formulaSteps = `P_afetada = Pop (${totalPop.toLocaleString(numFmt)}) × E (${exposureE}) × V_clima (${vClima}) = ${affectedPop.toLocaleString(numFmt)} hab.`;

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

      affectedPop = Math.round(totalPop * pinRate);
      formulaTitle = state.currentLang === 'en' ? 'IPC / FEWS NET — Population in Need (PIN / Phase 3+)' : 'IPC / FEWS NET — População em Necessidade (PIN / Fase 3+)';
      officialOrg = 'IPC Global Platform (Manual 3.1) & FEWS NET';
      officialUrl = 'https://www.ipcinfo.org/ipc-manual/';
      const numFmt = state.currentLang === 'en' ? 'en-US' : 'pt-PT';
      formulaSteps = `PIN = Pop_Total (${totalPop.toLocaleString(numFmt)}) × % IPC 3+ (${(pinRate * 100).toFixed(0)}%) = ${affectedPop.toLocaleString(numFmt)} hab. (${phaseDesc})`;

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

      const ruralAffected = Math.round(ruralPop * rFactor);
      const urbanAffected = Math.round(urbanPop * uFactor);
      affectedPop = ruralAffected + urbanAffected;

      formulaTitle = state.currentLang === 'en' ? 'WFP / FAO / SADC — Agropastoral Shock & Food Prices' : 'PAM / FAO / SADC — Choque Agropastoril & Preços de Alimentos';
      officialOrg = state.currentLang === 'en' ? 'World Food Programme (VAM) & FAO (GIEWS)' : 'Programa Alimentar Mundial (VAM) & FAO (GIEWS)';
      officialUrl = 'https://vam.wfp.org/';
      const numFmt = state.currentLang === 'en' ? 'en-US' : 'pt-PT';
      formulaSteps = `P_afetada = [Rural: ${ruralPop.toLocaleString(numFmt)} × ${(rFactor * 100).toFixed(0)}%] + [Urbano: ${urbanPop.toLocaleString(numFmt)} × ${(uFactor * 100).toFixed(0)}%] = ${affectedPop.toLocaleString(numFmt)} hab.`;

    } else if (state.formulaModel === 'IPC_FIES_INE') {
      // 4. MATRIZ DE RISCO HISTÓRICO (1984-2025) & FIES INE (ODS 2.1.2)
      // Fonte Oficial: Relatório FIES INE/FAO (Fevereiro 2026, Quadro 5) & Matriz de Tendências Históricas
      const fiesSev = demographics.fiesSeveraPct ?? 15.0;
      const riskMat = demographics.riskMatrix || { likelihood: 3, impact: 3, score: 9, rank: 'Moderado' };
      const fiesRate = fiesSev / 100.0;

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

      const isEn = state.currentLang === 'en';
      const lDef = riskMatrixDefinitions.likelihood[riskMat.likelihood] || riskMatrixDefinitions.likelihood[3];
      const iDef = riskMatrixDefinitions.impact[riskMat.impact] || riskMatrixDefinitions.impact[3];
      const lName = isEn ? lDef.en : lDef.pt;
      const iName = isEn ? iDef.en : iDef.pt;

      formulaTitle = isEn ? 'Risk Matrix (1984-2025) & INE FIES (SDG 2.1.2)' : 'Matriz de Risco (1984-2025) & FIES INE (ODS 2.1.2)';
      officialOrg = 'INE Angola (FIES Fev 2026) & Matriz de Risco 1984-2025';
      officialUrl = 'https://www.ine.gov.ao/publicacoes/detalhes/NTA0Mzg%3D';
      const numFmt = isEn ? 'en-US' : 'pt-PT';
      formulaSteps = isEn
        ? `[Step 1 - Risk Matrix 1984-2025]: Likelihood L(${riskMat.likelihood}/5: ${lName}) × Impact I(${riskMat.impact}/5: ${iName}) = Score ${riskMat.score}/25 (${riskMat.rank}) | [Step 2 - Climate Shock]: SARCOF Multiplier = ${climateMultiplier.toFixed(2)}x | [Step 3 - Affected Pop]: Pop (${totalPop.toLocaleString(numFmt)}) × FIES (${fiesSev}%) × ${climateMultiplier.toFixed(2)}x = ${affectedPop.toLocaleString(numFmt)} people`
        : `[Passo 1 - Matriz de Risco 1984-2025]: Likelihood L(${riskMat.likelihood}/5: ${lName}) × Impacto I(${riskMat.impact}/5: ${iName}) = Score ${riskMat.score}/25 (${riskMat.rank}) | [Passo 2 - Choque SARCOF]: Multiplicador = ${climateMultiplier.toFixed(2)}x | [Passo 3 - População Insegura]: Pop (${totalPop.toLocaleString(numFmt)}) × FIES (${fiesSev}%) × ${climateMultiplier.toFixed(2)}x = ${affectedPop.toLocaleString(numFmt)} hab.`;

    } else if (state.formulaModel === 'CUSTOM') {
      // 5. FÓRMULA PERSONALIZADA PELO UTILIZADOR COM DADOS DO SISTEMA
      const cf = state.customFormula || {};
      const w = cf.weights || { v_clima: 50, fies_severa: 30, sem_agua: 20 };
      const numFmt = state.currentLang === 'en' ? 'en-US' : 'pt-PT';

      const vClimaVal = cfg.vFactor; // 0..0.85
      const fiesVal = (demographics.fiesSeveraPct ?? 15.0) / 100.0;
      const aguaVal = livelihoodData ? (parseFloat(livelihoodData.pctSemAgua) / 100.0) : 0.40;
      const sanVal = livelihoodData ? (parseFloat(livelihoodData.pctSemSan) / 100.0) : 0.50;
      const elecVal = livelihoodData ? (parseFloat(livelihoodData.pctSemElec) / 100.0) : 0.60;
      const habVal = livelihoodData ? (parseFloat(livelihoodData.pctHabPrecaria) / 100.0) : 0.30;
      const childVal = livelihoodData ? (parseFloat(livelihoodData.pctCriancas) / 100.0) : 0.45;
      const riskVal = ((demographics.riskMatrix?.score || 9) / 25.0);

      const totalWeight = (w.v_clima || 0) + (w.fies_severa || 0) + (w.sem_agua || 0) + 
                          (w.sem_san || 0) + (w.sem_elec || 0) + (w.hab_precaria || 0) + 
                          (w.criancas_014 || 0) + (w.risk_score || 0);

      let effectiveRate = 0;
      if (totalWeight > 0) {
        effectiveRate = (
          (w.v_clima || 0) * vClimaVal +
          (w.fies_severa || 0) * fiesVal +
          (w.sem_agua || 0) * aguaVal +
          (w.sem_san || 0) * sanVal +
          (w.sem_elec || 0) * elecVal +
          (w.hab_precaria || 0) * habVal +
          (w.criancas_014 || 0) * childVal +
          (w.risk_score || 0) * riskVal
        ) / totalWeight;
      }
      effectiveRate = Math.min(1.0, Math.max(0.0, effectiveRate));
      affectedPop = Math.round(totalPop * effectiveRate);

      formulaTitle = cf.name || (state.currentLang === 'en' ? 'User Custom Formula' : 'Fórmula Personalizada pelo Utilizador');
      officialOrg = cf.officialOrg || (state.currentLang === 'en' ? 'User-Defined Parameters' : 'Utilizador / Parâmetros Customizados');
      officialUrl = cf.officialUrl || 'https://censo2024.ine.gov.ao/';
      formulaSteps = `P_afetada = Pop (${totalPop.toLocaleString(numFmt)}) × Taxa Ponderada (${(effectiveRate * 100).toFixed(1)}%) = ${affectedPop.toLocaleString(numFmt)} hab.`;
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
      livelihoodData,
      ivcData: livelihoodData
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
        pattern.setAttribute('width', '10');
        pattern.setAttribute('height', '10');

        // Robust diagonal stripes (seamless 45-degree tile without matrix transform issues in Skia/Chromium)
        const pathDark = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathDark.setAttribute('d', 'M-2,2 l4,-4 M0,10 l10,-10 M8,12 l4,-4');
        pathDark.setAttribute('stroke', '#0f172a');
        pathDark.setAttribute('stroke-width', '2.5');
        pathDark.setAttribute('stroke-opacity', '0.85');

        // Light accent stripe for high contrast over dark backgrounds
        const pathLight = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathLight.setAttribute('d', 'M-2,7 l4,-4 M5,15 l10,-10 M3,3 l4,-4');
        pathLight.setAttribute('stroke', '#ffffff');
        pathLight.setAttribute('stroke-width', '0.8');
        pathLight.setAttribute('stroke-opacity', '0.5');

        pattern.appendChild(pathDark);
        pattern.appendChild(pathLight);
        defs.appendChild(pattern);
      }
    });
  }

  // Render High Confidence Hatching Overlay Layer
  function renderHighConfidenceOverlay(geoJson) {
    ensureSvgPattern();
    const layerGroup = L.geoJSON(geoJson, {
      pane: 'hatchPane',
      filter: (feature) => {
        const p = feature.properties || {};
        if (state.activeCategory !== 'ALL' && String(p.finalcode) !== String(state.activeCategory)) return false;
        return p.is_high_confidence === true || p.confidence_overlay === 'high confidence';
      },
      style: () => ({
        className: 'leaflet-sarcof-hatch',
        fillColor: 'url(#sarcof-hatch)',
        fillOpacity: 0.95,
        weight: 0,
        stroke: false,
        interactive: false
      }),
      onEachFeature: (feature, layer) => {
        const applyHatch = () => {
          ensureSvgPattern();
          if (layer._path) {
            layer._path.classList.add('leaflet-sarcof-hatch');
            layer._path.setAttribute('fill', 'url(#sarcof-hatch)');
            layer._path.setAttribute('fill-opacity', '0.95');
            layer._path.setAttribute('stroke', 'none');
            layer._path.style.setProperty('fill', 'url(#sarcof-hatch)', 'important');
            layer._path.style.setProperty('fill-opacity', '0.95', 'important');
            layer._path.style.setProperty('pointer-events', 'none', 'important');
          }
        };
        applyHatch();
        if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(applyHatch);
        setTimeout(applyHatch, 50);
        setTimeout(applyHatch, 200);
      }
    }).addTo(state.map);

    ensureSvgPattern();
    return layerGroup;
  }

  // Render All Active Layers (Simultaneous Layers with Strict Hierarchy & Theming)
  function renderAllLayers() {
    if (!state.map) return;

    Object.keys(state.geoJsonLayers).forEach(key => {
      if (state.geoJsonLayers[key] && state.map.hasLayer(state.geoJsonLayers[key])) {
        state.map.removeLayer(state.geoJsonLayers[key]);
      }
    });

    const theme = state.mapTheme || {};

    // 1. SADC Regional Layer (strictly underneath Angola in sadcPane, zIndex 390)
    if (state.layersEnabled.sarcof && state.geoJsonData[state.activeSeason]) {
      state.geoJsonLayers.sarcof = renderGeoJsonCollection(state.geoJsonData[state.activeSeason], 'sarcof', {
        fillOpacity: theme.sadcOpacity !== undefined ? theme.sadcOpacity : 0.25,
        weight: 1.0,
        color: '#334155'
      });
    }

    // 2. Angola Provinces (in angolaProvinciasPane, zIndex 420)
    if (state.layersEnabled.provincias && state.geoJsonData.PROVINCIAS) {
      state.geoJsonLayers.provincias = renderGeoJsonCollection(state.geoJsonData.PROVINCIAS, 'provincias', (feature) => {
        const fillCol = getFeatureColor(feature, 'provincias');
        return {
          fillColor: fillCol,
          fillOpacity: theme.provFillOpacity !== undefined ? theme.provFillOpacity : 0.45,
          weight: theme.provBorderWeight || 3.5,
          color: theme.provBorderColor || '#0f172a',
          opacity: 0.95
        };
      });
    }

    // 3. High confidence hatching overlay (////) on top of SARCOF and Províncias (hatchPane, zIndex 470)
    if (state.layersEnabled.sarcof && state.showHighConfidence && state.geoJsonData[state.activeSeason]) {
      state.geoJsonLayers.sarcofHatch = renderHighConfidenceOverlay(state.geoJsonData[state.activeSeason]);
    }

    // 4. Angola Municipalities (in angolaMunicipiosPane, zIndex 440)
    if (state.layersEnabled.municipios && state.geoJsonData.MUNICIPIOS) {
      state.geoJsonLayers.municipios = renderGeoJsonCollection(state.geoJsonData.MUNICIPIOS, 'municipios', (feature) => {
        const fillCol = getFeatureColor(feature, 'municipios');
        return {
          fillColor: fillCol,
          fillOpacity: theme.munFillOpacity !== undefined ? theme.munFillOpacity : 0.20,
          weight: theme.munBorderWeight || 1.2,
          color: theme.munBorderColor || '#475569',
          opacity: 0.9,
          dashArray: theme.munBorderStyle === 'dashed' ? '4, 4' : null
        };
      });
    }

    // 5. Heavy Outer Provincial Borders Overlay (angolaProvBordersPane, zIndex 460 - always sharp on top of municipalities!)
    if (state.layersEnabled.provincias && state.geoJsonData.PROVINCIAS) {
      state.geoJsonLayers.provBorders = L.geoJSON(state.geoJsonData.PROVINCIAS, {
        pane: 'angolaProvBordersPane',
        style: () => ({
          fill: false,
          color: theme.provBorderColor || '#0f172a',
          weight: theme.provBorderWeight || 3.5,
          opacity: 0.98,
          interactive: false
        })
      }).addTo(state.map);
    }

    if (state.layersEnabled.comunas && state.geoJsonData.COMUNAS) {
      state.geoJsonLayers.comunas = renderGeoJsonCollection(state.geoJsonData.COMUNAS, 'comunas', {
        fillColor: '#10b981', fillOpacity: 0.15, weight: 1, color: '#6ee7b7', dashArray: '2'
      });
    }

    // Update label density class on map container for anti-clutter visibility
    const mapEl = document.getElementById('map');
    if (mapEl) {
      mapEl.classList.remove('label-mode-smart', 'label-mode-prov-only', 'label-mode-all');
      mapEl.classList.add(`label-mode-${state.labelDensity || 'smart'}`);
    }

    updateGlobalStats();
  }

  // Render a Single GeoJSON Collection with High Performance Tooltips & Interactivity
  function renderGeoJsonCollection(geoJson, typeKey, defaultStyle) {
    const paneName = typeKey === 'sarcof' ? 'sadcPane'
      : (typeKey === 'provincias' ? 'angolaProvinciasPane'
      : (typeKey === 'municipios' ? 'angolaMunicipiosPane' : 'angolaComunasPane'));

    return L.geoJSON(geoJson, {
      pane: paneName,
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
            fillOpacity: state.mapTheme.sadcOpacity !== undefined ? state.mapTheme.sadcOpacity : 0.25,
            weight: 1.0,
            color: '#334155',
            opacity: 0.85
          };
        }
        return typeof defaultStyle === 'function' ? defaultStyle(feature) : defaultStyle;
      },
      onEachFeature: (feature, layer) => {
        const name = getFeatureName(feature, typeKey);

        // Anti-clutter distinct labels (Provinces vs Municipalities)
        if (state.showLabels && name) {
          if (typeKey === 'provincias') {
            layer.bindTooltip(name, {
              pane: 'labelsPane',
              permanent: true,
              direction: 'center',
              className: 'map-text-label map-text-label-prov'
            });
          } else if (typeKey === 'municipios') {
            // Only add municipality label if not in prov_only mode
            if (state.labelDensity !== 'prov_only') {
              layer.bindTooltip(name, {
                pane: 'labelsPane',
                permanent: true,
                direction: 'center',
                className: 'map-text-label map-text-label-mun'
              });
            }
          } else if (typeKey === 'comunas') {
            if (state.labelDensity === 'all') {
              layer.bindTooltip(name, {
                pane: 'labelsPane',
                permanent: true,
                direction: 'center',
                className: 'map-text-label map-text-label-mun'
              });
            }
          }
        }

        layer.on({
          mouseover: (e) => {
            const l = e.target;
            l.setStyle({ weight: 3.5, color: '#38bdf8', fillOpacity: 0.55 });
            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
              l.bringToFront();
            }
          },
          mouseout: (e) => {
            const l = e.target;
            if (typeKey === 'sarcof') {
              const code = feature.properties.finalcode;
              const cfg = categoryConfig[code] || { color: '#94a3b8' };
              l.setStyle({ fillColor: cfg.color, fillOpacity: state.mapTheme.sadcOpacity || 0.25, weight: 1.0, color: '#334155' });
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

  // Render Indicadores de Condições de Vida & ODS no Painel do Inspetor
  function renderIvcPanel(risk) {
    const panel = document.getElementById('insp-ivc-panel');
    if (!panel) return;

    const indicators = risk.livelihoodData || risk.ivcData;
    if (!indicators) {
      panel.innerHTML = `<div style="color:#64748b; font-size:0.75rem; text-align:center; padding:8px;">Indicadores: sem dados do Censo 2024 disponíveis para esta unidade</div>`;
      return;
    }

    function bar(val, color) {
      return `<div style="width:100%; background:rgba(255,255,255,0.07); border-radius:3px; height:6px; overflow:hidden;">
        <div style="width:${val}%; background:${color}; height:100%; border-radius:3px; transition:width 0.5s;"></div></div>`;
    }

    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <span style="font-size:0.75rem; color:#94a3b8; font-weight:700;">
          <i class="fa-solid fa-chart-column" style="color:#38bdf8;"></i> Condições de Vida & ODS (Censo 2024 INE)
        </span>
        <span style="font-size:0.7rem; font-weight:600; color:#38bdf8; background:rgba(56,189,248,0.1); padding:2px 6px; border-radius:4px;">
          ODS 6, 7, 11
        </span>
      </div>
      <div style="font-size:0.65rem; color:#64748b; margin-bottom:8px; line-height:1.4;">
        Indicadores descritivos oficiais do Censo Geral da População e Habitação (INE Angola) alinhados aos ODS da ONU
        <a href="https://censo2024.ine.gov.ao/" target="_blank" rel="noopener" style="color:#38bdf8; text-decoration:none;"> ↗ Censo 2024</a>
      </div>
      <div style="display:flex; flex-direction:column; gap:5px;">
        <div>
          <div style="display:flex; justify-content:space-between; font-size:0.7rem; margin-bottom:2px;">
            <span style="color:#94a3b8;">🚰 Sem acesso a água segura (ODS 6.1)</span>
            <span style="color:#f59e0b; font-weight:600;">${indicators.pctSemAgua}%</span>
          </div>
          ${bar(parseFloat(indicators.pctSemAgua), '#f59e0b')}
        </div>
        <div>
          <div style="display:flex; justify-content:space-between; font-size:0.7rem; margin-bottom:2px;">
            <span style="color:#94a3b8;">🚽 Sem saneamento básico (ODS 6.2)</span>
            <span style="color:#ef4444; font-weight:600;">${indicators.pctSemSan}%</span>
          </div>
          ${bar(parseFloat(indicators.pctSemSan), '#ef4444')}
        </div>
        <div>
          <div style="display:flex; justify-content:space-between; font-size:0.7rem; margin-bottom:2px;">
            <span style="color:#94a3b8;">💡 Sem eletricidade/solar (ODS 7.1)</span>
            <span style="color:#a78bfa; font-weight:600;">${indicators.pctSemElec}%</span>
          </div>
          ${bar(parseFloat(indicators.pctSemElec), '#a78bfa')}
        </div>
        <div>
          <div style="display:flex; justify-content:space-between; font-size:0.7rem; margin-bottom:2px;">
            <span style="color:#94a3b8;">🏠 Habitação precária: cubata/barraca (ODS 11.1)</span>
            <span style="color:#fb7185; font-weight:600;">${indicators.pctHabPrecaria}%</span>
          </div>
          ${bar(parseFloat(indicators.pctHabPrecaria), '#fb7185')}
        </div>
        <div>
          <div style="display:flex; justify-content:space-between; font-size:0.7rem; margin-bottom:2px;">
            <span style="color:#94a3b8;">👶 População 0-14 anos (crianças)</span>
            <span style="color:#38bdf8; font-weight:600;">${indicators.pctCriancas}%</span>
          </div>
          ${bar(parseFloat(indicators.pctCriancas), '#38bdf8')}
        </div>
      </div>
      ${risk.fiesSeveraPct ? `
        <div style="margin-top:10px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.08);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span style="font-size:0.75rem; color:#38bdf8; font-weight:600;">🌾 Insegurança Alimentar Severa (FIES INE / FAO — ODS 2.1.2)</span>
            <span style="font-size:0.85rem; font-weight:700; color:${risk.fiesSeveraPct > 30 ? '#ef4444' : risk.fiesSeveraPct > 15 ? '#f59e0b' : '#34d399'};">${risk.fiesSeveraPct}%</span>
          </div>
          ${bar(parseFloat(risk.fiesSeveraPct), risk.fiesSeveraPct > 30 ? '#ef4444' : risk.fiesSeveraPct > 15 ? '#f59e0b' : '#34d399')}
        </div>
      ` : ''}

      ${risk.riskMatrix ? (() => {
        const rm = risk.riskMatrix;
        const isEn = state.currentLang === 'en';
        const lObj = riskMatrixDefinitions.likelihood[rm.likelihood] || riskMatrixDefinitions.likelihood[3];
        const iObj = riskMatrixDefinitions.impact[rm.impact] || riskMatrixDefinitions.impact[3];
        const lName = isEn ? lObj.en : lObj.pt;
        const lFreq = isEn ? lObj.freqEn : lObj.freqPt;
        const iName = isEn ? iObj.en : iObj.pt;
        const iDesc = isEn ? iObj.descEn : iObj.descPt;
        const badgeColor = rm.score >= 15 ? '#ef4444' : rm.score >= 8 ? '#f59e0b' : '#10b981';
        const rankLabel = rm.score >= 15 ? (isEn ? 'HIGH RISK' : 'RISCO ALTO') : rm.score >= 8 ? (isEn ? 'MODERATE RISK' : 'RISCO MODERADO') : (isEn ? 'LOW RISK' : 'RISCO BAIXO');

        return `
          <div style="margin-top:12px; padding:10px; background:rgba(15,23,42,0.85); border:1px solid rgba(255,255,255,0.12); border-radius:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <span style="font-size:0.75rem; color:#f8fafc; font-weight:700;">
                <i class="fa-solid fa-table-cells" style="color:#f59e0b;"></i> ${isEn ? 'Drought Risk Matrix (1984–2025)' : 'Matriz de Risco Histórico (1984–2025)'}
              </span>
              <span class="badge" style="background:${badgeColor}; color:#fff; font-size:0.7rem; font-weight:700;">
                ${isEn ? 'Score' : 'Pontuação'}: ${rm.score}/25 — ${rankLabel}
              </span>
            </div>

            <div style="font-size:0.68rem; color:#cbd5e1; margin-bottom:8px; line-height:1.4;">
              <strong style="color:#38bdf8;">${isEn ? 'Formula' : 'Fórmula'}:</strong> <code>${isEn ? 'Likelihood (L) × Impact (I) = Risk Score' : 'Likelihood (L) × Impacto (I) = Score de Risco'}</code>
            </div>

            <!-- Likelihood & Impact Metrics Grid -->
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; margin-bottom:8px;">
              <div style="background:rgba(255,255,255,0.04); padding:6px 8px; border-radius:6px; border:1px solid rgba(56,189,248,0.2);">
                <div style="font-size:0.65rem; color:#94a3b8; text-transform:uppercase; font-weight:600;">
                  ${isEn ? 'Likelihood (L)' : 'Likelihood (Probabilidade)'}
                </div>
                <div style="font-size:0.85rem; font-weight:700; color:#38bdf8;">
                  L = ${rm.likelihood} / 5
                </div>
                <div style="font-size:0.67rem; color:#f8fafc; font-weight:600;">${lName}</div>
                <div style="font-size:0.62rem; color:#94a3b8; line-height:1.2; margin-top:2px;">${lFreq}</div>
                <div style="margin-top:6px; display:flex; flex-direction:column; gap:3px;">
                  <span style="font-size:0.6rem; color:#64748b; font-weight:600; text-transform:uppercase;">Relatórios & Séries Oficiais:</span>
                  <a href="https://reliefweb.int/report/angola/angola-food-security-outlook-update-august-2026-january-2027-crisis-ipc-phase-3-aligned-outcomes-persist-due-delayed-rainy-season" target="_blank" rel="noopener" style="font-size:0.62rem; color:#38bdf8; text-decoration:none; background:rgba(56,189,248,0.1); padding:2px 6px; border-radius:3px; border:1px solid rgba(56,189,248,0.25); display:inline-block;" title="Relatório FEWS NET / ReliefWeb — Atualização de Secas Angola (PDF)">📄 FEWS NET / ReliefWeb — Relatório de Secas 2026-2027 (PDF)</a>
                  <a href="https://fews.net/southern-africa/angola" target="_blank" rel="noopener" style="font-size:0.62rem; color:#38bdf8; text-decoration:none; background:rgba(56,189,248,0.1); padding:2px 6px; border-radius:3px; border:1px solid rgba(56,189,248,0.25); display:inline-block;" title="Base de Dados e Monitorização Contínua de Secas">📊 FEWS NET Angola — Monitor de Dados & Perspetivas</a>
                  <a href="https://www.sadc.int/themes/meteorology-climate/climate-services" target="_blank" rel="noopener" style="font-size:0.62rem; color:#38bdf8; text-decoration:none; background:rgba(56,189,248,0.1); padding:2px 6px; border-radius:3px; border:1px solid rgba(56,189,248,0.25); display:inline-block;" title="Previsões Sazonais SARCOF e Séries de Chuva 1984-2025">🌧️ SADC CSC / SARCOF — Séries Pluviométricas Oficiais</a>
                  <a href="https://www.inamet.gov.ao/" target="_blank" rel="noopener" style="font-size:0.62rem; color:#38bdf8; text-decoration:none; background:rgba(56,189,248,0.1); padding:2px 6px; border-radius:3px; border:1px solid rgba(56,189,248,0.25); display:inline-block;" title="Boletins Climatológicos do Instituto Nacional de Meteorologia de Angola">📡 INAMET Angola — Boletins Climatológicos Oficiais</a>
                </div>
              </div>

              <div style="background:rgba(255,255,255,0.04); padding:6px 8px; border-radius:6px; border:1px solid rgba(245,158,11,0.2);">
                <div style="font-size:0.65rem; color:#94a3b8; text-transform:uppercase; font-weight:600;">
                  ${isEn ? 'Impact (I)' : 'Impacto Agropastoril (I)'}
                </div>
                <div style="font-size:0.85rem; font-weight:700; color:#f59e0b;">
                  I = ${rm.impact} / 5
                </div>
                <div style="font-size:0.67rem; color:#f8fafc; font-weight:600;">${iName}</div>
                <div style="font-size:0.62rem; color:#94a3b8; line-height:1.2; margin-top:2px;">${iDesc}</div>
                <div style="margin-top:6px; display:flex; flex-direction:column; gap:3px;">
                  <span style="font-size:0.6rem; color:#64748b; font-weight:600; text-transform:uppercase;">Relatórios de Danos & Avaliações:</span>
                  <a href="https://www.fao.org/giews/countrybrief/country/AGO" target="_blank" rel="noopener" style="font-size:0.62rem; color:#f59e0b; text-decoration:none; background:rgba(245,158,11,0.1); padding:2px 6px; border-radius:3px; border:1px solid rgba(245,158,11,0.25); display:inline-block;" title="FAO GIEWS — Relatório Técnico de Perdas de Colheitas e Preços em Angola">🌾 FAO GIEWS — Relatório Técnico Angola & Produção Cerealífera</a>
                  <a href="https://vam.wfp.org/CountryPage_overview.aspx?iso3=AGO" target="_blank" rel="noopener" style="font-size:0.62rem; color:#f59e0b; text-decoration:none; background:rgba(245,158,11,0.1); padding:2px 6px; border-radius:3px; border:1px solid rgba(245,158,11,0.25); display:inline-block;" title="Painel Interativo de Dados de Vulnerabilidade e Fome do PAM em Angola">📈 PAM / WFP VAM — Base de Dados & Fome em Angola</a>
                  <a href="https://www.sadc.int/programmes/disaster-risk-reduction" target="_blank" rel="noopener" style="font-size:0.62rem; color:#f59e0b; text-decoration:none; background:rgba(245,158,11,0.1); padding:2px 6px; border-radius:3px; border:1px solid rgba(245,158,11,0.25); display:inline-block;" title="Relatórios de Vulnerabilidade Agropastoril Regional SADC RVAA">📋 SADC RVAA — Síntese de Vulnerabilidade Agropastoril</a>
                  <a href="https://www.ine.gov.ao/Arquivos/arquivosCarregados//Carregados/Publicacao_639070130147582882.pdf" target="_blank" rel="noopener" style="font-size:0.62rem; color:#f59e0b; text-decoration:none; background:rgba(245,158,11,0.1); padding:2px 6px; border-radius:3px; border:1px solid rgba(245,158,11,0.25); display:inline-block;" title="Relatório Oficial FIES INE Angola Fevereiro 2026 (PDF)">📑 INE Angola — Relatório Oficial FIES Fev 2026 (PDF)</a>
                </div>
              </div>
            </div>


            <!-- Mathematical Calculation Result -->
            <div style="background:rgba(0,0,0,0.3); padding:6px 8px; border-radius:6px; font-size:0.68rem; margin-bottom:6px; color:#cbd5e1; border-left:3px solid ${badgeColor};">
              <div><strong>${isEn ? 'Exact Calculation' : 'Cálculo Exato'}:</strong> <code>${rm.likelihood} (Likelihood) × ${rm.impact} (Impacto) = ${rm.score}</code> / 25 (${rankLabel})</div>
              <div style="color:#94a3b8; font-size:0.62rem; margin-top:2px;">
                ${isEn ? 'Historical Record (41 years: 1984–2025): INAMET, SADC SARCOF, FEWS NET & SADC RVAA.' : 'Base Histórica de 41 anos (1984–2025): INAMET, SADC SARCOF, FEWS NET e SADC RVAA.'}
              </div>
            </div>

            <!-- Open Method Modal Button -->
            <button onclick="document.getElementById('fonte-modal').classList.add('active');" style="width:100%; border:none; background:rgba(56,189,248,0.15); border:1px solid rgba(56,189,248,0.35); color:#38bdf8; padding:5px 8px; border-radius:4px; font-size:0.68rem; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
              <i class="fa-solid fa-circle-info"></i> ${isEn ? 'View Full Risk Matrix Methodology & Sources' : 'Ver Metodologia Completa & Escala 5×5 da Matriz'}
            </button>
          </div>
        `;
      })() : ''}
    `;
  }

  document.getElementById('btn-close-inspector').addEventListener('click', () => {
    document.getElementById('inspector-card').classList.remove('active');
  });

  // Função auxiliar para gerar texto de visualização da fórmula personalizada
  function getCustomFormulaEquationText() {
    const cf = state.customFormula || {};
    const w = cf.weights || { v_clima: 50, fies_severa: 30, sem_agua: 20 };
    const parts = [];
    if (w.v_clima) parts.push(`${(w.v_clima/100).toFixed(2)}×V_clima`);
    if (w.fies_severa) parts.push(`${(w.fies_severa/100).toFixed(2)}×%FIES`);
    if (w.sem_agua) parts.push(`${(w.sem_agua/100).toFixed(2)}×%SemÁgua`);
    if (w.sem_san) parts.push(`${(w.sem_san/100).toFixed(2)}×%SemSan`);
    if (w.sem_elec) parts.push(`${(w.sem_elec/100).toFixed(2)}×%SemElec`);
    if (w.hab_precaria) parts.push(`${(w.hab_precaria/100).toFixed(2)}×%HabPrec`);
    if (w.criancas_014) parts.push(`${(w.criancas_014/100).toFixed(2)}×%Crianças`);
    if (w.risk_score) parts.push(`${(w.risk_score/100).toFixed(2)}×RiskMat`);
    return `P_afetada = Pop × (${parts.length ? parts.join(' + ') : 'pesos'})`;
  }

  // Atualizar a Descrição da Fórmula no Painel
  function updateFormulaUI() {
    const model = state.formulaModel;
    const formulas = state.formulasData ? state.formulasData.formulas : null;
    if (!formulas || !formulas[model]) return;

    const f = formulas[model];
    const hdrBadge = document.getElementById('hdr-formula-name');
    if (hdrBadge) {
      hdrBadge.textContent = model === 'IPC_FIES_INE' ? 'FIES INE / IPC (ODS 2.1.2)' :
                             model === 'UNDRR_IPCC' ? 'UNDRR / IPCC' :
                             model === 'IPC_FEWSNET' ? 'IPC / FEWS NET' :
                             model === 'CUSTOM' ? 'Personalizada / Custom' :
                             'PAM / FAO / SADC';
    }

    const titleEl = document.getElementById('formula-org-title');
    const eqEl = document.getElementById('formula-equation-code');
    const descEl = document.getElementById('formula-summary-text');
    const linkEl = document.getElementById('formula-official-link');

    if (model === 'CUSTOM') {
      if (titleEl) titleEl.textContent = state.customFormula.name || f.nome;
      if (eqEl) eqEl.textContent = getCustomFormulaEquationText();
      if (descEl) descEl.textContent = f.descricao;
    } else {
      if (titleEl) titleEl.textContent = f.nome;
      if (eqEl) eqEl.textContent = f.formula_simplificada;
      if (descEl) descEl.textContent = f.descricao;
    }

    // Ocultar link único legado e renderizar container multi-links oficiais
    if (linkEl) linkEl.style.display = 'none';

    const extraLinksContainerId = 'formula-extra-links';
    let extraLinksEl = document.getElementById(extraLinksContainerId);
    if (!extraLinksEl) {
      extraLinksEl = document.createElement('div');
      extraLinksEl.id = extraLinksContainerId;
      extraLinksEl.style.cssText = 'margin-top:8px; display:flex; flex-direction:column; gap:6px;';
      if (linkEl && linkEl.parentNode) linkEl.parentNode.insertBefore(extraLinksEl, linkEl.nextSibling);
    }

    // Obter todos os links oficiais da fórmula selecionada
    const allLinks = [];
    if (model === 'CUSTOM' && state.customFormula?.officialUrl) {
      allLinks.push({
        nome: state.customFormula.officialOrg || 'Fonte / Metodologia Personalizada',
        url: state.customFormula.officialUrl
      });
    }
    if (f.links_oficiais && Array.isArray(f.links_oficiais)) {
      f.links_oficiais.forEach(lk => allLinks.push(lk));
    }

    let linksHtml = '';
    allLinks.forEach(lk => {
      linksHtml += `
        <a href="${lk.url}" target="_blank" rel="noopener" class="formula-link-btn" style="font-size:0.7rem; padding:4px 8px; display:inline-flex; align-items:center; gap:6px; background:rgba(56,189,248,0.08); border:1px solid rgba(56,189,248,0.25); border-radius:4px; color:#38bdf8; text-decoration:none; transition:all 0.2s;">
          <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:0.65rem;"></i> ${lk.nome}
        </a>`;
    });

    extraLinksEl.innerHTML = linksHtml;

    const activeTitle = document.getElementById('lbl-active-formula-title');
    if (activeTitle) activeTitle.textContent = model === 'CUSTOM' ? (state.customFormula.name || f.nome) : f.nome;

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
        const liveData = getCensusLivelihoodIndicators(demo.censoDetails);
        const waterPct = liveData ? `<span style="color:${parseFloat(liveData.pctSemAgua) > 60 ? '#ef4444' : parseFloat(liveData.pctSemAgua) > 40 ? '#f59e0b' : '#34d399'}; font-weight:700;">${liveData.pctSemAgua}%</span>` : '<span style="color:#64748b;">-</span>';

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
          <td>${waterPct} <span style="font-size:0.65rem; color:#64748b;">Água</span></td>
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
        const provLive = getCensusLivelihoodIndicators(provObj.censo2024);
        const provWater = provLive ? `<span style="color:${parseFloat(provLive.pctSemAgua) > 60 ? '#ef4444' : parseFloat(provLive.pctSemAgua) > 40 ? '#f59e0b' : '#34d399'}; font-weight:700;">${provLive.pctSemAgua}%</span>` : '<span style="color:#64748b;">-</span>';

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
            <td>${provWater} <span style="font-size:0.65rem; color:#64748b;" title="Carência de Água Provincial Censo 2024 (ODS 6.1)">Prov.</span></td>
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
      'Sem Água ODS 6.1 (%)', '% FIES Severa (ODS 2.1.2)', 'Risk Score', 'Risk Rank', 'Ano Base', 'Modelo'
    ].join(';'));

    if (state.tableMode === 'prov') {
      Object.keys(state.ineData.provincias).forEach(pname => {
        const demo = getOfficialDemographics('provincias', { properties: { Nome_Prov: pname } });
        const code = getSarcofForAngolaFeature({ properties: { Nome_Prov: pname } }, 'provincias', state.activeSeason);
        const calc = calculateOfficialFormula(demo, code);
        const live = getCensusLivelihoodIndicators(demo.censoDetails);
        const waterVal = live ? `${live.pctSemAgua}%` : '-';
        const rMat = demo.riskMatrix || { score: 9, rank: 'Moderado' };
        rows.push([
          `"${pname}"`, '"Angola"', demo.areaKm2 || '', demo.density || '', demo.total, demo.urban, demo.rural, `"${calc.cfg.name}"`, calc.affectedPop, calc.affectedFamilies, `"${waterVal}"`, demo.fiesSeveraPct || '', rMat.score, `"${rMat.rank}"`, state.demographicYear, `"${state.formulaModel}"`
        ].join(';'));
      });
    } else {
      Object.keys(state.ineData.municipios).forEach(pname => {
        const muns = state.ineData.municipios[pname] || {};
        const provObj = state.ineData.provincias[pname] || {};
        const provLive = getCensusLivelihoodIndicators(provObj.censo2024);
        const waterVal = provLive ? `${provLive.pctSemAgua}% (Prov)` : '-';
        Object.keys(muns).forEach(mname => {
          const demo = getOfficialDemographics('municipios', { properties: { Nome_Prov: pname, Nome_Munic: mname } });
          const code = getSarcofForAngolaFeature({ properties: { Nome_Prov: pname, Nome_Munic: mname } }, 'municipios', state.activeSeason);
          const calc = calculateOfficialFormula(demo, code);
          const rMat = demo.riskMatrix || { score: 9, rank: 'Moderado' };
          rows.push([
            `"${mname}"`, `"${pname}"`, demo.areaKm2 || '', demo.density || '', demo.total, demo.urban, demo.rural, `"${calc.cfg.name}"`, calc.affectedPop, calc.affectedFamilies, `"${waterVal}"`, demo.fiesSeveraPct || '', rMat.score, `"${rMat.rank}"`, state.demographicYear, `"${state.formulaModel}"`
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

  // Construtor e Modal de Fórmula Personalizada
  function setupCustomFormulaBuilder() {
    const modal = document.getElementById('modal-custom-formula');
    const btnOpen = document.getElementById('btn-open-custom-formula');
    const btnClose = document.getElementById('btn-close-custom-formula');
    const btnApply = document.getElementById('btn-apply-custom-formula');
    const btnReset = document.getElementById('btn-reset-custom-formula');
    const nameInput = document.getElementById('custom-formula-name');
    const linkInput = document.getElementById('custom-formula-link');
    const previewEl = document.getElementById('custom-formula-equation-preview');
    const totalEl = document.getElementById('custom-weights-total');

    const variables = [
      'v_clima', 'fies_severa', 'sem_agua', 'sem_san',
      'sem_elec', 'hab_precaria', 'criancas_014', 'risk_score'
    ];

    function updateBuilderPreview() {
      const w = {};
      let sum = 0;
      variables.forEach(v => {
        const slider = document.getElementById(`slider-weight-${v}`);
        const val = slider ? parseInt(slider.value, 10) : 0;
        w[v] = val;
        sum += val;
        const lbl = document.getElementById(`lbl-weight-${v}`);
        if (lbl) lbl.textContent = `${val}%`;
      });

      if (totalEl) {
        totalEl.textContent = `Total: ${sum}%`;
        totalEl.style.background = sum === 100 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)';
        totalEl.style.color = sum === 100 ? '#34d399' : '#f87171';
      }

      const parts = [];
      if (w.v_clima) parts.push(`${(w.v_clima/100).toFixed(2)} × V_clima`);
      if (w.fies_severa) parts.push(`${(w.fies_severa/100).toFixed(2)} × %FIES`);
      if (w.sem_agua) parts.push(`${(w.sem_agua/100).toFixed(2)} × %SemÁgua`);
      if (w.sem_san) parts.push(`${(w.sem_san/100).toFixed(2)} × %SemSan`);
      if (w.sem_elec) parts.push(`${(w.sem_elec/100).toFixed(2)} × %SemElec`);
      if (w.hab_precaria) parts.push(`${(w.hab_precaria/100).toFixed(2)} × %HabPrec`);
      if (w.criancas_014) parts.push(`${(w.criancas_014/100).toFixed(2)} × %Crianças`);
      if (w.risk_score) parts.push(`${(w.risk_score/100).toFixed(2)} × RiskMat`);

      if (previewEl) {
        const expr = parts.length ? parts.join(' + ') : '0';
        previewEl.textContent = `P_afetada = Pop_Oficial × (${expr})`;
      }
    }

    function syncStateToInputs() {
      const cf = state.customFormula || {};
      if (nameInput) nameInput.value = cf.name || 'Fórmula Personalizada';
      if (linkInput) linkInput.value = cf.officialUrl || 'https://censo2024.ine.gov.ao/';
      const w = cf.weights || { v_clima: 50, fies_severa: 30, sem_agua: 20 };
      variables.forEach(v => {
        const slider = document.getElementById(`slider-weight-${v}`);
        if (slider) slider.value = w[v] != null ? w[v] : 0;
      });
      updateBuilderPreview();
    }

    variables.forEach(v => {
      const slider = document.getElementById(`slider-weight-${v}`);
      if (slider) slider.addEventListener('input', updateBuilderPreview);
    });

    if (btnOpen && modal) {
      btnOpen.addEventListener('click', () => {
        syncStateToInputs();
        modal.classList.add('active');
      });
    }

    if (btnClose && modal) {
      btnClose.addEventListener('click', () => {
        modal.classList.remove('active');
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        const defaults = { v_clima: 50, fies_severa: 30, sem_agua: 20 };
        variables.forEach(v => {
          const slider = document.getElementById(`slider-weight-${v}`);
          if (slider) slider.value = defaults[v] || 0;
        });
        if (nameInput) nameInput.value = 'Fórmula Personalizada';
        if (linkInput) linkInput.value = 'https://censo2024.ine.gov.ao/';
        updateBuilderPreview();
      });
    }

    if (btnApply && modal) {
      btnApply.addEventListener('click', () => {
        const w = {};
        variables.forEach(v => {
          const slider = document.getElementById(`slider-weight-${v}`);
          w[v] = slider ? parseInt(slider.value, 10) : 0;
        });
        state.customFormula = {
          name: (nameInput && nameInput.value.trim()) || 'Fórmula Personalizada',
          officialUrl: (linkInput && linkInput.value.trim()) || 'https://censo2024.ine.gov.ao/',
          officialOrg: 'Utilizador / Parâmetros Customizados',
          weights: w
        };
        localStorage.setItem('elnino_custom_formula', JSON.stringify(state.customFormula));

        state.formulaModel = 'CUSTOM';
        const formulaSelect = document.getElementById('select-formula-model');
        if (formulaSelect) formulaSelect.value = 'CUSTOM';

        modal.classList.remove('active');
        updateFormulaUI();
      });
    }

    syncStateToInputs();
  }

  // Eventos do Seletor de Modelo de Fórmula
  const formulaSelect = document.getElementById('select-formula-model');
  if (formulaSelect) {
    formulaSelect.addEventListener('change', (e) => {
      state.formulaModel = e.target.value;
      if (e.target.value === 'CUSTOM') {
        const modal = document.getElementById('modal-custom-formula');
        if (modal) modal.classList.add('active');
      }
      updateFormulaUI();
    });
  }

  setupCustomFormulaBuilder();

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

    // Gráfico de Insegurança Alimentar Severa FIES (ODS 2.1.2) por Província (INE / FAO Fevereiro 2026)
    const ivcCanvas = document.getElementById('chart-vulnerability-ivc');
    if (ivcCanvas) {
      const fiesRows = provNames.map(p => {
        const val = provs[p].fies_severa_pct != null ? parseFloat(provs[p].fies_severa_pct.toFixed(1)) : 15.0;
        return { name: p, val };
      }).sort((a, b) => b.val - a.val);

      state.charts.ivc = new Chart(ivcCanvas, {
        type: 'bar',
        data: {
          labels: fiesRows.map(d => d.name),
          datasets: [{
            label: state.currentLang === 'en' ? 'Severe FIES (%) — INE / FAO (SDG 2.1.2)' : 'FIES Severa (%) — INE / FAO (ODS 2.1.2)',
            data: fiesRows.map(d => d.val),
            backgroundColor: fiesRows.map(d =>
              d.val > 30 ? 'rgba(239,68,68,0.85)' :
              d.val > 15 ? 'rgba(245,158,11,0.85)' :
              d.val > 10 ? 'rgba(6,182,212,0.85)' : 'rgba(16,185,129,0.85)'
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
              title: { display: true, text: '% Insegurança Alimentar Severa (ODS 2.1.2)', color: '#64748b', font: { size: 9 } },
              max: 60
            },
            y: { ticks: { color: '#94a3b8', font: { size: 9 } }, grid: { display: false } }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => ` FIES Severa: ${ctx.raw}% — ${ctx.raw > 30 ? 'Crítica/Emergência' : ctx.raw > 15 ? 'Severa' : 'Moderada'} (INE/FAO ODS 2.1.2)`
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

  // Sistema de Monitorização de Utilizadores Online em Tempo Real (BroadcastChannel + SSE + REST Vercel + Cross-Tab)
  function initOnlineUsersTracker() {
    let currentOnlineVal = 1;

    // Gerar ou recuperar ID de sessão único para este separador/dispositivo
    let sessionId = sessionStorage.getItem('elnino_session_id');
    if (!sessionId) {
      sessionId = 'sess_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now();
      sessionStorage.setItem('elnino_session_id', sessionId);
    }

    function updateCounterDisplay(num) {
      if (typeof num === 'number' && !isNaN(num)) {
        currentOnlineVal = Math.max(1, num);
      }
      const countEl = document.getElementById('online-users-count');
      if (countEl) {
        const valStr = String(currentOnlineVal);
        if (countEl.textContent !== valStr) {
          countEl.style.transition = 'transform 0.15s ease, opacity 0.15s ease';
          countEl.style.transform = 'scale(1.25)';
          setTimeout(() => {
            countEl.textContent = valStr;
            countEl.style.transform = 'scale(1)';
          }, 150);
        } else {
          countEl.textContent = valStr;
        }
      }
    }

    window._refreshOnlineCountDisplay = () => {
      updateCounterDisplay(currentOnlineVal);
    };

    // 1. Cross-Tab & Cross-Window Instant Synchronization via BroadcastChannel & localStorage
    const TAB_KEY = 'elnino_active_tabs';
    function registerTabPresence() {
      try {
        let tabs = JSON.parse(localStorage.getItem(TAB_KEY) || '{}');
        const now = Date.now();
        tabs[sessionId] = now;
        // Limpar abas mortas há mais de 35 segundos
        for (const [id, ts] of Object.entries(tabs)) {
          if (now - ts > 35000) delete tabs[id];
        }
        localStorage.setItem(TAB_KEY, JSON.stringify(tabs));
        const localActiveCount = Object.keys(tabs).length;
        if (localActiveCount > currentOnlineVal) {
          updateCounterDisplay(localActiveCount);
        }
      } catch (e) {}
    }

    function removeTabPresence() {
      try {
        let tabs = JSON.parse(localStorage.getItem(TAB_KEY) || '{}');
        delete tabs[sessionId];
        localStorage.setItem(TAB_KEY, JSON.stringify(tabs));
      } catch (e) {}
    }

    if (window.BroadcastChannel) {
      try {
        const bc = new BroadcastChannel('elnino_online_channel');
        bc.onmessage = (ev) => {
          if (ev.data && typeof ev.data.count === 'number') {
            updateCounterDisplay(ev.data.count);
          } else if (ev.data && ev.data.action === 'ping') {
            registerTabPresence();
            let tabs = JSON.parse(localStorage.getItem(TAB_KEY) || '{}');
            bc.postMessage({ count: Math.max(1, Object.keys(tabs).length) });
          }
        };
        bc.postMessage({ action: 'ping' });
      } catch (e) {}
    }

    registerTabPresence();
    setInterval(registerTabPresence, 10000);

    // 2. Canal em Tempo Real com Server-Sent Events (SSE): latência zero quando suportado
    let eventSource = null;
    function connectSSE() {
      try {
        if (window.EventSource) {
          eventSource = new EventSource('/api/online/stream');
          eventSource.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data && typeof data.onlineCount === 'number') {
                updateCounterDisplay(data.onlineCount);
              }
            } catch (err) {}
          };
          eventSource.onerror = () => {
            if (eventSource) {
              eventSource.close();
              eventSource = null;
            }
            // Tentar novamente após 15 segundos se falhar
            setTimeout(connectSSE, 15000);
          };
        }
      } catch (e) {}
    }

    // 3. Notificação Instantânea de Desconexão (quando o utilizador fecha a aba ou o navegador)
    function notifyLeave() {
      removeTabPresence();
      try {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        const leaveUrl = `/api/online?action=leave&sessionId=${encodeURIComponent(sessionId)}`;
        if (navigator.sendBeacon) {
          navigator.sendBeacon(leaveUrl, '');
        } else {
          fetch(leaveUrl, { method: 'POST', keepalive: true }).catch(() => {});
        }
      } catch (err) {}
    }

    window.addEventListener('beforeunload', notifyLeave);
    window.addEventListener('pagehide', notifyLeave);

    // 4. Heartbeat REST para servidor Vercel Serverless / Node Server
    async function sendHeartbeat() {
      registerTabPresence();
      try {
        const resp = await fetch(`/api/online?sessionId=${encodeURIComponent(sessionId)}`, {
          method: 'GET',
          headers: { 'X-Session-Id': sessionId }
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data && typeof data.onlineCount === 'number') {
            updateCounterDisplay(data.onlineCount);
            return;
          }
        }
      } catch (err) {}

      // Fallback local se estiver offline ou em rede isolada
      try {
        let tabs = JSON.parse(localStorage.getItem(TAB_KEY) || '{}');
        updateCounterDisplay(Math.max(1, Object.keys(tabs).length));
      } catch (e) {
        updateCounterDisplay(1);
      }
    }

    // Iniciar fluxos imediatamente
    connectSSE();
    sendHeartbeat();

    // Heartbeat regular a cada 10 segundos
    setInterval(sendHeartbeat, 10000);
  }

  // =========================================================================
  // SISTEMA AVANÇADO DE EXPORTAÇÃO DA POPULAÇÃO EM EXCEL (.xlsx / .csv)
  // Permite selecionar províncias, municípios e aplicar filtros múltiplos
  // =========================================================================
  function initExcelExportSystem() {
    const modal = document.getElementById('modal-export-excel');
    const btnOpenHeader = document.getElementById('btn-open-export-modal');
    const btnOpenCenso = document.getElementById('btn-open-export-modal-from-censo');
    const btnClose = document.getElementById('btn-close-export-modal');

    if (!modal) return;

    // Estado do exportador
    const expState = {
      selectedProvs: new Set(),
      selectedMuns: new Set(), // Formato: "NomeProv::NomeMun"
      mode: 'prov_and_mun',    // 'prov_only' ou 'prov_and_mun'
      selectedYears: new Set(['2026']), // Anos selecionados: '2024', '2025', '2026', '2027'
      risk: 'ALL',             // 'ALL', 'HIGH_CRITICAL', 'MODERATE_HIGH', 'LOW'
      fies: 'ALL',             // 'ALL', 'HIGH', 'MEDIUM'
      searchProv: '',
      searchMun: '',
      cols: {
        popTotal: true,
        urbanRural: true,
        gender: true,
        areaDensity: true,
        affected: true,
        sarcof: true,
        risk: true,
        fies: true,
        water: true,
        source: true
      }
    };

    // Elementos DOM
    const provListEl = document.getElementById('export-prov-list');
    const munListEl = document.getElementById('export-mun-list');
    const munContainerEl = document.getElementById('export-mun-container');
    const munCountEl = document.getElementById('export-mun-count');
    const searchProvInput = document.getElementById('export-search-prov');
    const searchMunInput = document.getElementById('export-search-mun');
    const modeProvRadio = document.getElementById('export-mode-prov');
    const modeBothRadio = document.getElementById('export-mode-both');
    const lblModeProv = document.getElementById('lbl-mode-prov');
    const lblModeBoth = document.getElementById('lbl-mode-both');
    const selectRisk = document.getElementById('export-select-risk');
    const selectFies = document.getElementById('export-select-fies');

    // Stats elements
    const statProvCountEl = document.getElementById('export-stat-prov-count');
    const statMunCountEl = document.getElementById('export-stat-mun-count');
    const statTotalPopEl = document.getElementById('export-stat-total-pop');
    const statRecordsCountEl = document.getElementById('export-stat-records-count');

    // Botões de ação
    const btnExportExcel = document.getElementById('btn-do-export-excel');
    const btnExportCsv = document.getElementById('btn-do-export-csv');

    // 1. Inicializar seleções padrão
    function resetDefaultSelections() {
      if (!state.ineData) return;
      const provNames = Object.keys(state.ineData.provincias);
      
      // Se não houver nada selecionado, seleciona todas por padrão
      if (expState.selectedProvs.size === 0) {
        if (state.selectedFeature) {
          const rawProv = state.selectedFeature.properties.Nome_Prov || state.selectedFeature.properties.PROVINCIA || '';
          const norm = normalizeProvName(rawProv);
          if (norm && state.ineData.provincias[norm]) {
            expState.selectedProvs.add(norm);
          }
        }
        if (expState.selectedProvs.size === 0) {
          provNames.forEach(p => expState.selectedProvs.add(p));
        }
      }

      // Adicionar todos os municípios das províncias selecionadas
      expState.selectedMuns.clear();
      expState.selectedProvs.forEach(p => {
        const muns = state.ineData.municipios[p] || {};
        Object.keys(muns).forEach(m => expState.selectedMuns.add(`${p}::${m}`));
      });

      renderProvincesList();
      renderMunicipalitiesList();
      updateSummaryStats();
    }

    // 2. Renderizar Lista de Províncias
    function renderProvincesList() {
      if (!provListEl || !state.ineData) return;
      provListEl.innerHTML = '';
      const provNames = Object.keys(state.ineData.provincias).sort();
      const q = expState.searchProv.toLowerCase().trim();

      provNames.forEach(pname => {
        if (q && !pname.toLowerCase().includes(q)) return;

        const muns = state.ineData.municipios[pname] || {};
        const munCount = Object.keys(muns).length;
        const isChecked = expState.selectedProvs.has(pname);

        const item = document.createElement('label');
        item.className = `export-check-item ${isChecked ? 'selected' : ''}`;
        item.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" data-prov="${pname}" ${isChecked ? 'checked' : ''} style="cursor: pointer;">
            <span>${pname}</span>
          </div>
          <span style="font-size: 0.68rem; color: #94a3b8; background: rgba(255,255,255,0.05); padding: 1px 6px; border-radius: 10px;">
            ${munCount} mun
          </span>
        `;

        const chk = item.querySelector('input[type="checkbox"]');
        chk.addEventListener('change', (e) => {
          if (e.target.checked) {
            expState.selectedProvs.add(pname);
            item.classList.add('selected');
            // Marca os municípios dessa província
            const munMap = state.ineData.municipios[pname] || {};
            Object.keys(munMap).forEach(m => expState.selectedMuns.add(`${pname}::${m}`));
          } else {
            expState.selectedProvs.delete(pname);
            item.classList.remove('selected');
            // Desmarca os municípios dessa província
            const munMap = state.ineData.municipios[pname] || {};
            Object.keys(munMap).forEach(m => expState.selectedMuns.delete(`${pname}::${m}`));
          }
          renderMunicipalitiesList();
          updateSummaryStats();
        });

        provListEl.appendChild(item);
      });
    }

    // 3. Renderizar Lista de Municípios
    function renderMunicipalitiesList() {
      if (!munListEl || !state.ineData) return;
      munListEl.innerHTML = '';
      const q = expState.searchMun.toLowerCase().trim();

      let totalAvailableMuns = 0;
      const activeProvs = Array.from(expState.selectedProvs).sort();

      if (activeProvs.length === 0) {
        munListEl.innerHTML = `
          <div style="color: #64748b; font-size: 0.75rem; text-align: center; padding: 20px 10px;">
            <i class="fa-solid fa-arrow-left" style="margin-right: 4px;"></i>
            Selecione uma província para ver os seus municípios.
          </div>
        `;
        if (munCountEl) munCountEl.textContent = '0';
        return;
      }

      activeProvs.forEach(pname => {
        const muns = state.ineData.municipios[pname] || {};
        const munNames = Object.keys(muns).sort();
        totalAvailableMuns += munNames.length;

        const matchingMuns = munNames.filter(m => {
          if (!q) return true;
          return m.toLowerCase().includes(q) || pname.toLowerCase().includes(q);
        });

        if (matchingMuns.length > 0) {
          if (activeProvs.length > 1) {
            const groupHdr = document.createElement('div');
            groupHdr.style.cssText = 'font-size: 0.68rem; font-weight: 700; color: #38bdf8; text-transform: uppercase; padding: 4px 6px 2px 6px; margin-top: 4px; border-bottom: 1px dashed rgba(255,255,255,0.08);';
            groupHdr.textContent = pname;
            munListEl.appendChild(groupHdr);
          }

          matchingMuns.forEach(mname => {
            const fullKey = `${pname}::${mname}`;
            const isChecked = expState.selectedMuns.has(fullKey);

            const item = document.createElement('label');
            item.className = `export-check-item ${isChecked ? 'selected' : ''}`;
            item.innerHTML = `
              <div style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" data-mun-key="${fullKey}" ${isChecked ? 'checked' : ''} style="cursor: pointer;">
                <span>${mname}</span>
              </div>
              <span style="font-size: 0.65rem; color: #64748b;">${pname}</span>
            `;

            const chk = item.querySelector('input[type="checkbox"]');
            chk.addEventListener('change', (e) => {
              if (e.target.checked) {
                expState.selectedMuns.add(fullKey);
                item.classList.add('selected');
              } else {
                expState.selectedMuns.delete(fullKey);
                item.classList.remove('selected');
              }
              updateSummaryStats();
            });

            munListEl.appendChild(item);
          });
        }
      });

      if (munCountEl) munCountEl.textContent = `${expState.selectedMuns.size} / ${totalAvailableMuns}`;
    }

    // 4. Testar Filtros Adicionais (Risco e FIES)
    function passesFilters(type, obj) {
      if (!obj) return false;

      // Filtro de Risco
      if (expState.risk !== 'ALL') {
        const rScore = obj.risk_matrix?.score ?? 9;
        if (expState.risk === 'HIGH_CRITICAL' && rScore < 15) return false;
        if (expState.risk === 'MODERATE_HIGH' && rScore < 8) return false;
        if (expState.risk === 'LOW' && rScore >= 8) return false;
      }

      // Filtro de FIES Severa
      if (expState.fies !== 'ALL') {
        const fies = obj.fies_severa_pct ?? 15.0;
        if (expState.fies === 'HIGH' && fies <= 30) return false;
        if (expState.fies === 'MEDIUM' && fies <= 15) return false;
      }

      return true;
    }

    // 5. Atualizar Resumo em Tempo Real
    function updateSummaryStats() {
      if (!state.ineData) return;
      const years = Array.from(expState.selectedYears).sort();
      const primaryYear = years[years.length - 1] || '2026';
      const numFmt = state.currentLang === 'en' ? 'en-US' : 'pt-PT';
      const popUnit = state.currentLang === 'en' ? 'pop' : 'hab';

      let totalProvsSelected = expState.selectedProvs.size;
      let totalMunsSelected = expState.selectedMuns.size;
      let totalPopCovered = 0;
      let recordsCount = 0;

      if (expState.mode === 'prov_only') {
        expState.selectedProvs.forEach(pname => {
          const provObj = state.ineData.provincias[pname];
          if (!provObj) return;
          if (!passesFilters('prov', provObj)) return;

          let pTotal = 0;
          if (primaryYear === '2024') {
            pTotal = provObj.censo2024?.pop_total || 0;
          } else {
            pTotal = provObj.projeccoes?.[primaryYear]?.total || provObj.censo2024?.pop_total || 0;
          }
          totalPopCovered += pTotal;
          recordsCount++;
        });
      } else {
        // Modo com municípios
        if (totalMunsSelected > 0) {
          expState.selectedMuns.forEach(fullKey => {
            const [pname, mname] = fullKey.split('::');
            const munObj = state.ineData.municipios[pname]?.[mname];
            if (!munObj) return;
            if (!passesFilters('mun', munObj)) return;

            let mTotal = 0;
            if (primaryYear === '2024') {
              const provObj = state.ineData.provincias[pname];
              const popProv2024 = provObj?.censo2024?.pop_total || 1;
              const popProv2025 = provObj?.projeccoes?.['2025']?.total || 1;
              const ratio = popProv2024 / (popProv2025 || 1);
              mTotal = Math.round((munObj['2025']?.total || 0) * ratio);
            } else {
              mTotal = munObj[primaryYear]?.total || munObj['2025']?.total || 0;
            }
            totalPopCovered += mTotal;
            recordsCount++;
          });
          // Soma registros das províncias
          recordsCount += totalProvsSelected;
        } else {
          // Fallback para provincial
          expState.selectedProvs.forEach(pname => {
            const provObj = state.ineData.provincias[pname];
            if (!provObj) return;
            if (!passesFilters('prov', provObj)) return;
            totalPopCovered += primaryYear === '2024' ? (provObj.censo2024?.pop_total || 0) : (provObj.projeccoes?.[primaryYear]?.total || 0);
            recordsCount++;
          });
        }
      }

      const yearsLabel = years.length > 1 ? ` (${years.join(', ')})` : ` (${primaryYear})`;
      if (statProvCountEl) statProvCountEl.textContent = `${totalProvsSelected} / 21`;
      if (statMunCountEl) statMunCountEl.textContent = `${totalMunsSelected} / 326`;
      if (statTotalPopEl) statTotalPopEl.textContent = `${totalPopCovered.toLocaleString(numFmt)} ${popUnit}${yearsLabel}`;
      if (statRecordsCountEl) statRecordsCountEl.textContent = `${recordsCount} ${state.currentLang === 'en' ? 'records' : 'registos'}`;
    }

    // 6. Construir Matriz de Linhas para Exportação com Suporte a Múltiplos Anos
    function buildExportDataset() {
      const years = Array.from(expState.selectedYears).sort();
      if (years.length === 0) years.push('2026');
      const season = state.activeSeason || 'OND';

      // Montar Cabeçalhos baseados nos anos e colunas ativas
      const headers = ['Unidade Administrativa', 'Província', 'Nível Administrativo'];

      years.forEach(yr => {
        const yrSuffix = years.length > 1 ? ` (${yr})` : ` (${yr})`;
        if (expState.cols.popTotal) headers.push(`População Total${yrSuffix}`);
        if (expState.cols.urbanRural) headers.push(`Urbana${yrSuffix}`, `Rural${yrSuffix}`);
        if (expState.cols.gender) headers.push(`Homens${yrSuffix}`, `Mulheres${yrSuffix}`);
      });

      if (expState.cols.areaDensity) headers.push('Área DPA (km²)', 'Densidade (hab/km²)');
      if (expState.cols.sarcof) headers.push(`Classificação SARCOF (${season})`);
      if (expState.cols.affected) headers.push('Pessoas Afetadas Estimadas', 'Famílias Afetadas (5,2/fam)');
      if (expState.cols.water) headers.push('Carência Água ODS 6.1 (%)');
      if (expState.cols.fies) headers.push('% FIES Severa (ODS 2.1.2)');
      if (expState.cols.risk) headers.push('Score de Risco (1-25)', 'Rank de Risco');
      if (expState.cols.source) headers.push('Fonte Oficial', 'Anos Selecionados');

      const provRows = [];
      const munRows = [];
      const combinedRows = [];

      // A) Linhas de Províncias
      expState.selectedProvs.forEach(pname => {
        const provObj = state.ineData.provincias[pname];
        if (!provObj) return;
        if (!passesFilters('prov', provObj)) return;

        const demo = getOfficialDemographics('provincias', { properties: { Nome_Prov: pname } });
        const code = getSarcofForAngolaFeature({ properties: { Nome_Prov: pname } }, 'provincias', season);
        const calc = calculateOfficialFormula(demo, code);
        const live = getCensusLivelihoodIndicators(demo.censoDetails);
        const waterVal = live ? `${live.pctSemAgua}%` : '-';
        const rMat = demo.riskMatrix || { score: 9, rank: 'Moderado' };

        const row = [pname, 'Angola', 'Província'];

        // Inserir dados de cada ano selecionado
        years.forEach(yr => {
          let pTot = 0, pUrb = 0, pRur = 0, pHom = 0, pMul = 0;
          if (yr === '2024') {
            const c = provObj.censo2024 || {};
            pTot = c.pop_total || 0;
            pUrb = c.pop_urbana || 0;
            pRur = c.pop_rural || 0;
            pHom = c.pop_homens || 0;
            pMul = c.pop_mulheres || 0;
          } else {
            const proj = (provObj.projeccoes && provObj.projeccoes[yr]) ? provObj.projeccoes[yr] : {};
            pTot = proj.total || 0;
            pUrb = proj.urbana || 0;
            pRur = proj.rural || 0;
            pHom = proj.homens || 0;
            pMul = proj.mulheres || 0;
          }

          if (expState.cols.popTotal) row.push(pTot);
          if (expState.cols.urbanRural) row.push(pUrb, pRur);
          if (expState.cols.gender) row.push(pHom, pMul);
        });

        if (expState.cols.areaDensity) row.push(demo.areaKm2 ? Number(demo.areaKm2.toFixed(1)) : '', demo.density ? Number(demo.density.toFixed(1)) : '');
        if (expState.cols.sarcof) row.push(calc.cfg.name);
        if (expState.cols.affected) row.push(calc.affectedPop, calc.affectedFamilies);
        if (expState.cols.water) row.push(waterVal);
        if (expState.cols.fies) row.push(demo.fiesSeveraPct ? Number(demo.fiesSeveraPct.toFixed(1)) : '');
        if (expState.cols.risk) row.push(rMat.score, rMat.rank);
        if (expState.cols.source) row.push('INE Angola - Censo & Estimativas Oficiais', years.join(', '));

        provRows.push(row);
        combinedRows.push(row);
      });

      // B) Linhas de Municípios
      if (expState.mode === 'prov_and_mun') {
        expState.selectedMuns.forEach(fullKey => {
          const [pname, mname] = fullKey.split('::');
          const munObj = state.ineData.municipios[pname]?.[mname];
          if (!munObj) return;
          if (!passesFilters('mun', munObj)) return;

          const demo = getOfficialDemographics('municipios', { properties: { Nome_Prov: pname, Nome_Munic: mname } });
          const code = getSarcofForAngolaFeature({ properties: { Nome_Prov: pname, Nome_Munic: mname } }, 'municipios', season);
          const calc = calculateOfficialFormula(demo, code);
          const provObj = state.ineData.provincias[pname] || {};
          const provLive = getCensusLivelihoodIndicators(provObj.censo2024);
          const waterVal = provLive ? `${provLive.pctSemAgua}% (Prov.)` : '-';
          const rMat = demo.riskMatrix || { score: 9, rank: 'Moderado' };

          const row = [mname, pname, 'Município'];

          // Inserir dados de cada ano selecionado
          years.forEach(yr => {
            let mTot = 0, mUrb = 0, mRur = 0, mHom = 0, mMul = 0;
            if (yr === '2024') {
              const popProv2024 = provObj?.censo2024?.pop_total || 1;
              const popProv2025 = provObj?.projeccoes?.['2025']?.total || 1;
              const ratio = popProv2024 / (popProv2025 || 1);
              const p25 = munObj['2025'] || {};
              mTot = Math.round((p25.total || 0) * ratio);
              mUrb = Math.round((p25.urbana || 0) * ratio);
              mRur = Math.round((p25.rural || 0) * ratio);
              mHom = Math.round((p25.homens || 0) * ratio);
              mMul = Math.round((p25.mulheres || 0) * ratio);
            } else {
              const proj = munObj[yr] || munObj['2025'] || {};
              mTot = proj.total || 0;
              mUrb = proj.urbana || 0;
              mRur = proj.rural || 0;
              mHom = proj.homens || 0;
              mMul = proj.mulheres || 0;
            }

            if (expState.cols.popTotal) row.push(mTot);
            if (expState.cols.urbanRural) row.push(mUrb, mRur);
            if (expState.cols.gender) row.push(mHom, mMul);
          });

          if (expState.cols.areaDensity) row.push(demo.areaKm2 ? Number(demo.areaKm2.toFixed(1)) : '', demo.density ? Number(demo.density.toFixed(1)) : '');
          if (expState.cols.sarcof) row.push(calc.cfg.name);
          if (expState.cols.affected) row.push(calc.affectedPop, calc.affectedFamilies);
          if (expState.cols.water) row.push(waterVal);
          if (expState.cols.fies) row.push(demo.fiesSeveraPct ? Number(demo.fiesSeveraPct.toFixed(1)) : '');
          if (expState.cols.risk) row.push(rMat.score, rMat.rank);
          if (expState.cols.source) row.push('INE Angola - DPA 2025', years.join(', '));

          munRows.push(row);
          combinedRows.push(row);
        });
      }

      return { headers, provRows, munRows, combinedRows, years };
    }

    // 7. Executar Exportação em Excel (.xlsx)
    function exportToExcel() {
      const { headers, provRows, munRows, combinedRows, years } = buildExportDataset();
      const season = state.activeSeason || 'OND';

      if (combinedRows.length === 0) {
        alert(state.currentLang === 'en' ? 'No records match the selected filters.' : 'Nenhum registo corresponde aos filtros selecionados.');
        return;
      }

      const yearsTag = years.length === 4 ? 'Serie_2024_2027' : years.join('_');
      const filename = `Populacao_Angola_${expState.mode === 'prov_only' ? 'Provincias' : 'Provincias_Municipios'}_${yearsTag}_${season}.xlsx`;

      // Se a biblioteca SheetJS estiver carregada
      if (typeof XLSX !== 'undefined') {
        const wb = XLSX.utils.book_new();

        if (expState.mode === 'prov_only') {
          // Apenas províncias
          const wsProv = XLSX.utils.aoa_to_sheet([headers, ...provRows]);
          XLSX.utils.book_append_sheet(wb, wsProv, 'População Províncias');
        } else {
          // Províncias e Municípios com abas dedicadas
          if (provRows.length > 0) {
            const wsProv = XLSX.utils.aoa_to_sheet([headers, ...provRows]);
            XLSX.utils.book_append_sheet(wb, wsProv, 'Resumo Províncias');
          }
          if (munRows.length > 0) {
            const wsMun = XLSX.utils.aoa_to_sheet([headers, ...munRows]);
            XLSX.utils.book_append_sheet(wb, wsMun, 'Detalhamento Municípios');
          }
          const wsAll = XLSX.utils.aoa_to_sheet([headers, ...combinedRows]);
          XLSX.utils.book_append_sheet(wb, wsAll, 'Consolidado Geral');
        }

        XLSX.writeFile(wb, filename);
      } else {
        // Fallback nativo: CSV compatível com Excel (UTF-8 BOM)
        exportToCsv();
      }
    }

    // 8. Executar Exportação em CSV
    function exportToCsv() {
      const { headers, combinedRows, years } = buildExportDataset();
      const season = state.activeSeason || 'OND';

      if (combinedRows.length === 0) {
        alert(state.currentLang === 'en' ? 'No records match the selected filters.' : 'Nenhum registo corresponde aos filtros selecionados.');
        return;
      }

      const yearsTag = years.length === 4 ? 'Serie_2024_2027' : years.join('_');
      const csvLines = [];
      csvLines.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(';'));
      combinedRows.forEach(row => {
        csvLines.push(row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(';'));
      });

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csvLines.join('\n'));
      const link = document.createElement('a');
      link.setAttribute('href', csvContent);
      link.setAttribute('download', `Populacao_Angola_${expState.mode === 'prov_only' ? 'Provincias' : 'Provincias_Municipios'}_${yearsTag}_${season}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // Eventos dos Controles
    if (btnOpenHeader) {
      btnOpenHeader.addEventListener('click', () => {
        modal.classList.add('active');
        resetDefaultSelections();
      });
    }

    if (btnOpenCenso) {
      btnOpenCenso.addEventListener('click', () => {
        modal.classList.add('active');
        resetDefaultSelections();
      });
    }

    if (btnClose) {
      btnClose.addEventListener('click', () => modal.classList.remove('active'));
    }

    // Fechar ao clicar no backdrop escuro
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });

    // Modo de detalhamento (províncias apenas vs províncias e municípios)
    if (modeProvRadio && modeBothRadio) {
      modeProvRadio.addEventListener('change', () => {
        expState.mode = 'prov_only';
        lblModeProv?.classList.add('active');
        lblModeBoth?.classList.remove('active');
        if (munContainerEl) {
          munContainerEl.style.opacity = '0.4';
          munContainerEl.style.pointerEvents = 'none';
        }
        updateSummaryStats();
      });

      modeBothRadio.addEventListener('change', () => {
        expState.mode = 'prov_and_mun';
        lblModeBoth?.classList.add('active');
        lblModeProv?.classList.remove('active');
        if (munContainerEl) {
          munContainerEl.style.opacity = '1';
          munContainerEl.style.pointerEvents = 'auto';
        }
        updateSummaryStats();
      });
    }

    // Busca de províncias
    if (searchProvInput) {
      searchProvInput.addEventListener('input', (e) => {
        expState.searchProv = e.target.value;
        renderProvincesList();
      });
    }

    // Busca de municípios
    if (searchMunInput) {
      searchMunInput.addEventListener('input', (e) => {
        expState.searchMun = e.target.value;
        renderMunicipalitiesList();
      });
    }

    // Botões Todas / Limpar Províncias
    document.getElementById('btn-export-select-all-prov')?.addEventListener('click', () => {
      if (!state.ineData) return;
      Object.keys(state.ineData.provincias).forEach(p => expState.selectedProvs.add(p));
      expState.selectedMuns.clear();
      expState.selectedProvs.forEach(p => {
        const muns = state.ineData.municipios[p] || {};
        Object.keys(muns).forEach(m => expState.selectedMuns.add(`${p}::${m}`));
      });
      renderProvincesList();
      renderMunicipalitiesList();
      updateSummaryStats();
    });

    document.getElementById('btn-export-clear-prov')?.addEventListener('click', () => {
      expState.selectedProvs.clear();
      expState.selectedMuns.clear();
      renderProvincesList();
      renderMunicipalitiesList();
      updateSummaryStats();
    });

    // Botões Todos / Limpar Municípios
    document.getElementById('btn-export-select-all-mun')?.addEventListener('click', () => {
      expState.selectedProvs.forEach(p => {
        const muns = state.ineData.municipios[p] || {};
        Object.keys(muns).forEach(m => expState.selectedMuns.add(`${p}::${m}`));
      });
      renderMunicipalitiesList();
      updateSummaryStats();
    });

    document.getElementById('btn-export-clear-mun')?.addEventListener('click', () => {
      expState.selectedMuns.clear();
      renderMunicipalitiesList();
      updateSummaryStats();
    });

    // Controlo de Seleção de Anos Demográficos (2024, 2025, 2026, 2027)
    const availableYears = ['2024', '2025', '2026', '2027'];
    availableYears.forEach(yr => {
      const chk = document.getElementById(`chk-year-${yr}`);
      const card = document.getElementById(`card-year-${yr}`);
      if (chk) {
        chk.addEventListener('change', (e) => {
          if (e.target.checked) {
            expState.selectedYears.add(yr);
            card?.classList.add('active');
          } else {
            // Não permitir desmarcar todos os anos
            if (expState.selectedYears.size > 1) {
              expState.selectedYears.delete(yr);
              card?.classList.remove('active');
            } else {
              e.target.checked = true;
            }
          }
          updateSummaryStats();
        });
      }
    });

    // Botão "Todos os Anos"
    document.getElementById('btn-year-all')?.addEventListener('click', () => {
      availableYears.forEach(yr => {
        expState.selectedYears.add(yr);
        const chk = document.getElementById(`chk-year-${yr}`);
        const card = document.getElementById(`card-year-${yr}`);
        if (chk) chk.checked = true;
        card?.classList.add('active');
      });
      updateSummaryStats();
    });

    // Botão "2026 (Ano Corrente)"
    document.getElementById('btn-year-2026')?.addEventListener('click', () => {
      expState.selectedYears.clear();
      expState.selectedYears.add('2026');
      availableYears.forEach(yr => {
        const is26 = yr === '2026';
        const chk = document.getElementById(`chk-year-${yr}`);
        const card = document.getElementById(`card-year-${yr}`);
        if (chk) chk.checked = is26;
        if (is26) card?.classList.add('active'); else card?.classList.remove('active');
      });
      updateSummaryStats();
    });

    // Botão "Censo 2024"
    document.getElementById('btn-year-2024')?.addEventListener('click', () => {
      expState.selectedYears.clear();
      expState.selectedYears.add('2024');
      availableYears.forEach(yr => {
        const is24 = yr === '2024';
        const chk = document.getElementById(`chk-year-${yr}`);
        const card = document.getElementById(`card-year-${yr}`);
        if (chk) chk.checked = is24;
        if (is24) card?.classList.add('active'); else card?.classList.remove('active');
      });
      updateSummaryStats();
    });

    // Seletor de Risco
    if (selectRisk) {
      selectRisk.addEventListener('change', (e) => {
        expState.risk = e.target.value;
        updateSummaryStats();
      });
    }

    // Seletor de FIES
    if (selectFies) {
      selectFies.addEventListener('change', (e) => {
        expState.fies = e.target.value;
        updateSummaryStats();
      });
    }

    // Colunas checkboxes
    const colMap = [
      { id: 'col-pop-total', key: 'popTotal' },
      { id: 'col-pop-urban-rural', key: 'urbanRural' },
      { id: 'col-pop-gender', key: 'gender' },
      { id: 'col-area-density', key: 'areaDensity' },
      { id: 'col-affected', key: 'affected' },
      { id: 'col-sarcof', key: 'sarcof' },
      { id: 'col-risk', key: 'risk' },
      { id: 'col-fies', key: 'fies' },
      { id: 'col-water', key: 'water' },
      { id: 'col-source', key: 'source' }
    ];

    colMap.forEach(c => {
      const el = document.getElementById(c.id);
      if (el) {
        el.addEventListener('change', (e) => {
          expState.cols[c.key] = e.target.checked;
        });
      }
    });

    document.getElementById('btn-export-cols-all')?.addEventListener('click', () => {
      colMap.forEach(c => {
        expState.cols[c.key] = true;
        const el = document.getElementById(c.id);
        if (el) el.checked = true;
      });
    });

    document.getElementById('btn-export-cols-std')?.addEventListener('click', () => {
      colMap.forEach(c => {
        const isStd = ['popTotal', 'urbanRural', 'gender', 'areaDensity', 'affected'].includes(c.key);
        expState.cols[c.key] = isStd;
        const el = document.getElementById(c.id);
        if (el) el.checked = isStd;
      });
    });

    // Botões de Exportação
    if (btnExportExcel) btnExportExcel.addEventListener('click', exportToExcel);
    if (btnExportCsv) btnExportCsv.addEventListener('click', exportToCsv);
  }


  // Initialize Map Theme & Custom Styling Controls
  function initMapThemeControls() {
    const selPalette = document.getElementById('select-map-palette');
    const wrapProvFill = document.getElementById('wrap-prov-fill');
    const wrapMunFill = document.getElementById('wrap-mun-fill');

    function updateCustomPickersVisibility() {
      const isCustom = state.mapTheme.palette === 'custom';
      if (wrapProvFill) wrapProvFill.style.display = isCustom ? 'flex' : 'none';
      if (wrapMunFill) wrapMunFill.style.display = isCustom ? 'flex' : 'none';
    }

    if (selPalette) {
      selPalette.addEventListener('change', (e) => {
        state.mapTheme.palette = e.target.value;
        updateCustomPickersVisibility();
        renderAllLayers();
      });
    }

    // Provincial controls
    const pickerProvBorder = document.getElementById('picker-prov-border');
    const lblProvBorder = document.getElementById('lbl-prov-border');
    if (pickerProvBorder) {
      pickerProvBorder.addEventListener('input', (e) => {
        state.mapTheme.provBorderColor = e.target.value;
        if (lblProvBorder) lblProvBorder.textContent = e.target.value;
        renderAllLayers();
      });
    }

    const selProvWeight = document.getElementById('select-prov-weight');
    if (selProvWeight) {
      selProvWeight.addEventListener('change', (e) => {
        state.mapTheme.provBorderWeight = parseFloat(e.target.value) || 3.5;
        renderAllLayers();
      });
    }

    const sliderProvOpacity = document.getElementById('slider-prov-opacity');
    const lblProvOpacity = document.getElementById('lbl-prov-opacity');
    if (sliderProvOpacity) {
      sliderProvOpacity.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        state.mapTheme.provFillOpacity = val / 100;
        if (lblProvOpacity) lblProvOpacity.textContent = `${val}%`;
        renderAllLayers();
      });
    }

    const pickerProvFill = document.getElementById('picker-prov-fill');
    const lblProvFill = document.getElementById('lbl-prov-fill');
    if (pickerProvFill) {
      pickerProvFill.addEventListener('input', (e) => {
        state.mapTheme.customProvFill = e.target.value;
        if (lblProvFill) lblProvFill.textContent = e.target.value;
        renderAllLayers();
      });
    }

    // Municipal controls
    const pickerMunBorder = document.getElementById('picker-mun-border');
    const lblMunBorder = document.getElementById('lbl-mun-border');
    if (pickerMunBorder) {
      pickerMunBorder.addEventListener('input', (e) => {
        state.mapTheme.munBorderColor = e.target.value;
        if (lblMunBorder) lblMunBorder.textContent = e.target.value;
        renderAllLayers();
      });
    }

    const selMunWeight = document.getElementById('select-mun-weight');
    if (selMunWeight) {
      selMunWeight.addEventListener('change', (e) => {
        state.mapTheme.munBorderWeight = parseFloat(e.target.value) || 1.2;
        renderAllLayers();
      });
    }

    const selMunDash = document.getElementById('select-mun-dash');
    if (selMunDash) {
      selMunDash.addEventListener('change', (e) => {
        state.mapTheme.munBorderStyle = e.target.value;
        renderAllLayers();
      });
    }

    const sliderMunOpacity = document.getElementById('slider-mun-opacity');
    const lblMunOpacity = document.getElementById('lbl-mun-opacity');
    if (sliderMunOpacity) {
      sliderMunOpacity.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        state.mapTheme.munFillOpacity = val / 100;
        if (lblMunOpacity) lblMunOpacity.textContent = `${val}%`;
        renderAllLayers();
      });
    }

    const pickerMunFill = document.getElementById('picker-mun-fill');
    const lblMunFill = document.getElementById('lbl-mun-fill');
    if (pickerMunFill) {
      pickerMunFill.addEventListener('input', (e) => {
        state.mapTheme.customMunFill = e.target.value;
        if (lblMunFill) lblMunFill.textContent = e.target.value;
        renderAllLayers();
      });
    }

    // SADC underlay opacity
    const sliderSadcOpacity = document.getElementById('slider-sadc-opacity');
    const lblSadcOpacity = document.getElementById('lbl-sadc-opacity');
    if (sliderSadcOpacity) {
      sliderSadcOpacity.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        state.mapTheme.sadcOpacity = val / 100;
        if (lblSadcOpacity) lblSadcOpacity.textContent = `${val}%`;
        renderAllLayers();
      });
    }

    // Canvas background buttons
    document.querySelectorAll('.btn-canvas-bg').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.btn-canvas-bg').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const bg = btn.dataset.bg;
        state.mapTheme.canvasBg = bg;
        const selBasemap = document.getElementById('select-basemap');
        if (selBasemap && selBasemap.value === 'none') {
          applyCanvasBackground(bg);
        }
      });
    });

    // Label Density Selector
    const selLabelDensity = document.getElementById('select-label-density');
    if (selLabelDensity) {
      selLabelDensity.addEventListener('change', (e) => {
        state.labelDensity = e.target.value;
        renderAllLayers();
      });
    }

    // Reset default styling button
    const btnReset = document.getElementById('btn-reset-map-style');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        state.mapTheme = {
          palette: 'fews_alert',
          provBorderColor: '#0f172a',
          provBorderWeight: 3.5,
          provFillOpacity: 0.45,
          customProvFill: '#ea580c',
          munBorderColor: '#475569',
          munBorderWeight: 1.2,
          munBorderStyle: 'solid',
          munFillOpacity: 0.20,
          customMunFill: '#334155',
          sadcOpacity: 0.25,
          canvasBg: '#090d16'
        };
        state.labelDensity = 'smart';
        if (selPalette) selPalette.value = 'fews_alert';
        if (pickerProvBorder) pickerProvBorder.value = '#0f172a';
        if (lblProvBorder) lblProvBorder.textContent = '#0f172a';
        if (selProvWeight) selProvWeight.value = '3.5';
        if (sliderProvOpacity) sliderProvOpacity.value = '45';
        if (lblProvOpacity) lblProvOpacity.textContent = '45%';
        if (pickerMunBorder) pickerMunBorder.value = '#475569';
        if (lblMunBorder) lblMunBorder.textContent = '#475569';
        if (selMunWeight) selMunWeight.value = '1.2';
        if (selMunDash) selMunDash.value = 'solid';
        if (sliderMunOpacity) sliderMunOpacity.value = '20';
        if (lblMunOpacity) lblMunOpacity.textContent = '20%';
        if (sliderSadcOpacity) sliderSadcOpacity.value = '25';
        if (lblSadcOpacity) lblSadcOpacity.textContent = '25%';
        if (selLabelDensity) selLabelDensity.value = 'smart';
        document.querySelectorAll('.btn-canvas-bg').forEach(b => {
          b.classList.toggle('active', b.dataset.bg === '#090d16');
        });
        updateCustomPickersVisibility();
        renderAllLayers();
      });
    }
  }

  initMapThemeControls();
  // Inicializar Sequência da Aplicação
  initMap();
  initOnlineUsersTracker();
  loadOfficialDatasets().then(() => {
    initExcelExportSystem();
    loadGeoJsonData().then(() => {
      // Apply stored language after data is ready so all views render in the right language
      setLanguage(state.currentLang);
    });
  });
  loadDocuments();
});
