import type { HexRecord } from '../data/types'

export interface HousingTypeRow {
  id: string
  label: string
  need: string
  fit: string
  allowed: string
  status: string
  parcels: number
  homes: [number, number]
  zoningNote: string
}

interface PlaceReportProps {
  name: string
  municipality: string
  confidence: number
  selectedTypeLabel: string
  rows: HousingTypeRow[]
  unknowns: string[]
  cell: HexRecord
}

const BAND_LABELS: Record<string, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  uncertain: 'Uncertain',
}

const ALLOWED_LABELS: Record<string, string> = {
  by_right: '✓ By right',
  special_exception: '△ Special exception',
  conditional_use: '△ Conditional use',
  not_permitted: '× Not permitted',
  unknown: '? Unknown',
}

const STATUS_LABELS: Record<string, string> = {
  ready_match: 'Ready match',
  needs_approval: 'Needs approval',
  blocked_by_zoning: 'Blocked by zoning',
  needed_but_hard: 'Needed but hard',
  low_priority: 'Low priority',
  zoning_unknown: 'Zoning unknown',
  not_recommended: 'Not recommended',
  insufficient_data: 'Insufficient data',
}

function PercentBar({
  label,
  value,
  tone,
  vintage,
}: {
  label: string
  value: number
  tone: 'demand' | 'stock'
  vintage: string
}) {
  return (
    <div className="comparison-bar">
      <div className="comparison-label">
        <span>{label}</span>
        <strong>{Math.round(value * 100)}%</strong>
      </div>
      <div className="bar-track">
        <span className={tone} style={{ width: `${Math.max(value * 100, 3)}%` }} />
      </div>
      <p className="metric-vintage">{vintage}</p>
    </div>
  )
}

