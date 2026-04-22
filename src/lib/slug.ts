const cyrillicMap: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya",
  А: "a", Б: "b", В: "v", Г: "g", Д: "d", Е: "e", Ё: "yo", Ж: "zh",
  З: "z", И: "i", Й: "y", К: "k", Л: "l", М: "m", Н: "n", О: "o",
  П: "p", Р: "r", С: "s", Т: "t", У: "u", Ф: "f", Х: "kh", Ц: "ts",
  Ч: "ch", Ш: "sh", Щ: "shch", Ъ: "", Ы: "y", Ь: "", Э: "e", Ю: "yu",
  Я: "ya",
};

export function generateSlug(title: string): string {
  return title
    .split("")
    .map((char) => cyrillicMap[char] ?? char)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
