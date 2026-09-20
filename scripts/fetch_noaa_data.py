#!/usr/bin/env python3
"""
fetch_noaa_data.py
Fetches daily climate indices from NOAA and saves to data/noaa_oni_live.json
Sources:
  - NOAA SST Nino Indices: https://www.cpc.ncep.noaa.gov/data/indices/sstoi.indices
  - NOAA ONI (3-month running mean): https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt
"""

import urllib.request
import json
import os
import datetime
import sys

MONTHS_PT = {
    1: 'Jan', 2: 'Fev', 3: 'Mar', 4: 'Abr', 5: 'Mai', 6: 'Jun',
    7: 'Jul', 8: 'Ago', 9: 'Set', 10: 'Out', 11: 'Nov', 12: 'Dez'
}

SEASONS_PT = {
    'DJF': 'Dez-Jan-Fev', 'JFM': 'Jan-Fev-Mar', 'FMA': 'Fev-Mar-Abr',
    'MAM': 'Mar-Abr-Mai', 'AMJ': 'Abr-Mai-Jun', 'MJJ': 'Mai-Jun-Jul',
    'JJA': 'Jun-Jul-Ago', 'JAS': 'Jul-Ago-Set', 'ASO': 'Ago-Set-Out',
    'SON': 'Set-Out-Nov', 'OND': 'Out-Nov-Dez', 'NDJ': 'Nov-Dez-Jan'
}

def get_phase(val):
    """Return ENSO phase string and colour based on ONI value."""
    if val is None:
        return 'Indisponível', '#94a3b8', '#94a3b8'
    if val >= 2.0:
        return 'El Niño Muito Forte', '#dc2626', 'rgba(220,38,38,0.15)'
    if val >= 1.5:
        return 'El Niño Forte', '#ef4444', 'rgba(239,68,68,0.15)'
    if val >= 1.0:
        return 'El Niño Moderado', '#f97316', 'rgba(249,115,22,0.15)'
    if val >= 0.5:
        return 'El Niño Fraco', '#fbbf24', 'rgba(251,191,36,0.15)'
    if val > -0.5:
        return 'Fase Neutra', '#94a3b8', 'rgba(148,163,184,0.12)'
    if val > -1.0:
        return 'La Niña Fraca', '#38bdf8', 'rgba(56,189,248,0.15)'
    if val > -1.5:
        return 'La Niña Moderada', '#0ea5e9', 'rgba(14,165,233,0.15)'
    return 'La Niña Forte', '#6366f1', 'rgba(99,102,241,0.15)'

def angola_impact(oni):
    """Generate Portuguese Angola-specific impact text."""
    if oni is None:
        return 'Dados em actualização...'
    if oni >= 2.0:
        return (f'🔴 El Niño Muito Forte ({oni:+.2f}°C) — Angola sul em risco CRÍTICO de seca severa. '
                'FEWS NET projecta IPC Fase 3-4 no Cunene, Huíla e Namibe. '
                'Acção humanitária urgente recomendada.')
    if oni >= 1.5:
        return (f'🟠 El Niño Forte ({oni:+.2f}°C) — Risco ELEVADO de défice pluviométrico no sul de Angola. '
                'Previsão SARCOF-33: 40% probabilidade de precipitação Abaixo da Normal (BN) OND 2026/27.')
    if oni >= 1.0:
        return (f'🟡 El Niño Moderado ({oni:+.2f}°C) — Risco aumentado de seca no Cunene, Namibe e Huíla. '
                'Monitorização intensiva em curso. INAMET emite boletins semanais.')
    if oni >= 0.5:
        return (f'🟡 El Niño Fraco ({oni:+.2f}°C) — Probabilidade moderada de precipitação abaixo da normal. '
                'Acompanhar próximo boletim SARCOF e FEWS NET Angola.')
    if oni > -0.5:
        return (f'🟢 Fase Neutra ({oni:+.2f}°C) — Sem influência significativa do El Niño/La Niña. '
                'Precipitação esperada próxima da normal em Angola.')
    if oni > -1.0:
        return (f'🔵 La Niña Fraca ({oni:+.2f}°C) — Tendência para precipitação Acima da Normal. '
                'Monitorizar possíveis cheias e inundações nos rios Cubango e Cunene.')
    return (f'🔵 La Niña Forte ({oni:+.2f}°C) — Precipitação acentuada acima da normal prevista. '
            'Alto risco de cheias no sul e leste de Angola.')

def fetch_sstoi():
    """Fetch and parse NOAA sstoi.indices (monthly SST anomalies 1982–present)."""
    url = 'https://www.cpc.ncep.noaa.gov/data/indices/sstoi.indices'
    print(f'Fetching {url}...', flush=True)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 elnino-angola-monitor/1.0'})
    with urllib.request.urlopen(req, timeout=30) as r:
        raw = r.read().decode('ascii', errors='replace')

    monthly = []
    for line in raw.splitlines():
        parts = line.split()
        if len(parts) < 9:
            continue
        try:
            yr = int(parts[0])
            mo = int(parts[1])
            nino34_anom = float(parts[8])  # NINO3.4 ANOM column
        except (ValueError, IndexError):
            continue
        if yr < 1982:
            continue
        monthly.append({
            'year': yr,
            'month': mo,
            'label': f'{MONTHS_PT[mo]} {yr}',
            'anom': round(nino34_anom, 2)
        })

    return monthly