export function PlaceReport({
  name,
  municipality,
  confidence,
  selectedTypeLabel,
  rows,
  unknowns,
  cell,
}: PlaceReportProps) {
  const observed = cell.observedNeed
  const livingAlone = observed?.livingAlone ?? cell.households.hh_1_2 ?? 0
  const vacancy = observed?.vacancy ?? null
  const grouped =
    observed && observed.groupedHoods.length > 1
      ? `ACS groups ${observed.groupedHoods.join(' and ')}.`
      : null

  return (
    <section className="place-report" aria-labelledby="place-heading">
      <div className="report-heading">
        <div>
          <p className="eyebrow">Place report</p>
          <h2 id="place-heading">{name}</h2>
          <p className="muted">{municipality}</p>
        </div>
        <span className="confidence">
          {Math.round(confidence * 100)}% data coverage
        </span>
      </div>

      <div className="insight-card">
        <p className="eyebrow">Who lives here vs. vacant stock</p>
        <PercentBar
          label="Households living alone"
          value={livingAlone}
          tone="demand"
          vintage={
            observed
              ? `${observed.vintage} · observed`
              : 'Illustrative fixture · not ACS'
          }
        />
        {vacancy != null ? (
          <PercentBar
            label="Vacant housing units"
            value={vacancy}
            tone="stock"
            vintage={`${observed?.vintage ?? 'ACS'} · observed`}
          />
        ) : (
          <PercentBar
            label="0–1 bedroom homes"
            value={cell.stock.br_0_1 ?? 0}
            tone="stock"
            vintage="Illustrative fixture · not ACS"
          />
        )}
        <p className="callout">
          {observed ? (
            <>
              <strong>Derived from ACS, not a bedroom gap.</strong> Living-alone
              share and vacancy are observed neighborhood estimates.
              {grouped ? ` ${grouped}` : ''} Fit parcel counts remain an
              illustrative recipe.
            </>
          ) : (
            <>
              <strong>Illustrative comparison.</strong> This place has no ACS
              neighborhood join yet (often outside the city).
            </>
          )}
        </p>
        <div className="provenance-row">
          <span className="provenance observed">Observed</span>
          <span className="provenance derived">Derived</span>
          <span className="provenance assumption">Assumption / fixture</span>
        </div>
      </div>

      <div className="section-heading">
        <div>
          <p className="eyebrow">Need · Fit · Allowed</p>
          <h3>Housing type match</h3>
        </div>
        <span className="selected-type-chip">{selectedTypeLabel} selected</span>
      </div>

      <div className="type-table-wrap">
        <table className="type-table">
          <thead>
            <tr>
              <th>Housing type</th>
              <th>Need</th>
              <th>Fit</th>
              <th>Allowed</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <th scope="row">
                  {row.label}
                  <small>
                    About {row.parcels} parcels · {row.homes[0]}–{row.homes[1]}{' '}
                    homes (illustrative fit recipe
                    {observed?.share1to2 != null && observed.totParcels != null
                      ? `; WPRDC ~${Math.round(observed.totParcels * observed.share1to2)} 1–2 unit parcels, tract rolled to neighborhood, not cadastral`
                      : ''}
                    )
                  </small>
                </th>
                <td>
                  <span className={`band band-${row.need}`}>
                    {BAND_LABELS[row.need] ?? row.need}
                  </span>
                </td>
                <td>
                  <span className={`band band-${row.fit}`}>
                    {BAND_LABELS[row.fit] ?? row.fit}
                  </span>
                </td>
                <td title={row.zoningNote}>
                  {ALLOWED_LABELS[row.allowed] ?? row.allowed}
                </td>
                <td>
                  <span className={`status-dot status-${row.status}`} />
                  {STATUS_LABELS[row.status] ?? row.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="unknowns-card">
        <p className="eyebrow">What we do not know</p>
        <ul>
          {unknowns.map((unknown) => (
            <li key={unknown}>{unknown}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}

interface ScreeningBriefProps {
  placeName: string
  municipality: string
  typeLabel: string
  need: string
  fit: string
  allowed: string
  status: string
  hasAcsNeed: boolean
  catalogName?: string
}

const MATCH_WORDS: Record<string, string> = {
  ...STATUS_LABELS,
}

export function ScreeningBrief({
  placeName,
  municipality,
  typeLabel,
  need,
  fit,
  allowed,
  status,
  hasAcsNeed,
  catalogName,
}: ScreeningBriefProps) {
  return (
    <section className="screening-brief" aria-labelledby="brief-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Take-away</p>
          <h2 id="brief-heading">Screening brief</h2>
        </div>
        <button className="share-button" type="button" onClick={() => window.print()}>
          Print this view
        </button>
      </div>
      <dl className="brief-facts">
        <div>
          <dt>Place</dt>
          <dd>
            {placeName}, {municipality}
            {catalogName ? ` · ACS: ${catalogName}` : ''}
          </dd>
        </div>
        <div>
          <dt>Housing type</dt>
          <dd>{typeLabel}</dd>
        </div>
        <div>
          <dt>Need</dt>
          <dd>
            {BAND_LABELS[need] ?? need}
            {hasAcsNeed
              ? ' · ACS 2019–23 (UCSUR/WPRDC)'
              : ' · illustrative fixture'}
          </dd>
        </div>
        <div>
          <dt>Fit</dt>
          <dd>{BAND_LABELS[fit] ?? fit} · illustrative recipe</dd>
        </div>
        <div>
          <dt>Allowed</dt>
          <dd>
            {ALLOWED_LABELS[allowed] ?? allowed} · illustrative / unverified
          </dd>
        </div>
        <div>
          <dt>Match</dt>
          <dd>{MATCH_WORDS[status] ?? status}</dd>
        </div>
      </dl>
      <ul className="brief-limits">
        <li>ACS 5-year estimates for small neighborhoods have large margins of error.</li>
        <li>SNAP flood / slope / mine shares are 2010 neighborhood percentages, not parcel FEMA calls.</li>
        <li>Zoning labels are not a Title 9 or municipal determination.</li>
        <li>Outside the city there is no WPRDC neighborhood layer; hex fills are placeholders.</li>
      </ul>
    </section>
  )
}
