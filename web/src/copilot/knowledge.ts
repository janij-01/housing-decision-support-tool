export interface KnowledgeSnippet {
  id: string
  label: string
  title: string
  text: string
  keywords: readonly string[]
}

export const COPILOT_KNOWLEDGE: readonly KnowledgeSnippet[] = [
  {
    id: 'fixture-limitations',
    label: 'Fixture data notice',
    title: 'Illustrative data, not findings',
    text:
      'Fit parcel counts, Allowed zoning labels, match colors, hazards, transit, carbon, and outside-city scores are still illustrative fixtures. They are not authoritative findings and must not be used for planning or zoning decisions. In-city Need is different: Pittsburgh neighborhoods that join a WPRDC hood name use ACS 2019–2023 (UCSUR / WPRDC), with large margins of error in small places.',
    keywords: [
      'fixture',
      'sample',
      'demo',
      'data',
      'limitation',
      'authoritative',
      'accuracy',
      'coverage',
      'confidence',
    ],
  },
  {
    id: 'need-fit-allowed',
    label: 'Method: Need · Fit · Allowed',
    title: 'Three distinct planning questions',
    text:
      'Need describes whether household patterns suggest a housing-type gap. Fit estimates physical opportunity using illustrative parcel capacity and home ranges. Allowed summarizes the fixture zoning status. A match combines these dimensions but does not replace feasibility, market, legal, or community review.',
    keywords: [
      'need',
      'demand',
      'household',
      'fit',
      'parcel',
      'capacity',
      'homes',
      'allowed',
      'match',
      'method',
      'score',
    ],
  },
  {
    id: 'zoning-verification',
    label: 'Planning safeguard: zoning verification',
    title: 'Verify zoning at the parcel level',
    text:
      'Treat by-right, conditional-use, special-exception, prohibited, and unknown labels as screening signals only. Before acting, confirm the current zoning map, ordinance text, overlays, lot-specific conditions, approval pathway, and interpretation with the relevant municipality.',
    keywords: [
      'zoning',
      'zone',
      'allowed',
      'by-right',
      'permit',
      'permitted',
      'approval',
      'conditional',
      'exception',
      'ordinance',
      'overlay',
      'legal',
      'build',
    ],
  },
  {
    id: 'climate-hazards',
    label: 'Planning safeguard: climate and hazards',
    title: 'Hazards are constraints, not footnotes',
    text:
      'Floodway is a hard screening concern in the current matching logic. Flood exposure, slope, undermining, displacement risk, and transportation emissions require current authoritative sources, site investigation, and professional review; missing values mean unknown, not safe.',
    keywords: [
      'climate',
      'hazard',
      'risk',
      'flood',
      'floodway',
      'slope',
      'mine',
      'undermined',
      'displacement',
      'carbon',
      'emissions',
      'safe',
      'safety',
    ],
  },
  {
    id: 'human-next-steps',
    label: 'Workflow: human review',
    title: 'Move from screening to accountable review',
    text:
      'Use the preview to form questions, not conclusions. Next steps are to inspect source dates and uncertainty, validate candidate parcels, verify zoning and hazards, document assumptions, compare alternatives, and involve municipal staff, technical experts, and affected residents before a decision.',
    keywords: [
      'next',
      'step',
      'workflow',
      'review',
      'human',
      'verify',
      'validate',
      'decision',
      'community',
      'resident',
      'planner',
      'action',
      'recommendation',
    ],
  },
  {
    id: 'acs-need-vintage',
    label: 'Source: ACS neighborhood need',
    title: 'Homewood Need is ACS, not a model guess',
    text:
      'For Pittsburgh neighborhoods that join on WPRDC hood names, Need bands are derived from UCSUR ACS 2019–2023 via WPRDC: living-alone share, vacancy, age 65+, family households, tenure, and transit commute. Small neighborhoods have large margins of error. Fit parcel counts and Allowed zoning labels stay illustrative until a parcel file and a human-verified zoning matrix are connected. An LLM must not invent those numbers or interpret Title 9. This preview only retrieves local notes; it does not recommend a project.',
    keywords: [
      'acs',
      'census',
      'ucsur',
      'wprdc',
      'vintage',
      'living',
      'alone',
      'vacancy',
      'homewood',
      'moe',
      'error',
      'limitation',
    ],
  },
  {
    id: 'not-a-zoning-lawyer',
    label: 'Limit: not legal advice',
    title: 'This preview is not a zoning lawyer',
    text:
      'Do not treat answers as legal advice, a Title 9 determination, or a reason to build. Future LLM answers may use only the selected place snapshot and already-cited ordinance text. Missing parcel counts, missing code sections, and missing FEMA calls stay missing. The tool must not invent numbers.',
    keywords: [
      'lawyer',
      'attorney',
      'llm',
      'invent',
      'hallucinate',
      'title9',
      'advice',
      'legal',
    ],
  },
  {
    id: 'snap-hazard-vintage',
    label: 'Source: SNAP 2010 hazards',
    title: 'Hazard shares are neighborhood SNAP 2010',
    text:
      'Flood, landslide, hillside, and undermining percentages in the broader catalog are Pittsburgh SNAP 2010 neighborhood figures, not parcel FEMA determinations. Missing slope or mine values mean unknown, not safe. Do not treat a map color as an engineering conclusion.',
    keywords: [
      'snap',
      '2010',
      'landslide',
      'hillside',
      'undermining',
      'mine',
      'fema',
    ],
  },
] as const

export const SUGGESTED_PROMPTS = [
  'How should I read Need, Fit, and Allowed?',
  'What ACS vintage is the Homewood need?',
  'Can this tool act as a zoning lawyer?',
  'What zoning checks are still required?',
  'Which climate and hazard limits matter here?',
  'What should a planner verify next?',
] as const
