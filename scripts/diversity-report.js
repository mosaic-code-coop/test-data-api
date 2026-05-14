#!/usr/bin/env node

import { resolve, isAbsolute } from "path";
import { pathToFileURL } from "url";
import { generateDiversityReport } from "./diversity-analyzer.js";

function parseArgs(argv) {
  const args = { flags: {}, positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        args.flags[key] = next;
        i++;
      } else {
        args.flags[key] = true;
      }
    } else {
      args.positional.push(arg);
    }
  }
  return args;
}

const USAGE = `Usage: diversity-report --data <path> --output <path> --dataset-name <name> [options]

Options:
  --data <path>                            Path to compiled data module (e.g. ./dist/index.js)
  --output <path>                          Output path for the markdown report (e.g. ./DIVERSITY.md)
  --dataset-name <name>                    Display name for the dataset (required)
  --acknowledge-deceased-first-nations     Required for First Nations data
  --include-unicode-analysis               Include Unicode character analysis
  --help                                   Show this message
`;

const { flags } = parseArgs(process.argv.slice(2));

if (flags.help) {
  process.stdout.write(USAGE);
  process.exit(0);
}

const required = ["data", "output", "dataset-name"];
const missing = required.filter((k) => !flags[k] || flags[k] === true);
if (missing.length) {
  process.stderr.write(`Missing required flag(s): ${missing.map((k) => `--${k}`).join(", ")}\n\n`);
  process.stderr.write(USAGE);
  process.exit(1);
}

const dataPath = isAbsolute(flags.data) ? flags.data : resolve(process.cwd(), flags.data);
const outputPath = isAbsolute(flags.output) ? flags.output : resolve(process.cwd(), flags.output);

const dataModule = await import(pathToFileURL(dataPath).href);
const dataPackage = dataModule.default ?? dataModule[Object.keys(dataModule)[0]];

if (!dataPackage || typeof dataPackage !== "object") {
  process.stderr.write(`Could not load a data package from ${dataPath}\n`);
  process.exit(1);
}

generateDiversityReport(dataPackage, outputPath, {
  datasetName: flags["dataset-name"],
  acknowledgeDeceasedFirstNations: flags["acknowledge-deceased-first-nations"] === true,
  includeUnicodeAnalysis: flags["include-unicode-analysis"] === true,
});
