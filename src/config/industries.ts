/* eslint-disable prettier/prettier */
// Single source of truth for the app's industry list (display label + icon).
//
//  - label:        what the user sees. American spelling, "&" not "and".
//  - welcomeValue: the exact string sent to POST /custom/v1/welcome-intro/submit.
//                  Confirmed identical to GET /custom/v1/welcome-intro/config →
//                  industries[] (checked 2026-10-01). This list is the offline
//                  fallback; onboarding builds its live list from that endpoint
//                  via buildIndustryOptions() below.
//
// NOT yet shared: the Forums filter (api/forumsApi.ts, keyed by WP topic-tag
// termId) and the Mentors filter (api/mentorsApi.ts, keyed by slug) still have
// their own lists — they map to backend IDs/slugs and contain extra/duplicate
// terms, so they need a product + backend decision before being merged in here.
import React from 'react';
import {
  AerospaceDefenseIcon,
  ConstructionEngineeringIcon,
  EducationResearchIcon,
  MediaEntertainmentIcon,
  EnergyInfrastructureIcon,
  FinancialServicesIcon,
  GovernmentPublicSectorIcon,
  HospitalityTourismIcon,
  TechTelecomIcon,
  ManufacturingProductionIcon,
  NonprofitIcon,
  HealthcarePharmaIcon,
  RetailConsumerGoodsIcon,
  RealEstatePropertyIcon,
  TransportationLogisticsIcon,
  IndustryIconProps,
} from '../components/industryIcons';

export interface Industry {
  id: string;
  label: string;
  welcomeValue: string;
  Icon?: React.ComponentType<IndustryIconProps>;
}

export const INDUSTRIES: Industry[] = [
  {id: 'aerospace-defense', label: 'Aerospace & Defense', welcomeValue: 'Aerospace and Defense', Icon: AerospaceDefenseIcon},
  {id: 'construction-engineering', label: 'Construction & Engineering', welcomeValue: 'Construction and Engineering', Icon: ConstructionEngineeringIcon},
  {id: 'education-research', label: 'Education & Research', welcomeValue: 'Education & Research', Icon: EducationResearchIcon},
  {id: 'media-entertainment', label: 'Media & Entertainment', welcomeValue: 'Media & Entertainment', Icon: MediaEntertainmentIcon},
  {id: 'energy-infrastructure', label: 'Energy & Infrastructure', welcomeValue: 'Energy & Infrastructure', Icon: EnergyInfrastructureIcon},
  {id: 'financial-services', label: 'Financial Services', welcomeValue: 'Financial Services', Icon: FinancialServicesIcon},
  {id: 'government-public-sector', label: 'Government & Public Sector', welcomeValue: 'Government & Public Sector', Icon: GovernmentPublicSectorIcon},
  {id: 'hospitality-tourism', label: 'Hospitality & Tourism', welcomeValue: 'Hospitality & Tourism', Icon: HospitalityTourismIcon},
  {id: 'technology-telecommunications', label: 'Technology & Telecommunications', welcomeValue: 'Technology & Telecommunications', Icon: TechTelecomIcon},
  {id: 'manufacturing-production', label: 'Manufacturing & Production', welcomeValue: 'Manufacturing & Production', Icon: ManufacturingProductionIcon},
  {id: 'nonprofit-organizations', label: 'Nonprofit Organizations', welcomeValue: 'Nonprofit Organizations', Icon: NonprofitIcon},
  {id: 'healthcare-pharmaceuticals', label: 'Healthcare & Pharmaceuticals', welcomeValue: 'Healthcare & Pharmaceuticals', Icon: HealthcarePharmaIcon},
  {id: 'retail-consumer-goods', label: 'Retail & Consumer Goods', welcomeValue: 'Retail & Consumer Goods', Icon: RetailConsumerGoodsIcon},
  {id: 'real-estate-property', label: 'Real Estate & Property', welcomeValue: 'Real Estate & Property', Icon: RealEstatePropertyIcon},
  {id: 'transportation-logistics', label: 'Transportation & Logistics', welcomeValue: 'Transportation and Logistics', Icon: TransportationLogisticsIcon},
];

// "Aerospace and Defense" / "Aerospace & Defense" / "aerospace  &  defense" → same key.
export const industryKey = (name: string): string =>
  name.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();

// Icon lookup for ANY industry name used in the app (onboarding, Mentors filter,
// Forums filter, New Discussion tags). Tolerates the spelling/naming differences
// between those backend lists: and/&, Defence/Defense, Organisations/Organizations.
// Industries that only exist in some lists are pointed at the closest icon:
//   "Tech & Telecom"          → Technology & Telecommunications
//   "Retail"                  → Retail & Consumer Goods
//   "Supply Chain & Logistics"→ Transportation & Logistics
const ICON_ALIASES: Record<string, string> = {
  'tech and telecom': 'technology and telecommunications',
  'retail': 'retail and consumer goods',
  'supply chain and logistics': 'transportation and logistics',
};

export const getIndustryIcon = (name: string): Industry['Icon'] => {
  let key = industryKey(name).replace(/defence/g, 'defense').replace(/organisations/g, 'organizations');
  key = ICON_ALIASES[key] ?? key;
  return INDUSTRIES.find(i => industryKey(i.welcomeValue) === key)?.Icon;
};

// Build the onboarding list from the server's industries[] strings.
//  - welcomeValue: the server string, untouched (that is what submit validates).
//  - label:        same string shown with "&" instead of "and".
//  - Icon:         matched by industryKey(); an industry the app has no icon for
//                  yet still shows up (just without an icon) instead of vanishing.
export const buildIndustryOptions = (serverNames: string[]): Industry[] =>
  serverNames
    .filter(n => typeof n === 'string' && n.trim())
    .map(name => {
      const key = industryKey(name);
      return {
        id: key.replace(/ /g, '-'),
        label: name.replace(/\s+and\s+/gi, ' & '),
        welcomeValue: name,
        Icon: getIndustryIcon(name),
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
