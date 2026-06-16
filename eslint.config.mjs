import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import tseslint from "typescript-eslint";

export default defineConfig([
    {
        ignores: [
            "api/**",
            "main.js",
            "node_modules/**",
        ],
    },
    {
        files: ["src/**/*.ts"],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                project: "./tsconfig.json",
                tsconfigRootDir: import.meta.dirname,
            },
            globals: {
                activeDocument: "readonly",
                activeWindow: "readonly",
                createDiv: "readonly",
                createEl: "readonly",
            },
        },
        plugins: {
            "@typescript-eslint": tseslint.plugin,
            obsidianmd,
        },
        rules: {
            "@typescript-eslint/ban-ts-comment": "error",
            "@typescript-eslint/no-explicit-any": "error",
            "obsidianmd/no-static-styles-assignment": "error",
            "obsidianmd/no-tfile-tfolder-cast": "error",
            "obsidianmd/no-unsupported-api": "error",
            "obsidianmd/prefer-active-doc": "warn",
            "obsidianmd/settings-tab/no-manual-html-headings": "error",
        },
    },
]);