def fetch_oni():
    """Fetch and parse NOAA ONI (3-month running mean seasonal index)."""
    url = 'https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt'
    print(f'Fetching {url}...', flush=True)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 elnino-angola-monitor/1.0'})
    with urllib.request.urlopen(req, timeout=30) as r:
        raw = r.read().decode('ascii', errors='replace')

    seasonal = []
    for line in raw.splitlines():
        parts = line.split()
        if len(parts) < 4:
            continue
        seas = parts[0].strip()
        if seas not in SEASONS_PT:
            continue
        try:
            yr = int(parts[1])
            total = float(parts[2])
            anom = float(parts[3])
        except (ValueError, IndexError):
            continue
        seasonal.append({
            'season': seas,
            'season_pt': SEASONS_PT[seas],
            'year': yr,
            'label': f'{SEASONS_PT[seas]} {yr}',
            'total_sst': round(total, 2),
            'anom': round(anom, 2)
        })

    return seasonal

def build_output(monthly, seasonal):
    """Build the final JSON output."""
    now = datetime.datetime.utcnow()

    # Last 48 monthly values for the chart
    chart_data = monthly[-48:] if len(monthly) >= 48 else monthly

    # Current ONI from most recent monthly value
    current_monthly = monthly[-1] if monthly else None
    current_oni = current_monthly['anom'] if current_monthly else None
    current_label = current_monthly['label'] if current_monthly else 'N/D'

    # Most recent seasonal ONI (3-month running mean)
    current_seasonal = seasonal[-1] if seasonal else None
    current_seasonal_oni = current_seasonal['anom'] if current_seasonal else None

    phase_label, phase_color, phase_bg = get_phase(current_oni)

    # Angola specific historical key events (reference ENSO years)
    enso_key_events = [
        {'year': 1997, 'label': 'Super El Niño 1997/98', 'max_oni': 2.3, 'angola_impact': 'Seca severa no Cunene — menor produção agrícola de massango/massambala em 15 anos'},
        {'year': 2010, 'label': 'La Niña 2010/11', 'max_oni': -1.6, 'angola_impact': 'Cheias no Moxico e Malanje; época chuvosa acima da normal'},
        {'year': 2015, 'label': 'Super El Niño 2015/16', 'max_oni': 2.6, 'angola_impact': '1.4 milhões em insegurança alimentar; GAM >15% no Cunene'},
        {'year': 2019, 'label': 'El Niño 2018/19', 'max_oni': 0.8, 'angola_impact': 'Pior seca em 38 anos no sul de Angola; criação do PCESSA'},
        {'year': 2023, 'label': 'El Niño 2023/24', 'max_oni': 2.0, 'angola_impact': 'Défice pluviométrico acentuado; SADC declara emergência regional'},
        {'year': 2026, 'label': 'El Niño 2026 (Actual)', 'max_oni': current_oni, 'angola_impact': angola_impact(current_oni)},
    ]

    return {
        'metadata': {
            'source': 'NOAA Climate Prediction Center (CPC)',
            'url_monthly': 'https://www.cpc.ncep.noaa.gov/data/indices/sstoi.indices',
            'url_oni': 'https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt',
            'url_advisory': 'https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml',
            'url_roni': 'https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/',
            'updated_at_utc': now.strftime('%Y-%m-%dT%H:%M:%SZ'),
            'updated_at_human': now.strftime('%d/%m/%Y %H:%M UTC'),
            'data_through': current_label,
            'total_monthly_records': len(monthly),
            'total_seasonal_records': len(seasonal),
        },
        'current': {
            'oni_anom': current_oni,
            'oni_label': current_label,
            'oni_seasonal_anom': current_seasonal_oni,
            'oni_seasonal_label': current_seasonal['label'] if current_seasonal else 'N/D',
            'phase': phase_label,
            'phase_color': phase_color,
            'phase_bg': phase_bg,
            'angola_impact': angola_impact(current_oni),
        },
        'chart_data': chart_data,
        'seasonal_data': seasonal[-48:] if len(seasonal) >= 48 else seasonal,
        'enso_key_events': enso_key_events,
        'thresholds': {
            'el_nino_weak': 0.5,
            'el_nino_moderate': 1.0,
            'el_nino_strong': 1.5,
            'el_nino_very_strong': 2.0,
            'la_nina_weak': -0.5,
            'la_nina_moderate': -1.0,
            'la_nina_strong': -1.5,
        }
    }

def main():
    out_path = os.path.join('data', 'noaa_oni_live.json')

    try:
        monthly = fetch_sstoi()
        print(f'  -> Got {len(monthly)} monthly SST records', flush=True)
    except Exception as e:
        print(f'ERROR fetching sstoi.indices: {e}', file=sys.stderr)
        monthly = []

    try:
        seasonal = fetch_oni()
        print(f'  -> Got {len(seasonal)} seasonal ONI records', flush=True)
    except Exception as e:
        print(f'ERROR fetching oni.ascii.txt: {e}', file=sys.stderr)
        seasonal = []

    if not monthly and not seasonal:
        print('ERROR: No data fetched. Aborting.', file=sys.stderr)
        sys.exit(1)

    output = build_output(monthly, seasonal)
    os.makedirs('data', exist_ok=True)

    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f'Saved {out_path} — ONI atual: {output["current"]["oni_anom"]}°C ({output["current"]["phase"]})')
    print(f'Actualizado em: {output["metadata"]["updated_at_human"]}')

if __name__ == '__main__':
    main()
