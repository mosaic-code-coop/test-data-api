#!/usr/bin/env node

import { DataFactory } from '../dist/DataFactory.js';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Country → region. Single source of truth: extend this map when a new
// country appears in any dataset.
const COUNTRY_TO_REGION = {
  // North America
  'United States': 'North America',
  Canada: 'North America',
  Mexico: 'North America',
  Guatemala: 'North America',
  Honduras: 'North America',
  // South America
  Brazil: 'South America',
  Argentina: 'South America',
  Chile: 'South America',
  Colombia: 'South America',
  Peru: 'South America',
  Bolivia: 'South America',
  Ecuador: 'South America',
  // Europe
  'United Kingdom': 'Europe',
  Germany: 'Europe',
  France: 'Europe',
  Italy: 'Europe',
  Spain: 'Europe',
  Poland: 'Europe',
  Russia: 'Europe',
  Netherlands: 'Europe',
  Sweden: 'Europe',
  Norway: 'Europe',
  Denmark: 'Europe',
  Finland: 'Europe',
  Austria: 'Europe',
  Greece: 'Europe',
  // Asia
  China: 'Asia',
  Japan: 'Asia',
  India: 'Asia',
  'South Korea': 'Asia',
  Thailand: 'Asia',
  Singapore: 'Asia',
  Indonesia: 'Asia',
  Philippines: 'Asia',
  Iran: 'Asia',
  Pakistan: 'Asia',
  Taiwan: 'Asia',
  Nepal: 'Asia',
  // Africa
  Nigeria: 'Africa',
  'South Africa': 'Africa',
  Kenya: 'Africa',
  Egypt: 'Africa',
  Ghana: 'Africa',
  Morocco: 'Africa',
  Senegal: 'Africa',
  Tanzania: 'Africa',
  Botswana: 'Africa',
  Namibia: 'Africa',
  Chad: 'Africa',
  Gambia: 'Africa',
  // Oceania
  Australia: 'Oceania',
  'New Zealand': 'Oceania',
  Fiji: 'Oceania',
  'Papua New Guinea': 'Oceania',
  Vanuatu: 'Oceania',
  'Solomon Islands': 'Oceania',
  Kiribati: 'Oceania',
  'Marshall Islands': 'Oceania',
  Samoa: 'Oceania',
};

// Maps a nationality tag to a country name (which is then resolved to a
// region via COUNTRY_TO_REGION). Add a new tag here when a new nationality
// appears in a dataset. The mapping is intentionally explicit so country
// detection is auditable and doesn't drift on bio wording.
const TAG_TO_COUNTRY = {
  // North America
  american: 'United States',
  nasa: 'United States',
  'african-american': 'United States',
  'asian-american': 'United States',
  'indian-american': 'United States',
  'chinese-american': 'United States',
  // Europe
  british: 'United Kingdom',
  'german-born': 'United Kingdom',
  french: 'France',
  'polish-french': 'France',
  german: 'Germany',
  italian: 'Italy',
  polish: 'Poland',
  russian: 'Russia',
  soviet: 'Russia',
  austrian: 'Austria',
  'austrian-swedish': 'Austria',
  greek: 'Greece',
  danish: 'Denmark',
  // Asia
  chinese: 'China',
  indian: 'India',
  indonesian: 'Indonesia',
  japanese: 'Japan',
  korean: 'South Korea',
  iranian: 'Iran',
  pakistani: 'Pakistan',
  taiwanese: 'Taiwan',
  // Africa
  senegalese: 'Senegal',
  kenyan: 'Kenya',
  nigerian: 'Nigeria',
  'south-african': 'South Africa',
  egyptian: 'Egypt',
  ghanaian: 'Ghana',
  moroccan: 'Morocco',
  // Oceania
  australian: 'Australia',
};

const mapCountryToRegion = (country) => {
  const region = COUNTRY_TO_REGION[country] ?? 'Other';
  return { region, country };
};

// Geography detection: address.country is authoritative; otherwise a
// nationality tag is matched against TAG_TO_COUNTRY. No bio/name heuristics —
// add a tag instead of growing this function.
const getGeographicInfo = (person) => {
  if (person.address?.country) {
    return mapCountryToRegion(person.address.country);
  }
  for (const tag of person.tags || []) {
    const country = TAG_TO_COUNTRY[tag];
    if (country) return mapCountryToRegion(country);
  }
  return { region: 'Not Specified', country: 'Not Specified' };
};

