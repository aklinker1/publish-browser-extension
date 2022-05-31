import snakeCase from 'lodash.snakecase';
import { cliFlags } from '../cli-flags';
import { NotImplemented } from './errors';
import { Flag } from './flags';

const ESC = '\x1b';

export interface LogOptions {
  noColor?: boolean;
}

export class Log {
  private RESET = `${ESC}[0m`;
  private BOLD = `${ESC}[1m`;
  private DIM = `${ESC}[2m`;
  private ITALIC = `${ESC}[3m`;
  private RED = `${ESC}[91m`;
  private GREEN = `${ESC}[92m`;
  private YELLOW = `${ESC}[93m`;
  private BLUE = `${ESC}[94m`;
  private MAGENTA = `${ESC}[95m`;
  private CYAN = `${ESC}[96m`;
  private CODE = `${this.ITALIC}${this.DIM}`;

  constructor(options?: LogOptions) {
    if (options?.noColor) {
      this.RESET = '';
      this.BOLD = '';
      this.DIM = '';
      this.RED = '';
      this.GREEN = '';
      this.YELLOW = '';
      this.BLUE = '';
      this.MAGENTA = '';
      this.CYAN = '';
    }
  }

  printTitle(message: string) {
    console.log(`${this.RESET}\n${this.BOLD}${message}${this.RESET}`);
  }

  printSubtitle(message: string) {
    console.log(
      `${this.RESET}\n${this.BOLD}${this.CYAN}${message}${this.RESET}`,
    );
  }

  error(message: string) {
    console.log(`${this.RESET}${this.BOLD}${this.RED}${message}${this.RESET}`);
  }

  success(message: string) {
    console.log(
      `${this.RESET}${this.BOLD}${this.GREEN}${message}${this.RESET}`,
    );
  }

  printStoreOptions(name: string, options: object) {
    this.printSubtitle(name);
    for (const [key, value] of Object.entries(options)) {
      console.log(
        `${this.RESET}  ${this.DIM}${key}: ${this.RESET}${this.BOLD}${this.BLUE}${value}${this.RESET}`,
      );
    }
  }

  printFailure(target: string, err: any) {
    this.error(`✖ ${target} failed`);
    console.log(err);
  }

  blankLine() {
    console.log();
  }

  printDocs() {
    const describeExample = (name: string, code: string) => {
      return [`  ${name}`, `    ${this.CODE}${code}${this.RESET}`].join('\n');
    };

    const describeFlag = (flag: Flag<string | boolean>) => {
      const envName = snakeCase(flag.name).toUpperCase();
      const cliUsage = flag.type === 'string' ? ' string' : '';
      const envUsage = flag.type === 'string' ? '"string"' : 'boolean';
      const lines = [
        `${this.CODE}--${flag.name}${cliUsage}${this.RESET}`,
        `${this.CODE}${envName}=${envUsage}${this.RESET}`,
      ];
      if (flag.desc) lines.push(`  ${flag.desc.replaceAll('\n', '\n  ')}`);
      return lines.join('\n');
    };

    console.log(`
${this.BOLD}Usage: ${this.CODE}publish-extension [OPTIONS]${this.RESET}

Publish chrome/browser extensions to different stores

${this.CYAN}${this.BOLD}Examples${this.RESET}
These examples assume you include all required secrets as environment variables.

${describeExample(
  'Publish Chrome Extension',
  'publish-extension --chrome-zip dist/chrome.zip',
)}

${describeExample(
  'Publish Firefox Extension',
  'publish-extension --firefox-zip dist/firefox.zip',
)}

${describeExample(
  'Publish Firefox Extension & Upload Sources',
  'publish-extension --firefox-zip dist/firefox.zip --firefox-sources-zip dist/sources.zip',
)}

${this.CYAN}${this.BOLD}Options${this.RESET}
All options can be passed as flags with '--kebab-case' or as environment variables as 'UPPER_SNAKE_CASE'.

${Object.entries(cliFlags)
  .sort(([l], [r]) => l.localeCompare(r))
  .map(([_name, flag]) => flag())
  .map(describeFlag)
  .join('\n\n')}
`);
  }
}
