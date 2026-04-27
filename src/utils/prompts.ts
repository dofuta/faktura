import enquirer from "enquirer";

const { AutoComplete, Confirm, Input, Select } = enquirer;

export type PromptChoice<T> = {
  name: string;
  message?: string;
  value: T;
};

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
  const result = await new Select<T>({
    name: "value",
    message,
    choices,
  }).run();

  return resolveChoiceValue(result, choices);
}

export async function autocomplete<T>(
  message: string,
  choices: Array<PromptChoice<T>>,
  limit = 8,
): Promise<T> {
  const result = await new AutoComplete<T>({
    name: "value",
    message,
    choices,
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
  }).run();

  return resolveChoiceValue(result, choices);
}

function resolveChoiceValue<T>(result: T | string, choices: Array<PromptChoice<T>>): T {
  if (typeof result !== "string") {
    return result;
  }

  const selected = choices.find((choice) => choice.name === result || choice.message === result);
  if (!selected) {
    throw new Error(`Unknown selection: ${result}`);
  }

  return selected.value;
}