export class DiversityAnalyzer {
  constructor(dataPackage, options = {}) {
    this.dataPackage = dataPackage;
    this.options = {
      includeUnicodeAnalysis: options.includeUnicodeAnalysis || false,
      datasetName: options.datasetName || 'Dataset',
      acknowledgeDeceasedFirstNations: options.acknowledgeDeceasedFirstNations || false,
      ...options,
    };
  }

  analyze() {
    const factory = new DataFactory(this.dataPackage, {
      acknowledgeDeceasedFirstNations: this.options.acknowledgeDeceasedFirstNations,
    });
    const people = factory.getPeople();

    // Geographic analysis
    const geographic = {};
    const countryStats = {};
    const regionStats = {};

    // Pronoun analysis
    const pronouns = {};

    // Field completeness
    const fieldStats = {
      withAddress: 0,
      withoutAddress: 0,
      withDateOfBirth: 0,
      withoutDateOfBirth: 0,
      withPronouns: 0,
      withoutPronouns: 0,
      withBio: 0,
      withoutBio: 0,
    };

    // Unicode analysis (if enabled)
    const unicodeStats = {
      containsUnicode: 0,
      asciiOnly: 0,
    };

    people.forEach((person) => {
      // Geography
      const geo = getGeographicInfo(person);
      const key = `${geo.region} - ${geo.country}`;
      geographic[key] = (geographic[key] || 0) + 1;
      regionStats[geo.region] = (regionStats[geo.region] || 0) + 1;
      countryStats[geo.country] = (countryStats[geo.country] || 0) + 1;

      // Pronouns
      const pronoun = person.pronouns || 'Not specified';
      pronouns[pronoun] = (pronouns[pronoun] || 0) + 1;

      // Field completeness
      if (person.address) fieldStats.withAddress++;
      else fieldStats.withoutAddress++;

      if (person.dateOfBirth) fieldStats.withDateOfBirth++;
      else fieldStats.withoutDateOfBirth++;

      if (person.pronouns) fieldStats.withPronouns++;
      else fieldStats.withoutPronouns++;

      if (person.bio) fieldStats.withBio++;
      else fieldStats.withoutBio++;

      // Unicode analysis
      if (this.options.includeUnicodeAnalysis) {
        const fullName = person.fullName || '';
        const preferredName = person.preferredName || '';
        if (this.containsNonAscii(fullName + preferredName)) {
          unicodeStats.containsUnicode++;
        } else {
          unicodeStats.asciiOnly++;
        }
      }
    });

    return {
      totalPeople: people.length,
      geographic,
      regionStats,
      countryStats,
      pronouns,
      fieldStats,
      unicodeStats: this.options.includeUnicodeAnalysis ? unicodeStats : null,
    };
  }

  containsNonAscii(str) {
    return /[^\u0000-\u007F]/.test(str);
  }

