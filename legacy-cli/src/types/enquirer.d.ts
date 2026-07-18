declare module "enquirer" {
  class AutoComplete<T = unknown> {
    constructor(options: {
      name: string;
      message: string;
      choices: Array<string | { name: string; message?: string; value?: T }>;
      limit?: number;
      suggest?: (input: string, choices: Array<{ name: string; message?: string; value?: T }>) => Promise<Array<{ name: string; message?: string; value?: T }>>;
    });
    run(): Promise<T | string>;
  }

  class Select<T = string> {
    constructor(options: {
      name: string;
      message: string;
      choices: Array<string | { name: string; message?: string; value?: T }>;
    });
    run(): Promise<T | string>;
  }

  class Input {
    constructor(options: {
      name: string;
      message: string;
      initial?: string;
      required?: boolean;
      multiline?: boolean;
    });
    run(): Promise<string>;
  }

  class Confirm {
    constructor(options: {
      name: string;
      message: string;
      initial?: boolean;
    });
    run(): Promise<boolean>;
  }

  const enquirer: {
    AutoComplete: typeof AutoComplete;
    Select: typeof Select;
    Input: typeof Input;
    Confirm: typeof Confirm;
  };

  export default enquirer;
}
