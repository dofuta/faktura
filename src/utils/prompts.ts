import enquirer from "enquirer";

const { AutoComplete, Confirm, Input, Select } = enquirer;

export type PromptChoice<T> = {
  name: string;
  message?: string;
  shortcut?: string;
  value: T;
};

type ShortcutSelectPrompt = {
  dispatch(inputValue: string, key: { name?: string }): Promise<unknown> | unknown;
  index: number;
  submit(): Promise<unknown>;
  run(): Promise<unknown>;
};

function displayChoicesWithShortcuts<T>(choices: Array<PromptChoice<T>>): Array<PromptChoice<T>> {
  return choices.map((choice) => ({
    ...choice,
    message: choice.shortcut ? `[${choice.shortcut.toUpperCase()}] ${choice.message ?? choice.name}` : choice.message,
  }));
}

function applyShortcutDispatch<T>(prompt: ShortcutSelectPrompt, choices: Array<PromptChoice<T>>): void {
  const originalDispatch = prompt.dispatch.bind(prompt);
  prompt.dispatch = async (inputValue: string, key: { name?: string } = {}) => {
    const shortcut = (key.name ?? inputValue).toLowerCase();
    const index = choices.findIndex((choice) => choice.shortcut?.toLowerCase() === shortcut);
    if (index === -1) {
      return originalDispatch(inputValue, key);
    }

    prompt.index = index;
    return prompt.submit();
  };
}

export async function input(message: string, initial = ""): Promise<string> {
  return new Input({ name: "value", message, initial }).run();
}

export async function requiredInput(message: string, initial = ""): Promise<string> {
  while (true) {
    const value = (await input(message, initial)).trim();
    if (value) {
      return value;
    }
    console.log("入力してください。");
  }
}

export async function confirm(message: string, initial = true): Promise<boolean> {
  return new Confirm({ name: "value", message, initial }).run();
}

export async function select<T>(message: string, choices: Array<PromptChoice<T>>): Promise<T> {
  const prompt = new Select<T>({
    name: "value",
    message,
    choices: displayChoicesWithShortcuts(choices),
  }) as unknown as ShortcutSelectPrompt;

  applyShortcutDispatch(prompt, choices);

  const result = await prompt.run();

  return resolveChoiceValue(result as T | string, choices);
}

export async function autocomplete<T>(
  message: string,
  choices: Array<PromptChoice<T>>,
  limit = 8,
): Promise<T> {
  const prompt = new AutoComplete<T>({
    name: "value",
    message,
    choices: displayChoicesWithShortcuts(choices),
    limit,
    suggest: async (inputValue, availableChoices) => {
      const query = inputValue.trim().toLowerCase();
      if (!query) {
        return availableChoices;
      }

      return availableChoices.filter((choice) => {
        const haystack = `${choice.name} ${choice.message ?? ""}`.toLowerCase();
        return haystack.includes(query);
      });
    },
  }) as unknown as ShortcutSelectPrompt;

  applyShortcutDispatch(prompt, choices);
  const result = await prompt.run();

  return resolveChoiceValue(result as T | string, choices);
}

function resolveChoiceValue<T>(result: T | string, choices: Array<PromptChoice<T>>): T {
  if (typeof result !== "string") {
    return result;
  }

  const selected = choices.find(
    (choice) => choice.name === result || choice.message === result || choice.value === result,
  );
  if (!selected) {
    throw new Error(`Unknown selection: ${result}`);
  }

  return selected.value;
}