  generateReport(outputPath) {
    const analysis = this.analyze();
    const now = new Date().toISOString().split('T')[0];

    let markdown = `# ${this.options.datasetName} - Diversity Report

*Generated on ${now}*
*Total People: ${analysis.totalPeople}*

## Geographic Distribution

### By Region
| Region | Count | Percentage |
|--------|-------|------------|
`;

    Object.entries(analysis.regionStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([region, count]) => {
        const percentage = ((count / analysis.totalPeople) * 100).toFixed(1);
        markdown += `| ${region} | ${count} | ${percentage}% |\n`;
      });

    markdown += `\n### Top Countries
| Country | Count | Percentage |
|---------|-------|------------|
`;

    Object.entries(analysis.countryStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15) // Top 15 countries
      .forEach(([country, count]) => {
        const percentage = ((count / analysis.totalPeople) * 100).toFixed(1);
        markdown += `| ${country} | ${count} | ${percentage}% |\n`;
      });

    markdown += `\n### Detailed Geographic Breakdown
| Region - Country | Count | Percentage |
|------------------|-------|------------|
`;

    Object.entries(analysis.geographic)
      .sort((a, b) => b[1] - a[1])
      .forEach(([location, count]) => {
        const percentage = ((count / analysis.totalPeople) * 100).toFixed(1);
        markdown += `| ${location} | ${count} | ${percentage}% |\n`;
      });

    markdown += `\n## Pronoun Distribution

| Pronouns | Count | Percentage |
|----------|-------|------------|
`;

    Object.entries(analysis.pronouns)
      .sort((a, b) => b[1] - a[1])
      .forEach(([pronoun, count]) => {
        const percentage = ((count / analysis.totalPeople) * 100).toFixed(1);
        markdown += `| ${pronoun} | ${count} | ${percentage}% |\n`;
      });

    markdown += `\n## Data Completeness

| Field | With Data | Without Data | Completion Rate |
|-------|-----------|--------------|-----------------|
| Address | ${analysis.fieldStats.withAddress} | ${analysis.fieldStats.withoutAddress} | ${((analysis.fieldStats.withAddress / analysis.totalPeople) * 100).toFixed(1)}% |
| Date of Birth | ${analysis.fieldStats.withDateOfBirth} | ${analysis.fieldStats.withoutDateOfBirth} | ${((analysis.fieldStats.withDateOfBirth / analysis.totalPeople) * 100).toFixed(1)}% |
| Pronouns | ${analysis.fieldStats.withPronouns} | ${analysis.fieldStats.withoutPronouns} | ${((analysis.fieldStats.withPronouns / analysis.totalPeople) * 100).toFixed(1)}% |
| Bio | ${analysis.fieldStats.withBio} | ${analysis.fieldStats.withoutBio} | ${((analysis.fieldStats.withBio / analysis.totalPeople) * 100).toFixed(1)}% |

## Diversity Metrics

### Geographic Diversity
- **Regions represented**: ${Object.keys(analysis.regionStats).filter((r) => r !== 'Not Specified').length}
- **Countries represented**: ${Object.keys(analysis.countryStats).filter((c) => c !== 'Not Specified').length}
- **North American representation**: ${(((analysis.regionStats['North America'] || 0) / analysis.totalPeople) * 100).toFixed(1)}%

### Gender Diversity
- **She/Her pronouns**: ${analysis.pronouns['she/her'] || 0} (${(((analysis.pronouns['she/her'] || 0) / analysis.totalPeople) * 100).toFixed(1)}%)
- **He/Him pronouns**: ${analysis.pronouns['he/him'] || 0} (${(((analysis.pronouns['he/him'] || 0) / analysis.totalPeople) * 100).toFixed(1)}%)
- **They/Them pronouns**: ${analysis.pronouns['they/them'] || 0} (${(((analysis.pronouns['they/them'] || 0) / analysis.totalPeople) * 100).toFixed(1)}%)
- **Other/Unspecified**: ${Object.entries(analysis.pronouns)
      .filter(([p]) => !['she/her', 'he/him', 'they/them'].includes(p))
      .reduce((sum, [, count]) => sum + count, 0)}
`;

    if (analysis.unicodeStats) {
      markdown += `\n### Unicode Character Usage
- **Names with Unicode characters**: ${analysis.unicodeStats.containsUnicode} (${((analysis.unicodeStats.containsUnicode / analysis.totalPeople) * 100).toFixed(1)}%)
- **ASCII-only names**: ${analysis.unicodeStats.asciiOnly} (${((analysis.unicodeStats.asciiOnly / analysis.totalPeople) * 100).toFixed(1)}%)
`;
    }

    markdown += `\n---
*Report generated using @mosaic-code/test-data-factory diversity analyzer*
`;

    writeFileSync(outputPath, markdown, 'utf8');
    return markdown;
  }
}

// CLI usage
export const generateDiversityReport = (dataPackage, outputPath, options = {}) => {
  try {
    const analyzer = new DiversityAnalyzer(dataPackage, options);
    const report = analyzer.generateReport(outputPath);
    console.log(`✅ Diversity report generated: ${outputPath}`);
    return report;
  } catch (error) {
    console.error('❌ Error generating diversity report:', error);
    throw error;
  }
};

// Export for programmatic use
export { DiversityAnalyzer as default };
