const ESC = '\x1b';

export interface LogOptions {
  noColor?: boolean;
}

export class Log {
  private RESET = `${ESC}[0m`;
  private BOLD = `${ESC}[1m`;
  private DIM = `${ESC}[2m`;
  private RED = `${ESC}[91m`;
  private GREEN = `${ESC}[92m`;
  private YELLOW = `${ESC}[93m`;
  private BLUE = `${ESC}[94m`;
  private MAGENTA = `${ESC}[95m`;
  private CYAN = `${ESC}[96m`;

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
    console.log(`${this.RESET}${this.BOLD}${message}${this.RESET}`);
  }

  printSubtitle(message: string) {
    console.log(`${this.RESET}${this.BOLD}${this.CYAN}${message}${this.RESET}`);
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
}
